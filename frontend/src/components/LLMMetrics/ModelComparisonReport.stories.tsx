/**
 * Storybook stories for ModelComparisonReport (Issue #238).
 *
 * Under `npm run test` (Vitest), src/testSetup.ts replaces utils/api with mocks;
 * each story sets the report response it needs. In the Storybook UI the real
 * API is used, so the panel shows its error state unless a backend is reachable.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { vi } from 'vitest'
import { expect, fn, within } from 'storybook/test'
import ModelComparisonReport from './ModelComparisonReport'
import { metricsApi } from '../../utils/api'
import { emptyReport, sampleReport, singleModelReport } from './fixtures'

/** Set the mocked report response when running under the Vitest mocks. */
function mockReport(load: () => Promise<unknown>) {
  if (!vi.isMockFunction(metricsApi.getReport)) return
  vi.mocked(metricsApi.getReport).mockImplementation(load as never)
}

const meta = {
  title: 'LLM Metrics/ModelComparisonReport',
  component: ModelComparisonReport,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    filters: { range: 'all' },
    baseline: 'mistral:mistral-large-latest',
    onBaselineChange: fn(),
  },
} satisfies Meta<typeof ModelComparisonReport>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  beforeEach: () => mockReport(async () => sampleReport),
  play: async ({ canvasElement }) => {
    if (!vi.isMockFunction(metricsApi.getReport)) return
    const canvas = within(canvasElement)
    await expect(await canvas.findByTestId('report-feature-feedback')).toBeInTheDocument()
    await expect(canvas.getByTestId('report-caveats')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'PDF' })).toBeEnabled()
  },
}

export const SingleModel: Story = {
  beforeEach: () => mockReport(async () => singleModelReport),
  play: async ({ canvasElement }) => {
    if (!vi.isMockFunction(metricsApi.getReport)) return
    await expect(await within(canvasElement).findByTestId('report-feature-empty-chat')).toBeInTheDocument()
  },
}

export const NoData: Story = {
  beforeEach: () => mockReport(async () => emptyReport),
  play: async ({ canvasElement }) => {
    if (!vi.isMockFunction(metricsApi.getReport)) return
    const canvas = within(canvasElement)
    await expect(await canvas.findByTestId('report-empty')).toHaveTextContent('FEEDBACK_PROVIDER')
    await expect(canvas.getByTestId('report-caveats')).toBeInTheDocument()
  },
}

export const IgnoredFilters: Story = {
  args: { filters: { range: 'all', provider: 'anthropic' } },
  beforeEach: () => mockReport(async () => sampleReport),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('report-ignored-filters')).toBeInTheDocument()
  },
}

export const LoadError: Story = {
  beforeEach: () => mockReport(async () => Promise.reject(new Error("baseline must be 'provider:model'"))),
  play: async ({ canvasElement }) => {
    if (!vi.isMockFunction(metricsApi.getReport)) return
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('alert')).toHaveTextContent("baseline must be 'provider:model'")
  },
}
