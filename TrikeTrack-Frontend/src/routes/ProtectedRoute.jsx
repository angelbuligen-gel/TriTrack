import { Navigate, Outlet, useLocation } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import { homeRouteForRole } from '../utils/roles'

export default function ProtectedRoute({ roles }) {
  const { user, initialising, isAuthenticated } = useAuth()
  const location = useLocation()

  if (initialising) {
    return (
      <div className="page-loader" role="status" aria-live="polite">
        <span className="btn__spinner" aria-hidden="true" />
        Loading your account…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeRouteForRole(user.role)} replace />
  }

  return <Outlet />
}
