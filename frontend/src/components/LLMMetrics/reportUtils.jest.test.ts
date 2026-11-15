/**
 * Tests for the comparison report helpers (Issue #238).
 */

import {
  DEFAULT_BASELINE,
  REPORT_METRICS,
  baselineFromSearchParams,
  baselineOptions,
  classifyDelta,
  envVarsForFeature,
  featureTitle,
  formatDelta,
  formatRange,
  formatTokens,
  hasIgnoredReportFilters,
  isComparable,
  metricDelta,
  missingBaselineMessage,
  modelKey,
  pdfFilename,
  reportApiParams,
  reportFiltersKey,
  saveBlob,
  singleModelMessage,
  toPdfText,
  viewFromSearchParams,
} from './reportUtils'
import { reportRow, sampleReport, singleModelReport } from './fixtures'

const NOW = new Date('2026-11-14T12:00:00Z')

describe('URL state', () => {
  it('reads the view', () => {
    expect(viewFromSearchParams(new URLSearchParams('view=report'))).toBe('report')
    expect(viewFromSearchParams(new URLSearchParams('view=other'))).toBe('dashboard')
    expect(viewFromSearchParams(new URLSearchParams(''))).toBe('dashboard')
  })

  it('reads the baseline with a default', () => {
    expect(baselineFromSearchParams(new URLSearchParams('baseline=anthropic:claude-haiku-5-5'))).toBe(
      'anthropic:claude-haiku-5-5'
    )
    expect(baselineFromSearchParams(new URLSearchParams('baseline=%20'))).toBe(DEFAULT_BASELINE)
    expect(baselineFromSearchParams(new URLSearchParams(''))).toBe(DEFAULT_BASELINE)
  })
})

