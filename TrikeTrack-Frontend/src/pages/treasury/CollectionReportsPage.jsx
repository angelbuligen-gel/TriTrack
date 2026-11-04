import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import treasuryService from '../../services/treasuryService'
import { saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  const now = new Date()

  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function CollectionReportsPage() {
  const [filters, setFilters] = useState({ from: monthStart(), to: today() })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setReport(await treasuryService.payments.report(filters))
    } catch (exception) {
      setError(getErrorMessage(exception, 'The collections report could not be generated.'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const exportCsv = () => {
    if (!report) {
      return
    }

    const header = ['Date', 'Transactions', 'Amount']
    const lines = report.daily.map((row) => [row.date, row.count, row.total].join(','))

    saveBlob(
      new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }),
      `collections-${filters.from}-to-${filters.to}.csv`,
    )
  }

  const statusRow = (status) => (report?.summaries || []).find((row) => row.status === status)

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Collection reports"
        text="Daily collections, payment status totals, and breakdowns by method and application type."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={!report}>
            Export daily CSV
          </Button>
        }
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <form
          className="inline-form inline-form--filters"
          onSubmit={(event) => {
            event.preventDefault()
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

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Total collected</span>
          <strong className="stat-card__value">{money(report?.total_collected)}</strong>
          <span className="stat-card__detail">
            {report?.period ? `${formatDate(report.period.from)} to ${formatDate(report.period.to)}` : ''}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Successful</span>
          <strong className="stat-card__value">{statusRow('successful')?.count ?? 0}</strong>
          <span className="stat-card__detail">{money(statusRow('successful')?.total)}</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Pending</span>
          <strong className="stat-card__value">{statusRow('pending')?.count ?? 0}</strong>
          <span className="stat-card__detail">{money(statusRow('pending')?.total)}</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Failed / cancelled</span>
          <strong className="stat-card__value">
            {(statusRow('failed')?.count ?? 0) + (statusRow('cancelled')?.count ?? 0)}
          </strong>
          <span className="stat-card__detail">Not counted as collections</span>
        </article>
      </div>

      <section className="panel">
        <h2 className="panel__title">Payment status summary</h2>
        <DataTable
          loading={loading}
          rows={report?.summaries || []}
          rowKey={(row) => row.status}
          emptyMessage="No payments in this period."
          columns={[
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'count', label: 'Transactions' },
            { key: 'total', label: 'Amount', render: (row) => money(row.total) },
          ]}
        />
      </section>

      <section className="grid grid--2">
        <article className="panel">
          <h2 className="panel__title">By method</h2>
          <DataTable
            loading={loading}
            rows={report?.by_method || []}
            rowKey={(row) => row.method}
            emptyMessage="No successful payments in this period."
            columns={[
              { key: 'method', label: 'Method', render: (row) => humanizeStatus(row.method) },
              { key: 'count', label: 'Count' },
              { key: 'total', label: 'Amount', render: (row) => money(row.total) },
            ]}
          />
        </article>

        <article className="panel">
          <h2 className="panel__title">By application type</h2>
          <DataTable
            loading={loading}
            rows={report?.by_application_type || []}
            rowKey={(row) => row.application_type}
            emptyMessage="No successful payments in this period."
            columns={[
              {
                key: 'application_type',
                label: 'Type',
                render: (row) =>
                  ({ renewal: 'Renewal', transfer: 'Transfer', change_motor: 'Change motor' })[
                    row.application_type
                  ] || humanizeStatus(row.application_type),
              },
              { key: 'count', label: 'Count' },
              { key: 'total', label: 'Amount', render: (row) => money(row.total) },
            ]}
          />
        </article>
      </section>

      <section className="panel">
        <h2 className="panel__title">Daily collections</h2>
        <DataTable
          loading={loading}
          rows={report?.daily || []}
          rowKey={(row) => row.date}
          emptyMessage="No successful payments in this period."
          columns={[
            { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
            { key: 'count', label: 'Transactions' },
            { key: 'total', label: 'Amount', render: (row) => money(row.total) },
          ]}
        />
      </section>
    </>
  )
}
