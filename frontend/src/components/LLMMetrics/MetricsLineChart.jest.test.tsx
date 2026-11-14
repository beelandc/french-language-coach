/**
 * Tests for MetricsLineChart (Issue #237).
 */

import { render, screen } from '@testing-library/react'
import MetricsLineChart from './MetricsLineChart'
import { buildLatencySeries, buildSeries, formatLatency, type ChartSeries } from './metricsUtils'
import { sampleTimeseries } from './fixtures'

const format = (value: number) => String(Math.round(value))

function renderChart(series: ChartSeries[], bucket: 'hour' | 'day' = 'day') {
  return render(
    <MetricsLineChart
      title="Calls over time"
      series={series}
      bucket={bucket}
      formatValue={format}
      ariaLabel="Calls per bucket"
      testId="chart"
    />
  )
}

function svgAttributes(container: HTMLElement): string[] {
  return [...container.querySelectorAll('svg *')].flatMap((el) =>
    [...el.attributes].map((attr) => attr.value)
  )
}

describe('MetricsLineChart', () => {
  it('draws one series per group with markers, tooltips and a legend', () => {
    const series = buildSeries(sampleTimeseries.points, (p) => p.calls)
    const { container } = renderChart(series)
    expect(screen.getByText('Calls over time')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Calls per bucket' })).toBeInTheDocument()
    expect(screen.getAllByTestId('llm-metrics-chart-series')).toHaveLength(3)
    // Lines only for series with 2+ points (feedback has one point)
    expect(container.querySelectorAll('path')).toHaveLength(2)
    expect(container.querySelectorAll('circle')).toHaveLength(6)
    expect(container.querySelector('circle title')?.textContent).toBe(
      'chat · anthropic:claude-sonnet-5-5 — Nov 13: 4'
    )
    expect(screen.getByText('chat · mistral:mistral-large-latest')).toBeInTheDocument()
    expect(screen.getByText(/Times are UTC days/)).toBeInTheDocument()
  })

  it('renders dashed p95 lines that share colours with p50', () => {
    const { container } = render(
      <MetricsLineChart
        title="Latency"
        series={buildLatencySeries(sampleTimeseries.points)}
        bucket="day"
        formatValue={formatLatency}
        ariaLabel="Latency"
      />
    )
    const paths = [...container.querySelectorAll('path')]
    const dashed = paths.filter((p) => p.getAttribute('stroke-dasharray'))
    expect(dashed.length).toBeGreaterThan(0)
    expect(dashed[0].getAttribute('stroke')).toBe(paths[0].getAttribute('stroke'))
    expect(container.querySelectorAll('.llm-metrics-swatch-dashed').length).toBe(3)
  })

  it('handles a single bucket without NaN', () => {
    const series: ChartSeries[] = [
      { key: 'chat · mistral:m', points: [{ time: new Date('2026-11-14T08:00:00Z'), value: 3 }] },
    ]
    const { container } = renderChart(series, 'hour')
    expect(svgAttributes(container).some((value) => value.includes('NaN'))).toBe(false)
    expect(screen.getAllByText('Nov 14 08:00').length).toBeGreaterThan(0)
    expect(screen.getByText(/Times are UTC hours/)).toBeInTheDocument()
  })

  it('handles all-zero values without NaN', () => {
    const series: ChartSeries[] = [
      {
        key: 'chat · mistral:m',
        points: [
          { time: new Date('2026-11-13T00:00:00Z'), value: 0 },
          { time: new Date('2026-11-14T00:00:00Z'), value: 0 },
        ],
      },
    ]
    const { container } = renderChart(series)
    expect(svgAttributes(container).some((value) => value.includes('NaN'))).toBe(false)
  })

  it('shows a message when there is nothing to plot', () => {
    renderChart([{ key: 'empty', points: [] }])
    expect(screen.getByText('No data for this chart.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
