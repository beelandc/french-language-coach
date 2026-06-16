/**
 * ReviewSession Component
 * 
 * Manages the vocabulary review session workflow.
 * Fetches cards due for review, displays them using Flashcard component,
 * handles rating submission, tracks progress, and shows session summary.
 * 
 * This component implements the core spaced repetition review functionality
 * using the existing backend API endpoints and SM-2 algorithm.
 */

import { useState, useEffect, useCallback } from 'react'
import Flashcard, { RATING_BUTTONS } from './Flashcard'
import { vocabularyApi } from '../utils/api'
import type { 
  ReviewSessionProps, 
  SessionStats, 
  DueCardsResponse,
  ReviewResponse,
  DueCard 
} from '../types/index'

/**
 * Rating button type for convenient access
 */
type RatingButtonConfig = typeof RATING_BUTTONS[number]

/**
 * Time delay (in milliseconds) before auto-advancing to next card
 */
const AUTO_ADVANCE_DELAY = 800

/**
 * ReviewSession component - manages vocabulary card review session
 * 
 * @param props - Component props
 * @param props.deckId - Optional deck ID to filter cards
 * @param props.onComplete - Callback when session completes
 * @param props.onError - Callback for API errors
 * @returns JSX Element
 */
export default function ReviewSession({ deckId, onComplete, onError }: ReviewSessionProps) {
  // State for cards data
  const [cards, setCards] = useState<DueCard[]>([])
  
  // State for session progress
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  // State for ratings tracking
  const [ratings, setRatings] = useState<Map<number, number>>(new Map())
  const [ratingStats, setRatingStats] = useState<Record<string, number>>({
    Again: 0,
    Hard: 0,
    Good: 0,
    Easy: 0
  })
  
  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for empty (no cards due) vs error
  const [isEmpty, setIsEmpty] = useState(false)
  
  // State for session completion
  const [isComplete, setIsComplete] = useState(false)
  
  // State for API submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Current card (computed from cards and currentIndex)
  const currentCard = cards[currentIndex]

  // Total cards count
  const totalCards = cards.length

  // Fetch cards due for review
  const fetchDueCards = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsComplete(false)
    setCurrentIndex(0)
    setRatings(new Map())
    setRatingStats({ Again: 0, Hard: 0, Good: 0, Easy: 0 })

    try {
      // Fetch all due cards (use a high per_page to get all in one request)
      const response: DueCardsResponse = await vocabularyApi.listDueCards(1, 1000)
      
      // Filter by deck if specified
      let filteredCards = response.cards
      if (deckId) {
        filteredCards = response.cards.filter(card => card.deck_id === deckId)
      }
      
      setCards(filteredCards)
      
      // If no cards, set empty state
      if (filteredCards.length === 0) {
        setIsEmpty(true)
        setError(null)
      } else {
        setIsEmpty(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cards due for review'
      setError(errorMessage)
      setCards([])
      setIsEmpty(false)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [deckId, onError])

  // Submit rating for current card
  const submitRating = useCallback(async (ratingValue: number, ratingLabel: string) => {
    if (!currentCard) return
    
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare review data
      const reviewData = {
        card_id: currentCard.id,
        deck_id: currentCard.deck_id,
        ease: ratingValue
      }
      
      // Submit to backend
      const response: ReviewResponse = await vocabularyApi.submitReview(reviewData)
      
      if (response.success) {
        // Record the rating
        const newRatings = new Map(ratings)
        newRatings.set(currentCard.id, ratingValue)
        setRatings(newRatings)
        
        // Update stats
        setRatingStats(prev => ({
          ...prev,
          [ratingLabel]: prev[ratingLabel] + 1
        }))
        
        // Check if this is the last card
        if (currentIndex >= totalCards - 1) {
          // Session complete
          const stats: SessionStats = {
            totalCards,
            ratings: ratingStats,
            completedAt: new Date().toISOString()
          }
          setIsComplete(true)
          onComplete?.(stats)
        } else {
          // Auto-advance to next card after delay
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1)
            setIsFlipped(false) // Reset flip state for next card
            setIsSubmitting(false)
          }, AUTO_ADVANCE_DELAY)
        }
      } else {
        setSubmitError('Failed to submit rating. Please try again.')
        setIsSubmitting(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit rating'
      setSubmitError(errorMessage)
      setIsSubmitting(false)
    }
  }, [currentCard, currentIndex, totalCards, ratings, ratingStats, onComplete])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchDueCards()
  }, [fetchDueCards])

  // Handle retry for submit error
  const handleRetrySubmit = useCallback(() => {
    setSubmitError(null)
    setIsSubmitting(false)
  }, [])

  // Handle card flip
  const handleFlip = useCallback((flipped: boolean) => {
    setIsFlipped(flipped)
  }, [])

  // Fetch cards on mount
  useEffect(() => {
    fetchDueCards()
  }, [fetchDueCards])

  // Reset session when deckId changes
  useEffect(() => {
    fetchDueCards()
  }, [deckId, fetchDueCards])

  // Handle skip card (without rating) - for error recovery
  const handleSkip = useCallback(() => {
    if (currentIndex >= totalCards - 1) {
      // Last card, complete session
      const stats: SessionStats = {
        totalCards,
        ratings: ratingStats,
        completedAt: new Date().toISOString()
      }
      setIsComplete(true)
      onComplete?.(stats)
    } else {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
      setSubmitError(null)
      setIsSubmitting(false)
    }
  }, [currentIndex, totalCards, ratingStats, onComplete])

  // Render loading state
  if (isLoading && cards.length === 0) {
    return (
      <div className="review-session" data-testid="review-session">
        <div className="review-loading" data-testid="review-loading">
          <div className="spinner-large"></div>
          <p>Loading cards due for review...</p>
        </div>
      </div>
    )
  }

  // Render API error state
  if (error && !isLoading && !isEmpty) {
    return (
      <div className="review-session" data-testid="review-session">
        <div className="review-error" data-testid="review-error">
          <div className="error-message" data-testid="review-error-message">
            {error}
          </div>
          <button 
            onClick={handleRetry}
            className="btn-primary"
            data-testid="review-retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render empty state (no cards due)
  if (isEmpty && cards.length === 0 && !error && !isLoading) {
    return (
      <div className="review-session" data-testid="review-session">
        <div className="review-empty" data-testid="review-empty">
          <div className="review-empty-icon">📚</div>
          <h3 className="review-empty-title">No Cards Due for Review</h3>
          <p className="review-empty-message">No cards due for review. Create or study decks to generate reviews.</p>
          <button 
            onClick={handleRetry}
            className="btn-primary"
            data-testid="review-retry-button"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // Render session complete state
  if (isComplete) {
    return (
      <div className="review-session" data-testid="review-session">
        <div className="session-summary" data-testid="session-summary">
          <div className="session-summary-icon">✅</div>
          <h2 className="session-summary-title">Session Complete!</h2>
          <p className="session-summary-message">
            You reviewed {totalCards} {totalCards === 1 ? 'card' : 'cards'}
          </p>
          
          <div className="session-summary-stats" data-testid="session-summary-stats">
            <h3>Rating Distribution:</h3>
            <ul>
              <li data-testid="summary-again">Again: {ratingStats.Again}</li>
              <li data-testid="summary-hard">Hard: {ratingStats.Hard}</li>
              <li data-testid="summary-good">Good: {ratingStats.Good}</li>
              <li data-testid="summary-easy">Easy: {ratingStats.Easy}</li>
            </ul>
          </div>
          
          <div className="session-summary-actions">
            <button 
              onClick={fetchDueCards}
              className="btn-primary"
              data-testid="summary-new-session"
            >
              Start New Session
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render active review session
  return (
    <div className="review-session" data-testid="review-session">
      {/* Progress indicator */}
      <div className="review-progress" data-testid="review-progress">
        <span className="review-progress-text">
          Card {currentIndex + 1} of {totalCards}
        </span>
        <progress 
          className="review-progress-bar"
          value={currentIndex + 1}
          max={totalCards}
          data-testid="review-progress-bar"
        />
      </div>

      {/* Flashcard */}
      {currentCard && (
        <div className="review-card-container" data-testid="review-card-container">
          <Flashcard 
            card={{
              id: currentCard.id,
              deck_id: currentCard.deck_id,
              deck_name: currentCard.deck_name,
              card_id: currentCard.card_id,
              front: currentCard.front,
              back: currentCard.back,
              next_review_date: currentCard.next_review_date
            }}
            flipped={isFlipped}
            onFlip={handleFlip}
          />
        </div>
      )}

      {/* Rating buttons (only show when card is flipped) */}
      {isFlipped && (
        <div className="review-ratings" data-testid="review-ratings">
          <p className="review-ratings-title">How well did you remember this card?</p>
          <div className="review-ratings-buttons">
            {RATING_BUTTONS.map((button: RatingButtonConfig) => (
              <button
                key={button.label}
                onClick={() => submitRating(button.value, button.label)}
                className="review-rating-button"
                style={{ backgroundColor: button.color }}
                disabled={isSubmitting}
                data-testid={`rating-button-${button.label}`}
                data-rating-value={button.value}
                aria-label={`Rate as ${button.label}`}
              >
                {button.label}
                {isSubmitting && <span className="rating-loading">...</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit error message */}
      {submitError && (
        <div className="review-submit-error" data-testid="review-submit-error">
          <span className="error-message">{submitError}</span>
          <div className="review-submit-error-actions">
            <button 
              onClick={handleRetrySubmit}
              className="btn-secondary"
              data-testid="submit-retry-button"
            >
              Retry
            </button>
            <button 
              onClick={handleSkip}
              className="btn-secondary"
              data-testid="submit-skip-button"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Hint for first-time users */}
      {!isFlipped && totalCards > 0 && (
        <div className="review-hint" data-testid="review-hint">
          <p>Click or tap the card to flip it and see the translation</p>
        </div>
      )}
    </div>
  )
}

// Export RATING_BUTTONS for use in tests
export { RATING_BUTTONS }