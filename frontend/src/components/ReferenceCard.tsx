/**
 * ReferenceCard Component
 * 
 * Displays a single grammar reference entry card in the ReferenceSearch.
 * Shows reference term, category, difficulty, definition preview, and handles click events.
 * 
 * Matches the styling pattern of LessonCard for consistency.
 */

import { useState } from 'react'
import type { ReferenceCardProps, Difficulty } from '../types/index'

/**
 * Difficulty level colors for visual indication
 */
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: '#4caf50',      // Green
  intermediate: '#ff9800', // Orange
  advanced: '#f44336',     // Red
}

/**
 * Difficulty level background colors for the badge
 */
const DIFFICULTY_BG: Record<Difficulty, string> = {
  beginner: '#e8f5e9',      // Light green
  intermediate: '#fff3e0', // Light orange
  advanced: '#ffebee',     // Light red
}

/**
 * Category colors for visual indication
 */
const CATEGORY_COLORS: Record<string, string> = {
  Verbs: '#2196f3',
  Nouns: '#9c27b0',
  Adjectives: '#e91e63',
  Adverbs: '#673ab7',
  Pronouns: '#3f51b5',
  Prepositions: '#009688',
  Conjunctions: '#8bc34a',
  Articles: '#cddc39',
  'Sentence Structure': '#ff5722',
  Punctuation: '#795548',
  Other: '#607d8b',
}

/**
 * ReferenceCard component - displays a single grammar reference entry
 * 
 * @param props - Component props
 * @param props.reference - Reference data to display
 * @param props.onClick - Optional callback when card is clicked, receives reference ID
 * @returns JSX Element
 */
export default function ReferenceCard({ reference, onClick }: ReferenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleClick = () => {
    if (onClick) {
      onClick(reference.id)
    } else {
      // Toggle expansion if no onClick handler
      setIsExpanded(!isExpanded)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support keyboard navigation for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const color = DIFFICULTY_COLORS[reference.difficulty] || '#666'
  const bgColor = DIFFICULTY_BG[reference.difficulty] || '#f5f5f5'
  const categoryColor = CATEGORY_COLORS[reference.category] || '#666'

  // Truncate definition for preview
  const definitionPreview = reference.definition.length > 150
    ? `${reference.definition.substring(0, 150)}...`
    : reference.definition

  return (
    <div
      className="reference-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'region'}
      tabIndex={0}
      aria-label={`Grammar reference: ${reference.term}`}
      data-testid={`reference-card-${reference.id}`}
    >
      <div className="reference-card-header">
        <h3 className="reference-card-term">{reference.term}</h3>
        <div className="reference-card-badges">
          <span
            className="reference-category-badge"
            style={{ backgroundColor: categoryColor, color: 'white' }}
            aria-label={`Category: ${reference.category}`}
          >
            {reference.category}
          </span>
          <span
            className="reference-difficulty-badge"
            style={{ backgroundColor: bgColor, color }}
            aria-label={`Difficulty: ${reference.difficulty}`}
          >
            {reference.difficulty.charAt(0).toUpperCase() + reference.difficulty.slice(1)}
          </span>
        </div>
      </div>
      
      <p className="reference-card-definition">{definitionPreview}</p>
      
      {isExpanded && !onClick && (
        <div className="reference-card-expanded">
          <p className="reference-card-full-definition"><strong>Definition:</strong> {reference.definition}</p>
          
          {reference.examples && reference.examples.length > 0 && (
            <div className="reference-card-examples">
              <strong>Examples:</strong>
              <ul>
                {reference.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          
          {reference.common_pitfalls && reference.common_pitfalls.length > 0 && (
            <div className="reference-card-pitfalls">
              <strong>Common Pitfalls:</strong>
              <ul>
                {reference.common_pitfalls.map((pitfall, index) => (
                  <li key={index}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}
          
          {reference.related_terms && reference.related_terms.length > 0 && (
            <div className="reference-card-related">
              <strong>Related Terms:</strong>
              <span> {reference.related_terms.join(', ')}</span>
            </div>
          )}
        </div>
      )}
      
      <p className="reference-card-id">ID: {reference.id}</p>
    </div>
  )
}
