/**
 * Tests for ReportFeatureSection (Issue #238).
 */

import { render, screen, within } from '@testing-library/react'
import ReportFeatureSection from './ReportFeatureSection'
import { REPORT_METRICS } from './reportUtils'
import { noBaselineReport, sampleChatFeature, sampleFeedbackFeature, singleModelReport } from './fixtures'

const BASELINE = 'mistral:mistral-large-latest'

describe('ReportFeatureSection', () => {
  it('shows one column per model and one row per metric (AC1)', () => {
    render(<ReportFeatureSection feature={sampleFeedbackFeature} baseline={BASELINE} />)
    const section = screen.getByTestId('report-feature-feedback')
    expect(within(section).getByRole('heading', { name: 'Feedback' })).toBeInTheDocument()

    const headers = within(section).getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual([
      'Metric',
      'mistral:mistral-large-latestBaseline',
      'anthropic:claude-haiku-5-5',
      'anthropic:claude-sonnet-5-5',
    ])
    expect(within(section).getAllByRole('row')).toHaveLength(REPORT_METRICS.length + 1)
    for (const label of ['Sample size (calls)', 'Date range', 'Error rate', 'Refusals', 'Latency mean',
      'Latency p50', 'Latency p95', 'Mean input tokens per call', 'Mean output tokens per call',
      'Cost per call', 'Cost per 1,000 calls', 'Total cost', 'Unpriced calls']) {
      expect(within(section).getByRole('rowheader', { name: label })).toBeInTheDocument()
    }
    const cost = screen.getByTestId('report-metric-cost_per_1000')
    expect(cost).toHaveTextContent('$2.90')
    expect(cost).toHaveTextContent('$1.10')
    expect(screen.getByTestId('report-metric-calls')).toHaveTextContent('40')
  })

  it('colors deltas against the baseline as better or worse (AC2)', () => {
    render(<ReportFeatureSection feature={sampleFeedbackFeature} baseline={BASELINE} />)
    expect(screen.getByText('−62.1%')).toHaveClass('llm-report-delta-better')
    expect(screen.getByText('+41.4%')).toHaveClass('llm-report-delta-worse')
    expect(screen.getByText('+41.4%')).toHaveAttribute('title', 'Worse than the baseline')
    expect(screen.getByText('−2.5 pp')).toHaveClass('llm-report-delta-better')
    // Token deltas are neutral
    expect(screen.getByText('+14.8%')).toHaveClass('llm-report-delta-neutral')
    // The baseline column has no deltas
    const errorRow = screen.getByTestId('report-metric-error_rate')
    expect(within(errorRow).getAllByRole('cell')[0]).toHaveTextContent(/^2\.5%$/)
  })

  it('shows the summary (AC3)', () => {
    render(<ReportFeatureSection feature={sampleFeedbackFeature} baseline={BASELINE} />)
    expect(screen.getByTestId('report-summary-feedback')).toHaveTextContent(
      'anthropic:claude-sonnet-5-5 had the lowest p95 latency (3,100 ms)'
    )
  })

  it('shows the "not enough data" summary and missing costs', () => {
    render(<ReportFeatureSection feature={sampleChatFeature} baseline={BASELINE} />)
    expect(screen.getByTestId('report-summary-chat')).toHaveTextContent('Not enough data to name a winner')
    expect(screen.getByTestId('report-metric-cost_per_call')).toHaveTextContent('–')
  })

  it('explains how to record comparison data with a single model (AC6)', () => {
    render(<ReportFeatureSection feature={singleModelReport.features[0]} baseline={BASELINE} minSampleSize={30} />)
    const notice = screen.getByTestId('report-feature-empty-chat')
    expect(notice).toHaveTextContent('CHAT_PROVIDER')
    expect(notice).toHaveTextContent('CHAT_MODEL')
    expect(notice).toHaveTextContent('at least 30 calls')
    expect(screen.queryByTestId('report-summary-chat')).not.toBeInTheDocument()
    // The single model's metrics are still shown
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
  })

  it('says when the baseline has no calls', () => {
    render(<ReportFeatureSection feature={noBaselineReport.features[0]} baseline={BASELINE} />)
    expect(screen.getByTestId('report-no-baseline-feedback')).toHaveTextContent(
      'Baseline mistral:mistral-large-latest has no calls for this feature, so no deltas are shown.'
    )
    expect(document.querySelectorAll('.llm-report-delta')).toHaveLength(0)
  })
})
