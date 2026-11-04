import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

export type Column<T> = {
  key: string
  header: string
  align?: 'left' | 'right'
  /** Value used for ordering; keep it primitive so mixed columns stay comparable. */
  sortValue: (row: T) => string | number
  render: (row: T) => ReactNode
}

type SortableTableProps<T> = {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  initialSort?: { key: string; direction: SortDirection }
}

const compare = (a: string | number, b: string | number): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export default function SortableTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  initialSort,
}: SortableTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>(
    initialSort ?? { key: columns[0]?.key ?? '', direction: 'asc' },
  )

  const sortedRows = useMemo(() => {
    const column = columns.find((entry) => entry.key === sort.key) ?? columns[0]

    if (!column) {
      return rows
    }

    const next = [...rows].sort((a, b) => compare(column.sortValue(a), column.sortValue(b)))

    return sort.direction === 'asc' ? next : next.reverse()
  }, [rows, columns, sort])

  const toggleSort = (key: string) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return (
    <div className="tt-table-wrap">
      <table className="tt-table">
        <caption className="tt-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort.key === column.key
              const SortIcon = isSorted ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <button
                    type="button"
                    className={`tt-table__sort${column.align === 'right' ? ' tt-table__sort--right' : ''}`}
                    onClick={() => toggleSort(column.key)}
                  >
                    <span>{column.header}</span>
                    <SortIcon size={14} aria-hidden="true" />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? 'tt-table__cell--right' : undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
