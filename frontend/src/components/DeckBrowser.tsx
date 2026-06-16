/**
 * DeckBrowser Component
 * 
 * Main component for browsing, searching, filtering, and viewing vocabulary decks.
 * Uses the backend API endpoint GET /vocabulary/decks/ for data.
 * 
 * Features:
 * - Displays decks in a grid layout
 * - Search functionality (client-side filtering on name and description)
 * - Tag filtering (client-side filtering on aggregated card tags)
 * - Sort options (client-side sorting)
 * - Progress indicators showing cards learned
 * - Loading, error, and empty states
 * - Responsive design
 * 
 * Follows the pattern of LessonBrowser for consistency.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { vocabularyApi } from '../utils/api'
import DeckCard from './DeckCard'
import DeckSearch from './DeckSearch'
import type { DeckBrowserProps, DeckWithProgress, DeckSummary, CardSummary, DeckPaginationInfo, DeckSortOption } from '../types/index'

/**
 * Default number of decks per page
 */
const DEFAULT_PER_PAGE = 12

/**
 * A card is considered "learned" if its interval > 1 (SM-2 algorithm convention)
 */
const isCardLearned = (card: CardSummary): boolean => {
  return card.interval > 1
}

/**
 * DeckBrowser component - main component for browsing vocabulary decks
 * 
 * @param props - Component props
 * @param props.initialSearch - Optional initial search query
 * @param props.initialTag - Optional initial tag filter
 * @param props.initialSort - Optional initial sort option
 * @returns JSX Element
 */
