import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="auth-shell auth-shell--plain">
      <div className="auth-panel__inner">
        <header className="page-head">
          <p className="page-head__eyebrow">404</p>
          <h1 className="page-head__title">Page not found</h1>
          <p className="page-head__text">
            The page you are looking for does not exist or has moved.
          </p>
        </header>
        <Link className="btn btn--primary btn--block" to="/">
          Return to TrikeTrack
        </Link>
      </div>
    </div>
  )
}
