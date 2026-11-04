import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Settings2, Sparkles } from 'lucide-react'

import { sdCurrentMonth, sdFees, sdVolume } from './data'

const tooltipStyle = {
  background: '#2a2a2a',
  border: '1px solid #3a3a3a',
  borderRadius: 8,
  fontSize: 12,
  color: '#f5f5f5',
  padding: '8px 10px',
}

export default function SaasCharts() {
  return (
    <section className="sd-grid12" aria-label="Analytics">
      <article className="sd-card sd-card--main">
        <header className="sd-card__head">
          <div>
            <h2 className="sd-card__title">Application volume</h2>
            <p className="sd-card__sub">Submitted versus approved, last eight months</p>
          </div>
          <div className="sd-legend">
            <span className="sd-legend__item">
              <span className="sd-legend__dot" aria-hidden="true" />
              Submitted
            </span>
            <span className="sd-legend__item">
              <span className="sd-legend__dot is-soft" aria-hidden="true" />
              Approved
            </span>
          </div>
        </header>

        <div className="sd-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sdVolume} margin={{ top: 16, right: 6, bottom: 0, left: -20 }} barGap={4}>
              <CartesianGrid stroke="#2a2a2a" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#666666"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                dy={4}
              />
              <YAxis stroke="#666666" tickLine={false} axisLine={false} fontSize={11} width={44} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}
                itemStyle={{ color: '#f5f5f5', fontSize: 12 }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <ReferenceLine
                x={sdCurrentMonth}
                stroke="#e8822a"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: 'Current month',
                  position: 'insideTopRight',
                  fill: '#e8822a',
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="submitted"
                name="Submitted"
                fill="#e8822a"
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Bar
                dataKey="approved"
                name="Approved"
                fill="rgba(232, 130, 42, 0.45)"
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="sd-card sd-card--side">
        <header className="sd-card__head">
          <div>
            <h2 className="sd-card__title">Revenue breakdown</h2>
            <p className="sd-card__sub">Assessed fees this month</p>
          </div>
        </header>

        <div className="sd-ai">
          <Sparkles size={15} className="sd-ai__icon" aria-hidden="true" />
          <p className="sd-ai__text">
            4 applications are missing an OR — nudge franchisees before the deadline.
          </p>
          <Settings2 size={13} className="sd-ai__gear" aria-hidden="true" />
        </div>

        <div className="sd-freq">
          {sdFees.map((fee) => (
            <div className="sd-freq__row" key={fee.label}>
              <span className="sd-freq__label">{fee.label}</span>
              <span className="sd-freq__track" aria-hidden="true">
                <span className="sd-freq__fill" style={{ width: `${fee.share}%` }} />
              </span>
              <span className="sd-freq__value">₱{fee.value}k</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
