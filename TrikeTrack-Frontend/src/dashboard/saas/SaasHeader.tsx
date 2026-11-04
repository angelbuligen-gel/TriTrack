import { Bell, ChevronRight, MonitorDot, Search } from 'lucide-react'

export default function SaasHeader() {
  return (
    <header className="sd-header">
      <nav className="sd-crumbs" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <ChevronRight size={13} className="sd-crumbs__sep" aria-hidden="true" />
        <span className="sd-crumbs__current" aria-current="page">
          Overview
        </span>
      </nav>

      <div className="sd-header__right">
        <label className="sd-search">
          <Search size={14} aria-hidden="true" />
          <span className="sd-visually-hidden">Search the dashboard</span>
          <input type="search" placeholder="Search applications..." />
          <span className="sd-kbd" aria-hidden="true">
            ⌘ K
          </span>
        </label>

        <button type="button" className="sd-iconbtn" aria-label="Notifications">
          <Bell size={15} />
        </button>
        <button type="button" className="sd-iconbtn" aria-label="System monitor">
          <MonitorDot size={15} />
        </button>
        <button type="button" className="sd-header__avatar" aria-label="Account menu">
          MS
        </button>
      </div>
    </header>
  )
}
