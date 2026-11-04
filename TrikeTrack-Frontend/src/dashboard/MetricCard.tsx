import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import type { Metric } from './types'

type MetricCardProps = {
  metric: Metric
}

export default function MetricCard({ metric }: MetricCardProps) {
  const isPositive = metric.delta >= 0
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <article className="tt-metric">
      <p className="tt-metric__label">{metric.label}</p>
      <p className="tt-metric__value">{metric.value}</p>
      <p className={`tt-metric__delta${isPositive ? ' is-up' : ' is-down'}`}>
        <TrendIcon size={16} aria-hidden="true" />
        <span className="tt-metric__percent">
          {Math.abs(metric.delta).toFixed(1)}%
          <span className="tt-visually-hidden">
            {isPositive ? ' increase' : ' decrease'}
          </span>
        </span>
        <span className="tt-metric__hint">{metric.hint ?? 'vs. last period'}</span>
      </p>
    </article>
  )
}
