import type { Meta, StoryObj } from '@storybook/react'
import ScenarioCard from './ScenarioCard'
import type { Scenario } from '@/types'

const meta: Meta<typeof ScenarioCard> = {
  title: 'Components/ScenarioCard',
  component: ScenarioCard,
  tags: ['autodocs'],
  argTypes: {
    scenario: {
      description: 'The scenario data to display',
      type: { required: true },
      table: {
        type: { summary: 'Scenario' },
      },
    },
    onClick: {
      description: 'Callback function when the card is clicked',
      action: 'clicked',
      table: {
        type: { summary: 'function' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

const mockScenario: Scenario = {
  id: 'cafe_order',
  name: 'Ordering at a Café',
  description: 'Practice ordering coffee, pastries, and asking about menu items in a Parisian café.',
}

export const Default: Story = {
  args: {
    scenario: mockScenario,
    onClick: () => console.log('Scenario clicked'),
  },
}

export const LongDescription: Story = {
  args: {
    scenario: {
      ...mockScenario,
      id: 'job_interview',
      name: 'Job Interview',
      description: 'Simulate a job interview in French for a position as a software engineer. This scenario tests your ability to discuss technical topics, describe your experience, and respond to questions professionally.',
    },
    onClick: () => console.log('Scenario clicked'),
  },
}

export const ShortName: Story = {
  args: {
    scenario: {
      id: 'train_travel',
      name: 'Train',
      description: 'Buy tickets and ask about schedules.',
    },
    onClick: () => console.log('Scenario clicked'),
  },
}
