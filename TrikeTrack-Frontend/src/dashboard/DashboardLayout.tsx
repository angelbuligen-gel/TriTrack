import { useEffect, useState } from 'react'
import {
  Bell,
  ChartBar,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Moon,
  Receipt,
  Sun,
  Users,
  X,
} from 'lucide-react'

import ChartsPanel from './ChartsPanel'
import MetricCard from './MetricCard'
import SidebarNav from './SidebarNav'
import SortableTable, { type Column } from './SortableTable'
import './dashboard.css'
import type { ApplicationRow, Metric, NavItem, ThemeMode } from './types'

const THEME_STORAGE_KEY = 'tt-dashboard-theme'

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  {
    id: 'applications',
    label: 'Applications',
    icon: <FolderOpen size={18} />,
    children: [
      { id: 'applications-renewal', label: 'Renewals', badge: '12' },
      { id: 'applications-transfer', label: 'Transfers' },
      { id: 'applications-change-motor', label: 'Change motor' },
    ],
  },
  {
    id: 'records',
    label: 'Records',
    icon: <FileText size={18} />,
    children: [
      { id: 'records-franchises', label: 'Franchises' },
      { id: 'records-franchisees', label: 'Franchisees', badge: '4' },
      { id: 'records-drivers', label: 'Drivers' },
    ],
  },
  { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
  { id: 'assessments', label: 'Assessments', icon: <Receipt size={18} /> },
  { id: 'reports', label: 'Reports', icon: <ChartBar size={18} /> },
  { id: 'accounts', label: 'Accounts', icon: <Users size={18} /> },
]

const metrics: Metric[] = [
  { id: 'renewals', label: 'Pending renewals', value: '48', delta: 12.4, hint: 'vs. last month' },
  { id: 'approved', label: 'Approved this month', value: '126', delta: 6.8, hint: 'vs. last month' },
  { id: 'collections', label: 'Collections', value: '₱268,900', delta: -3.2, hint: 'vs. last month' },
  { id: 'turnaround', label: 'Avg. processing time', value: '2.4 days', delta: 14.5, hint: 'slower than last month' },
]

const applications: ApplicationRow[] = [
  { id: 'a1', reference: 'TT-2026-0142', franchisee: 'Marites Santos', type: 'Renewal', status: 'Approved', amount: 1500, submitted: '2026-10-28' },
  { id: 'a2', reference: 'TT-2026-0143', franchisee: 'Roberto Reyes', type: 'Transfer', status: 'Pending', amount: 2750, submitted: '2026-10-30' },
  { id: 'a3', reference: 'TT-2026-0144', franchisee: 'Juan Dela Cruz', type: 'Change Motor', status: 'Pending', amount: 900, submitted: '2026-11-01' },
  { id: 'a4', reference: 'TT-2026-0145', franchisee: 'Ana Villanueva', type: 'Renewal', status: 'Rejected', amount: 1500, submitted: '2026-11-02' },
  { id: 'a5', reference: 'TT-2026-0146', franchisee: 'Pedro Bautista', type: 'Renewal', status: 'Approved', amount: 1500, submitted: '2026-11-03' },
]

const columns: Column<ApplicationRow>[] = [
  {
    key: 'reference',
    header: 'Reference',
    sortValue: (row) => row.reference,
    render: (row) => <span className="tt-table__strong">{row.reference}</span>,
  },
  { key: 'franchisee', header: 'Franchisee', sortValue: (row) => row.franchisee, render: (row) => row.franchisee },
  { key: 'type', header: 'Type', sortValue: (row) => row.type, render: (row) => row.type },
  {
    key: 'status',
    header: 'Status',
    sortValue: (row) => row.status,
    render: (row) => (
      <span className={`tt-chip tt-chip--${row.status.toLowerCase()}`}>{row.status}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortValue: (row) => row.amount,
    render: (row) => `₱${row.amount.toLocaleString()}`,
  },
  { key: 'submitted', header: 'Submitted', align: 'right', sortValue: (row) => row.submitted, render: (row) => row.submitted },
]

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function DashboardLayout() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [activeId, setActiveId] = useState('applications-renewal')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!navOpen) {
      return undefined
    }

    const close = () => setNavOpen(false)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('resize', close)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('resize', close)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [navOpen])

  const isDark = theme === 'dark'

  return (
    <div className="tt-dash" data-theme={theme}>
      <aside className={`tt-dash__sidebar${navOpen ? ' is-open' : ''}`} aria-label="Dashboard navigation">
        <div className="tt-dash__brand">
          <span className="tt-dash__mark" aria-hidden="true">
            TT
          </span>
          <span className="tt-dash__brand-text">
            <strong>TrikeTrack</strong>
            <small>Operations</small>
          </span>
        </div>

        <SidebarNav
          items={navItems}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id)
            setNavOpen(false)
          }}
        />

        <div className="tt-dash__sidebar-foot">
          <span className="tt-dash__avatar" aria-hidden="true">
            MS
          </span>
          <span className="tt-dash__user">
            <strong>Marites Santos</strong>
            <small>BPLO Personnel</small>
          </span>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="tt-dash__scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="tt-dash__content">
        <header className="tt-dash__topbar">
          <button
            type="button"
            className="tt-iconbtn tt-dash__menu"
            onClick={() => setNavOpen((current) => !current)}
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={navOpen}
          >
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="tt-dash__heading">
            <p className="tt-dash__eyebrow">Operations</p>
            <h1 className="tt-dash__title">Franchise overview</h1>
          </div>

          <div className="tt-dash__actions">
            <button type="button" className="tt-iconbtn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              type="button"
              className="tt-theme-toggle"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-pressed={isDark}
            >
              {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </header>

        <section className="tt-metrics" aria-label="Key metrics">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </section>

        <ChartsPanel theme={theme} />

        <section className="tt-card">
          <header className="tt-card__head tt-card__head--row">
            <div>
              <h2 className="tt-card__title">Recent applications</h2>
              <p className="tt-card__sub">Click a column heading to sort</p>
            </div>
            <span className="tt-card__meta">{applications.length} records</span>
          </header>

          <SortableTable
            caption="Recent franchise applications"
            columns={columns}
            rows={applications}
            getRowId={(row) => row.id}
            initialSort={{ key: 'submitted', direction: 'desc' }}
          />
        </section>
      </div>
    </div>
  )
}
