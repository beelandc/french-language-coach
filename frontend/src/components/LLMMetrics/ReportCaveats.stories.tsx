/**
 * Storybook stories for ReportCaveats (Issue #238).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import ReportCaveats from './ReportCaveats'
import { sampleReportMetadata } from './fixtures'

const meta = {
  title: 'LLM Metrics/ReportCaveats',
  component: ReportCaveats,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { metadata: sampleReportMetadata },
} satisfies Meta<typeof ReportCaveats>

export default meta
type Story = StoryObj<typeof meta>

/** Notes, sample-size and unpriced warnings, and price check dates. */
export const WithWarnings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/eval harness \(#231\)/)).toBeInTheDocument()
    await expect(canvas.getByText(/sample size 8 is below 20/)).toBeInTheDocument()
    await expect(canvas.getAllByText(/checked 2026-11-13/).length).toBe(2)
  },
}

export const NoWarningsOrPrices: Story = {
  args: { metadata: { ...sampleReportMetadata, warnings: [], prices: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('No warnings.')).toBeInTheDocument()
    await expect(canvas.getByText('No price entries for these models.')).toBeInTheDocument()
  },
}
