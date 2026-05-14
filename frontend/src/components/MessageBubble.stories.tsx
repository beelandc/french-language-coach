import type { Meta, StoryObj } from '@storybook/react'
import MessageBubble from './MessageBubble'
import type { Message } from '@/types'

const meta: Meta<typeof MessageBubble> = {
  title: 'Components/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  argTypes: {
    message: {
      description: 'The message data to display',
      type: { required: true },
      table: {
        type: { summary: 'Message' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

const mockUserMessage: Message = {
  id: '1',
  session_id: 'session-1',
  role: 'user',
  content: 'Bonjour, je voudrais un café s\'il vous plaît.',
  created_at: '2024-01-15T10:30:00Z',
}

const mockAssistantMessage: Message = {
  id: '2',
  session_id: 'session-1',
  role: 'assistant',
  content: 'Bonjour ! Bien sûr. Quel type de café préférez-vous ?',
  created_at: '2024-01-15T10:30:05Z',
}

export const UserMessage: Story = {
  args: {
    message: mockUserMessage,
  },
}

export const AssistantMessage: Story = {
  args: {
    message: mockAssistantMessage,
  },
}

export const LongMessage: Story = {
  args: {
    message: {
      ...mockAssistantMessage,
      id: '3',
      content: 'Je peux vous recommander notre café du jour, un excellent arabica avec des notes fruitées. Nous avons également des expressos, des cappuccinos, des lattés et des thés si vous préférez. Tous nos cafés sont préparés avec des grains fraîchement moulus.',
    },
  },
}

export const EmptyContent: Story = {
  args: {
    message: {
      ...mockUserMessage,
      id: '4',
      content: '',
    },
  },
}
