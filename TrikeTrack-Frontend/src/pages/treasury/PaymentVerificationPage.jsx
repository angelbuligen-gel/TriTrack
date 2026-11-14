import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import treasuryService from '../../services/treasuryService'
import { saveBlob } from '../../services/applicationService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Awaiting verification' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All payments' },
]

const METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
]

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function PaymentVerificationPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('pending')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [verifyForm, setVerifyForm] = useState({
    status: 'successful',
    provider_reference: '',
    remarks: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await treasuryService.payments.list({
        q: search || undefined,
        status: status || undefined,
        method: method || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Payments could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, status, method, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const openDetail = async (row) => {
    setDetailLoading(true)
    setError('')
    setNotice('')

    try {
      const payment = await treasuryService.payments.get(row.id)
      setDetail(payment)
      setVerifyForm({
        status: 'successful',
        provider_reference: payment.provider_reference || '',
        remarks: '',
      })
    } catch (exception) {
      setError(getErrorMessage(exception, 'The payment could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const downloadReceipt = async () => {
    if (!detail) {
      return
    }

    setReceiptLoading(true)
    setError('')

    try {
      const blob = await treasuryService.payments.receipt(detail.id)
      saveBlob(blob, `receipt-${detail.reference_number}.pdf`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The receipt could not be downloaded.'))
    } finally {
      setReceiptLoading(false)
    }
  }

  const submitVerification = async (event) => {
    event.preventDefault()
    setVerifying(true)
    setError('')

    try {
      await treasuryService.payments.verify(detail.id, verifyForm)
      setNotice(`Payment ${detail.reference_number} marked ${verifyForm.status}.`)
      setDetail(null)
      load()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(
        Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The payment could not be verified.'),
      )
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Payments"
        title="Payment verification"
        text="Confirm that money actually arrived before marking a payment successful. Online provider webhooks are recorded automatically."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search reference, application, or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search payments"
          />

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

          <select
            className="field__input toolbar__select"
            value={method}
            onChange={(event) => {
              setPage(1)
              setMethod(event.target.value)
            }}
            aria-label="Filter by payment method"
          >
            {METHOD_OPTIONS.map((option) => (
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
          emptyMessage="No payments match this filter."
          columns={[
            { key: 'reference_number', label: 'Reference' },
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
              render: (row) => row.application?.franchisee?.full_name || row.franchisee?.full_name || '-',
            },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
            { key: 'method', label: 'Method', render: (row) => humanizeStatus(row.method || 'online') },
            { key: 'provider', label: 'Provider', render: (row) => row.provider },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'created_at', label: 'Initiated', render: (row) => formatDate(row.created_at) },
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
                  {row.status === 'pending' ? 'Verify' : 'View'}
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
        wide
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
        {detailLoading && !detail ? <p className="empty-state">Loading payment...</p> : null}
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
                <dt>Franchisee</dt>
                <dd>{detail.application?.franchisee?.full_name || detail.franchisee?.full_name || '-'}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{humanizeStatus(detail.method || 'online')}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{detail.provider}</dd>
              </div>
              <div>
                <dt>Provider reference</dt>
                <dd>{detail.provider_reference || '-'}</dd>
              </div>
              <div>
                <dt>Initiated</dt>
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
              <Alert variant="warning" title="Recorded note">
                {detail.failure_reason}
              </Alert>
            ) : null}

            {detail.status === 'pending' ? (
              <form className="form" onSubmit={submitVerification}>
                <h3 className="panel__subtitle">Record verification</h3>

                <div className="form-grid">
                  <label className="field">
                    <span className="field__label">Decision</span>
                    <select
                      className="field__input"
                      value={verifyForm.status}
                      onChange={(event) =>
                        setVerifyForm((current) => ({ ...current, status: event.target.value }))
                      }
                    >
                      <option value="successful">Payment received (successful)</option>
                      <option value="failed">Payment failed</option>
                      <option value="cancelled">Payment cancelled</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="field__label">Provider reference</span>
                    <input
                      className="field__input"
                      value={verifyForm.provider_reference}
                      onChange={(event) =>
                        setVerifyForm((current) => ({ ...current, provider_reference: event.target.value }))
                      }
                      placeholder="OR number, GCash reference, etc."
                    />
                  </label>

                  <label className="field field--span-2">
                    <span className="field__label">Remarks</span>
                    <textarea
                      className="field__input"
                      rows={2}
                      value={verifyForm.remarks}
                      onChange={(event) =>
                        setVerifyForm((current) => ({ ...current, remarks: event.target.value }))
                      }
                      placeholder="Internal verification notes."
                    />
                  </label>
                </div>

                <div className="row-actions">
                  <Button type="submit" loading={verifying}>
                    Save verification
                  </Button>
                </div>
              </form>
            ) : null}

            {detail.events?.length ? (
              <>
                <h3 className="panel__subtitle">Event log</h3>
                <ul className="timeline">
                  {detail.events.map((event) => (
                    <li key={event.id} className="timeline__item">
                      <div className="timeline__head">
                        <strong>{humanizeStatus(event.event)}</strong>
                        <span className="text-muted">
                          {formatDate(event.created_at, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="record-card__meta">
                        {humanizeStatus(event.status)} via {event.source}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  )
}
