import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import applicationService from '../../services/applicationService'
import recordService from '../../services/recordService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'
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
  number,
} from '../../dashboard/ui/DashKit'

const TYPE_LABELS = {
  renewal: 'Renewal',
  transfer: 'Transfer',
  change_motor: 'Change Motor',
}

const STATUS_ORDER = ['submitted', 'under_review', 'documents_pending', 'approved', 'rejected']

const APPLICATION_ROUTES = {
  renewal: '/bplo/renewals',
  transfer: '/bplo/transfers',
  change_motor: '/bplo/change-motor',
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [records, setRecords] = useState({ franchisees: [], franchises: [], drivers: [], vehicles: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [franchisees, franchises, drivers, vehicles, applications, summary] =
          await Promise.all([
            recordService.franchisees.list({ per_page: 100 }),
            recordService.franchises.list({ per_page: 100 }),
            recordService.drivers.list({ per_page: 100 }),
            recordService.vehicles.list({ per_page: 100 }),
            applicationService.bplo.stats(),
            applicationService.bplo.reportSummary(),
          ])

        if (active) {
          setRecords({
            franchisees: franchisees.items ?? [],
            franchises: franchises.items ?? [],
            drivers: drivers.items ?? [],
            vehicles: vehicles.items ?? [],
          })
          setStats(applications)
          setReport(summary)
        }
      } catch (exception) {
        if (active) {
          setError(getErrorMessage(exception, 'BPLO dashboard data could not be loaded.'))
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

  const linkedAccounts = records.franchisees.filter((row) => row.user_id).length
  const unlinkedAccounts = records.franchisees.length - linkedAccounts
  const activeFranchises = records.franchises.filter(
    (row) => row.franchise_status === 'active',
  ).length
  const forRenewal = records.franchises.filter(
    (row) => row.franchise_status === 'for_renewal',
  ).length
  const expiredLicenses = records.drivers.filter((row) => row.license_expired).length
  const expiringSoon = report?.franchises?.expiring_in_60_days ?? 0
  const docsAwaiting = stats?.totals?.documents_awaiting_review ?? 0

  const volume = Object.entries(stats?.by_type ?? {}).map(([type, counts]) => ({
    type: TYPE_LABELS[type] || humanizeStatus(type),
    open: counts.open,
    approved: counts.approved,
    rejected: counts.rejected,
  }))

  const pipeline = STATUS_ORDER.filter((status) => stats?.totals?.[status] != null).map(
    (status) => ({
      label: humanizeStatus(status),
      value: stats.totals[status],
    }),
  )

  const monthlySpark = (report?.applications?.monthly ?? [])
    .slice(-6)
    .map((row) => Number(row.total || 0))

  const recentApplications = (stats?.recent ?? []).map((row) => ({
    ...row,
    to: APPLICATION_ROUTES[row.application_type] || '/bplo/renewals',
  }))

  const recentFranchises = records.franchises.slice(0, 5).map((row) => ({
    ...row,
    to: '/bplo/franchises',
  }))

  const notices = [
    forRenewal > 0 && {
      tone: 'warning',
      title: 'Renewals due',
      text: `${forRenewal} franchise(s) are flagged for renewal.`,
    },
    unlinkedAccounts > 0 && {
      tone: 'info',
      title: 'Unlinked accounts',
      text: `${unlinkedAccounts} franchisee record(s) have no linked account yet.`,
    },
    expiredLicenses > 0 && {
      tone: 'danger',
      title: 'Expired licenses',
      text: `${expiredLicenses} driver(s) have an expired license.`,
    },
    docsAwaiting > 0 && {
      tone: 'warning',
      title: 'Document review',
      text: `${docsAwaiting} submitted document(s) are awaiting review.`,
    },
  ].filter(Boolean)

  return (
    <div className="dash">
      <PageIntro
        eyebrow="BPLO portal"
        title="Dashboard"
        subtitle="Franchise processing summary for this office."
        actions={
          <>
            <Link className="dash-btn" to="/bplo/reports">
              Reports
            </Link>
            <Link className="dash-btn dash-btn--primary" to="/bplo/documents">
              Review documents
            </Link>
          </>
        }
      />

      {error ? (
        <Notice tone="danger" title="Unable to load">
          {error}
        </Notice>
      ) : null}

      {notices.map((notice) => (
        <Notice key={notice.title} tone={notice.tone} title={notice.title}>
          {notice.text}
        </Notice>
      ))}

      <section className="dash-metrics" aria-label="Office summary">
        <MetricCard
          label="Franchisees"
          value={loading ? '—' : number(records.franchisees.length)}
          hint={loading ? 'Loading records' : `${number(linkedAccounts)} with linked accounts`}
          to="/bplo/franchisees"
        />
        <MetricCard
          label="Active franchises"
          value={loading ? '—' : number(activeFranchises)}
          hint={
            loading
              ? 'Loading records'
              : `${number(expiringSoon)} expiring within 60 days`
          }
          to="/bplo/franchises"
        />
        <MetricCard
          label="Open applications"
          value={loading ? '—' : number(stats?.totals?.open ?? 0)}
          hint={
            loading
              ? 'Loading records'
              : `${number(stats?.totals?.decided_this_month ?? 0)} decided this month`
          }
          spark={monthlySpark}
          to="/bplo/renewals"
        />
        <MetricCard
          label="Drivers"
          value={loading ? '—' : number(records.drivers.length)}
          hint={loading ? 'Loading records' : `${number(expiredLicenses)} expired licenses`}
          to="/bplo/drivers"
        />
      </section>

      <div className="dash-grid">
        <Panel
          title="Application volume"
          subtitle="Open, approved, and rejected by type"
          span="main"
          action={
            <Legend
              items={[
                { label: 'Open', color: '#e8822a' },
                { label: 'Approved', color: '#4ade80' },
                { label: 'Rejected', color: '#f87171' },
              ]}
            />
          }
        >
          <Chart
            data={volume}
            xKey="type"
            label="Application volume by type"
            series={[
              { key: 'open', name: 'Open', fill: '#e8822a' },
              { key: 'approved', name: 'Approved', fill: '#4ade80' },
              { key: 'rejected', name: 'Rejected', fill: '#f87171' },
            ]}
          />
          <Insight>
            {docsAwaiting > 0
              ? `${docsAwaiting} document(s) are waiting for review, and ${number(stats?.totals?.documents_pending ?? 0)} application(s) need corrections.`
              : 'Document review is up to date across open applications.'}
          </Insight>
        </Panel>

        <Panel title="Processing pipeline" subtitle="All applications by status" span="side">
          <Breakdown items={pipeline} />
        </Panel>
      </div>

      <TableCard
        title="Recent applications"
        subtitle="Latest filings across all transaction types"
        action={
          <Link className="dash-link" to="/bplo/renewals">
            View all
          </Link>
        }
        loading={loading}
        rows={recentApplications}
        emptyMessage="No applications have been filed yet."
        columns={[
          {
            key: 'reference_number',
            label: 'Reference',
            render: (row) => <span className="dash-table__strong">{row.reference_number}</span>,
          },
          { key: 'franchisee_name', label: 'Franchisee', render: (row) => row.franchisee_name || '—' },
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
        <TableCard
          className="dash-card--main"
          title="Recent franchise records"
          action={
            <Link className="dash-link" to="/bplo/franchises">
              Manage
            </Link>
          }
          loading={loading}
          rows={recentFranchises}
          emptyMessage="No franchise records yet."
          columns={[
            {
              key: 'franchise_number',
              label: 'Franchise no.',
              render: (row) => <span className="dash-table__strong">{row.franchise_number}</span>,
            },
            {
              key: 'franchisee',
              label: 'Franchisee',
              render: (row) => row.franchisee?.full_name || '—',
            },
            {
              key: 'franchise_status',
              label: 'Status',
              render: (row) => <StatusPill status={row.franchise_status} />,
            },
            {
              key: 'expiration_date',
              label: 'Expires',
              render: (row) => formatDate(row.expiration_date),
            },
          ]}
        />

        <Panel title="Franchise health" subtitle="Records by status" span="side">
          <Breakdown
            items={Object.entries(report?.franchises?.by_status ?? {}).map(([status, total]) => ({
              label: humanizeStatus(status),
              value: total,
            }))}
          />
        </Panel>
      </div>
    </div>
  )
}
