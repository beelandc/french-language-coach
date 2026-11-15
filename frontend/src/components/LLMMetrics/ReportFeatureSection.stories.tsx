/**
 * Storybook stories for ReportFeatureSection (Issue #238).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import ReportFeatureSection from './ReportFeatureSection'
import { noBaselineReport, sampleChatFeature, sampleFeedbackFeature, singleModelReport } from './fixtures'

const meta = {
  title: 'LLM Metrics/ReportFeatureSection',
  component: ReportFeatureSection,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { feature: sampleFeedbackFeature, baseline: 'mistral:mistral-large-latest' },
} satisfies Meta<typeof ReportFeatureSection>

export default meta
type Story = StoryObj<typeof meta>

/** Three models; Haiku is cheaper (green), Sonnet costs more (red). */
export const ThreeModels: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('report-summary-feedback')).toHaveTextContent('lowest cost per 1,000 calls')
    await expect(canvas.getByText('−62.1%')).toHaveClass('llm-report-delta-better')
    await expect(canvas.getByText('+41.4%')).toHaveClass('llm-report-delta-worse')
  },
}

/** One model below the minimum sample size: no winner is named. */
export const NotEnoughData: Story = {
  args: { feature: sampleChatFeature },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('report-summary-chat')).toHaveTextContent(
      'Not enough data to name a winner'
    )
  },
}

export const SingleModel: Story = {
  args: { feature: singleModelReport.features[0] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('report-feature-empty-chat')).toHaveTextContent('CHAT_PROVIDER')
  },
}

export const BaselineMissing: Story = {
  args: { feature: noBaselineReport.features[0] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('report-no-baseline-feedback')).toBeInTheDocument()
  },
}
