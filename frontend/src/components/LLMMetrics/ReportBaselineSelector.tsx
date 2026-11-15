/**
 * ReportBaselineSelector: pick the model the comparison report's deltas are
 * computed against (Issue #238). Values are "provider:model".
 */

/** Props for ReportBaselineSelector. */
export interface ReportBaselineSelectorProps {
  /** Current baseline ("provider:model") */
  value: string
  /** Choices ("provider:model"); should include `value` */
  options: string[]
  /** Called with the new baseline */
  onChange: (baseline: string) => void
  /** Disable while there is nothing to choose from */
  disabled?: boolean
}

function ReportBaselineSelector({ value, options, onChange, disabled = false }: ReportBaselineSelectorProps) {
  return (
    <div className="llm-metrics-filter">
      <label htmlFor="llm-report-baseline">Baseline model</label>
      <select
        id="llm-report-baseline"
        data-testid="report-baseline-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ReportBaselineSelector
