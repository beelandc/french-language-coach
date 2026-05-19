import type { Meta, StoryObj } from '@storybook/react'
import DifficultySelector from './DifficultySelector'

const meta: Meta<typeof DifficultySelector> = {
  title: 'Components/DifficultySelector',
  component: DifficultySelector,
  tags: ['autodocs'],
  argTypes: {
    defaultDifficulty: {
      control: { type: 'select' },
      options: ['beginner', 'intermediate', 'advanced'],
      description: 'The default selected difficulty level',
      table: {
        defaultValue: { summary: 'intermediate' },
      },
    },
    onDifficultyChange: {
      action: 'difficultyChanged',
      description: 'Callback when difficulty selection changes',
    },
  },
}

export default meta

type Story = StoryObj<typeof DifficultySelector>

/**
 * Default DifficultySelector with intermediate pre-selected
 */
export const Default: Story = {
  args: {
    defaultDifficulty: 'intermediate',
    onDifficultyChange: (difficulty) => console.log('Difficulty changed:', difficulty),
  },
}

/**
 * DifficultySelector with beginner pre-selected
 */
export const BeginnerSelected: Story = {
  args: {
    defaultDifficulty: 'beginner',
    onDifficultyChange: (difficulty) => console.log('Difficulty changed:', difficulty),
  },
}

/**
 * DifficultySelector with advanced pre-selected
 */
export const AdvancedSelected: Story = {
  args: {
    defaultDifficulty: 'advanced',
    onDifficultyChange: (difficulty) => console.log('Difficulty changed:', difficulty),
  },
}

/**
 * DifficultySelector without default (should default to intermediate)
 */
export const NoDefault: Story = {
  args: {
    onDifficultyChange: (difficulty) => console.log('Difficulty changed:', difficulty),
  },
}
