import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import adminService from '../../services/adminService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { confirmCreate } from '../../utils/confirm'
import { formatDate, humanizeStatus } from '../../utils/format'

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'bplo', label: 'BPLO' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'administrator', label: 'Administrator' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
]

function emptyForm() {
  return {
    name: '',
    email: '',
    username: '',
    mobile_number: '',
    role: 'bplo',
    account_status: 'active',
    password: '',
    password_confirmation: '',
  }
}

export default function UserManagementPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.users.list({
        staff_only: 1,
        q: search || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Staff accounts could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, role, status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const openCreate = () => {
    setForm(emptyForm())
    setEditor({ mode: 'create' })
  }

  const openEdit = (user) => {
    setForm({
      ...emptyForm(),
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      role: user.role,
      account_status: user.account_status,
    })
    setEditor({ mode: 'edit', user })
  }

  const submit = async (event) => {
    event.preventDefault()

    if (editor.mode === 'create') {
      const confirmed = await confirmCreate({
        entity: 'staff account',
        details: [
          { label: 'Name', value: form.name },
          { label: 'Email', value: form.email },
          { label: 'Role', value: form.role },
          { label: 'Status', value: form.account_status },
        ],
      })

      if (!confirmed) {
        return
      }
    }

    setSaving(true)
    setError('')

    try {
      if (editor.mode === 'create') {
        await adminService.users.create(form)
        setNotice(`Staff account ${form.email} created.`)
      } else {
        await adminService.users.update(editor.user.id, {
          name: form.name,
          email: form.email,
          username: form.username || null,
          role: form.role,
          account_status: form.account_status,
        })
        setNotice(`Staff account ${form.email} updated.`)
      }

      setEditor(null)
      load()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The account could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async () => {
    setWorking(true)
    setError('')

    try {
      await adminService.users.updateStatus(confirm.user.id, confirm.status)
      setNotice(`${confirm.user.email} is now ${confirm.status}.`)
      setConfirm(null)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The account status could not be changed.'))
    } finally {
      setWorking(false)
    }
  }

  const resetPassword = async () => {
    setWorking(true)
    setError('')

    try {
      const result = await adminService.users.resetPassword(confirm.user.id, {})
      setNotice(
        `Temporary password for ${confirm.user.email}: ${result.temporary_password}. Share it securely; it will not be shown again.`,
      )
      setConfirm(null)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The password could not be reset.'))
    } finally {
      setWorking(false)
    }
  }

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Staff accounts"
        text="Create and maintain BPLO, treasury, and administrator accounts. Franchisee accounts are handled by BPLO."
        actions={
          <Button variant="secondary" onClick={openCreate}>
            Add staff account
          </Button>
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search name, email, username, or mobile"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search staff accounts"
          />

          <select
            className="field__input toolbar__select"
            value={role}
            onChange={(event) => {
              setPage(1)
              setRole(event.target.value)
            }}
            aria-label="Filter by role"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="field__input toolbar__select"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            aria-label="Filter by account status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          emptyMessage="No staff accounts match this filter."
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.name}</strong>
                  <small className="text-muted">{row.email}</small>
                </div>
              ),
            },
            { key: 'username', label: 'Username', render: (row) => row.username || '-' },
            { key: 'role', label: 'Role', render: (row) => humanizeStatus(row.role) },
            { key: 'account_status', label: 'Status', render: (row) => <StatusBadge value={row.account_status} /> },
            { key: 'created_at', label: 'Created', render: (row) => formatDate(row.created_at) },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <div className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  {row.account_status === 'active' ? (
                    <button
                      type="button"
                      className="link-button link-button--danger"
                      onClick={() => setConfirm({ type: 'status', user: row, status: 'suspended' })}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setConfirm({ type: 'status', user: row, status: 'active' })}
                    >
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setConfirm({ type: 'password', user: row })}
                  >
                    Reset password
                  </button>
                </div>
              ),
            },
          ]}
        />

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} account(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(editor)}
        wide
        title={editor?.mode === 'create' ? 'Add staff account' : 'Edit staff account'}
        onClose={() => setEditor(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" loading={saving}>
              {editor?.mode === 'create' ? 'Create account' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="staff-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Full name</span>
              <input
                className="field__input"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Email address</span>
              <input
                className="field__input"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Username (optional)</span>
              <input
                className="field__input"
                value={form.username}
                onChange={(event) => setField('username', event.target.value)}
              />
            </label>

            {editor?.mode === 'create' ? (
              <label className="field">
                <span className="field__label">Mobile number (optional)</span>
                <input
                  className="field__input"
                  value={form.mobile_number}
                  placeholder="09XXXXXXXXX"
                  onChange={(event) => setField('mobile_number', event.target.value)}
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field__label">Role</span>
              <select
                className="field__input"
                value={form.role}
                onChange={(event) => setField('role', event.target.value)}
              >
                <option value="bplo">BPLO</option>
                <option value="treasury">Treasury</option>
                <option value="administrator">Administrator</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Account status</span>
              <select
                className="field__input"
                value={form.account_status}
                onChange={(event) => setField('account_status', event.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>

            {editor?.mode === 'create' ? (
              <>
                <label className="field">
                  <span className="field__label">Temporary password</span>
                  <input
                    className="field__input"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setField('password', event.target.value)}
                    required
                  />
                  <span className="field__hint">At least 8 characters with letters and numbers.</span>
                </label>

                <label className="field">
                  <span className="field__label">Confirm password</span>
                  <input
                    className="field__input"
                    type="password"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(event) => setField('password_confirmation', event.target.value)}
                    required
                  />
                </label>
              </>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'password' ? 'Reset password' : 'Change account status'}
        message={
          confirm?.type === 'password'
            ? `Generate a new temporary password for ${confirm.user.email}? Their current password will stop working immediately.`
            : confirm
              ? `Set ${confirm.user.email} to ${confirm.status}?`
              : ''
        }
        confirmLabel={confirm?.type === 'password' ? 'Reset password' : 'Confirm'}
        loading={working}
        onConfirm={confirm?.type === 'password' ? resetPassword : changeStatus}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
