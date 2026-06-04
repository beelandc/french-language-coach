/**
 * Storybook stories for LessonCard component
 */

import type { Meta, StoryObj } from '@storybook/react'
import LessonCard from './LessonCard'
import type { LessonCardProps } from '../types/index'

const meta = {
  title: 'Components/LessonCard',
  component: LessonCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof LessonCard>

export default meta

type Story = StoryObj<typeof meta>

// Sample lesson data for stories
const sampleLesson = {
  id: 'verb-conjugation',
  title: 'Verb Conjugation',
  topic: 'Verbs',
  difficulty: 'beginner' as const,
}

const intermediateLesson = {
  id: 'subjunctive-mood',
  title: 'The Subjunctive Mood',
  topic: 'Verbs',
  difficulty: 'intermediate' as const,
}

const advancedLesson = {
  id: 'conditional-perfect',
  title: 'Conditional Perfect',
  topic: 'Verbs',
  difficulty: 'advanced' as const,
}

/**
 * Default LessonCard with beginner lesson
 */
export const Default: Story = {
  args: {
    lesson: sampleLesson,
    onClick: (id) => console.log(`Clicked lesson: ${id}`),
  },
}

/**
 * Intermediate difficulty lesson
 */
export const Intermediate: Story = {
  args: {
    lesson: intermediateLesson,
    onClick: (id) => console.log(`Clicked lesson: ${id}`),
  },
}

/**
 * Advanced difficulty lesson
 */
export const Advanced: Story = {
  args: {
    lesson: advancedLesson,
    onClick: (id) => console.log(`Clicked lesson: ${id}`),
  },
}

/**
 * Lesson with long title and topic
 */
export const LongContent: Story = {
  args: {
    lesson: {
      id: 'complex-grammar-rule',
      title: 'The Very Long and Complex Grammar Rule That Needs Special Attention',
      topic: 'Advanced French Grammar Concepts and Structures',
      difficulty: 'advanced' as const,
    },
    onClick: (id) => console.log(`Clicked lesson: ${id}`),
  },
}
