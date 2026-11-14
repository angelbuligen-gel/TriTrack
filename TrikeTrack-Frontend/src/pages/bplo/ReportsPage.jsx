import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import DistributionList from '../../components/DistributionList'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import applicationService, { saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({ from: yearStart(), to: today() })
  const [summary, setSummary] = useState(null)
  const [applications, setApplications] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [report, rows] = await Promise.all([
        applicationService.bplo.reportSummary(filters),
        applicationService.bplo.reportApplications({ ...filters, page, per_page: 10 }),
      ])

      setSummary(report)
      setApplications(rows.items)
      setMeta(rows.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The report could not be generated.'))
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  const exportFile = async (kind) => {
    setError('')

    try {
      const blob =
        kind === 'pdf'
          ? await applicationService.bplo.reportApplicationsPdf(filters)
          : await applicationService.bplo.reportApplicationsExcel(filters)

      saveBlob(
        blob,
        `bplo-applications-${filters.from}-to-${filters.to}.${kind === 'pdf' ? 'pdf' : 'xls'}`,
      )
    } catch (exception) {
      setError(getErrorMessage(exception, 'The export could not be generated.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="BPLO operations report"
        text="Application volume, franchise status, certificate issuance, and collections for the selected period."
        actions={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => exportFile('pdf')}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportFile('excel')}>
              Export Excel
            </Button>
          </div>
        }
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <form
          className="inline-form inline-form--filters"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            load()
          }}
        >
          <label className="field">
            <span className="field__label">From</span>
            <input
              className="field__input"
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </label>

          <label className="field">
            <span className="field__label">To</span>
            <input
              className="field__input"
              type="date"
              value={filters.to}
              min={filters.from}
              max={today()}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </label>

          <Button type="submit" loading={loading}>
            Generate
          </Button>
        </form>
      </section>

      {summary ? (
        <>
          <div className="stat-grid">
            <article className="stat-card">
              <span className="stat-card__label">Applications</span>
              <strong className="stat-card__value">{summary.applications.total}</strong>
              <span className="stat-card__detail">
                {summary.applications.approved} approved, {summary.applications.rejected} rejected
              </span>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Franchises</span>
              <strong className="stat-card__value">{summary.franchises.total}</strong>
              <span className="stat-card__detail">
                {summary.franchises.expiring_in_60_days} expiring within 60 days
              </span>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Certificates</span>
              <strong className="stat-card__value">{summary.certificates.total}</strong>
              <span className="stat-card__detail">Issued in this period</span>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Collections</span>
              <strong className="stat-card__value">{money(summary.collections.total)}</strong>
              <span className="stat-card__detail">Successful payments in this period</span>
            </article>
          </div>

          <section className="grid grid--2">
            <DistributionList
              title="Applications by status"
              data={summary.applications.by_status}
              total={summary.applications.total}
            />
            <DistributionList
              title="Applications by type"
              data={summary.applications.by_type}
              labels={{ renewal: 'Renewal', transfer: 'Transfer', change_motor: 'Change motor' }}
            />
            <DistributionList title="Franchises by status" data={summary.franchises.by_status} total={summary.franchises.total} />
            <DistributionList
              title="Certificates by type"
              data={summary.certificates.by_type}
              labels={{ renewal: 'Renewal', transfer: 'Transfer', change_motor: 'Change motor' }}
            />
          </section>

          <section className="panel">
            <h2 className="panel__title">Monthly application volume</h2>
            {summary.applications.monthly.length === 0 ? (
              <p className="empty-state">No applications filed in this period.</p>
            ) : (
              <DataTable
                rows={summary.applications.monthly}
                rowKey={(row) => row.period}
                columns={[
                  {
                    key: 'period',
                    label: 'Month',
                    render: (row) =>
                      new Date(`${row.period}-01T00:00:00`).toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      }),
                  },
                  { key: 'total', label: 'Applications' },
                ]}
              />
            )}
          </section>
        </>
      ) : null}

      <section className="panel">
        <h2 className="panel__title">Application register</h2>
        <DataTable
          loading={loading}
          rows={applications}
          emptyMessage="No applications were filed in this period."
          columns={[
            { key: 'reference_number', label: 'Reference' },
            { key: 'type', label: 'Type' },
            { key: 'franchise_number', label: 'Franchise' },
            { key: 'franchisee', label: 'Franchisee' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={String(row.status).toLowerCase().replaceAll(' ', '_')} /> },
            { key: 'submitted_at', label: 'Filed', render: (row) => (row.submitted_at ? formatDate(row.submitted_at) : '-') },
            { key: 'decided_at', label: 'Decided', render: (row) => (row.decided_at ? formatDate(row.decided_at) : '-') },
            { key: 'decided_by', label: 'Decided by', render: (row) => row.decided_by || '-' },
          ]}
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
    </>
  )
}
