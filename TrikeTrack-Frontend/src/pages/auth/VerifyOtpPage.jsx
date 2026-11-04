import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import OtpInput from '../../components/OtpInput'
import useCountdown, { formatSeconds } from '../../hooks/useCountdown'
import authService from '../../services/authService'
import { getErrorCode, getErrorMessage } from '../../services/api'

const STORAGE_KEY = 'tritrack_pending_verification'

function readPendingVerification() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)

    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const pending = useMemo(() => readPendingVerification(), [])

  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [expiresAt, setExpiresAt] = useState(() =>
    pending?.expires_at ? new Date(pending.expires_at) : null,
  )
  const [resendAt, setResendAt] = useState(() =>
    pending ? new Date(Date.now() + (pending.resend_available_in || 0) * 1000) : null,
  )

  const secondsLeft = useCountdown(expiresAt)
  const resendSeconds = useCountdown(resendAt)
  const otpCode = otp.replace(/\s/g, '')

  if (!pending) {
    return <Navigate to="/register" replace />
  }

  const handleVerify = async (event) => {
    event?.preventDefault()
    setSubmitting(true)
    setErrorMessage('')
    setNotice('')

    try {
      await authService.verifyOtp({ mobile_number: pending.mobile_number, otp: otpCode })

      sessionStorage.removeItem(STORAGE_KEY)
      navigate('/register/success', {
        replace: true,
        state: { mobile: pending.mobile_number },
      })
    } catch (error) {
      const code = getErrorCode(error)

      setErrorMessage(getErrorMessage(error, 'The verification code could not be confirmed.'))

      if (code === 'otp_attempts_exhausted' || code === 'otp_expired') {
        setOtp('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setErrorMessage('')
    setNotice('')

    try {
      const response = await authService.resendOtp({ mobile_number: pending.mobile_number })
      const verification = response.data.verification

      setOtp('')
      setExpiresAt(new Date(verification.expires_at))
      setResendAt(new Date(Date.now() + verification.resend_available_in * 1000))
      setNotice('A new verification code has been sent to your mobile number.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'A new code could not be sent.'))
    } finally {
      setResending(false)
    }
  }

  const expired = secondsLeft === 0

  return (
    <>
      <header className="page-head">
        <p className="page-head__eyebrow">Step 2 of 2</p>
        <h1 className="page-head__title">Verify your mobile number</h1>
        <p className="page-head__text">
          We sent a 6-digit verification code to <strong>{pending.mobile_number}</strong>.
          Enter the code below to finish registration.
        </p>
      </header>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <form className="form" onSubmit={handleVerify}>
        <OtpInput
          value={otp}
          onChange={setOtp}
          disabled={submitting || expired}
          onComplete={() => handleVerify()}
        />

        <div className="otp-meta">
          {expired ? (
            <span className="otp-meta__expired">This code has expired. Please request a new one.</span>
          ) : (
            <span>
              Code expires in <strong>{formatSeconds(secondsLeft)}</strong>
            </span>
          )}
        </div>

        <Button
          type="submit"
          block
          loading={submitting}
          disabled={otpCode.length !== 6 || expired}
        >
          {submitting ? 'Verifying…' : 'Verify OTP'}
        </Button>

        <div className="otp-actions">
          <button
            type="button"
            className="link-button"
            onClick={handleResend}
            disabled={resending || resendSeconds > 0}
          >
            {resendSeconds > 0
              ? `Resend code in ${formatSeconds(resendSeconds)}`
              : resending
                ? 'Sending new code…'
                : 'Resend code'}
          </button>

          <Link className="link-button" to="/register">
            Change mobile number
          </Link>
        </div>
      </form>
    </>
  )
}
