import useAuth from '../../hooks/useAuth'
import { humanizeRole, humanizeStatus } from '../../utils/format'

const ROLE_NOTES = {
  bplo: 'Franchise, franchisee, driver, renewal, transfer, change motor, document review, certificate, and report modules are the next build step.',
  treasury: 'Fee assessment, payment management, online payment monitoring, verification, transaction history, and report modules are the next build step.',
  administrator: 'User, staff, role, and account management plus system monitoring and settings are the next build step.',
}

export default function StaffHomePage() {
  const { user } = useAuth()

  return (
    <>
      <header className="page-head page-head--compact">
        <div>
          <p className="page-head__eyebrow">{humanizeRole(user.role)} portal</p>
          <h1 className="page-head__title">Good day, {user.name.split(' ')[0]}</h1>
          <p className="page-head__text">
            You are signed in with an authorized staff account.
          </p>
        </div>
        <span className="badge badge--success">{humanizeStatus(user.account_status)}</span>
      </header>

      <section className="panel">
        <h2 className="panel__title">Module availability</h2>
        <p className="panel__text">{ROLE_NOTES[user.role]}</p>
        <dl className="detail-list">
          <div>
            <dt>Account</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{humanizeRole(user.role)}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
