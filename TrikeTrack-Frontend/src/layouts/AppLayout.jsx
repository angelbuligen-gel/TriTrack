import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Home,
  LogOut,
  MonitorDot,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react'

import useAuth from '../hooks/useAuth'
import { humanizeRole } from '../utils/format'
import { NAV_ICONS, navItemsForRole, navSectionsForRole } from './navConfig'
import './app-shell-dark.css'

function NavIcon({ to, size = 18 }) {
  const Icon = NAV_ICONS[to] || Home

  return <Icon size={size} aria-hidden="true" />
}

function Highlight({ text, query }) {
  if (!query) {
    return <span>{text}</span>
  }

  const index = text.toLowerCase().indexOf(query.toLowerCase())

  if (index === -1) {
    return <span>{text}</span>
  }

  return (
    <span>
      {text.slice(0, index)}
      <mark className="nav-search__mark">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </span>
  )
}

function NavSearch({ sections, collapsed, pathname, onNavigate }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [floating, setFloating] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = useMemo(() => {
    const all = sections.flatMap((section) =>
      section.items.map((item) => ({ ...item, section: section.title })),
    )
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return all.slice(0, 8)
    }

    return all.filter((item) => item.label.toLowerCase().includes(needle))
  }, [sections, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    setOpen(false)
    setFloating(false)
    setQuery('')
  }, [pathname])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
        setFloating(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleShortcut)

    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const node = listRef.current?.querySelector('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const select = (item) => {
    setQuery('')
    setOpen(false)
    setFloating(false)
    onNavigate(item.to)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      if (open && results[activeIndex]) {
        event.preventDefault()
        select(results[activeIndex])
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      setFloating(false)
    }
  }

  const openFloating = () => {
    setFloating(true)
    setOpen(true)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const toggleFloating = () => {
    if (floating && open) {
      setOpen(false)
      setFloating(false)
      return
    }

    openFloating()
  }

  const field = (
    <div className="nav-search__field">
      <Search className="nav-search__icon" size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="nav-search__input"
        placeholder="Search navigation..."
        value={query}
        aria-label="Search navigation"
        aria-expanded={open}
        aria-controls="nav-search-results"
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {query ? (
        <button type="button" className="nav-search__clear" onClick={() => {
          setQuery('')
          inputRef.current?.focus()
        }} aria-label="Clear search">
          <X size={14} />
        </button>
      ) : (
        <span className="nav-search__kbd" aria-hidden="true">
          ⌘ K
        </span>
      )}
    </div>
  )

  const resultsPanel = open ? (
    <div className="nav-search__panel" id="nav-search-results" role="listbox" aria-label="Navigation results" ref={listRef}>
      {results.length === 0 ? (
        <p className="nav-search__empty">No results found for “{query.trim()}”</p>
      ) : (
        results.map((item, index) => (
          <button
            key={item.to}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            data-active={index === activeIndex ? 'true' : undefined}
            className={`nav-search__result${index === activeIndex ? ' is-active' : ''}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => select(item)}
          >
            <NavIcon to={item.to} size={16} />
            <span className="nav-search__result-text">
              <span className="nav-search__result-label">
                <Highlight text={item.label} query={query.trim()} />
              </span>
              <small>{item.section}</small>
            </span>
          </button>
        ))
      )}
    </div>
  ) : null

  return (
    <div className={`nav-search${collapsed ? ' nav-search--collapsed' : ''}`} ref={wrapRef}>
      {collapsed ? (
        <>
          <button
            type="button"
            className="nav-search__trigger"
            onClick={toggleFloating}
            aria-label="Search navigation"
            aria-expanded={open && floating}
          >
            <Search size={18} />
          </button>
          {floating ? (
            <div className="nav-search__popover">
              {field}
              {resultsPanel}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {field}
          {resultsPanel}
        </>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const sections = useMemo(() => navSectionsForRole(user?.role), [user?.role])

  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)

  const sidebarRef = useRef(null)
  const accountRef = useRef(null)

  // Below 960px the drawer owns the layout; above it the collapsed state applies.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)')
    const sync = (event) => {
      if (event.matches) {
        setCollapsed(false)
      } else {
        setMobileNavOpen(false)
      }
    }

    sync(media)
    media.addEventListener('change', sync)

    return () => media.removeEventListener('change', sync)
  }, [])

  // Close drawer and menus when navigating; lock background scroll while the drawer is open.
  useEffect(() => {
    setMobileNavOpen(false)
    setTooltip(null)
    setAccountOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  // Escape dismisses the collapsed-mode tooltip.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setTooltip(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'U'

  const navItems = useMemo(() => navItemsForRole(user?.role), [user?.role])
  const currentItem = navItems.find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )
  const isDashboard = ['/app', '/bplo', '/treasury', '/admin'].includes(location.pathname)
  const crumbLabel = currentItem?.label === 'Dashboard' ? 'Overview' : currentItem?.label || 'Overview'
  const planLabel =
    user?.role === 'franchisee'
      ? 'Active'
      : { bplo: 'BPLO', treasury: 'Treasury', administrator: 'Admin' }[user?.role] || 'Staff'
  const profileRoute = user?.role === 'franchisee' ? '/app/profile' : null
  const SidebarUserTag = profileRoute ? 'button' : 'div'

  const notificationRoute =
    {
      franchisee: '/app/notifications',
      bplo: '/bplo/documents',
      treasury: '/treasury/payments',
      administrator: '/admin/activity-logs',
    }[user?.role] || '/'

  const monitorRoute =
    {
      franchisee: '/app/applications',
      bplo: '/bplo/reports',
      treasury: '/treasury/reports',
      administrator: '/admin',
    }[user?.role] || '/'

  const handleLogout = async () => {
    setAccountOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const showTooltip = (event, label) => {
    if (!collapsed || mobileNavOpen) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    // Anchor to the rail edge so the tooltip never covers the icon.
    const railRight = sidebarRef.current?.getBoundingClientRect().right ?? rect.right
    setTooltip({ label, top: rect.top + rect.height / 2, left: railRight + 12 })
  }

  const hideTooltip = () => setTooltip(null)

  const sidebarClass = ['app-nav', collapsed ? 'is-collapsed' : '', mobileNavOpen ? 'is-open' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`app-shell${isDashboard ? ' app-shell--dashboard' : ''}`}>
      <button
        type="button"
        className="app-nav-toggle"
        onClick={() => setMobileNavOpen((current) => !current)}
        aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileNavOpen}
      >
        <span className="app-nav-toggle__bar" />
        <span className="app-nav-toggle__bar" />
        <span className="app-nav-toggle__bar" />
      </button>

      <div className="app-body">
        <aside className={sidebarClass} aria-label="Primary navigation" ref={sidebarRef}>
          <div className="app-sidebar__top">
            <div className="app-sidebar__brand">
              <span className="brand__mark" aria-hidden="true">
                TT
              </span>
              <div className="app-sidebar__brand-text">
                <strong>TrikeTrack</strong>
                <small>Franchise Processing System</small>
              </div>
            </div>

            <button
              type="button"
              className="app-sidebar__collapse"
              onClick={() => {
                if (window.innerWidth <= 960) {
                  setMobileNavOpen(false)
                  return
                }

                setCollapsed((current) => !current)
              }}
              aria-label={
                mobileNavOpen ? 'Close navigation menu' : collapsed ? 'Expand navigation' : 'Collapse navigation'
              }
              aria-expanded={!mobileNavOpen && !collapsed}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>

          <nav className="app-nav__list" aria-label="Primary">
            {sections.map((section) => (
              <div className="app-nav__group" key={section.title}>
                <p className="app-nav__section">{section.title}</p>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    aria-label={item.label}
                    className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
                    onMouseEnter={(event) => showTooltip(event, item.label)}
                    onMouseLeave={hideTooltip}
                    onFocus={(event) => showTooltip(event, item.label)}
                    onBlur={hideTooltip}
                    onClick={() => setTooltip(null)}
                  >
                    <NavIcon to={item.to} />
                    <span className="app-nav__label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="app-sidebar__foot">
            <SidebarUserTag
              type={profileRoute ? 'button' : undefined}
              className="sidebar-user"
              onClick={profileRoute ? () => navigate(profileRoute) : undefined}
              aria-label={profileRoute ? 'Open profile' : undefined}
            >
              <span className="sidebar-user__avatar">{initials}</span>
              <span className="sidebar-user__meta">
                <strong>{user?.name || 'User'}</strong>
                <small>{user?.role ? humanizeRole(user.role) : 'Account'}</small>
              </span>
              <span className="sidebar-user__plan">{planLabel}</span>
            </SidebarUserTag>

            <button
              type="button"
              className="sidebar-user__logout"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {mobileNavOpen ? <div className="app-nav__overlay" onClick={() => setMobileNavOpen(false)} /> : null}

        {tooltip ? (
          <div className="app-nav__tooltip" style={{ top: tooltip.top, left: tooltip.left }} role="tooltip">
            {tooltip.label}
          </div>
        ) : null}

        <div className="app-content">
          <header className="app-topbar">
            <nav className="app-topbar__crumbs" aria-label="Breadcrumb">
              <span>Dashboard</span>
              <ChevronRight size={13} className="app-topbar__sep" aria-hidden="true" />
              <span className="app-topbar__current" aria-current="page">
                {crumbLabel}
              </span>
            </nav>

            <div className="app-topbar__right">
              <NavSearch
                sections={sections}
                collapsed={false}
                pathname={location.pathname}
                onNavigate={(to) => navigate(to)}
              />

              <button
                type="button"
                className="app-topbar__icon"
                onClick={() => navigate(notificationRoute)}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={15} />
              </button>

              <button
                type="button"
                className="app-topbar__icon"
                onClick={() => navigate(monitorRoute)}
                aria-label="System monitor"
                title="System monitor"
              >
                <MonitorDot size={15} />
              </button>

              <div className="app-topbar__account" ref={accountRef}>
                <button
                  type="button"
                  className="app-topbar__avatar"
                  onClick={() => setAccountOpen((current) => !current)}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  {initials}
                </button>

                {accountOpen ? (
                  <div className="app-topbar__menu" role="menu">
                    <div className="app-topbar__menu-head">
                      <strong>{user?.name || 'User'}</strong>
                      <small>{user?.role ? humanizeRole(user.role) : 'Account'}</small>
                    </div>

                    {profileRoute ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountOpen(false)
                          navigate(profileRoute)
                        }}
                      >
                        View profile
                      </button>
                    ) : null}

                    <button type="button" role="menuitem" className="is-danger" onClick={handleLogout}>
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className={`app-main${isDashboard ? ' app-main--dashboard' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
