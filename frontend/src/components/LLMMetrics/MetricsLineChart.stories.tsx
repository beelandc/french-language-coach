/**
 * Storybook stories for MetricsLineChart (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsLineChart from './MetricsLineChart'
import { buildLatencySeries, buildSeries, formatCost, formatLatency, formatNumber } from './metricsUtils'
import { sampleTimeseries } from './fixtures'

const meta = {
  title: 'LLM Metrics/MetricsLineChart',
  component: MetricsLineChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    title: 'Calls over time',
    series: buildSeries(sampleTimeseries.points, (p) => p.calls),
    bucket: 'day',
    formatValue: (value: number) => formatNumber(Math.round(value)),
    ariaLabel: 'Number of LLM calls per day for each feature, provider and model',
  },
} satisfies Meta<typeof MetricsLineChart>

export default meta
type Story = StoryObj<typeof meta>

export const Calls: Story = {}

export const Cost: Story = {
  args: {
    title: 'Estimated cost over time',
    series: buildSeries(sampleTimeseries.points, (p) => p.estimated_cost_usd),
    formatValue: formatCost,
    ariaLabel: 'Estimated cost per day',
  },
}

export const Latency: Story = {
  args: {
    title: 'Latency over time (p50 solid, p95 dashed)',
    series: buildLatencySeries(sampleTimeseries.points),
    formatValue: formatLatency,
    ariaLabel: 'p50 and p95 latency per day',
  },
}

export const SingleHour: Story = {
  args: {
    bucket: 'hour',
    series: [{ key: 'chat · mistral:mistral-large-latest', points: [{ time: new Date('2026-11-14T08:00:00Z'), value: 4 }] }],
  },
}

export const NoData: Story = { args: { series: [] } }
