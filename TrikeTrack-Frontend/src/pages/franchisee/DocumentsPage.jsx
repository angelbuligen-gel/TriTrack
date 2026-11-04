import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import DocumentPreview from '../../components/DocumentPreview'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import applicationService from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

const REVIEW_OPTIONS = [
  { value: '', label: 'All documents' },
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function DocumentsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applicationService.mine.documents({
        q: search || undefined,
        review_status: reviewStatus || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your document history could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, reviewStatus, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <>
      <PageHeader
        eyebrow="Document history"
        title="My submitted documents"
        text="Every upload is kept as a separate record. Open a document to preview the file BPLO is reviewing."
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search file name"
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
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row) => row.document.id}
          emptyMessage="You have not submitted any documents yet."
          columns={[
            {
              key: 'document',
              label: 'Document',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.document.document_type}</strong>
                  <small className="text-muted">
                    {row.document.original_name} - {row.document.human_size}
                  </small>
                </div>
              ),
            },
            {
              key: 'application',
              label: 'Application',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.application.reference_number}</span>
                  <small className="text-muted">
                    {row.application.type_label} - {row.application.franchise_number || 'No franchise'}
                  </small>
                </div>
              ),
            },
            {
              key: 'uploaded',
              label: 'Submitted',
              render: (row) => formatDate(row.document.uploaded_at, { hour: 'numeric', minute: '2-digit' }),
            },
            {
              key: 'review',
              label: 'Review',
              render: (row) => (
                <div className="cell-stack">
                  <span
                    className={`badge badge--${row.document.review_status === 'approved' ? 'success' : row.document.review_status === 'rejected' ? 'danger' : 'warning'}`}
                  >
                    {humanizeStatus(row.document.review_status)}
                  </span>
                  {row.document.review_remarks ? (
                    <small className="text-muted">{row.document.review_remarks}</small>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'ocr',
              label: 'OCR',
              render: (row) => (
                <span className="text-muted">
                  {row.document.ml_status ? humanizeStatus(row.document.ml_status) : '-'}
                </span>
              ),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <button type="button" className="link-button" onClick={() => setPreview(row.document)}>
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
              Page {meta.current_page} of {meta.last_page} ({meta.total} document(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(preview)}
        wide
        title={preview ? preview.document_type : 'Document'}
        onClose={() => setPreview(null)}
        footer={
          <Button variant="secondary" onClick={() => setPreview(null)}>
            Close
          </Button>
        }
      >
        {preview ? <DocumentPreview document={preview} embedded /> : null}
      </Modal>
    </>
  )
}
