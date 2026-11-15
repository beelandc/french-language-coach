/**
 * ReportFeatureSection: one feature of the comparison report (Issue #238).
 *
 * Shows the plain-language summary, then a side-by-side table with one column
 * per model and one row per metric. Non-baseline cells show the delta against
 * the baseline, colored better (green) or worse (red) where lower is better.
 * With fewer than two models it shows how to record comparison traffic.
 */

import type { FeatureReport } from '../../types/index'
import { formatDateTime } from './metricsUtils'
import {
  REPORT_METRICS,
  DEFAULT_MIN_SAMPLE_SIZE,
  classifyDelta,
  featureTitle,
  formatDelta,
  isComparable,
  metricDelta,
  missingBaselineMessage,
  modelKey,
  singleModelMessage,
} from './reportUtils'

/** Props for ReportFeatureSection. */
export interface ReportFeatureSectionProps {
  /** The feature's report section */
  feature: FeatureReport
  /** Baseline the report was built with ("provider:model") */
  baseline: string
  /** Minimum calls per model for ranking (from report metadata) */
  minSampleSize?: number
}

const DELTA_TITLES = {
  better: 'Better than the baseline',
  worse: 'Worse than the baseline',
  neutral: 'Difference from the baseline',
}

function ReportFeatureSection({
  feature,
  baseline,
  minSampleSize = DEFAULT_MIN_SAMPLE_SIZE,
}: ReportFeatureSectionProps) {
  const comparable = isComparable(feature)
  const name = feature.feature

  return (
    <section className="llm-report-feature" data-testid={`report-feature-${name}`} aria-labelledby={`llm-report-${name}-title`}>
      <h4 id={`llm-report-${name}-title`}>{featureTitle(name)}</h4>
      <p className="llm-report-range">
        Calls from {formatDateTime(feature.first_call_at)} to {formatDateTime(feature.last_call_at)}
      </p>

      {!comparable && (
        <p className="llm-report-notice" data-testid={`report-feature-empty-${name}`}>
          {singleModelMessage(name, minSampleSize)}
        </p>
      )}
      {comparable && feature.summary && (
        <p className="llm-report-summary" data-testid={`report-summary-${name}`}>
          {feature.summary.text}
        </p>
      )}
      {comparable && !feature.baseline_present && (
        <p className="llm-report-notice" data-testid={`report-no-baseline-${name}`}>
          {missingBaselineMessage(baseline)}
        </p>
      )}

      <div className="llm-metrics-table-wrapper">
        <table className="llm-metrics-table llm-report-table">
          <caption className="visually-hidden">
            {featureTitle(name)}: metrics per model{feature.baseline_present ? `, deltas against ${baseline}` : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {feature.rows.map((row) => (
                <th scope="col" key={modelKey(row)}>
                  <span className="llm-report-model">{modelKey(row)}</span>
                  {row.is_baseline && <span className="llm-metrics-badge llm-report-baseline-badge">Baseline</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORT_METRICS.map((metric) => (
              <tr key={metric.id} data-testid={`report-metric-${metric.id}`}>
                <th scope="row">{metric.label}</th>
                {feature.rows.map((row) => {
                  const delta = metricDelta(metric, row)
                  const text = metric.unit ? formatDelta(delta, metric.unit) : null
                  const kind = classifyDelta(delta, metric.direction)
                  return (
                    <td key={modelKey(row)} className="llm-metrics-numeric">
                      {metric.value(row)}
                      {text && (
                        <span className={`llm-report-delta llm-report-delta-${kind}`} title={DELTA_TITLES[kind]}>
                          {text}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ReportFeatureSection
