/**
 * Storybook stories for MetricsBreakdownTable (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsBreakdownTable from './MetricsBreakdownTable'
import { sampleGroups } from './fixtures'

const meta = {
  title: 'LLM Metrics/MetricsBreakdownTable',
  component: MetricsBreakdownTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { groups: sampleGroups },
} satisfies Meta<typeof MetricsBreakdownTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithUnpricedModel: Story = {
  args: {
    groups: [
      ...sampleGroups,
      {
        ...sampleGroups[0],
        provider: 'anthropic',
        model: 'claude-new-model',
        calls: 3,
        errors: 0,
        estimated_cost_usd: 0,
        unpriced_calls: 3,
        latency_p50_ms: 900,
        latency_p95_ms: 1200,
      },
    ],
  },
}

export const SingleModel: Story = { args: { groups: [sampleGroups[0]] } }
