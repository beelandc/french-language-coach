/**
 * Tests for MetricsViewTabs (Issue #238).
 */

import { fireEvent, render, screen } from '@testing-library/react'
import MetricsViewTabs from './MetricsViewTabs'

describe('MetricsViewTabs', () => {
  it('marks the active tab', () => {
    render(<MetricsViewTabs view="report" onChange={jest.fn()} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comparison report' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Comparison report' })).toHaveClass('llm-metrics-tab-active')
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'false')
  })

  it('reports a switch to the other view', () => {
    const onChange = jest.fn()
    render(<MetricsViewTabs view="dashboard" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('llm-metrics-tab-report'))
    expect(onChange).toHaveBeenCalledWith('report')
  })

  it('ignores clicks on the active tab', () => {
    const onChange = jest.fn()
    render(<MetricsViewTabs view="dashboard" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('llm-metrics-tab-dashboard'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
