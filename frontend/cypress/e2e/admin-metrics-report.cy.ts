/// <reference types="cypress" />

// Cypress E2E: model comparison report on /admin/metrics (Issue #238)
// Views the report with the metrics API stubbed, changes the baseline, and
// exports the CSV (checks the request parameters and the downloaded file).

describe('Admin LLM model comparison report', () => {
  const row = {
    provider: 'mistral',
    model: 'mistral-large-latest',
    is_baseline: true,
    calls: 40,
    successful_calls: 39,
    errors: 1,
    error_rate: 0.025,
    refusals: 0,
    latency_mean_ms: 2300,
    latency_p50_ms: 2100,
    latency_p95_ms: 4800,
    mean_input_tokens: 2400,
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
  }
  const haiku = {
    ...row,
    provider: 'anthropic',
    model: 'claude-haiku-5-5',
    is_baseline: false,
    calls: 30,
    successful_calls: 30,
    errors: 0,
    error_rate: 0,
    latency_p50_ms: 1300,
    latency_p95_ms: 3900,
    mean_cost_per_call_usd: 0.0011,
    cost_per_1000_calls_usd: 1.1,
    total_cost_usd: 0.033,
    deltas: {
      latency_mean_pct: -37,
      latency_p50_pct: -38.1,
      latency_p95_pct: -18.8,
      mean_input_tokens_pct: 0,
      mean_output_tokens_pct: 0,
      mean_cost_per_call_pct: -62.1,
      error_rate_pp: -2.5,
    },
  }
  const summaryText =
    'For feedback, anthropic:claude-haiku-5-5 had the lowest cost per 1,000 calls ($1.10); ' +
    'anthropic:claude-haiku-5-5 had the lowest p50 latency (1,300 ms); ' +
    'anthropic:claude-haiku-5-5 had the lowest p95 latency (3,900 ms); ' +
    'anthropic:claude-haiku-5-5 had the lowest error rate (0.0%).'
  const report = {
    metadata: {
      generated_at: '2026-11-14T18:08:05',
      baseline: 'mistral:mistral-large-latest',
      filters: { date_from: null, date_to: null, feature: null, provider: null, model: null, status: null },
      covered_from: '2026-11-01T09:00:00',
      covered_to: '2026-11-14T17:00:00',
      min_sample_size: 20,
      latency_basis: 'successful calls',
      prices: [
        { provider: 'mistral', model: 'mistral-large-latest', checked_on: '2026-11-13', source: 'https://mistral.ai/pricing' },
      ],
      notes: ['Live traffic is not a controlled comparison: models may have handled different conversations.'],
      warnings: [],
    },
    features: [
      {
        feature: 'chat',
        baseline_present: true,
        first_call_at: '2026-11-01T09:00:00',
        last_call_at: '2026-11-14T17:00:00',
        rows: [row],
        summary: null,
      },
      {
        feature: 'feedback',
        baseline_present: true,
        first_call_at: '2026-11-01T09:00:00',
        last_call_at: '2026-11-14T17:00:00',
        rows: [row, haiku],
        summary: {
          text: summaryText,
          compared_models: ['mistral:mistral-large-latest', 'anthropic:claude-haiku-5-5'],
          excluded_models: [],
          cheapest: ['anthropic:claude-haiku-5-5'],
          fastest_p50: ['anthropic:claude-haiku-5-5'],
          fastest_p95: ['anthropic:claude-haiku-5-5'],
          most_reliable: ['anthropic:claude-haiku-5-5'],
        },
      },
    ],
  }
  const summary = {
    totals: { calls: 70, errors: 1, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, estimated_cost_usd: 0.149, unpriced_calls: 0, latency_p50_ms: 1800, latency_p95_ms: 4500 },
    groups: [],
  }
  const csvFilename = 'llm-model-report-20261114-1808.csv'
  const csvBody =
    '# LLM model comparison report\n# Summary (feedback): ' + summaryText + '\nfeature,provider,model\nfeedback,mistral,mistral-large-latest\n'

  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/metrics/llm' }, { body: summary }).as('summary')
    cy.intercept({ method: 'GET', pathname: '/metrics/llm/report' }, { body: report }).as('report')
  })

  it('views the report, changes the baseline and exports the CSV', () => {
    cy.visit('/admin/metrics')
    cy.getByTestId('llm-metrics-tab-report', { timeout: 10000 }).click()
    cy.location('search').should('eq', '?view=report')
    cy.wait('@report').its('request.query.baseline').should('eq', 'mistral:mistral-large-latest')

    // Report content: summary, deltas, single-model empty state, caveats
    cy.getByTestId('report-summary-feedback').should('contain', 'had the lowest cost per 1,000 calls ($1.10)')
    cy.getByTestId('report-feature-feedback').find('.llm-report-delta-better').should('contain', '62.1%')
    cy.getByTestId('report-feature-empty-chat').should('contain', 'CHAT_PROVIDER')
    cy.getByTestId('report-caveats').should('contain', 'Live traffic is not a controlled comparison')
    cy.getByTestId('report-prices').should('contain', 'checked 2026-11-13')

    // Change the baseline: new request and URL
    cy.intercept(
      { method: 'GET', pathname: '/metrics/llm/report', query: { baseline: 'anthropic:claude-haiku-5-5' } },
      { body: { ...report, metadata: { ...report.metadata, baseline: 'anthropic:claude-haiku-5-5' } } }
    ).as('haikuReport')
    cy.getByTestId('report-baseline-select').select('anthropic:claude-haiku-5-5')
    cy.location('search').should('eq', '?view=report&baseline=anthropic%3Aclaude-haiku-5-5')
    cy.wait('@haikuReport')

    // Export CSV: same baseline as the on-screen report, file saved with the server's name
    cy.intercept(
      { method: 'GET', pathname: '/metrics/llm/report', query: { format: 'csv' } },
      {
        body: csvBody,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${csvFilename}"`,
        },
      }
    ).as('csv')
    cy.getByTestId('report-export-csv').click()
    cy.wait('@csv').its('request.query').should('deep.include', { baseline: 'anthropic:claude-haiku-5-5', format: 'csv' })
    cy.readFile(`${Cypress.config('downloadsFolder')}/${csvFilename}`, { timeout: 10000 }).should(
      'contain',
      '# LLM model comparison report'
    )
    cy.getByTestId('report-export-csv').should('not.be.disabled')
  })
})
