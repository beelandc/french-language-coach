/**
 * MetricsPanel: shared section wrapper for the LLM metrics dashboard (Issue #237).
 *
 * Shows a heading plus exactly one of: a loading indicator, an error with an
 * optional Retry button, an empty-state message, or the panel content.
 */

import type { ReactNode } from 'react'

/** Props for MetricsPanel. */
export interface MetricsPanelProps {
  /** Panel heading. */
  title: string
  /** Show the loading indicator instead of content. */
  loading?: boolean
  /** Error message; shown instead of content when set. */
  error?: string | null
  /** Called when the user clicks Retry after an error. */
  onRetry?: () => void
  /** Show the empty message instead of content. */
  empty?: boolean
  /** Empty-state message. */
  emptyMessage?: string
  /** data-testid for the section element. */
  testId?: string
  /** Optional extra class on the section. */
  className?: string
  /** Panel content. */
  children?: ReactNode
}

function MetricsPanel({
  title,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyMessage = 'No data',
  testId,
  className,
  children,
}: MetricsPanelProps) {
  let body: ReactNode
  if (loading) {
    body = (
      <p className="llm-metrics-panel-status" role="status">
        Loading…
      </p>
    )
  } else if (error) {
    body = (
      <div className="llm-metrics-panel-error" role="alert">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="llm-metrics-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  } else if (empty) {
    body = <p className="llm-metrics-panel-empty">{emptyMessage}</p>
  } else {
    body = children
  }

  return (
    <section
      className={['llm-metrics-panel', className].filter(Boolean).join(' ')}
      data-testid={testId}
      aria-busy={loading || undefined}
    >
      <h3 className="llm-metrics-panel-title">{title}</h3>
      {body}
    </section>
  )
}

export default MetricsPanel
