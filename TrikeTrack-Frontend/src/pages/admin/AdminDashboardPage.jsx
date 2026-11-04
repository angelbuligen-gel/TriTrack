import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import adminService from '../../services/adminService'
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
  TableCard,
  money,
  number,
} from '../../dashboard/ui/DashKit'

const ROLE_LABELS = {
  franchisee: 'Franchisee',
  bplo: 'BPLO',
  treasury: 'Treasury',
  administrator: 'Administrator',
}

const STATUS_ORDER = [
  'submitted',
  'under_review',
  'documents_pending',
  'approved',
  'rejected',
  'completed',
  'cancelled',
]

export default function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    adminService
      .monitoring()
      .then((result) => {
        if (active) {
          setData(result)
        }
      })
      .catch((exception) => {
        if (active) {
          setError(getErrorMessage(exception, 'System monitoring data could not be loaded.'))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const applicationsByStatus = STATUS_ORDER.filter(
    (status) => data?.applications?.by_status?.[status] != null,
  ).map((status) => ({
    status: humanizeStatus(status),
    count: data.applications.by_status[status],
  }))

  const usersByRole = Object.entries(data?.users?.by_role ?? {}).map(([role, total]) => ({
    label: ROLE_LABELS[role] || humanizeStatus(role),
    value: total,
  }))

  const applicationSpark = STATUS_ORDER.filter(
    (status) => data?.applications?.by_status?.[status] != null,
  ).map((status) => Number(data.applications.by_status[status] || 0))

  return (
    <div className="dash">
      <PageIntro
        eyebrow="Administration"
        title="System monitoring"
        subtitle="Platform-wide counts for accounts, franchises, applications, payments, and certificates."
        actions={
          <>
            <Link className="dash-btn" to="/admin/activity-logs">
              Activity logs
            </Link>
            <Link className="dash-btn dash-btn--primary" to="/admin/users">
              Manage staff
            </Link>
          </>
        }
      />

      {error ? (
        <Notice tone="danger" title="Unable to load">
          {error}
        </Notice>
      ) : null}

      <section className="dash-metrics" aria-label="Platform summary">
        <MetricCard
          label="User accounts"
          value={loading ? '—' : number(data?.users?.total ?? 0)}
          hint={
            loading
              ? 'Loading accounts'
              : `${number(data?.users?.pending_activation ?? 0)} awaiting activation`
          }
          to="/admin/users"
        />
        <MetricCard
          label="Franchises"
          value={loading ? '—' : number(data?.franchises?.total ?? 0)}
          hint={
            loading
              ? 'Loading franchises'
              : `${number(data?.franchises?.active ?? 0)} active, ${number(data?.franchises?.expiring_soon ?? 0)} expiring soon`
          }
        />
        <MetricCard
          label="Applications"
          value={loading ? '—' : number(data?.applications?.total ?? 0)}
          hint={loading ? 'Loading applications' : `${number(data?.applications?.open ?? 0)} currently open`}
          spark={applicationSpark}
        />
        <MetricCard
          label="Collections"
          value={loading ? '—' : money(data?.payments?.total_collected ?? 0, { compact: true })}
          hint={
            loading
              ? 'Loading payments'
              : `${number(data?.payments?.pending_verification ?? 0)} pending verification`
          }
        />
      </section>

      <div className="dash-grid">
        <Panel
          title="Applications by status"
          subtitle="Platform-wide application distribution"
          span="main"
        >
          <Chart
            data={applicationsByStatus}
            xKey="status"
            label="Applications by status"
            series={[
              { key: 'count', name: 'Applications', fill: '#e8822a' },
            ]}
          />
          <Insight>
            {number(data?.applications?.open ?? 0)} application(s) are still open, and{' '}
            {number(data?.users?.pending_activation ?? 0)} franchisee account(s) are waiting for
            activation.
          </Insight>
        </Panel>

        <Panel title="Users by role" subtitle="Account distribution" span="side">
          {usersByRole.length > 0 ? (
            <Breakdown items={usersByRole} />
          ) : (
            <p className="dash-empty">No user accounts yet.</p>
          )}
        </Panel>
      </div>

      <TableCard
        title="Recent activity"
        subtitle="Latest actions recorded across the platform"
        action={
          <Link className="dash-link" to="/admin/activity-logs">
            View all logs
          </Link>
        }
        loading={loading}
        rows={data?.recent_activity ?? []}
        emptyMessage="No activity recorded yet."
        columns={[
          {
            key: 'action',
            label: 'Action',
            render: (row) => (
              <span className="dash-table__strong">{humanizeStatus(row.action)}</span>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            className: 'dash-table__wrap',
            render: (row) => row.description,
          },
          {
            key: 'user',
            label: 'User',
            render: (row) => row.user || 'System',
          },
          {
            key: 'role',
            label: 'Role',
            render: (row) => (row.role ? humanizeStatus(row.role) : '—'),
          },
          {
            key: 'created_at',
            label: 'When',
            render: (row) =>
              formatDate(row.created_at, { hour: 'numeric', minute: '2-digit' }),
          },
        ]}
      />
    </div>
  )
}
