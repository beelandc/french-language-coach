/**
 * Sample LLM metrics data for stories and tests (Issues #237, #238).
 * Shapes match the #236 API; datetimes are naive UTC like the backend's.
 */

import type {
  LLMCallLogItem,
  LLMCallLogResponse,
  LLMMetricsGroup,
  LLMMetricsResponse,
  LLMPriceTable,
  LLMTimeseriesResponse,
  FeatureReport,
  ModelReport,
  ModelReportRow,
  ReportMetadata,
} from '../../types/index'

export const sampleGroups: LLMMetricsGroup[] = [
  {
    feature: 'chat',
    provider: 'mistral',
    model: 'mistral-large-latest',
    calls: 24,
    errors: 1,
    input_tokens: 48000,
    output_tokens: 7200,
    cache_read_tokens: 0,
    estimated_cost_usd: 0.0348,
    unpriced_calls: 0,
    latency_p50_ms: 820,
    latency_p95_ms: 2100,
  },
  {
    feature: 'chat',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    calls: 10,
    errors: 0,
    input_tokens: 21000,
    output_tokens: 3100,
    cache_read_tokens: 12000,
    estimated_cost_usd: 0.0745,
    unpriced_calls: 0,
    latency_p50_ms: 1150,
    latency_p95_ms: 2400,
  },
  {
    feature: 'feedback',
    provider: 'mistral',
    model: 'mistral-large-latest',
    calls: 6,
    errors: 1,
    input_tokens: 15000,
    output_tokens: 4200,
    cache_read_tokens: 0,
    estimated_cost_usd: 0.0138,
    unpriced_calls: 2,
    latency_p50_ms: 3200,
    latency_p95_ms: 5600,
  },
]

export const sampleSummary: LLMMetricsResponse = {
  totals: {
    calls: 40,
    errors: 2,
    input_tokens: 84000,
    output_tokens: 14500,
    cache_read_tokens: 12000,
    estimated_cost_usd: 0.1231,
    unpriced_calls: 2,
    latency_p50_ms: 980,
    latency_p95_ms: 4100,
  },
  groups: sampleGroups,
}

export const emptySummary: LLMMetricsResponse = {
  totals: {
    calls: 0,
    errors: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    estimated_cost_usd: 0,
    unpriced_calls: 0,
    latency_p50_ms: null,
    latency_p95_ms: null,
  },
  groups: [],
}

function point(
  bucketStart: string,
  group: LLMMetricsGroup,
  calls: number,
  cost: number,
  p50: number,
  p95: number
) {
  return {
    ...group,
    bucket_start: bucketStart,
    calls,
    errors: 0,
    estimated_cost_usd: cost,
    latency_p50_ms: p50,
    latency_p95_ms: p95,
  }
}

export const sampleTimeseries: LLMTimeseriesResponse = {
  bucket: 'day',
  points: [
    point('2026-11-12T00:00:00', sampleGroups[0], 8, 0.0116, 800, 1900),
    point('2026-11-13T00:00:00', sampleGroups[0], 10, 0.0145, 840, 2200),
    point('2026-11-14T00:00:00', sampleGroups[0], 6, 0.0087, 790, 2000),
    point('2026-11-13T00:00:00', sampleGroups[1], 4, 0.0298, 1100, 2300),
    point('2026-11-14T00:00:00', sampleGroups[1], 6, 0.0447, 1200, 2500),
    point('2026-11-14T00:00:00', sampleGroups[2], 6, 0.0138, 3200, 5600),
  ],
}

export const sampleCalls: LLMCallLogItem[] = [
  {
    id: 42,
    created_at: '2026-11-14T08:15:30',
    feature: 'chat',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    session_id: 12,
    input_tokens: 2100,
    output_tokens: 310,
    cache_read_tokens: 1200,
    latency_ms: 1150,
    estimated_cost_usd: 0.00745,
    status: 'success',
    error_message: null,
  },
  {
    id: 41,
    created_at: '2026-11-14T08:10:02',
    feature: 'feedback',
    provider: 'mistral',
    model: 'mistral-large-latest',
    session_id: 11,
    input_tokens: 2500,
    output_tokens: 0,
    cache_read_tokens: 0,
    latency_ms: 640,
    estimated_cost_usd: null,
    status: 'error',
    error_message: 'invalid_json: feedback response was not valid JSON',
  },
  {
    id: 40,
    created_at: '2026-11-14T07:59:47',
    feature: 'chat',
    provider: 'mistral',
    model: 'mistral-large-latest',
    session_id: null,
    input_tokens: 1980,
    output_tokens: 290,
    cache_read_tokens: 0,
    latency_ms: 790,
    estimated_cost_usd: 0.001425,
    status: 'success',
    error_message: null,
  },
]

