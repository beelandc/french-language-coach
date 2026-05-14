import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import ChatInterface from './ChatInterface'
import { MockSessionsProvider } from '../utils/storybookMocks'

const meta: Meta<typeof ChatInterface> = {
  title: 'Components/ChatInterface',
  component: ChatInterface,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/chat/mock-session-1']}>
        <MockSessionsProvider initialSessions={[
          {
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
          },
        ]} currentSessionId="mock-session-1" currentScenarioId="cafe_order">
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <Story />
          </div>
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
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
}

export const EmptySession: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/chat/empty-session-1']}>
        <MockSessionsProvider initialSessions={[
          {
            id: 'empty-session-1',
            scenario_id: 'cafe_order',
            created_at: '2024-01-15T10:30:00Z',
            ended_at: null,
            messages: [],
            feedback: null,
          },
        ]} currentSessionId="empty-session-1" currentScenarioId="cafe_order">
          <div style={{ padding: '20px', maxWidth: '800px' }}>
            <Story />
          </div>
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
  args: {
    sessionId: 'empty-session-1',
  },
}
