/**
 * Storybook stories for MetricsSummaryCards (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsSummaryCards from './MetricsSummaryCards'
import { emptySummary, sampleSummary } from './fixtures'

const meta = {
  title: 'LLM Metrics/MetricsSummaryCards',
  component: MetricsSummaryCards,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { totals: sampleSummary.totals },
} satisfies Meta<typeof MetricsSummaryCards>

export default meta
type Story = StoryObj<typeof meta>

/** Includes 2 unpriced calls, so the Unpriced card is highlighted. */
export const Default: Story = {}

export const AllPriced: Story = {
  args: { totals: { ...sampleSummary.totals, unpriced_calls: 0 } },
}

export const NoCalls: Story = { args: { totals: emptySummary.totals } }
