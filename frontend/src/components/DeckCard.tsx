/**
 * DeckCard Component
 * 
 * Displays a single vocabulary deck card in the DeckBrowser.
 * Shows deck name, description, card count, and progress indicator.
 * 
 * Follows the styling pattern of LessonCard for consistency.
 */

import type { DeckCardProps } from '../types/index'

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
 * DeckCard component - displays a single vocabulary deck
 * 
 * @param props - Component props
 * @param props.deck - Deck data with progress information
 * @param props.onClick - Callback when card is clicked, receives deck ID
 * @returns JSX Element
 */
export default function DeckCard({ deck, onClick }: DeckCardProps) {
  const handleClick = () => {
    onClick(deck.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support keyboard navigation for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(deck.id)
    }
  }

  const progressColor = getProgressColor(deck.progress_percent)

  return (
    <div
      className="deck-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View deck: ${deck.name}. ${formatProgress(deck.learned_count, deck.card_count)}`}
      data-testid={`deck-card-${deck.id}`}
    >
      <div className="deck-card-header">
        <h3 className="deck-card-name">{deck.name}</h3>
      </div>

      {deck.description && (
        <p className="deck-card-description">{deck.description}</p>
      )}

      <div className="deck-card-stats">
        <span className="deck-card-count" data-testid={`deck-card-count-${deck.id}`}>
          {deck.card_count} cards
        </span>
      </div>

      {/* Progress Bar */}
      <div className="deck-card-progress-container">
        <div 
          className="deck-card-progress-bar"
          style={{ width: `${deck.progress_percent}%`, backgroundColor: progressColor }}
          aria-label={`Progress: ${deck.progress_percent}%`}
          data-testid={`deck-progress-bar-${deck.id}`}
        />
      </div>

      <div 
        className="deck-card-progress-text"
        data-testid={`deck-progress-text-${deck.id}`}
      >
        {formatProgress(deck.learned_count, deck.card_count)}
      </div>

      {/* Tags */}
      {deck.tags && deck.tags.length > 0 && (
        <div className="deck-card-tags">
          {deck.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="deck-card-tag"
              data-testid={`deck-tag-${deck.id}-${tag}`}
            >
              {tag}
            </span>
          ))}
          {deck.tags.length > 3 && (
            <span className="deck-card-tag" data-testid={`deck-more-tags-${deck.id}`}>
              +{deck.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      <p className="deck-card-id">ID: {deck.id}</p>
    </div>
  )
}
