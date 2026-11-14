import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage, getFieldErrors } from '../../services/api'

const TYPES = [
  { value: 'renewal', label: 'Renewal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

const EMPTY_FORM = {
  application_type: 'renewal',
  code: '',
  name: '',
  description: '',
  is_required: true,
  sort_order: '',
}

export default function RequirementManagementPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.requirements.list()
      setRows(result.items)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Requirements could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        TYPES.map((type) => [type.value, rows.filter((row) => row.application_type === type.value)]),
      ),
    [rows],
  )

  const openCreate = (applicationType) => {
    setError('')
    setForm({ ...EMPTY_FORM, application_type: applicationType })
  }

  const openEdit = (row) => {
    setError('')
    setForm({
      id: row.id,
      application_type: row.application_type,
      code: row.code,
      name: row.name,
      description: row.description || '',
      is_required: row.is_required,
      sort_order: row.sort_order,
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        application_type: form.application_type,
        code: form.code,
        name: form.name,
        description: form.description || null,
        is_required: Boolean(form.is_required),
        sort_order: form.sort_order === '' ? null : Number(form.sort_order),
      }

      if (form.id) {
        await adminService.requirements.update(form.id, payload)
        setNotice('Requirement updated.')
      } else {
        await adminService.requirements.create(payload)
        setNotice('Requirement added.')
      }

      setForm(null)
      load()
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The requirement could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    setError('')

    try {
      await adminService.requirements.remove(row.id)
      setNotice(`${row.name} removed.`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The requirement could not be removed.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Application requirements"
        text="The document checklist franchisees must complete for each application type. BPLO reviews against the same list."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error && !form ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {TYPES.map((type) => (
        <section className="panel" key={type.value}>
          <div className="panel__head">
            <h2 className="panel__title">{type.label}</h2>
            <Button variant="secondary" onClick={() => openCreate(type.value)}>
              Add requirement
            </Button>
          </div>

          <DataTable
            loading={loading}
            rows={grouped[type.value] || []}
            rowKey={(row) => row.id}
            emptyMessage={`No requirements configured for ${type.label.toLowerCase()}.`}
            columns={[
              { key: 'sort_order', label: '#' },
              { key: 'name', label: 'Requirement' },
              { key: 'code', label: 'Code' },
              {
                key: 'is_required',
                label: 'Level',
                render: (row) => (row.is_required ? 'Required' : 'Optional'),
              },
              {
                key: 'description',
                label: 'Description',
                render: (row) => row.description || '-',
              },
              {
                key: 'action',
                label: '',
                render: (row) => (
                  <div className="row-actions">
                    <button type="button" className="link-button" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="link-button" onClick={() => remove(row)}>
                      Remove
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </section>
      ))}

      <Modal
        open={Boolean(form)}
        title={form?.id ? 'Edit requirement' : 'Add requirement'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="requirement-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {form ? (
          <form id="requirement-form" className="form" onSubmit={save}>
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
                  {TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
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
                  placeholder="barangay_clearance"
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
                <span className="field__label">Sort order</span>
                <input
                  className="field__input"
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sort_order: event.target.value }))
                  }
                  placeholder="Auto"
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
                    checked={Boolean(form.is_required)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_required: event.target.checked }))
                    }
                  />
                  <span>Required document</span>
                </span>
              </label>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
