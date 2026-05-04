import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, ShoppingCart, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MAX_CHORES = 4

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

function formatChoreDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatEventDate(isoStr) {
  // All-day events are stored as date-only strings; suffix prevents UTC offset shift
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoStr)
  const d = isDateOnly ? new Date(isoStr + 'T00:00:00') : new Date(isoStr)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { member } = useAuth()
  const householdId = member?.household_id

  const [chores, setChores] = useState([])
  const [events, setEvents] = useState([])
  const [shoppingCount, setShoppingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId || !member?.id) return

    // Use date-only string so all-day events (stored without time) are included
    const todayStr = new Date().toISOString().slice(0, 10)

    Promise.all([
      supabase
        .from('chores')
        .select('id, title, due_date, created_at')
        .eq('household_id', householdId)
        .eq('assigned_to', member.id)
        .is('completed_at', null),
      supabase
        .from('events')
        .select('id, title, starts_at')
        .eq('household_id', householdId)
        .gte('starts_at', todayStr)
        .order('starts_at', { ascending: true })
        .limit(3),
      supabase
        .from('shopping_items')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('checked', false),
    ]).then(([{ data: choresData }, { data: eventsData }, { count }]) => {
      const sorted = (choresData ?? []).sort((a, b) => {
        const aOver = isOverdue(a.due_date) ? 0 : 1
        const bOver = isOverdue(b.due_date) ? 0 : 1
        if (aOver !== bOver) return aOver - bOver
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return a.created_at.localeCompare(b.created_at)
      })
      setChores(sorted)
      setEvents(eventsData ?? [])
      setShoppingCount(count ?? 0)
      setLoading(false)
    })
  }, [householdId, member?.id])

  const visibleChores = chores.slice(0, MAX_CHORES)
  const overflow = chores.length - MAX_CHORES

  return (
    <div className="page-content">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Hi, {member?.display_name ?? 'there'} 👋</h1>
          <p className="page-subtitle">{member?.household?.name}</p>
        </div>
        <nav className="dashboard-nav-icons" aria-label="Quick links">
          <Link
            to="/chores"
            className="dashboard-nav-icon"
            style={{ '--icon-color': 'var(--color-accent)' }}
            aria-label="Chores"
          >
            <CheckSquare size={22} aria-hidden />
          </Link>
          <Link
            to="/shopping"
            className="dashboard-nav-icon"
            style={{ '--icon-color': '#16a34a' }}
            aria-label="Shopping"
          >
            <ShoppingCart size={22} aria-hidden />
          </Link>
          <Link
            to="/calendar"
            className="dashboard-nav-icon"
            style={{ '--icon-color': '#0ea5e9' }}
            aria-label="Calendar"
          >
            <Calendar size={22} aria-hidden />
          </Link>
        </nav>
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <div className="dashboard-widgets">

          {/* My Chores */}
          <div className="card">
            <div className="dashboard-widget__header">
              <h2 className="dashboard-widget__title">My Chores</h2>
              <Link to="/chores" className="dashboard-widget__link">View all →</Link>
            </div>
            {visibleChores.length === 0 ? (
              <p className="dashboard-widget-empty">All clear!</p>
            ) : (
              <>
                {visibleChores.map(chore => {
                  const overdue = isOverdue(chore.due_date)
                  return (
                    <div
                      key={chore.id}
                      className={`dashboard-chore-item${overdue ? ' dashboard-chore-item--overdue' : ''}`}
                    >
                      <div className="dashboard-chore-item__circle" />
                      <div className="dashboard-chore-item__body">
                        <span className="dashboard-chore-item__title">{chore.title}</span>
                        <div className="dashboard-chore-item__meta">
                          {overdue
                            ? `Overdue · was due ${formatChoreDate(chore.due_date)}`
                            : chore.due_date
                              ? `Due ${formatChoreDate(chore.due_date)}`
                              : 'No due date'}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <p className="dashboard-chore-overflow">+{overflow} more</p>
                )}
              </>
            )}
          </div>

          {/* Next Up + Shopping */}
          <div className="dashboard-widget-row">
            <Link to="/calendar" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 className="dashboard-widget__title" style={{ marginBottom: 'var(--space-3)' }}>Next Up</h2>
              {events.length === 0 ? (
                <p className="dashboard-widget-empty">Nothing scheduled</p>
              ) : (
                events.map(ev => (
                  <div key={ev.id} className="dashboard-event-item">
                    <div className="dashboard-event-item__title">{ev.title}</div>
                    <div className="dashboard-event-item__date">{formatEventDate(ev.starts_at)}</div>
                  </div>
                ))
              )}
            </Link>

            <Link to="/shopping" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 className="dashboard-widget__title" style={{ marginBottom: 'var(--space-3)' }}>Shopping</h2>
              {shoppingCount === 0 ? (
                <p className="dashboard-widget-empty">All clear!</p>
              ) : (
                <>
                  <div className="dashboard-shopping-count">{shoppingCount}</div>
                  <div className="dashboard-shopping-label">items pending</div>
                </>
              )}
            </Link>
          </div>

        </div>
      )}
    </div>
  )
}
