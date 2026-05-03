import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import HouseholdSetup from './pages/HouseholdSetup'
import Dashboard from './pages/Dashboard'
import Chores from './pages/Chores'
import Shopping from './pages/Shopping'
import CalendarPage from './pages/CalendarPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          <Route
            path="/household-setup"
            element={
              <ProtectedRoute>
                <HouseholdSetup />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute requireHousehold>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="chores" element={<Chores />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="calendar" element={<CalendarPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
