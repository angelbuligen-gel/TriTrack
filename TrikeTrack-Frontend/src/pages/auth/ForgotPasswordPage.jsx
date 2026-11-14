import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import OtpInput from '../../components/OtpInput'
import TextField from '../../components/TextField'
import passwordService from '../../services/passwordService'
import { getErrorMessage, getFieldErrors } from '../../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState('request')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [passwords, setPasswords] = useState({ password: '', password_confirmation: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const requestCode = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setFieldErrors({})

    try {
      const response = await passwordService.request(identifier)
      setNotice(response.data.message)
      setStep('reset')
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setMessage(getErrorMessage(error, 'The reset code could not be sent.'))
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setFieldErrors({})

    try {
      await passwordService.reset({ identifier, otp, ...passwords })
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been reset. Sign in with the new password.' },
      })
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setMessage(getErrorMessage(error, 'The password could not be reset.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="page-head__eyebrow">Account recovery</p>
        <h1 className="page-head__title">Reset your password</h1>
        <p className="page-head__text">
          We send a 6-digit code to the mobile number registered on your account.
        </p>
      </header>

      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {message ? <Alert variant="error">{message}</Alert> : null}

      {step === 'request' ? (
        <form className="form" onSubmit={requestCode} noValidate>
          <TextField
            id="identifier"
            name="identifier"
            label="Email or mobile number"
            placeholder="juan@example.com or 09171234567"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            error={fieldErrors.identifier}
            required
          />

          <Button type="submit" variant="secondary" block loading={submitting}>
            {submitting ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form className="form" onSubmit={resetPassword} noValidate>
          <p className="field__hint">Code sent for {identifier}.</p>

          <OtpInput value={otp} onChange={setOtp} error={fieldErrors.otp} />

          <TextField
            id="password"
            name="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            value={passwords.password}
            onChange={(event) =>
              setPasswords((current) => ({ ...current, password: event.target.value }))
            }
            error={fieldErrors.password}
            required
          />

          <TextField
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            value={passwords.password_confirmation}
            onChange={(event) =>
              setPasswords((current) => ({ ...current, password_confirmation: event.target.value }))
            }
            error={fieldErrors.password_confirmation}
            required
          />

          <Button type="submit" variant="secondary" block loading={submitting} disabled={otp.length !== 6}>
            {submitting ? 'Saving…' : 'Reset password'}
          </Button>

          <div className="row-actions">
            <Button variant="ghost" onClick={() => setStep('request')}>
              Send a new code
            </Button>
          </div>
        </form>
      )}

      <p className="page-foot">
        <Link to="/login">Back to sign in</Link>
      </p>
    </>
  )
}
