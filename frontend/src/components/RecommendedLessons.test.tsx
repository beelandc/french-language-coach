import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import RecommendedLessons from './RecommendedLessons'
import { grammarApi } from '../utils/api'
import type { LessonSummary, RecommendationResponse } from '../types'

// Mock the API client so no real HTTP requests are made.
vi.mock('../utils/api', () => ({
  grammarApi: {
    getRecommendations: vi.fn(),
  },
}))

const mockLessons: LessonSummary[] = [
  { id: 'passe-compose', title: 'Le Passé Composé', topic: 'Past Tenses', difficulty: 'beginner' },
  { id: 'imparfait', title: "L'Imparfait", topic: 'Past Tenses', difficulty: 'intermediate' },
  { id: 'plus-que-parfait', title: 'Le Plus-Que-Parfait', topic: 'Past Tenses', difficulty: 'advanced' },
]

const fallbackLessons: LessonSummary[] = [
  { id: 'articles', title: 'Articles', topic: 'Nouns and Adjectives', difficulty: 'beginner' },
]

function buildResponse(focusArea: string, lessons: LessonSummary[], matchedTopics: string[] = []): RecommendationResponse {
  return { focus_area: focusArea, matched_topics: matchedTopics, lessons }
}

// Helper component that exposes the current route pathname for navigation assertions.
function RouteProbe() {
  const location = useLocation()
  return <div data-testid="route-probe">{location.pathname}</div>
}

function renderWithRouter(initialEntry = '/feedback/1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/feedback/:sessionId" element={<RecommendedLessons focusArea="Past Tenses" />} />
        <Route path="/lessons/:lessonId" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RecommendedLessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the section heading and lessons after loading', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', mockLessons, ['Past Tenses'])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommended-lessons')).toBeInTheDocument()
      })
      expect(screen.getByText('Recommended lessons')).toBeInTheDocument()
      expect(screen.getByText('Le Passé Composé')).toBeInTheDocument()
      expect(screen.getByText("L'Imparfait")).toBeInTheDocument()
      expect(screen.getByText('Le Plus-Que-Parfait')).toBeInTheDocument()
    })

    it('renders a lesson card for each recommended lesson', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', mockLessons, ['Past Tenses'])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('lesson-card-passe-compose')).toBeInTheDocument()
        expect(screen.getByTestId('lesson-card-imparfait')).toBeInTheDocument()
        expect(screen.getByTestId('lesson-card-plus-que-parfait')).toBeInTheDocument()
      })
    })

    it('shows title, topic, and difficulty for each lesson', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', [mockLessons[0]], ['Past Tenses'])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByText('Le Passé Composé')).toBeInTheDocument()
        expect(screen.getByText(/Topic: Past Tenses/i)).toBeInTheDocument()
        expect(screen.getByText('Beginner')).toBeInTheDocument()
      })
    })

    it('renders up to 3 lessons (backend caps at 3)', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', mockLessons, ['Past Tenses'])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommended-lessons')).toBeInTheDocument()
      })
      expect(screen.getAllByRole('button', { name: /View lesson:/i }).length).toBe(3)
    })
  })

  describe('Loading state', () => {
    it('renders a loading indicator while fetching', () => {
      ;(grammarApi.getRecommendations as any).mockImplementation(() => new Promise(() => {}))
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument()
    })

    it('replaces loading with lessons once the request resolves', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', [mockLessons[0]], ['Past Tenses'])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.queryByTestId('recommendations-loading')).not.toBeInTheDocument()
        expect(screen.getByTestId('recommended-lessons')).toBeInTheDocument()
      })
    })
  })

  describe('Error state', () => {
    it('renders an error message when the request fails', async () => {
      ;(grammarApi.getRecommendations as any).mockRejectedValue(new Error('Failed to load recommendations'))
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toBeInTheDocument()
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument()
      })
    })

    it('uses a fallback message for non-Error rejections', async () => {
      ;(grammarApi.getRecommendations as any).mockRejectedValue('network down')
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toHaveTextContent('Failed to load recommendations')
      })
    })

    it('still renders the section heading in the error state', async () => {
      ;(grammarApi.getRecommendations as any).mockRejectedValue(new Error('boom'))
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Recommended lessons' })).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('renders an empty message when no lessons are returned', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(buildResponse('x', []))
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="x" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommendations-empty')).toBeInTheDocument()
        expect(screen.getByText('No recommended lessons available.')).toBeInTheDocument()
      })
    })

    it('treats a missing lessons array as empty', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue({
        focus_area: 'x',
        matched_topics: [],
        lessons: undefined,
      })
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="x" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommendations-empty')).toBeInTheDocument()
      })
    })
  })

  describe('Fallback (unknown focus_area)', () => {
    it('renders general lessons returned for an unknown focus_area (backend fallback)', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Pratiquer davantage', fallbackLessons, [])
      )
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Pratiquer davantage" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(screen.getByTestId('recommended-lessons')).toBeInTheDocument()
        expect(screen.getByText('Articles')).toBeInTheDocument()
        expect(screen.getByTestId('lesson-card-articles')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to the lesson viewer route when a card is clicked', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(
        buildResponse('Past Tenses', [mockLessons[0]], ['Past Tenses'])
      )
      renderWithRouter('/feedback/1')
      await waitFor(() => {
        expect(screen.getByTestId('lesson-card-passe-compose')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByTestId('lesson-card-passe-compose'))
      await waitFor(() => {
        expect(screen.getByTestId('route-probe')).toHaveTextContent('/lessons/passe-compose')
      })
    })
  })

  describe('API invocation', () => {
    it('calls getRecommendations with the trimmed focus_area', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(buildResponse('Past Tenses', mockLessons))
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea={'  Past Tenses  '} />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(grammarApi.getRecommendations).toHaveBeenCalledWith('Past Tenses')
      })
    })

    it('re-fetches when the focus_area changes', async () => {
      ;(grammarApi.getRecommendations as any).mockResolvedValue(buildResponse('Past Tenses', mockLessons))
      const { rerender } = render(
        <MemoryRouter>
          <RecommendedLessons focusArea="Past Tenses" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(grammarApi.getRecommendations).toHaveBeenCalledWith('Past Tenses')
      })
      ;(grammarApi.getRecommendations as any).mockResolvedValue(buildResponse('Pronouns', [mockLessons[0]]))
      rerender(
        <MemoryRouter>
          <RecommendedLessons focusArea="Pronouns" />
        </MemoryRouter>
      )
      await waitFor(() => {
        expect(grammarApi.getRecommendations).toHaveBeenCalledWith('Pronouns')
      })
    })
  })

  describe('Empty focus_area prop', () => {
    it('renders nothing when focus_area is an empty string', () => {
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="" />
        </MemoryRouter>
      )
      expect(screen.queryByTestId('recommended-lessons')).not.toBeInTheDocument()
      expect(screen.queryByTestId('recommendations-loading')).not.toBeInTheDocument()
      expect(screen.queryByText('Recommended lessons')).not.toBeInTheDocument()
    })

    it('renders nothing when focus_area is whitespace only', () => {
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="   " />
        </MemoryRouter>
      )
      expect(screen.queryByTestId('recommended-lessons')).not.toBeInTheDocument()
      expect(screen.queryByText('Recommended lessons')).not.toBeInTheDocument()
    })

    it('does not call the API when focus_area is empty', () => {
      render(
        <MemoryRouter>
          <RecommendedLessons focusArea="" />
        </MemoryRouter>
      )
      expect(grammarApi.getRecommendations).not.toHaveBeenCalled()
    })
  })
})
