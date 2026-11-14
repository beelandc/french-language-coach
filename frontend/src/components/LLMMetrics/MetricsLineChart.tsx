/**
 * MetricsLineChart: multi-series SVG line chart over time (Issue #237).
 *
 * Hand-rolled SVG (no chart dependency, approved in the #237 analysis). Each
 * series is a line plus point markers; markers carry <title> tooltips. Buckets
 * without calls are absent from the API, so lines join the buckets that exist.
 */

import type { LLMTimeBucket } from '../../types/index'
import {
  CHART_FRAME,
  chartFrame,
  formatBucket,
  niceScale,
  pickEvenly,
  safeDomain,
  scaleLinear,
  seriesColor,
  type ChartSeries,
} from './metricsUtils'
import { useContainerWidth } from './useContainerWidth'

/** Props for MetricsLineChart. */
export interface MetricsLineChartProps {
  /** Chart heading. */
  title: string
  /** Series to draw. */
  series: ChartSeries[]
  /** Bucket size, used for x-axis labels. */
  bucket: LLMTimeBucket
  /** Formats y values for ticks and tooltips. */
  formatValue: (value: number) => string
  /** Accessible summary of the chart. */
  ariaLabel: string
  /** data-testid for the figure. */
  testId?: string
}

const HOUR_MS = 3600 * 1000

function MetricsLineChart({ title, series, bucket, formatValue, ariaLabel, testId }: MetricsLineChartProps) {
  const [ref, width] = useContainerWidth<HTMLElement>(CHART_FRAME.width)
  const frame = chartFrame(width)
  const plotted = series.filter((s) => s.points.length > 0)
  const times = [...new Set(plotted.flatMap((s) => s.points.map((p) => p.time.getTime())))].sort((a, b) => a - b)
  const values = plotted.flatMap((s) => s.points.map((p) => p.value))

  if (plotted.length === 0) {
    return (
      <figure className="llm-metrics-chart" data-testid={testId} ref={ref}>
        <figcaption className="llm-metrics-chart-title">{title}</figcaption>
        <p className="llm-metrics-panel-empty">No data for this chart.</p>
      </figure>
    )
  }

  // Pad a single-bucket domain by half a bucket each side so the point is centred
  const padMs = (bucket === 'hour' ? HOUR_MS : 24 * HOUR_MS) / 2
  const xDomain = safeDomain(times[0], times[times.length - 1], padMs)
  const yAxis = niceScale(values)
  const x = scaleLinear(xDomain, [frame.left, frame.width - frame.right])
  const y = scaleLinear(yAxis.domain, [frame.height - frame.bottom, frame.top])
  const yTicks = yAxis.ticks
  // Roughly one x label per 90px of plot width, between 2 and 6
  const plotWidth = frame.width - frame.left - frame.right
  const xTicks = pickEvenly(times, Math.min(6, Math.max(2, Math.floor(plotWidth / 90))))

  return (
    <figure className="llm-metrics-chart" data-testid={testId} ref={ref}>
      <figcaption className="llm-metrics-chart-title">{title}</figcaption>
      <svg
        className="llm-metrics-chart-svg"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick) => (
          <g key={`y-${tick}`} className="llm-metrics-axis">
            <line
              x1={frame.left}
              x2={frame.width - frame.right}
              y1={y(tick)}
              y2={y(tick)}
              className="llm-metrics-gridline"
            />
            <text x={frame.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((time) => (
          <text
            key={`x-${time}`}
            className="llm-metrics-axis"
            x={x(time)}
            y={frame.height - frame.bottom + 20}
            textAnchor="middle"
          >
            {formatBucket(new Date(time), bucket)}
          </text>
        ))}
        {plotted.map((s, index) => {
          const color = seriesColor(s.colorIndex ?? index)
          const path = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time.getTime()).toFixed(1)},${y(p.value).toFixed(1)}`)
            .join(' ')
          return (
            <g key={s.key} data-testid="llm-metrics-chart-series">
              {s.points.length > 1 && (
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? '6 4' : undefined}
                />
              )}
              {s.points.map((p) => (
                <circle key={p.time.getTime()} cx={x(p.time.getTime())} cy={y(p.value)} r={3.5} fill={color}>
                  <title>{`${s.key} — ${formatBucket(p.time, bucket)}: ${formatValue(p.value)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <ul className="llm-metrics-legend">
        {plotted.map((s, index) => (
          <li key={s.key}>
            <span
              className={`llm-metrics-swatch${s.dashed ? ' llm-metrics-swatch-dashed' : ''}`}
              style={{ borderColor: seriesColor(s.colorIndex ?? index) }}
              aria-hidden="true"
            />
            {s.key}
          </li>
        ))}
      </ul>
      <p className="llm-metrics-chart-note">
        Times are UTC {bucket === 'hour' ? 'hours' : 'days'}. Buckets without calls are not shown.
      </p>
    </figure>
  )
}

export default MetricsLineChart
