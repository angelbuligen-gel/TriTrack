import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import TextField from '../../components/TextField'
import useAuth from '../../hooks/useAuth'
import { getErrorCode, getErrorMessage, getFieldErrors } from '../../services/api'
import { homeRouteForRole } from '../../utils/roles'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setMessage('')
    setNeedsVerification(false)

    try {
      const profile = await login({ ...form, device_name: 'tritrack-web' })
      const fallback = homeRouteForRole(profile.role)
      const target = location.state?.from

      navigate(target && target.startsWith('/') ? target : fallback, { replace: true })
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setMessage(getErrorMessage(error, 'Sign in failed. Please try again.'))
      setNeedsVerification(getErrorCode(error) === 'phone_unverified')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="page-head__eyebrow">Welcome back</p>
        <h1 className="page-head__title">Sign in to TrikeTrack</h1>
        <p className="page-head__text">
          Franchisees sign in with their email or verified mobile number. Staff use their
          office account.
        </p>
      </header>

      {message ? (
        <Alert variant="error" title={needsVerification ? 'Mobile number not verified' : undefined}>
          {message}
          {needsVerification ? (
            <>
              {' '}
              <Link to="/verify-otp">Verify your number</Link> if you have already registered.
            </>
          ) : null}
        </Alert>
      ) : null}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="identifier"
          name="identifier"
          label="Email or mobile number"
          placeholder="juan@example.com or 09171234567"
          autoComplete="username"
          value={form.identifier}
          onChange={handleChange}
          error={fieldErrors.identifier}
          required
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          required
        />

        <p className="field__hint" style={{ textAlign: 'right' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <Button type="submit" variant="secondary" block loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="page-foot">
        New franchisee? <Link to="/register">Create an account</Link>
      </p>
    </>
  )
}
