/**
 * LLMPricingPanel: the price table behind the cost estimates (Issue #237),
 * with the date each price was checked and a link to its source.
 */

import type { LLMPriceTable, LLMPriceTier } from '../../types/index'
import { formatNumber, formatPrice, sourceLabel } from './metricsUtils'

/** Props for LLMPricingPanel. */
export interface LLMPricingPanelProps {
  /** Price table from GET /metrics/llm/pricing. */
  pricing: LLMPriceTable
}

function tierSummary(tier: LLMPriceTier): string {
  return `in ${formatPrice(tier.input_per_mtok)} / out ${formatPrice(tier.output_per_mtok)} / cache read ${formatPrice(tier.cache_read_per_mtok)}`
}

function LLMPricingPanel({ pricing }: LLMPricingPanelProps) {
  if (pricing.models.length === 0) {
    return <p className="llm-metrics-panel-empty">The price table has no entries.</p>
  }

  return (
    <div className="llm-metrics-pricing" data-testid="llm-metrics-pricing">
      <p className="llm-metrics-chart-note">
        Prices in {pricing.currency} per million tokens. Calls to models not listed here are logged without a cost.
      </p>
      <div className="llm-metrics-table-wrapper">
        <table className="llm-metrics-table">
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">Model</th>
              <th scope="col" className="llm-metrics-numeric">Input</th>
              <th scope="col" className="llm-metrics-numeric">Output</th>
              <th scope="col" className="llm-metrics-numeric">Cache read</th>
              <th scope="col">Checked on</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {pricing.models.map((entry) => (
              <tr key={`${entry.provider}:${entry.model}`} data-testid={`llm-metrics-price-${entry.model}`}>
                <td>{entry.provider}</td>
                <td>
                  {entry.model}
                  {entry.long_context && (
                    <div className="llm-metrics-price-detail">
                      Over {formatNumber(entry.long_context.threshold_tokens)} tokens:{' '}
                      {tierSummary(entry.long_context)}
                    </div>
                  )}
                  {entry.notes && <div className="llm-metrics-price-detail">{entry.notes}</div>}
                </td>
                <td className="llm-metrics-numeric">{formatPrice(entry.input_per_mtok)}</td>
                <td className="llm-metrics-numeric">{formatPrice(entry.output_per_mtok)}</td>
                <td className="llm-metrics-numeric">{formatPrice(entry.cache_read_per_mtok)}</td>
                <td className="llm-metrics-nowrap">{entry.checked_on}</td>
                <td>
                  <a href={entry.source} target="_blank" rel="noopener noreferrer">
                    {sourceLabel(entry.source)}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LLMPricingPanel
