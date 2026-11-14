import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import applicationService, { saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'

const REPORTS = [
  { value: 'franchises', label: 'Franchise records' },
  { value: 'drivers', label: 'Driver records' },
  { value: 'expiring', label: 'Franchise expiration' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'for_renewal', label: 'For renewal' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'transferred', label: 'Transferred' },
]

function columnFor(header, index, report) {
  const key = `col_${index}`

  return {
    key,
    label: header,
    render: (row) => {
      const values = Object.values(row)
      const value = values[index]

      if (report === 'expiring' && header === 'Days left') {
        const days = Number(value)

        return Number.isFinite(days) && days <= 30 ? (
          <strong>{value}</strong>
        ) : (
          value
        )
      }

      return value ?? '—'
    },
    exportable: true,
  }
}

export default function RecordReportsPage() {
  const [report, setReport] = useState('franchises')
  const [filters, setFilters] = useState({ q: '', status: '', days: 60 })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState('')
  const [reminding, setReminding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setData(await applicationService.bplo.recordReport(report, filters))
    } catch (exception) {
      setError(getErrorMessage(exception, 'The report could not be generated.'))
    } finally {
      setLoading(false)
    }
  }, [report, filters])

  useEffect(() => {
    load()
  }, [load])

  const exportFile = async (format) => {
    setExporting(format)
    setError('')

    try {
      const blob = await applicationService.bplo.recordReportExport(report, format, filters)
      saveBlob(blob, `${report}-report.${format === 'excel' ? 'xls' : 'pdf'}`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The export could not be generated.'))
    } finally {
      setExporting('')
    }
  }

  const sendReminders = async () => {
    setReminding(true)
    setError('')
    setNotice('')

    try {
      const result = await applicationService.bplo.sendRenewalReminders(Number(filters.days) || undefined)
      setNotice(result.output || 'Renewal reminders processed.')
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'Renewal reminders could not be sent.'))
    } finally {
      setReminding(false)
    }
  }

  const headers = data?.headers || []
  const rows = data?.rows || []

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Record reports"
        text="Franchise, driver and expiration registers. Exports contain the same rows and filters shown on screen."
        actions={
          <div className="row-actions">
            <Button variant="secondary" loading={exporting === 'pdf'} onClick={() => exportFile('pdf')}>
              Export PDF
            </Button>
            <Button variant="secondary" loading={exporting === 'excel'} onClick={() => exportFile('excel')}>
              Export Excel
            </Button>
          </div>
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
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
            <span className="field__label">Report</span>
            <select
              className="field__input"
              value={report}
              onChange={(event) => setReport(event.target.value)}
            >
              {REPORTS.map((option) => (
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
              placeholder="Franchise, owner, license"
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            />
          </label>

          {report === 'franchises' ? (
            <label className="field">
              <span className="field__label">Status</span>
              <select
                className="field__input"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {report === 'expiring' ? (
            <label className="field">
              <span className="field__label">Window (days)</span>
              <input
                className="field__input"
                type="number"
                min="1"
                max="365"
                value={filters.days}
                onChange={(event) => setFilters((current) => ({ ...current, days: event.target.value }))}
              />
            </label>
          ) : null}

          <Button type="submit" loading={loading}>
            Generate
          </Button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel__title">{data?.title || 'Report'}</h2>
        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row, index) => `${row.franchise_number || row.name || index}`}
          emptyMessage="No records match the selected filters."
          columns={headers.map((header, index) => columnFor(header, index, report))}
        />

        {rows.length > 0 ? (
          <p className="text-muted">{rows.length} record(s).</p>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="panel__title">Renewal reminders</h2>
        <p className="panel__text">
          Notify owners of franchises expiring within the reminder window. The same reminder runs
          automatically every morning.
        </p>

        <div className="row-actions">
          <label className="field">
            <span className="field__label">Window (days)</span>
            <input
              className="field__input"
              type="number"
              min="1"
              max="365"
              value={filters.days}
              onChange={(event) => setFilters((current) => ({ ...current, days: event.target.value }))}
            />
          </label>

          <Button loading={reminding} onClick={sendReminders}>
            Send reminders now
          </Button>
        </div>
      </section>
    </>
  )
}
