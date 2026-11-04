import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'franchisee', label: 'Franchisee' },
  { value: 'bplo', label: 'BPLO' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'administrator', label: 'Administrator' },
]

export default function ActivityLogsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.activityLogs({
        q: search || undefined,
        role: role || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: 25,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Activity logs could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, role, from, to, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Activity logs"
        text="Audit trail of account changes, application decisions, assessments, payments, certificates, and settings updates."
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar toolbar--wrap">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search description"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search activity descriptions"
          />

          <select
            className="field__input toolbar__select"
            value={role}
            onChange={(event) => {
              setPage(1)
              setRole(event.target.value)
            }}
            aria-label="Filter by role"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="field field--inline">
            <span className="field__label">From</span>
            <input
              className="field__input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setPage(1)
                setFrom(event.target.value)
              }}
            />
          </label>

          <label className="field field--inline">
            <span className="field__label">To</span>
            <input
              className="field__input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setPage(1)
                setTo(event.target.value)
              }}
            />
          </label>
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          emptyMessage="No activity matches this filter."
          columns={[
            {
              key: 'created_at',
              label: 'When',
              render: (row) => formatDate(row.created_at, { hour: 'numeric', minute: '2-digit' }),
            },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{humanizeStatus(row.action)}</strong>
                  <small className="text-muted">{row.action}</small>
                </div>
              ),
            },
            { key: 'description', label: 'Description' },
            {
              key: 'user',
              label: 'Actor',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.user || 'System'}</span>
                  <small className="text-muted">{row.role ? humanizeStatus(row.role) : ''}</small>
                </div>
              ),
            },
            {
              key: 'subject',
              label: 'Subject',
              render: (row) =>
                row.subject_type ? `${row.subject_type.split('\\').pop()} #${row.subject_id}` : '-',
            },
          ]}
        />

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} log(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>
    </>
  )
}
