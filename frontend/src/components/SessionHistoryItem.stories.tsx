import type { Meta, StoryObj } from '@storybook/react'
import SessionHistoryItem from './SessionHistoryItem'
import type { SessionSummary } from '@/types'

const meta: Meta<typeof SessionHistoryItem> = {
  title: 'Components/SessionHistoryItem',
  component: SessionHistoryItem,
  tags: ['autodocs'],
  argTypes: {
    session: {
      description: 'The session summary data to display',
      type: { required: true },
      table: {
        type: { summary: 'SessionSummary' },
      },
    },
    onClick: {
      description: 'Callback function when the session item is clicked',
      action: 'clicked',
      table: {
        type: { summary: 'function' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

// Mock session with score
const mockSessionWithScore: SessionSummary = {
  id: '123',
  scenario_id: 'cafe_order',
  scenario_name: 'Ordering at a Café',
  difficulty: 'intermediate',
  created_at: '2026-05-15T10:00:00Z',
  ended_at: '2026-05-15T10:15:00Z',
  overall_score: 88,
}

// Mock session without score
const mockSessionWithoutScore: SessionSummary = {
  id: '456',
  scenario_id: 'ask_directions',
  scenario_name: 'Asking for Directions',
  difficulty: 'beginner',
  created_at: '2026-05-14T09:30:00Z',
  ended_at: null,
  overall_score: null,
}

// Mock session with high score
const mockSessionWithHighScore: SessionSummary = {
  id: '789',
  scenario_id: 'job_interview',
  scenario_name: 'Job Interview',
  difficulty: 'advanced',
  created_at: '2026-05-13T14:00:00Z',
  ended_at: '2026-05-13T14:30:00Z',
  overall_score: 95,
}

// Mock onClick handler
const mockOnClick = (sessionId: string) => {
  console.log(`Session ${sessionId} clicked`)
}

export const Default: Story = {
  args: {
    session: mockSessionWithScore,
    onClick: mockOnClick,
  },
}

export const WithScore: Story = {
  args: {
    session: mockSessionWithScore,
    onClick: mockOnClick,
  },
}

export const WithoutScore: Story = {
  args: {
    session: mockSessionWithoutScore,
    onClick: mockOnClick,
  },
}

export const HighScore: Story = {
  args: {
    session: mockSessionWithHighScore,
    onClick: mockOnClick,
  },
}

export const BeginnerDifficulty: Story = {
  args: {
    session: {
      ...mockSessionWithScore,
      difficulty: 'beginner',
      scenario_name: 'Beginner Scenario',
    },
    onClick: mockOnClick,
  },
}

export const AdvancedDifficulty: Story = {
  args: {
    session: {
      ...mockSessionWithScore,
      difficulty: 'advanced',
      scenario_name: 'Advanced Scenario',
    },
    onClick: mockOnClick,
  },
}

export const WithoutEndedAt: Story = {
  args: {
    session: {
      ...mockSessionWithScore,
      ended_at: null,
      scenario_name: 'Active Session',
    },
    onClick: mockOnClick,
  },
}
