/**
 * LessonCard Component
 * 
 * Displays a single grammar lesson card in the LessonBrowser.
 * Shows lesson title, topic, difficulty, and handles click events.
 * 
 * Matches the styling pattern of ScenarioCard for consistency.
 */

import type { LessonCardProps, Difficulty } from '../types/index'

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
 * LessonCard component - displays a single grammar lesson
 * 
 * @param props - Component props
 * @param props.lesson - Lesson summary data to display
 * @param props.onClick - Callback when card is clicked, receives lesson ID
 * @returns JSX Element
 */
export default function LessonCard({ lesson, onClick }: LessonCardProps) {
  const handleClick = () => {
    onClick(lesson.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support keyboard navigation for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(lesson.id)
    }
  }

  const color = DIFFICULTY_COLORS[lesson.difficulty] || '#666'
  const bgColor = DIFFICULTY_BG[lesson.difficulty] || '#f5f5f5'

  return (
    <div
      className="lesson-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View lesson: ${lesson.title}`}
      data-testid={`lesson-card-${lesson.id}`}
    >
      <div className="lesson-card-header">
        <h3 className="lesson-card-title">{lesson.title}</h3>
        <span
          className="lesson-difficulty-badge"
          style={{ backgroundColor: bgColor, color }}
          aria-label={`Difficulty: ${lesson.difficulty}`}
        >
          {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}
        </span>
      </div>
      <p className="lesson-card-topic">Topic: {lesson.topic}</p>
      <p className="lesson-card-id">ID: {lesson.id}</p>
    </div>
  )
}
