/**
 * Storybook stories for DeckSearch component
 * 
 * Stories for Issue #67: Create DeckBrowser React component
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import DeckSearch from './DeckSearch'
import type { DeckSearchProps, DeckSortOption } from '../types/index'

const meta = {
  title: 'Components/DeckSearch',
  component: DeckSearch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    searchQuery: { control: 'text' },
    tagFilter: { control: 'select' },
    sortBy: { control: 'select' },
    availableTags: { control: 'object' },
    onSearch: { action: 'searched' },
    onTagFilter: { action: 'tag filtered' },
    onSort: { action: 'sorted' },
    onClearFilters: { action: 'cleared filters' },
  },
} satisfies Meta<typeof DeckSearch>

export default meta

type Story = StoryObj<typeof meta>

// Available tags for stories
const availableTags = ['travel', 'beginner', 'food', 'essential', 'advanced', 'business', 'common']

const sortOptions: DeckSortOption[] = [
  'name-asc',
  'name-desc',
  'created-asc',
  'created-desc',
  'cards-asc',
  'cards-desc',
  'progress-asc',
  'progress-desc',
]

const defaultOnSearch = (query: string) => console.log(`Search: ${query}`)
const defaultOnTagFilter = (tag: string) => console.log(`Tag filter: ${tag}`)
const defaultOnSort = (sortBy: DeckSortOption) => console.log(`Sort by: ${sortBy}`)
const defaultOnClearFilters = () => console.log('Clear filters')

/**
 * Default DeckSearch with no active filters
 */
export const Default: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with search query
 */
export const WithSearchQuery: Story = {
  args: {
    searchQuery: 'Travel',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with tag filter applied
 */
export const WithTagFilter: Story = {
  args: {
    searchQuery: '',
    tagFilter: 'travel',
    sortBy: 'name-asc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with sort option selected
 */
export const WithSortOption: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'cards-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with all filters active (shows clear button)
 */
export const AllFiltersActive: Story = {
  args: {
    searchQuery: 'Vocabulary',
    tagFilter: 'beginner',
    sortBy: 'progress-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with empty available tags
 */
export const EmptyTags: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags: [],
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * Interactive DeckSearch with state management
 * This story demonstrates the component with interactive state
 */
export const Interactive: Story = {
  render: (args) => {
    const [searchQuery, setSearchQuery] = useState(args.searchQuery)
    const [tagFilter, setTagFilter] = useState(args.tagFilter)
    const [sortBy, setSortBy] = useState<DeckSortOption>(args.sortBy)

    return (
      <DeckSearch
        {...args}
        searchQuery={searchQuery}
        tagFilter={tagFilter}
        sortBy={sortBy}
        onSearch={setSearchQuery}
        onTagFilter={setTagFilter}
        onSort={setSortBy}
        onClearFilters={() => {
          setSearchQuery('')
          setTagFilter('')
          setSortBy('name-asc')
        }}
      />
    )
  },
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch sorted by name descending
 */
export const SortByNameDesc: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch sorted by card count
 */
export const SortByCardCount: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'cards-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch sorted by progress
 */
export const SortByProgress: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'progress-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with many available tags
 */
export const ManyTags: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags: [
      'travel', 'beginner', 'food', 'essential', 'advanced', 
      'business', 'common', 'frequent', 'useful', 'daily',
      'conversation', 'grammar', 'verbs', 'nouns', 'adjectives',
    ],
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with special characters in tag names
 */
export const SpecialCharacterTags: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'name-asc',
    availableTags: ['tag & special', 'tag with "quotes"', "tag <with> brackets", 'normal-tag'],
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch sorted by creation date (newest first)
 */
export const SortByCreationDateNewest: Story = {
  args: {
    searchQuery: '',
    tagFilter: '',
    sortBy: 'created-desc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}

/**
 * DeckSearch with search query and tag filter combined
 */
export const SearchAndTagFilter: Story = {
  args: {
    searchQuery: 'French',
    tagFilter: 'essential',
    sortBy: 'name-asc',
    availableTags,
    onSearch: defaultOnSearch,
    onTagFilter: defaultOnTagFilter,
    onSort: defaultOnSort,
    onClearFilters: defaultOnClearFilters,
  },
}
