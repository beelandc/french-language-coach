/**
 * Flashcard Component
 * 
 * Displays a vocabulary flashcard with front (French) and back (English + example).
 * Supports flip animation on click/tap and swipe gestures for mobile.
 * 
 * This component is used by ReviewSession to display individual cards for review.
 * It follows the styling and accessibility patterns established by DeckCard.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { FlashcardProps, CardData } from '../types/index'

/**
 * Rating button configuration for the rating buttons
 * Maps label to numeric rating value for SM-2 algorithm
 */
export const RATING_BUTTONS: { label: string; value: number; color: string }[] = [
  { label: 'Again', value: 1, color: '#f44336' },   // Red - card was forgotten
  { label: 'Hard', value: 2, color: '#ff9800' },   // Orange - recalled with difficulty
  { label: 'Good', value: 3, color: '#4caf50' },   // Green - recalled correctly
  { label: 'Easy', value: 4, color: '#2196f3' },   // Blue - recalled easily
]

/**
 * Minimum swipe distance (in pixels) to trigger flip action
 */
const SWIPE_THRESHOLD = 50

/**
 * Touch event tracking for swipe gesture detection
 */
interface TouchPosition {
  x: number
  y: number
}

/**
 * Flashcard component - displays a single vocabulary card with flip animation
 * 
 * @param props - Component props
 * @param props.card - Card data to display (front, back, example)
 * @param props.flipped - Optional controlled flip state
 * @param props.onFlip - Optional callback when flip state changes
 * @returns JSX Element
 */
export default function Flashcard({ card, flipped: controlledFlipped, onFlip }: FlashcardProps) {
  // Use controlled state if provided, otherwise manage internally
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  // Track touch position for swipe detection
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Handle flip state changes
  const handleFlip = useCallback((newFlipped: boolean) => {
    if (controlledFlipped === undefined) {
      setInternalFlipped(newFlipped)
    }
    onFlip?.(newFlipped)
  }, [controlledFlipped, onFlip])

  // Handle click to flip card
  const handleClick = useCallback(() => {
    handleFlip(!isFlipped)
  }, [isFlipped, handleFlip])

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleFlip(!isFlipped)
    }
  }, [isFlipped, handleFlip])

  // Handle touch start for swipe detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [])

  // Handle touch move for swipe detection
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    
    // Check if swipe exceeds threshold (horizontal swipe for flip)
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe - flip the card
      e.preventDefault()
      handleFlip(!isFlipped)
      setTouchStart(null)
    }
  }, [touchStart, isFlipped, handleFlip])

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setTouchStart(null)
  }, [])

  // Reset flipped state when card changes
  useEffect(() => {
    if (controlledFlipped === undefined) {
      setInternalFlipped(false)
    }
  }, [card.id, controlledFlipped])

  // Get content for front side
  const frontContent = (
    <div className="flashcard-front-content" data-testid="flashcard-front-content">
      <div className="flashcard-front-main" data-testid="flashcard-front-main">
        <span className="flashcard-text" data-testid="flashcard-front-text">
          {card.front || '[No content]'}
        </span>
      </div>
    </div>
  )

  // Get content for back side
  const backContent = (
    <div className="flashcard-back-content" data-testid="flashcard-back-content">
      <div className="flashcard-back-main" data-testid="flashcard-back-main">
        <span className="flashcard-text" data-testid="flashcard-back-text">
          {card.back || '[No content]'}
        </span>
      </div>
      
      {/* Show example if available */}
      {card.example && (
        <div className="flashcard-example" data-testid="flashcard-example">
          <em>Example: {card.example}</em>
        </div>
      )}
      
      {/* Show deck name if available */}
      {card.deck_name && (
        <div className="flashcard-deck-name" data-testid="flashcard-deck-name">
          Deck: {card.deck_name}
        </div>
      )}
    </div>
  )

  return (
    <div
      ref={cardRef}
      className={`flashcard ${isFlipped ? 'flipped' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label={`Vocabulary card. ${isFlipped ? 'Back side' : 'Front side'}. ${isFlipped ? 'Click to show front' : 'Click to show back'}`}
      aria-pressed={isFlipped}
      data-testid="flashcard"
      data-card-id={card.card_id}
    >
      {/* Front Side */}
      <div className="flashcard-side flashcard-side-front" data-testid="flashcard-side-front">
        {frontContent}
      </div>
      
      {/* Back Side */}
      <div className="flashcard-side flashcard-side-back" data-testid="flashcard-side-back">
        {backContent}
      </div>
    </div>
  )
}

// Export the CardData type for convenience
export type { CardData }