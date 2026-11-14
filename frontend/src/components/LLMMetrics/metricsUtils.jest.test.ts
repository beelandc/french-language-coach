/**
 * Tests for the LLM metrics dashboard helpers (Issue #237).
 */

import {
  CHART_FRAME,
  DEFAULT_FILTERS,
  MIN_CHART_WIDTH,
  chartFrame,
  bucketForRange,
  buildLatencySeries,
  buildSeries,
  costPerCall,
  errorMessage,
  errorRate,
  filterOptions,
  filtersFromSearchParams,
  filtersToApiParams,
  filtersToSearchParams,
  formatBucket,
  formatCost,
  formatDateTime,
  formatLatency,
  formatNumber,
  formatPercent,
  formatPrice,
  hasActiveFilters,
  isDateOnly,
  isValidCustomRange,
  niceScale,
  niceStep,
  pageFromSearchParams,
  parseUtc,
  pickEvenly,
  safeDomain,
  scaleLinear,
  seriesColor,
  seriesKey,
  sourceLabel,
  SERIES_COLORS,
} from './metricsUtils'
import { sampleGroups, sampleTimeseries } from './fixtures'

const NOW = new Date('2026-11-14T08:00:00Z')

describe('filtersFromSearchParams', () => {
  it('defaults to all time with no filters', () => {
    expect(filtersFromSearchParams(new URLSearchParams(''))).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter', () => {
    const params = new URLSearchParams(
      'range=custom&date_from=2026-11-01&date_to=2026-11-07&feature=chat&provider=anthropic&model=claude-sonnet-5-5&status=error'
    )
    expect(filtersFromSearchParams(params)).toEqual({
      range: 'custom',
      dateFrom: '2026-11-01',
      dateTo: '2026-11-07',
      feature: 'chat',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      status: 'error',
    })
  })

  it('ignores unknown or malformed values', () => {
    expect(
      filtersFromSearchParams(new URLSearchParams('status=bogus&range=nope&feature=%20%20'))
    ).toEqual({ range: 'all' })
    expect(
      filtersFromSearchParams(new URLSearchParams('range=custom&date_from=2026-13-45&date_to=yesterday'))
    ).toEqual({ range: 'custom' })
  })

  it('ignores dates unless the range is custom', () => {
    expect(filtersFromSearchParams(new URLSearchParams('range=7d&date_from=2026-11-01'))).toEqual({
      range: '7d',
    })
  })
})

describe('filtersToSearchParams', () => {
  it('omits defaults', () => {
    expect(filtersToSearchParams({ range: 'all' }).toString()).toBe('')
    expect(filtersToSearchParams({ range: 'all', feature: 'chat' }).toString()).toBe('feature=chat')
  })

  it('round-trips through the URL', () => {
    const filters = {
      range: 'custom' as const,
      dateFrom: '2026-11-01',
      dateTo: '2026-11-07',
      provider: 'mistral',
      status: 'success' as const,
    }
    expect(filtersFromSearchParams(filtersToSearchParams(filters))).toEqual(filters)
  })

  it('drops custom dates for preset ranges', () => {
    expect(filtersToSearchParams({ range: '24h', dateFrom: '2026-11-01' }).toString()).toBe('range=24h')
  })
})

describe('hasActiveFilters', () => {
  it('is false only for the default view', () => {
    expect(hasActiveFilters({ range: 'all' })).toBe(false)
    expect(hasActiveFilters({ range: '7d' })).toBe(true)
    expect(hasActiveFilters({ range: 'all', model: 'x' })).toBe(true)
  })
})

describe('pageFromSearchParams', () => {
  it.each([
    ['', 1],
    ['page=3', 3],
    ['page=0', 1],
    ['page=-2', 1],
    ['page=abc', 1],
    ['page=2.5', 1],
  ])('%s -> %d', (query, expected) => {
    expect(pageFromSearchParams(new URLSearchParams(query))).toBe(expected)
  })
})

