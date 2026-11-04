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
  new_owner_first_name: '',
  new_owner_middle_name: '',
  new_owner_last_name: '',
  new_owner_suffix: '',
  new_owner_contact_number: '',
  new_owner_email: '',
  new_owner_address: '',
  new_owner_barangay: '',
  new_owner_city_municipality: '',
  new_owner_province: '',
  relationship_to_owner: '',
  remarks: '',
  franchisee_remarks: '',
}

export default function TransferPage() {
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
      setOptions(await applicationService.mine.transferOptions())
    } catch (exception) {
      setError(getErrorMessage(exception, 'Transfer information could not be loaded.'))
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
    setNotice('')
    setError('')
    setFieldErrors({})
    setFilingFranchise(entry)
    setForm({
      ...EMPTY_FORM,
      new_owner_barangay: options?.franchisee?.barangay || '',
      new_owner_city_municipality: options?.franchisee?.city_municipality || '',
      new_owner_province: options?.franchisee?.province || '',
    })
  }

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()

    if (!filingFranchise) {
      return
    }

    const confirmed = await confirmCreate({
      entity: 'franchise transfer application',
      details: [{ label: 'Franchise', value: filingFranchise.franchise.franchise_number }],
      confirmButtonText: 'Yes, file transfer',
    })

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError('')
    setFieldErrors({})

    try {
      const application = await applicationService.mine.fileTransfer({
        franchise_id: filingFranchise.franchise.id,
        ...form,
      })

      setFilingFranchise(null)
      setForm(EMPTY_FORM)
      setNotice(
        `Transfer ${application.reference_number} filed. Upload the deed of sale and new owner requirements in your application tracking page.`,
      )
      setView(application)
      await load()
    } catch (exception) {
      const errors = getFieldErrors(exception)
      setFieldErrors(errors)
      setError(Object.values(errors)[0] || getErrorMessage(exception, 'The transfer could not be filed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const franchises = options?.franchises ?? []
  const eligibleCount = franchises.filter((entry) => entry.eligibility.eligible).length

  return (
    <>
      <PageHeader
        eyebrow="Franchise transfer"
        title="Transfer franchise ownership"
        text="Propose a new owner for one of your franchises. BPLO reviews the deed and updates the franchise record after approval."
        actions={
          eligibleCount > 0 ? (
            <Button onClick={() => openForm(franchises.find((entry) => entry.eligibility.eligible))}>
              File transfer
            </Button>
          ) : null
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {loading ? (
        <p className="empty-state">Loading transfer information...</p>
      ) : franchises.length === 0 ? (
        <Alert variant="info" title="No franchise on record">
          BPLO personnel link your franchise records to this account. Once linked, you may file a transfer.
        </Alert>
      ) : (
        <section className="stack">
          {franchises.map((entry) => (
            <article key={entry.franchise.id} className="panel">
              <div className="record-card__head">
                <div>
                  <h2 className="panel__title">{entry.franchise.franchise_number}</h2>
                  <p className="panel__text">
                    Expires {formatDate(entry.franchise.expiration_date)}
                    {entry.vehicle ? ` - ${entry.vehicle.display}` : ''}
                  </p>
                </div>
                <StatusBadge value={entry.franchise.franchise_status} />
              </div>

              {entry.eligibility.eligible ? (
                <div className="row-actions">
                  <Button onClick={() => openForm(entry)}>File transfer</Button>
                  {entry.eligibility.last_transfer ? (
                    <Button
                      variant="secondary"
                      loading={viewLoading}
                      onClick={() => openApplication(entry.eligibility.last_transfer.id)}
                    >
                      View last transfer
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <Alert variant="warning" title="Transfer not available">
                    {entry.eligibility.reason}
                  </Alert>
                  {entry.eligibility.open_application ? (
                    <div className="row-actions">
                      <Button
                        variant="secondary"
                        loading={viewLoading}
                        onClick={() => openApplication(entry.eligibility.open_application.id)}
                      >
                        Track open transfer
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
          <h2 className="panel__title">Transfer requirements</h2>
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
        <h2 className="panel__title">My transfer applications</h2>
        <DataTable
          rows={options?.history ?? []}
          emptyMessage="You have not filed a transfer yet."
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
        title="File franchise transfer"
        onClose={() => setFilingFranchise(null)}
        footer={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => setFilingFranchise(null)}>
              Cancel
            </Button>
            <Button type="submit" form="transfer-form" loading={submitting}>
              Submit transfer
            </Button>
          </div>
        }
      >
        <form id="transfer-form" className="form" onSubmit={submit}>
          <p className="panel__text">
            Franchise <strong>{filingFranchise?.franchise.franchise_number}</strong> will be transferred
            subject to BPLO approval. The new owner is added as a franchisee record once approved.
          </p>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">First name <span className="field__required">*</span></span>
              <input
                className={`field__input${fieldErrors.new_owner_first_name ? ' field__input--invalid' : ''}`}
                value={form.new_owner_first_name}
                onChange={update('new_owner_first_name')}
                required
              />
              {fieldErrors.new_owner_first_name ? (
                <p className="field__error">{fieldErrors.new_owner_first_name}</p>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">Middle name</span>
              <input
                className="field__input"
                value={form.new_owner_middle_name}
                onChange={update('new_owner_middle_name')}
              />
            </label>

            <label className="field">
              <span className="field__label">Last name <span className="field__required">*</span></span>
              <input
                className={`field__input${fieldErrors.new_owner_last_name ? ' field__input--invalid' : ''}`}
                value={form.new_owner_last_name}
                onChange={update('new_owner_last_name')}
                required
              />
              {fieldErrors.new_owner_last_name ? (
                <p className="field__error">{fieldErrors.new_owner_last_name}</p>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">Suffix</span>
              <input
                className="field__input"
                value={form.new_owner_suffix}
                onChange={update('new_owner_suffix')}
                placeholder="Jr., Sr., III"
              />
            </label>

            <label className="field">
              <span className="field__label">Mobile number <span className="field__required">*</span></span>
              <input
                className={`field__input${fieldErrors.new_owner_contact_number ? ' field__input--invalid' : ''}`}
                value={form.new_owner_contact_number}
                onChange={update('new_owner_contact_number')}
                placeholder="09171234567"
                required
              />
              {fieldErrors.new_owner_contact_number ? (
                <p className="field__error">{fieldErrors.new_owner_contact_number}</p>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">Email address</span>
              <input
                className="field__input"
                type="email"
                value={form.new_owner_email}
                onChange={update('new_owner_email')}
              />
            </label>

            <label className="field field--span-2">
              <span className="field__label">Complete address <span className="field__required">*</span></span>
              <input
                className={`field__input${fieldErrors.new_owner_address ? ' field__input--invalid' : ''}`}
                value={form.new_owner_address}
                onChange={update('new_owner_address')}
                required
              />
              {fieldErrors.new_owner_address ? (
                <p className="field__error">{fieldErrors.new_owner_address}</p>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">Barangay</span>
              <input className="field__input" value={form.new_owner_barangay} onChange={update('new_owner_barangay')} />
            </label>

            <label className="field">
              <span className="field__label">City / municipality</span>
              <input
                className="field__input"
                value={form.new_owner_city_municipality}
                onChange={update('new_owner_city_municipality')}
              />
            </label>

            <label className="field">
              <span className="field__label">Province</span>
              <input className="field__input" value={form.new_owner_province} onChange={update('new_owner_province')} />
            </label>

            <label className="field">
              <span className="field__label">Relationship to current owner</span>
              <input
                className="field__input"
                value={form.relationship_to_owner}
                onChange={update('relationship_to_owner')}
                placeholder="Buyer, relative, business partner"
              />
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

          <p className="field__hint">
            Upload the notarized deed of sale, current franchise certificate, and the new owner's valid ID after
            the application is created.
          </p>
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
