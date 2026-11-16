/**
 * Rating button configuration for flashcard review.
 *
 * Maps each label to the numeric rating the SM-2 algorithm expects. Used by ReviewSession
 * to render the rating buttons. Kept out of Flashcard.tsx so that module only exports
 * components, which React Fast Refresh needs (Issue #251).
 */
export const RATING_BUTTONS: { label: string; value: number; color: string }[] = [
  { label: 'Again', value: 1, color: '#f44336' },   // Red - card was forgotten
  { label: 'Hard', value: 2, color: '#ff9800' },   // Orange - recalled with difficulty
  { label: 'Good', value: 3, color: '#4caf50' },   // Green - recalled correctly
  { label: 'Easy', value: 4, color: '#2196f3' },   // Blue - recalled easily
]
