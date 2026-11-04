import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import ApplicationDetail from '../../components/ApplicationDetail'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import applicationService from '../../services/applicationService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { confirmCreate } from '../../utils/confirm'
import { formatDate } from '../../utils/format'

const EMPTY_FORM = {
  existing_vehicle_id: '',
  proposed_motor_number: '',
  proposed_chassis_number: '',
  proposed_plate_number: '',
  proposed_or_number: '',
  proposed_cr_number: '',
  make: '',
  model: '',
  year_model: '',
  color: '',
  remarks: '',
  franchisee_remarks: '',
}

export default function ChangeMotorPage() {
  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filingFranchise, setFilingFranchise] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setOptions(await applicationService.mine.changeMotorOptions())
    } catch (exception) {
      setError(getErrorMessage(exception, 'Change motor information could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const openApplication = async (id) => {
    setViewLoading(true)
    setError('')

    try {
      setView(await applicationService.mine.get(id))
    } catch (exception) {
      setError(getErrorMessage(exception, 'The application could not be loaded.'))
    } finally {
      setViewLoading(false)
    }
  }

  const refreshView = async () => {
    if (!view) {
      return
    }

    try {
      setView(await applicationService.mine.get(view.id))
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The application could not be refreshed.'))
    }
  }

  const openForm = (entry) => {
    const firstVehicle = entry.active_vehicles?.[0]

    setNotice('')
    setError('')
    setFieldErrors({})
    setFilingFranchise(entry)
    setForm({ ...EMPTY_FORM, existing_vehicle_id: firstVehicle ? String(firstVehicle.id) : '' })
  }

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()

    if (!filingFranchise) {
      return
    }

    const confirmed = await confirmCreate({
      entity: 'change motor application',
      details: [
        { label: 'Franchise', value: filingFranchise.franchise.franchise_number },
        { label: 'New plate no.', value: form.plate_number },
      ],
      confirmButtonText: 'Yes, file request',
    })

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError('')
    setFieldErrors({})

    try {
      const application = await applicationService.mine.fileChangeMotor({
        franchise_id: filingFranchise.franchise.id,
        ...form,
        existing_vehicle_id: Number(form.existing_vehicle_id),
        year_model: form.year_model ? Number(form.year_model) : null,
      })

      setFilingFranchise(null)
      setForm(EMPTY_FORM)
      setNotice(
        `Change motor ${application.reference_number} filed. Upload the new registration and deed of sale in your application tracking page.`,
      )
      setView(application)
      await load()
    } catch (exception) {
      const errors = getFieldErrors(exception)
      setFieldErrors(errors)
      setError(Object.values(errors)[0] || getErrorMessage(exception, 'The change motor request could not be filed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const franchises = options?.franchises ?? []
  const eligibleCount = franchises.filter((entry) => entry.eligibility.eligible).length

  return (
    <>
      <PageHeader
        eyebrow="Change motor"
        title="Replace your registered motor"
        text="File a request to replace the motor assigned to your franchise. BPLO reviews the new registration before approving the swap."
        actions={
          eligibleCount > 0 ? (
            <Button onClick={() => openForm(franchises.find((entry) => entry.eligibility.eligible))}>
              File change motor
            </Button>
          ) : null
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {loading ? (
        <p className="empty-state">Loading change motor information...</p>
      ) : franchises.length === 0 ? (
        <Alert variant="info" title="No franchise on record">
          BPLO personnel link your franchise records to this account. Once linked, you may request a motor change.
        </Alert>
      ) : (
        <section className="stack">
          {franchises.map((entry) => (
            <article key={entry.franchise.id} className="panel">
              <div className="record-card__head">
                <div>
                  <h2 className="panel__title">{entry.franchise.franchise_number}</h2>
                  <p className="panel__text">Expires {formatDate(entry.franchise.expiration_date)}</p>
                </div>
                <StatusBadge value={entry.franchise.franchise_status} />
              </div>

              {entry.active_vehicles?.length ? (
                <div className="stack">
                  {entry.active_vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="record-card">
                      <div className="record-card__head">
                        <strong>{vehicle.display || vehicle.motor_number}</strong>
                        <StatusBadge value={vehicle.vehicle_status} />
                      </div>
                      <p className="record-card__meta">
                        Motor no. {vehicle.motor_number} - Plate {vehicle.plate_number || 'N/A'} - OR{' '}
                        {vehicle.or_number || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {entry.eligibility.eligible ? (
                <div className="row-actions">
                  <Button onClick={() => openForm(entry)}>File change motor</Button>
                </div>
              ) : (
                <>
                  <Alert variant="warning" title="Change motor not available">
                    {entry.eligibility.reason}
                  </Alert>
                  {entry.eligibility.open_application ? (
                    <div className="row-actions">
                      <Button
                        variant="secondary"
                        loading={viewLoading}
                        onClick={() => openApplication(entry.eligibility.open_application.id)}
                      >
                        Track open request
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </article>
          ))}
        </section>
      )}

      {options?.requirements?.length ? (
        <section className="panel">
          <h2 className="panel__title">Change motor requirements</h2>
          <div className="checklist">
            {options.requirements.map((requirement) => (
              <div key={requirement.code} className="checklist__item">
                <div className="checklist__meta">
                  <strong>
                    {requirement.name}
                    {requirement.is_required ? '' : ' (optional)'}
                  </strong>
                  <small>{requirement.description}</small>
                </div>
                <span className={`badge badge--${requirement.is_required ? 'warning' : 'info'}`}>
                  {requirement.is_required ? 'Required' : 'Optional'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panel__title">My change motor applications</h2>
        <DataTable
          rows={options?.history ?? []}
          emptyMessage="You have not filed a change motor request yet."
          columns={[
            {
              key: 'reference',
              label: 'Reference',
              render: (row) => (
                <button type="button" className="link-button" onClick={() => openApplication(row.id)}>
                  {row.reference_number}
                </button>
              ),
            },
            { key: 'submitted', label: 'Filed', render: (row) => formatDate(row.submitted_at) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <button type="button" className="link-button" onClick={() => openApplication(row.id)}>
                  {row.status === 'approved' ? 'View' : 'Track'}
                </button>
              ),
            },
          ]}
        />
      </section>

      <Modal
        open={Boolean(filingFranchise)}
        wide
        title="File change motor"
        onClose={() => setFilingFranchise(null)}
        footer={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => setFilingFranchise(null)}>
              Cancel
            </Button>
            <Button type="submit" form="change-motor-form" loading={submitting}>
              Submit request
            </Button>
          </div>
        }
      >
        <form id="change-motor-form" className="form" onSubmit={submit}>
          <p className="panel__text">
            Franchise <strong>{filingFranchise?.franchise.franchise_number}</strong>. Select the current unit
            being replaced and describe the replacement motor.
          </p>

          <label className="field">
            <span className="field__label">Motor being replaced <span className="field__required">*</span></span>
            <select
              className={`field__input${fieldErrors.existing_vehicle_id ? ' field__input--invalid' : ''}`}
              value={form.existing_vehicle_id}
              onChange={update('existing_vehicle_id')}
              required
            >
              <option value="">Select an active motor</option>
              {(filingFranchise?.active_vehicles ?? []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.display || vehicle.motor_number}
                </option>
              ))}
            </select>
            {fieldErrors.existing_vehicle_id ? (
              <p className="field__error">{fieldErrors.existing_vehicle_id}</p>
            ) : null}
          </label>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">New motor number <span className="field__required">*</span></span>
              <input
                className={`field__input${fieldErrors.proposed_motor_number ? ' field__input--invalid' : ''}`}
                value={form.proposed_motor_number}
                onChange={update('proposed_motor_number')}
                required
              />
              {fieldErrors.proposed_motor_number ? (
                <p className="field__error">{fieldErrors.proposed_motor_number}</p>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">New chassis number</span>
              <input
                className="field__input"
                value={form.proposed_chassis_number}
                onChange={update('proposed_chassis_number')}
              />
            </label>

            <label className="field">
              <span className="field__label">New plate number</span>
              <input
                className="field__input"
                value={form.proposed_plate_number}
                onChange={update('proposed_plate_number')}
              />
            </label>

            <label className="field">
              <span className="field__label">OR number</span>
              <input className="field__input" value={form.proposed_or_number} onChange={update('proposed_or_number')} />
            </label>

            <label className="field">
              <span className="field__label">CR number</span>
              <input className="field__input" value={form.proposed_cr_number} onChange={update('proposed_cr_number')} />
            </label>

            <label className="field">
              <span className="field__label">Make</span>
              <input className="field__input" value={form.make} onChange={update('make')} />
            </label>

            <label className="field">
              <span className="field__label">Model</span>
              <input className="field__input" value={form.model} onChange={update('model')} />
            </label>

            <label className="field">
              <span className="field__label">Year model</span>
              <input
                className="field__input"
                type="number"
                min="1950"
                max={new Date().getFullYear() + 2}
                value={form.year_model}
                onChange={update('year_model')}
              />
            </label>

            <label className="field">
              <span className="field__label">Color</span>
              <input className="field__input" value={form.color} onChange={update('color')} />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Remarks for BPLO</span>
            <textarea
              className="field__input field__input--textarea"
              rows={3}
              value={form.franchisee_remarks}
              onChange={update('franchisee_remarks')}
              maxLength={1000}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(view)}
        wide
        title={view ? `${view.type_label} - ${view.reference_number}` : 'Application'}
        onClose={() => setView(null)}
        footer={
          <Button variant="secondary" onClick={() => setView(null)}>
            Close
          </Button>
        }
      >
        {view ? (
          <ApplicationDetail application={view} role="franchisee" onChanged={refreshView} onNotify={setNotice} />
        ) : null}
      </Modal>

      {viewLoading && !view ? <p className="empty-state">Loading application...</p> : null}
    </>
  )
}
