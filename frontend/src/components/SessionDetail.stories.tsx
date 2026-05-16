import type { Meta, StoryObj } from '@storybook/react'
import SessionDetail from './SessionDetail'
import type { Session, Message, Feedback } from '../types'

// Mock session data for stories
const mockSessionWithFeedback: Session = {
  id: '123',
  scenario_id: 'cafe_order',
  created_at: '2026-05-15T10:00:00Z',
  ended_at: '2026-05-15T10:15:00Z',
  difficulty: 'intermediate',
  messages: [
    {
      id: '1',
      session_id: '123',
      role: 'user',
      content: 'Bonjour, je voudrais un café s\'il vous plaît.',
      created_at: '2026-05-15T10:00:00Z',
    },
    {
      id: '2',
      session_id: '123',
      role: 'assistant',
      content: 'Bonjour ! Que souhaitez-vous ? Nous avons plusieurs types de café.',
      created_at: '2026-05-15T10:01:00Z',
    },
    {
      id: '3',
      session_id: '123',
      role: 'user',
      content: 'Un expresso alors, merci.',
      created_at: '2026-05-15T10:02:00Z',
    },
    {
      id: '4',
      session_id: '123',
      role: 'assistant',
      content: 'Parfait. Un expresso pour vous. Cela fera 2,50 euros.',
      created_at: '2026-05-15T10:03:00Z',
    },
  ],
  feedback: {
    grammar_score: 85,
    vocabulary_score: 90,
    fluency_score: 88,
    overall_score: 88,
    strengths: [
      'Good vocabulary usage',
      'Natural phrasing in requests',
      'Proper use of polite expressions',
    ],
    focus_area: 'grammar',
    example_corrections: [
      {
        original: 'je voudrais un café',
        corrected: 'Je voudrais un café',
        explanation: 'Remember to capitalize the first person singular pronoun "je"',
      },
      {
        original: 'Un expresso alors',
        corrected: 'Un expresso, alors',
        explanation: 'Add a comma before "alors" for proper punctuation',
      },
    ],
  },
}

const mockSessionWithoutFeedback: Session = {
  id: '456',
  scenario_id: 'ask_directions',
  created_at: '2026-05-15T11:00:00Z',
  ended_at: null,
  difficulty: 'beginner',
  messages: [
    {
      id: '1',
      session_id: '456',
      role: 'user',
      content: 'Excusez-moi, où est la gare ?',
      created_at: '2026-05-15T11:00:00Z',
    },
    {
      id: '2',
      session_id: '456',
      role: 'assistant',
      content: 'La gare est à 500 mètres. Allez tout droit et tournez à droite.',
      created_at: '2026-05-15T11:01:00Z',
    },
  ],
  feedback: null,
}

const mockEmptySession: Session = {
  id: '789',
  scenario_id: 'job_interview',
  created_at: '2026-05-15T12:00:00Z',
  ended_at: null,
  difficulty: 'intermediate',
  messages: [],
  feedback: null,
}

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
