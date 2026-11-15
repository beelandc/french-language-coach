/**
 * Storybook stories for MetricsViewTabs (Issue #238).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import MetricsViewTabs from './MetricsViewTabs'

const meta = {
  title: 'LLM Metrics/MetricsViewTabs',
  component: MetricsViewTabs,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { view: 'dashboard', onChange: fn() },
} satisfies Meta<typeof MetricsViewTabs>

export default meta
type Story = StoryObj<typeof meta>

export const DashboardActive: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(canvas.getByRole('tab', { name: 'Comparison report' }))
    await expect(args.onChange).toHaveBeenCalledWith('report')
  },
}

export const ReportActive: Story = {
  args: { view: 'report' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('tab', { name: 'Comparison report' })).toHaveAttribute('aria-selected', 'true')
  },
}
