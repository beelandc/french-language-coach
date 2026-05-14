import type { Meta, StoryObj } from '@storybook/react'
import ChatHeader from './ChatHeader'

const meta: Meta<typeof ChatHeader> = {
  title: 'Components/ChatHeader',
  component: ChatHeader,
  tags: ['autodocs'],
  argTypes: {
    scenarioName: {
      description: 'The name of the current scenario',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
    onBack: {
      description: 'Callback function when the Back button is clicked',
      action: 'back_clicked',
      table: {
        type: { summary: 'function' },
      },
    },
    onEndSession: {
      description: 'Callback function when the End Session button is clicked',
      action: 'end_session_clicked',
      table: {
        type: { summary: 'function' },
      },
    },
    disabled: {
      description: 'Whether the End Session button is disabled',
      type: { required: true },
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: false },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    scenarioName: 'Ordering at a Café',
    onBack: () => console.log('Back clicked'),
    onEndSession: () => console.log('End session clicked'),
    disabled: false,
  },
}

export const Disabled: Story = {
  args: {
    scenarioName: 'Job Interview',
    onBack: () => console.log('Back clicked'),
    onEndSession: () => console.log('End session clicked'),
    disabled: true,
  },
}

export const LongScenarioName: Story = {
  args: {
    scenarioName: 'Dining at a Restaurant - Ordering a full meal with wine pairing',
    onBack: () => console.log('Back clicked'),
    onEndSession: () => console.log('End session clicked'),
    disabled: false,
  },
}
