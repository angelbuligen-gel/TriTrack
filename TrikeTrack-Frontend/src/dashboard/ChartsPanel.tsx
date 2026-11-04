import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ThemeMode } from './types'

type ChartsPanelProps = {
  theme: ThemeMode
}

const trendData = [
  { month: 'Jun', submitted: 42, approved: 31 },
  { month: 'Jul', submitted: 51, approved: 38 },
  { month: 'Aug', submitted: 47, approved: 40 },
  { month: 'Sep', submitted: 63, approved: 49 },
  { month: 'Oct', submitted: 58, approved: 52 },
  { month: 'Nov', submitted: 71, approved: 57 },
]

const collectionData = [
  { month: 'Jun', amount: 184000 },
  { month: 'Jul', amount: 213500 },
  { month: 'Aug', amount: 197800 },
  { month: 'Sep', amount: 246200 },
  { month: 'Oct', amount: 231400 },
  { month: 'Nov', amount: 268900 },
]

export default function ChartsPanel({ theme }: ChartsPanelProps) {
  const palette =
    theme === 'dark'
      ? {
          grid: 'rgba(255, 255, 255, 0.12)',
          axis: '#9fb2c9',
          accent: '#6ea3dd',
          gold: '#ffd266',
          tooltipBg: '#16263d',
          tooltipBorder: 'rgba(255, 255, 255, 0.14)',
          tooltipText: '#eef4fb',
        }
      : {
          grid: 'rgba(20, 43, 74, 0.1)',
          axis: '#64748b',
          accent: '#285a91',
          gold: '#e0b02c',
          tooltipBg: '#ffffff',
          tooltipBorder: 'rgba(20, 43, 74, 0.12)',
          tooltipText: '#1b2a41',
        }

  const tooltipStyle = {
    background: palette.tooltipBg,
    border: `1px solid ${palette.tooltipBorder}`,
    borderRadius: 12,
    color: palette.tooltipText,
    fontSize: 12,
  }

  return (
    <section className="tt-charts" aria-label="Charts">
      <article className="tt-card">
        <header className="tt-card__head">
          <h2 className="tt-card__title">Application volume</h2>
          <p className="tt-card__sub">Submitted versus approved, last six months</p>
        </header>
        <div className="tt-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="ttAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={palette.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} width={44} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: palette.grid }} />
              <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
              <Area
                type="monotone"
                dataKey="submitted"
                name="Submitted"
                stroke={palette.accent}
                strokeWidth={2}
                fill="url(#ttAreaFill)"
              />
              <Area
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke={palette.gold}
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="tt-card">
        <header className="tt-card__head">
          <h2 className="tt-card__title">Collections</h2>
          <p className="tt-card__sub">Monthly remittance in pesos</p>
        </header>
        <div className="tt-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={collectionData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                stroke={palette.axis}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={52}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: palette.grid }}
                formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Collections']}
              />
              <Bar dataKey="amount" name="Collections" fill={palette.accent} radius={[8, 8, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  )
}
