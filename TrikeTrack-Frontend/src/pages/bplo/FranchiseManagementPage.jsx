import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import SelectField from '../../components/SelectField'
import StatusBadge from '../../components/StatusBadge'
import TextField from '../../components/TextField'
import TextareaField from '../../components/TextareaField'
import recordService from '../../services/recordService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { confirmCreate } from '../../utils/confirm'
import { formatDate } from '../../utils/format'

const STATUS_OPTIONS = ['active', 'for_renewal', 'expired', 'suspended', 'cancelled', 'transferred']

const EMPTY_FORM = {
  franchisee_id: '',
  franchise_number: '',
  date_issued: '',
  expiration_date: '',
  franchise_status: 'active',
  remarks: '',
}

export default function FranchiseManagementPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [franchiseeOptions, setFranchiseeOptions] = useState([])
  const [driverOptions, setDriverOptions] = useState([])
  const [vehicleOptions, setVehicleOptions] = useState([])

  const [detail, setDetail] = useState(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [detailLoading, setDetailLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [driverForm, setDriverForm] = useState({ driver_id: '', assigned_from: '', is_primary: false })
  const [vehicleForm, setVehicleForm] = useState({ vehicle_id: '', assigned_from: '' })
  const [assigning, setAssigning] = useState(false)

  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await recordService.franchises.list({
        q: search,
        status: status || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch {
      setError('Franchise records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [franchisees, drivers, vehicles] = await Promise.all([
          recordService.franchisees.list({ per_page: 100 }),
          recordService.drivers.list({ per_page: 100 }),
          recordService.vehicles.list({ per_page: 100 }),
        ])

        setFranchiseeOptions(franchisees.items)
        setDriverOptions(drivers.items)
        setVehicleOptions(vehicles.items)
      } catch {
        setError('Selection lists could not be loaded.')
      }
    }

    loadOptions()
  }, [])

  const refreshDetail = async (id) => {
    setDetailLoading(true)

    try {
      const franchise = await recordService.franchises.get(id)
      setDetail(franchise)
    } catch {
      setError('The franchise record could not be refreshed.')
    } finally {
      setDetailLoading(false)
    }
  }

  const openDetail = async (row) => {
    setDetailTab('overview')
    setNotice('')
    await refreshDetail(row.id)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      franchisee_id: franchiseeOptions[0]?.id ?? '',
      date_issued: new Date().toISOString().slice(0, 10),
    })
    setFieldErrors({})
    setFormOpen(true)
  }

  const openEdit = (franchise) => {
    setEditing(franchise)
    setForm({
      franchisee_id: franchise.franchisee_id,
      franchise_number: franchise.franchise_number,
      date_issued: franchise.date_issued || '',
      expiration_date: franchise.expiration_date || '',
      franchise_status: franchise.franchise_status,
      remarks: franchise.remarks || '',
    })
    setFieldErrors({})
    setFormOpen(true)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!editing) {
      const confirmed = await confirmCreate({
        entity: 'franchise record',
        details: [
          { label: 'Franchise no.', value: form.franchise_number },
          { label: 'Date issued', value: form.date_issued },
          { label: 'Expiration', value: form.expiration_date },
          { label: 'Status', value: form.franchise_status },
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
        await recordService.franchises.update(editing.id, form)
        setNotice('Franchise record updated.')
      } else {
        await recordService.franchises.create(form)
        setNotice('Franchise record created.')
      }

      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError, 'The franchise record could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const handleAssignDriver = async (event) => {
    event.preventDefault()
    setAssigning(true)
    setError('')

    try {
      await recordService.franchises.assignDriver(detail.id, {
        driver_id: Number(driverForm.driver_id),
        assigned_from: driverForm.assigned_from,
        is_primary: driverForm.is_primary,
      })
      setDriverForm({ driver_id: '', assigned_from: '', is_primary: false })
      setNotice('Driver assigned.')
      await refreshDetail(detail.id)
    } catch (assignError) {
      setError(getErrorMessage(assignError, 'The driver could not be assigned.'))
    } finally {
      setAssigning(false)
    }
  }

  const handleAssignVehicle = async (event) => {
    event.preventDefault()
    setAssigning(true)
    setError('')

    try {
      await recordService.franchises.assignVehicle(detail.id, {
        vehicle_id: Number(vehicleForm.vehicle_id),
        assigned_from: vehicleForm.assigned_from,
      })
      setVehicleForm({ vehicle_id: '', assigned_from: '' })
      setNotice('Vehicle assigned.')
      await refreshDetail(detail.id)
    } catch (assignError) {
      setError(getErrorMessage(assignError, 'The vehicle could not be assigned.'))
    } finally {
      setAssigning(false)
    }
  }

  const handleConfirmEnd = async () => {
    if (!confirm) {
      return
    }

    setAssigning(true)

    try {
      if (confirm.type === 'driver') {
        await recordService.franchises.endDriverAssignment(detail.id, confirm.id)
        setNotice('Driver assignment ended. The history record was kept.')
      } else {
        await recordService.franchises.endVehicleAssignment(detail.id, confirm.id)
        setNotice('Vehicle assignment ended. The history record was kept.')
      }

      setConfirm(null)
      await refreshDetail(detail.id)
    } catch {
      setError('The assignment could not be ended.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="BPLO portal"
        title="Franchise Management"
        text="Franchise records, assigned vehicles, and drivers."
        actions={<Button onClick={openCreate}>New franchise</Button>}
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
            placeholder="Search franchise number or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search franchises"
          />

          <select
            className="field__input toolbar__select"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          loading={loading}
          onRowClick={openDetail}
          columns={[
            { key: 'franchise_number', label: 'Franchise no.' },
            {
              key: 'franchisee',
              label: 'Franchisee',
              render: (row) => row.franchisee?.full_name || '—',
            },
            {
              key: 'franchise_status',
              label: 'Status',
              render: (row) => <StatusBadge value={row.franchise_status} />,
            },
            { key: 'date_issued', label: 'Issued', render: (row) => formatDate(row.date_issued) },
            {
              key: 'expiration_date',
              label: 'Expires',
              render: (row) => (
                <div className="cell-stack">
                  <span>{formatDate(row.expiration_date)}</span>
                  {row.is_expired ? <small className="text-danger">Expired</small> : null}
                </div>
              ),
            },
          ]}
          rows={rows}
          emptyMessage="No franchise records found."
        />

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page} · {meta.total} record(s)
            </span>
            <Button
              variant="secondary"
              disabled={page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(detail)}
        title={detail ? `Franchise ${detail.franchise_number}` : 'Franchise'}
        onClose={() => setDetail(null)}
        wide
        footer={
          detail ? (
            <>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button onClick={() => openEdit(detail)}>Edit franchise</Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="tabs">
            <div className="tabs__list" role="tablist">
              {[
                ['overview', 'Overview'],
                ['drivers', `Drivers (${detail.drivers?.length ?? 0})`],
                ['vehicles', `Vehicles (${detail.vehicles?.length ?? 0})`],
                ['history', 'History'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === key}
                  className={`tabs__tab${detailTab === key ? ' is-active' : ''}`}
                  onClick={() => setDetailTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {detailLoading ? <p className="empty-state">Refreshing record…</p> : null}

            {detailTab === 'overview' ? (
              <div className="tab-panel">
                <dl className="detail-list">
                  <div>
                    <dt>Franchisee</dt>
                    <dd>{detail.franchisee?.full_name}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{detail.franchisee?.contact_number}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge value={detail.franchise_status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Date issued</dt>
                    <dd>{formatDate(detail.date_issued)}</dd>
                  </div>
                  <div>
                    <dt>Expiration</dt>
                    <dd>{formatDate(detail.expiration_date)}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{detail.franchisee?.address}</dd>
                  </div>
                </dl>
                {detail.remarks ? <p className="panel__text">{detail.remarks}</p> : null}
              </div>
            ) : null}

            {detailTab === 'drivers' ? (
              <div className="tab-panel stack">
                <DataTable
                  columns={[
                    { key: 'name', label: 'Driver', render: (row) => row.driver?.full_name || '—' },
                    { key: 'license', label: 'License', render: (row) => row.driver?.license_number || '—' },
                    { key: 'assigned_from', label: 'From', render: (row) => formatDate(row.assigned_from) },
                    { key: 'is_primary', label: 'Primary', render: (row) => (row.is_primary ? 'Yes' : 'No') },
                    {
                      key: 'actions',
                      label: '',
                      render: (row) => (
                        <Button
                          variant="ghost-dark"
                          onClick={() => setConfirm({ type: 'driver', id: row.id, label: row.driver?.full_name })}
                        >
                          End
                        </Button>
                      ),
                    },
                  ]}
                  rows={detail.drivers || []}
                  emptyMessage="No drivers assigned to this franchise."
                />

                <form className="inline-form" onSubmit={handleAssignDriver}>
                  <SelectField
                    id="assign_driver"
                    label="Assign driver"
                    value={driverForm.driver_id}
                    onChange={(event) => setDriverForm((current) => ({ ...current, driver_id: event.target.value }))}
                    required
                  >
                    <option value="">Select driver…</option>
                    {driverOptions.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </option>
                    ))}
                  </SelectField>

                  <TextField
                    id="driver_assigned_from"
                    type="date"
                    label="Effective date"
                    value={driverForm.assigned_from}
                    onChange={(event) => setDriverForm((current) => ({ ...current, assigned_from: event.target.value }))}
                    required
                  />

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={driverForm.is_primary}
                      onChange={(event) => setDriverForm((current) => ({ ...current, is_primary: event.target.checked }))}
                    />
                    Primary driver
                  </label>

                  <Button type="submit" loading={assigning} disabled={!driverForm.driver_id || !driverForm.assigned_from}>
                    Assign driver
                  </Button>
                </form>
              </div>
            ) : null}

            {detailTab === 'vehicles' ? (
              <div className="tab-panel stack">
                <DataTable
                  columns={[
                    { key: 'unit', label: 'Vehicle', render: (row) => row.vehicle?.display || row.vehicle?.motor_number },
                    { key: 'plate', label: 'Plate no.', render: (row) => row.vehicle?.plate_number || '—' },
                    { key: 'motor', label: 'Motor no.', render: (row) => row.vehicle?.motor_number },
                    { key: 'assigned_from', label: 'From', render: (row) => formatDate(row.assigned_from) },
                    {
                      key: 'actions',
                      label: '',
                      render: (row) => (
                        <Button
                          variant="ghost-dark"
                          onClick={() => setConfirm({ type: 'vehicle', id: row.id, label: row.vehicle?.display })}
                        >
                          End
                        </Button>
                      ),
                    },
                  ]}
                  rows={detail.vehicles || []}
                  emptyMessage="No vehicles assigned to this franchise."
                />

                <form className="inline-form" onSubmit={handleAssignVehicle}>
                  <SelectField
                    id="assign_vehicle"
                    label="Assign vehicle"
                    value={vehicleForm.vehicle_id}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                    required
                  >
                    <option value="">Select vehicle…</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.display || vehicle.motor_number}
                      </option>
                    ))}
                  </SelectField>

                  <TextField
                    id="vehicle_assigned_from"
                    type="date"
                    label="Effective date"
                    value={vehicleForm.assigned_from}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, assigned_from: event.target.value }))}
                    required
                  />

                  <Button type="submit" loading={assigning} disabled={!vehicleForm.vehicle_id || !vehicleForm.assigned_from}>
                    Assign vehicle
                  </Button>
                </form>
              </div>
            ) : null}

            {detailTab === 'history' ? (
              <div className="tab-panel stack">
                <h3 className="panel__title">Driver assignment history</h3>
                <DataTable
                  columns={[
                    { key: 'driver', label: 'Driver', render: (row) => row.driver?.full_name },
                    { key: 'assigned_from', label: 'From', render: (row) => formatDate(row.assigned_from) },
                    { key: 'assigned_until', label: 'Until', render: (row) => formatDate(row.assigned_until) },
                    { key: 'assignment_status', label: 'Status', render: (row) => <StatusBadge value={row.assignment_status} /> },
                  ]}
                  rows={detail.driver_history || []}
                  emptyMessage="No driver history yet."
                />

                <h3 className="panel__title">Vehicle assignment history</h3>
                <DataTable
                  columns={[
                    { key: 'vehicle', label: 'Vehicle', render: (row) => row.vehicle?.display || row.vehicle?.motor_number },
                    { key: 'assigned_from', label: 'From', render: (row) => formatDate(row.assigned_from) },
                    { key: 'assigned_until', label: 'Until', render: (row) => formatDate(row.assigned_until) },
                    { key: 'assignment_status', label: 'Status', render: (row) => <StatusBadge value={row.assignment_status} /> },
                  ]}
                  rows={detail.vehicle_history || []}
                  emptyMessage="No vehicle history yet."
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={formOpen}
        title={editing ? 'Edit franchise' : 'New franchise'}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {saving ? 'Saving…' : 'Save franchise'}
            </Button>
          </>
        }
      >
        <form className="form" onSubmit={handleSubmit}>
          <SelectField
            id="franchisee_id"
            label="Franchisee"
            value={form.franchisee_id}
            onChange={handleChange}
            name="franchisee_id"
            error={fieldErrors.franchisee_id}
            required
          >
            <option value="">Select franchisee…</option>
            {franchiseeOptions.map((franchisee) => (
              <option key={franchisee.id} value={franchisee.id}>
                {franchisee.full_name} ({franchisee.contact_number})
              </option>
            ))}
          </SelectField>

          <div className="form__row">
            <TextField
              id="franchise_number"
              name="franchise_number"
              label="Franchise number"
              placeholder="OM-2026-0002"
              value={form.franchise_number}
              onChange={handleChange}
              error={fieldErrors.franchise_number}
              required
            />

            <SelectField
              id="franchise_status"
              name="franchise_status"
              label="Status"
              value={form.franchise_status}
              onChange={handleChange}
              error={fieldErrors.franchise_status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="form__row">
            <TextField
              id="date_issued"
              name="date_issued"
              type="date"
              label="Date issued"
              value={form.date_issued}
              onChange={handleChange}
              error={fieldErrors.date_issued}
            />
            <TextField
              id="expiration_date"
              name="expiration_date"
              type="date"
              label="Expiration date"
              value={form.expiration_date}
              onChange={handleChange}
              error={fieldErrors.expiration_date}
            />
          </div>

          <TextareaField
            id="remarks"
            name="remarks"
            label="Remarks"
            value={form.remarks}
            onChange={handleChange}
            error={fieldErrors.remarks}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="End assignment"
        message={
          confirm
            ? `End the assignment of ${confirm.label}? The record is kept as history.`
            : ''
        }
        confirmLabel="End assignment"
        loading={assigning}
        onConfirm={handleConfirmEnd}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
