import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, ShoppingCart, Calendar } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/chores',   label: 'Chores',    Icon: CheckSquare },
  { to: '/shopping', label: 'Shopping',  Icon: ShoppingCart },
  { to: '/calendar', label: 'Calendar',  Icon: Calendar },
]

function NavItems() {
  return NAV_ITEMS.map(({ to, label, Icon, exact }) => (
    <NavLink
      key={to}
      to={to}
      end={exact}
      className="nav-item"
      aria-label={label}
    >
      <span className="nav-item__icon-wrap">
        <Icon className="nav-item__icon" aria-hidden />
      </span>
      <span className="nav-item__label">{label}</span>
    </NavLink>
  ))
}

export default function Layout() {
  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <nav className="nav-sidebar" aria-label="Main navigation">
        <div className="nav-sidebar__logo">
          <span className="nav-sidebar__logomark" aria-hidden>
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="url(#oikos-grad)" />
              <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">O</text>
              <defs>
                <linearGradient id="oikos-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="nav-sidebar__brand-text">Oikos</span>
        </div>
        <div className="nav-sidebar__items">
          <NavItems />
        </div>
      </nav>

      {/* Page content */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="nav-bottom" aria-label="Main navigation">
        <div className="nav-bottom__items">
          <NavItems />
        </div>
      </nav>
    </div>
  )
}
