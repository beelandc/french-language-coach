/**
 * ReferencePage Component
 * 
 * Page component for browsing and searching grammar reference entries.
 * Displays ReferenceSearch component and a list of ReferenceCard components.
 * 
 * Matches the pattern of LessonPage for consistency.
 */

import { useCallback, useEffect, useState } from 'react'
import { grammarApi } from '../utils/api'
import ReferenceSearch from '../components/ReferenceSearch'
import ReferenceCard from '../components/ReferenceCard'
import type { GrammarReference, ReferenceCategory, Difficulty, PaginationInfo } from '../types/index'

/**
 * ReferencePage component - main page for grammar reference search
 * 
 * @returns JSX Element
 */
export default function ReferencePage() {
  // State for search and filter parameters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ReferenceCategory | ''>('')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('')
  
  // State for results and loading/error
  const [references, setReferences] = useState<GrammarReference[]>([])
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

  // Fetch references when filters or page change
  useEffect(() => {
    const fetchReferences = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Use empty string for category and difficulty if they're empty
        const category = categoryFilter === '' ? undefined : categoryFilter
        const difficulty = difficultyFilter === '' ? undefined : difficultyFilter
        const query = searchQuery === '' ? undefined : searchQuery
        
        const response = await grammarApi.searchReferences(
          query,
          category,
          difficulty,
          page,
          perPage
        )
        
        setReferences(response.references)
        setPagination(response.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reference entries')
        setReferences([])
        setPagination({ total: 0, page: 1, per_page: 10, total_pages: 0 })
      } finally {
        setIsLoading(false)
      }
    }
    
    // Use a small delay to debounce rapid filter changes
    const timer = setTimeout(fetchReferences, 100)
    
    return () => clearTimeout(timer)
  }, [searchQuery, categoryFilter, difficultyFilter, page, perPage])

  // Handle search query change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Reset to first page when search changes
    setPage(1)
  }, [])

  // Handle category filter change
  const handleCategoryFilter = useCallback((category: ReferenceCategory | '') => {
    setCategoryFilter(category)
    setPage(1)
  }, [])

  // Handle difficulty filter change
  const handleDifficultyFilter = useCallback((difficulty: Difficulty | '') => {
    setDifficultyFilter(difficulty)
    setPage(1)
  }, [])

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

  return (
    <div className="reference-page" data-testid="reference-page">
      <h2 className="reference-page-title">Grammar Reference Search</h2>
      <p className="reference-page-description">
        Search 50+ grammar terms and concepts with definitions, examples, and common pitfalls.
      </p>

      {/* Search and Filter Controls */}
      <ReferenceSearch
        onSearch={handleSearch}
        onCategoryFilter={handleCategoryFilter}
        onDifficultyFilter={handleDifficultyFilter}
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        difficultyFilter={difficultyFilter}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="loading-message" data-testid="reference-loading">
          Loading grammar references...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message" data-testid="reference-error">
          {error}
          <button 
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('')
              setDifficultyFilter('')
              setPage(1)
            }}
            className="btn-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && !error && (
        <p className="reference-results-count" data-testid="reference-results-count">
          Found {pagination.total} reference{pagination.total !== 1 ? 's' : ''} matching your criteria
        </p>
      )}

      {/* Empty Results */}
      {!isLoading && !error && references.length === 0 && (
        <div className="no-results" data-testid="reference-no-results">
          <p>No grammar reference entries found matching your search.</p>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && !error && references.length > 0 && (
        <div className="reference-cards-grid" data-testid="reference-cards">
          {references.map((reference) => (
            <ReferenceCard
              key={reference.id}
              reference={reference}
              data-testid={`reference-card-${reference.id}`}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && pagination.total_pages > 1 && (
        <div className="reference-pagination" data-testid="reference-pagination">
          <button
            onClick={handlePreviousPage}
            disabled={page <= 1}
            className="btn-pagination"
            aria-label="Previous page"
            data-testid="reference-pagination-previous"
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
            data-testid="reference-pagination-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
