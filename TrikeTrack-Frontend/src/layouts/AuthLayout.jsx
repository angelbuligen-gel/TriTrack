import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Link to="/" className="brand brand--light">
          <span className="brand__mark" aria-hidden="true">
            TT
          </span>
          <span>
            <strong className="brand__name">TrikeTrack</strong>
            <span className="brand__tag">Franchise Processing System</span>
          </span>
        </Link>

        <div className="auth-brand__copy">
          <h1>Franchise services for Oriental Mindoro tricycle operators</h1>
          <p>
            Register your account, verify your mobile number, and manage renewals,
            transfers, and change motor requests in one place.
          </p>
          <ul className="auth-brand__list">
            <li>Submit renewal documents online</li>
            <li>Track application progress</li>
            <li>Pay assessed fees securely</li>
          </ul>
        </div>

        <p className="auth-brand__foot">
          Local Government Office &middot; Oriental Mindoro
        </p>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel__inner">
          <Outlet />
        </div>
      </main>

      <style>{`
        .auth-shell .auth-panel__inner :first-child {
          margin-top: 0;
        }

        .auth-shell .auth-panel__inner :last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  )
}
