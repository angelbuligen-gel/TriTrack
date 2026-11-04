import { humanizeStatus } from '../utils/format'

export default function DistributionList({ title, data, total, labels = {}, emptyMessage = 'No data for this period.' }) {
  const entries = Object.entries(data || {}).sort((a, b) => Number(b[1]) - Number(a[1]))
  const sum = entries.reduce((carry, [, value]) => carry + Number(value), 0) || total || 0

  return (
    <article className="panel">
      <h2 className="panel__title">{title}</h2>
      {entries.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <div className="stack stack--tight">
          {entries.map(([key, value]) => {
            const percentage = sum > 0 ? Math.round((Number(value) / sum) * 100) : 0

            return (
              <div key={key}>
                <div className="row-actions">
                  <span>{labels[key] || humanizeStatus(key)}</span>
                  <span className="text-muted">
                    {value} ({percentage}%)
                  </span>
                </div>
                <div className="meter">
                  <span className="meter__fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}
