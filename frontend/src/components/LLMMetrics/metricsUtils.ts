/**
 * Helpers for the admin LLM metrics dashboard (Issue #237).
 *
 * Pure functions only: URL <-> filter mapping, API parameter building,
 * formatting, and chart series construction. Kept next to the components
 * (not in utils/) so Jest coverage counts them.
 */

import type {
  LLMCallStatus,
  LLMMetricsApiParams,
  LLMMetricsFilters,
  LLMMetricsGroup,
  LLMMetricsRange,
  LLMMetricsStats,
  LLMTimeBucket,
  LLMTimeseriesPoint,
} from '../../types/index'

/** Date range choices shown in the filter bar, in display order. */
export const RANGE_OPTIONS: { value: LLMMetricsRange; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

/** Call status choices shown in the filter bar. */
export const STATUS_OPTIONS: { value: LLMCallStatus; label: string }[] = [
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
]

/** Filters used when the URL has none. */
export const DEFAULT_FILTERS: LLMMetricsFilters = { range: 'all' }

/** Number of calls per call-log page. */
export const CALL_LOG_PAGE_SIZE = 20

/** Message shown when no LLM call has ever been recorded. */
export const NO_CALLS_MESSAGE = 'No LLM calls recorded yet'

/** Message shown when calls exist but none match the filters. */
export const NO_MATCH_MESSAGE = 'No calls match these filters'

/** Placeholder for missing values. */
export const MISSING = '–'

/** Series colours, readable on a white background. */
export const SERIES_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4b5563',
]

const RANGE_HOURS: Record<'24h' | '7d' | '30d', number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

const RANGE_VALUES = RANGE_OPTIONS.map((option) => option.value)
const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value)
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i
const TEXT_FILTERS = ['feature', 'provider', 'model'] as const

/** Return the colour for a series index, cycling through the palette. */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}