describe('filtersToApiParams', () => {
  it('resolves the 24h preset to an ISO date_from', () => {
    const filters = filtersFromSearchParams(new URLSearchParams('range=24h&provider=anthropic'))
    expect(filtersToApiParams(filters, NOW)).toEqual({
      date_from: '2026-11-13T08:00:00.000Z',
      provider: 'anthropic',
    })
  })

  it('resolves 7d and 30d presets', () => {
    expect(filtersToApiParams({ range: '7d' }, NOW)).toEqual({ date_from: '2026-11-07T08:00:00.000Z' })
    expect(filtersToApiParams({ range: '30d' }, NOW)).toEqual({ date_from: '2026-10-15T08:00:00.000Z' })
  })

  it('passes custom dates and other filters through', () => {
    expect(
      filtersToApiParams(
        { range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-07', feature: 'chat', model: 'm', status: 'error' },
        NOW
      )
    ).toEqual({ date_from: '2026-11-01', date_to: '2026-11-07', feature: 'chat', model: 'm', status: 'error' })
    expect(filtersToApiParams({ range: 'custom' }, NOW)).toEqual({})
  })

  it('sends no dates for all time', () => {
    expect(filtersToApiParams({ range: 'all' }, NOW)).toEqual({})
  })
})

describe('bucketForRange', () => {
  it('uses hours only for the last 24 hours', () => {
    expect(bucketForRange('24h')).toBe('hour')
    expect(bucketForRange('7d')).toBe('day')
    expect(bucketForRange('all')).toBe('day')
    expect(bucketForRange('custom')).toBe('day')
  })
})

describe('date validation', () => {
  it('isDateOnly accepts real calendar dates only', () => {
    expect(isDateOnly('2026-11-14')).toBe(true)
    expect(isDateOnly('2026-02-30')).toBe(false)
    expect(isDateOnly('2026-11-14T00:00:00')).toBe(false)
    expect(isDateOnly(null)).toBe(false)
    expect(isDateOnly(undefined)).toBe(false)
  })

  it('isValidCustomRange rejects from after to', () => {
    expect(isValidCustomRange('2026-11-01', '2026-11-07')).toBe(true)
    expect(isValidCustomRange('2026-11-07', '2026-11-07')).toBe(true)
    expect(isValidCustomRange('2026-11-08', '2026-11-07')).toBe(false)
    expect(isValidCustomRange('2026-11-08', undefined)).toBe(true)
    expect(isValidCustomRange(undefined, undefined)).toBe(true)
    expect(isValidCustomRange('bad', undefined)).toBe(false)
    expect(isValidCustomRange(undefined, 'bad')).toBe(false)
  })
})

describe('parseUtc and date formatting', () => {
  it('treats naive timestamps as UTC', () => {
    expect(parseUtc('2026-11-14T08:00:00').toISOString()).toBe('2026-11-14T08:00:00.000Z')
  })

  it('keeps explicit offsets', () => {
    expect(parseUtc('2026-11-14T08:00:00Z').toISOString()).toBe('2026-11-14T08:00:00.000Z')
    expect(parseUtc('2026-11-14T09:00:00+01:00').toISOString()).toBe('2026-11-14T08:00:00.000Z')
  })

  it('formatDateTime renders local time and handles missing or invalid values', () => {
    const expected = new Date('2026-11-14T08:15:30Z').toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    expect(formatDateTime('2026-11-14T08:15:30')).toBe(expected)
    expect(formatDateTime(null)).toBe('–')
    expect(formatDateTime('not a date')).toBe('–')
  })

  it('formatBucket labels UTC days and hours', () => {
    const date = new Date('2026-11-14T08:00:00Z')
    expect(formatBucket(date, 'day')).toBe('Nov 14')
    expect(formatBucket(date, 'hour')).toBe('Nov 14 08:00')
  })
})

describe('number formatting', () => {
  it.each([
    [12.5, '$12.50'],
    [0.0123, '$0.0123'],
    [0.000042, '$0.000042'],
    [0.0005, '$0.0005'],
    [0.004, '$0.004'],
    [0.00145, '$0.00145'],
    [0.0017636621, '$0.00176'],
    [1e-7, '$0.0000001'],
    [0, '$0.00'],
    [null, '–'],
    [undefined, '–'],
    [Number.NaN, '–'],
  ])('formatCost(%p) -> %s', (value, expected) => {
    expect(formatCost(value as number | null | undefined)).toBe(expected)
  })

  it('formatLatency switches from ms to s at one second', () => {
    expect(formatLatency(820)).toBe('820 ms')
    expect(formatLatency(2400)).toBe('2.40 s')
    expect(formatLatency(null)).toBe('–')
  })

  it('formatPercent and formatNumber', () => {
    expect(formatPercent(0.05)).toBe('5.0%')
    expect(formatPercent(null)).toBe('–')
    expect(formatNumber(84000)).toBe('84,000')
    expect(formatNumber(undefined)).toBe('–')
  })

  it('formatPrice', () => {
    expect(formatPrice(0.5)).toBe('$0.50')
    expect(formatPrice(0.01)).toBe('$0.01')
    expect(formatPrice(0.005)).toBe('$0.005')
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(10)).toBe('$10.00')
  })
})

