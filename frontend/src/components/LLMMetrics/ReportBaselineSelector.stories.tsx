/**
 * Storybook stories for ReportBaselineSelector (Issue #238).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import ReportBaselineSelector from './ReportBaselineSelector'

const meta = {
  title: 'LLM Metrics/ReportBaselineSelector',
  component: ReportBaselineSelector,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    value: 'mistral:mistral-large-latest',
    options: ['anthropic:claude-haiku-5-5', 'anthropic:claude-sonnet-5-5', 'mistral:mistral-large-latest'],
    onChange: fn(),
  },
} satisfies Meta<typeof ReportBaselineSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByLabelText('Baseline model'), 'anthropic:claude-haiku-5-5')
    await expect(args.onChange).toHaveBeenCalledWith('anthropic:claude-haiku-5-5')
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Baseline model')).toBeDisabled()
  },
}
