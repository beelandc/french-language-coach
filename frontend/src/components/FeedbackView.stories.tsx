import type { Meta, StoryObj } from '@storybook/react'
import FeedbackView from './FeedbackView'
import { MockSessionsProvider } from '../utils/storybookMocks'
import type { Feedback } from '@/types'

const mockFeedback: Feedback = {
  session_id: 'mock-session-1',
  grammar_score: 85,
  vocabulary_score: 92,
  fluency_score: 78,
  overall_score: 88,
  strengths: ['Good vocabulary usage', 'Natural phrasing', 'Correct use of polite forms'],
  focus_area: 'grammar',
  example_corrections: [
    {
      original: 'Je veux un café',
      corrected: 'Je voudrais un café',
      explanation: 'Using "voudrais" (conditional) is more polite than "veux" (present) when making requests.',
    },
    {
      original: 'Il faut que tu viens',
      corrected: 'Il faut que tu viennes',
      explanation: 'After "que" in expressions of necessity, the subjunctive mood is required: "viennes" instead of "viens".',
    },
  ],
}

const mockEndedSession = {
  id: 'mock-ended-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: '2024-01-15T10:35:00Z',
  messages: [],
  feedback: mockFeedback,
}

const mockNoFeedbackSession = {
  id: 'no-feedback-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: '2024-01-15T10:35:00Z',
  messages: [],
  feedback: null,
}

const meta: Meta<typeof FeedbackView> = {
  title: 'Components/FeedbackView',
  component: FeedbackView,
  tags: ['autodocs'],
  argTypes: {
    sessionId: {
      description: 'The ID of the session to display feedback for',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'The feedback view component that displays session feedback with scores, strengths, focus area, and example corrections.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const WithFeedback: Story = {
  args: {
    sessionId: 'mock-ended-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider
        initialSessions={[mockEndedSession]}
        currentSessionId="mock-ended-session-1"
        currentScenarioId="cafe_order"
        sessionEnded={true}
      >
        <Story />
      </MockSessionsProvider>
    ),
  ],
}

export const Loading: Story = {
  args: {
    sessionId: 'loading-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider initialSessions={[]} currentSessionId="loading-session-1" isLoading={true}>
        <Story />
      </MockSessionsProvider>
    ),
  ],
}

export const NoFeedback: Story = {
  args: {
    sessionId: 'no-feedback-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider
        initialSessions={[mockNoFeedbackSession]}
        currentSessionId="no-feedback-session-1"
        currentScenarioId="cafe_order"
        sessionEnded={true}
      >
        <Story />
      </MockSessionsProvider>
    ),
  ],
}
