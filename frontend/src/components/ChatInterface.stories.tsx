import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import ChatInterface from './ChatInterface'
import { MockSessionsProvider } from '../utils/storybookMocks'

const mockSession = {
  id: 'mock-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: null,
  messages: [
    {
      id: '1',
      session_id: 'mock-session-1',
      role: 'assistant',
      content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      session_id: 'mock-session-1',
      role: 'user',
      content: 'Je voudrais un café s\'il vous plaît.',
      created_at: '2024-01-15T10:30:05Z',
    },
    {
      id: '3',
      session_id: 'mock-session-1',
      role: 'assistant',
      content: 'Quel type de café préférez-vous ?',
      created_at: '2024-01-15T10:30:10Z',
    },
  ],
  feedback: null,
}

const mockEmptySession = {
  id: 'empty-session-1',
  scenario_id: 'cafe_order',
  created_at: '2024-01-15T10:30:00Z',
  ended_at: null,
  messages: [],
  feedback: null,
}

const meta: Meta<typeof ChatInterface> = {
  title: 'Components/ChatInterface',
  component: ChatInterface,
  tags: ['autodocs'],
  argTypes: {
    sessionId: {
      description: 'The ID of the session to display',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'The chat interface component that displays messages and handles user input. Uses useSessions hook for data management and React Router for navigation.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const WithMessages: Story = {
  args: {
    sessionId: 'mock-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider initialSessions={[mockSession]} currentSessionId="mock-session-1" currentScenarioId="cafe_order">
        <Story />
      </MockSessionsProvider>
    ),
  ],
}

export const EmptySession: Story = {
  args: {
    sessionId: 'empty-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider initialSessions={[mockEmptySession]} currentSessionId="empty-session-1" currentScenarioId="cafe_order">
        <Story />
      </MockSessionsProvider>
    ),
  ],
}

const FEEDBACK_502_DETAIL =
  'Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again.'

// Issue #229: feedback generation fails (502); the error is shown once with a retry button
export const FeedbackError: Story = {
  args: {
    sessionId: 'mock-session-1',
  },
  decorators: [
    (Story) => (
      <MockSessionsProvider
        initialSessions={[mockSession]}
        currentSessionId="mock-session-1"
        currentScenarioId="cafe_order"
        feedbackError={FEEDBACK_502_DETAIL}
      >
        <Story />
      </MockSessionsProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('end-session-button'))
    await expect(await canvas.findByTestId('feedback-error')).toHaveTextContent(FEEDBACK_502_DETAIL)
    await expect(canvas.getByTestId('retry-feedback-button')).toBeEnabled()
    await expect(canvas.queryByTestId('sessions-error')).not.toBeInTheDocument()
  },
}
