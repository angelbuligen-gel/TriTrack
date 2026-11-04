import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Loader2, Settings2, Sparkles } from 'lucide-react'

import { humanizeStatus } from '../../utils/format'
import './dash-kit.css'

const TOOLTIP_STYLE = {
  background: '#2a2a2a',
  border: '1px solid #3a3a3a',
  borderRadius: 8,
  fontSize: 12,
  color: '#f5f5f5',
  padding: '8px 10px',
}

const STATUS_TONES = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  successful: 'success',
  paid: 'success',
  verified: 'success',
  issued: 'success',
  pending: 'pending',
  submitted: 'pending',
  under_review: 'pending',
  documents_pending: 'pending',
  for_renewal: 'pending',
  processing: 'pending',
  rejected: 'danger',
  failed: 'danger',
  expired: 'danger',
  suspended: 'danger',
  cancelled: 'cancelled',
  revoked: 'cancelled',
  refunded: 'cancelled',
  transferred: 'info',
  replaced: 'info',
  ended: 'info',
  missing: 'info',
}

export function money(value, { compact = false } = {}) {
  const amount = Number(value || 0)

  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `₱${(amount / 1_000_000).toFixed(1)}M`
    }

    if (Math.abs(amount) >= 1_000) {
      return `₱${(amount / 1_000).toFixed(1)}k`
    }
  }

  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function number(value) {
  return Number(value || 0).toLocaleString('en-PH')
}

export function percentChange(current, previous) {
  if (!previous) {
    return null
  }

  return ((Number(current || 0) - Number(previous)) / Number(previous)) * 100
}

export function normalizeSpark(values) {
  const source = values?.length ? values : [24, 32, 28, 40, 48]
  const peak = Math.max(...source.map((value) => Number(value) || 0), 1)

  return source.map((value) => Math.max(8, Math.round(((Number(value) || 0) / peak) * 100)))
}

export function resample(values, count = 5) {
  if (!values?.length) {
    return Array.from({ length: count }, (_, index) => 24 + index * 8)
  }

  if (values.length === count) {
    return values
  }

  if (values.length === 1) {
    return Array.from({ length: count }, () => values[0])
  }

  return Array.from({ length: count }, (_, index) => {
    const position = (index / (count - 1)) * (values.length - 1)
    const low = Math.floor(position)
    const high = Math.ceil(position)
    const weight = position - low

    return Number(values[low]) + (Number(values[high]) - Number(values[low])) * weight
  })
}

export function lastMonthBuckets(count = 6) {
  const buckets = []
  const now = new Date()

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('en-PH', { month: 'short' }),
    })
  }

  return buckets
}

export function monthlyCounts(items, dateKey, buckets) {
  return buckets.map((bucket) =>
    (items || []).filter((item) => item?.[dateKey]?.slice(0, 7) === bucket.key).length,
  )
}

