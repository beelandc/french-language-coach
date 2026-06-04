/**
 * LessonBrowser Component
 * 
 * Main component for browsing, searching, filtering, and viewing grammar lessons.
 * Uses the backend API endpoint GET /grammar/lessons/ for data.
 * 
 * Features:
 * - Displays lessons in a grid layout
 * - Search functionality (client-side filtering on title and topic)
 * - Topic and difficulty filtering (server-side via API)
 * - Pagination (server-side via API)
 * - Loading, error, and empty states
 * - Responsive design
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { grammarApi } from '../utils/api'
import LessonCard from './LessonCard'
import LessonSearch from './LessonSearch'
import type { LessonBrowserProps, LessonSummary, Difficulty, PaginationInfo } from '../types/index'

/**
 * Default number of lessons per page
 */
const DEFAULT_PER_PAGE = 12

/**
 * Debounce delay for search input (in milliseconds)
 */
const SEARCH_DEBOUNCE_DELAY = 300

/**
 * LessonBrowser component - main component for browsing lessons
 * 
 * @param props - Component props
 * @param props.initialDifficulty - Optional initial difficulty filter
 * @param props.initialTopic - Optional initial topic filter
 * @param props.initialSearch - Optional initial search query
 * @returns JSX Element
 */
export default function LessonBrowser({
  initialDifficulty,
  initialTopic,
  initialSearch = '',
}: LessonBrowserProps) {
  const navigate = useNavigate()

  // State for lessons data
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    per_page: DEFAULT_PER_PAGE,
    total_pages: 0,
  })

  // State for filters
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [topicFilter, setTopicFilter] = useState(initialTopic || '')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>(
    initialDifficulty || ''
  )

  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearch)

  // Current page state
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch lessons from API with current filters
  const fetchLessons = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await grammarApi.listLessons(
        currentPage,
        DEFAULT_PER_PAGE,
        topicFilter || undefined,
        (difficultyFilter as Difficulty) || undefined
      )

      setLessons(response.lessons)
      setPagination(response.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lessons'
      setError(errorMessage)
      setLessons([])
      setPagination({
        total: 0,
        page: 1,
        per_page: DEFAULT_PER_PAGE,
        total_pages: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, topicFilter, difficultyFilter])

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, SEARCH_DEBOUNCE_DELAY)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch lessons when filters or page change
  useEffect(() => {
    fetchLessons()
  }, [fetchLessons])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [topicFilter, difficultyFilter])

  // Filter lessons client-side based on search query
  const filteredLessons = useMemo(() => {
    if (!debouncedSearchQuery) {
      return lessons
    }

    const query = debouncedSearchQuery.toLowerCase()
    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(query) ||
        lesson.topic.toLowerCase().includes(query) ||
        lesson.id.toLowerCase().includes(query)
    )
  }, [lessons, debouncedSearchQuery])

  // Handle lesson card click - navigate to lesson detail
  const handleLessonClick = useCallback(
    (lessonId: string) => {
      navigate(`/lessons/${lessonId}`)
    },
    [navigate]
  )

  // Handle search change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle topic filter change
  const handleTopicFilter = useCallback((topic: string) => {
    setTopicFilter(topic)
  }, [])

  // Handle difficulty filter change
  const handleDifficultyFilter = useCallback(
    (difficulty: Difficulty | '') => {
      setDifficultyFilter(difficulty)
    },
    []
  )

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setTopicFilter('')
    setDifficultyFilter('')
    setCurrentPage(1)
  }, [])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchLessons()
  }, [fetchLessons])

  // Check if any filters are active (for empty state message)
  const hasActiveFilters = useMemo(
    () => searchQuery !== '' || topicFilter !== '' || difficultyFilter !== '',
    [searchQuery, topicFilter, difficultyFilter]
  )

  // Render loading state
  if (isLoading && lessons.length === 0) {
    return (
      <div className="lesson-browser" data-testid="lesson-browser">
        <div className="lesson-browser-header">
          <h2 className="lesson-browser-title">Grammar Lessons</h2>
        </div>

        <LessonSearch
          searchQuery={searchQuery}
          topicFilter={topicFilter}
          difficultyFilter={difficultyFilter}
          onSearch={handleSearch}
          onTopicFilter={handleTopicFilter}
          onDifficultyFilter={handleDifficultyFilter}
        />

        <div className="lesson-loading" data-testid="lesson-loading">
          <div className="spinner-large"></div>
          <p>Loading lessons...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="lesson-browser" data-testid="lesson-browser">
        <div className="lesson-browser-header">
          <h2 className="lesson-browser-title">Grammar Lessons</h2>
        </div>

        <LessonSearch
          searchQuery={searchQuery}
          topicFilter={topicFilter}
          difficultyFilter={difficultyFilter}
          onSearch={handleSearch}
          onTopicFilter={handleTopicFilter}
          onDifficultyFilter={handleDifficultyFilter}
        />

        <div className="lesson-error" data-testid="lesson-error">
          <div className="error-message" data-testid="lesson-error-message">
            {error}
          </div>
          <button
            onClick={handleRetry}
            className="btn-primary"
            data-testid="lesson-retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render empty state
  if (filteredLessons.length === 0) {
    return (
      <div className="lesson-browser" data-testid="lesson-browser">
        <div className="lesson-browser-header">
          <h2 className="lesson-browser-title">Grammar Lessons</h2>
        </div>

        <LessonSearch
          searchQuery={searchQuery}
          topicFilter={topicFilter}
          difficultyFilter={difficultyFilter}
          onSearch={handleSearch}
          onTopicFilter={handleTopicFilter}
          onDifficultyFilter={handleDifficultyFilter}
        />

        <div className="lesson-empty" data-testid="lesson-empty">
          {hasActiveFilters ? (
            <div>
              <p className="lesson-empty-message">
                No lessons match your filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="btn-secondary"
                data-testid="lesson-clear-all-filters"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <p className="lesson-empty-message">No lessons found.</p>
          )}
        </div>
      </div>
    )
  }

  // Render lessons with pagination
  return (
    <div className="lesson-browser" data-testid="lesson-browser">
      <div className="lesson-browser-header">
        <h2 className="lesson-browser-title">Grammar Lessons</h2>
        <span className="lesson-count" data-testid="lesson-count">
          {pagination.total} lessons
        </span>
      </div>

      <LessonSearch
        searchQuery={searchQuery}
        topicFilter={topicFilter}
        difficultyFilter={difficultyFilter}
        onSearch={handleSearch}
        onTopicFilter={handleTopicFilter}
        onDifficultyFilter={handleDifficultyFilter}
      />

      {/* Results count after filtering */}
      {hasActiveFilters && filteredLessons.length < pagination.total && (
        <div className="lesson-results-info" data-testid="lesson-results-info">
          Showing {filteredLessons.length} of {pagination.total} lessons
        </div>
      )}

      {/* Lessons Grid */}
      <div className="lessons-grid" data-testid="lessons-grid">
        {filteredLessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onClick={handleLessonClick}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredLessons.length > 0 && (
        <div className="lesson-pagination" data-testid="lesson-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="lesson-pagination-btn"
            aria-label="Previous page"
            data-testid="lesson-pagination-prev"
          >
            Previous
          </button>

          <span className="lesson-pagination-info" data-testid="lesson-pagination-info">
            Page {currentPage} of {pagination.total_pages || 1}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= (pagination.total_pages || 1)}
            className="lesson-pagination-btn"
            aria-label="Next page"
            data-testid="lesson-pagination-next"
          >
            Next
          </button>
        </div>
      )}

      {/* Loading indicator when fetching more pages */}
      {isLoading && filteredLessons.length > 0 && (
        <div className="lesson-loading" data-testid="lesson-loading-more">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  )
}
