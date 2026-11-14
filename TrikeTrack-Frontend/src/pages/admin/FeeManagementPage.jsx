import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage, getFieldErrors } from '../../services/api'

const TYPE_OPTIONS = [
  { value: 'renewal', label: 'Renewal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

const EMPTY_FORM = {
  code: '',
  name: '',
  application_type: 'renewal',
  amount: '',
  description: '',
  is_active: true,
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function FeeManagementPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.feeTypes.list({
        application_type: typeFilter || undefined,
        active: showArchived ? undefined : 1,
      })

      setRows(result.items)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Fee types could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [typeFilter, showArchived])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setError('')
    setForm({ ...EMPTY_FORM })
  }

  const openEdit = (row) => {
    setError('')
    setForm({
      id: row.id,
      code: row.code,
      name: row.name,
      application_type: row.application_type,
      amount: row.amount,
      description: row.description || '',
      is_active: row.is_active,
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        code: form.code,
        name: form.name,
        application_type: form.application_type,
        amount: Number(form.amount),
        description: form.description || null,
        is_active: Boolean(form.is_active),
      }

      if (form.id) {
        await adminService.feeTypes.update(form.id, payload)
        setNotice('Fee type updated.')
      } else {
        await adminService.feeTypes.create(payload)
        setNotice('Fee type created.')
      }

      setForm(null)
      load()
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The fee type could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const archive = async (row) => {
    setError('')

    try {
      await adminService.feeTypes.archive(row.id)
      setNotice(`${row.name} archived.`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The fee type could not be archived.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Fee management"
        text="Official fee amounts per application type. Treasury assessments read these values, so changes apply to new assessments immediately."
        actions={
          <Button onClick={openCreate}>Add fee type</Button>
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error && !form ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <select
            className="field__input toolbar__select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by application type"
          >
            <option value="">All application types</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            <span>Include archived</span>
          </label>
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No fee types configured."
          columns={[
            { key: 'name', label: 'Fee', render: (row) => row.name },
            { key: 'code', label: 'Code' },
            { key: 'application_type_label', label: 'Application type' },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
            {
              key: 'description',
              label: 'Description',
              render: (row) => row.description || '-',
            },
            {
              key: 'is_active',
              label: 'Status',
              render: (row) => (row.is_active ? 'Active' : 'Archived'),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <div className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  {row.is_active ? (
                    <button type="button" className="link-button" onClick={() => archive(row)}>
                      Archive
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </section>

      <Modal
        open={Boolean(form)}
        title={form?.id ? 'Edit fee type' : 'Add fee type'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="fee-type-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {form ? (
          <form id="fee-type-form" className="form" onSubmit={save}>
            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="form-grid">
              <label className="field">
                <span className="field__label">Application type</span>
                <select
                  className="field__input"
                  value={form.application_type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, application_type: event.target.value }))
                  }
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">Code</span>
                <input
                  className="field__input"
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="renewal_fee"
                />
              </label>

              <label className="field">
                <span className="field__label">Name</span>
                <input
                  className="field__input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Amount (PHP)</span>
                <input
                  className="field__input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                />
              </label>

              <label className="field field--span-2">
                <span className="field__label">Description</span>
                <input
                  className="field__input"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_active)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_active: event.target.checked }))
                    }
                  />
                  <span>Active</span>
                </span>
              </label>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
