/**
 * LessonDetailPage Component
 * 
 * Page for viewing a single grammar lesson in detail.
 * Fetches lesson data from the backend API and displays it with formatted sections.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { grammarApi } from '../utils/api'
import type { Lesson, LessonSection } from '../types/index'

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch lesson data
  const fetchLesson = useCallback(async () => {
    if (!lessonId) {
      setError('Lesson ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await grammarApi.getLesson(lessonId)
      setLesson(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lesson'
      setError(errorMessage)
      setLesson(null)
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

  // Render lesson detail
  return (
    <div className="page-container" data-testid="lesson-detail-page">
      <div className="lesson-detail">
        {/* Header */}
        <div className="lesson-detail-header">
          <div className="lesson-detail-header-content">
            <button
              onClick={handleBack}
              className="btn-secondary lesson-detail-back-btn"
              aria-label="Back to all lessons"
              data-testid="lesson-detail-back-btn"
            >
              ← Back
            </button>
            <h1 className="lesson-detail-title" data-testid="lesson-detail-title">
              {lesson.title}
            </h1>
          </div>
          <Link
            to="/lessons"
            className="btn-primary lesson-detail-browse-btn"
            data-testid="lesson-detail-browse"
          >
            Browse All Lessons
          </Link>
        </div>

        {/* Metadata */}
        <div className="lesson-detail-meta" data-testid="lesson-detail-meta">
          <div className="lesson-detail-meta-item">
            <span className="lesson-detail-meta-label">Topic:</span>
            <span className="lesson-detail-meta-value">{lesson.topic}</span>
          </div>
          <div className="lesson-detail-meta-item">
            <span className="lesson-detail-meta-label">Difficulty:</span>
            <span className="lesson-detail-meta-value" style={{
              color: lesson.difficulty === 'beginner' ? '#4caf50' :
                     lesson.difficulty === 'intermediate' ? '#ff9800' :
                     '#f44336'
            }}>
              {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}
            </span>
          </div>
          <div className="lesson-detail-meta-item">
            <span className="lesson-detail-meta-label">ID:</span>
            <span className="lesson-detail-meta-value">{lesson.id}</span>
          </div>
          <div className="lesson-detail-meta-item">
            <span className="lesson-detail-meta-label">Sections:</span>
            <span className="lesson-detail-meta-value">{lesson.sections.length}</span>
          </div>
        </div>

        {/* Content */}
        <div className="lesson-detail-content" data-testid="lesson-detail-content">
          {lesson.sections.map((section: LessonSection, index: number) => (
            <div key={section.title || index} className="lesson-section">
              <h2 className="lesson-section-title" data-testid={`lesson-section-title-${index}`}>
                Section {index + 1}: {section.title}
              </h2>
              <div
                className="lesson-section-content"
                data-testid={`lesson-section-content-${index}`}
                dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br />') }}
              />
              {section.examples && section.examples.length > 0 && (
                <div className="lesson-section-examples">
                  <h3 className="lesson-section-examples-title">Examples:</h3>
                  <ul className="lesson-section-examples-list">
                    {section.examples.map((example: string, exampleIndex: number) => (
                      <li key={exampleIndex} data-testid={`lesson-section-example-${index}-${exampleIndex}`}>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back to top button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-secondary lesson-detail-top-btn"
          aria-label="Scroll to top"
          data-testid="lesson-detail-top"
        >
          Back to Top
        </button>
      </div>
    </div>
  )
}
