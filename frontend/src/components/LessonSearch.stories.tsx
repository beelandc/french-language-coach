/**
 * Storybook stories for LessonSearch component
 */

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import LessonSearch from './LessonSearch'
import type { LessonSearchProps, Difficulty } from '../types/index'

const meta = {
  title: 'Components/LessonSearch',
  component: LessonSearch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSearch: { action: 'search' },
    onTopicFilter: { action: 'topicFilter' },
    onDifficultyFilter: { action: 'difficultyFilter' },
  },
} satisfies Meta<typeof LessonSearch>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Interactive LessonSearch with state management for Storybook
 */
function InteractiveLessonSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('')

  return (
    <div style={{ width: '100%', maxWidth: '800px', padding: '20px' }}>
      <LessonSearch
        searchQuery={searchQuery}
        topicFilter={topicFilter}
        difficultyFilter={difficultyFilter}
        onSearch={setSearchQuery}
        onTopicFilter={setTopicFilter}
        onDifficultyFilter={setDifficultyFilter}
      />
      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h4>Current Filters:</h4>
        <p>Search: {searchQuery || 'None'}</p>
        <p>Topic: {topicFilter || 'None'}</p>
        <p>Difficulty: {difficultyFilter || 'None'}</p>
      </div>
    </div>
  )
}

/**
 * Default LessonSearch with empty filters
 */
export const Default: Story = {
  args: {
    searchQuery: '',
    topicFilter: '',
    difficultyFilter: '',
    onSearch: (query) => console.log('Search:', query),
    onTopicFilter: (topic) => console.log('Topic filter:', topic),
    onDifficultyFilter: (difficulty) => console.log('Difficulty filter:', difficulty),
  },
}

/**
 * LessonSearch with search query filled
 */
export const WithSearchQuery: Story = {
  args: {
    searchQuery: 'verb',
    topicFilter: '',
    difficultyFilter: '',
    onSearch: (query) => console.log('Search:', query),
    onTopicFilter: (topic) => console.log('Topic filter:', topic),
    onDifficultyFilter: (difficulty) => console.log('Difficulty filter:', difficulty),
  },
}

/**
 * LessonSearch with topic filter filled
 */
export const WithTopicFilter: Story = {
  args: {
    searchQuery: '',
    topicFilter: 'conjugation',
    difficultyFilter: '',
    onSearch: (query) => console.log('Search:', query),
    onTopicFilter: (topic) => console.log('Topic filter:', topic),
    onDifficultyFilter: (difficulty) => console.log('Difficulty filter:', difficulty),
  },
}

/**
 * LessonSearch with difficulty filter filled
 */
export const WithDifficultyFilter: Story = {
  args: {
    searchQuery: '',
    topicFilter: '',
    difficultyFilter: 'intermediate',
    onSearch: (query) => console.log('Search:', query),
    onTopicFilter: (topic) => console.log('Topic filter:', topic),
    onDifficultyFilter: (difficulty) => console.log('Difficulty filter:', difficulty),
  },
}

/**
 * LessonSearch with all filters filled (shows Clear Filters button)
 */
export const WithAllFilters: Story = {
  args: {
    searchQuery: 'verb',
    topicFilter: 'conjugation',
    difficultyFilter: 'beginner',
    onSearch: (query) => console.log('Search:', query),
    onTopicFilter: (topic) => console.log('Topic filter:', topic),
    onDifficultyFilter: (difficulty) => console.log('Difficulty filter:', difficulty),
  },
}

/**
 * Interactive version for testing in Storybook
 */
export const Interactive: Story = {
  render: () => <InteractiveLessonSearch />,
}
