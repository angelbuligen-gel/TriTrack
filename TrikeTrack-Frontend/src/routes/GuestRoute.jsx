import { Navigate, Outlet } from 'react-router-dom'

import useAuth from '../hooks/useAuth'
import { homeRouteForRole } from '../utils/roles'

export default function GuestRoute() {
  const { user, initialising } = useAuth()

  if (initialising) {
    return (
      <div className="page-loader" role="status" aria-live="polite">
        <span className="btn__spinner" aria-hidden="true" />
        Loading…
      </div>
    )
  }

  if (user) {
    return <Navigate to={homeRouteForRole(user.role)} replace />
  }

  return <Outlet />
}
