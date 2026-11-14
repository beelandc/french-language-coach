/**
 * Tests for LLMPricingPanel (Issue #237).
 */

import { render, screen, within } from '@testing-library/react'
import LLMPricingPanel from './LLMPricingPanel'
import { samplePricing } from './fixtures'

describe('LLMPricingPanel', () => {
  it('lists each model with prices, check date and source link', () => {
    render(<LLMPricingPanel pricing={samplePricing} />)
    const row = screen.getByTestId('llm-metrics-price-mistral-large-latest')
    const cells = within(row).getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells[0]).toBe('mistral')
    expect(cells.slice(2, 6)).toEqual(['$0.50', '$1.50', '$0.05', '2026-11-13'])
    const link = within(row).getByRole('link')
    expect(link).toHaveAttribute('href', 'https://mistral.ai/pricing')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('mistral.ai')
    expect(within(row).getByText(/without a version/)).toBeInTheDocument()
    expect(screen.getByText(/Prices in USD per million tokens/)).toBeInTheDocument()
  })

  it('shows the long-context tier', () => {
    render(<LLMPricingPanel pricing={samplePricing} />)
    const row = screen.getByTestId('llm-metrics-price-claude-haiku-5-5')
    expect(row).toHaveTextContent('Over 100,000 tokens: in $0.20 / out $0.75 / cache read $0.02')
    expect(within(row).getAllByRole('cell')[4]).toHaveTextContent('$0.01')
  })

  it('handles an empty price table', () => {
    render(<LLMPricingPanel pricing={{ ...samplePricing, models: [] }} />)
    expect(screen.getByText('The price table has no entries.')).toBeInTheDocument()
  })
})
