import type { Meta, StoryObj } from '@storybook/react'
import FeatureCard from './FeatureCard'

const meta: Meta<typeof FeatureCard> = {
  title: 'Components/FeatureCard',
  component: FeatureCard,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'Emoji or icon character to display',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '💬' },
      },
    },
    title: {
      control: 'text',
      description: 'Feature name',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Feature Title' },
      },
    },
    description: {
      control: 'text',
      description: 'Brief description of the feature',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Feature description' },
      },
    },
    ctaText: {
      control: 'text',
      description: 'CTA button text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Go Now →' },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler function',
      table: {
        type: { summary: 'function' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the card is disabled',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: false },
      },
    },
    comingSoon: {
      control: 'boolean',
      description: 'Whether to show "Coming Soon" badge',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: false },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof FeatureCard>

// Default feature card (enabled)
export const Default: Story = {
  args: {
    icon: '💬',
    title: 'Conversation Practice',
    description: 'Practice real French conversations with AI tutors',
    ctaText: 'Browse Scenarios →',
    onClick: () => {},
    disabled: false,
    comingSoon: false,
  },
}

// Coming Soon feature card (Vocabulary Flashcards)
export const ComingSoon: Story = {
  args: {
    icon: '📇',
    title: 'Vocabulary Flashcards',
    description: 'Spaced-repetition flashcards',
    ctaText: 'Learn Vocabulary →',
    disabled: true,
    comingSoon: true,
  },
}

// Grammar Lessons card
export const GrammarLessons: Story = {
  args: {
    icon: '📚',
    title: 'Grammar Lessons',
    description: 'Interactive lessons covering French grammar topics',
    ctaText: 'Browse Lessons →',
    onClick: () => {},
    disabled: false,
    comingSoon: false,
  },
}

// Grammar Reference card
export const GrammarReference: Story = {
  args: {
    icon: '📖',
    title: 'Grammar Reference',
    description: 'Searchable grammar database with explanations',
    ctaText: 'Search Reference →',
    onClick: () => {},
    disabled: false,
    comingSoon: false,
  },
}

// Grammar Exercises card
export const GrammarExercises: Story = {
  args: {
    icon: '✏️',
    title: 'Grammar Exercises',
    description: 'Practice grammar with interactive exercises',
    ctaText: 'Practice Exercises →',
    onClick: () => {},
    disabled: false,
    comingSoon: false,
  },
}

// Disabled card (without coming soon badge)
export const Disabled: Story = {
  args: {
    icon: '🔒',
    title: 'Disabled Feature',
    description: 'This feature is currently disabled',
    ctaText: 'Not Available',
    disabled: true,
    comingSoon: false,
  },
}
