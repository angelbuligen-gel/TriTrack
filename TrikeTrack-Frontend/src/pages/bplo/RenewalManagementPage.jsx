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

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'documents_pending', label: 'Documents pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function RenewalManagementPage() {
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
          type: 'renewal',
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
      setError(getErrorMessage(exception, 'Renewal applications could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

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

  const renewalStats = stats?.by_type?.renewal

  return (
    <>
      <PageHeader
        eyebrow="Renewal management"
        title="Franchise renewals"
        text="Review submitted renewals, act on documents, and record decisions for the franchise record."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {renewalStats ? (
        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-card__label">Open renewals</span>
            <span className="stat-card__value">{renewalStats.open}</span>
            <span className="stat-card__detail">Awaiting review or documents</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Approved</span>
            <span className="stat-card__value">{renewalStats.approved}</span>
            <span className="stat-card__detail">Franchise expiry extended</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Rejected</span>
            <span className="stat-card__value">{renewalStats.rejected}</span>
            <span className="stat-card__detail">Closed without renewal</span>
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
            aria-label="Search renewal applications"
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
          emptyMessage="No renewal applications match this filter."
          columns={[
            { key: 'reference_number', label: 'Reference' },
            {
              key: 'franchisee',
              label: 'Franchisee',
              render: (row) => row.franchisee?.full_name || '—',
            },
            {
              key: 'franchise',
              label: 'Franchise',
              render: (row) => row.franchise?.franchise_number || '—',
            },
            { key: 'coverage_year', label: 'Coverage' },
            {
              key: 'documents',
              label: 'Documents',
              render: (row) => (
                <span>
                  {row.summary.approved}/{row.summary.required_total}
                  {row.summary.pending > 0 ? (
                    <small className="text-muted"> · {row.summary.pending} pending</small>
                  ) : null}
                  {row.summary.rejected > 0 ? (
                    <small className="text-danger"> · {row.summary.rejected} rejected</small>
                  ) : null}
                </span>
              ),
            },
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
        title={detail ? `Renewal ${detail.reference_number}` : 'Renewal application'}
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
            role="bplo"
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
