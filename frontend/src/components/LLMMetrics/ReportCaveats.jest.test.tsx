/**
 * Tests for ReportCaveats (Issue #238).
 */

import { render, screen, within } from '@testing-library/react'
import ReportCaveats from './ReportCaveats'
import { sampleReportMetadata } from './fixtures'

describe('ReportCaveats', () => {
  it('shows notes, the sample-size rule and the latency basis', () => {
    render(<ReportCaveats metadata={sampleReportMetadata} />)
    const notes = screen.getByTestId('report-notes')
    expect(within(notes).getByText(/eval harness \(#231\)/)).toBeInTheDocument()
    expect(within(notes).getByText(/Live traffic is not a controlled comparison/)).toBeInTheDocument()
    expect(within(notes).getByText('Models with fewer than 20 calls are not ranked in the summaries.')).toBeInTheDocument()
    expect(within(notes).getByText('Latency and token averages use successful calls.')).toBeInTheDocument()
  })

  it('lists sample-size and unpriced warnings', () => {
    render(<ReportCaveats metadata={sampleReportMetadata} />)
    const warnings = screen.getByTestId('report-warnings')
    expect(within(warnings).getAllByRole('listitem')).toHaveLength(2)
    expect(warnings).toHaveTextContent('sample size 8 is below 20')
    expect(warnings).toHaveTextContent('have no price entry')
  })

  it('lists price check dates with source links', () => {
    render(<ReportCaveats metadata={sampleReportMetadata} />)
    const prices = screen.getByTestId('report-prices')
    expect(prices).toHaveTextContent('anthropic:claude-haiku-5-5: checked 2026-11-13')
    const link = within(prices).getByRole('link', { name: 'mistral.ai' })
    expect(link).toHaveAttribute('href', 'https://mistral.ai/pricing')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('says when there are no warnings or prices', () => {
    render(<ReportCaveats metadata={{ ...sampleReportMetadata, warnings: [], prices: [] }} />)
    expect(screen.getByTestId('report-warnings')).toHaveTextContent('No warnings.')
    expect(screen.getByTestId('report-prices')).toHaveTextContent('No price entries for these models.')
  })
})
