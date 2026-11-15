/**
 * Storybook stories for ReportExportBar (Issue #238).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import ReportExportBar from './ReportExportBar'

const meta = {
  title: 'LLM Metrics/ReportExportBar',
  component: ReportExportBar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onExport: fn(async () => {}) },
} satisfies Meta<typeof ReportExportBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'CSV' }))
    await expect(args.onExport).toHaveBeenCalledWith('csv')
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'PDF' })).toBeDisabled()
  },
}

export const ExportFails: Story = {
  args: {
    onExport: fn(async () => {
      throw new Error('HTTP error! status: 500')
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Markdown' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Export failed: HTTP error! status: 500')
  },
}
