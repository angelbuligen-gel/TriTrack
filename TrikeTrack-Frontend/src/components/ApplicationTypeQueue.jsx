import { useCallback, useEffect, useState } from 'react'

import Alert from './Alert'
import ApplicationDetail from './ApplicationDetail'
import Button from './Button'
import DataTable from './DataTable'
import Modal from './Modal'
import PageHeader from './PageHeader'
import StatusBadge from './StatusBadge'
import applicationService from '../services/applicationService'
import { getErrorMessage } from '../services/api'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'documents_pending', label: 'Documents pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All statuses' },
]

/**
 * Shared BPLO queue for transfer and change motor applications. Renewal
 * keeps its own page because it carries coverage-year columns.
 */
export default function ApplicationTypeQueue({
  type,
  eyebrow,
  title,
  text,
  emptyMessage,
  detailLabel,
  extraColumn,
}) {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('submitted')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [result, statistics] = await Promise.all([
        applicationService.bplo.list({
          type,
          q: search || undefined,
          status: status || undefined,
          page,
          per_page: 10,
        }),
        applicationService.bplo.stats(),
      ])

      setRows(result.items)
      setMeta(result.meta)
      setStats(statistics)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Applications could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [type, search, status, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const openDetail = async (row) => {
    setNotice('')
    setDetailLoading(true)

    try {
      setDetail(await applicationService.bplo.get(row.id))
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
      setDetail(await applicationService.bplo.get(detail.id))
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The application could not be refreshed.'))
    }
  }

  const typeStats = stats?.by_type?.[type]
  const columns = [
    { key: 'reference_number', label: 'Reference' },
    { key: 'franchisee', label: 'Franchisee', render: (row) => row.franchisee?.full_name || '-' },
    { key: 'franchise', label: 'Franchise', render: (row) => row.franchise?.franchise_number || '-' },
    ...(extraColumn ? [{ ...extraColumn, key: 'extra' }] : []),
    { key: 'submitted', label: 'Filed', render: (row) => formatDate(row.submitted_at) },
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
            openDetail(row)
          }}
        >
          Review
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} text={text} />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {typeStats ? (
        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-card__label">Open</span>
            <strong className="stat-card__value">{typeStats.open}</strong>
            <span className="stat-card__detail">Awaiting review or documents</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Approved</span>
            <strong className="stat-card__value">{typeStats.approved}</strong>
            <span className="stat-card__detail">Fully processed</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Rejected</span>
            <strong className="stat-card__value">{typeStats.rejected}</strong>
            <span className="stat-card__detail">Closed without approval</span>
          </article>
        </div>
      ) : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search reference, franchise, or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search applications"
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
          emptyMessage={emptyMessage}
          columns={columns}
        />

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} application(s))
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
        title={detail ? `${detailLabel} ${detail.reference_number}` : detailLabel}
        onClose={() => setDetail(null)}
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail ? (
          <ApplicationDetail application={detail} role="bplo" onChanged={refreshDetail} onNotify={setNotice} />
        ) : null}
      </Modal>

      {detailLoading && !detail ? <p className="empty-state">Loading application...</p> : null}
    </>
  )
}
