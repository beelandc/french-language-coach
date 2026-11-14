/// <reference types="cypress" />

// Cypress E2E: admin LLM metrics dashboard (Issue #237)
// Loads /admin/metrics with the metrics API stubbed, applies a filter, and
// checks the filter reaches the URL and the API requests.

describe('Admin LLM metrics dashboard', () => {
  const group = {
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
  }
  const claudeGroup = {
    ...group,
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    calls: 16,
    errors: 1,
    estimated_cost_usd: 0.0883,
    latency_p50_ms: 1150,
    latency_p95_ms: 2400,
  }
  const summary = {
    totals: { ...group, calls: 40, errors: 2, estimated_cost_usd: 0.1231 },
    groups: [group, claudeGroup],
  }
  const timeseries = {
    bucket: 'day',
    points: [
      { ...group, bucket_start: '2026-11-13T00:00:00', calls: 10 },
      { ...group, bucket_start: '2026-11-14T00:00:00', calls: 14 },
      { ...claudeGroup, bucket_start: '2026-11-14T00:00:00' },
    ],
  }
  const calls = {
    calls: [
      {
        id: 42,
        created_at: '2026-11-14T08:15:30',
        feature: 'chat',
        provider: 'anthropic',
        model: 'claude-sonnet-5-5',
        session_id: 12,
        input_tokens: 2100,
        output_tokens: 310,
        cache_read_tokens: 0,
        latency_ms: 1150,
        estimated_cost_usd: 0.00745,
        status: 'error',
        error_message: 'refusal: the model declined to answer',
      },
    ],
    pagination: { total: 1, page: 1, per_page: 20, total_pages: 1 },
  }
  const pricing = {
    currency: 'USD',
    unit: 'per_million_tokens',
    models: [
      {
        provider: 'mistral',
        model: 'mistral-large-latest',
        input_per_mtok: 0.5,
        output_per_mtok: 1.5,
        cache_read_per_mtok: 0.05,
        checked_on: '2026-11-13',
        source: 'https://mistral.ai/pricing',
      },
    ],
  }

  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/metrics/llm' }, { body: summary }).as('summary')
    cy.intercept({ method: 'GET', pathname: '/metrics/llm/timeseries' }, { body: timeseries }).as('timeseries')
    cy.intercept({ method: 'GET', pathname: '/metrics/llm/calls' }, { body: calls }).as('calls')
    cy.intercept({ method: 'GET', pathname: '/metrics/llm/pricing' }, { body: pricing }).as('pricing')
  })

  function waitForPanels() {
    cy.wait(['@summary', '@timeseries', '@calls', '@pricing'])
    cy.getByTestId('llm-metrics-summary-cards', { timeout: 10000 }).should('contain', '40')
    cy.getByTestId('llm-metrics-breakdown-table').should('contain', 'claude-sonnet-5-5')
    cy.getByTestId('llm-metrics-chart-calls').find('svg').should('exist')
    cy.getByTestId('llm-metrics-call-log').should('contain', 'refusal: the model declined to answer')
    cy.getByTestId('llm-metrics-pricing').should('contain', '2026-11-13')
  }

  it('loads the dashboard from the footer link and applies a filter', () => {
    cy.visit('/scenarios')
    cy.getByTestId('admin-metrics-link').click()
    cy.location('pathname').should('eq', '/admin/metrics')
    waitForPanels()
    cy.contains('a', '#12').should('have.attr', 'href', '/sessions/12')

    // Filtered requests get their own aliases: React StrictMode (dev) fires each
    // effect twice, so waiting on '@calls' again could yield an unfiltered request
    cy.intercept(
      { method: 'GET', pathname: '/metrics/llm/calls', query: { provider: 'anthropic' } },
      { body: calls }
    ).as('filteredCalls')
    cy.intercept(
      { method: 'GET', pathname: '/metrics/llm/timeseries', query: { provider: 'anthropic' } },
      { body: timeseries }
    ).as('filteredTimeseries')
    cy.intercept(
      { method: 'GET', pathname: '/metrics/llm', query: { provider: 'anthropic' } },
      { body: summary }
    ).as('filteredSummary')

    cy.get('#llm-metrics-provider').select('anthropic')

    cy.location('search').should('eq', '?provider=anthropic')
    cy.wait(['@filteredCalls', '@filteredTimeseries', '@filteredSummary'])
    cy.getByTestId('llm-metrics-call-log').should('exist')

    // The filter survives a reload (bookmarkable URL)
    cy.reload()
    cy.wait('@filteredCalls')
    cy.get('#llm-metrics-provider').should('have.value', 'anthropic')
  })

  it('fits a phone-width screen without horizontal page scroll', () => {
    cy.viewport('iphone-x')
    cy.visit('/admin/metrics')
    waitForPanels()
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
    })
  })
})
