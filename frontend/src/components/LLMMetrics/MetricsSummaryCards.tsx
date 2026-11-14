/**
 * MetricsSummaryCards: headline numbers for the LLM metrics dashboard (Issue #237).
 */

import type { LLMMetricsStats } from '../../types/index'
import { errorRate, formatCost, formatLatency, formatNumber, formatPercent } from './metricsUtils'

/** Props for MetricsSummaryCards. */
export interface MetricsSummaryCardsProps {
  /** Totals from GET /metrics/llm. */
  totals: LLMMetricsStats
}

interface Card {
  id: string
  label: string
  value: string
  hint?: string
  warn?: boolean
}

function MetricsSummaryCards({ totals }: MetricsSummaryCardsProps) {
  const cards: Card[] = [
    { id: 'calls', label: 'Total calls', value: formatNumber(totals.calls) },
    {
      id: 'error-rate',
      label: 'Error rate',
      value: formatPercent(errorRate(totals)),
      hint: `${formatNumber(totals.errors)} failed`,
    },
    {
      id: 'cost',
      label: 'Estimated cost',
      value: formatCost(totals.estimated_cost_usd),
      hint: 'USD, priced calls only',
    },
    { id: 'p50', label: 'p50 latency', value: formatLatency(totals.latency_p50_ms) },
    { id: 'p95', label: 'p95 latency', value: formatLatency(totals.latency_p95_ms) },
    {
      id: 'unpriced',
      label: 'Unpriced calls',
      value: formatNumber(totals.unpriced_calls),
      hint: totals.unpriced_calls > 0 ? 'Not included in the cost: add a price entry' : 'All calls priced',
      warn: totals.unpriced_calls > 0,
    },
  ]

  return (
    <ul className="llm-metrics-cards" data-testid="llm-metrics-summary-cards">
      {cards.map((card) => (
        <li
          key={card.id}
          className={`llm-metrics-card${card.warn ? ' llm-metrics-card-warn' : ''}`}
          data-testid={`llm-metrics-card-${card.id}`}
        >
          <span className="llm-metrics-card-label">{card.label}</span>
          <span className="llm-metrics-card-value">{card.value}</span>
          {card.hint && <span className="llm-metrics-card-hint">{card.hint}</span>}
        </li>
      ))}
    </ul>
  )
}

export default MetricsSummaryCards
