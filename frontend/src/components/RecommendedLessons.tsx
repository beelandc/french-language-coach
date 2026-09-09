import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { grammarApi } from '../utils/api'
import type { LessonSummary } from '../types'
import LessonCard from './LessonCard'

export interface RecommendedLessonsProps {
  /** Conversation feedback focus_area used to fetch recommended grammar lessons. */
  focusArea: string
}

/**
 * Renders a "Recommended lessons" section after session feedback.
 *
 * Fetches `GET /grammar/recommendations/?focus_area=<focusArea>` and renders up
 * to 3 recommended grammar lessons as `LessonCard`s. Each card navigates to the
 * lesson viewer route (`/lessons/:lessonId`) on click. The backend owns the
 * fallback behavior (unknown focus_area returns general beginner lessons), so
 * this component renders whatever lessons the API returns.
 *
 * States: loading, error, empty (no lessons), and the lesson list. When
 * `focusArea` is empty or whitespace, the component renders nothing.
 */
export default function RecommendedLessons({ focusArea }: RecommendedLessonsProps) {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedFocusArea = focusArea.trim()

  useEffect(() => {
    if (!trimmedFocusArea) {
      setLessons([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const fetchRecommendations = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await grammarApi.getRecommendations(trimmedFocusArea)
        if (cancelled) return
        setLessons(response.lessons || [])
      } catch (err) {
        if (cancelled) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations'
        setError(errorMessage)
        setLessons([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchRecommendations()
    return () => {
      cancelled = true
    }
  }, [trimmedFocusArea])

  const handleLessonClick = useCallback(
    (lessonId: string) => {
      navigate(`/lessons/${lessonId}`)
    },
    [navigate]
  )

  // No focus area to base recommendations on — render nothing.
  if (!trimmedFocusArea) {
    return null
  }

  if (isLoading) {
    return (
      <div className="feedback-section" data-testid="recommendations-loading">
        <h3>Recommended lessons</h3>
        <p>Loading recommendations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="feedback-section" data-testid="recommendations-error">
        <h3>Recommended lessons</h3>
        <div className="error-message">{error}</div>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="feedback-section" data-testid="recommendations-empty">
        <h3>Recommended lessons</h3>
        <p>No recommended lessons available.</p>
      </div>
    )
  }

  return (
    <div className="feedback-section" data-testid="recommended-lessons">
      <h3>Recommended lessons</h3>
      <div className="lessons-grid" data-testid="recommendations-grid">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} onClick={handleLessonClick} />
        ))}
      </div>
    </div>
  )
}
