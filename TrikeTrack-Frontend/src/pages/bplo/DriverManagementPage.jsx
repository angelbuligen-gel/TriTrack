import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import TextField from '../../components/TextField'
import recordService from '../../services/recordService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { confirmCreate } from '../../utils/confirm'
import { formatDate } from '../../utils/format'

const EMPTY_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  license_number: '',
  license_expiry: '',
  contact_number: '',
  address: '',
}

export default function DriverManagementPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await recordService.drivers.list({ q: search, per_page: 100 })
      setRows(result.items)
    } catch {
      setError('Driver records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      first_name: row.first_name,
      middle_name: row.middle_name || '',
      last_name: row.last_name,
      suffix: row.suffix || '',
      license_number: row.license_number || '',
      license_expiry: row.license_expiry || '',
      contact_number: row.contact_number || '',
      address: row.address || '',
    })
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!editing) {
      const confirmed = await confirmCreate({
        entity: 'driver record',
        details: [
          { label: 'Name', value: `${form.first_name} ${form.last_name}`.trim() },
          { label: 'License no.', value: form.license_number },
          { label: 'License expiry', value: form.license_expiry },
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
        await recordService.drivers.update(editing.id, form)
        setNotice('Driver record updated.')
      } else {
        await recordService.drivers.create(form)
        setNotice('Driver record created.')
      }

      setModalOpen(false)
      await load()
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError, 'The driver record could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="BPLO portal"
        title="Driver Management"
        text="Registered drivers and the franchises they are assigned to."
        actions={
          <Button onClick={openCreate}>New driver</Button>
        }
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
            placeholder="Search by name or license number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search drivers"
          />
        </div>

        <DataTable
          loading={loading}
          columns={[
            {
              key: 'full_name',
              label: 'Driver',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.full_name}</strong>
                  <small>{row.contact_number || 'No contact number'}</small>
                </div>
              ),
            },
            {
              key: 'license_number',
              label: 'License',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.license_number || '—'}</span>
                  {row.license_expired ? (
                    <small className="text-danger">Expired {formatDate(row.license_expiry)}</small>
                  ) : (
                    <small>Valid until {formatDate(row.license_expiry)}</small>
                  )}
                </div>
              ),
            },
            {
              key: 'current_franchises',
              label: 'Assigned franchise',
              render: (row) =>
                row.current_franchises?.length
                  ? row.current_franchises.map((franchise) => franchise.franchise_number).join(', ')
                  : 'Not assigned',
            },
            {
              key: 'actions',
              label: '',
              width: '110px',
              render: (row) => (
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={rows}
          emptyMessage="No driver records found."
        />
      </section>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit driver' : 'New driver'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {saving ? 'Saving…' : 'Save driver'}
            </Button>
          </>
        }
      >
        <form className="form" onSubmit={handleSubmit} id="driver-form">
          <div className="form__row">
            <TextField id="first_name" name="first_name" label="First name" value={form.first_name} onChange={handleChange} error={fieldErrors.first_name} required />
            <TextField id="last_name" name="last_name" label="Last name" value={form.last_name} onChange={handleChange} error={fieldErrors.last_name} required />
          </div>

          <div className="form__row">
            <TextField id="middle_name" name="middle_name" label="Middle name" value={form.middle_name} onChange={handleChange} error={fieldErrors.middle_name} />
            <TextField id="suffix" name="suffix" label="Suffix (Jr., Sr., III)" value={form.suffix} onChange={handleChange} error={fieldErrors.suffix} />
          </div>

          <div className="form__row">
            <TextField id="license_number" name="license_number" label="License number" value={form.license_number} onChange={handleChange} error={fieldErrors.license_number} />
            <TextField id="license_expiry" name="license_expiry" type="date" label="License expiry" value={form.license_expiry} onChange={handleChange} error={fieldErrors.license_expiry} />
          </div>

          <div className="form__row">
            <TextField id="contact_number" name="contact_number" type="tel" label="Contact number" placeholder="09171234567" value={form.contact_number} onChange={handleChange} error={fieldErrors.contact_number} />
            <TextField id="address" name="address" label="Address" value={form.address} onChange={handleChange} error={fieldErrors.address} />
          </div>
        </form>
      </Modal>
    </>
  )
}
