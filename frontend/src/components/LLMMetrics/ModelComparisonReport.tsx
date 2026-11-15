/**
 * ModelComparisonReport: the "Comparison report" tab of /admin/metrics (Issue #238).
 *
 * Loads GET /metrics/llm/report for the dashboard's date range and feature
 * filters and the chosen baseline, and renders caveats plus one section per
 * feature. Exports reuse the exact parameters of the request that produced the
 * on-screen report (Markdown/CSV from the endpoint) or the on-screen data
 * itself (PDF), so the files match the screen.
 */

import type { LLMMetricsFilters, LLMReportApiParams, LLMReportExportFormat, ModelReport } from '../../types/index'
import { metricsApi } from '../../utils/api'
import MetricsPanel from './MetricsPanel'
import ReportBaselineSelector from './ReportBaselineSelector'
import ReportCaveats from './ReportCaveats'
import ReportExportBar from './ReportExportBar'
import ReportFeatureSection from './ReportFeatureSection'
import { generateReportPDF } from './reportPdf'
import {
  IGNORED_FILTERS_MESSAGE,
  NO_REPORT_DATA_MESSAGE,
  baselineOptions,
  hasIgnoredReportFilters,
  reportApiParams,
  reportFiltersKey,
  saveBlob,
} from './reportUtils'
import { useMetricsRequest } from './useMetricsRequest'

/** Props for ModelComparisonReport. */
export interface ModelComparisonReportProps {
  /** The dashboard's filters (only date range and feature are applied) */
  filters: LLMMetricsFilters
  /** Baseline ("provider:model") */
  baseline: string
  /** Called when the user picks another baseline */
  onBaselineChange: (baseline: string) => void
}

/** The report plus the exact parameters it was requested with. */
interface LoadedReport {
  params: LLMReportApiParams
  report: ModelReport
}

function ModelComparisonReport({ filters, baseline, onBaselineChange }: ModelComparisonReportProps) {
  const request = useMetricsRequest<LoadedReport>(`report|${reportFiltersKey(filters)}|${baseline}`, async () => {
    // Presets resolve against "now" here; exports reuse these exact params
    const params = reportApiParams(filters, new Date())
    return { params, report: await metricsApi.getReport(params, baseline) }
  })
  const loaded = request.data

  const handleExport = async (format: LLMReportExportFormat) => {
    if (!loaded) return
    if (format === 'pdf') {
      await generateReportPDF(loaded.report, NO_REPORT_DATA_MESSAGE)
      return
    }
    const file = await metricsApi.downloadReport(loaded.params, loaded.report.metadata.baseline, format)
    saveBlob(file.blob, file.filename)
  }

  const report = loaded?.report ?? null

  return (
    <div className="llm-report" data-testid="llm-metrics-report">
      {hasIgnoredReportFilters(filters) && (
        <p className="llm-report-note" data-testid="report-ignored-filters">
          {IGNORED_FILTERS_MESSAGE}
        </p>
      )}

      <div className="llm-report-toolbar">
        <ReportBaselineSelector
          value={baseline}
          options={baselineOptions(report, baseline)}
          onChange={onBaselineChange}
        />
        <ReportExportBar onExport={handleExport} disabled={!loaded} />
      </div>

      <MetricsPanel
        title="Comparison report"
        testId="llm-metrics-report-panel"
        loading={request.loading}
        error={request.error}
        onRetry={request.retry}
      >
        {report && (
          <>
            <ReportCaveats metadata={report.metadata} />
            {report.features.length === 0 ? (
              <p className="llm-report-notice" data-testid="report-empty">
                {NO_REPORT_DATA_MESSAGE}
              </p>
            ) : (
              report.features.map((feature) => (
                <ReportFeatureSection
                  key={feature.feature}
                  feature={feature}
                  baseline={report.metadata.baseline}
                  minSampleSize={report.metadata.min_sample_size}
                />
              ))
            )}
          </>
        )}
      </MetricsPanel>
    </div>
  )
}

export default ModelComparisonReport
