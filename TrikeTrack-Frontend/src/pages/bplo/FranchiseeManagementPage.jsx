import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import SelectField from '../../components/SelectField'
import StatusBadge from '../../components/StatusBadge'
import TextField from '../../components/TextField'
import recordService from '../../services/recordService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { confirmCreate } from '../../utils/confirm'

export default function FranchiseeManagementPage() {
  const [rows, setRows] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [linkTarget, setLinkTarget] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linking, setLinking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await recordService.franchisees.list({ q: search, per_page: 100 })
      setRows(result.items)
    } catch {
      setError('Franchisee records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      birth_date: '',
      address: '',
      barangay: '',
      city_municipality: '',
      province: 'Oriental Mindoro',
      contact_number: '',
    })
    setFieldErrors({})
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setFormOpen(true)
    setForm({
      first_name: row.first_name,
      middle_name: row.middle_name || '',
      last_name: row.last_name,
      suffix: row.suffix || '',
      birth_date: row.birth_date || '',
      address: row.address,
      barangay: row.barangay || '',
      city_municipality: row.city_municipality || '',
      province: row.province || '',
      contact_number: row.contact_number,
    })
    setFieldErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!editing) {
      const confirmed = await confirmCreate({
        entity: 'franchisee record',
        details: [
          { label: 'Name', value: `${form.first_name} ${form.last_name}`.trim() },
          { label: 'Contact', value: form.contact_number },
          { label: 'City / municipality', value: form.city_municipality },
        ],
      })

      if (!confirmed) {
        return
      }
    }

    setSaving(true)
    setFieldErrors({})
    setError('')
    setNotice('')

    try {
      if (editing) {
        await recordService.franchisees.update(editing.id, form)
        setNotice('Franchisee record updated.')
      } else {
        await recordService.franchisees.create(form)
        setNotice('Franchisee record created.')
      }

      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError, 'The franchisee record could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const openLinkDialog = async (row) => {
    setLinkTarget(row)
    setSelectedAccount('')
    setLinkError('')

    try {
      const result = await recordService.franchisees.unlinkedAccounts({ per_page: 100 })
      setAccounts(result.items)
    } catch {
      setAccounts([])
    }
  }

  const handleLink = async () => {
    setLinking(true)
    setLinkError('')

    try {
      await recordService.franchisees.linkAccount(linkTarget.id, Number(selectedAccount))
      setNotice('Account linked to the franchisee record.')
      setLinkTarget(null)
      await load()
    } catch (linkFailure) {
      setLinkError(getErrorMessage(linkFailure, 'The account could not be linked.'))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (row) => {
    setError('')
    setNotice('')

    try {
      await recordService.franchisees.unlinkAccount(row.id)
      setNotice('Account unlinked from the franchisee record.')
      await load()
    } catch {
      setError('The account could not be unlinked.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="BPLO portal"
        title="Franchisee Management"
        text="Franchisee profiles and their linked TrikeTrack accounts."
        actions={<Button onClick={openCreate}>New franchisee</Button>}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? (
        <Alert variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search by name, contact, or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search franchisees"
          />
        </div>

        <DataTable
          loading={loading}
          columns={[
            {
              key: 'full_name',
              label: 'Franchisee',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.full_name}</strong>
                  <small>{row.contact_number}</small>
                </div>
              ),
            },
            {
              key: 'address',
              label: 'Address',
              render: (row) => [row.barangay, row.city_municipality].filter(Boolean).join(', ') || row.address,
            },
            {
              key: 'linked_account',
              label: 'Linked account',
              render: (row) =>
                row.linked_account ? (
                  <div className="cell-stack">
                    <span>{row.linked_account.email}</span>
                    <StatusBadge value={row.linked_account.account_status} />
                  </div>
                ) : (
                  <span className="text-muted">Not linked</span>
                ),
            },
            {
              key: 'actions',
              label: '',
              width: '260px',
              render: (row) => (
                <div className="row-actions">
                  <Button variant="secondary" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  {row.linked_account ? (
                    <Button variant="ghost-dark" onClick={() => handleUnlink(row)}>
                      Unlink
                    </Button>
                  ) : (
                    <Button onClick={() => openLinkDialog(row)}>
                      Link account
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          emptyMessage="No franchisee records found."
        />
      </section>

      <Modal
        open={formOpen}
        title={editing ? 'Edit franchisee' : 'New franchisee'}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving} type="submit">
              {saving ? 'Saving…' : 'Save franchisee'}
            </Button>
          </>
        }
      >
        <form className="form" id="franchisee-form" onSubmit={handleSubmit}>
          <div className="form__row">
            <TextField id="first_name" name="first_name" label="First name" value={form.first_name ?? ''} onChange={handleChange} error={fieldErrors.first_name} required />
            <TextField id="last_name" name="last_name" label="Last name" value={form.last_name ?? ''} onChange={handleChange} error={fieldErrors.last_name} required />
          </div>
          <div className="form__row">
            <TextField id="middle_name" name="middle_name" label="Middle name" value={form.middle_name ?? ''} onChange={handleChange} error={fieldErrors.middle_name} />
            <TextField id="suffix" name="suffix" label="Suffix" value={form.suffix ?? ''} onChange={handleChange} error={fieldErrors.suffix} />
          </div>
          <div className="form__row">
            <TextField id="birth_date" name="birth_date" type="date" label="Birth date" value={form.birth_date ?? ''} onChange={handleChange} error={fieldErrors.birth_date} />
            <TextField id="contact_number" name="contact_number" type="tel" label="Contact number" placeholder="09171234567" value={form.contact_number ?? ''} onChange={handleChange} error={fieldErrors.contact_number} required />
          </div>
          <TextField id="address" name="address" label="Street address" value={form.address ?? ''} onChange={handleChange} error={fieldErrors.address} required />
          <div className="form__row">
            <TextField id="barangay" name="barangay" label="Barangay" value={form.barangay ?? ''} onChange={handleChange} error={fieldErrors.barangay} />
            <TextField id="city_municipality" name="city_municipality" label="City / Municipality" value={form.city_municipality ?? ''} onChange={handleChange} error={fieldErrors.city_municipality} />
          </div>
          <TextField id="province" name="province" label="Province" value={form.province ?? ''} onChange={handleChange} error={fieldErrors.province} />
        </form>
      </Modal>

      <Modal
        open={Boolean(linkTarget)}
        title="Link a franchisee account"
        onClose={() => setLinkTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkTarget(null)} disabled={linking}>
              Cancel
            </Button>
            <Button onClick={handleLink} loading={linking} disabled={!selectedAccount}>
              {linking ? 'Linking…' : 'Link account'}
            </Button>
          </>
        }
      >
        {linkError ? <Alert variant="error">{linkError}</Alert> : null}

        <p className="panel__text">
          Linking an account is a BPLO action. SMS verification alone never links an account to
          a franchise record.
        </p>

        <SelectField
          id="account_to_link"
          label="Franchisee account"
          value={selectedAccount}
          onChange={(event) => setSelectedAccount(event.target.value)}
          required
        >
          <option value="">Select an account…</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} — {account.email} ({account.phone_verified ? 'verified' : 'unverified'})
            </option>
          ))}
        </SelectField>

        {accounts.length === 0 ? (
          <p className="empty-state">All franchisee accounts are already linked to a record.</p>
        ) : null}
      </Modal>
    </>
  )
}
