/**
 * AdminMetricsPage: /admin/metrics (Issue #237).
 *
 * Thin page wrapper; the dashboard logic lives in components/LLMMetrics.
 */

import LLMMetricsDashboard from '../components/LLMMetrics/LLMMetricsDashboard'

function AdminMetricsPage() {
  return (
    <div className="llm-metrics-page" data-testid="admin-metrics-page">
      <h2>LLM metrics</h2>
      <p className="llm-metrics-intro">
        Calls, cost, latency and errors for every chat and feedback request sent to Mistral or Claude.
      </p>
      <p className="llm-metrics-admin-note">
        Admin page. There is no authentication until Phase 5, so anyone who can reach the app can see it.
      </p>
      <LLMMetricsDashboard />
    </div>
  )
}

export default AdminMetricsPage
