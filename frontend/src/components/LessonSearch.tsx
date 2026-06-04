/**
 * LessonSearch Component
 * 
 * Provides search and filter controls for the LessonBrowser.
 * Includes:
 * - Search input (text search on title and topic)
 * - Topic filter input
 * - Difficulty filter dropdown
 * 
 * Matches the pattern of DifficultySelector for consistency.
 */

import { useCallback } from 'react'
import type { LessonSearchProps, Difficulty } from '../types/index'

/**
 * Difficulty options for the filter dropdown
 */
const DIFFICULTY_OPTIONS: { value: Difficulty | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

/**
 * LessonSearch component - search and filter controls for lessons
 * 
 * @param props - Component props
 * @param props.onSearch - Callback when search query changes
 * @param props.onTopicFilter - Callback when topic filter changes
 * @param props.onDifficultyFilter - Callback when difficulty filter changes
 * @param props.searchQuery - Current search query value
 * @param props.topicFilter - Current topic filter value
 * @param props.difficultyFilter - Current difficulty filter value
 * @returns JSX Element
 */
export default function LessonSearch({
  onSearch,
  onTopicFilter,
  onDifficultyFilter,
  searchQuery,
  topicFilter,
  difficultyFilter,
}: LessonSearchProps) {
  // Handle search input change with debounce pattern
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value)
    },
    [onSearch]
  )

  // Handle topic filter change
  const handleTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTopicFilter(e.target.value)
    },
    [onTopicFilter]
  )

  // Handle difficulty filter change
  const handleDifficultyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onDifficultyFilter(e.target.value as Difficulty | '')
    },
    [onDifficultyFilter]
  )

  // Handle form submission (prevent default)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  // Handle clear all filters
  const handleClear = () => {
    onSearch('')
    onTopicFilter('')
    onDifficultyFilter('')
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || topicFilter !== '' || difficultyFilter !== ''

  return (
    <div className="lesson-search" data-testid="lesson-search">
      <form onSubmit={handleSubmit} className="lesson-search-form">
        <div className="lesson-search-controls">
          {/* Search Input */}
          <div className="lesson-search-input-group">
            <label htmlFor="lesson-search-input" className="visually-hidden">
              Search lessons
            </label>
            <input
              type="text"
              id="lesson-search-input"
              className="lesson-search-input"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search lessons by title or topic"
              data-testid="lesson-search-input"
            />
          </div>

          {/* Topic Filter */}
          <div className="lesson-filter-group">
            <label htmlFor="lesson-topic-filter" className="lesson-filter-label">
              Topic
            </label>
            <input
              type="text"
              id="lesson-topic-filter"
              className="lesson-filter-input"
              placeholder="Filter by topic"
              value={topicFilter}
              onChange={handleTopicChange}
              aria-label="Filter lessons by topic"
              data-testid="lesson-topic-filter"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="lesson-filter-group">
            <label htmlFor="lesson-difficulty-filter" className="lesson-filter-label">
              Difficulty
            </label>
            <select
              id="lesson-difficulty-filter"
              className="lesson-filter-select"
              value={difficultyFilter}
              onChange={handleDifficultyChange}
              aria-label="Filter lessons by difficulty"
              data-testid="lesson-difficulty-filter"
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary lesson-clear-filters"
              aria-label="Clear all filters"
              data-testid="lesson-clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