export function Sparkline({ values, label }) {
  const heights = normalizeSpark(resample(values, 5))

  return (
    <div className="dash-spark" role="img" aria-label={`${label} trend`}>
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`dash-spark__bar${index < 2 ? ' is-dim' : ''}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

export function MetricCard({ label, value, delta = null, hint, spark, to }) {
  const content = (
    <>
      <div className="dash-metric__top">
        <div className="dash-metric__text">
          <p className="dash-metric__label">{label}</p>
          <p className="dash-metric__value">{value}</p>
        </div>
        {spark?.length ? <Sparkline values={spark} label={label} /> : null}
      </div>

      <p className="dash-metric__foot">
        <Info size={12} className="dash-metric__info" aria-hidden="true" />
        {typeof delta === 'number' ? (
          <span className={`dash-metric__delta ${delta >= 0 ? 'is-up' : 'is-down'}`}>
            {delta >= 0 ? '+' : '−'}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="dash-metric__hint">{hint}</span> : null}
      </p>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="dash-metric dash-metric--link">
        {content}
      </Link>
    )
  }

  return <article className="dash-metric">{content}</article>
}

export function PageIntro({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="dash-intro">
      <div className="dash-intro__copy">
        {eyebrow ? <p className="dash-intro__eyebrow">{eyebrow}</p> : null}
        <h1 className="dash-intro__title">{title}</h1>
        {subtitle ? <p className="dash-intro__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="dash-intro__actions">{actions}</div> : null}
    </header>
  )
}

export function Panel({ title, subtitle, action, children, className = '', span = 'main' }) {
  const spanClass =
    span === 'main' ? 'dash-card--main' : span === 'side' ? 'dash-card--side' : ''

  return (
    <article className={`dash-card ${spanClass} ${className}`.trim()}>
      {title || action ? (
        <header className="dash-card__head">
          <div className="dash-card__heading">
            {title ? <h2 className="dash-card__title">{title}</h2> : null}
            {subtitle ? <p className="dash-card__sub">{subtitle}</p> : null}
          </div>
          {action ? <div className="dash-card__action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </article>
  )
}

export function Legend({ items }) {
  return (
    <div className="dash-legend">
      {items.map((item) => (
        <span key={item.label} className="dash-legend__item">
          <span
            className={`dash-legend__dot${item.soft ? ' is-soft' : ''}`}
            style={item.color ? { background: item.color } : undefined}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function Chart({ data, xKey, series, label, height = 236, yFormat }) {
  const hasData = useMemo(
    () =>
      (data || []).some((row) =>
        series.some((item) => Number(row?.[item.key] || 0) > 0),
      ),
    [data, series],
  )

  if (!hasData) {
    return <div className="dash-chart dash-chart--empty">No activity recorded for this period.</div>
  }

  return (
    <div className="dash-chart" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 6, bottom: 0, left: -20 }} barGap={4}>
          <CartesianGrid stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="#666666"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            dy={4}
          />
          <YAxis
            stroke="#666666"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={yFormat ? 56 : 44}
            tickFormatter={yFormat}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color: '#f5f5f5', fontSize: 12 }}
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            formatter={(value, name) => {
              const item = series.find((entry) => entry.name === name)

              return item?.format ? item.format(value) : value
            }}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={item.fill}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Insight({ children }) {
  return (
    <div className="dash-ai">
      <Sparkles size={15} className="dash-ai__icon" aria-hidden="true" />
      <p className="dash-ai__text">{children}</p>
      <Settings2 size={13} className="dash-ai__gear" aria-hidden="true" />
    </div>
  )
}

export function Breakdown({ items, formatValue = number, max }) {
  const peak = max ?? Math.max(...items.map((item) => Number(item.value) || 0), 1)

  return (
    <div className="dash-breakdown">
      {items.map((item) => (
        <div className="dash-breakdown__row" key={item.label}>
          <span className="dash-breakdown__label" title={item.label}>
            {item.label}
          </span>
          <span className="dash-breakdown__track" aria-hidden="true">
            <span
              className="dash-breakdown__fill"
              style={{ width: `${Math.max(3, ((Number(item.value) || 0) / peak) * 100)}%` }}
            />
          </span>
          <span className="dash-breakdown__value">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function statusTone(status) {
  return STATUS_TONES[String(status || '').toLowerCase()] || 'info'
}

export function StatusPill({ status, label }) {
  return (
    <span className={`dash-pill dash-pill--${statusTone(status)}`}>
      <span className="dash-pill__dot" aria-hidden="true" />
      {label || humanizeStatus(status)}
    </span>
  )
}

export function Notice({ tone = 'info', title, children }) {
  return (
    <div className={`dash-notice dash-notice--${tone}`} role="status">
      {title ? <strong className="dash-notice__title">{title}</strong> : null}
      <span className="dash-notice__text">{children}</span>
    </div>
  )
}

export function TableCard({
  title,
  subtitle,
  action,
  toolbar,
  columns,
  rows,
  loading = false,
  emptyMessage = 'No records found.',
  caption,
  selectable = false,
  rowAction,
  className = '',
}) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const rowId = (row, index) => row?.id ?? row?.reference_number ?? index
  const allSelected =
    Boolean(rows?.length) && rows.every((row, index) => selected.includes(rowId(row, index)))

  const toggleAll = () => {
    setSelected(allSelected ? [] : (rows || []).map((row, index) => rowId(row, index)))
  }

  const toggleOne = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  const showToolbar = title || action || toolbar

  return (
    <section className={`dash-table-card ${className}`.trim()} aria-label={title}>
      {showToolbar ? (
        <div className="dash-toolbar">
          <div className="dash-toolbar__left">
            {title ? <h2 className="dash-card__title">{title}</h2> : null}
            {subtitle ? <p className="dash-card__sub">{subtitle}</p> : null}
            {selectable && selected.length > 0 ? (
              <span className="dash-selcount">{selected.length} selected</span>
            ) : null}
          </div>
          <div className="dash-toolbar__right">
            {toolbar}
            {action}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="dash-table__loading" role="status" aria-live="polite">
          <Loader2 size={16} className="dash-spin" aria-hidden="true" />
          Loading records…
        </div>
      ) : !rows?.length ? (
        <p className="dash-empty">{emptyMessage}</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            {caption ? <caption className="dash-visually-hidden">{caption}</caption> : null}
            <thead>
              <tr>
                {selectable ? (
                  <th scope="col" className="dash-table__check">
                    <input
                      type="checkbox"
                      className="dash-check"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? 'Clear selection' : 'Select all rows'}
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.align === 'right' ? 'dash-table__right' : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    title={column.title}
                  >
                    {column.label}
                  </th>
                ))}
                {rowAction ? (
                  <th scope="col" className="dash-table__action">
                    <span className="dash-visually-hidden">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const id = rowId(row, index)
                const isSelected = selected.includes(id)
                const className = [isSelected ? 'is-selected' : '', row.to ? 'is-clickable' : '']
                  .filter(Boolean)
                  .join(' ')

                return (
                  <tr
                    key={id}
                    className={className || undefined}
                    onClick={
                      row.to
                        ? (event) => {
                            if (event.target.closest('a, button, input, label')) {
                              return
                            }

                            navigate(row.to)
                          }
                        : undefined
                    }
                  >
                    {selectable ? (
                      <td className="dash-table__check">
                        <input
                          type="checkbox"
                          className="dash-check"
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select ${row.reference_number || id}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          column.align === 'right' ? 'dash-table__right' : '',
                          column.className || '',
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined}
                      >
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                    {rowAction ? <td className="dash-table__action">{rowAction(row)}</td> : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
