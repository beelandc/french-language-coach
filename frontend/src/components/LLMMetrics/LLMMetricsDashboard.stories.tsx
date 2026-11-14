/**
 * Storybook stories for LLMMetricsDashboard (Issue #237).
 *
 * Under `npm run test` (Vitest), src/testSetup.ts replaces utils/api with mocks;
 * each story sets the metricsApi responses it needs. In the Storybook UI the
 * real API is used, so panels show their error state unless a backend is reachable.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { vi } from 'vitest'
import { expect, within } from 'storybook/test'
import LLMMetricsDashboard from './LLMMetricsDashboard'
import { metricsApi } from '../../utils/api'
import {
  emptyCallLog,
  emptySummary,
  sampleCallLog,
  samplePricing,
  sampleSummary,
  sampleTimeseries,
} from './fixtures'

/** Configure the mocked metricsApi when running under the Vitest mocks. */
function mockMetrics(overrides: Partial<Record<keyof typeof metricsApi, () => Promise<unknown>>> = {}) {
  if (!vi.isMockFunction(metricsApi.getSummary)) return
  const defaults = {
    getSummary: async () => sampleSummary,
    listCalls: async () => sampleCallLog,
    getTimeseries: async () => sampleTimeseries,
    getPricing: async () => samplePricing,
  }
  for (const [name, impl] of Object.entries({ ...defaults, ...overrides })) {
    vi.mocked(metricsApi[name as keyof typeof metricsApi]).mockImplementation(impl as never)
  }
}

const meta = {
  title: 'LLM Metrics/LLMMetricsDashboard',
  component: LLMMetricsDashboard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof LLMMetricsDashboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  beforeEach: () => mockMetrics(),
  play: async ({ canvasElement }) => {
    // Only meaningful with the Vitest mocks; the Storybook UI may have no backend
    if (!vi.isMockFunction(metricsApi.getSummary)) return
    const canvas = within(canvasElement)
    await expect(await canvas.findByTestId('llm-metrics-summary-cards')).toBeInTheDocument()
    await expect(await canvas.findByTestId('llm-metrics-call-log')).toBeInTheDocument()
    await expect(await canvas.findByTestId('llm-metrics-pricing')).toBeInTheDocument()
    await expect(await canvas.findByTestId('llm-metrics-chart-latency')).toBeInTheDocument()
  },
}

export const NoCallsYet: Story = {
  beforeEach: () =>
    mockMetrics({
      getSummary: async () => emptySummary,
      listCalls: async () => emptyCallLog,
      getTimeseries: async () => ({ bucket: 'day', points: [] }),
    }),
  play: async ({ canvasElement }) => {
    if (!vi.isMockFunction(metricsApi.getSummary)) return
    const canvas = within(canvasElement)
    await expect((await canvas.findAllByText('No LLM calls recorded yet')).length).toBe(5)
  },
}

export const Loading: Story = {
  beforeEach: () =>
    mockMetrics({
      getSummary: () => new Promise(() => {}),
      listCalls: () => new Promise(() => {}),
      getTimeseries: () => new Promise(() => {}),
      getPricing: () => new Promise(() => {}),
    }),
}

export const ApiErrors: Story = {
  beforeEach: () =>
    mockMetrics({
      getSummary: async () => {
        throw new Error('HTTP error! status: 500')
      },
      listCalls: async () => {
        throw new Error('HTTP error! status: 503')
      },
    }),
}

export const Mobile: Story = {
  beforeEach: () => mockMetrics(),
  globals: { viewport: { value: 'mobile1' } },
}
