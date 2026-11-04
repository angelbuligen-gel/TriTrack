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

export default function RenewalPage() {
  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filingFranchise, setFilingFranchise] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await applicationService.mine.renewalOptions()
      setOptions(data)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Renewal information could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Defer so the request never sets state during the effect itself.
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

  const submitRenewal = async (event) => {
    event.preventDefault()

    if (!filingFranchise) {
      return
    }

    const confirmed = await confirmCreate({
      entity: 'renewal application',
      details: [
        { label: 'Franchise', value: filingFranchise.franchise.franchise_number },
        { label: 'Remarks', value: remarks },
      ],
      confirmButtonText: 'Yes, file renewal',
    })

    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const application = await applicationService.mine.fileRenewal({
        franchise_id: filingFranchise.franchise.id,
        franchisee_remarks: remarks || null,
      })

      setFilingFranchise(null)
      setRemarks('')
      setNotice(
        `Renewal ${application.reference_number} filed. Upload the required documents below to move it forward.`,
      )
      setView(application)
      await load()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The renewal could not be filed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const franchises = options?.franchises ?? []
  const eligibleCount = franchises.filter((entry) => entry.eligibility.eligible).length

  return (
    <>
      <PageHeader
        eyebrow="Franchise renewal"
        title="Renew your franchise"
        text="File a renewal for the next franchise year, submit the requirements, and track BPLO's review."
        actions={
          franchises.length > 0 ? (
            <Button
              disabled={eligibleCount === 0}
              onClick={() => {
                const entry = franchises.find((candidate) => candidate.eligibility.eligible)
                setNotice('')
                setFilingFranchise(entry || null)
              }}
            >
              File renewal
            </Button>
          ) : null
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {loading ? (
        <p className="empty-state">Loading renewal information…</p>
      ) : franchises.length === 0 ? (
        <Alert variant="info" title="No franchise on record">
          BPLO personnel link your existing franchise records to this account. Once linked, you can file a
          renewal here.
        </Alert>
      ) : (
        <section className="stack">
          {franchises.map(({ franchise, eligibility }) => (
            <article key={franchise.id} className="panel">
              <div className="record-card__head">
                <div>
                  <h2 className="panel__title">{franchise.franchise_number}</h2>
                  <p className="panel__text">
                    Expires {formatDate(franchise.expiration_date)} ·{' '}
                    {franchise.driver_names.length} driver(s), {franchise.vehicle_count} vehicle(s)
                  </p>
                </div>
                <StatusBadge value={franchise.franchise_status} />
              </div>

              {eligibility.eligible ? (
                <>
                  <p className="panel__text">
                    Eligible for renewal. The new coverage year would be{' '}
                    <strong>{eligibility.suggested_coverage_year}</strong>.
                  </p>
                  <div className="row-actions">
                    <Button
                      onClick={() => {
                        setNotice('')
                        setFilingFranchise({ franchise, eligibility })
                      }}
                    >
                      File renewal
                    </Button>
                    {eligibility.last_renewal ? (
                      <Button
                        variant="secondary"
                        onClick={() => openApplication(eligibility.last_renewal.id)}
                        loading={viewLoading}
                      >
                        View last renewal
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Alert variant="warning" title="Renewal not available">
                    {eligibility.reason}
                  </Alert>
                  {eligibility.open_application ? (
                    <div className="row-actions">
                      <Button
                        variant="secondary"
                        loading={viewLoading}
                        onClick={() => openApplication(eligibility.open_application.id)}
                      >
                        Track open renewal
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
          <h2 className="panel__title">Renewal requirements</h2>
          <p className="panel__text">
            Prepare these documents before filing. You can upload them as soon as the application is
            created, and each upload is kept in your submission history.
          </p>
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
        <h2 className="panel__title">My renewal applications</h2>
        <DataTable
          rows={options?.renewal_history ?? []}
          emptyMessage="You have not filed a renewal yet."
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
            { key: 'coverage', label: 'Coverage year', render: (row) => row.coverage_year || '—' },
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
        title="File franchise renewal"
        onClose={() => setFilingFranchise(null)}
        footer={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => setFilingFranchise(null)}>
              Cancel
            </Button>
            <Button type="submit" form="renewal-form" loading={submitting}>
              Submit application
            </Button>
          </div>
        }
      >
        <form id="renewal-form" className="form" onSubmit={submitRenewal}>
          <p className="panel__text">
            {filingFranchise?.franchise.franchise_number} will be renewed for coverage year{' '}
            <strong>{filingFranchise?.eligibility.suggested_coverage_year}</strong>.
          </p>

          <div className="field">
            <span className="field__label">Franchisee</span>
            <p className="record-card__meta">{options?.franchisee?.full_name}</p>
          </div>

          <label className="field">
            <span className="field__label">Remarks (optional)</span>
            <textarea
              className="field__input field__input--textarea"
              rows={3}
              value={remarks}
              maxLength={1000}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Anything BPLO should know about this renewal."
            />
          </label>

          <p className="field__hint">
            Documents are uploaded after the application is created, so you can submit them one by one.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(view)}
        wide
        title={view ? `${view.type_label} · ${view.reference_number}` : 'Application'}
        onClose={() => setView(null)}
        footer={
          <Button variant="secondary" onClick={() => setView(null)}>
            Close
          </Button>
        }
      >
        {view ? (
          <ApplicationDetail
            application={view}
            role="franchisee"
            onChanged={refreshView}
            onNotify={setNotice}
          />
        ) : null}
      </Modal>

      {viewLoading && !view ? <p className="empty-state">Loading application…</p> : null}
    </>
  )
}
