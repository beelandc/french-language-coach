/**
 * Storybook Stories for LessonViewer Component
 * 
 * Stories demonstrate various states and configurations of the LessonViewer component.
 */

import type { Meta, StoryObj } from '@storybook/react'
import LessonViewer from './LessonViewer'
import type { Lesson, LessonSummary } from '../types/index'

// Meta configuration for the component
const meta: Meta<typeof LessonViewer> = {
  title: 'Components/LessonViewer',
  component: LessonViewer,
  tags: ['autodocs'],
  argTypes: {
    lesson: {
      description: 'The lesson object to display',
      type: { name: 'other', value: { name: 'Lesson' } },
    },
    allLessons: {
      description: 'Optional list of all lessons for related lessons feature',
      type: { name: 'other', value: { name: 'LessonSummary[]' } },
    },
    onBack: {
      description: 'Optional callback for back navigation',
      action: 'clicked',
    },
  },
}

export default meta

type Story = StoryObj<typeof LessonViewer>

// Mock lesson data with markdown content
const mockLessonWithMarkdown: Lesson = {
  id: 'verb-conjugation',
  title: 'French Verb Conjugation',
  topic: 'Verbs',
  difficulty: 'beginner',
  sections: [
    {
      title: 'Introduction',
      content: 'Verbs are **essential** in French. They express *actions* or states. In this lesson, you will learn how to conjugate regular verbs in the present tense.',
      examples: ['Je parle français', 'Tu manges une pomme'],
    },
    {
      title: 'Regular -ER Verbs',
      content: 'Most French verbs end in **-er**. To conjugate them:\n\n- Remove the -er ending\n- Add the appropriate ending based on the subject\n\nThe endings are:\n\n- je: -e\n- tu: -es\n- il/elle: -e\n- nous: -ons\n- vous: -ez\n- ils/elles: -ent',
      examples: ['Je parle (I speak)', 'Tu parles (you speak)', 'Il parle (he speaks)', 'Nous parlons (we speak)', 'Vous parlez (you speak)', 'Ils parlent (they speak)'],
    },
    {
      title: 'Practice',
      content: 'Try conjugating these regular -ER verbs:\n\n- manger (to eat)\n- aimer (to love)\n- regarder (to watch)',
      examples: [],
    },
  ],
}

// Mock lesson with many sections for TOC demonstration
const mockLessonWithManySections: Lesson = {
  id: 'comprehensive-guide',
  title: 'Comprehensive French Grammar Guide',
  topic: 'Grammar',
  difficulty: 'intermediate',
  sections: [
    { title: 'Introduction', content: 'Welcome to this comprehensive guide.', examples: [] },
    { title: 'Articles', content: 'Definite and indefinite articles.', examples: ['le livre', 'un livre'] },
    { title: 'Nouns', content: 'Masculine and feminine nouns.', examples: ['le chat', 'la table'] },
    { title: 'Adjectives', content: 'Descriptive adjectives.', examples: ['grand', 'petit'] },
    { title: 'Verbs', content: 'Verb conjugation patterns.', examples: ['parler', 'manger'] },
    { title: 'Adverbs', content: 'Modifying verbs with adverbs.', examples: ['rapidement', 'bien'] },
    { title: 'Prepositions', content: 'Common prepositions.', examples: ['à', 'de'] },
    { title: 'Conjunctions', content: 'Connecting ideas.', examples: ['et', 'ou'] },
  ],
}

// Mock related lessons
const mockAllLessons: LessonSummary[] = [
  { id: 'verb-conjugation', title: 'Verb Conjugation', topic: 'Verbs', difficulty: 'beginner' },
  { id: 'articles', title: 'French Articles', topic: 'Nouns and Adjectives', difficulty: 'beginner' },
  { id: 'nouns', title: 'Nouns and Gender', topic: 'Nouns and Adjectives', difficulty: 'beginner' },
  { id: 'adjectives', title: 'Adjective Agreement', topic: 'Nouns and Adjectives', difficulty: 'intermediate' },
  { id: 'pronouns', title: 'Object Pronouns', topic: 'Pronouns', difficulty: 'intermediate' },
  { id: 'future-tense', title: 'Future Tense', topic: 'Verbs', difficulty: 'intermediate' },
]

// Mock lesson with no examples
const mockLessonNoExamples: Lesson = {
  id: 'grammar-overview',
  title: 'Grammar Overview',
  topic: 'Grammar',
  difficulty: 'beginner',
  sections: [
    {
      title: 'Basic Structure',
      content: 'French sentence structure follows a **subject-verb-object** pattern, similar to English but with some differences in word order.',
      examples: [],
    },
    {
      title: 'Word Order',
      content: 'In French, adjectives usually come *after* the noun they describe.',
      examples: [],
    },
  ],
}

// Mock lesson with code blocks (for inline code)
const mockLessonWithCode: Lesson = {
  id: 'technical-french',
  title: 'Technical French for Developers',
  topic: 'Vocabulary',
  difficulty: 'advanced',
  sections: [
    {
      title: 'Commands',
      content: 'Use `git commit` to save your changes. The `git push` command sends changes to the remote repository.',
      examples: ['git clone repo', 'git status'],
    },
  ],
}

// Story: Default Lesson Viewer
// Shows a lesson with markdown content, examples, and a TOC
export const Default: Story = {
  args: {
    lesson: mockLessonWithMarkdown,
    allLessons: mockAllLessons,
  },
}

// Story: Lesson with Many Sections
// Demonstrates the TOC with many sections
export const WithManySections: Story = {
  args: {
    lesson: mockLessonWithManySections,
    allLessons: mockAllLessons,
  },
}

// Story: Lesson with Related Lessons
// Shows the related lessons section
export const WithRelatedLessons: Story = {
  args: {
    lesson: mockLessonWithMarkdown,
    allLessons: mockAllLessons,
  },
}

// Story: Lesson without Examples
// Shows how it looks when a lesson has no examples
export const WithoutExamples: Story = {
  args: {
    lesson: mockLessonNoExamples,
    allLessons: [],
  },
}

// Story: Lesson with Code Blocks
// Demonstrates inline code rendering
export const WithCodeBlocks: Story = {
  args: {
    lesson: mockLessonWithCode,
    allLessons: [],
  },
}

// Story: Without Related Lessons Data
// Shows graceful handling when allLessons is not provided
export const WithoutAllLessons: Story = {
  args: {
    lesson: mockLessonWithMarkdown,
    // allLessons not provided - related lessons section should not display
  },
}

// Story: With Back Handler
// Demonstrates the back button functionality
export const WithBackHandler: Story = {
  args: {
    lesson: mockLessonWithMarkdown,
    allLessons: mockAllLessons,
    onBack: () => console.log('Back clicked'),
  },
}
