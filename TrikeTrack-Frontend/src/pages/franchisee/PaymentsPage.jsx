import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import accountService from '../../services/accountService'
import { saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function PaymentsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await accountService.payments.list({
        status: status || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your payments could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 200)

    return () => window.clearTimeout(timer)
  }, [load])

  const downloadReceipt = async () => {
    if (!detail) {
      return
    }

    setReceiptLoading(true)

    try {
      const blob = await accountService.payments.receipt(detail.id)
      saveBlob(blob, `receipt-${detail.reference_number}.pdf`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The receipt could not be downloaded.'))
    } finally {
      setReceiptLoading(false)
    }
  }

  const totalPaid = rows
    .filter((row) => row.status === 'successful')
    .reduce((sum, row) => sum + Number(row.amount), 0)

  const pending = rows.filter((row) => row.status === 'pending').length

  return (
    <>
      <PageHeader
        eyebrow="Payments"
        title="My payments"
        text="Track every assessment payment, its reference number, and treasury verification status."
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">On this page</span>
          <strong className="stat-card__value">{rows.length}</strong>
          <span className="stat-card__detail">Payment transactions</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Confirmed</span>
          <strong className="stat-card__value">{money(totalPaid)}</strong>
          <span className="stat-card__detail">Successful payments on this page</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Awaiting confirmation</span>
          <strong className="stat-card__value">{pending}</strong>
          <span className="stat-card__detail">Pending treasury verification</span>
        </article>
      </div>

      <section className="panel">
        <div className="toolbar">
          <select
            className="field__input toolbar__select"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            aria-label="Filter by payment status"
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
          onRowClick={setDetail}
          rows={rows}
          emptyMessage="You have no payments yet."
          columns={[
            { key: 'reference_number', label: 'Reference' },
            {
              key: 'application',
              label: 'Application',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.application?.reference_number || '-'}</span>
                  <small className="text-muted">{row.application?.type_label || ''}</small>
                </div>
              ),
            },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
            { key: 'method', label: 'Method', render: (row) => row.method || 'Online' },
            {
              key: 'paid_at',
              label: 'Paid',
              render: (row) => (row.paid_at ? formatDate(row.paid_at) : '-'),
            },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <button
                  type="button"
                  className="link-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setDetail(row)
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
              Page {meta.current_page} of {meta.last_page} ({meta.total} payment(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(detail)}
        title={detail ? `Payment ${detail.reference_number}` : 'Payment'}
        onClose={() => setDetail(null)}
        footer={
          <>
            {detail?.receipt_url ? (
              <Button variant="secondary" loading={receiptLoading} onClick={downloadReceipt}>
                Download receipt
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
          </>
        }
      >
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
                <dt>Amount</dt>
                <dd>{money(detail.amount)}</dd>
              </div>
              <div>
                <dt>Application</dt>
                <dd>{detail.application?.reference_number || '-'}</dd>
              </div>
              <div>
                <dt>Assessment</dt>
                <dd>{detail.assessment?.assessment_number || '-'}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{detail.provider}</dd>
              </div>
              <div>
                <dt>Payment reference</dt>
                <dd>{detail.reference_number}</dd>
              </div>
              <div>
                <dt>Provider reference</dt>
                <dd>{detail.provider_reference || '-'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(detail.created_at, { hour: 'numeric', minute: '2-digit' })}</dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>{detail.paid_at ? formatDate(detail.paid_at, { hour: 'numeric', minute: '2-digit' }) : '-'}</dd>
              </div>
              <div>
                <dt>Verified by</dt>
                <dd>{detail.verified_by || '-'}</dd>
              </div>
            </dl>

            {detail.failure_reason ? (
              <Alert variant="warning" title="Payment note">
                {detail.failure_reason}
              </Alert>
            ) : null}

            {detail.status === 'pending' ? (
              <Alert variant="info" title="Awaiting confirmation">
                Treasury verifies payments before they are marked successful. Keep your reference number.
              </Alert>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  )
}