export const sampleCallLog: LLMCallLogResponse = {
  calls: sampleCalls,
  pagination: { total: 45, page: 1, per_page: 20, total_pages: 3 },
}

export const emptyCallLog: LLMCallLogResponse = {
  calls: [],
  pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
}

export const samplePricing: LLMPriceTable = {
  currency: 'USD',
  unit: 'per_million_tokens',
  description: 'LLM prices used to estimate the cost of each call.',
  models: [
    {
      provider: 'mistral',
      model: 'mistral-large-latest',
      input_per_mtok: 0.5,
      output_per_mtok: 1.5,
      cache_read_per_mtok: 0.05,
      checked_on: '2026-11-13',
      source: 'https://mistral.ai/pricing',
      notes: "The pricing page lists 'Mistral Large' without a version.",
    },
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      input_per_mtok: 2,
      output_per_mtok: 10,
      cache_read_per_mtok: 0.1,
      checked_on: '2026-11-13',
      source: 'https://platform.claude.com/docs/en/about-claude/pricing',
    },
    {
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      input_per_mtok: 0.1,
      output_per_mtok: 0.5,
      cache_read_per_mtok: 0.01,
      long_context: {
        threshold_tokens: 100000,
        input_per_mtok: 0.2,
        output_per_mtok: 0.75,
        cache_read_per_mtok: 0.02,
      },
      checked_on: '2026-11-13',
      source: 'https://platform.claude.com/docs/en/about-claude/pricing',
    },
  ],
}

// ---------------------------------------------------------------------------
// Model comparison report (Issue #238)
// ---------------------------------------------------------------------------

/** Build a report row with sensible defaults. */
export function reportRow(overrides: Partial<ModelReportRow> = {}): ModelReportRow {
  return {
    provider: 'mistral',
    model: 'mistral-large-latest',
    is_baseline: false,
    calls: 40,
    successful_calls: 40,
    errors: 0,
    error_rate: 0,
    refusals: 0,
    latency_mean_ms: 2300,
    latency_p50_ms: 2100,
    latency_p95_ms: 4800,
    mean_input_tokens: 2400.5,
    mean_output_tokens: 610,
    priced_calls: 40,
    unpriced_calls: 0,
    mean_cost_per_call_usd: 0.0029,
    cost_per_1000_calls_usd: 2.9,
    total_cost_usd: 0.116,
    first_call_at: '2026-11-01T09:00:00',
    last_call_at: '2026-11-14T17:00:00',
    deltas: null,
    warnings: [],
    ...overrides,
  }
}

const feedbackMistral = reportRow({
  is_baseline: true,
  successful_calls: 39,
  errors: 1,
  error_rate: 0.025,
})

const feedbackHaiku = reportRow({
  provider: 'anthropic',
  model: 'claude-haiku-5-5',
  calls: 30,
  successful_calls: 30,
  latency_mean_ms: 1450,
  latency_p50_ms: 1300,
  latency_p95_ms: 3900,
  mean_input_tokens: 2550,
  mean_output_tokens: 540,
  priced_calls: 30,
  mean_cost_per_call_usd: 0.0011,
  cost_per_1000_calls_usd: 1.1,
  total_cost_usd: 0.033,
  first_call_at: '2026-11-05T10:00:00',
  deltas: {
    latency_mean_pct: -37,
    latency_p50_pct: -38.1,
    latency_p95_pct: -18.8,
    mean_input_tokens_pct: 6.2,
    mean_output_tokens_pct: -11.5,
    mean_cost_per_call_pct: -62.1,
    error_rate_pp: -2.5,
  },
})

const feedbackSonnet = reportRow({
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  calls: 25,
  successful_calls: 24,
  errors: 1,
  error_rate: 0.04,
  refusals: 1,
  latency_mean_ms: 1700,
  latency_p50_ms: 1600,
  latency_p95_ms: 3100,
  mean_input_tokens: 2550,
  mean_output_tokens: 700,
  priced_calls: 25,
  mean_cost_per_call_usd: 0.0041,
  cost_per_1000_calls_usd: 4.1,
  total_cost_usd: 0.1025,
  first_call_at: '2026-11-06T10:00:00',
  deltas: {
    latency_mean_pct: -26.1,
    latency_p50_pct: -23.8,
    latency_p95_pct: -35.4,
    mean_input_tokens_pct: 6.2,
    mean_output_tokens_pct: 14.8,
    mean_cost_per_call_pct: 41.4,
    error_rate_pp: 1.5,
  },
})

