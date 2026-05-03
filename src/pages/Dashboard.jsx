import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { CheckSquare, ShoppingCart, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { member } = useAuth()

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">
          Hi, {member?.display_name ?? 'there'} 👋
        </h1>
        <p className="page-subtitle">{member?.household?.name}</p>
      </header>

      <div className="dashboard-grid">
        <Link to="/chores" className="dashboard-card dashboard-card--tasks">
          <CheckSquare size={28} aria-hidden />
          <span className="dashboard-card__label">Chores</span>
        </Link>

        <Link to="/shopping" className="dashboard-card dashboard-card--shopping">
          <ShoppingCart size={28} aria-hidden />
          <span className="dashboard-card__label">Shopping</span>
        </Link>

        <Link to="/calendar" className="dashboard-card dashboard-card--calendar">
          <Calendar size={28} aria-hidden />
          <span className="dashboard-card__label">Calendar</span>
        </Link>
      </div>
    </div>
  )
}
