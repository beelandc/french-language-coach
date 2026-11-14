/**
 * Tests for MetricsSummaryCards (Issue #237).
 */

import { render, screen } from '@testing-library/react'
import MetricsSummaryCards from './MetricsSummaryCards'
import { emptySummary, sampleSummary } from './fixtures'

describe('MetricsSummaryCards', () => {
  it('shows the headline numbers', () => {
    render(
      <MetricsSummaryCards
        totals={{ ...sampleSummary.totals, estimated_cost_usd: 0.0123, unpriced_calls: 0, latency_p50_ms: 820, latency_p95_ms: 2400 }}
      />
    )
    expect(screen.getByTestId('llm-metrics-card-calls')).toHaveTextContent('Total calls40')
    expect(screen.getByTestId('llm-metrics-card-error-rate')).toHaveTextContent('5.0%')
    expect(screen.getByTestId('llm-metrics-card-error-rate')).toHaveTextContent('2 failed')
    expect(screen.getByTestId('llm-metrics-card-cost')).toHaveTextContent('$0.0123')
    expect(screen.getByTestId('llm-metrics-card-p50')).toHaveTextContent('820 ms')
    expect(screen.getByTestId('llm-metrics-card-p95')).toHaveTextContent('2.40 s')
    expect(screen.getByTestId('llm-metrics-card-unpriced')).toHaveTextContent('All calls priced')
    expect(screen.getByTestId('llm-metrics-card-unpriced')).not.toHaveClass('llm-metrics-card-warn')
  })

  it('highlights unpriced calls', () => {
    render(<MetricsSummaryCards totals={sampleSummary.totals} />)
    const card = screen.getByTestId('llm-metrics-card-unpriced')
    expect(card).toHaveClass('llm-metrics-card-warn')
    expect(card).toHaveTextContent('Not included in the cost')
  })

  it('shows placeholders when there are no calls', () => {
    render(<MetricsSummaryCards totals={emptySummary.totals} />)
    expect(screen.getByTestId('llm-metrics-card-error-rate')).toHaveTextContent('–')
    expect(screen.getByTestId('llm-metrics-card-p50')).toHaveTextContent('–')
    expect(screen.getByTestId('llm-metrics-card-cost')).toHaveTextContent('$0.00')
  })
})
