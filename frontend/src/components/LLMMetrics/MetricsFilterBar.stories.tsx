/**
 * Storybook stories for MetricsFilterBar (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsFilterBar from './MetricsFilterBar'
import { filterOptions } from './metricsUtils'
import { sampleGroups } from './fixtures'

const meta = {
  title: 'LLM Metrics/MetricsFilterBar',
  component: MetricsFilterBar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    filters: { range: 'all' },
    options: filterOptions(sampleGroups),
    onChange: () => {},
  },
} satisfies Meta<typeof MetricsFilterBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filtered: Story = {
  args: { filters: { range: '7d', provider: 'anthropic', status: 'error' } },
}

export const CustomRange: Story = {
  args: { filters: { range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-07' } },
}

export const NoOptionsYet: Story = {
  args: { options: { features: [], providers: [], models: [] } },
}

export const Mobile: Story = {
  args: { filters: { range: '30d', feature: 'chat' } },
  globals: { viewport: { value: 'mobile1' } },
}
