/**
 * DeckDetailPage
 * 
 * Page component for displaying detailed information about a specific vocabulary deck.
 * Shows deck metadata, progress summary, and a preview of cards in the deck.
 * Provides navigation to view all cards or start a review session.
 * 
 * Part of Issue #201: Implement vocabulary deck detail pages
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'
import Flashcard from '../components/Flashcard'
import { vocabularyApi } from '../utils/api'
import type { DeckSummary, CardSummary, DeckWithProgress, SessionStats } from '../types/index'

/**
 * Number of cards to show in preview on deck detail page
 */
const CARDS_PREVIEW_COUNT = 5

/**
 * A card is considered "learned" if its interval > 1 (SM-2 algorithm convention)
 */
const isCardLearned = (card: CardSummary): boolean => {
  return card.interval > 1
}

/**
 * Progress bar color thresholds
 */
const PROGRESS_COLORS = {
  low: '#f44336',    // Red - 0-33%
  medium: '#ff9800', // Orange - 34-66%
  high: '#4caf50',   // Green - 67-100%
}

/**
 * Gets the color for the progress bar based on percentage
 */
function getProgressColor(progressPercent: number): string {
  if (progressPercent >= 67) return PROGRESS_COLORS.high
  if (progressPercent >= 34) return PROGRESS_COLORS.medium
  return PROGRESS_COLORS.low
}

/**
 * Formats the progress text for display
 */
function formatProgress(learnedCount: number, cardCount: number): string {
  const percent = cardCount > 0 ? Math.round((learnedCount / cardCount) * 100) : 0
  return `${learnedCount}/${cardCount} cards learned (${percent}%)`
}

/**
 * DeckDetailPage component - displays detailed information about a specific deck
 * 
 * @returns JSX Element
 */
