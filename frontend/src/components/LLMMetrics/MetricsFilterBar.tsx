/**
 * MetricsFilterBar: shared filters for the LLM metrics dashboard (Issue #237).
 *
 * Date range presets (or a custom UTC date range), feature, provider, model and
 * status. The parent owns the filter state (kept in the URL); this component
 * only reports changes through onChange.
 */

import { useState } from 'react'
import type { LLMCallStatus, LLMMetricsFilters, LLMMetricsRange } from '../../types/index'
import {
  DEFAULT_FILTERS,
  RANGE_OPTIONS,
  STATUS_OPTIONS,
  filtersToSearchParams,
  hasActiveFilters,
  isValidCustomRange,
  type FilterOptions,
} from './metricsUtils'

/** Props for MetricsFilterBar. */
export interface MetricsFilterBarProps {
  /** Current filters. */
  filters: LLMMetricsFilters
  /** Values available in the feature, provider and model dropdowns. */
  options: FilterOptions
  /** Called with the complete new filter state. */
  onChange: (filters: LLMMetricsFilters) => void
}

type TextFilter = 'feature' | 'provider' | 'model'

/** Options for a dropdown, keeping the selected value even if it isn't in the list. */
function withSelected(values: string[], selected?: string): string[] {
  return selected && !values.includes(selected) ? [...values, selected] : values
}

/** Copy of filters without custom dates. */
function withoutDates(filters: LLMMetricsFilters): LLMMetricsFilters {
  const next = { ...filters }
  delete next.dateFrom
  delete next.dateTo
  return next
}

function MetricsFilterBar({ filters, options, onChange }: MetricsFilterBarProps) {
  // Draft custom dates: only applied to the URL when the user clicks Apply
  const [customOpen, setCustomOpen] = useState(filters.range === 'custom')
  const [draftFrom, setDraftFrom] = useState(filters.dateFrom ?? '')
  const [draftTo, setDraftTo] = useState(filters.dateTo ?? '')
  // Re-sync drafts when the applied filters change (e.g. Clear filters, back/forward).
  // Compared by URL key, not identity, so a re-created but equal object is a no-op.
  const filtersKey = filtersToSearchParams(filters).toString()
  const [syncedKey, setSyncedKey] = useState(filtersKey)
  if (syncedKey !== filtersKey) {
    setSyncedKey(filtersKey)
    setCustomOpen(filters.range === 'custom')
    setDraftFrom(filters.dateFrom ?? '')
    setDraftTo(filters.dateTo ?? '')
  }

  const customValid = isValidCustomRange(draftFrom || undefined, draftTo || undefined)

  const handleRangeChange = (range: LLMMetricsRange) => {
    if (range === 'custom') {
      // Wait for Apply before changing the applied filters
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    onChange({ ...withoutDates(filters), range })
  }

  const handleApplyCustom = () => {
    if (!customValid) return
    onChange({
      ...withoutDates(filters),
      range: 'custom',
      ...(draftFrom ? { dateFrom: draftFrom } : {}),
      ...(draftTo ? { dateTo: draftTo } : {}),
    })
  }

  const handleTextChange = (key: TextFilter, value: string) => {
    const next = { ...filters }
    if (value) next[key] = value
    else delete next[key]
    onChange(next)
  }

  const handleStatusChange = (value: string) => {
    const next = { ...filters }
    if (value) next.status = value as LLMCallStatus
    else delete next.status
    onChange(next)
  }

  const textSelects: { key: TextFilter; label: string; values: string[] }[] = [
    { key: 'feature', label: 'Feature', values: options.features },
    { key: 'provider', label: 'Provider', values: options.providers },
    { key: 'model', label: 'Model', values: options.models },
  ]

  return (
    <form
      className="llm-metrics-filter-bar"
      data-testid="llm-metrics-filter-bar"
      aria-label="Metrics filters"
      onSubmit={(event) => {
        event.preventDefault()
        handleApplyCustom()
      }}
    >
      <div className="llm-metrics-filter">
        <label htmlFor="llm-metrics-range">Date range</label>
        <select
          id="llm-metrics-range"
          value={customOpen ? 'custom' : filters.range}
          onChange={(event) => handleRangeChange(event.target.value as LLMMetricsRange)}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {customOpen && (
        <div className="llm-metrics-filter-custom" data-testid="llm-metrics-custom-range">
          <div className="llm-metrics-filter">
            <label htmlFor="llm-metrics-date-from">From</label>
            <input
              id="llm-metrics-date-from"
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(event) => setDraftFrom(event.target.value)}
            />
          </div>
          <div className="llm-metrics-filter">
            <label htmlFor="llm-metrics-date-to">To</label>
            <input
              id="llm-metrics-date-to"
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(event) => setDraftTo(event.target.value)}
            />
          </div>
          <button type="submit" className="llm-metrics-button" disabled={!customValid}>
            Apply
          </button>
          <p className="llm-metrics-filter-hint">
            {customValid ? 'Dates are UTC days.' : 'The start date must be on or before the end date.'}
          </p>
        </div>
      )}

      {textSelects.map(({ key, label, values }) => (
        <div className="llm-metrics-filter" key={key}>
          <label htmlFor={`llm-metrics-${key}`}>{label}</label>
          <select
            id={`llm-metrics-${key}`}
            value={filters[key] ?? ''}
            onChange={(event) => handleTextChange(key, event.target.value)}
          >
            <option value="">All</option>
            {withSelected(values, filters[key]).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="llm-metrics-filter">
        <label htmlFor="llm-metrics-status">Status</label>
        <select
          id="llm-metrics-status"
          value={filters.status ?? ''}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters(filters) && (
        <button
          type="button"
          className="llm-metrics-button llm-metrics-button-secondary"
          onClick={() => onChange({ ...DEFAULT_FILTERS })}
        >
          Clear filters
        </button>
      )}
    </form>
  )
}

export default MetricsFilterBar
