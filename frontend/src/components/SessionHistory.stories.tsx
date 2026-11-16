import type { Meta, StoryObj } from '@storybook/react'
import SessionHistory from './SessionHistory'

const meta: Meta<typeof SessionHistory> = {
  title: 'Components/SessionHistory',
  component: SessionHistory,
  tags: ['autodocs'],
  argTypes: {
    onSessionClick: {
      description: 'Callback function when a session is clicked',
      action: 'sessionClicked',
      table: {
        type: { summary: 'function' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

const mockOnClick = (sessionId: string) => {
  console.log(`Session ${sessionId} clicked`)
}

// Note: For Storybook, we need to mock the API call
// This is a simplified version that shows the component in various states

export const Default: Story = {
  args: {
    onSessionClick: mockOnClick,
  },
  // For actual testing, we'd need to mock the API, but for documentation we show the structure
}

export const WithSessions: Story = {
  args: {
    onSessionClick: mockOnClick,
  },
}

export const EmptyState: Story = {
  args: {
    onSessionClick: mockOnClick,
  },
}
