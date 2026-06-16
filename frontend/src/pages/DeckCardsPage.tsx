/**
 * DeckCardsPage
 * 
 * Page component for displaying all cards in a specific vocabulary deck.
 * Supports pagination, filtering, sorting, and card flipping.
 * 
 * Part of Issue #201: Implement vocabulary deck detail pages
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'
import Flashcard from '../components/Flashcard'
import { vocabularyApi } from '../utils/api'
import type { CardSummary, DeckSummary, CardListResponse, DeckPaginationInfo } from '../types/index'
import { CARD_SORT_OPTIONS } from '../types/index'

/**
 * Number of cards per page
 */
const CARDS_PER_PAGE = 10

/**
 * DeckCardsPage component - displays all cards in a specific deck
 * 
 * @returns JSX Element
 */
export default function DeckCardsPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()

  // State for deck data
  const [deck, setDeck] = useState<DeckSummary | null>(null)

  // State for cards data
  const [cards, setCards] = useState<CardSummary[]>([])
  const [pagination, setPagination] = useState<DeckPaginationInfo>({
    total: 0,
    page: 1,
    per_page: CARDS_PER_PAGE,
    total_pages: 0,
  })

  // State for filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sortBy, setSortBy] = useState<typeof CARD_SORT_OPTIONS[number]['value']>('front-asc')

  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for current page
  const [currentPage, setCurrentPage] = useState(1)

  // Derived deck ID (convert from string to number)
  const deckIdNum = useMemo(() => {
    return deckId ? parseInt(deckId, 10) : 0
  }, [deckId])

  // Fetch deck and cards data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch deck details
      const deckResponse = await vocabularyApi.getDeck(deckIdNum)
      setDeck(deckResponse)

      // Fetch cards for this deck with current page
      const cardsResponse: CardListResponse = await vocabularyApi.listDeckCards(
        deckIdNum,
        currentPage,
        CARDS_PER_PAGE
      )
      setCards(cardsResponse.cards)
      setPagination(cardsResponse.pagination)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cards'
      setError(errorMessage)
      setDeck(null)
      setCards([])
      setPagination({
        total: 0,
        page: 1,
        per_page: CARDS_PER_PAGE,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [deckIdNum, currentPage])

  // Fetch data on mount or when deckId or page changes
  useEffect(() => {
    if (deckIdNum > 0) {
      fetchData()
    } else {
      setError('Invalid deck ID')
      setIsLoading(false)
    }
  }, [fetchData, deckIdNum])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, tagFilter, sortBy])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchData()
  }, [fetchData])

  // Handle navigation back to vocabulary list
  const handleBackToVocabulary = useCallback(() => {
    navigate('/vocabulary')
  }, [navigate])

  // Handle navigation back to deck detail
  const handleBackToDeck = useCallback(() => {
    navigate(deckId ? `/vocabulary/decks/${deckId}` : '/vocabulary')
  }, [navigate, deckId])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Handle search change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle tag filter change
  const handleTagFilter = useCallback((tag: string) => {
    setTagFilter(tag)
  }, [])

  // Handle sort change
  const handleSort = useCallback((sortOption: string) => {
    setSortBy(sortOption as typeof CARD_SORT_OPTIONS[number]['value'])
  }, [])

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setTagFilter('')
    setSortBy('front-asc')
    setCurrentPage(1)
  }, [])

  // Get all available tags from cards
  const availableTags = useMemo<string[]>(() => {
    const allTags: Set<string> = new Set()
    cards.forEach((card) => {
      if (card.tags) {
        card.tags.forEach((tag) => {
          if (tag) {
            allTags.add(tag)
          }
        })
      }
    })
    return Array.from(allTags).sort()
  }, [cards])

  // Filter cards by search query and tag
  const filteredCards = useMemo<CardSummary[]>(() => {
    let result = [...cards]

    // Apply search filter (search in front and back)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (card) =>
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query)
      )
    }

    // Apply tag filter
    if (tagFilter) {
      result = result.filter((card) =>
        card.tags && card.tags.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase())
      )
    }

    return result
  }, [cards, searchQuery, tagFilter])

  // Sort filtered cards
  const sortedCards = useMemo<CardSummary[]>(() => {
    const cardsToSort = [...filteredCards]

    switch (sortBy) {
      case 'front-asc':
        return cardsToSort.sort((a, b) => a.front.localeCompare(b.front))
      case 'front-desc':
        return cardsToSort.sort((a, b) => b.front.localeCompare(a.front))
      case 'back-asc':
        return cardsToSort.sort((a, b) => a.back.localeCompare(b.back))
      case 'back-desc':
        return cardsToSort.sort((a, b) => b.back.localeCompare(a.back))
      case 'difficulty-asc':
        return cardsToSort.sort((a, b) => a.difficulty - b.difficulty)
      case 'difficulty-desc':
        return cardsToSort.sort((a, b) => b.difficulty - a.difficulty)
      case 'next-review-asc':
        return cardsToSort.sort((a, b) => new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime())
      case 'next-review-desc':
        return cardsToSort.sort((a, b) => new Date(b.next_review_date).getTime() - new Date(a.next_review_date).getTime())
      default:
        return cardsToSort.sort((a, b) => a.front.localeCompare(b.front))
    }
  }, [filteredCards, sortBy])

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () => searchQuery !== '' || tagFilter !== '' || sortBy !== 'front-asc',
    [searchQuery, tagFilter, sortBy]
  )

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => [
    { label: 'Vocabulary', path: '/vocabulary' },
    { label: deck?.name || 'Deck', path: deckId ? `/vocabulary/decks/${deckId}` : undefined },
    { label: 'Cards' },
  ], [deck?.name, deckId])

  // Check if any cards match filters
  const hasFilteredResults = sortedCards.length > 0
  const hasNoResults = filteredCards.length === 0 && hasActiveFilters

  // Render loading state
  if (isLoading && !deck && !error) {
    return (
      <div className="page-container" data-testid="deck-cards-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-cards-loading" data-testid="deck-cards-loading">
          <div className="spinner-large"></div>
          <p>Loading cards...</p>
        </div>
      </div>
    )
  }

  // Render error state (deck not found or API error)
  if (error && !deck) {
    return (
      <div className="page-container" data-testid="deck-cards-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-cards-error" data-testid="deck-cards-error">
          <div className="error-message" data-testid="deck-cards-error-message">
            {error}
          </div>
          <div className="deck-cards-error-actions">
            <button 
              onClick={handleRetry}
              className="btn-primary"
              data-testid="deck-cards-retry-button"
            >
              Retry
            </button>
            <button 
              onClick={handleBackToVocabulary}
              className="btn-secondary"
              data-testid="deck-cards-back-button"
            >
              Back to Vocabulary
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render deck not found (deck is null but no error - shouldn't happen but just in case)
  if (!deck) {
    return (
      <div className="page-container" data-testid="deck-cards-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-cards-not-found" data-testid="deck-cards-not-found">
          <h2>Deck Not Found</h2>
          <p>This deck doesn't exist or has been deleted.</p>
          <button 
            onClick={handleBackToVocabulary}
            className="btn-primary"
            data-testid="deck-cards-back-button"
          >
            Back to Vocabulary
          </button>
        </div>
      </div>
    )
  }

  // Render deck cards page
  return (
    <div className="page-container" data-testid="deck-cards-page">
      <Breadcrumb items={breadcrumbItems} />

      <header className="deck-cards-header" data-testid="deck-cards-header">
        <div className="deck-cards-header-content">
          <h1 className="deck-cards-title" data-testid="deck-cards-title">
            {deck.name} - All Cards
          </h1>
          
          <span className="deck-cards-count" data-testid="deck-cards-count">
            {pagination.total} {pagination.total === 1 ? 'card' : 'cards'}
          </span>
        </div>
        
        {deck.description && (
          <p className="deck-cards-description" data-testid="deck-cards-description">
            {deck.description}
          </p>
        )}
      </header>

      {/* Filters and Sort Controls */}
      <section className="deck-cards-filters" data-testid="deck-cards-filters">
        <h2 className="visually-hidden">Filter and Sort Cards</h2>
        
        <div className="deck-cards-filter-controls">
          {/* Search */}
          <div className="deck-cards-search" data-testid="deck-cards-search">
            <label htmlFor="cards-search" className="visually-hidden">Search cards</label>
            <input
              id="cards-search"
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="deck-cards-search-input"
              data-testid="deck-cards-search-input"
            />
          </div>

          {/* Tag Filter */}
          <div className="deck-cards-tag-filter" data-testid="deck-cards-tag-filter">
            <label htmlFor="tag-filter" className="visually-hidden">Filter by tag</label>
            <select
              id="tag-filter"
              value={tagFilter}
              onChange={(e) => handleTagFilter(e.target.value)}
              className="deck-cards-tag-filter-select"
              data-testid="deck-cards-tag-filter-select"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="deck-cards-sort" data-testid="deck-cards-sort">
            <label htmlFor="sort-by" className="visually-hidden">Sort by</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="deck-cards-sort-select"
              data-testid="deck-cards-sort-select"
            >
              {CARD_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="deck-cards-clear-filters"
              data-testid="deck-cards-clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {/* Results count after filtering */}
      {hasActiveFilters && sortedCards.length < pagination.total && (
        <div className="deck-cards-results-info" data-testid="deck-cards-results-info">
          Showing {sortedCards.length} of {pagination.total} cards
        </div>
      )}

      {/* Empty state when no cards match filters */}
      {hasNoResults && (
        <div className="deck-cards-empty" data-testid="deck-cards-empty">
          <p className="deck-cards-empty-message">
            No cards match your filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="btn-secondary"
            data-testid="deck-cards-clear-all-filters"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Empty state when deck has no cards */}
      {!hasNoResults && filteredCards.length === 0 && pagination.total === 0 && (
        <div className="deck-cards-empty" data-testid="deck-cards-empty">
          <p className="deck-cards-empty-message">
            No cards in this deck.
          </p>
          <button
            onClick={handleBackToDeck}
            className="btn-primary"
            data-testid="deck-cards-back-to-deck"
          >
            Back to Deck
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {hasFilteredResults && (
        <section className="deck-cards-grid-section" data-testid="deck-cards-grid">
          <div className="deck-cards-grid" data-testid="deck-cards-grid">
            {sortedCards.map((card) => (
              <div 
                key={card.id}
                className="deck-cards-card-wrapper"
                data-testid={`deck-cards-card-${card.id}`}
              >
                <Flashcard 
                  card={{
                    id: card.id,
                    deck_id: card.deck_id,
                    deck_name: deck.name,
                    card_id: card.card_id,
                    front: card.front,
                    back: card.back,
                    example: card.example,
                    next_review_date: card.next_review_date
                  }}
                />
                
                {/* Card metadata below flashcard */}
                <div className="deck-cards-card-meta" data-testid={`deck-cards-card-meta-${card.id}`}>
                  {card.tags && card.tags.length > 0 && (
                    <span className="card-meta-tags" data-testid={`card-tags-${card.id}`}>
                      Tags: {card.tags.join(', ')}
                    </span>
                  )}
                  <span className="card-meta-difficulty" data-testid={`card-difficulty-${card.id}`}>
                    Difficulty: {card.difficulty}/5
                  </span>
                  {card.next_review_date && (
                    <span className="card-meta-next-review" data-testid={`card-next-review-${card.id}`}>
                      Next review: {new Date(card.next_review_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="deck-cards-pagination" data-testid="deck-cards-pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="deck-cards-pagination-btn"
                aria-label="Previous page"
                data-testid="deck-cards-pagination-prev"
              >
                Previous
              </button>

              <span className="deck-cards-pagination-info" data-testid="deck-cards-pagination-info">
                Page {currentPage} of {pagination.total_pages || 1}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= (pagination.total_pages || 1)}
                className="deck-cards-pagination-btn"
                aria-label="Next page"
                data-testid="deck-cards-pagination-next"
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {/* Loading indicator when fetching more pages */}
      {isLoading && sortedCards.length > 0 && (
        <div className="deck-cards-loading-more" data-testid="deck-cards-loading-more">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Back to deck link */}
      <div className="deck-cards-back-link" data-testid="deck-cards-back-link">
        <Link 
          to={deckId ? `/vocabulary/decks/${deckId}` : '/vocabulary'}
          className="btn-secondary"
          data-testid="deck-cards-back-to-deck-button"
        >
          Back to {deck?.name || 'Deck'}
        </Link>
      </div>
    </div>
  )
}
