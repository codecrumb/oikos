import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const RECURRENCE_OPTIONS = [
  { value: '', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function Chores() {
  const { member } = useAuth()
  const householdId = member?.household_id

  const [chores, setChores] = useState([])
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    title: '',
    assigned_to: '',
    due_date: '',
    recurrence: '',
  })

  const loadData = useCallback(async () => {
    if (!householdId) return

    const [{ data: choresData }, { data: membersData }] = await Promise.all([
      supabase
        .from('chores')
        .select('*, assignee:members(id, display_name, avatar_color)')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('id, display_name, avatar_color')
        .eq('household_id', householdId),
    ])

    setChores(choresData ?? [])
    setMembers(membersData ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    loadData()

    // Realtime subscription
    const channel = supabase
      .channel('chores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chores', filter: `household_id=eq.${householdId}` },
        loadData
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [loadData, householdId])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    const assignee = members.find(m => m.id === form.assigned_to) ?? null
    const optimistic = {
      id: crypto.randomUUID(),
      household_id: householdId,
      title: form.title.trim(),
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      recurrence: form.recurrence || null,
      completed_at: null,
      created_at: new Date().toISOString(),
      assignee,
      _optimistic: true,
    }
    setChores(prev => [optimistic, ...prev])
    setForm({ title: '', assigned_to: '', due_date: '', recurrence: '' })
    setShowForm(false)

    const { data } = await supabase.from('chores').insert({
      household_id: householdId,
      title: optimistic.title,
      assigned_to: optimistic.assigned_to,
      due_date: optimistic.due_date,
      recurrence: optimistic.recurrence,
    }).select('*, assignee:members(id, display_name, avatar_color)').single()

    if (data) setChores(prev => prev.map(c => c._optimistic && c.title === optimistic.title ? data : c))
  }

  async function toggleComplete(chore) {
    const completed_at = chore.completed_at ? null : new Date().toISOString()
    setChores(prev => prev.map(c => c.id === chore.id ? { ...c, completed_at } : c))
    await supabase.from('chores').update({ completed_at }).eq('id', chore.id)
  }

  async function deleteChore(id) {
    setChores(prev => prev.filter(c => c.id !== id))
    await supabase.from('chores').delete().eq('id', id)
  }

  const pending = chores.filter(c => !c.completed_at)
  const done = chores.filter(c => c.completed_at)

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Chores</h1>
        <button
          className="btn btn--primary btn--icon-label"
          onClick={() => setShowForm(v => !v)}
          aria-label="Add chore"
        >
          <Plus size={18} aria-hidden />
          Add
        </button>
      </header>

      {showForm && (
        <form className="chore-form card" onSubmit={handleAdd}>
          <div className="form-group">
            <label className="label" htmlFor="chore-title">Title</label>
            <input
              id="chore-title"
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Clean kitchen"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="chore-assignee">Assign to</label>
              <select
                id="chore-assignee"
                className="input"
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              >
                <option value="">Anyone</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="chore-due">Due date</label>
              <input
                id="chore-due"
                className="input"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="chore-recurrence">Recurrence</label>
            <select
              id="chore-recurrence"
              className="input"
              value={form.recurrence}
              onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
            >
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">Add chore</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="page-loading">Loading chores…</div>
      ) : (
        <>
          {pending.length === 0 && done.length === 0 && (
            <p className="empty-state">No chores yet — add one above.</p>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="section-title">To do</h2>
              <ul className="chore-list">
                {pending.map(chore => (
                  <ChoreItem
                    key={chore.id}
                    chore={chore}
                    onToggle={toggleComplete}
                    onDelete={deleteChore}
                  />
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h2 className="section-title" style={{ marginTop: 24 }}>Done</h2>
              <ul className="chore-list chore-list--done">
                {done.map(chore => (
                  <ChoreItem
                    key={chore.id}
                    chore={chore}
                    onToggle={toggleComplete}
                    onDelete={deleteChore}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ChoreItem({ chore, onToggle, onDelete }) {
  const overdue = isOverdue(chore.due_date) && !chore.completed_at
  const assignee = chore.assignee

  return (
    <li className={`chore-item${chore.completed_at ? ' chore-item--done' : ''}${overdue ? ' chore-item--overdue' : ''}`}>
      <button
        className="chore-item__check"
        onClick={() => onToggle(chore)}
        aria-label={chore.completed_at ? 'Mark incomplete' : 'Mark complete'}
        style={assignee ? { borderColor: assignee.avatar_color, color: chore.completed_at ? assignee.avatar_color : 'transparent' } : {}}
      >
        {chore.completed_at && <Check size={14} aria-hidden />}
      </button>

      <div className="chore-item__body">
        <span className="chore-item__title">{chore.title}</span>
        <div className="chore-item__meta">
          {assignee && (
            <span
              className="chore-item__assignee"
              style={{ color: assignee.avatar_color }}
            >
              {assignee.display_name}
            </span>
          )}
          {chore.due_date && (
            <span className={`chore-item__due${overdue ? ' chore-item__due--overdue' : ''}`}>
              {formatDate(chore.due_date)}
            </span>
          )}
          {chore.recurrence && (
            <span className="chore-item__recurrence">{chore.recurrence}</span>
          )}
        </div>
      </div>

      <button
        className="chore-item__delete btn--icon"
        onClick={() => onDelete(chore.id)}
        aria-label="Delete chore"
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </li>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
