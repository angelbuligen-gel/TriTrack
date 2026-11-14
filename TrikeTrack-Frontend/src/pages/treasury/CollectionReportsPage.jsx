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

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'online', label: 'Online' },
]

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
  const [filters, setFilters] = useState({
    from: monthStart(),
    to: today(),
    status: '',
    method: '',
    application_type: '',
    q: '',
  })
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

  const exportFile = async (kind) => {
    setError('')

    try {
      const blob =
        kind === 'pdf'
          ? await treasuryService.payments.reportPdf(filters)
          : await treasuryService.payments.reportExcel(filters)

      saveBlob(blob, `collections-${filters.from}-to-${filters.to}.${kind === 'pdf' ? 'pdf' : 'xls'}`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The export could not be generated.'))
    }
  }

  const update = (key) => (event) =>
    setFilters((current) => ({ ...current, [key]: event.target.value }))

  const statusRow = (status) => (report?.summaries || []).find((row) => row.status === status)
  const totals = report?.totals

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Collection reports"
        text="Every payment with its full breakdown, plus totals by status, method and application type. Exports respect the selected filters."
        actions={
          <div className="row-actions">
            <Button variant="secondary" onClick={() => exportFile('pdf')} disabled={!report}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportFile('excel')} disabled={!report}>
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
              onChange={update('from')}
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
              onChange={update('to')}
            />
          </label>

          <label className="field">
            <span className="field__label">Status</span>
            <select className="field__input" value={filters.status} onChange={update('status')}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Method</span>
            <select className="field__input" value={filters.method} onChange={update('method')}>
              {METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Application type</span>
            <select
              className="field__input"
              value={filters.application_type}
              onChange={update('application_type')}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Search</span>
            <input
              className="field__input"
              type="search"
              value={filters.q}
              onChange={update('q')}
              placeholder="Transaction or reference"
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
          <strong className="stat-card__value">{money(totals?.collected_total)}</strong>
          <span className="stat-card__detail">
            {report?.period ? `${formatDate(report.period.from)} to ${formatDate(report.period.to)}` : ''}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Cash collections</span>
          <strong className="stat-card__value">{money(totals?.cash_total)}</strong>
          <span className="stat-card__detail">{totals?.cash_transactions ?? 0} transaction(s)</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">QR / online collections</span>
          <strong className="stat-card__value">{money(totals?.qr_total)}</strong>
          <span className="stat-card__detail">{totals?.qr_transactions ?? 0} transaction(s)</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Pending</span>
          <strong className="stat-card__value">{totals?.pending_transactions ?? 0}</strong>
          <span className="stat-card__detail">{money(totals?.pending_total)}</span>
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

        <p className="text-muted">
          Successful: {statusRow('successful')?.count ?? 0} transaction(s),{' '}
          {money(statusRow('successful')?.total)} collected.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">Transaction breakdown</h2>
        <DataTable
          loading={loading}
          rows={report?.transactions || []}
          rowKey={(row) => row.transaction_number}
          emptyMessage="No payments match the selected filters."
          columns={[
            {
              key: 'paid_at',
              label: 'Date',
              render: (row) =>
                formatDate(row.paid_at, { hour: 'numeric', minute: '2-digit' }),
            },
            { key: 'transaction_number', label: 'Transaction' },
            { key: 'franchise_number', label: 'Franchise', render: (row) => row.franchise_number || '-' },
            { key: 'franchisee_name', label: 'Franchisee', render: (row) => row.franchisee_name || '-' },
            {
              key: 'application_type_label',
              label: 'Type',
              render: (row) => row.application_type_label || '-',
            },
            {
              key: 'assessment_number',
              label: 'Assessment',
              render: (row) => row.assessment_number || '-',
            },
            { key: 'regular_fee', label: 'Regular', render: (row) => money(row.regular_fee) },
            {
              key: 'violation_fee',
              label: 'Violation',
              render: (row) => money(row.violation_fee),
            },
            { key: 'total_amount_due', label: 'Total due', render: (row) => money(row.total_amount_due) },
            { key: 'amount_paid', label: 'Paid', render: (row) => money(row.amount_paid) },
            {
              key: 'method',
              label: 'Method',
              render: (row) => humanizeStatus(row.method || 'online'),
            },
            {
              key: 'payment_reference',
              label: 'Reference',
              render: (row) => row.payment_reference || '-',
            },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'verified_by', label: 'Verified by', render: (row) => row.verified_by || '-' },
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
