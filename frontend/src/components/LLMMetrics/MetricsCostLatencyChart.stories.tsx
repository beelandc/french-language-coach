/**
 * Storybook stories for MetricsCostLatencyChart (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsCostLatencyChart from './MetricsCostLatencyChart'
import { sampleGroups } from './fixtures'

const meta = {
  title: 'LLM Metrics/MetricsCostLatencyChart',
  component: MetricsCostLatencyChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { groups: sampleGroups },
} satisfies Meta<typeof MetricsCostLatencyChart>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithExcludedModel: Story = {
  args: {
    groups: [
      ...sampleGroups,
      { ...sampleGroups[0], model: 'unpriced-model', unpriced_calls: 24, estimated_cost_usd: 0 },
    ],
  },
}

export const NothingToPlot: Story = {
  args: { groups: [{ ...sampleGroups[0], unpriced_calls: 24, estimated_cost_usd: 0 }] },
}