/** Whether a string is a valid YYYY-MM-DD calendar date. */
export function isDateOnly(value: string | null | undefined): value is string {
  if (!value || !DATE_ONLY.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

/**
 * Read dashboard filters from the URL query string.
 *
 * Unknown values are ignored: an unknown range falls back to 'all', an unknown
 * status is dropped, and custom dates are kept only when they are YYYY-MM-DD.
 */
export function filtersFromSearchParams(params: URLSearchParams): LLMMetricsFilters {
  const rawRange = params.get('range') as LLMMetricsRange | null
  const range = rawRange && RANGE_VALUES.includes(rawRange) ? rawRange : DEFAULT_FILTERS.range
  const filters: LLMMetricsFilters = { range }

  if (range === 'custom') {
    const dateFrom = params.get('date_from')
    const dateTo = params.get('date_to')
    if (isDateOnly(dateFrom)) filters.dateFrom = dateFrom
    if (isDateOnly(dateTo)) filters.dateTo = dateTo
  }
  for (const key of TEXT_FILTERS) {
    const value = params.get(key)?.trim()
    if (value) filters[key] = value
  }
  const status = params.get('status') as LLMCallStatus | null
  if (status && STATUS_VALUES.includes(status)) filters.status = status
  return filters
}

/** Write filters to a query string, omitting defaults (so the default view has a clean URL). */
export function filtersToSearchParams(filters: LLMMetricsFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.range !== DEFAULT_FILTERS.range) params.set('range', filters.range)
  if (filters.range === 'custom') {
    if (filters.dateFrom) params.set('date_from', filters.dateFrom)
    if (filters.dateTo) params.set('date_to', filters.dateTo)
  }
  for (const key of TEXT_FILTERS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  if (filters.status) params.set('status', filters.status)
  return params
}

/** Read the call-log page from the URL; anything but an integer >= 1 means page 1. */
export function pageFromSearchParams(params: URLSearchParams): number {
  const raw = params.get('page')
  if (!raw || !/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return page >= 1 ? page : 1
}

/** Whether filters differ from the default view. */
export function hasActiveFilters(filters: LLMMetricsFilters): boolean {
  return filtersToSearchParams(filters).toString() !== ''
}

/**
 * Convert filters to API query parameters.
 *
 * Presets are relative to `now`: "last 7 days" becomes an ISO `date_from` seven
 * days before now (ending in "Z", so no '+' needs URL-encoding). Custom ranges
 * pass their YYYY-MM-DD dates through; the API treats them as whole UTC days.
 */
export function filtersToApiParams(filters: LLMMetricsFilters, now: Date): LLMMetricsApiParams {
  const params: LLMMetricsApiParams = {}
  if (filters.range === '24h' || filters.range === '7d' || filters.range === '30d') {
    const start = new Date(now.getTime() - RANGE_HOURS[filters.range] * 3600 * 1000)
    params.date_from = start.toISOString()
  } else if (filters.range === 'custom') {
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo
  }
  for (const key of TEXT_FILTERS) {
    const value = filters[key]
    if (value) params[key] = value
  }
  if (filters.status) params.status = filters.status
  return params
}

/** Time-series bucket for a range: hourly for the last 24 hours, daily otherwise. */
export function bucketForRange(range: LLMMetricsRange): LLMTimeBucket {
  return range === '24h' ? 'hour' : 'day'
}

/** Whether a custom range is usable: missing ends are allowed, but from must not be after to. */
export function isValidCustomRange(dateFrom?: string, dateTo?: string): boolean {
  if (dateFrom && !isDateOnly(dateFrom)) return false
  if (dateTo && !isDateOnly(dateTo)) return false
  if (dateFrom && dateTo) return dateFrom <= dateTo
  return true
}

/**
 * Parse an API datetime. The backend returns naive UTC strings
 * ("2026-11-14T08:00:00"); without a "Z", `new Date()` would read them as
 * local time, so one is appended when no offset is present.
 */
export function parseUtc(value: string): Date {
  return new Date(HAS_OFFSET.test(value) ? value : `${value}Z`)
}

/** Format an API datetime in the viewer's local time, e.g. "Nov 14, 2026, 08:00:05". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return MISSING
  const date = parseUtc(value)
  if (Number.isNaN(date.getTime())) return MISSING
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Label a time bucket in UTC (buckets are UTC hours or days), e.g. "Nov 14" or "Nov 14 08:00". */
export function formatBucket(date: Date, bucket: LLMTimeBucket): string {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (bucket === 'day') return day
  const hour = String(date.getUTCHours()).padStart(2, '0')
  return `${day} ${hour}:00`
}

/**
 * Format a USD amount with enough precision for sub-cent LLM costs:
 * 2 decimals from $1, 4 decimals from $0.01, otherwise 3 significant digits
 * (e.g. 0.00145 -> "$0.00145"), never in exponent notation.
 */
export function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return MISSING
  if (value === 0) return '$0.00'
  const abs = Math.abs(value)
  if (abs >= 1) return `$${value.toFixed(2)}`
  if (abs >= 0.01) return `$${value.toFixed(4)}`
  // Round to 3 significant digits, then print as a plain decimal and trim zeros
  const text = Number(value.toPrecision(3)).toFixed(10).replace(/0+$/, '').replace(/\.$/, '')
  return `$${text}`
}

/** Format a latency: "820 ms" below one second, "2.40 s" above. */
export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return MISSING
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** Format a ratio (0..1) as a percentage with one decimal, e.g. 0.05 -> "5.0%". */
export function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return MISSING
  return `${(ratio * 100).toFixed(1)}%`
}

/** Format an integer count with thousands separators. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return MISSING
  return value.toLocaleString('en-US')
}

/** Error rate (errors / calls), or null when there are no calls. */
export function errorRate(stats: Pick<LLMMetricsStats, 'calls' | 'errors'>): number | null {
  return stats.calls > 0 ? stats.errors / stats.calls : null
}

/**
 * Mean estimated cost per priced call, or null when no call has a price.
 * Unpriced calls are excluded because their cost is not in the total.
 */
export function costPerCall(
  stats: Pick<LLMMetricsStats, 'calls' | 'unpriced_calls' | 'estimated_cost_usd'>
): number | null {
  const priced = stats.calls - stats.unpriced_calls
  return priced > 0 ? stats.estimated_cost_usd / priced : null
}

/** Series label for a feature/provider/model group, e.g. "chat · mistral:mistral-large-latest". */
export function seriesKey(group: Pick<LLMMetricsGroup, 'feature' | 'provider' | 'model'>): string {
  return `${group.feature} · ${group.provider}:${group.model}`
}

/** One chart point. */
export interface SeriesPoint {
  time: Date
  value: number
}

/** One chart series (line). */
export interface ChartSeries {
  key: string
  points: SeriesPoint[]
  /** Draw the line dashed. */
  dashed?: boolean
  /** Palette index; defaults to the series position. */
  colorIndex?: number
}

/**
 * Group time-series points into one series per feature/provider/model.
 *
 * Latency percentiles can't be merged across groups, so series are never
 * re-aggregated. Points whose value is null are skipped; series are sorted by
 * key and their points by time.
 */
export function buildSeries(
  points: LLMTimeseriesPoint[],
  valueFn: (point: LLMTimeseriesPoint) => number | null,
  keySuffix = ''
): ChartSeries[] {
  const byKey = new Map<string, SeriesPoint[]>()
  for (const point of points) {
    const value = valueFn(point)
    if (value === null || value === undefined) continue
    const key = `${seriesKey(point)}${keySuffix}`
    const list = byKey.get(key) ?? []
    list.push({ time: parseUtc(point.bucket_start), value })
    byKey.set(key, list)
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      points: list.sort((a, b) => a.time.getTime() - b.time.getTime()),
    }))
}

