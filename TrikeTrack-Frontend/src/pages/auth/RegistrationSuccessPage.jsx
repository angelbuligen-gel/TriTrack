import { Link, useLocation } from 'react-router-dom'

export default function RegistrationSuccessPage() {
  const location = useLocation()
  const mobile = location.state?.mobile

  return (
    <>
      <header className="page-head">
        <p className="page-head__eyebrow">Step 2 of 2 complete</p>
        <h1 className="page-head__title">Your mobile number is verified</h1>
        <p className="page-head__text">
          {mobile
            ? `We confirmed ${mobile}. Your franchisee account has been created.`
            : 'Your franchisee account has been created.'}
        </p>
      </header>

      <div className="panel">
        <h2 className="panel__title">What happens next</h2>
        <ol className="steps">
          <li>
            <strong>Sign in</strong> with your email or mobile number and the password you
            just created.
          </li>
          <li>
            <strong>Wait for account activation.</strong> BPLO staff review new franchisee
            accounts before franchise transactions are enabled.
          </li>
          <li>
            <strong>Complete your franchise records.</strong> Once activated you can submit
            renewal, transfer, and change motor applications.
          </li>
        </ol>
      </div>

      <Link className="btn btn--primary btn--block" to="/login">
        Continue to sign in
      </Link>
    </>
  )
}
