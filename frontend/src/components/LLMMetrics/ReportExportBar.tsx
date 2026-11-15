/**
 * ReportExportBar: Markdown, CSV and PDF export buttons for the comparison
 * report (Issue #238). One export runs at a time; failures show an alert.
 */

import { useState } from 'react'
import type { LLMReportExportFormat } from '../../types/index'
import { errorMessage } from './metricsUtils'

/** Props for ReportExportBar. */
export interface ReportExportBarProps {
  /** Run an export; a rejected promise shows its message */
  onExport: (format: LLMReportExportFormat) => Promise<void>
  /** Disable all buttons (e.g. while the report is loading) */
  disabled?: boolean
}

const FORMATS: { format: LLMReportExportFormat; label: string }[] = [
  { format: 'markdown', label: 'Markdown' },
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' },
]

function ReportExportBar({ onExport, disabled = false }: ReportExportBarProps) {
  const [busy, setBusy] = useState<LLMReportExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (format: LLMReportExportFormat) => {
    setBusy(format)
    setError(null)
    try {
      await onExport(format)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="llm-report-export" data-testid="report-export-bar">
      <span className="llm-report-export-label">Export</span>
      <div className="llm-report-export-buttons">
        {FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            className="llm-metrics-button llm-metrics-button-secondary"
            data-testid={`report-export-${format}`}
            disabled={disabled || busy !== null}
            onClick={() => handleClick(format)}
          >
            {busy === format ? 'Exporting…' : label}
          </button>
        ))}
      </div>
      {error && (
        <p className="llm-report-export-error" role="alert">
          Export failed: {error}
        </p>
      )}
    </div>
  )
}

export default ReportExportBar
