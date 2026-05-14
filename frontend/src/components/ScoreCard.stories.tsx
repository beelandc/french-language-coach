import type { Meta, StoryObj } from '@storybook/react'
import ScoreCard from './ScoreCard'

const meta: Meta<typeof ScoreCard> = {
  title: 'Components/ScoreCard',
  component: ScoreCard,
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'The label for the score (e.g., Grammar, Vocabulary)',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
    value: {
      description: 'The numeric score value (0-100)',
      type: { required: true },
      table: {
        type: { summary: 'number' },
      },
      control: {
        type: 'number',
        min: 0,
        max: 100,
        step: 1,
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Grammar: Story = {
  args: {
    label: 'Grammar',
    value: 85,
  },
}

export const Vocabulary: Story = {
  args: {
    label: 'Vocabulary',
    value: 92,
  },
}

export const Fluency: Story = {
  args: {
    label: 'Fluency',
    value: 78,
  },
}

export const Overall: Story = {
  args: {
    label: 'Overall',
    value: 88,
  },
}

export const PerfectScore: Story = {
  args: {
    label: 'Grammar',
    value: 100,
  },
}

export const LowScore: Story = {
  args: {
    label: 'Fluency',
    value: 25,
  },
}

export const ZeroScore: Story = {
  args: {
    label: 'Grammar',
    value: 0,
  },
}
