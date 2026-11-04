import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import DocumentPreview from '../../components/DocumentPreview'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import applicationService from '../../services/applicationService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { formatDate } from '../../utils/format'

const REVIEW_OPTIONS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All documents' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All application types' },
  { value: 'renewal', label: 'Franchise renewal' },
  { value: 'transfer', label: 'Franchise transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

const OPEN_STATUSES = ['submitted', 'under_review', 'documents_pending']

export default function DocumentReviewPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [reviewStatus, setReviewStatus] = useState('pending')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selected, setSelected] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applicationService.bplo.documents({
        q: search || undefined,
        review_status: reviewStatus || undefined,
        type: type || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Submitted documents could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, reviewStatus, type, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const closeDialog = () => {
    setSelected(null)
    setRejecting(false)
    setRemarks('')
  }

  const review = async (status) => {
    if (!selected) {
      return
    }

    if (status === 'rejected' && !remarks.trim()) {
      setError('Explain what needs to be corrected before rejecting the document.')
      return
    }

    setBusy(status)
    setError('')

    try {
      await applicationService.bplo.reviewDocument(selected.document.id, status, remarks || null)
      setNotice(`${selected.document.document_type} ${status}.`)
      closeDialog()
      await load()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The review could not be saved.'))
    } finally {
      setBusy('')
    }
  }

  const applicationOpen = selected ? OPEN_STATUSES.includes(selected.application.status) : false

  return (
    <>
      <PageHeader
        eyebrow="Document review"
        title="Submitted documents"
        text="Inspect each uploaded document, compare it with the application, and record a review decision."
        badge={
          meta?.pending_total !== undefined ? (
            <span className="badge badge--warning">{meta.pending_total} awaiting review</span>
          ) : null
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search file name, reference, franchise, or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search documents"
          />

          <select
            className="field__input toolbar__select"
            value={reviewStatus}
            onChange={(event) => {
              setPage(1)
              setReviewStatus(event.target.value)
            }}
            aria-label="Filter by review status"
          >
            {REVIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="field__input toolbar__select"
            value={type}
            onChange={(event) => {
              setPage(1)
              setType(event.target.value)
            }}
            aria-label="Filter by application type"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          loading={loading}
          onRowClick={(row) => {
            setError('')
            setSelected(row)
          }}
          rows={rows}
          rowKey={(row) => row.document.id}
          emptyMessage="No documents match this filter."
          columns={[
            {
              key: 'document',
              label: 'Document',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.document.document_type}</strong>
                  <small className="text-muted">
                    {row.document.original_name} · {row.document.human_size}
                  </small>
                </div>
              ),
            },
            { key: 'franchisee', label: 'Franchisee', render: (row) => row.franchisee.full_name || '—' },
            {
              key: 'application',
              label: 'Application',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.application.reference_number}</span>
                  <small className="text-muted">{row.application.type_label}</small>
                </div>
              ),
            },
            { key: 'franchise', label: 'Franchise', render: (row) => row.franchise.franchise_number || '—' },
            {
              key: 'uploaded',
              label: 'Submitted',
              render: (row) => formatDate(row.document.uploaded_at, { hour: 'numeric', minute: '2-digit' }),
            },
            {
              key: 'review',
              label: 'Review',
              render: (row) => (
                <span
                  className={`badge badge--${row.document.review_status === 'approved' ? 'success' : row.document.review_status === 'rejected' ? 'danger' : 'warning'}`}
                >
                  {row.document.review_status}
                </span>
              ),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <button
                  type="button"
                  className="link-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setError('')
                    setSelected(row)
                  }}
                >
                  Review
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
              Page {meta.current_page} of {meta.last_page} · {meta.total} document(s)
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
        open={Boolean(selected)}
        wide
        title={selected ? selected.document.document_type : 'Document'}
        onClose={closeDialog}
        footer={
          selected ? (
            <div className="row-actions">
              <Button variant="secondary" onClick={closeDialog}>
                Close
              </Button>
              {applicationOpen ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRejecting(true)
                      setRemarks('')
                      setError('')
                    }}
                  >
                    Reject
                  </Button>
                  <Button loading={busy === 'approved'} disabled={Boolean(busy)} onClick={() => review('approved')}>
                    Approve document
                  </Button>
                </>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
          <>
            <dl className="detail-list">
              <div>
                <dt>Application</dt>
                <dd>
                  {selected.application.reference_number} · {selected.application.type_label}
                </dd>
              </div>
              <div>
                <dt>Franchise</dt>
                <dd>{selected.franchise.franchise_number || '—'}</dd>
              </div>
              <div>
                <dt>Franchisee</dt>
                <dd>{selected.franchisee.full_name || '—'}</dd>
              </div>
              <div>
                <dt>Application status</dt>
                <dd>{selected.application.status_label}</dd>
              </div>
            </dl>

            <DocumentPreview document={selected.document} embedded />

            {rejecting ? (
              <div className="panel">
                <label className="field">
                  <span className="field__label">
                    Reason for rejection <span className="field__required">*</span>
                  </span>
                  <textarea
                    className="field__input field__input--textarea"
                    rows={3}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Tell the franchisee which document to correct and resubmit."
                  />
                </label>
                <div className="row-actions">
                  <Button variant="secondary" onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                  <Button loading={busy === 'rejected'} onClick={() => review('rejected')}>
                    Confirm rejection
                  </Button>
                </div>
              </div>
            ) : null}

            {!applicationOpen ? (
              <p className="field__hint">
                This application has already been decided, so its documents can no longer be reviewed.
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  )
}
