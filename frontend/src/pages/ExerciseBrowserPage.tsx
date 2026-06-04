/**
 * ExerciseBrowserPage Component
 *
 * Page component for browsing and filtering grammar exercises.
 * Displays a list of available exercises with search and filter controls.
 *
 * Matches the pattern of LessonPage and ReferencePage for consistency.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { grammarApi } from '../utils/api'
import type { Exercise, ExerciseType, Difficulty, PaginationInfo } from '../types/index'

/**
 * ExerciseBrowserPage component - main page for browsing grammar exercises
 *
 * @returns JSX Element
 */
export default function ExerciseBrowserPage() {
  const navigate = useNavigate()
  
  // State for search and filter parameters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ExerciseType | ''>('')
  const [topicFilter, setTopicFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('')
  
  // State for results and loading/error
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for pagination controls
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)

  // Fetch exercises when filters or page change
  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Use empty string/undefined for filters that are empty
        const type = typeFilter === '' ? undefined : typeFilter
        const topic = topicFilter === '' ? undefined : topicFilter
        const difficulty = difficultyFilter === '' ? undefined : difficultyFilter
        const query = searchQuery === '' ? undefined : searchQuery
        
        // Try to fetch from backend endpoint
        const response = await grammarApi.listExercises(
          page,
          perPage,
          type,
          topic,
          difficulty
        )
        
        // Handle both response formats (with exercises array or references array)
        const exerciseList = response.exercises || response.references || []
        setExercises(exerciseList)
        setPagination(response.pagination)
      } catch (err) {
        // If backend fails, try to load from static files
        try {
          const response = await fetch('/data/grammar/exercises/')
          if (!response.ok) {
            throw new Error('Failed to load exercises directory')
          }
          // This won't work directly, we need to list the files
          // For now, set empty and show error
          setError('Exercise directory listing not available. Try accessing an exercise directly.')
          setExercises([])
        } catch (fallbackErr) {
          setError(err instanceof Error ? err.message : 'Failed to load exercises')
          setExercises([])
        }
        setPagination({ total: 0, page: 1, per_page: 10, total_pages: 0 })
      } finally {
        setIsLoading(false)
      }
    }
    
    // Use a small delay to debounce rapid filter changes
    const timer = setTimeout(fetchExercises, 100)
    
    return () => clearTimeout(timer)
  }, [searchQuery, typeFilter, topicFilter, difficultyFilter, page, perPage])

  // Handle search query change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setPage(1)
  }, [])

  // Handle type filter change
  const handleTypeFilter = useCallback((type: ExerciseType | '') => {
    setTypeFilter(type)
    setPage(1)
  }, [])

  // Handle topic filter change
  const handleTopicFilter = useCallback((topic: string) => {
    setTopicFilter(topic)
    setPage(1)
  }, [])

  // Handle difficulty filter change
  const handleDifficultyFilter = useCallback((difficulty: Difficulty | '') => {
    setDifficultyFilter(difficulty)
    setPage(1)
  }, [])

  // Handle exercise click - navigate to individual exercise
  const handleExerciseClick = useCallback((exerciseId: string) => {
    navigate(`/exercises/${exerciseId}`)
  }, [navigate])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // Handle previous page
  const handlePreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1)
    }
  }, [page])

  // Handle next page
  const handleNextPage = useCallback(() => {
    if (page < pagination.total_pages) {
      setPage(page + 1)
    }
  }, [page, pagination.total_pages])

  // Exercise type options for filter dropdown
  const exerciseTypeOptions: ExerciseType[] = [
    'fill-in-the-blank',
    'multiple-choice',
    'translation',
    'conjugation',
    'sentence-transformation'
  ]

  // Difficulty options
  const difficultyOptions: Difficulty[] = ['beginner', 'intermediate', 'advanced']

  return (
    <div className="exercise-browser-page" data-testid="exercise-browser-page">
      <h2 className="exercise-browser-page-title">Grammar Exercises</h2>
      <p className="exercise-browser-page-description">
        Practice your French grammar with interactive exercises. 
        Select an exercise to begin.
      </p>

      {/* Search and Filter Controls */}
      <div className="exercise-filters" data-testid="exercise-filters">
        <div className="filter-group">
          <label htmlFor="exercise-search">Search:</label>
          <input
            id="exercise-search"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search exercises..."
            className="filter-input"
            data-testid="exercise-search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="exercise-type-filter">Type:</label>
          <select
            id="exercise-type-filter"
            value={typeFilter}
            onChange={(e) => handleTypeFilter(e.target.value as ExerciseType | '')}
            className="filter-select"
            data-testid="exercise-type-filter"
          >
            <option value="">All Types</option>
            {exerciseTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="exercise-topic-filter">Topic:</label>
          <input
            id="exercise-topic-filter"
            type="text"
            value={topicFilter}
            onChange={(e) => handleTopicFilter(e.target.value)}
            placeholder="Filter by topic..."
            className="filter-input"
            data-testid="exercise-topic-filter"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="exercise-difficulty-filter">Difficulty:</label>
          <select
            id="exercise-difficulty-filter"
            value={difficultyFilter}
            onChange={(e) => handleDifficultyFilter(e.target.value as Difficulty | '')}
            className="filter-select"
            data-testid="exercise-difficulty-filter"
          >
            <option value="">All Levels</option>
            {difficultyOptions.map((diff) => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-message" data-testid="exercise-loading">
          Loading exercises...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message" data-testid="exercise-error">
          {error}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && !error && (
        <p className="exercise-results-count" data-testid="exercise-results-count">
          Found {pagination.total} exercise{pagination.total !== 1 ? 's' : ''} matching your criteria
        </p>
      )}

      {/* Empty Results */}
      {!isLoading && !error && exercises.length === 0 && (
        <div className="no-results" data-testid="exercise-no-results">
          <p>No exercises found matching your search.</p>
          <p>Try adjusting your search terms or filters.</p>
          <p>
            Available exercise IDs: 
            <code>fill-in-the-blank-present-tense</code>, 
            <code>multiple-choice-etre-je</code>, 
            <code>conjugation-parler-nous</code>, 
            <code>transformation-negative</code>, 
            <code>translation-j-aime</code>
          </p>
        </div>
      )}

      {/* Results List */}
      {!isLoading && !error && exercises.length > 0 && (
        <div className="exercise-list" data-testid="exercise-list">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="exercise-card"
              onClick={() => handleExerciseClick(exercise.id)}
              data-testid={`exercise-card-${exercise.id}`}
            >
              <h3 className="exercise-card-title">
                {exercise.prompt.length > 80 
                  ? `${exercise.prompt.substring(0, 80)}...` 
                  : exercise.prompt}
              </h3>
              <div className="exercise-card-meta">
                <span className="exercise-type">
                  {exercise.type.replace(/-/g, ' ')}
                </span>
                <span className="exercise-topic">
                  Topic: {exercise.topic}
                </span>
                <span className={`exercise-difficulty difficulty-${exercise.difficulty}`}>
                  {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                </span>
              </div>
              <button 
                className="btn-exercise-start"
                data-testid={`exercise-start-${exercise.id}`}
              >
                Start Exercise
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && pagination.total_pages > 1 && (
        <div className="exercise-pagination" data-testid="exercise-pagination">
          <button
            onClick={handlePreviousPage}
            disabled={page <= 1}
            className="btn-pagination"
            aria-label="Previous page"
            data-testid="exercise-pagination-previous"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={page >= pagination.total_pages}
            className="btn-pagination"
            aria-label="Next page"
            data-testid="exercise-pagination-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
