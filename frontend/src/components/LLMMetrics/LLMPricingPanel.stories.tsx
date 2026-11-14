/**
 * Storybook stories for LLMPricingPanel (Issue #237).
 */

import type { Meta, StoryObj } from '@storybook/react'
import LLMPricingPanel from './LLMPricingPanel'
import { samplePricing } from './fixtures'

const meta = {
  title: 'LLM Metrics/LLMPricingPanel',
  component: LLMPricingPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { pricing: samplePricing },
} satisfies Meta<typeof LLMPricingPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Includes a long-context tier (Claude Haiku 5.5) and notes. */
export const Default: Story = {}

export const EmptyTable: Story = { args: { pricing: { ...samplePricing, models: [] } } }
