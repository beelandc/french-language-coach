/**
 * Helpers for the model comparison report (Issue #238): URL state, report
 * request parameters, metric rows shared by the screen table and the PDF,
 * delta formatting, empty-state wording and file downloads.
 */

import type {
  FeatureReport,
  LLMMetricsFilters,
  LLMMetricsView,
  LLMReportApiParams,
  ModelReport,
  ModelReportDeltas,
  ModelReportRow,
} from '../../types/index'
import {
  filtersToApiParams,
  formatCost,
  formatDateTime,
  formatLatency,
  formatNumber,
  formatPercent,
  MISSING,
} from './metricsUtils'

/** Baseline used when the URL has none (matches the backend default). */
export const DEFAULT_BASELINE = 'mistral:mistral-large-latest'

/** Minimum calls per model before the summary ranks it (mirrors MIN_SAMPLE_SIZE). */
export const DEFAULT_MIN_SAMPLE_SIZE = 20

/** Report-wide empty state, shown when no calls match the filters. */
export const NO_REPORT_DATA_MESSAGE =
  'No LLM calls match these filters, so there is nothing to compare. Comparison data comes from ' +
  'running the app under different models: switch CHAT_PROVIDER / CHAT_MODEL or ' +
  'FEEDBACK_PROVIDER / FEEDBACK_MODEL for a period, then come back.'

/** Shown when provider, model or status filters are set (the report ignores them). */
export const IGNORED_FILTERS_MESSAGE =
  'The comparison report uses the date range and feature filters only. Provider, model and ' +
  'status filters apply to the dashboard.'

/** "provider:model" key for a report row. */
export function modelKey(row: Pick<ModelReportRow, 'provider' | 'model'>): string {
  return `${row.provider}:${row.model}`
}

/** Admin page view from the URL: "report" only for `view=report`. */
export function viewFromSearchParams(params: URLSearchParams): LLMMetricsView {
  return params.get('view') === 'report' ? 'report' : 'dashboard'
}

/** Baseline from the URL, or the default when missing or blank. */
export function baselineFromSearchParams(params: URLSearchParams): string {
  return params.get('baseline')?.trim() || DEFAULT_BASELINE
}

/**
 * Report request parameters: the dashboard's date range and feature only.
 * Provider, model and status would remove models from the comparison or skew
 * error rates, so they are not sent.
 */
export function reportApiParams(filters: LLMMetricsFilters, now: Date): LLMReportApiParams {
  const all = filtersToApiParams(filters, now)
  const params: LLMReportApiParams = {}
  if (all.date_from) params.date_from = all.date_from
  if (all.date_to) params.date_to = all.date_to
  if (all.feature) params.feature = all.feature
  return params
}

/** Stable request key for the report's filters (presets stay unresolved). */
export function reportFiltersKey(filters: LLMMetricsFilters): string {
  return JSON.stringify([filters.range, filters.dateFrom ?? '', filters.dateTo ?? '', filters.feature ?? ''])
}

/** Whether filters the report ignores (provider, model, status) are set. */
export function hasIgnoredReportFilters(filters: LLMMetricsFilters): boolean {
  return Boolean(filters.provider || filters.model || filters.status)
}

/** Baseline choices: every model in the report, the default, and the current value. */
export function baselineOptions(report: ModelReport | null, current: string): string[] {
  const keys = new Set<string>([DEFAULT_BASELINE, current])
  for (const feature of report?.features ?? []) {
    for (const row of feature.rows) keys.add(modelKey(row))
  }
  return [...keys].sort()
}

/** Which direction counts as better for a metric's delta. */
export type DeltaDirection = 'lower' | 'neutral'

/** Classification of a delta for coloring. */
export type DeltaClass = 'better' | 'worse' | 'neutral'

/** One metric row in the comparison table (screen and PDF). */
export interface ReportMetric {
  id: string
  label: string
  value: (row: ModelReportRow) => string
  delta?: keyof ModelReportDeltas
  unit?: '%' | 'pp'
  direction: DeltaDirection
}

/** Format a mean token count with at most one decimal. */
export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return MISSING
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Format a row's date range in the viewer's local time. */
export function formatRange(first: string | null, last: string | null): string {
  if (!first && !last) return MISSING
  return `${formatDateTime(first)} to ${formatDateTime(last)}`
}

