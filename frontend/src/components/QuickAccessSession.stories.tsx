import type { Meta, StoryObj } from '@storybook/react'
import QuickAccessSession from './QuickAccessSession'
import type { SessionSummary } from '../types'

const meta: Meta<typeof QuickAccessSession> = {
  title: 'Components/QuickAccessSession',
  component: QuickAccessSession,
  tags: ['autodocs'],
  argTypes: {
    session: {
      control: 'object',
      description: 'Session data to display',
      table: {
        type: { summary: 'SessionSummary' },
      },
    },
    onClick: {
      action: 'sessionClicked',
      description: 'Callback when session is clicked for resume',
      table: {
        type: { summary: 'function' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof QuickAccessSession>

// Helper to create mock session
const createMockSession = (
  overrides: Partial<SessionSummary> = {}
): SessionSummary => ({
  id: '1',
  scenario_id: 'cafe_order',
  scenario_name: 'Ordering at a Café',
  difficulty: 'intermediate',
  created_at: '2026-06-04T10:00:00Z',
  ended_at: '2026-06-04T10:15:00Z',
  overall_score: 85,
  is_locked: false,
  locked_at: null,
  locked_by: null,
  ...overrides,
})

// Completed session with score
export const CompletedSession: Story = {
  args: {
    session: createMockSession({
      id: '1',
      scenario_name: 'Ordering at a Café',
      difficulty: 'intermediate',
      created_at: '2026-06-04T10:00:00Z',
      ended_at: '2026-06-04T10:15:00Z',
      overall_score: 85,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}

// In-progress session (no score, not ended)
export const InProgressSession: Story = {
  args: {
    session: createMockSession({
      id: '2',
      scenario_name: 'Asking for Directions',
      difficulty: 'beginner',
      created_at: '2026-06-04T11:00:00Z',
      ended_at: null,
      overall_score: null,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}

// Session without difficulty
export const SessionWithoutDifficulty: Story = {
  args: {
    session: createMockSession({
      id: '3',
      scenario_name: 'Hotel Check-in',
      difficulty: undefined,
      created_at: '2026-06-04T09:00:00Z',
      ended_at: '2026-06-04T09:30:00Z',
      overall_score: 72,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}

// High score session
export const HighScoreSession: Story = {
  args: {
    session: createMockSession({
      id: '4',
      scenario_name: 'Job Interview',
      difficulty: 'advanced',
      created_at: '2026-06-03T14:00:00Z',
      ended_at: '2026-06-03T14:45:00Z',
      overall_score: 95,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}

// Low score session
export const LowScoreSession: Story = {
  args: {
    session: createMockSession({
      id: '5',
      scenario_name: 'Doctor\'s Visit',
      difficulty: 'intermediate',
      created_at: '2026-06-02T16:00:00Z',
      ended_at: '2026-06-02T16:20:00Z',
      overall_score: 58,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}

// Session with long name (tests text overflow)
export const LongNameSession: Story = {
  args: {
    session: createMockSession({
      id: '6',
      scenario_name: 'A Very Long Scenario Name That Might Overflow The Container',
      difficulty: 'intermediate',
      created_at: '2026-06-04T10:00:00Z',
      ended_at: '2026-06-04T10:15:00Z',
      overall_score: 80,
    }),
    onClick: (sessionId) => console.log('Resume session:', sessionId),
  },
}
