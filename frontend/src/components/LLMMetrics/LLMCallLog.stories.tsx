/**
 * Storybook stories for LLMCallLog (Issue #237).
 * The global Storybook decorator provides the router for session links.
 */

import type { Meta, StoryObj } from '@storybook/react'
import LLMCallLog from './LLMCallLog'
import { sampleCallLog } from './fixtures'

const meta = {
  title: 'LLM Metrics/LLMCallLog',
  component: LLMCallLog,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    calls: sampleCallLog.calls,
    pagination: sampleCallLog.pagination,
    onPageChange: () => {},
  },
} satisfies Meta<typeof LLMCallLog>

export default meta
type Story = StoryObj<typeof meta>

/** Includes a failed call with its error message and a call without a session. */
export const Default: Story = {}

export const LastPage: Story = {
  args: { pagination: { total: 45, page: 3, per_page: 20, total_pages: 3 } },
}

export const PastTheEnd: Story = {
  args: { calls: [], pagination: { total: 45, page: 9, per_page: 20, total_pages: 3 } },
}

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1' } },
}
