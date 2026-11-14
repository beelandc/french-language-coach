/**
 * MetricsCostLatencyChart: cost per call vs p95 latency, one point per
 * feature/provider/model (Issue #237). Hand-rolled SVG scatter.
 *
 * Bottom-left is cheapest and fastest. Groups with no priced calls or no
 * latency can't be placed and are listed as "not shown".
 */

import type { LLMMetricsGroup } from '../../types/index'
import {
  CHART_FRAME,
  chartFrame,
  costPerCall,
  formatCost,
  formatLatency,
  niceScale,
  scaleLinear,
  seriesColor,
  seriesKey,
} from './metricsUtils'
import { useContainerWidth } from './useContainerWidth'

/** Props for MetricsCostLatencyChart. */
export interface MetricsCostLatencyChartProps {
  /** Groups from GET /metrics/llm. */
  groups: LLMMetricsGroup[]
}

interface ScatterPoint {
  key: string
  cost: number
  p95: number
  calls: number
}

function MetricsCostLatencyChart({ groups }: MetricsCostLatencyChartProps) {
  const [ref, width] = useContainerWidth<HTMLElement>(CHART_FRAME.width)
  const frame = chartFrame(width, 48)
  const points: ScatterPoint[] = []
  for (const group of groups) {
    const cost = costPerCall(group)
    if (cost === null || group.latency_p95_ms === null) continue
    points.push({ key: seriesKey(group), cost, p95: group.latency_p95_ms, calls: group.calls })
  }
  // Same order as the line charts' series (by key), so a model keeps its colour across charts
  points.sort((a, b) => a.key.localeCompare(b.key))
  const excluded = groups.length - points.length

  if (points.length === 0) {
    return (
      <figure className="llm-metrics-chart" data-testid="llm-metrics-cost-latency-chart" ref={ref}>
        <p className="llm-metrics-panel-empty">
          No models with both a price and a latency to compare.
        </p>
      </figure>
    )
  }

  const plotWidth = frame.width - frame.left - frame.right
  const xAxis = niceScale(points.map((p) => p.cost), plotWidth < 400 ? 2 : 4)
  const yAxis = niceScale(points.map((p) => p.p95))
  const x = scaleLinear(xAxis.domain, [frame.left, frame.width - frame.right])
  const y = scaleLinear(yAxis.domain, [frame.height - frame.bottom, frame.top])
  const lastX = xAxis.ticks[xAxis.ticks.length - 1]

  return (
    <figure className="llm-metrics-chart" data-testid="llm-metrics-cost-latency-chart" ref={ref}>
      <svg
        className="llm-metrics-chart-svg"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={`Cost per call versus p95 latency for ${points.length} model${points.length === 1 ? '' : 's'}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {yAxis.ticks.map((tick) => (
          <g key={`y-${tick}`} className="llm-metrics-axis">
            <line
              x1={frame.left}
              x2={frame.width - frame.right}
              y1={y(tick)}
              y2={y(tick)}
              className="llm-metrics-gridline"
            />
            <text x={frame.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {formatLatency(tick)}
            </text>
          </g>
        ))}
        {xAxis.ticks.map((tick) => (
          <text
            key={`x-${tick}`}
            className="llm-metrics-axis"
            x={x(tick)}
            y={frame.height - frame.bottom + 18}
            // Keep the last label inside the SVG
            textAnchor={tick === lastX ? 'end' : 'middle'}
          >
            {formatCost(tick)}
          </text>
        ))}
        <text
          className="llm-metrics-axis-label"
          x={(frame.left + frame.width - frame.right) / 2}
          y={frame.height - 6}
          textAnchor="middle"
        >
          Cost per call (USD)
        </text>
        {points.map((p, index) => (
          <circle
            key={p.key}
            cx={x(p.cost)}
            cy={y(p.p95)}
            r={6}
            fill={seriesColor(index)}
            data-testid="llm-metrics-scatter-point"
          >
            <title>{`${p.key}: ${formatCost(p.cost)} per call, p95 ${formatLatency(p.p95)} (${p.calls} calls)`}</title>
          </circle>
        ))}
      </svg>
      <ul className="llm-metrics-legend">
        {points.map((p, index) => (
          <li key={p.key}>
            <span
              className="llm-metrics-swatch llm-metrics-swatch-dot"
              style={{ backgroundColor: seriesColor(index), borderColor: seriesColor(index) }}
              aria-hidden="true"
            />
            {p.key}: {formatCost(p.cost)}/call, p95 {formatLatency(p.p95)}
          </li>
        ))}
      </ul>
      <p className="llm-metrics-chart-note">
        Y axis: p95 latency. Lower left is cheaper and faster.
        {excluded > 0 && ` ${excluded} not shown (no price or latency).`}
      </p>
    </figure>
  )
}

export default MetricsCostLatencyChart
