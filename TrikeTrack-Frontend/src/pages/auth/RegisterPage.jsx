import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import TextField from '../../components/TextField'
import authService from '../../services/authService'
import { getErrorMessage, getFieldErrors } from '../../services/api'

const INITIAL_FORM = {
  name: '',
  email: '',
  mobile_number: '',
  password: '',
  password_confirmation: '',
}

export default function RegisterPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setMessage('')

    try {
      const response = await authService.register(form)

      sessionStorage.setItem(
        'tritrack_pending_verification',
        JSON.stringify({
          mobile_number: form.mobile_number,
          ...response.data.verification,
        }),
      )

      navigate('/verify-otp', { replace: true })
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setMessage(getErrorMessage(error, 'Registration could not be completed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="page-head__eyebrow">Franchisee registration</p>
        <h1 className="page-head__title">Create your TrikeTrack account</h1>
        <p className="page-head__text">
          We will send a 6-digit verification code to your mobile number. Your account is
          reviewed by the BPLO after the number is verified.
        </p>
      </header>

      {message ? <Alert variant="error">{message}</Alert> : null}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="name"
          name="name"
          label="Full name"
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={fieldErrors.name}
          required
        />

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="juan@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          required
        />

        <TextField
          id="mobile_number"
          name="mobile_number"
          type="tel"
          inputMode="numeric"
          label="Mobile number"
          placeholder="09171234567"
          hint="Philippine mobile number. The verification code is sent here."
          autoComplete="tel"
          value={form.mobile_number}
          onChange={handleChange}
          error={fieldErrors.mobile_number}
          required
        />

        <div className="form__row">
          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            hint="At least 8 characters with letters and numbers."
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          />

          <TextField
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            value={form.password_confirmation}
            onChange={handleChange}
            error={fieldErrors.password_confirmation}
            required
          />
        </div>

        <Button type="submit" block loading={submitting}>
          {submitting ? 'Sending verification code…' : 'Continue'}
        </Button>
      </form>

      <p className="page-foot">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </>
  )
}
