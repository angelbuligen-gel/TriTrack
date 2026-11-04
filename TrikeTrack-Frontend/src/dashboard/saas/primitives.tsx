import { Info } from 'lucide-react'

import type { SdMetric, SdTone } from './data'

type SparklineProps = {
  values: number[]
  label: string
}

export function Sparkline({ values, label }: SparklineProps) {
  return (
    <div className="sd-spark" role="img" aria-label={`${label} trend`}>
      {values.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`sd-spark__bar${index < 2 ? ' is-dim' : ''}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

export function MetricCard({ metric }: { metric: SdMetric }) {
  const isUp = metric.delta >= 0

  return (
    <article className="sd-metric">
      <div className="sd-metric__top">
        <div>
          <p className="sd-metric__label">{metric.label}</p>
          <p className="sd-metric__value">{metric.value}</p>
        </div>
        <Sparkline values={metric.spark} label={metric.label} />
      </div>

      <p className="sd-metric__foot">
        <Info size={12} className="sd-metric__info" aria-hidden="true" />
        <span className={`sd-metric__delta ${isUp ? 'is-up' : 'is-down'}`}>
          {isUp ? '+' : '−'}
          {Math.abs(metric.delta).toFixed(1)}%
        </span>
        <span className="sd-metric__hint">vs. last month</span>
      </p>
    </article>
  )
}

export function StatusPill({ tone, label }: { tone: SdTone; label: string }) {
  return (
    <span className={`sd-pill sd-pill--${tone}`}>
      <span className="sd-pill__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
