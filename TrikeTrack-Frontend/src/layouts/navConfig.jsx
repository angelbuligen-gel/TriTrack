import {
  ArrowLeftRight,
  Bell,
  CarFront,
  Certificate,
  ChartBar,
  ClipboardList,
  Cog,
  CreditCard,
  FileSearch,
  FileText,
  History,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  RefreshCw,
  Store,
  UserCircle,
  Users,
} from 'lucide-react'// Single source of truth for the sidebar menu, page title, breadcrumb and
// navigation search. Routes, labels and item order match the original
// navigation exactly; sections only add visual grouping.
const NAV_SECTIONS_BY_ROLE = {
  franchisee: [
    { title: 'Overview', items: [{ to: '/app', label: 'Dashboard', end: true }] },
    {
      title: 'Applications',
      items: [
        { to: '/renewal', label: 'Renewal' },
        { to: '/transfer', label: 'Transfer' },
        { to: '/change-motor', label: 'Change Motor' },
        { to: '/applications', label: 'Application Tracking' },
      ],
    },
    {
      title: 'Records',
      items: [
        { to: '/payments', label: 'Payments' },
        { to: '/documents', label: 'Documents' },
        { to: '/certificates', label: 'Certificates' },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/notifications', label: 'Notifications' },
        { to: '/profile', label: 'Profile' },
      ],
    },
  ],
  bplo: [
    { title: 'Overview', items: [{ to: '/bplo', label: 'Dashboard', end: true }] },
    {
      title: 'Records',
      items: [
        { to: '/franchises', label: 'Franchise' },
        { to: '/franchisees', label: 'Franchisee' },
        { to: '/drivers', label: 'Driver' },
      ],
    },
    {
      title: 'Applications',
      items: [
        { to: '/renewals', label: 'Renewal' },
        { to: '/transfers', label: 'Transfer' },
        { to: '/change-motor', label: 'Change Motor' },
        { to: '/documents', label: 'Document Review' },
      ],
    },
    {
      title: 'Outputs',
      items: [
        { to: '/certificates', label: 'Certificate Management' },
        { to: '/reports', label: 'Reports' },
      ],
    },
  ],
  treasury: [
    { title: 'Overview', items: [{ to: '/treasury', label: 'Dashboard', end: true }] },
    {
      title: 'Transactions',
      items: [
        { to: '/assessments', label: 'Assessments' },
        { to: '/payments', label: 'Payment Verification' },
      ],
    },
    { title: 'Reporting', items: [{ to: '/reports', label: 'Collection Reports' }] },
  ],
  administrator: [
    { title: 'Overview', items: [{ to: '/admin', label: 'Dashboard', end: true }] },
    {
      title: 'System',
      items: [
        { to: '/users', label: 'User Management' },
        { to: '/settings', label: 'System Configuration' },
      ],
    },
    { title: 'Monitoring', items: [{ to: '/activity-logs', label: 'Activity Logs' }] },
  ],
}

export const NAV_ICONS = {
  '/app': Home,
  '/renewal': RefreshCw,
  '/transfer': ArrowLeftRight,
  '/change-motor': CarFront,
  '/applications': ClipboardList,
  '/payments': CreditCard,
  '/documents': FileText,
  '/certificates': Certificate,
  '/notifications': Bell,
  '/profile': UserCircle,
  '/bplo': LayoutDashboard,
  '/franchises': Store,
  '/franchisees': Users,
  '/drivers': IdCard,
  '/renewals': RefreshCw,
  '/transfers': ArrowLeftRight,
  '/change-motor': CarFront,
  '/documents': FileSearch,
  '/certificates': Certificate,
  '/reports': ChartBar,
  '/treasury': Landmark,
  '/assessments': ReceiptText,
  '/payments': CreditCard,
  '/reports': ChartBar,
  '/admin': LayoutDashboard,
  '/users': Users,
  '/settings': Cog,
  '/activity-logs': History,
}

export function navSectionsForRole(role) {
  return NAV_SECTIONS_BY_ROLE[role] || []
}

// Flat list (section title attached) used for the title, breadcrumb and search.
export function navItemsForRole(role) {
  return navSectionsForRole(role).flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title })),
  )
}