describe('derived statistics', () => {
  it('errorRate is null without calls', () => {
    expect(errorRate({ calls: 40, errors: 2 })).toBeCloseTo(0.05)
    expect(errorRate({ calls: 0, errors: 0 })).toBeNull()
  })

  it('costPerCall ignores unpriced calls', () => {
    expect(costPerCall({ calls: 10, unpriced_calls: 2, estimated_cost_usd: 0.004 })).toBeCloseTo(0.0005)
    expect(costPerCall({ calls: 3, unpriced_calls: 3, estimated_cost_usd: 0 })).toBeNull()
  })
})

describe('series building', () => {
  it('seriesKey joins feature, provider and model', () => {
    expect(seriesKey(sampleGroups[0])).toBe('chat · mistral:mistral-large-latest')
  })

  it('buildSeries groups by feature/provider/model and sorts points by time', () => {
    const points = [...sampleTimeseries.points].reverse()
    const series = buildSeries(points, (p) => p.calls)
    expect(series.map((s) => s.key)).toEqual([
      'chat · anthropic:claude-sonnet-5-5',
      'chat · mistral:mistral-large-latest',
      'feedback · mistral:mistral-large-latest',
    ])
    const mistral = series[1]
    expect(mistral.points.map((p) => p.value)).toEqual([8, 10, 6])
    expect(mistral.points[0].time.toISOString()).toBe('2026-11-12T00:00:00.000Z')
  })

  it('buildSeries skips null values', () => {
    const points = [{ ...sampleTimeseries.points[0], latency_p50_ms: null }]
    expect(buildSeries(points, (p) => p.latency_p50_ms)).toEqual([])
  })

  it('buildLatencySeries pairs p50 and p95 with a shared colour', () => {
    const series = buildLatencySeries(sampleTimeseries.points)
    expect(series).toHaveLength(6)
    expect(series[0]).toMatchObject({ key: 'chat · anthropic:claude-sonnet-5-5 p50', colorIndex: 0 })
    expect(series[1]).toMatchObject({ key: 'chat · anthropic:claude-sonnet-5-5 p95', colorIndex: 0, dashed: true })
    expect(series[2].colorIndex).toBe(1)
  })

  it('buildLatencySeries skips groups without latency', () => {
    const points = [{ ...sampleTimeseries.points[0], latency_p50_ms: null, latency_p95_ms: null }]
    expect(buildLatencySeries(points)).toEqual([])
  })

  it('seriesColor cycles through the palette', () => {
    expect(seriesColor(0)).toBe(SERIES_COLORS[0])
    expect(seriesColor(SERIES_COLORS.length)).toBe(SERIES_COLORS[0])
  })
})

