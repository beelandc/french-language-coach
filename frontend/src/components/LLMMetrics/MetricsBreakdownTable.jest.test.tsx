/**
 * Tests for MetricsBreakdownTable (Issue #237).
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import MetricsBreakdownTable from './MetricsBreakdownTable'
import { sampleGroups } from './fixtures'
import type { LLMMetricsGroup } from '../../types/index'

function rowKeys(): string[] {
  const rows = screen.getAllByRole('row').slice(1)
  return rows.map((row) => {
    const cells = within(row).getAllByRole('cell')
    return `${cells[0].textContent}/${cells[1].textContent}`
  })
}

function header(name: string) {
  return screen.getByRole('columnheader', { name })
}

describe('MetricsBreakdownTable', () => {
  it('renders one row per group with formatted values', () => {
    render(<MetricsBreakdownTable groups={sampleGroups} />)
    expect(screen.getAllByRole('row')).toHaveLength(4)
    const first = screen.getAllByRole('row')[1]
    const cells = within(first).getAllByRole('cell').map((c) => c.textContent)
    // Default sort: calls descending -> chat/mistral (24 calls) first
    expect(cells).toEqual([
      'chat',
      'mistral',
      'mistral-large-latest',
      '24',
      '1',
      '48,000',
      '7,200',
      '0',
      '$0.0348',
      '$0.00145',
      '820 ms',
      '2.10 s',
    ])
  })

  it('marks the active sort column', () => {
    render(<MetricsBreakdownTable groups={sampleGroups} />)
    expect(header('Calls')).toHaveAttribute('aria-sort', 'descending')
    expect(header('Feature')).toHaveAttribute('aria-sort', 'none')
  })

  it('sorts text columns A-Z first, then toggles', () => {
    render(<MetricsBreakdownTable groups={sampleGroups} />)
    fireEvent.click(within(header('Provider')).getByRole('button'))
    expect(header('Provider')).toHaveAttribute('aria-sort', 'ascending')
    expect(rowKeys()[0]).toBe('chat/anthropic')
    fireEvent.click(within(header('Provider')).getByRole('button'))
    expect(header('Provider')).toHaveAttribute('aria-sort', 'descending')
    expect(rowKeys()[2]).toBe('chat/anthropic')
  })

  it('sorts numeric columns largest first, then toggles', () => {
    render(<MetricsBreakdownTable groups={sampleGroups} />)
    fireEvent.click(within(header('p95')).getByRole('button'))
    expect(rowKeys()[0]).toBe('feedback/mistral')
    fireEvent.click(within(header('p95')).getByRole('button'))
    expect(rowKeys()[0]).toBe('chat/mistral')
  })

  it('sorts every column without errors', () => {
    render(<MetricsBreakdownTable groups={sampleGroups} />)
    for (const name of [
      'Feature',
      'Model',
      'Errors',
      'Input tokens',
      'Output tokens',
      'Cache-read tokens',
      'Cost',
      'Cost/call',
      'p50',
    ]) {
      fireEvent.click(within(header(name)).getByRole('button'))
      expect(header(name)).toHaveAttribute('aria-sort', expect.stringMatching(/ascending|descending/))
    }
  })

  it('puts missing values last in both directions', () => {
    const unpriced: LLMMetricsGroup = {
      ...sampleGroups[0],
      feature: 'eval',
      calls: 2,
      unpriced_calls: 2,
      estimated_cost_usd: 0,
      latency_p50_ms: null,
      latency_p95_ms: null,
    }
    const another: LLMMetricsGroup = { ...unpriced, feature: 'eval2' }
    render(<MetricsBreakdownTable groups={[unpriced, ...sampleGroups, another]} />)
    fireEvent.click(within(header('Cost/call')).getByRole('button'))
    expect(rowKeys().slice(-2)).toEqual(['eval/mistral', 'eval2/mistral'])
    fireEvent.click(within(header('Cost/call')).getByRole('button'))
    expect(rowKeys().slice(-2)).toEqual(['eval/mistral', 'eval2/mistral'])
    expect(screen.getAllByText('–').length).toBeGreaterThan(0)
  })
})
