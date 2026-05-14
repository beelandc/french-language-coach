import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
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

const meta: Meta<typeof FeedbackView> = {
  title: 'Components/FeedbackView',
  component: FeedbackView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/feedback/mock-ended-session-1']}>
        <MockSessionsProvider initialSessions={[
          {
            id: 'mock-ended-session-1',
            scenario_id: 'cafe_order',
            created_at: '2024-01-15T10:30:00Z',
            ended_at: '2024-01-15T10:35:00Z',
            messages: [],
            feedback: mockFeedback,
          },
        ]} currentSessionId="mock-ended-session-1" currentScenarioId="cafe_order" sessionEnded={true}>
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <Story />
          </div>
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
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
}

export const Loading: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/feedback/loading-session-1']}>
        <MockSessionsProvider initialSessions={[]} currentSessionId="loading-session-1" isLoading={true}>
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <Story />
          </div>
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
  args: {
    sessionId: 'loading-session-1',
  },
}

export const NoFeedback: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/feedback/no-feedback-session-1']}>
        <MockSessionsProvider initialSessions={[
          {
            id: 'no-feedback-session-1',
            scenario_id: 'cafe_order',
            created_at: '2024-01-15T10:30:00Z',
            ended_at: '2024-01-15T10:35:00Z',
            messages: [],
            feedback: null,
          },
        ]} currentSessionId="no-feedback-session-1" currentScenarioId="cafe_order" sessionEnded={true}>
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <Story />
          </div>
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
  args: {
    sessionId: 'no-feedback-session-1',
  },
}
