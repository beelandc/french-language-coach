/**
 * Tests for MetricsFilterBar (Issue #237).
 */

import { fireEvent, render, screen } from '@testing-library/react'
import MetricsFilterBar from './MetricsFilterBar'
import type { LLMMetricsFilters } from '../../types/index'

const options = {
  features: ['chat', 'feedback'],
  providers: ['anthropic', 'mistral'],
  models: ['claude-sonnet-5-5', 'mistral-large-latest'],
}

function renderBar(filters: LLMMetricsFilters = { range: 'all' }) {
  const onChange = jest.fn()
  const utils = render(<MetricsFilterBar filters={filters} options={options} onChange={onChange} />)
  return { ...utils, onChange }
}

describe('MetricsFilterBar', () => {
  it('renders all filter controls with labels', () => {
    renderBar()
    for (const label of ['Date range', 'Feature', 'Provider', 'Model', 'Status']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('llm-metrics-custom-range')).not.toBeInTheDocument()
  })

  it('lists the available options', () => {
    renderBar()
    const provider = screen.getByLabelText('Provider') as HTMLSelectElement
    expect([...provider.options].map((o) => o.value)).toEqual(['', 'anthropic', 'mistral'])
  })

  it('reports a provider change', () => {
    const { onChange } = renderBar()
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } })
    expect(onChange).toHaveBeenCalledWith({ range: 'all', provider: 'anthropic' })
  })

  it('removes a text filter when All is chosen', () => {
    const { onChange } = renderBar({ range: 'all', feature: 'chat' })
    fireEvent.change(screen.getByLabelText('Feature'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ range: 'all' })
  })

  it('sets and clears the status filter', () => {
    const { onChange, rerender } = renderBar()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'error' } })
    expect(onChange).toHaveBeenLastCalledWith({ range: 'all', status: 'error' })
    rerender(<MetricsFilterBar filters={{ range: 'all', status: 'error' }} options={options} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith({ range: 'all' })
  })

  it('applies a preset range and drops custom dates', () => {
    const { onChange } = renderBar({ range: 'custom', dateFrom: '2026-11-01', provider: 'mistral' })
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '7d' } })
    expect(onChange).toHaveBeenCalledWith({ range: '7d', provider: 'mistral' })
  })

  it('opens the custom range without applying it until Apply', () => {
    const { onChange } = renderBar()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'custom' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('llm-metrics-custom-range')).toBeInTheDocument()
    expect(screen.getByText('Dates are UTC days.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-07' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith({ range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-07' })
  })

  it('allows an open-ended custom range', () => {
    const { onChange } = renderBar()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith({ range: 'custom', dateFrom: '2026-11-01' })
  })

  it('blocks an inverted custom range', () => {
    const { onChange } = renderBar()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-08' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-07' } })
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
    expect(screen.getByText('The start date must be on or before the end date.')).toBeInTheDocument()
    // Submitting the form (Enter key) is also a no-op
    fireEvent.submit(screen.getByTestId('llm-metrics-filter-bar'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes the custom range when switching back to a preset', () => {
    renderBar()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '24h' } })
    expect(screen.queryByTestId('llm-metrics-custom-range')).not.toBeInTheDocument()
  })

  it('shows applied custom dates', () => {
    renderBar({ range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-07' })
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-07')
    expect(screen.getByLabelText('Date range')).toHaveValue('custom')
  })

  it('keeps a selected value that is not in the options (e.g. from a bookmark)', () => {
    renderBar({ range: 'all', model: 'retired-model' })
    const model = screen.getByLabelText('Model') as HTMLSelectElement
    expect(model.value).toBe('retired-model')
    expect([...model.options].map((o) => o.value)).toContain('retired-model')
  })

  it('clears all filters', () => {
    const { onChange } = renderBar({ range: '7d', provider: 'mistral' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onChange).toHaveBeenCalledWith({ range: 'all' })
  })

  it('re-syncs draft dates when the applied filters change', () => {
    const onChange = jest.fn()
    const { rerender } = render(
      <MetricsFilterBar filters={{ range: 'custom', dateFrom: '2026-11-01' }} options={options} onChange={onChange} />
    )
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    rerender(<MetricsFilterBar filters={{ range: 'all' }} options={options} onChange={onChange} />)
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Date range')).toHaveValue('all')
  })
})
