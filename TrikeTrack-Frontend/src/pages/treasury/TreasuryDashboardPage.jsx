import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AssessApplicationModal from '../../components/AssessApplicationModal'
import treasuryService from '../../services/treasuryService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'
import {
  Breakdown,
  Chart,
  Insight,
  MetricCard,
  Notice,
  PageIntro,
  Panel,
  StatusPill,
  TableCard,
  money,
  number,
} from '../../dashboard/ui/DashKit'

const TYPE_LABELS = {
  renewal: 'Renewal',
  transfer: 'Transfer',
  change_motor: 'Change Motor',
}

function lastDays(count = 7) {
  const days = []
  const now = new Date()

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    days.push({
      key,
      label: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    })
  }

  return days
}

export default function TreasuryDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [queue, setQueue] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [tab, setTab] = useState('queue')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [assessing, setAssessing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [statistics, applications, payments, collections] = await Promise.all([
        treasuryService.dashboard(),
        treasuryService.applications.list({ ready_for_assessment: 1, per_page: 5 }),
        treasuryService.payments.list({ status: 'pending', per_page: 5 }),
        treasuryService.payments.report(),
      ])

      setStats(statistics)
      setQueue(applications.items ?? [])
      setPendingPayments(payments.items ?? [])
      setReport(collections)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Treasury data could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dailyByDate = useMemo(
    () =>
      Object.fromEntries(
        (report?.daily ?? []).map((row) => [row.date, Number(row.total || 0)]),
      ),
    [report],
  )

  const days = lastDays(7)
  const chartData = days.map((day) => ({
    day: day.label,
    collected: dailyByDate[day.key] ?? 0,
  }))
  const collectionSpark = days.slice(-5).map((day) => dailyByDate[day.key] ?? 0)

  const revenueMix = (report?.by_application_type ?? []).map((row) => ({
    label: TYPE_LABELS[row.application_type] || humanizeStatus(row.application_type),
    value: Number(row.total || 0),
  }))

  const pendingAmount = stats?.by_status?.pending?.amount ?? 0
  const paymentRows = pendingPayments.map((payment) => ({
    ...payment,
    to: '/treasury/payments',
  }))
  const queueRows = queue.map((application) => ({
    ...application,
    to: '/treasury/assessments',
  }))

  const rows = tab === 'queue' ? queueRows : paymentRows
  const queueColumns = [
    {
      key: 'reference_number',
      label: 'Reference',
      render: (row) => <span className="dash-table__strong">{row.reference_number}</span>,
    },
    {
      key: 'franchisee',
      label: 'Franchisee',
      render: (row) => row.franchisee?.full_name || '—',
    },
    { key: 'type_label', label: 'Type' },
    {
      key: 'submitted_at',
      label: 'Filed',
      render: (row) => formatDate(row.submitted_at),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusPill status={row.status} label={row.status_label} />,
    },
  ]
  const paymentColumns = [
    {
      key: 'reference_number',
      label: 'Payment ref.',
      render: (row) => <span className="dash-table__strong">{row.reference_number}</span>,
    },
    {
      key: 'application',
      label: 'Application',
      render: (row) => row.application?.reference_number || '—',
    },
    {
      key: 'franchisee',
      label: 'Franchisee',
      render: (row) =>
        row.application?.franchisee?.full_name || row.franchisee?.full_name || '—',
    },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
    {
      key: 'created_at',
      label: 'Initiated',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
  ]

  const rowAction =
    tab === 'queue'
      ? (row) => (
          <button type="button" className="dash-link" onClick={() => setAssessing(row)}>
            Assess
          </button>
        )
      : () => (
          <Link className="dash-link" to="/treasury/payments">
            Verify
          </Link>
        )

  return (
    <div className="dash">
      <PageIntro
        eyebrow="Treasury"
        title="Collections desk"
        subtitle="Applications awaiting assessment, payments to verify, and daily collections."
        actions={
          <>
            <Link className="dash-btn" to="/treasury/reports">
              Reports
            </Link>
            <Link className="dash-btn dash-btn--primary" to="/treasury/assessments">
              Manage assessments
            </Link>
          </>
        }
      />

      {error ? (
        <Notice tone="danger" title="Unable to load">
          {error}
        </Notice>
      ) : null}

      {notice ? (
        <Notice tone="success" title="Saved">
          {notice}
        </Notice>
      ) : null}

      <section className="dash-metrics" aria-label="Collections summary">
        <MetricCard
          label="Awaiting assessment"
          value={loading ? '—' : number(stats?.unassessed ?? 0)}
          hint="Applications with no fees set"
        />
        <MetricCard
          label="Assessed, unpaid"
          value={loading ? '—' : number(stats?.assessed_unpaid ?? 0)}
          hint="Waiting for franchisee payment"
        />
        <MetricCard
          label="Payments to verify"
          value={loading ? '—' : number(stats?.pending_payments ?? 0)}
          hint={loading ? 'Loading queue' : pendingAmount ? money(pendingAmount) : 'Nothing pending'}
        />
        <MetricCard
          label="Collected today"
          value={loading ? '—' : money(stats?.collected_today ?? 0, { compact: true })}
          hint={
            loading
              ? 'Loading collections'
              : `${number(stats?.paid_this_month ?? 0)} paid this month`
          }
          spark={collectionSpark}
        />
      </section>

      <div className="dash-grid">
        <Panel
          title="Daily collections"
          subtitle="Successful payments over the last seven days"
          span="main"
          action={
            <Link className="dash-link" to="/treasury/reports">
              Full report
            </Link>
          }
        >
          <Chart
            data={chartData}
            xKey="day"
            label="Daily collections for the last seven days"
            yFormat={(value) => money(value, { compact: true })}
            series={[
              {
                key: 'collected',
                name: 'Collected',
                fill: '#e8822a',
                format: (value) => money(value),
              },
            ]}
          />
          <Insight>
            {money(report?.total_collected ?? 0)} collected month-to-date. {number(stats?.paid_this_month ?? 0)} successful payment(s) this month.
          </Insight>
        </Panel>

        <Panel title="Revenue mix" subtitle="Month-to-date by application type" span="side">
          {revenueMix.length > 0 ? (
            <Breakdown items={revenueMix} formatValue={(value) => money(value, { compact: true })} />
          ) : (
            <p className="dash-empty">No collections recorded this month.</p>
          )}
        </Panel>
      </div>

      <TableCard
        title={tab === 'queue' ? 'Assessment queue' : 'Payments awaiting verification'}
        subtitle={
          tab === 'queue'
            ? 'Latest applications with no fees set'
            : 'Latest payment references awaiting confirmation'
        }
        toolbar={
          <div className="dash-tabs" role="tablist" aria-label="Treasury queues">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'queue'}
              className={`dash-tab${tab === 'queue' ? ' is-active' : ''}`}
              onClick={() => setTab('queue')}
            >
              Assessment queue
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'payments'}
              className={`dash-tab${tab === 'payments' ? ' is-active' : ''}`}
              onClick={() => setTab('payments')}
            >
              Payments to verify
            </button>
          </div>
        }
        action={
          <button
            type="button"
            className="dash-link"
            onClick={() => navigate(tab === 'queue' ? '/treasury/assessments' : '/treasury/payments')}
          >
            View all
          </button>
        }
        loading={loading}
        rows={rows}
        rowAction={rowAction}
        emptyMessage={
          tab === 'queue'
            ? 'No applications need an assessment right now.'
            : 'No payments are waiting for verification.'
        }
        columns={tab === 'queue' ? queueColumns : paymentColumns}
      />

      {assessing ? (
        <AssessApplicationModal
          application={assessing}
          onClose={() => setAssessing(null)}
          onSaved={() => {
            setNotice(`Assessment saved for ${assessing.reference_number}.`)
            setAssessing(null)
            load()
          }}
        />
      ) : null}
    </div>
  )
}
