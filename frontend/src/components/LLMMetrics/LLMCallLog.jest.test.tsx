/**
 * Tests for LLMCallLog (Issue #237): rows, errors, session links, pagination.
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LLMCallLog from './LLMCallLog'
import { sampleCallLog, sampleCalls } from './fixtures'
import type { LLMCallLogResponse } from '../../types/index'

function renderLog(data: LLMCallLogResponse = sampleCallLog) {
  const onPageChange = jest.fn()
  render(
    <MemoryRouter>
      <LLMCallLog calls={data.calls} pagination={data.pagination} onPageChange={onPageChange} />
    </MemoryRouter>
  )
  return onPageChange
}

describe('LLMCallLog', () => {
  it('renders one row per call with formatted values', () => {
    renderLog()
    const row = screen.getByTestId('llm-metrics-call-42')
    const cells = within(row).getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells.slice(1)).toEqual([
      'chat',
      'anthropic',
      'claude-sonnet-5-5',
      '2,100',
      '310',
      '1,200',
      '1.15 s',
      '$0.00745',
      'OK',
      '#12',
    ])
    expect(cells[0]).toMatch(/2026/)
  })

  it('links to the session when a session id is present', () => {
    renderLog()
    expect(screen.getByRole('link', { name: '#12' })).toHaveAttribute('href', '/sessions/12')
    const noSession = screen.getByTestId('llm-metrics-call-40')
    expect(within(noSession).queryByRole('link')).not.toBeInTheDocument()
    expect(within(noSession).getByLabelText('No session')).toHaveTextContent('—')
  })

  it('shows the error message for failed calls', () => {
    renderLog()
    const failed = screen.getByTestId('llm-metrics-call-41')
    expect(failed).toHaveClass('llm-metrics-row-error')
    expect(within(failed).getByText('Error')).toBeInTheDocument()
    expect(within(failed).getByText('–')).toBeInTheDocument() // no cost
    expect(screen.getByText('invalid_json: feedback response was not valid JSON')).toBeInTheDocument()
  })

  it('omits the error row when a failed call has no message', () => {
    renderLog({
      calls: [{ ...sampleCalls[1], error_message: null }],
      pagination: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByTestId('llm-metrics-page-info')).toHaveTextContent('Page 1 of 1 (1 call)')
  })

  it('paginates', () => {
    const onPageChange = renderLog()
    expect(screen.getByTestId('llm-metrics-page-info')).toHaveTextContent('Page 1 of 3 (45 calls)')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('goes back from the last page', () => {
    const onPageChange = renderLog({
      ...sampleCallLog,
      pagination: { total: 45, page: 3, per_page: 20, total_pages: 3 },
    })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('offers a way back from a page past the end', () => {
    const onPageChange = renderLog({
      calls: [],
      pagination: { total: 45, page: 9, per_page: 20, total_pages: 3 },
    })
    expect(screen.getByText('No calls on this page.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to page 1' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
