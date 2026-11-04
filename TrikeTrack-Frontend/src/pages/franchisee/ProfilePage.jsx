import { useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import useAuth from '../../hooks/useAuth'
import accountService from '../../services/accountService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { formatDate } from '../../utils/format'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '' })
  }, [user])

  const updateProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    setError('')
    setNotice('')

    try {
      const updated = await accountService.updateProfile(profile)
      setUser((current) => ({ ...current, ...updated }))
      setNotice('Profile updated successfully.')
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'Your profile could not be updated.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setSavingPassword(true)
    setError('')
    setNotice('')

    try {
      await accountService.changePassword(passwords)
      setPasswords({ current_password: '', password: '', password_confirmation: '' })
      setNotice('Password changed successfully.')
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The password could not be changed.'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        text="Keep your contact details current and change your password when needed."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="grid grid--2">
        <article className="panel">
          <h2 className="panel__title">Account details</h2>
          <dl className="detail-list">
            <div>
              <dt>Mobile number</dt>
              <dd>{user?.mobile_number_masked || '-'}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>
                <span className={`badge badge--${user?.phone_verified ? 'success' : 'warning'}`}>
                  {user?.phone_verified ? 'Verified' : 'Unverified'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>{user?.account_status}</dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd>{formatDate(user?.created_at)}</dd>
            </div>
          </dl>
          <p className="field__hint">
            To change your mobile number, contact BPLO so the new number can be verified through OTP.
          </p>
        </article>

        <article className="panel">
          <h2 className="panel__title">Profile information</h2>
          <form className="form" onSubmit={updateProfile}>
            <label className="field">
              <span className="field__label">Full name</span>
              <input
                className="field__input"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Email address</span>
              <input
                className="field__input"
                type="email"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <div className="row-actions">
              <Button type="submit" loading={savingProfile}>
                Save profile
              </Button>
            </div>
          </form>
        </article>
      </section>

      <section className="panel">
        <h2 className="panel__title">Change password</h2>
        <form className="form" onSubmit={changePassword}>
          <div className="form-grid">
            <label className="field field--span-2">
              <span className="field__label">Current password</span>
              <input
                className="field__input"
                type="password"
                autoComplete="current-password"
                value={passwords.current_password}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, current_password: event.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span className="field__label">New password</span>
              <input
                className="field__input"
                type="password"
                autoComplete="new-password"
                value={passwords.password}
                onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <span className="field__hint">At least 8 characters with letters and numbers.</span>
            </label>

            <label className="field">
              <span className="field__label">Confirm new password</span>
              <input
                className="field__input"
                type="password"
                autoComplete="new-password"
                value={passwords.password_confirmation}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, password_confirmation: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="row-actions">
            <Button type="submit" loading={savingPassword}>
              Change password
            </Button>
          </div>
        </form>
      </section>
    </>
  )
}