export const sampleFeedbackFeature: FeatureReport = {
  feature: 'feedback',
  baseline_present: true,
  first_call_at: '2026-11-01T09:00:00',
  last_call_at: '2026-11-14T17:00:00',
  rows: [feedbackMistral, feedbackHaiku, feedbackSonnet],
  summary: {
    text:
      'For feedback, anthropic:claude-haiku-5-5 had the lowest cost per 1,000 calls ($1.10); ' +
      'anthropic:claude-haiku-5-5 had the lowest p50 latency (1,300 ms); ' +
      'anthropic:claude-sonnet-5-5 had the lowest p95 latency (3,100 ms); ' +
      'anthropic:claude-haiku-5-5 had the lowest error rate (0.0%).',
    compared_models: ['mistral:mistral-large-latest', 'anthropic:claude-haiku-5-5', 'anthropic:claude-sonnet-5-5'],
    excluded_models: [],
    cheapest: ['anthropic:claude-haiku-5-5'],
    fastest_p50: ['anthropic:claude-haiku-5-5'],
    fastest_p95: ['anthropic:claude-sonnet-5-5'],
    most_reliable: ['anthropic:claude-haiku-5-5'],
  },
}

export const sampleChatFeature: FeatureReport = {
  feature: 'chat',
  baseline_present: true,
  first_call_at: '2026-11-01T09:00:00',
  last_call_at: '2026-11-14T17:00:00',
  rows: [
    reportRow({ is_baseline: true, calls: 30, successful_calls: 30, latency_p50_ms: 820, latency_p95_ms: 2100 }),
    reportRow({
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      calls: 8,
      successful_calls: 8,
      priced_calls: 0,
      unpriced_calls: 8,
      mean_cost_per_call_usd: null,
      cost_per_1000_calls_usd: null,
      total_cost_usd: 0,
      deltas: {
        latency_mean_pct: -10,
        latency_p50_pct: 0,
        latency_p95_pct: 5,
        mean_input_tokens_pct: null,
        mean_output_tokens_pct: null,
        mean_cost_per_call_pct: null,
        error_rate_pp: 0,
      },
      warnings: ['anthropic:claude-haiku-5-5 (chat): sample size 8 is below 20'],
    }),
  ],
  summary: {
    text: 'Not enough data to name a winner for chat: anthropic:claude-haiku-5-5 has 8 calls (minimum 20 per model).',
    compared_models: ['mistral:mistral-large-latest'],
    excluded_models: ['anthropic:claude-haiku-5-5'],
    cheapest: [],
    fastest_p50: [],
    fastest_p95: [],
    most_reliable: [],
  },
}

export const sampleReportMetadata: ReportMetadata = {
  generated_at: '2026-11-14T18:08:05',
  baseline: 'mistral:mistral-large-latest',
  filters: { date_from: null, date_to: null, feature: null, provider: null, model: null, status: null },
  covered_from: '2026-11-01T09:00:00',
  covered_to: '2026-11-14T17:00:00',
  min_sample_size: 20,
  latency_basis: 'successful calls',
  prices: [
    {
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      checked_on: '2026-11-13',
      source: 'https://www.anthropic.com/pricing',
    },
    {
      provider: 'mistral',
      model: 'mistral-large-latest',
      checked_on: '2026-11-13',
      source: 'https://mistral.ai/pricing',
    },
  ],
  notes: [
    'Operational metrics only (latency, errors, tokens, cost). Feedback quality and accuracy come from the eval harness (#231).',
    'Live traffic is not a controlled comparison: models may have handled different conversations at different times. Compare within a feature and check each model\'s sample size and date range.',
  ],
  warnings: [
    'anthropic:claude-haiku-5-5 (chat): sample size 8 is below 20',
    'anthropic:claude-haiku-5-5 (chat): 8 of 8 calls have no price entry; cost figures exclude them',
  ],
}

export const sampleReport: ModelReport = {
  metadata: sampleReportMetadata,
  features: [sampleChatFeature, sampleFeedbackFeature],
}

export const singleModelReport: ModelReport = {
  metadata: { ...sampleReportMetadata, warnings: [], prices: [sampleReportMetadata.prices[1]] },
  features: [
    {
      feature: 'chat',
      baseline_present: true,
      first_call_at: '2026-11-01T09:00:00',
      last_call_at: '2026-11-14T17:00:00',
      rows: [reportRow({ is_baseline: true })],
      summary: null,
    },
  ],
}

export const noBaselineReport: ModelReport = {
  metadata: {
    ...sampleReportMetadata,
    warnings: ["Baseline mistral:mistral-large-latest has no calls for feature 'feedback'; no deltas computed"],
  },
  features: [
    {
      ...sampleFeedbackFeature,
      baseline_present: false,
      rows: [
        { ...feedbackHaiku, deltas: null },
        { ...feedbackSonnet, deltas: null },
      ],
    },
  ],
}

export const emptyReport: ModelReport = {
  metadata: { ...sampleReportMetadata, covered_from: null, covered_to: null, prices: [], warnings: [] },
  features: [],
}
