/**
 * LLMMetricsDashboard: container for the admin LLM metrics page (Issues #237, #238).
 *
 * The URL query string is the source of truth for filters, the call-log page,
 * the active view (`view=report` for the comparison report) and the report
 * baseline. Each panel loads its own data so one failing endpoint doesn't blank
 * the page, and responses for outdated filters are dropped. The dashboard
 * panels live in DashboardView so they only load in the dashboard view.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { metricsApi } from '../../utils/api'
import type { LLMMetricsFilters, LLMMetricsView } from '../../types/index'
import LLMCallLog from './LLMCallLog'
import LLMPricingPanel from './LLMPricingPanel'
import MetricsBreakdownTable from './MetricsBreakdownTable'
import MetricsCostLatencyChart from './MetricsCostLatencyChart'
import MetricsFilterBar from './MetricsFilterBar'
import MetricsLineChart from './MetricsLineChart'
import MetricsPanel from './MetricsPanel'
import MetricsSummaryCards from './MetricsSummaryCards'
import MetricsViewTabs from './MetricsViewTabs'
import ModelComparisonReport from './ModelComparisonReport'
import {
  CALL_LOG_PAGE_SIZE,
  NO_CALLS_MESSAGE,
  NO_MATCH_MESSAGE,
  bucketForRange,
  buildLatencySeries,
  buildSeries,
  filterOptions,
  filtersFromSearchParams,
  filtersToApiParams,
  filtersToSearchParams,
  formatCost,
  formatLatency,
  formatNumber,
  pageFromSearchParams,
} from './metricsUtils'
import { DEFAULT_BASELINE, baselineFromSearchParams, viewFromSearchParams } from './reportUtils'
import { useMetricsRequest } from './useMetricsRequest'

/** Props for DashboardView. */
interface DashboardViewProps {
  filters: LLMMetricsFilters
  page: number
  emptyMessage: string
  onPageChange: (page: number) => void
}

/** The dashboard panels (summary, breakdown, trends, cost/latency, call log, pricing). */
function DashboardView({ filters, page, emptyMessage, onPageChange }: DashboardViewProps) {
  const filtersKey = filtersToSearchParams(filters).toString()
  const bucket = bucketForRange(filters.range)

  // Presets are resolved against "now" when each request starts (inside load)
  const summary = useMetricsRequest(`summary|${filtersKey}`, () =>
    metricsApi.getSummary(filtersToApiParams(filters, new Date()))
  )
  const timeseries = useMetricsRequest(`timeseries|${filtersKey}`, () =>
    metricsApi.getTimeseries(filtersToApiParams(filters, new Date()), bucket)
  )
  const calls = useMetricsRequest(`calls|${filtersKey}|${page}`, () =>
    metricsApi.listCalls(filtersToApiParams(filters, new Date()), page, CALL_LOG_PAGE_SIZE)
  )
  const pricing = useMetricsRequest('pricing', () => metricsApi.getPricing())

  const series = useMemo(() => {
    const points = timeseries.data?.points ?? []
    return {
      calls: buildSeries(points, (p) => p.calls),
      cost: buildSeries(points, (p) => p.estimated_cost_usd),
      latency: buildLatencySeries(points),
    }
  }, [timeseries.data])

  const handlePageChange = onPageChange
  const summaryEmpty = summary.data?.totals.calls === 0
  const timeseriesEmpty = timeseries.data?.points.length === 0
  const callsEmpty = calls.data?.pagination.total === 0

  return (
    <>
      <MetricsPanel
        title="Summary"
        testId="llm-metrics-summary-panel"
        loading={summary.loading}
        error={summary.error}
        onRetry={summary.retry}
        empty={summaryEmpty}
        emptyMessage={emptyMessage}
      >
        {summary.data && <MetricsSummaryCards totals={summary.data.totals} />}
      </MetricsPanel>

      <MetricsPanel
        title="Breakdown by model"
        testId="llm-metrics-breakdown-panel"
        loading={summary.loading}
        error={summary.error}
        onRetry={summary.retry}
        empty={summaryEmpty}
        emptyMessage={emptyMessage}
      >
        {summary.data && <MetricsBreakdownTable groups={summary.data.groups} />}
      </MetricsPanel>

      <MetricsPanel
        title="Trends"
        testId="llm-metrics-trends-panel"
        loading={timeseries.loading}
        error={timeseries.error}
        onRetry={timeseries.retry}
        empty={timeseriesEmpty}
        emptyMessage={emptyMessage}
      >
        <div className="llm-metrics-chart-grid">
          <MetricsLineChart
            title="Calls over time"
            testId="llm-metrics-chart-calls"
            series={series.calls}
            bucket={bucket}
            formatValue={(value) => formatNumber(Math.round(value))}
            ariaLabel="Number of LLM calls per time bucket for each feature, provider and model"
          />
          <MetricsLineChart
            title="Estimated cost over time"
            testId="llm-metrics-chart-cost"
            series={series.cost}
            bucket={bucket}
            formatValue={formatCost}
            ariaLabel="Estimated cost in USD per time bucket for each feature, provider and model"
          />
          <MetricsLineChart
            title="Latency over time (p50 solid, p95 dashed)"
            testId="llm-metrics-chart-latency"
            series={series.latency}
            bucket={bucket}
            formatValue={formatLatency}
            ariaLabel="p50 and p95 latency per time bucket for each feature, provider and model"
          />
        </div>
      </MetricsPanel>

      <MetricsPanel
        title="Cost per call vs p95 latency"
        testId="llm-metrics-cost-latency-panel"
        loading={summary.loading}
        error={summary.error}
        onRetry={summary.retry}
        empty={summaryEmpty}
        emptyMessage={emptyMessage}
      >
        {summary.data && <MetricsCostLatencyChart groups={summary.data.groups} />}
      </MetricsPanel>

      <MetricsPanel
        title="Call log"
        testId="llm-metrics-call-log-panel"
        loading={calls.loading}
        error={calls.error}
        onRetry={calls.retry}
        empty={callsEmpty}
        emptyMessage={emptyMessage}
      >
        {calls.data && (
          <LLMCallLog
            calls={calls.data.calls}
            pagination={calls.data.pagination}
            onPageChange={handlePageChange}
          />
        )}
      </MetricsPanel>

      <MetricsPanel
        title="Pricing"
        testId="llm-metrics-pricing-panel"
        loading={pricing.loading}
        error={pricing.error}
        onRetry={pricing.retry}
      >
        {pricing.data && <LLMPricingPanel pricing={pricing.data} />}
      </MetricsPanel>
    </>
  )
}

function LLMMetricsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams])
  const page = pageFromSearchParams(searchParams)
  const view = viewFromSearchParams(searchParams)
  const baseline = baselineFromSearchParams(searchParams)

  // Unfiltered summary, for the filter dropdown options
  const options = useMetricsRequest('options', () => metricsApi.getSummary({}))
  const dropdownOptions = useMemo(
    () => filterOptions(options.data?.groups ?? []),
    [options.data]
  )
  // Unknown (still loading or failed) counts as "has calls", so we never claim the log is empty wrongly
  const hasAnyCalls = options.data ? options.data.totals.calls > 0 : true
  const emptyMessage = hasAnyCalls ? NO_MATCH_MESSAGE : NO_CALLS_MESSAGE

  const handleFiltersChange = (next: LLMMetricsFilters) => {
    // A new filter always starts the call log at page 1 (page is dropped);
    // the view and report baseline are kept
    const params = filtersToSearchParams(next)
    if (view === 'report') params.set('view', 'report')
    if (searchParams.get('baseline')) params.set('baseline', baseline)
    setSearchParams(params)
  }

  const handlePageChange = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) next.set('page', String(nextPage))
    else next.delete('page')
    setSearchParams(next)
  }

  const handleViewChange = (nextView: LLMMetricsView) => {
    const next = new URLSearchParams(searchParams)
    if (nextView === 'report') next.set('view', 'report')
    else next.delete('view')
    next.delete('page')
    setSearchParams(next)
  }

  const handleBaselineChange = (nextBaseline: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextBaseline === DEFAULT_BASELINE) next.delete('baseline')
    else next.set('baseline', nextBaseline)
    setSearchParams(next)
  }

  return (
    <div className="llm-metrics-dashboard" data-testid="llm-metrics-dashboard">
      <MetricsFilterBar filters={filters} options={dropdownOptions} onChange={handleFiltersChange} />
      <MetricsViewTabs view={view} onChange={handleViewChange} />

      {view === 'report' ? (
        <ModelComparisonReport filters={filters} baseline={baseline} onBaselineChange={handleBaselineChange} />
      ) : (
        <DashboardView
          filters={filters}
          page={page}
          emptyMessage={emptyMessage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}

export default LLMMetricsDashboard
