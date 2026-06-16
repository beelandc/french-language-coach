/**
 * DeckSearch Component
 * 
 * Provides search and filter controls for the DeckBrowser.
 * Includes:
 * - Search input (text search on deck name and description)
 * - Tag filter dropdown
 * - Sort options dropdown
 * 
 * Follows the pattern of LessonSearch for consistency.
 */

import { useCallback } from 'react'
import type { DeckSearchProps, DeckSortOption } from '../types/index'

/**
 * Sort options for the sort dropdown
 */
const SORT_OPTIONS: { value: DeckSortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'created-desc', label: 'Created Date (Newest)' },
  { value: 'created-asc', label: 'Created Date (Oldest)' },
  { value: 'cards-desc', label: 'Card Count (Most)' },
  { value: 'cards-asc', label: 'Card Count (Least)' },
  { value: 'progress-desc', label: 'Progress (Highest)' },
  { value: 'progress-asc', label: 'Progress (Lowest)' },
]

/**
 * DeckSearch component - search and filter controls for decks
 * 
 * @param props - Component props
 * @param props.onSearch - Callback when search query changes
 * @param props.onTagFilter - Callback when tag filter changes
 * @param props.onSort - Callback when sort option changes
 * @param props.onClearFilters - Callback to clear all filters
 * @param props.searchQuery - Current search query value
 * @param props.tagFilter - Current tag filter value
 * @param props.sortBy - Current sort option
 * @param props.availableTags - List of available tags for filtering
 * @returns JSX Element
 */
export default function DeckSearch({
  onSearch,
  onTagFilter,
  onSort,
  onClearFilters,
  searchQuery,
  tagFilter,
  sortBy,
  availableTags,
}: DeckSearchProps) {
  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value)
    },
    [onSearch]
  )

  // Handle tag filter change
  const handleTagChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTagFilter(e.target.value)
    },
    [onTagFilter]
  )

  // Handle sort change
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSort(e.target.value as DeckSortOption)
    },
    [onSort]
  )

  // Handle form submission (prevent default)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  // Handle clear all filters
  const handleClear = useCallback(() => {
    onSearch('')
    onTagFilter('')
    onSort('name-asc')
    onClearFilters()
  }, [onSearch, onTagFilter, onSort, onClearFilters])

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || tagFilter !== '' || sortBy !== 'name-asc'

  return (
    <div className="deck-search" data-testid="deck-search">
      <form onSubmit={handleSubmit} className="deck-search-form">
        <div className="deck-search-controls">
          {/* Search Input */}
          <div className="deck-search-input-group">
            <label htmlFor="deck-search-input" className="visually-hidden">
              Search decks
            </label>
            <input
              type="text"
              id="deck-search-input"
              className="deck-search-input"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search decks by name or description"
              data-testid="deck-search-input"
            />
          </div>

          {/* Tag Filter */}
          <div className="deck-filter-group">
            <label htmlFor="deck-tag-filter" className="deck-filter-label">
              Tag
            </label>
            <select
              id="deck-tag-filter"
              className="deck-filter-select"
              value={tagFilter}
              onChange={handleTagChange}
              aria-label="Filter decks by tag"
              data-testid="deck-tag-filter"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div className="deck-filter-group">
            <label htmlFor="deck-sort-filter" className="deck-filter-label">
              Sort by
            </label>
            <select
              id="deck-sort-filter"
              className="deck-filter-select"
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort decks by"
              data-testid="deck-sort-filter"
            >
              {SORT_OPTIONS.map((option) => (
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
              className="btn-secondary deck-clear-filters"
              aria-label="Clear all filters"
              data-testid="deck-clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
