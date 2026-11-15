/**
 * MetricsViewTabs: switch between the dashboard and the comparison report on
 * /admin/metrics (Issue #238). The active view lives in the URL (`view=report`).
 */

import type { LLMMetricsView } from '../../types/index'

/** Props for MetricsViewTabs. */
export interface MetricsViewTabsProps {
  /** Active view */
  view: LLMMetricsView
  /** Called with the view the user picked */
  onChange: (view: LLMMetricsView) => void
}

const TABS: { view: LLMMetricsView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'report', label: 'Comparison report' },
]

function MetricsViewTabs({ view, onChange }: MetricsViewTabsProps) {
  return (
    <div className="llm-metrics-tabs" role="tablist" aria-label="Metrics views">
      {TABS.map((tab) => {
        const active = tab.view === view
        return (
          <button
            key={tab.view}
            type="button"
            role="tab"
            aria-selected={active}
            className={['llm-metrics-tab', active ? 'llm-metrics-tab-active' : ''].filter(Boolean).join(' ')}
            data-testid={`llm-metrics-tab-${tab.view}`}
            onClick={() => {
              if (!active) onChange(tab.view)
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default MetricsViewTabs