/**
 * Latency series: p50 (solid) and p95 (dashed) per feature/provider/model,
 * sharing one colour per group so the pair reads together.
 */
export function buildLatencySeries(points: LLMTimeseriesPoint[]): ChartSeries[] {
  const p50 = buildSeries(points, (p) => p.latency_p50_ms, ' p50')
  const p95 = buildSeries(points, (p) => p.latency_p95_ms, ' p95')
  const baseKeys = [...new Set(points.map((p) => seriesKey(p)))].sort((a, b) => a.localeCompare(b))
  const result: ChartSeries[] = []
  baseKeys.forEach((base, colorIndex) => {
    const solid = p50.find((s) => s.key === `${base} p50`)
    const dashed = p95.find((s) => s.key === `${base} p95`)
    if (solid) result.push({ ...solid, colorIndex })
    if (dashed) result.push({ ...dashed, colorIndex, dashed: true })
  })
  return result
}

/** Distinct, sorted filter options from summary groups. */
export interface FilterOptions {
  features: string[]
  providers: string[]
  models: string[]
}

/** Collect the distinct features, providers and models seen in summary groups. */
export function filterOptions(groups: LLMMetricsGroup[]): FilterOptions {
  const unique = (values: string[]) => [...new Set(values)].sort()
  return {
    features: unique(groups.map((group) => group.feature)),
    providers: unique(groups.map((group) => group.provider)),
    models: unique(groups.map((group) => group.model)),
  }
}

/** Turn an unknown thrown value into a displayable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while loading this data.'
}

// ---------------------------------------------------------------------------
// Chart geometry (shared by the SVG charts)
// ---------------------------------------------------------------------------

/** Chart drawing area inside an SVG viewBox. */
export interface ChartFrame {
  width: number
  height: number
  left: number
  right: number
  top: number
  bottom: number
}

/** Smallest width a chart is drawn at; narrower containers scale it down. */
export const MIN_CHART_WIDTH = 280

/**
 * Frame for a chart drawn at `width` pixels (the container's real width, so
 * text keeps its size). Narrow (phone) charts are a little shorter.
 */
export function chartFrame(width: number, bottom = 40): ChartFrame {
  const w = Math.max(Math.round(width), MIN_CHART_WIDTH)
  return { width: w, height: w < 480 ? 220 : 260, left: 64, right: 16, top: 16, bottom }
}

/** Default frame (used until the container has been measured). */
export const CHART_FRAME: ChartFrame = chartFrame(640)

/**
 * Return a [min, max] domain that is never zero-width, so scales never divide
 * by zero (and SVG attributes never become NaN).
 */
export function safeDomain(min: number, max: number, pad: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) return [min - pad, max + pad]
  return [min, max]
}

/** Linear scale mapping a domain onto a pixel range. */
export function scaleLinear(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** Round a raw step up to 1, 2, 2.5 or 5 times a power of ten. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const base = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / base
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * base
}

/** A zero-based axis with round tick values. */
export interface NiceScale {
  domain: [number, number]
  ticks: number[]
}

/**
 * Zero-based axis covering `values` with about `targetTicks` round steps,
 * e.g. max 24 -> 0, 10, 20, 30. All-zero or empty input gives [0, 1].
 */
export function niceScale(values: number[], targetTicks = 4): NiceScale {
  const max = values.length ? Math.max(...values) : 0
  if (!(max > 0) || !Number.isFinite(max)) return { domain: [0, 1], ticks: [0, 0.5, 1] }
  const step = niceStep(max / targetTicks)
  // The small epsilon stops float noise (0.07 / 0.01 = 7.000000000000001) adding a step
  const count = Math.max(Math.ceil(max / step - 1e-9), 1)
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((i * step).toPrecision(12)))
  return { domain: [0, ticks[ticks.length - 1]], ticks }
}

/** Pick at most `max` items, evenly spread and always including the first and last. */
export function pickEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  if (max <= 1) return items.slice(0, 1)
  const step = (items.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)])
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** Format a per-million-token price: 0.5 -> "$0.50", 0.01 -> "$0.01", 0.005 -> "$0.005". */
export function formatPrice(value: number): string {
  if (value !== 0 && value < 0.01) return `$${value.toFixed(4).replace(/0+$/, '')}`
  return `$${value.toFixed(2)}`
}

/** Short label for a price source link: its hostname, or the raw text if it isn't a URL. */
export function sourceLabel(source: string): string {
  try {
    return new URL(source).hostname
  } catch {
    return source
  }
}
