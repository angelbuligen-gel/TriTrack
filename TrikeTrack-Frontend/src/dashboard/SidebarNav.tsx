import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type { NavItem } from './types'

type SidebarNavProps = {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
}

export default function SidebarNav({ items, activeId, onSelect }: SidebarNavProps) {
  const [expanded, setExpanded] = useState<string[]>(() =>
    items.filter((item) => item.children?.length).map((item) => item.id),
  )

  const toggle = (id: string) =>
    setExpanded((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )

  return (
    <nav className="tt-nav" aria-label="Dashboard sections">
      <ul className="tt-nav__list">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length)
          const isOpen = hasChildren ? expanded.includes(item.id) : false
          const childActive = item.children?.some((child) => child.id === activeId) ?? false
          const isActive = activeId === item.id || childActive

          return (
            <li key={item.id} className="tt-nav__item">
              <button
                type="button"
                className={`tt-nav__btn${isActive ? ' is-active' : ''}`}
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-current={!hasChildren && isActive ? 'page' : undefined}
                onClick={() => {
                  onSelect(item.id)

                  if (hasChildren) {
                    toggle(item.id)
                  }
                }}
              >
                <span className="tt-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="tt-nav__label">{item.label}</span>
                {hasChildren ? (
                  <ChevronDown
                    size={16}
                    className={`tt-nav__chevron${isOpen ? ' is-open' : ''}`}
                    aria-hidden="true"
                  />
                ) : null}
              </button>

              {hasChildren && isOpen ? (
                <ul className="tt-nav__sublist">
                  {item.children?.map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        className={`tt-nav__sublink${child.id === activeId ? ' is-active' : ''}`}
                        aria-current={child.id === activeId ? 'page' : undefined}
                        onClick={() => onSelect(child.id)}
                      >
                        <span>{child.label}</span>
                        {child.badge ? <span className="tt-nav__badge">{child.badge}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
