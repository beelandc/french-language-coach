/**
 * Tests for MetricsCostLatencyChart (Issue #237).
 */

import { render, screen } from '@testing-library/react'
import MetricsCostLatencyChart from './MetricsCostLatencyChart'
import { sampleGroups } from './fixtures'
import type { LLMMetricsGroup } from '../../types/index'

describe('MetricsCostLatencyChart', () => {
  it('plots one point per priced group with tooltips and a legend', () => {
    render(<MetricsCostLatencyChart groups={sampleGroups} />)
    expect(screen.getByRole('img', { name: 'Cost per call versus p95 latency for 3 models' })).toBeInTheDocument()
    const points = screen.getAllByTestId('llm-metrics-scatter-point')
    expect(points).toHaveLength(3)
    // Sorted by series key, matching the line charts' colours
    expect(points[0].querySelector('title')?.textContent).toBe(
      'chat · anthropic:claude-sonnet-5-5: $0.00745 per call, p95 2.40 s (10 calls)'
    )
    expect(points[1].querySelector('title')?.textContent).toBe(
      'chat · mistral:mistral-large-latest: $0.00145 per call, p95 2.10 s (24 calls)'
    )
    expect(screen.getByText(/chat · anthropic:claude-sonnet-5-5: \$0\.00745\/call, p95 2\.40 s/)).toBeInTheDocument()
    expect(screen.queryByText(/not shown/)).not.toBeInTheDocument()
  })

  it('excludes groups without a price or latency and says so', () => {
    const unpriced: LLMMetricsGroup = { ...sampleGroups[0], model: 'unpriced', unpriced_calls: 24, estimated_cost_usd: 0 }
    const noLatency: LLMMetricsGroup = { ...sampleGroups[1], model: 'no-latency', latency_p95_ms: null }
    render(<MetricsCostLatencyChart groups={[sampleGroups[0], unpriced, noLatency]} />)
    expect(screen.getAllByTestId('llm-metrics-scatter-point')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Cost per call versus p95 latency for 1 model' })).toBeInTheDocument()
    expect(screen.getByText(/2 not shown \(no price or latency\)/)).toBeInTheDocument()
  })

  it('shows a message when nothing can be plotted', () => {
    const unpriced: LLMMetricsGroup = { ...sampleGroups[0], unpriced_calls: 24, estimated_cost_usd: 0 }
    render(<MetricsCostLatencyChart groups={[unpriced]} />)
    expect(screen.getByText('No models with both a price and a latency to compare.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
