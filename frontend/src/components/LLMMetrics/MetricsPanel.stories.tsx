/**
 * Storybook stories for MetricsPanel (Issue #237): content, loading, error and empty states.
 */

import type { Meta, StoryObj } from '@storybook/react'
import MetricsPanel from './MetricsPanel'

const meta = {
  title: 'LLM Metrics/MetricsPanel',
  component: MetricsPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    title: 'Summary',
    children: <p>Panel content goes here.</p>,
  },
} satisfies Meta<typeof MetricsPanel>

export default meta
type Story = StoryObj<typeof meta>

export const WithContent: Story = {}

export const Loading: Story = { args: { loading: true } }

export const ErrorState: Story = {
  args: { error: 'HTTP error! status: 500', onRetry: () => {} },
}

export const Empty: Story = {
  args: { empty: true, emptyMessage: 'No LLM calls recorded yet' },
}