/** Metric rows, in display order. Lower latency, cost and error rate are better. */
export const REPORT_METRICS: ReportMetric[] = [
  { id: 'calls', label: 'Sample size (calls)', value: (r) => formatNumber(r.calls), direction: 'neutral' },
  {
    id: 'range',
    label: 'Date range',
    value: (r) => formatRange(r.first_call_at, r.last_call_at),
    direction: 'neutral',
  },
  {
    id: 'error_rate',
    label: 'Error rate',
    value: (r) => formatPercent(r.error_rate),
    delta: 'error_rate_pp',
    unit: 'pp',
    direction: 'lower',
  },
  { id: 'refusals', label: 'Refusals', value: (r) => formatNumber(r.refusals), direction: 'neutral' },
  {
    id: 'latency_mean',
    label: 'Latency mean',
    value: (r) => formatLatency(r.latency_mean_ms),
    delta: 'latency_mean_pct',
    unit: '%',
    direction: 'lower',
  },
  {
    id: 'latency_p50',
    label: 'Latency p50',
    value: (r) => formatLatency(r.latency_p50_ms),
    delta: 'latency_p50_pct',
    unit: '%',
    direction: 'lower',
  },
  {
    id: 'latency_p95',
    label: 'Latency p95',
    value: (r) => formatLatency(r.latency_p95_ms),
    delta: 'latency_p95_pct',
    unit: '%',
    direction: 'lower',
  },
  {
    id: 'input_tokens',
    label: 'Mean input tokens per call',
    value: (r) => formatTokens(r.mean_input_tokens),
    delta: 'mean_input_tokens_pct',
    unit: '%',
    direction: 'neutral',
  },
  {
    id: 'output_tokens',
    label: 'Mean output tokens per call',
    value: (r) => formatTokens(r.mean_output_tokens),
    delta: 'mean_output_tokens_pct',
    unit: '%',
    direction: 'neutral',
  },
  {
    id: 'cost_per_call',
    label: 'Cost per call',
    value: (r) => formatCost(r.mean_cost_per_call_usd),
    delta: 'mean_cost_per_call_pct',
    unit: '%',
    direction: 'lower',
  },
  {
    id: 'cost_per_1000',
    label: 'Cost per 1,000 calls',
    value: (r) => formatCost(r.cost_per_1000_calls_usd),
    direction: 'neutral',
  },
  { id: 'total_cost', label: 'Total cost', value: (r) => formatCost(r.total_cost_usd), direction: 'neutral' },
  { id: 'unpriced', label: 'Unpriced calls', value: (r) => formatNumber(r.unpriced_calls), direction: 'neutral' },
]

/**
 * Format a delta: "+12.3%", "−62.1%", "+1.5 pp", or null when missing.
 * The screen uses a typographic minus (U+2212); `ascii` uses "-" (for the PDF).
 */
export function formatDelta(value: number | null | undefined, unit: '%' | 'pp', ascii = false): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const minus = ascii ? '-' : '\u2212'
  const sign = value > 0 ? '+' : value < 0 ? minus : ''
  const suffix = unit === 'pp' ? ' pp' : '%'
  return `${sign}${Math.abs(value).toFixed(1)}${suffix}`
}

/** Classify a delta: lower-is-better metrics are better below 0 and worse above. */
export function classifyDelta(value: number | null | undefined, direction: DeltaDirection): DeltaClass {
  if (direction === 'neutral' || value === null || value === undefined || value === 0) return 'neutral'
  return value < 0 ? 'better' : 'worse'
}

/** Delta for a metric and row, or null (baseline row, no baseline, missing value). */
export function metricDelta(metric: ReportMetric, row: ModelReportRow): number | null {
  if (!metric.delta || !row.deltas) return null
  return row.deltas[metric.delta]
}

/** Environment variables that pick the provider and model for a feature. */
export function envVarsForFeature(feature: string): { provider: string; model: string } {
  const prefix = feature.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return { provider: `${prefix}_PROVIDER`, model: `${prefix}_MODEL` }
}

/** Empty-state text for a feature with fewer than two models. */
export function singleModelMessage(feature: string, minSampleSize = DEFAULT_MIN_SAMPLE_SIZE): string {
  const env = envVarsForFeature(feature)
  return (
    `Only one model has ${feature} calls in this range, so there is nothing to compare yet. ` +
    `To compare, record ${feature} traffic under another model: set ${env.provider} and ` +
    `${env.model} in .env (e.g. ${env.provider}=anthropic, ${env.model}=claude-haiku-5-5), ` +
    `restart the backend and use the app. Each model needs at least ${minSampleSize} calls to be ranked.`
  )
}

/** Notice for a feature whose baseline model has no calls. */
export function missingBaselineMessage(baseline: string): string {
  return `Baseline ${baseline} has no calls for this feature, so no deltas are shown.`
}

/** Whether a feature has enough models to compare. */
export function isComparable(feature: FeatureReport): boolean {
  return feature.rows.length >= 2
}

/** Capitalised feature name for headings, e.g. "chat" -> "Chat". */
export function featureTitle(feature: string): string {
  return feature ? feature.charAt(0).toUpperCase() + feature.slice(1) : feature
}

/** PDF filename, matching the backend's naming: llm-model-report-YYYYMMDD-HHMM.pdf. */
export function pdfFilename(report: ModelReport): string {
  const match = report.metadata.generated_at.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return 'llm-model-report.pdf'
  const [, year, month, day, hour, minute] = match
  return `llm-model-report-${year}${month}${day}-${hour}${minute}.pdf`
}

/**
 * Make text safe for jsPDF's built-in fonts (Latin-1 only): dashes and minus
 * become "-", Greek delta becomes "delta ", comparison signs become ASCII, and
 * anything else outside Latin-1 becomes "?".
 */
export function toPdfText(text: string): string {
  return text
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\u0394/g, 'delta ')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u0100-\uFFFF]/g, '?')
}

/** Save a Blob as a file through a temporary download link. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
