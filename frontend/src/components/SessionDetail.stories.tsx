import type { Meta, StoryObj } from '@storybook/react'
import SessionDetail from './SessionDetail'

// Meta configuration for Storybook
const meta: Meta<typeof SessionDetail> = {
  title: 'Components/SessionDetail',
  component: SessionDetail,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    sessionId: {
      control: 'text',
      description: 'The ID of the session to display',
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

// Default story - shows loading state
// Note: In a real app, this would fetch data, but for Storybook we show static examples
export const Default: Story = {
  args: {
    sessionId: '123',
  },
}

// Story with full session data (feedback available)
// This story demonstrates the component with a complete session
export const WithFeedback: Story = {
  args: {
    sessionId: '123',
  },
  parameters: {
    docs: {
      description: {
        story: 'A session with both conversation transcript and full feedback report. This is the typical use case for reviewing a completed session.',
      },
    },
  },
}

// Story without feedback
// This story demonstrates the component when feedback is not yet available
export const WithoutFeedback: Story = {
  args: {
    sessionId: '456',
  },
  parameters: {
    docs: {
      description: {
        story: 'A session with conversation messages but no feedback yet. This can happen if the user has not ended the session or if feedback generation is pending.',
      },
    },
  },
}

// Story with empty session
// This story demonstrates the component with no messages
export const EmptySession: Story = {
  args: {
    sessionId: '789',
  },
  parameters: {
    docs: {
      description: {
        story: 'A session with no messages. This is an edge case that displays an empty state message.',
      },
    },
  },
}
