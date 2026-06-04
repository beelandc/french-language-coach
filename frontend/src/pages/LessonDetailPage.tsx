/**
 * LessonDetailPage Component
 * 
 * Page for viewing a single grammar lesson in detail.
 * Fetches lesson data from the backend API and displays it using LessonViewer.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { grammarApi } from '../utils/api'
import LessonViewer from '../components/LessonViewer'
import type { Lesson, LessonSummary } from '../types/index'

/**
 * LessonDetailPage component - displays a single lesson with full content
 * 
 * @returns JSX Element
 */
export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  // State for lesson data
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [allLessons, setAllLessons] = useState<LessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch lesson data and all lessons for related lessons feature
  const fetchLesson = useCallback(async () => {
    if (!lessonId) {
      setError('Lesson ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch the specific lesson
      const response = await grammarApi.getLesson(lessonId)
      setLesson(response)
      
      // Fetch all lessons for related lessons feature
      try {
        const allLessonsResponse = await grammarApi.listLessons(1, 100)
        setAllLessons(allLessonsResponse.lessons)
      } catch (err) {
        // If fetching all lessons fails, continue with empty array
        // Related lessons section will just not display
        setAllLessons([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lesson'
      setError(errorMessage)
      setLesson(null)
      setAllLessons([])
    } finally {
      setIsLoading(false)
    }
  }, [lessonId])

  // Fetch lesson on mount
  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  // Handle retry
  const handleRetry = () => {
    fetchLesson()
  }

  // Handle back navigation
  const handleBack = () => {
    navigate('/lessons')
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="page-container" data-testid="lesson-detail-page">
        <div className="lesson-detail">
          <div className="lesson-loading" data-testid="lesson-detail-loading">
            <div className="spinner-large"></div>
            <p>Loading lesson...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="page-container" data-testid="lesson-detail-page">
        <div className="lesson-detail">
          <div className="lesson-error" data-testid="lesson-detail-error">
            <div className="error-message" data-testid="lesson-detail-error-message">
              {error}
            </div>
            <div className="lesson-error-actions">
              <button
                onClick={handleRetry}
                className="btn-primary"
                data-testid="lesson-detail-retry"
              >
                Retry
              </button>
              <button
                onClick={handleBack}
                className="btn-secondary"
                data-testid="lesson-detail-back"
              >
                Back to Lessons
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render not found state
  if (!lesson) {
    return (
      <div className="page-container" data-testid="lesson-detail-page">
        <div className="lesson-detail">
          <div className="lesson-empty" data-testid="lesson-detail-not-found">
            <p className="lesson-empty-message">Lesson not found.</p>
            <button
              onClick={handleBack}
              className="btn-primary"
              data-testid="lesson-detail-back-button"
            >
              Back to Lessons
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render lesson detail using LessonViewer
  return (
    <div className="page-container" data-testid="lesson-detail-page">
      <LessonViewer
        lesson={lesson}
        allLessons={allLessons}
        onBack={handleBack}
      />
    </div>
  )
}