describe('reportApiParams', () => {
  it('keeps only date range and feature', () => {
    expect(
      reportApiParams({ range: 'all', feature: 'chat', provider: 'mistral', model: 'm', status: 'error' }, NOW)
    ).toEqual({ feature: 'chat' })
  })

  it('resolves presets and passes custom dates', () => {
    expect(reportApiParams({ range: '24h' }, NOW)).toEqual({ date_from: '2026-11-13T12:00:00.000Z' })
    expect(reportApiParams({ range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-02' }, NOW)).toEqual({
      date_from: '2026-11-01',
      date_to: '2026-11-02',
    })
  })

  it('keys requests by unresolved filters, ignoring provider/model/status', () => {
    expect(reportFiltersKey({ range: '7d', provider: 'x' })).toBe(reportFiltersKey({ range: '7d' }))
    expect(reportFiltersKey({ range: '7d', feature: 'chat' })).not.toBe(reportFiltersKey({ range: '7d' }))
  })

  it('detects ignored filters', () => {
    expect(hasIgnoredReportFilters({ range: 'all' })).toBe(false)
    expect(hasIgnoredReportFilters({ range: 'all', feature: 'chat' })).toBe(false)
    expect(hasIgnoredReportFilters({ range: 'all', model: 'm' })).toBe(true)
    expect(hasIgnoredReportFilters({ range: 'all', status: 'success' })).toBe(true)
  })
})

describe('baselineOptions', () => {
  it('lists every model, the default and the current baseline, sorted', () => {
    expect(baselineOptions(sampleReport, 'zz:custom')).toEqual([
      'anthropic:claude-haiku-5-5',
      'anthropic:claude-sonnet-5-5',
      'mistral:mistral-large-latest',
      'zz:custom',
    ])
  })

  it('works before the report loads', () => {
    expect(baselineOptions(null, DEFAULT_BASELINE)).toEqual([DEFAULT_BASELINE])
  })
})

describe('deltas', () => {
  it('formats with sign and unit', () => {
    expect(formatDelta(-62.1, '%')).toBe('−62.1%')
    expect(formatDelta(-62.1, '%', true)).toBe('-62.1%')
    expect(formatDelta(1.5, 'pp', true)).toBe('+1.5 pp')
    expect(formatDelta(0, '%')).toBe('0.0%')
    expect(formatDelta(null, '%')).toBeNull()
    expect(formatDelta(undefined, 'pp')).toBeNull()
    expect(formatDelta(Number.NaN, '%')).toBeNull()
  })

  it('classifies by direction', () => {
    expect(classifyDelta(-62.1, 'lower')).toBe('better')
    expect(classifyDelta(41.4, 'lower')).toBe('worse')
    expect(classifyDelta(0, 'lower')).toBe('neutral')
    expect(classifyDelta(null, 'lower')).toBe('neutral')
    expect(classifyDelta(8, 'neutral')).toBe('neutral')
  })

  it('reads a metric delta from a row', () => {
    const cost = REPORT_METRICS.find((m) => m.id === 'cost_per_call')!
    const calls = REPORT_METRICS.find((m) => m.id === 'calls')!
    const haiku = sampleReport.features[1].rows[1]
    expect(metricDelta(cost, haiku)).toBe(-62.1)
    expect(metricDelta(calls, haiku)).toBeNull()
    expect(metricDelta(cost, sampleReport.features[1].rows[0])).toBeNull()
  })
})

describe('REPORT_METRICS', () => {
  it('formats every metric for a row', () => {
    const row = reportRow({ error_rate: 0.025, refusals: 2, unpriced_calls: 3 })
    const values = Object.fromEntries(REPORT_METRICS.map((m) => [m.id, m.value(row)]))
    expect(values).toMatchObject({
      calls: '40',
      error_rate: '2.5%',
      refusals: '2',
      latency_mean: '2.30 s',
      latency_p50: '2.10 s',
      latency_p95: '4.80 s',
      input_tokens: '2,400.5',
      output_tokens: '610',
      cost_per_call: '$0.0029',
      cost_per_1000: '$2.90',
      total_cost: '$0.1160',
      unpriced: '3',
    })
    expect(values.range).toContain(' to ')
  })

  it('formats missing values', () => {
    expect(formatTokens(null)).toBe('–')
    expect(formatRange(null, null)).toBe('–')
  })
})

describe('wording', () => {
  it('names the env vars per feature', () => {
    expect(envVarsForFeature('chat')).toEqual({ provider: 'CHAT_PROVIDER', model: 'CHAT_MODEL' })
    expect(envVarsForFeature('feedback')).toEqual({ provider: 'FEEDBACK_PROVIDER', model: 'FEEDBACK_MODEL' })
    expect(envVarsForFeature('quiz-gen')).toEqual({ provider: 'QUIZ_GEN_PROVIDER', model: 'QUIZ_GEN_MODEL' })
  })

  it('explains how to record comparison data', () => {
    const text = singleModelMessage('feedback')
    expect(text).toContain('Only one model has feedback calls')
    expect(text).toContain('FEEDBACK_PROVIDER=anthropic')
    expect(text).toContain('at least 20 calls')
  })

  it('has helpers for headings and notices', () => {
    expect(featureTitle('chat')).toBe('Chat')
    expect(featureTitle('')).toBe('')
    expect(missingBaselineMessage('a:b')).toBe('Baseline a:b has no calls for this feature, so no deltas are shown.')
    expect(modelKey({ provider: 'p', model: 'm' })).toBe('p:m')
    expect(isComparable(sampleReport.features[0])).toBe(true)
    expect(isComparable(singleModelReport.features[0])).toBe(false)
  })
})

describe('PDF helpers', () => {
  it('names the PDF like the backend names its downloads', () => {
    expect(pdfFilename(sampleReport)).toBe('llm-model-report-20261114-1808.pdf')
    expect(pdfFilename({ ...sampleReport, metadata: { ...sampleReport.metadata, generated_at: 'bad' } })).toBe(
      'llm-model-report.pdf'
    )
  })

  it('makes text Latin-1 safe', () => {
    expect(toPdfText('−62% – Δ ≥ ≤ ‘a’ “b” … café \u{1F600}')).toBe(
      '-62% - delta  >= <= \'a\' "b" ... café ??'
    )
  })
})

describe('saveBlob', () => {
  it('downloads through a temporary link', () => {
    const createObjectURL = jest.fn(() => 'blob:report')
    const revokeObjectURL = jest.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const blob = new Blob(['x'])
    saveBlob(blob, 'report.csv')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
