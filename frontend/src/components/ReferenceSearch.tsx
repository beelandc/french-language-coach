/**
 * ReferenceSearch Component
 * 
 * Provides search and filter controls for the ReferenceBrowser.
 * Includes:
 * - Search input (text search on term, definition, examples, common_pitfalls)
 * - Category filter dropdown
 * - Difficulty filter dropdown
 * - Clear filters button
 * 
 * Matches the pattern of LessonSearch for consistency.
 */

import { useCallback, useEffect, useState } from 'react'
import type { ReferenceSearchProps, ReferenceCategory, Difficulty } from '../types/index'

/**
 * Category options for the filter dropdown
 * Matches GrammarReferenceCategory enum
 */
const CATEGORY_OPTIONS: { value: ReferenceCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'Verbs', label: 'Verbs' },
  { value: 'Nouns', label: 'Nouns' },
  { value: 'Adjectives', label: 'Adjectives' },
  { value: 'Adverbs', label: 'Adverbs' },
  { value: 'Pronouns', label: 'Pronouns' },
  { value: 'Prepositions', label: 'Prepositions' },
  { value: 'Conjunctions', label: 'Conjunctions' },
  { value: 'Articles', label: 'Articles' },
  { value: 'Sentence Structure', label: 'Sentence Structure' },
  { value: 'Punctuation', label: 'Punctuation' },
  { value: 'Other', label: 'Other' },
]

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
 * ReferenceSearch component - search and filter controls for grammar references
 * 
 * @param props - Component props
 * @param props.onSearch - Callback when search query changes
 * @param props.onCategoryFilter - Callback when category filter changes
 * @param props.onDifficultyFilter - Callback when difficulty filter changes
 * @param props.searchQuery - Current search query value
 * @param props.categoryFilter - Current category filter value
 * @param props.difficultyFilter - Current difficulty filter value
 * @returns JSX Element
 */
export default function ReferenceSearch({
  onSearch,
  onCategoryFilter,
  onDifficultyFilter,
  searchQuery,
  categoryFilter,
  difficultyFilter,
}: ReferenceSearchProps) {
  // State for debounced search input
  const [inputValue, setInputValue] = useState(searchQuery)
  
  // Debounce search input to avoid rapid API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(inputValue)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [inputValue, onSearch])

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
    },
    []
  )

  // Handle category filter change
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onCategoryFilter(e.target.value as ReferenceCategory | '')
    },
    [onCategoryFilter]
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
    // Immediately trigger search on form submit (no debounce)
    onSearch(inputValue)
  }

  // Handle clear all filters
  const handleClear = () => {
    setInputValue('')
    onSearch('')
    onCategoryFilter('')
    onDifficultyFilter('')
  }

  // Check if any filters are active
  const hasActiveFilters = (
    inputValue !== '' || 
    categoryFilter !== '' || 
    difficultyFilter !== ''
  )

  return (
    <div className="reference-search" data-testid="reference-search">
      <form onSubmit={handleSubmit} className="reference-search-form">
        <div className="reference-search-controls">
          {/* Search Input */}
          <div className="reference-search-input-group">
            <label htmlFor="reference-search-input" className="visually-hidden">
              Search grammar reference
            </label>
            <input
              type="text"
              id="reference-search-input"
              className="reference-search-input"
              placeholder="Search grammar terms..."
              value={inputValue}
              onChange={handleSearchChange}
              aria-label="Search grammar reference by term, definition, examples, or common pitfalls"
              data-testid="reference-search-input"
            />
          </div>

          {/* Category Filter */}
          <div className="reference-filter-group">
            <label htmlFor="reference-category-filter" className="reference-filter-label">
              Category
            </label>
            <select
              id="reference-category-filter"
              className="reference-filter-select"
              value={categoryFilter}
              onChange={handleCategoryChange}
              aria-label="Filter references by category"
              data-testid="reference-category-filter"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="reference-filter-group">
            <label htmlFor="reference-difficulty-filter" className="reference-filter-label">
              Difficulty
            </label>
            <select
              id="reference-difficulty-filter"
              className="reference-filter-select"
              value={difficultyFilter}
              onChange={handleDifficultyChange}
              aria-label="Filter references by difficulty"
              data-testid="reference-difficulty-filter"
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
              className="btn-secondary reference-clear-filters"
              aria-label="Clear all filters"
              data-testid="reference-clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
