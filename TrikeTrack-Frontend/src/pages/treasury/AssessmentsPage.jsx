import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import AssessApplicationModal from '../../components/AssessApplicationModal'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import treasuryService from '../../services/treasuryService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All assessments' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function AssessmentsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerRows, setPickerRows] = useState([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [assessing, setAssessing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await treasuryService.assessments.list({
        q: search || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Assessments could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const openDetail = async (row) => {
    setDetailLoading(true)
    setError('')

    try {
      setDetail(await treasuryService.assessments.get(row.id))
    } catch (exception) {
      setError(getErrorMessage(exception, 'The assessment could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const openPicker = async () => {
    setPickerOpen(true)
    setPickerLoading(true)
    setError('')

    try {
      const result = await treasuryService.applications.list({
        ready_for_assessment: 1,
        per_page: 50,
      })
      setPickerRows(result.items)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Applications could not be loaded.'))
    } finally {
      setPickerLoading(false)
    }
  }

  const cancelAssessment = async () => {
    if (!detail) {
      return
    }

    setCancelling(true)
    setError('')

    try {
      await treasuryService.assessments.cancel(detail.id)
      setNotice(`Assessment ${detail.assessment_number} cancelled.`)
      setDetail(null)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The assessment could not be cancelled.'))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assessments"
        title="Fee assessments"
        text="Set the fees for approved applications, adjust line items, and cancel unpaid assessments when corrections are needed."
        actions={
          <Button variant="secondary" onClick={openPicker}>
            Assess an application
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
            placeholder="Search assessment, application, franchise, or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search assessments"
          />

          <select
            className="field__input toolbar__select"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            aria-label="Filter by assessment status"
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
          onRowClick={openDetail}
          rows={rows}
          emptyMessage="No assessments match this filter."
          columns={[
            { key: 'assessment_number', label: 'Assessment' },
            {
              key: 'application',
              label: 'Application',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.application?.reference_number || '-'}</span>
                  <small className="text-muted">{row.application?.franchise?.franchise_number || ''}</small>
                </div>
              ),
            },
            {
              key: 'franchisee',
              label: 'Franchisee',
              render: (row) => row.application?.franchisee?.full_name || '-',
            },
            { key: 'total_amount', label: 'Total', render: (row) => money(row.total_amount) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'assessed_at', label: 'Assessed', render: (row) => formatDate(row.assessed_at) },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <button
                  type="button"
                  className="link-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDetail(row)
                  }}
                >
                  View
                </button>
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
              Page {meta.current_page} of {meta.last_page} ({meta.total} assessment(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(detail)}
        wide
        title={detail ? `Assessment ${detail.assessment_number}` : 'Assessment'}
        onClose={() => setDetail(null)}
        footer={
          detail?.status === 'pending' ? (
            <>
              <Button variant="danger" loading={cancelling} onClick={cancelAssessment}>
                Cancel assessment
              </Button>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
          )
        }
      >
        {detailLoading && !detail ? <p className="empty-state">Loading assessment...</p> : null}
        {detail ? (
          <>
            <dl className="detail-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={detail.status} />
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money(detail.total_amount)}</dd>
              </div>
              <div>
                <dt>Application</dt>
                <dd>{detail.application?.reference_number || '-'}</dd>
              </div>
              <div>
                <dt>Franchisee</dt>
                <dd>{detail.application?.franchisee?.full_name || '-'}</dd>
              </div>
              <div>
                <dt>Assessed by</dt>
                <dd>{detail.assessed_by || '-'}</dd>
              </div>
              <div>
                <dt>Assessed at</dt>
                <dd>{formatDate(detail.assessed_at, { hour: 'numeric', minute: '2-digit' })}</dd>
              </div>
            </dl>

            <h3 className="panel__subtitle">Fee items</h3>
            <DataTable
              rows={detail.items || []}
              emptyMessage="No fee items."
              columns={[
                { key: 'description', label: 'Fee' },
                { key: 'fee_type', label: 'Schedule', render: (row) => row.fee_type || 'Custom' },
                { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
              ]}
            />

            {(detail.payments || []).length > 0 ? (
              <>
                <h3 className="panel__subtitle">Payments</h3>
                <DataTable
                  rows={detail.payments}
                  emptyMessage="No payments."
                  columns={[
                    { key: 'reference_number', label: 'Reference' },
                    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
                    { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
                    {
                      key: 'paid_at',
                      label: 'Paid',
                      render: (row) => (row.paid_at ? formatDate(row.paid_at) : '-'),
                    },
                  ]}
                />
              </>
            ) : null}

            {detail.remarks ? (
              <Alert variant="info" title="Remarks">
                {detail.remarks}
              </Alert>
            ) : null}
          </>
        ) : null}
      </Modal>

      <Modal
        open={pickerOpen}
        wide
        title="Select an application to assess"
        onClose={() => setPickerOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setPickerOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="text-muted">
          Applications that are submitted, under review, or approved and have no assessment yet.
        </p>
        <DataTable
          loading={pickerLoading}
          rows={pickerRows}
          emptyMessage="Every eligible application already has an assessment."
          columns={[
            { key: 'reference_number', label: 'Reference' },
            { key: 'franchisee', label: 'Franchisee', render: (row) => row.franchisee?.full_name || '-' },
            { key: 'type_label', label: 'Type' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPickerOpen(false)
                    setAssessing(row)
                  }}
                >
                  Assess
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      {assessing ? (
        <AssessApplicationModal
          application={assessing}
          onClose={() => setAssessing(null)}
          onSaved={() => {
            setNotice(`Assessment saved for ${assessing.reference_number}.`)
            load()
          }}
        />
      ) : null}
    </>
  )
}
