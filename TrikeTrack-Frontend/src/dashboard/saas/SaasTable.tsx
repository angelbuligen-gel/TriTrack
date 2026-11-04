import { useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'

import { sdApplications, sdMoney } from './data'
import { StatusPill } from './primitives'

export default function SaasTable() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) {
      return sdApplications
    }

    return sdApplications.filter((row) =>
      `${row.reference} ${row.franchisee} ${row.type} ${row.statusLabel}`
        .toLowerCase()
        .includes(term),
    )
  }, [query])

  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id))

  const toggleAll = () => {
    setSelected(allSelected ? [] : rows.map((row) => row.id))
  }

  const toggleOne = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  return (
    <section className="sd-table-card" aria-label="Recent applications">
      <div className="sd-toolbar">
        <div className="sd-toolbar__left">
          <h2 className="sd-card__title">Recent applications</h2>
          {selected.length > 0 ? <span className="sd-selcount">{selected.length} selected</span> : null}
        </div>

        <div className="sd-toolbar__right">
          <label className="sd-visually-hidden" htmlFor="sd-table-search">
            Filter applications
          </label>
          <input
            id="sd-table-search"
            className="sd-input"
            type="search"
            value={query}
            placeholder="Filter by franchisee..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="sd-btn sd-btn--primary">
            <Plus size={14} aria-hidden="true" />
            New application
          </button>
        </div>
      </div>

      <div className="sd-table-wrap">
        <table className="sd-table">
          <caption className="sd-visually-hidden">
            Franchise applications with status, documents filed, and assessed fees
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 34 }}>
                <input
                  type="checkbox"
                  className="sd-check"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? 'Clear selection' : 'Select all applications'}
                />
              </th>
              <th scope="col">ID</th>
              <th scope="col">Franchisee</th>
              <th scope="col">Application</th>
              <th scope="col">Status</th>
              <th scope="col" className="sd-table__right">
                Docs
              </th>
              <th scope="col" className="sd-table__right">
                Fee
              </th>
              <th
                scope="col"
                className="sd-table__right"
                title="Assessed fee plus any late-filing surcharge"
              >
                Total
              </th>
              <th scope="col" style={{ width: 44 }}>
                <span className="sd-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selected.includes(row.id)

              return (
                <tr key={row.id} className={isSelected ? 'is-selected' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      className="sd-check"
                      checked={isSelected}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.reference}`}
                    />
                  </td>
                  <td className="sd-table__id">{row.reference}</td>
                  <td className="sd-table__strong">{row.franchisee}</td>
                  <td>{row.type}</td>
                  <td>
                    <StatusPill tone={row.status} label={row.statusLabel} />
                  </td>
                  <td className="sd-table__right">{row.documents}</td>
                  <td className="sd-table__right">{sdMoney(row.fee)}</td>
                  <td className="sd-table__num" title="Includes late-filing surcharge where applied">
                    {sdMoney(row.total)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="sd-actions"
                      aria-label={`Actions for ${row.reference}`}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="sd-empty">No applications match “{query}”.</p>
        ) : null}
      </div>
    </section>
  )
}
