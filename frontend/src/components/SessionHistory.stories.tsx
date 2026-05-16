import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import SessionHistory from './SessionHistory'
import type { SessionSummary } from '@/types'

const meta: Meta<typeof SessionHistory> = {
  title: 'Components/SessionHistory',
  component: SessionHistory,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: '20px', maxWidth: '800px' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
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

// Mock sessions with various states
const mockSessions: SessionSummary[] = [
  {
    id: '1',
    scenario_id: 'cafe_order',
    scenario_name: 'Ordering at a Café',
    difficulty: 'intermediate',
    created_at: '2026-05-15T10:00:00Z',
    ended_at: '2026-05-15T10:15:00Z',
    overall_score: 88,
  },
  {
    id: '2',
    scenario_id: 'ask_directions',
    scenario_name: 'Asking for Directions',
    difficulty: 'beginner',
    created_at: '2026-05-14T09:30:00Z',
    ended_at: '2026-05-14T09:45:00Z',
    overall_score: 92,
  },
  {
    id: '3',
    scenario_id: 'job_interview',
    scenario_name: 'Job Interview',
    difficulty: 'advanced',
    created_at: '2026-05-13T14:00:00Z',
    ended_at: null,
    overall_score: null,
  },
]

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
