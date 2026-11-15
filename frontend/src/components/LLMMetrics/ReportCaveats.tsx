/**
 * ReportCaveats: notes, warnings, sample-size rule and price check dates for
 * the comparison report (Issue #238). Always rendered and never collapsed, so
 * the numbers are never shown without their caveats.
 */

import type { ReportMetadata } from '../../types/index'
import { sourceLabel } from './metricsUtils'

/** Props for ReportCaveats. */
export interface ReportCaveatsProps {
  /** Report metadata (notes, warnings, prices, sample size) */
  metadata: ReportMetadata
}

function ReportCaveats({ metadata }: ReportCaveatsProps) {
  return (
    <section className="llm-report-caveats" data-testid="report-caveats" aria-labelledby="llm-report-caveats-title">
      <h4 id="llm-report-caveats-title">Caveats</h4>
      <ul className="llm-report-caveat-list" data-testid="report-notes">
        {metadata.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
        <li>
          Models with fewer than {metadata.min_sample_size} calls are not ranked in the summaries.
        </li>
        <li>Latency and token averages use {metadata.latency_basis}.</li>
      </ul>

      <h5>Warnings</h5>
      {metadata.warnings.length ? (
        <ul className="llm-report-caveat-list llm-report-warnings" data-testid="report-warnings">
          {metadata.warnings.map((warning, index) => (
            <li key={`${index}-${warning}`}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p data-testid="report-warnings">No warnings.</p>
      )}

      <h5>Prices used</h5>
      {metadata.prices.length ? (
        <ul className="llm-report-caveat-list" data-testid="report-prices">
          {metadata.prices.map((price) => (
            <li key={`${price.provider}:${price.model}`}>
              {price.provider}:{price.model}: checked {price.checked_on} (
              <a href={price.source} target="_blank" rel="noopener noreferrer">
                {sourceLabel(price.source)}
              </a>
              )
            </li>
          ))}
        </ul>
      ) : (
        <p data-testid="report-prices">No price entries for these models.</p>
      )}
    </section>
  )
}

export default ReportCaveats
