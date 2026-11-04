export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  rowKey = (row, index) => row?.id ?? index,
}) {
  if (loading) {
    return (
      <div className="table-loading" role="status" aria-live="polite">
        <span className="btn__spinner" aria-hidden="true" />
        Loading records…
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={column.width ? { width: column.width } : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