export default function DeckBrowser({
  initialSearch = '',
  initialTag = '',
  initialSort = 'name-asc',
}: DeckBrowserProps) {
  const navigate = useNavigate()

  // State for decks data
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [pagination, setPagination] = useState<DeckPaginationInfo>({
    total: 0,
    page: 1,
    per_page: DEFAULT_PER_PAGE,
    total_pages: 0,
  })

  // State for filters and sorting
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [tagFilter, setTagFilter] = useState(initialTag)
  const [sortBy, setSortBy] = useState<DeckSortOption>(initialSort)

  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for all cards data (needed for progress calculation and tag aggregation)
  const [allCardsByDeck, setAllCardsByDeck] = useState<Map<number, CardSummary[]>>(new Map())

  // Current page state
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch decks from API with current page
  const fetchDecks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await vocabularyApi.listDecks(currentPage, DEFAULT_PER_PAGE)

      setDecks(response.decks)
      setPagination(response.pagination)

      // Fetch all cards for all decks to calculate progress and get tags
      await fetchCardsForDecks(response.decks)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load decks'
      setError(errorMessage)
      setDecks([])
      setAllCardsByDeck(new Map())
      setPagination({
        total: 0,
        page: 1,
        per_page: DEFAULT_PER_PAGE,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  // Fetch cards for a list of decks
  const fetchCardsForDecks = useCallback(async (deckList: DeckSummary[]) => {
    const cardsMap = new Map<number, CardSummary[]>()

    // Fetch cards for each deck
    for (const deck of deckList) {
      try {
        // Fetch all cards for this deck (use a high per_page to get all in one request)
        const cardsResponse = await vocabularyApi.listDeckCards(deck.id, 1, 1000)
        cardsMap.set(deck.id, cardsResponse.cards)
      } catch (err) {
        // If we can't fetch cards for a deck, use empty array
        cardsMap.set(deck.id, [])
      }
    }

    setAllCardsByDeck(cardsMap)
  }, [])

  // Fetch decks when page changes
  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [tagFilter])

  // Enrich deck data with progress information and tags
  const decksWithProgress = useMemo<DeckWithProgress[]>(() => {
    return decks.map((deck) => {
      const deckCards = allCardsByDeck.get(deck.id) || []
      
      // Calculate learned count (cards with interval > 1)
      const learnedCount = deckCards.filter(isCardLearned).length
      
      // Calculate progress percentage
      const progressPercent = deck.card_count > 0 
        ? Math.round((learnedCount / deck.card_count) * 100) 
        : 0

      // Aggregate unique tags from all cards in this deck
      const tags: string[] = []
      deckCards.forEach((card) => {
        if (card.tags) {
          card.tags.forEach((tag) => {
            if (tag && !tags.includes(tag)) {
              tags.push(tag)
            }
          })
        }
      })

      return {
        ...deck,
        learned_count: learnedCount,
        progress_percent: progressPercent,
        tags,
      }
    })
  }, [decks, allCardsByDeck])

  // Get all available tags across all decks
  const availableTags = useMemo<string[]>(() => {
    const allTags: Set<string> = new Set()
    decksWithProgress.forEach((deck) => {
      deck.tags.forEach((tag) => allTags.add(tag))
    })
    return Array.from(allTags).sort()
  }, [decksWithProgress])

  // Filter decks by search query (name and description)
  const filteredDecksBySearch = useMemo<DeckWithProgress[]>(() => {
    if (!searchQuery) {
      return decksWithProgress
    }

    const query = searchQuery.toLowerCase()
    return decksWithProgress.filter(
      (deck) =>
        deck.name.toLowerCase().includes(query) ||
        (deck.description && deck.description.toLowerCase().includes(query))
    )
  }, [decksWithProgress, searchQuery])

  // Filter decks by tag (decks that have cards with the selected tag)
  const filteredDecksByTag = useMemo<DeckWithProgress[]>(() => {
    if (!tagFilter) {
      return filteredDecksBySearch
    }

    return filteredDecksBySearch.filter((deck) =>
      deck.tags.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase())
    )
  }, [filteredDecksBySearch, tagFilter])

  // Sort decks based on sort option
  const sortedDecks = useMemo<DeckWithProgress[]>(() => {
    const decksToSort = [...filteredDecksByTag]

    switch (sortBy) {
      case 'name-asc':
        return decksToSort.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return decksToSort.sort((a, b) => b.name.localeCompare(a.name))
      case 'created-asc':
        return decksToSort.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'created-desc':
        return decksToSort.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'cards-asc':
        return decksToSort.sort((a, b) => a.card_count - b.card_count)
      case 'cards-desc':
        return decksToSort.sort((a, b) => b.card_count - a.card_count)
      case 'progress-asc':
        return decksToSort.sort((a, b) => a.progress_percent - b.progress_percent)
      case 'progress-desc':
        return decksToSort.sort((a, b) => b.progress_percent - a.progress_percent)
      default:
        return decksToSort.sort((a, b) => a.name.localeCompare(b.name))
    }
  }, [filteredDecksByTag, sortBy])

  // Check if any filters are active (for empty state message)
  const hasActiveFilters = useMemo(
    () => searchQuery !== '' || tagFilter !== '' || sortBy !== 'name-asc',
    [searchQuery, tagFilter, sortBy]
  )

  // Handle deck card click - navigate to deck detail (or deck cards view)
  const handleDeckClick = useCallback(
    (deckId: number) => {
      navigate(`/vocabulary/decks/${deckId}`)
    },
    [navigate]
  )

  // Handle search change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle tag filter change
  const handleTagFilter = useCallback((tag: string) => {
    setTagFilter(tag)
  }, [])

  // Handle sort change
  const handleSort = useCallback((sortOption: DeckSortOption) => {
    setSortBy(sortOption)
  }, [])

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setTagFilter('')
    setSortBy('name-asc')
    setCurrentPage(1)
  }, [])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchDecks()
  }, [fetchDecks])

  // Render loading state
  if (isLoading && sortedDecks.length === 0) {
    return (
      <div className="deck-browser" data-testid="deck-browser">
        <div className="deck-browser-header">
          <h2 className="deck-browser-title">Vocabulary Decks</h2>
        </div>

        <DeckSearch
          searchQuery={searchQuery}
          tagFilter={tagFilter}
          sortBy={sortBy}
          availableTags={availableTags}
          onSearch={handleSearch}
          onTagFilter={handleTagFilter}
          onSort={handleSort}
          onClearFilters={handleClearFilters}
        />

        <div className="deck-loading" data-testid="deck-loading">
          <div className="spinner-large"></div>
          <p>Loading decks...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="deck-browser" data-testid="deck-browser">
        <div className="deck-browser-header">
          <h2 className="deck-browser-title">Vocabulary Decks</h2>
        </div>

        <DeckSearch
          searchQuery={searchQuery}
          tagFilter={tagFilter}
          sortBy={sortBy}
          availableTags={availableTags}
          onSearch={handleSearch}
          onTagFilter={handleTagFilter}
          onSort={handleSort}
          onClearFilters={handleClearFilters}
        />

        <div className="deck-error" data-testid="deck-error">
          <div className="error-message" data-testid="deck-error-message">
            {error}
          </div>
          <button
            onClick={handleRetry}
            className="btn-primary"
            data-testid="deck-retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render empty state
  if (sortedDecks.length === 0) {
    return (
      <div className="deck-browser" data-testid="deck-browser">
        <div className="deck-browser-header">
          <h2 className="deck-browser-title">Vocabulary Decks</h2>
          <span className="deck-count" data-testid="deck-count">
            {pagination.total} decks
          </span>
        </div>

        <DeckSearch
          searchQuery={searchQuery}
          tagFilter={tagFilter}
          sortBy={sortBy}
          availableTags={availableTags}
          onSearch={handleSearch}
          onTagFilter={handleTagFilter}
          onSort={handleSort}
          onClearFilters={handleClearFilters}
        />

        <div className="deck-empty" data-testid="deck-empty">
          {hasActiveFilters ? (
            <div>
              <p className="deck-empty-message">
                No decks match your filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="btn-secondary"
                data-testid="deck-clear-all-filters"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <p className="deck-empty-message">
              No decks found. Create your first deck to get started!
            </p>
          )}
        </div>
      </div>
    )
  }

  // Render decks with pagination
  return (
    <div className="deck-browser" data-testid="deck-browser">
      <div className="deck-browser-header">
        <h2 className="deck-browser-title">Vocabulary Decks</h2>
        <span className="deck-count" data-testid="deck-count">
          {pagination.total} decks
        </span>
      </div>

      <DeckSearch
        searchQuery={searchQuery}
        tagFilter={tagFilter}
        sortBy={sortBy}
        availableTags={availableTags}
        onSearch={handleSearch}
        onTagFilter={handleTagFilter}
        onSort={handleSort}
        onClearFilters={handleClearFilters}
      />

      {/* Results count after filtering */}
      {hasActiveFilters && sortedDecks.length < pagination.total && (
        <div className="deck-results-info" data-testid="deck-results-info">
          Showing {sortedDecks.length} of {pagination.total} decks
        </div>
      )}

      {/* Decks Grid */}
      <div className="decks-grid" data-testid="decks-grid">
        {sortedDecks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onClick={handleDeckClick}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {sortedDecks.length > 0 && (
        <div className="deck-pagination" data-testid="deck-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="deck-pagination-btn"
            aria-label="Previous page"
            data-testid="deck-pagination-prev"
          >
            Previous
          </button>

          <span className="deck-pagination-info" data-testid="deck-pagination-info">
            Page {currentPage} of {pagination.total_pages || 1}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= (pagination.total_pages || 1)}
            className="deck-pagination-btn"
            aria-label="Next page"
            data-testid="deck-pagination-next"
          >
            Next
          </button>
        </div>
      )}

      {/* Loading indicator when fetching more pages */}
      {isLoading && sortedDecks.length > 0 && (
        <div className="deck-loading" data-testid="deck-loading-more">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  )
}
