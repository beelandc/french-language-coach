/**
 * Sample LLM metrics data for stories and tests (Issue #237).
 * Shapes match the #236 API; datetimes are naive UTC like the backend's.
 */

import type {
  LLMCallLogItem,
  LLMCallLogResponse,
  LLMMetricsGroup,
  LLMMetricsResponse,
  LLMPriceTable,
  LLMTimeseriesResponse,
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
