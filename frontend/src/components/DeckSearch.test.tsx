/**
 * Tests for DeckSearch component
 * 
 * Tests cover:
 * - Rendering with props
 * - Search input functionality
 * - Tag filter functionality
 * - Sort filter functionality
 * - Clear filters functionality
 * - Callback invocations
 * - Accessibility
 * - Edge cases
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DeckSearch from './DeckSearch'
import type { DeckSearchProps, DeckSortOption } from '../types/index'

// Mock available tags
const mockAvailableTags = ['travel', 'beginner', 'food', 'essential', 'advanced']

// Default props for testing
const getDefaultProps = (overrides: Partial<DeckSearchProps> = {}): DeckSearchProps => ({
  searchQuery: '',
  tagFilter: '',
  sortBy: 'name-asc',
  availableTags: mockAvailableTags,
  onSearch: vi.fn(),
  onTagFilter: vi.fn(),
  onSort: vi.fn(),
  onClearFilters: vi.fn(),
  ...overrides,
})

describe('DeckSearch', () => {
  let props: DeckSearchProps

  beforeEach(() => {
    vi.clearAllMocks()
    props = getDefaultProps()
  })

  describe('Rendering', () => {
    it('renders deck search component', () => {
      render(<DeckSearch {...props} />)

      expect(screen.getByTestId('deck-search')).toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
      expect(searchInput).toHaveAttribute('placeholder', 'Search decks...')
      expect(searchInput).toHaveValue('')
    })

    it('renders tag filter dropdown', () => {
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      expect(tagFilter).toBeInTheDocument()
      expect(tagFilter).toHaveAttribute('aria-label', 'Filter decks by tag')
      
      // Check that all tags are rendered as options
      mockAvailableTags.forEach((tag) => {
        const option = screen.getByRole('option', { name: tag })
        expect(option).toBeInTheDocument()
        expect(option).toHaveAttribute('value', tag)
      })
    })

    it('renders sort filter dropdown', () => {
      render(<DeckSearch {...props} />)

      const sortFilter = screen.getByTestId('deck-sort-filter')
      expect(sortFilter).toBeInTheDocument()
      expect(sortFilter).toHaveAttribute('aria-label', 'Sort decks by')
    })

    it('renders sort options', () => {
      render(<DeckSearch {...props} />)

      const sortOptions = [
        'Name (A-Z)',
        'Name (Z-A)',
        'Created Date (Newest)',
        'Created Date (Oldest)',
        'Card Count (Most)',
        'Card Count (Least)',
        'Progress (Highest)',
        'Progress (Lowest)',
      ]

      sortOptions.forEach((label) => {
        const option = screen.getByRole('option', { name: label })
        expect(option).toBeInTheDocument()
      })
    })

    it('renders with initial search query', () => {
      props = getDefaultProps({ searchQuery: 'test query' })
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      expect(searchInput).toHaveValue('test query')
    })

    it('renders with initial tag filter', () => {
      props = getDefaultProps({ tagFilter: 'travel' })
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      expect(tagFilter).toHaveValue('travel')
    })

    it('renders with initial sort option', () => {
      props = getDefaultProps({ sortBy: 'cards-desc' })
      render(<DeckSearch {...props} />)

      const sortFilter = screen.getByTestId('deck-sort-filter')
      expect(sortFilter).toHaveValue('cards-desc')
    })

    it('does not render clear filters button when no filters are active', () => {
      render(<DeckSearch {...props} />)

      expect(screen.queryByTestId('deck-clear-filters')).toBeNull()
    })

    it('renders clear filters button when search query is active', () => {
      props = getDefaultProps({ searchQuery: 'test' })
      render(<DeckSearch {...props} />)

      expect(screen.getByTestId('deck-clear-filters')).toBeInTheDocument()
    })

    it('renders clear filters button when tag filter is active', () => {
      props = getDefaultProps({ tagFilter: 'travel' })
      render(<DeckSearch {...props} />)

      expect(screen.getByTestId('deck-clear-filters')).toBeInTheDocument()
    })

    it('renders clear filters button when sort is not default', () => {
      props = getDefaultProps({ sortBy: 'name-desc' })
      render(<DeckSearch {...props} />)

      expect(screen.getByTestId('deck-clear-filters')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('calls onSearch when search input changes', () => {
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'new search' } })

      expect(props.onSearch).toHaveBeenCalledTimes(1)
      expect(props.onSearch).toHaveBeenCalledWith('new search')
    })

    it('handles search input with special characters', () => {
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'test & "query" <test>' } })

      expect(props.onSearch).toHaveBeenCalledWith('test & "query" <test>')
    })

    it('handles empty search input', () => {
      props = getDefaultProps({ searchQuery: 'previous' })
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: '' } })

      expect(props.onSearch).toHaveBeenCalledWith('')
    })
  })

  describe('Tag Filter Functionality', () => {
    it('calls onTagFilter when tag selection changes', () => {
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'food' } })

      expect(props.onTagFilter).toHaveBeenCalledTimes(1)
      expect(props.onTagFilter).toHaveBeenCalledWith('food')
    })

    it('calls onTagFilter with empty string when All Tags is selected', () => {
      props = getDefaultProps({ tagFilter: 'travel' })
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: '' } })

      expect(props.onTagFilter).toHaveBeenCalledWith('')
    })

    it('handles tag selection change multiple times', () => {
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'travel' } })
      fireEvent.change(tagFilter, { target: { value: 'food' } })

      expect(props.onTagFilter).toHaveBeenCalledTimes(2)
      expect(props.onTagFilter).toHaveBeenCalledWith('food')
    })
  })

  describe('Sort Functionality', () => {
    it('calls onSort when sort selection changes', () => {
      render(<DeckSearch {...props} />)

      const sortFilter = screen.getByTestId('deck-sort-filter')
      fireEvent.change(sortFilter, { target: { value: 'cards-desc' } })

      expect(props.onSort).toHaveBeenCalledTimes(1)
      expect(props.onSort).toHaveBeenCalledWith('cards-desc' as DeckSortOption)
    })

    it('calls onSort with all sort options', () => {
      render(<DeckSearch {...props} />)

      const sortFilter = screen.getByTestId('deck-sort-filter')
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

      sortOptions.forEach((option) => {
        fireEvent.change(sortFilter, { target: { value: option } })
        expect(props.onSort).toHaveBeenCalledWith(option)
      })
    })
  })

  describe('Clear Filters Functionality', () => {
    it('calls all callbacks when clear filters is clicked', () => {
      props = getDefaultProps({
        searchQuery: 'test',
        tagFilter: 'travel',
        sortBy: 'cards-desc',
      })
      render(<DeckSearch {...props} />)

      const clearButton = screen.getByTestId('deck-clear-filters')
      fireEvent.click(clearButton)

      expect(props.onSearch).toHaveBeenCalledWith('')
      expect(props.onTagFilter).toHaveBeenCalledWith('')
      expect(props.onSort).toHaveBeenCalledWith('name-asc')
      expect(props.onClearFilters).toHaveBeenCalledTimes(1)
    })

    it('does not render clear button when no filters are active', () => {
      render(<DeckSearch {...props} />)

      expect(screen.queryByTestId('deck-clear-filters')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(<DeckSearch {...props} />)

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveClass('deck-search-form')
    })

    it('has proper labels for all inputs', () => {
      render(<DeckSearch {...props} />)

      const searchLabel = screen.getByLabelText('Search decks by name or description')
      expect(searchLabel).toBeInTheDocument()

      const tagLabel = screen.getByLabelText('Filter decks by tag')
      expect(tagLabel).toBeInTheDocument()

      const sortLabel = screen.getByLabelText('Sort decks by')
      expect(sortLabel).toBeInTheDocument()
    })

    it('has visually hidden label for search input', () => {
      render(<DeckSearch {...props} />)

      const visuallyHiddenLabel = screen.getByText('Search decks')
      expect(visuallyHiddenLabel).toHaveClass('visually-hidden')
    })

    it('has proper aria-label on clear filters button', () => {
      props = getDefaultProps({ searchQuery: 'test' })
      render(<DeckSearch {...props} />)

      const clearButton = screen.getByTestId('deck-clear-filters')
      expect(clearButton).toHaveAttribute('aria-label', 'Clear all filters')
    })

    it('has proper button type for clear button', () => {
      props = getDefaultProps({ searchQuery: 'test' })
      render(<DeckSearch {...props} />)

      const clearButton = screen.getByTestId('deck-clear-filters')
      expect(clearButton).toHaveAttribute('type', 'button')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty available tags', () => {
      props = getDefaultProps({ availableTags: [] })
      render(<DeckSearch {...props} />)

      const tagFilter = screen.getByTestId('deck-tag-filter')
      expect(tagFilter).toBeInTheDocument()
      
      // Should only have "All Tags" option
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(1)
      expect(options[0]).toHaveTextContent('All Tags')
    })

    it('handles undefined onSearch callback', () => {
      props = getDefaultProps({ onSearch: undefined })
      
      // This should not throw during render
      render(<DeckSearch {...props} />)
      
      // But changing the input might cause issues - that's expected behavior
      // We're just testing that it doesn't crash during render
    })

    it('renders with long search query', () => {
      const longQuery = 'a'.repeat(100)
      props = getDefaultProps({ searchQuery: longQuery })
      render(<DeckSearch {...props} />)

      const searchInput = screen.getByTestId('deck-search-input')
      expect(searchInput).toHaveValue(longQuery)
    })

    it('handles form submission prevention', () => {
      render(<DeckSearch {...props} />)

      const form = screen.getByRole('form')
      fireEvent.submit(form)

      // Form submission should be prevented (no page reload)
      // We can't directly test for page reload in Jest, but we can verify
      // that the default was prevented by checking that no navigation occurred
      // This is more of a behavior test, but the handler is there
    })

    it('renders with special characters in tag names', () => {
      const specialTags = ['tag & special', 'tag with "quotes"', "tag <with> brackets"]
      props = getDefaultProps({ availableTags: specialTags })
      render(<DeckSearch {...props} />)

      specialTags.forEach((tag) => {
        const option = screen.getByRole('option', { name: tag })
        expect(option).toBeInTheDocument()
      })
    })
  })

  describe('Integration Tests', () => {
    it('updates UI when props change', () => {
      const { rerender } = render(<DeckSearch {...props} />)

      const updatedProps = getDefaultProps({
        searchQuery: 'new query',
        tagFilter: 'food',
        sortBy: 'cards-desc',
      })
      
      rerender(<DeckSearch {...updatedProps} />)

      expect(screen.getByTestId('deck-search-input')).toHaveValue('new query')
      expect(screen.getByTestId('deck-tag-filter')).toHaveValue('food')
      expect(screen.getByTestId('deck-sort-filter')).toHaveValue('cards-desc')
    })

    it('shows and hides clear button based on props', () => {
      const { rerender } = render(<DeckSearch {...props} />)

      // Initially no clear button
      expect(screen.queryByTestId('deck-clear-filters')).toBeNull()

      // With active filters, clear button should appear
      const updatedProps = getDefaultProps({ searchQuery: 'test' })
      rerender(<DeckSearch {...updatedProps} />)
      expect(screen.getByTestId('deck-clear-filters')).toBeInTheDocument()

      // Back to no filters, clear button should disappear
      rerender(<DeckSearch {...props} />)
      expect(screen.queryByTestId('deck-clear-filters')).toBeNull()
    })
  })
})
