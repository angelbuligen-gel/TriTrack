import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import accountService from '../../services/accountService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
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

export default function DriversPage() {
  const [rows, setRows] = useState([])
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [assignments, franchiseRows] = await Promise.all([
        accountService.drivers.list(),
        accountService.franchises(),
      ])

      setRows(assignments)
      setFranchises(franchiseRows || [])
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your drivers could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setError('')
    setForm({ ...EMPTY_FORM, franchise_id: franchises[0]?.id ?? '' })
  }

  const openEdit = (row) => {
    const driver = row.driver || {}

    setError('')
    setForm({
      id: driver.id,
      franchise_id: row.franchise?.id ?? franchises[0]?.id ?? '',
      first_name: driver.first_name || '',
      middle_name: driver.middle_name || '',
      last_name: driver.last_name || '',
      suffix: driver.suffix || '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry || '',
      contact_number: driver.contact_number || '',
      address: driver.address || '',
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        franchise_id: form.franchise_id || null,
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        suffix: form.suffix || null,
        license_number: form.license_number || null,
        license_expiry: form.license_expiry || null,
        contact_number: form.contact_number || null,
        address: form.address || null,
      }

      if (form.id) {
        await accountService.drivers.update(form.id, payload)
        setNotice('Driver updated.')
      } else {
        await accountService.drivers.add(payload)
        setNotice('Driver added to your franchise.')
      }

      setForm(null)
      load()
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The driver could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const archive = async (row) => {
    const driver = row.driver

    if (!driver) {
      return
    }

    if (!window.confirm(`Archive ${driver.full_name}? The record is kept for history.`)) {
      return
    }

    setError('')

    try {
      await accountService.drivers.archive(driver.id)
      setNotice('Driver archived.')
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The driver could not be archived.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Drivers"
        title="My drivers"
        text="Drivers assigned to your franchise. BPLO reviews these records during application processing."
        actions={<Button onClick={openCreate}>Add driver</Button>}
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error && !form ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No drivers are assigned to your franchise yet."
          columns={[
            {
              key: 'driver',
              label: 'Driver',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.driver?.full_name || '—'}</strong>
                  <small className="text-muted">{row.franchise?.franchise_number || ''}</small>
                </div>
              ),
            },
            {
              key: 'license',
              label: 'License',
              render: (row) => row.driver?.license_number || '—',
            },
            {
              key: 'license_expiry',
              label: 'License expiry',
              render: (row) =>
                row.driver?.license_expiry ? formatDate(row.driver.license_expiry) : '—',
            },
            {
              key: 'contact_number',
              label: 'Contact',
              render: (row) => row.driver?.contact_number || '—',
            },
            {
              key: 'assigned_from',
              label: 'Assigned',
              render: (row) => (row.assigned_from ? formatDate(row.assigned_from) : '—'),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <div className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="link-button" onClick={() => archive(row)}>
                    Archive
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <Modal
        open={Boolean(form)}
        wide
        title={form?.id ? 'Edit driver' : 'Add driver'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="driver-form" loading={saving}>
              Save driver
            </Button>
          </>
        }
      >
        {form ? (
          <form id="driver-form" className="form" onSubmit={save}>
            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="form-grid">
              {franchises.length > 1 ? (
                <label className="field">
                  <span className="field__label">Franchise</span>
                  <select
                    className="field__input"
                    value={form.franchise_id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, franchise_id: event.target.value }))
                    }
                  >
                    {franchises.map((franchise) => (
                      <option key={franchise.id} value={franchise.id}>
                        {franchise.franchise_number}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="field">
                <span className="field__label">First name</span>
                <input
                  className="field__input"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, first_name: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Middle name</span>
                <input
                  className="field__input"
                  value={form.middle_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, middle_name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Last name</span>
                <input
                  className="field__input"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, last_name: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Suffix</span>
                <input
                  className="field__input"
                  value={form.suffix}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, suffix: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">License number</span>
                <input
                  className="field__input"
                  value={form.license_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, license_number: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">License expiry</span>
                <input
                  className="field__input"
                  type="date"
                  value={form.license_expiry}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, license_expiry: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Contact number</span>
                <input
                  className="field__input"
                  value={form.contact_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact_number: event.target.value }))
                  }
                />
              </label>

              <label className="field field--span-2">
                <span className="field__label">Address</span>
                <input
                  className="field__input"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </label>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
