import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import ApplicationDetail from '../../components/ApplicationDetail'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import applicationService from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

const TYPE_OPTIONS = [
  { value: '', label: 'All application types' },
  { value: 'renewal', label: 'Franchise renewal' },
  { value: 'transfer', label: 'Franchise transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'documents_pending', label: 'Documents pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function ApplicationsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applicationService.mine.list({
        q: search || undefined,
        type: type || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your applications could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, type, status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const openDetail = async (row) => {
    setNotice('')
    setDetailLoading(true)

    try {
      setDetail(await applicationService.mine.get(row.id))
    } catch (exception) {
      setError(getErrorMessage(exception, 'The application could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async () => {
    if (!detail) {
      return
    }

    try {
      setDetail(await applicationService.mine.get(detail.id))
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The application could not be refreshed.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Application tracking"
        title="My applications"
        text="Follow every renewal, transfer, and change motor request from filing to decision."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search reference, franchise, or name"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search applications"
          />

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

          <select
            className="field__input toolbar__select"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            aria-label="Filter by status"
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
          emptyMessage="You have not filed any application yet."
          columns={[
            { key: 'reference_number', label: 'Reference' },
            { key: 'type_label', label: 'Type' },
            {
              key: 'franchise',
              label: 'Franchise',
              render: (row) => row.franchise?.franchise_number || '—',
            },
            {
              key: 'submitted',
              label: 'Filed',
              render: (row) => formatDate(row.submitted_at),
            },
            {
              key: 'progress',
              label: 'Documents',
              render: (row) => (
                <span>
                  {row.summary.approved}/{row.summary.required_total} approved
                  {row.summary.missing > 0 ? (
                    <small className="text-muted"> · {row.summary.missing} missing</small>
                  ) : null}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge value={row.status} />,
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
                    openDetail(row)
                  }}
                >
                  {row.is_open ? 'Track' : 'View'}
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
              Page {meta.current_page} of {meta.last_page} · {meta.total} application(s)
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
        wide
        title={detail ? `${detail.type_label} · ${detail.reference_number}` : 'Application'}
        onClose={() => setDetail(null)}
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail ? (
          <ApplicationDetail
            application={detail}
            role="franchisee"
            onChanged={refreshDetail}
            onNotify={setNotice}
          />
        ) : null}
      </Modal>

      {detailLoading && !detail ? (
        <p className="empty-state">Loading application…</p>
      ) : null}

    </>
  )
}
