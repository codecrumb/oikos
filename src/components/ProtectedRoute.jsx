import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireHousehold = false }) {
  const { session, member } = useAuth()

  // Still resolving auth state
  if (session === undefined || member === undefined) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">Oikos</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/signin" replace />

  if (requireHousehold && !member?.household_id) {
    return <Navigate to="/household-setup" replace />
  }

  return children
}
