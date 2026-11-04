import {
  BarChart3,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'

type NavLink = {
  id: string
  label: string
  icon: ReactNode
  badge?: string
}

type NavGroup = {
  title: string
  links: NavLink[]
}

const groups: NavGroup[] = [
  {
    title: 'Main menu',
    links: [
      { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
      { id: 'applications', label: 'Applications', icon: <ClipboardList size={16} />, badge: '12' },
      { id: 'renewals', label: 'Renewals', icon: <FileText size={16} /> },
      { id: 'certificates', label: 'Certificates', icon: <FileCheck2 size={16} /> },
    ],
  },
  {
    title: 'Records',
    links: [
      { id: 'franchisees', label: 'Franchisees', icon: <Users size={16} /> },
      { id: 'franchises', label: 'Franchises', icon: <Building2 size={16} /> },
      { id: 'drivers', label: 'Drivers', icon: <BadgeCheck size={16} /> },
    ],
  },
  {
    title: 'Finance',
    links: [
      { id: 'assessments', label: 'Assessments', icon: <Receipt size={16} /> },
      { id: 'payments', label: 'Payments', icon: <Wallet size={16} /> },
      { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { id: 'access', label: 'Access control', icon: <ShieldCheck size={16} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
      { id: 'support', label: 'Support', icon: <LifeBuoy size={16} /> },
    ],
  },
]

export default function SaasSidebar({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="sd-sidebar" aria-label="Dashboard navigation">
      <div className="sd-brand">
        <span className="sd-mark" aria-hidden="true">
          <Building2 size={17} />
        </span>
        <span className="sd-brand-text">
          <strong>TrikeTrack</strong>
          <small>BPLO Office</small>
        </span>
      </div>

      <nav className="sd-nav">
        {groups.map((group) => (
          <div className="sd-nav__group" key={group.title}>
            <p className="sd-nav__title">{group.title}</p>
            {group.links.map((link) => (
              <button
                key={link.id}
                type="button"
                className={`sd-nav__link${link.id === activeId ? ' is-active' : ''}`}
                aria-current={link.id === activeId ? 'page' : undefined}
                onClick={() => onSelect(link.id)}
              >
                <span className="sd-nav__icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span className="sd-nav__label">{link.label}</span>
                {link.badge ? <span className="sd-nav__badge">{link.badge}</span> : null}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sd-sidebar__foot">
        <span className="sd-avatar" aria-hidden="true">
          MS
        </span>
        <span className="sd-user">
          <strong>Marites Santos</strong>
          <small>BPLO Personnel</small>
        </span>
        <span className="sd-plan">LGU</span>
      </div>
    </aside>
  )
}
