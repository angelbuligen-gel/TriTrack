import { useState } from 'react'

import { sdMetrics } from './data'
import { MetricCard } from './primitives'
import SaasCharts from './SaasCharts'
import SaasHeader from './SaasHeader'
import SaasSidebar from './SaasSidebar'
import SaasTable from './SaasTable'
import './saas-dashboard.css'

export default function SaasDashboard() {
  const [activeId, setActiveId] = useState('overview')

  return (
    <div className="sd-app">
      <SaasSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="sd-main">
        <SaasHeader />

        <div className="sd-content">
          <div>
            <h1 className="sd-page-title">Overview</h1>
            <p className="sd-page-sub">Franchise processing activity for November 2026.</p>
          </div>

          <section className="sd-metrics" aria-label="Key metrics">
            {sdMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </section>

          <SaasCharts />
          <SaasTable />
        </div>
      </div>
    </div>
  )
}