describe('filterOptions', () => {
  it('returns sorted unique values', () => {
    expect(filterOptions(sampleGroups)).toEqual({
      features: ['chat', 'feedback'],
      providers: ['anthropic', 'mistral'],
      models: ['claude-sonnet-5-5', 'mistral-large-latest'],
    })
    expect(filterOptions([])).toEqual({ features: [], providers: [], models: [] })
  })
})

describe('chart geometry', () => {
  it('safeDomain pads zero-width and non-finite domains', () => {
    expect(safeDomain(5, 5, 1)).toEqual([4, 6])
    expect(safeDomain(1, 3, 1)).toEqual([1, 3])
    expect(safeDomain(Number.NaN, 3, 1)).toEqual([0, 1])
  })

  it('scaleLinear maps domain to range and never divides by zero', () => {
    const scale = scaleLinear([0, 10], [0, 100])
    expect(scale(5)).toBe(50)
    expect(Number.isFinite(scaleLinear([2, 2], [0, 100])(2))).toBe(true)
  })

  it('niceStep rounds up to 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(6)).toBe(10)
    expect(niceStep(1.5)).toBe(2)
    expect(niceStep(2.2)).toBe(2.5)
    expect(niceStep(4)).toBe(5)
    expect(niceStep(0.0087)).toBeCloseTo(0.01)
    expect(niceStep(1)).toBe(1)
    expect(niceStep(0)).toBe(1)
    expect(niceStep(Number.NaN)).toBe(1)
  })

  it('niceScale gives round zero-based ticks covering the max', () => {
    expect(niceScale([10, 24])).toEqual({ domain: [0, 30], ticks: [0, 10, 20, 30] })
    expect(niceScale([2310])).toEqual({ domain: [0, 3000], ticks: [0, 1000, 2000, 3000] })
    expect(niceScale([0.0348])).toEqual({ domain: [0, 0.04], ticks: [0, 0.01, 0.02, 0.03, 0.04] })
    // Float noise doesn't add an extra step
    expect(niceScale([0.07]).domain[1]).toBe(0.08)
    expect(niceScale([0.07], 2).ticks).toEqual([0, 0.05, 0.1])
  })

  it('niceScale falls back for empty or all-zero input', () => {
    expect(niceScale([])).toEqual({ domain: [0, 1], ticks: [0, 0.5, 1] })
    expect(niceScale([0, 0])).toEqual({ domain: [0, 1], ticks: [0, 0.5, 1] })
  })

  it('chartFrame enforces a minimum width and shortens narrow charts', () => {
    expect(chartFrame(200).width).toBe(MIN_CHART_WIDTH)
    expect(chartFrame(320).height).toBe(220)
    expect(chartFrame(800).height).toBe(260)
    expect(chartFrame(800, 48).bottom).toBe(48)
  })

  it('pickEvenly keeps first and last', () => {
    expect(pickEvenly([1, 2, 3], 6)).toEqual([1, 2, 3])
    expect(pickEvenly([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)).toEqual([1, 4, 7, 10])
    expect(pickEvenly([1, 2, 3], 1)).toEqual([1])
  })

  it('CHART_FRAME has a positive drawing area', () => {
    expect(CHART_FRAME.width - CHART_FRAME.left - CHART_FRAME.right).toBeGreaterThan(0)
  })
})

describe('misc', () => {
  it('errorMessage handles Error and unknown values', () => {
    expect(errorMessage(new Error('HTTP error! status: 500'))).toBe('HTTP error! status: 500')
    expect(errorMessage('nope')).toMatch(/Something went wrong/)
    expect(errorMessage(new Error(''))).toMatch(/Something went wrong/)
  })

  it('sourceLabel shows the hostname', () => {
    expect(sourceLabel('https://mistral.ai/pricing')).toBe('mistral.ai')
    expect(sourceLabel('not a url')).toBe('not a url')
  })
})
