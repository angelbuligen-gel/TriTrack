import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, CarFront, ClipboardList, RefreshCw } from 'lucide-react'

import useAuth from '../../hooks/useAuth'
import accountService from '../../services/accountService'
import applicationService from '../../services/applicationService'
import recordService from '../../services/recordService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'
import {
  Breakdown,
  Chart,
  Insight,
  Legend,
  MetricCard,
  Notice,
  PageIntro,
  Panel,
  StatusPill,
  TableCard,
  lastMonthBuckets,
  money,
  monthlyCounts,
  number,
} from '../../dashboard/ui/DashKit'

const OPEN_STATUSES = ['submitted', 'under_review', 'documents_pending']

const EMPTY_DATA = {
  franchises: [],
  drivers: [],
  vehicles: [],
  applications: [],
  payments: [],
  certificates: [],
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [franchises, drivers, vehicles, applications, payments, certificates] =
          await Promise.all([
            recordService.mine.franchise(),
            recordService.mine.drivers(),
            recordService.mine.vehicles(),
            applicationService.mine.list({ per_page: 100 }),
            accountService.payments.list({ per_page: 100 }),
            accountService.certificates.list({ per_page: 100 }),
          ])

        if (active) {
          setData({
            franchises: franchises ?? [],
            drivers: drivers ?? [],
            vehicles: vehicles ?? [],
            applications: applications.items ?? [],
            payments: payments.items ?? [],
            certificates: certificates.items ?? [],
          })
        }
      } catch (exception) {
        if (active) {
          setError(getErrorMessage(exception, 'Your dashboard could not be loaded.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const buckets = useMemo(() => lastMonthBuckets(6), [])
  const submittedTrend = useMemo(
    () => monthlyCounts(data.applications, 'submitted_at', buckets),
    [data.applications, buckets],
  )
  const paymentTrend = useMemo(
    () => monthlyCounts(data.payments, 'created_at', buckets),
    [data.payments, buckets],
  )
  const decidedTrend = useMemo(
    () => monthlyCounts(data.applications.filter((row) => row.decided_at), 'decided_at', buckets),
    [data.applications, buckets],
  )

  const chartData = buckets.map((bucket, index) => ({
    month: bucket.label,
    submitted: submittedTrend[index],
    decided: decidedTrend[index],
  }))

  const openApplications = data.applications.filter(
    (application) => application.is_open ?? OPEN_STATUSES.includes(application.status),
  )
  const pendingPayments = data.payments.filter((payment) => payment.status === 'pending')
  const activeFranchises = data.franchises.filter(
    (franchise) => franchise.franchise_status === 'active',
  )
  const pendingAmount = pendingPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0,
  )
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const decidedThisMonth = data.applications.filter((application) =>
    application.decided_at?.startsWith(currentMonth),
  ).length

  const recentApplications = [...data.applications]
    .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))
    .slice(0, 5)
    .map((application) => ({ ...application, to: '/app/applications' }))

  const firstName = user?.name?.split(' ').filter(Boolean)[0] || 'there'

  return (
    <div className="dash">
      <PageIntro
        eyebrow="Franchisee workspace"
        title={`Good day, ${firstName}`}
        subtitle="Your applications, payments, and franchise records in one place."
        actions={
          <>
            <Link className="dash-btn" to="/app/transfer">
              <ArrowLeftRight size={14} />
              Transfer
            </Link>
            <Link className="dash-btn dash-btn--primary" to="/app/renewal">
              <RefreshCw size={14} />
              File renewal
            </Link>
          </>
        }
      />

      {error ? (
        <Notice tone="danger" title="Unable to load">
          {error}
        </Notice>
      ) : null}

      {!user?.phone_verified ? (
        <Notice tone="danger" title="Mobile number not verified">
          Verify your mobile number before submitting franchise transactions.
        </Notice>
      ) : null}

      {user?.account_status === 'pending' ? (
        <Notice tone="warning" title="Account awaiting activation">
          BPLO staff will activate your account before you can submit renewal, transfer, or change
          motor applications.
        </Notice>
      ) : null}

      <section className="dash-metrics" aria-label="Account summary">
        <MetricCard
          label="Open applications"
          value={loading ? '—' : number(openApplications.length)}
          hint={loading ? 'Loading records' : `${number(data.applications.length)} filed in total`}
          spark={submittedTrend}
          to="/app/applications"
        />
        <MetricCard
          label="Pending payments"
          value={loading ? '—' : number(pendingPayments.length)}
          hint={loading ? 'Loading records' : pendingAmount ? money(pendingAmount) : 'Nothing due'}
          spark={paymentTrend}
          to="/app/payments"
        />
        <MetricCard
          label="Active franchises"
          value={loading ? '—' : number(activeFranchises.length)}
          hint={loading ? 'Loading records' : `${number(data.franchises.length)} on record`}
        />
        <MetricCard
          label="Certificates"
          value={loading ? '—' : number(data.certificates.length)}
          hint="Issued to your account"
          to="/app/certificates"
        />
      </section>

      <div className="dash-grid">
        <Panel
          title="Application activity"
          subtitle="Filed vs decided, last six months"
          span="main"
          action={
            <Legend
              items={[
                { label: 'Filed', color: '#e8822a' },
                { label: 'Decided', color: '#4ade80' },
              ]}
            />
          }
        >
          <Chart
            data={chartData}
            xKey="month"
            label="Application activity for the last six months"
            series={[
              { key: 'submitted', name: 'Filed', fill: '#e8822a' },
              { key: 'decided', name: 'Decided', fill: '#4ade80' },
            ]}
          />
          <Insight>
            {decidedThisMonth > 0
              ? `${decidedThisMonth} application(s) were decided this month.`
              : 'No applications have been decided this month yet.'}{' '}
            {openApplications.length > 0
              ? `${openApplications.length} still open and tracking.`
              : 'You have no open applications.'}
          </Insight>
        </Panel>

        <Panel title="Records at a glance" subtitle="Linked to your franchisee account" span="side">
          <Breakdown
            items={[
              { label: 'Franchises', value: data.franchises.length },
              { label: 'Drivers', value: data.drivers.length },
              { label: 'Vehicles', value: data.vehicles.length },
              { label: 'Certificates', value: data.certificates.length },
            ]}
          />
        </Panel>
      </div>

      <TableCard
        title="Recent applications"
        subtitle="Your latest filed transactions"
        action={
          <Link className="dash-link" to="/app/applications">
            View all
          </Link>
        }
        loading={loading}
        rows={recentApplications}
        emptyMessage="You have not filed an application yet."
        columns={[
          {
            key: 'reference_number',
            label: 'Reference',
            render: (row) => <span className="dash-table__strong">{row.reference_number}</span>,
          },
          { key: 'type_label', label: 'Type' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusPill status={row.status} label={row.status_label} />,
          },
          {
            key: 'submitted_at',
            label: 'Filed',
            render: (row) => formatDate(row.submitted_at),
          },
        ]}
      />

      <div className="dash-grid">
        <Panel title="Your franchise records" span="main">
          {loading ? (
            <p className="dash-empty">Loading franchise records…</p>
          ) : data.franchises.length === 0 ? (
            <p className="dash-empty">
              No franchise record is linked to your account yet. BPLO personnel link existing
              records to verified franchisee accounts.
            </p>
          ) : (
            <div className="dash-list">
              {data.franchises.map((franchise) => (
                <article className="dash-record" key={franchise.id}>
                  <div className="dash-record__head">
                    <span className="dash-record__number">{franchise.franchise_number}</span>
                    <StatusPill status={franchise.franchise_status} />
                  </div>
                  <p className="dash-record__meta">
                    Issued {formatDate(franchise.date_issued)} · Expires{' '}
                    {formatDate(franchise.expiration_date)}
                  </p>
                  <p className="dash-record__meta">
                    {franchise.vehicles?.length ?? 0} vehicle(s), {franchise.drivers?.length ?? 0}{' '}
                    driver(s) assigned
                  </p>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick actions" subtitle="Start a new transaction" span="side">
          <div className="dash-actions">
            <Link className="dash-btn" to="/app/renewal">
              <RefreshCw size={14} />
              Renew a franchise
            </Link>
            <Link className="dash-btn" to="/app/transfer">
              <ArrowLeftRight size={14} />
              Transfer a franchise
            </Link>
            <Link className="dash-btn" to="/app/change-motor">
              <CarFront size={14} />
              Change motor
            </Link>
            <Link className="dash-btn" to="/app/applications">
              <ClipboardList size={14} />
              Track applications
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  )
}