export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()

  // State for deck data
  const [deck, setDeck] = useState<DeckSummary | null>(null)
  const [cards, setCards] = useState<CardSummary[]>([])

  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for review session completion
  const [reviewStats, setReviewStats] = useState<SessionStats | null>(null)

  // Derived deck ID (convert from string to number)
  const deckIdNum = useMemo(() => {
    return deckId ? parseInt(deckId, 10) : 0
  }, [deckId])

  // Fetch deck and cards data
  const fetchDeckData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch deck details
      const deckResponse = await vocabularyApi.getDeck(deckIdNum)
      setDeck(deckResponse)

      // Fetch cards for this deck (get first page with enough to show preview)
      const cardsResponse = await vocabularyApi.listDeckCards(deckIdNum, 1, CARDS_PREVIEW_COUNT * 2)
      setCards(cardsResponse.cards)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load deck details'
      setError(errorMessage)
      setDeck(null)
      setCards([])
    } finally {
      setIsLoading(false)
    }
  }, [deckIdNum])

  // Fetch data on mount or when deckId changes
  useEffect(() => {
    if (deckIdNum > 0) {
      fetchDeckData()
    } else {
      setError('Invalid deck ID')
      setIsLoading(false)
    }
  }, [fetchDeckData, deckIdNum])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchDeckData()
  }, [fetchDeckData])

  // Handle navigation back to vocabulary list
  const handleBackToVocabulary = useCallback(() => {
    navigate('/vocabulary')
  }, [navigate])

  // Handle review session completion
  const handleReviewComplete = useCallback((stats: SessionStats) => {
    setReviewStats(stats)
    // Refresh deck data to update progress
    fetchDeckData()
  }, [fetchDeckData])

  // Calculate deck progress
  const deckWithProgress = useMemo<DeckWithProgress | null>(() => {
    if (!deck || !cards.length) {
      return {
        ...deck,
        learned_count: 0,
        progress_percent: 0,
        tags: []
      } as DeckWithProgress
    }

    const learnedCount = cards.filter(isCardLearned).length
    const progressPercent = deck.card_count > 0 
      ? Math.round((learnedCount / deck.card_count) * 100) 
      : 0

    // Aggregate unique tags from cards
    const tags: string[] = []
    cards.forEach((card) => {
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
      tags
    }
  }, [deck, cards])

  // Get preview cards (first CARDS_PREVIEW_COUNT cards)
  const previewCards = useMemo<CardSummary[]>(() => {
    return cards.slice(0, CARDS_PREVIEW_COUNT)
  }, [cards])

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => [
    { label: 'Vocabulary', path: '/vocabulary' },
    { label: deck?.name || 'Deck', path: deckId ? `/vocabulary/decks/${deckId}` : undefined },
  ], [deck?.name, deckId])

  // Render loading state
  if (isLoading && !deck && !error) {
    return (
      <div className="page-container" data-testid="deck-detail-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-detail-loading" data-testid="deck-detail-loading">
          <div className="spinner-large"></div>
          <p>Loading deck details...</p>
        </div>
      </div>
    )
  }

  // Render error state (deck not found or API error)
  if (error && !deck) {
    return (
      <div className="page-container" data-testid="deck-detail-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-detail-error" data-testid="deck-detail-error">
          <div className="error-message" data-testid="deck-detail-error-message">
            {error}
          </div>
          <div className="deck-detail-error-actions">
            <button 
              onClick={handleRetry}
              className="btn-primary"
              data-testid="deck-detail-retry-button"
            >
              Retry
            </button>
            <button 
              onClick={handleBackToVocabulary}
              className="btn-secondary"
              data-testid="deck-detail-back-button"
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
      <div className="page-container" data-testid="deck-detail-page">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="deck-detail-not-found" data-testid="deck-detail-not-found">
          <h2>Deck Not Found</h2>
          <p>This deck doesn't exist or has been deleted.</p>
          <button 
            onClick={handleBackToVocabulary}
            className="btn-primary"
            data-testid="deck-detail-back-button"
          >
            Back to Vocabulary
          </button>
        </div>
      </div>
    )
  }

  // Render deck detail page
  return (
    <div className="page-container" data-testid="deck-detail-page">
      <Breadcrumb items={breadcrumbItems} />

      <header className="deck-detail-header" data-testid="deck-detail-header">
        <h1 className="deck-detail-title" data-testid="deck-detail-title">
          {deck.name}
        </h1>
        
        {deck.description && (
          <p className="deck-detail-description" data-testid="deck-detail-description">
            {deck.description}
          </p>
        )}

        <div className="deck-detail-meta" data-testid="deck-detail-meta">
          <span className="deck-meta-item" data-testid="deck-card-count">
            {deck.card_count} {deck.card_count === 1 ? 'card' : 'cards'}
          </span>
          <span className="deck-meta-separator">|</span>
          <span className="deck-meta-item" data-testid="deck-created-date">
            Created: {new Date(deck.created_at).toLocaleDateString()}
          </span>
          <span className="deck-meta-separator">|</span>
          <span className="deck-meta-item" data-testid="deck-updated-date">
            Updated: {new Date(deck.updated_at).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* Progress Summary */}
      {deckWithProgress && (
        <section className="deck-progress-summary" data-testid="deck-progress-summary">
          <h2 className="deck-progress-title">Learning Progress</h2>
          
          <div className="deck-progress-bar-container" data-testid="deck-progress-bar">
            <div 
              className="deck-progress-bar"
              style={{
                width: `${deckWithProgress.progress_percent}%`,
                backgroundColor: getProgressColor(deckWithProgress.progress_percent)
              }}
              aria-label={`Progress: ${deckWithProgress.progress_percent}%`}
              data-testid="deck-progress-bar-fill"
            />
          </div>
          
          <div className="deck-progress-text" data-testid="deck-progress-text">
            {formatProgress(deckWithProgress.learned_count, deckWithProgress.card_count || deck.card_count)}
          </div>

          {/* Tags */}
          {deckWithProgress.tags && deckWithProgress.tags.length > 0 && (
            <div className="deck-tags" data-testid="deck-tags">
              <h3 className="deck-tags-title">Tags</h3>
              <div className="deck-tags-list">
                {deckWithProgress.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="deck-tag"
                    data-testid={`deck-tag-${index}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Action Buttons */}
      <section className="deck-actions" data-testid="deck-actions">
        <h2 className="deck-actions-title">Actions</h2>
        
        <div className="deck-actions-buttons">
          <Link 
            to={deckId ? `/vocabulary/decks/${deckId}/cards` : '#'}
            className="btn-primary"
            data-testid="deck-view-cards-button"
          >
            View All Cards ({deck.card_count})
          </Link>
          
          <Link 
            to={`/review?deckId=${deckId}`}
            className="btn-secondary"
            data-testid="deck-start-review-button"
          >
            Start Review Session
          </Link>
        </div>
      </section>

      {/* Preview Cards */}
      {previewCards.length > 0 && (
        <section className="deck-cards-preview" data-testid="deck-cards-preview">
          <h2 className="deck-preview-title">
            Card Preview ({Math.min(previewCards.length, deck.card_count)} of {deck.card_count})
          </h2>
          
          <div className="deck-preview-grid" data-testid="deck-preview-grid">
            {previewCards.map((card) => (
              <div 
                key={card.id}
                className="deck-preview-card-wrapper"
                data-testid={`deck-preview-card-${card.id}`}
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
                <div className="deck-preview-card-meta" data-testid={`deck-preview-card-meta-${card.id}`}>
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

          {deck.card_count > CARDS_PREVIEW_COUNT && (
            <div className="deck-preview-more" data-testid="deck-preview-more">
              <Link 
                to={deckId ? `/vocabulary/decks/${deckId}/cards` : '#'}
                className="deck-preview-more-link"
                data-testid="deck-preview-view-all-link"
              >
                View all {deck.card_count} cards...
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Empty state for decks with no cards */}
      {previewCards.length === 0 && deck.card_count === 0 && (
        <section className="deck-empty-state" data-testid="deck-empty-state">
          <h2>No Cards Yet</h2>
          <p>This deck doesn't have any cards. Add cards to start studying!</p>
        </section>
      )}

      {/* Review Session Completion Summary */}
      {reviewStats && (
        <section className="deck-review-summary" data-testid="deck-review-summary">
          <h2>Review Session Complete!</h2>
          <p>You reviewed {reviewStats.totalCards} cards</p>
          <div className="review-summary-stats">
            <span>Again: {reviewStats.ratings.Again || 0}</span>
            <span>Hard: {reviewStats.ratings.Hard || 0}</span>
            <span>Good: {reviewStats.ratings.Good || 0}</span>
            <span>Easy: {reviewStats.ratings.Easy || 0}</span>
          </div>
        </section>
      )}
    </div>
  )
}
