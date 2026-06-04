/**
 * Storybook stories for LessonBrowser component
 * 
 * Uses mock data and mock API for Storybook
 */

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import LessonBrowser from './LessonBrowser'
import type { LessonBrowserProps } from '../types/index'

// Mock lesson data for Storybook
const mockLessons = [
  { id: 'verb-conjugation', title: 'Verb Conjugation', topic: 'Verbs', difficulty: 'beginner' as const },
  { id: 'present-tense', title: 'Present Tense', topic: 'Verbs', difficulty: 'beginner' as const },
  { id: 'past-tense', title: 'Past Tense (Passé Composé)', topic: 'Verbs', difficulty: 'intermediate' as const },
  { id: 'future-tense', title: 'Future Tense', topic: 'Verbs', difficulty: 'intermediate' as const },
  { id: 'subjunctive', title: 'The Subjunctive Mood', topic: 'Verbs', difficulty: 'advanced' as const },
  { id: 'conditional', title: 'Conditional', topic: 'Verbs', difficulty: 'advanced' as const },
  { id: 'articles', title: 'Definite and Indefinite Articles', topic: 'Nouns', difficulty: 'beginner' as const },
  { id: 'gender-agreement', title: 'Gender Agreement', topic: 'Adjectives', difficulty: 'intermediate' as const },
  { id: 'pronouns', title: 'Pronouns', topic: 'Grammar', difficulty: 'intermediate' as const },
  { id: 'questions', title: 'Asking Questions', topic: 'Grammar', difficulty: 'beginner' as const },
  { id: 'negation', title: 'Negation', topic: 'Grammar', difficulty: 'beginner' as const },
  { id: 'prepositions', title: 'Prepositions', topic: 'Grammar', difficulty: 'intermediate' as const },
]

const meta = {
  title: 'Components/LessonBrowser',
  component: LessonBrowser,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LessonBrowser>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Default LessonBrowser story
 * Shows multiple lessons with default filters
 */
export const Default: Story = {
  args: {
    // No initial filters
  },
  parameters: {
    // Mock the API response
    mockData: {
      lessons: mockLessons.slice(0, 12),
      pagination: {
        total: 24,
        page: 1,
        per_page: 12,
        total_pages: 2,
      },
    },
  },
}

/**
 * LessonBrowser with initial difficulty filter
 */
export const WithInitialDifficulty: Story = {
  args: {
    initialDifficulty: 'beginner',
  },
  parameters: {
    mockData: {
      lessons: mockLessons.filter(l => l.difficulty === 'beginner'),
      pagination: {
        total: 4,
        page: 1,
        per_page: 12,
        total_pages: 1,
      },
    },
  },
}

/**
 * LessonBrowser with initial topic filter
 */
export const WithInitialTopic: Story = {
  args: {
    initialTopic: 'Verbs',
  },
  parameters: {
    mockData: {
      lessons: mockLessons.filter(l => l.topic === 'Verbs'),
      pagination: {
        total: 6,
        page: 1,
        per_page: 12,
        total_pages: 1,
      },
    },
  },
}

/**
 * LessonBrowser with initial search query
 */
export const WithInitialSearch: Story = {
  args: {
    initialSearch: 'tense',
  },
  parameters: {
    mockData: {
      lessons: mockLessons.filter(l => 
        l.title.toLowerCase().includes('tense') || 
        l.topic.toLowerCase().includes('tense')
      ),
      pagination: {
        total: 4,
        page: 1,
        per_page: 12,
        total_pages: 1,
      },
    },
  },
}

/**
 * Empty LessonBrowser (no lessons)
 */
export const Empty: Story = {
  args: {
    // No initial filters
  },
  parameters: {
    mockData: {
      lessons: [],
      pagination: {
        total: 0,
        page: 1,
        per_page: 12,
        total_pages: 0,
      },
    },
  },
}
