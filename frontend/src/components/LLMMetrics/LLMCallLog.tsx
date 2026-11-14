/**
 * LLMCallLog: paginated table of individual LLM calls (Issue #237).
 *
 * Failed calls get a full-width row with their error message; calls tied to a
 * conversation session link to its detail page.
 */

import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import type { LLMCallLogItem, PaginationInfo } from '../../types/index'
import { formatCost, formatDateTime, formatLatency, formatNumber } from './metricsUtils'

/** Props for LLMCallLog. */
export interface LLMCallLogProps {
  /** Calls on the current page, newest first. */
  calls: LLMCallLogItem[]
  /** Pagination info from the API. */
  pagination: PaginationInfo
  /** Called with the page number to show. */
  onPageChange: (page: number) => void
}

const COLUMN_COUNT = 11

function LLMCallLog({ calls, pagination, onPageChange }: LLMCallLogProps) {
  const { page, total, total_pages: totalPages } = pagination

  if (calls.length === 0 && total > 0) {
    return (
      <div className="llm-metrics-call-log" data-testid="llm-metrics-call-log">
        <p className="llm-metrics-panel-empty">No calls on this page.</p>
        <button type="button" className="llm-metrics-button" onClick={() => onPageChange(1)}>
          Back to page 1
        </button>
      </div>
    )
  }

  return (
    <div className="llm-metrics-call-log" data-testid="llm-metrics-call-log">
      <div className="llm-metrics-table-wrapper">
        <table className="llm-metrics-table">
          <thead>
            <tr>
              <th scope="col">Time (local)</th>
              <th scope="col">Feature</th>
              <th scope="col">Provider</th>
              <th scope="col">Model</th>
              <th scope="col" className="llm-metrics-numeric">Input</th>
              <th scope="col" className="llm-metrics-numeric">Output</th>
              <th scope="col" className="llm-metrics-numeric">Cache read</th>
              <th scope="col" className="llm-metrics-numeric">Latency</th>
              <th scope="col" className="llm-metrics-numeric">Cost</th>
              <th scope="col">Status</th>
              <th scope="col">Session</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => {
              const failed = call.status === 'error'
              return (
                <Fragment key={call.id}>
                  <tr
                    className={failed ? 'llm-metrics-row-error' : undefined}
                    data-testid={`llm-metrics-call-${call.id}`}
                  >
                    <td className="llm-metrics-nowrap">{formatDateTime(call.created_at)}</td>
                    <td>{call.feature}</td>
                    <td>{call.provider}</td>
                    <td>{call.model}</td>
                    <td className="llm-metrics-numeric">{formatNumber(call.input_tokens)}</td>
                    <td className="llm-metrics-numeric">{formatNumber(call.output_tokens)}</td>
                    <td className="llm-metrics-numeric">{formatNumber(call.cache_read_tokens)}</td>
                    <td className="llm-metrics-numeric">{formatLatency(call.latency_ms)}</td>
                    <td className="llm-metrics-numeric">{formatCost(call.estimated_cost_usd)}</td>
                    <td>
                      <span className={`llm-metrics-badge llm-metrics-badge-${failed ? 'error' : 'ok'}`}>
                        {failed ? 'Error' : 'OK'}
                      </span>
                    </td>
                    <td>
                      {call.session_id !== null ? (
                        <Link to={`/sessions/${call.session_id}`}>#{call.session_id}</Link>
                      ) : (
                        <span aria-label="No session">—</span>
                      )}
                    </td>
                  </tr>
                  {failed && call.error_message && (
                    <tr className="llm-metrics-error-row">
                      <td colSpan={COLUMN_COUNT}>
                        <div className="llm-metrics-error-content">
                          <span className="llm-metrics-error-label">Error:</span>{' '}
                          <span className="llm-metrics-error-message">{call.error_message}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <nav className="llm-metrics-pagination" aria-label="Call log pages">
        <button
          type="button"
          className="llm-metrics-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span data-testid="llm-metrics-page-info">
          Page {page} of {Math.max(totalPages, 1)} ({formatNumber(total)} call{total === 1 ? '' : 's'})
        </span>
        <button
          type="button"
          className="llm-metrics-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  )
}

export default LLMCallLog
