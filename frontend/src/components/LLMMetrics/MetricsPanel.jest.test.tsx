/**
 * Tests for MetricsPanel (Issue #237): loading, error, empty and content states.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import MetricsPanel from './MetricsPanel'

describe('MetricsPanel', () => {
  it('renders the title and content', () => {
    render(
      <MetricsPanel title="Summary" testId="panel">
        <p>Content</p>
      </MetricsPanel>
    )
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByTestId('panel')).not.toHaveAttribute('aria-busy')
  })

  it('shows a loading indicator instead of content', () => {
    render(
      <MetricsPanel title="Summary" loading testId="panel">
        <p>Content</p>
      </MetricsPanel>
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    expect(screen.getByTestId('panel')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the error and calls onRetry', () => {
    const onRetry = jest.fn()
    render(
      <MetricsPanel title="Summary" error="HTTP error! status: 500" onRetry={onRetry}>
        <p>Content</p>
      </MetricsPanel>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP error! status: 500')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('omits Retry when no handler is given', () => {
    render(<MetricsPanel title="Summary" error="Failed" />)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('shows the empty message', () => {
    render(
      <MetricsPanel title="Summary" empty emptyMessage="No LLM calls recorded yet">
        <p>Content</p>
      </MetricsPanel>
    )
    expect(screen.getByText('No LLM calls recorded yet')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('uses a default empty message and extra class', () => {
    const { container } = render(<MetricsPanel title="X" empty className="extra" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveClass('llm-metrics-panel', 'extra')
  })
})
