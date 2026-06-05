import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import IndexPage from './IndexPage'
import { sessionApi } from '../utils/api'

// Mock useNavigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock sessionApi
jest.mock('../utils/api', () => ({
  sessionApi: {
    listSessions: jest.fn(),
  },
}))

describe('IndexPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders HeroSection', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('hero-section')).toBeInTheDocument()
      expect(screen.getByText('Welcome to French Language Coach')).toBeInTheDocument()
    })

    it('renders app description from VISION.md', () => {
      render(<IndexPage />)
      
      const description = screen.getByText(/comprehensive French language learning platform/)
      expect(description).toBeInTheDocument()
    })

    it('renders Get Started button', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('hero-cta')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    it('renders FeatureCardsSection', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('feature-cards-section')).toBeInTheDocument()
    })

    it('renders all 5 feature cards', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('feature-card-conversation')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-lessons')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-reference')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-exercises')).toBeInTheDocument()
      expect(screen.getByTestId('feature-card-vocabulary')).toBeInTheDocument()
    })

    it('renders feature card titles', () => {
      render(<IndexPage />)
      
      expect(screen.getByText('Conversation Practice')).toBeInTheDocument()
      expect(screen.getByText('Grammar Lessons')).toBeInTheDocument()
      expect(screen.getByText('Grammar Reference')).toBeInTheDocument()
      expect(screen.getByText('Grammar Exercises')).toBeInTheDocument()
      expect(screen.getByText('Vocabulary Flashcards')).toBeInTheDocument()
    })

    it('renders QuickAccessSection', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('quick-access-section')).toBeInTheDocument()
      expect(screen.getByText('Recent Sessions')).toBeInTheDocument()
    })

    it('renders View All Sessions button', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('view-all-sessions-btn')).toBeInTheDocument()
      expect(screen.getByText('View All Sessions')).toBeInTheDocument()
    })

    it('Vocabulary Flashcards card shows Coming Soon', () => {
      render(<IndexPage />)
      
      const vocabCard = screen.getByTestId('feature-card-vocabulary')
      expect(vocabCard).toHaveTextContent('Coming Soon')
    })
  })

  describe('Session Fetching', () => {
    const mockSessions = [
      {
        id: 1,
        scenario_id: 'cafe_order',
        scenario_name: 'Ordering at a Café',
        difficulty: 'intermediate' as const,
        created_at: '2026-06-04T10:00:00Z',
        ended_at: '2026-06-04T10:15:00Z',
        overall_score: 85,
        is_locked: false,
        locked_at: null,
        locked_by: null,
      },
      {
        id: 2,
        scenario_id: 'ask_directions',
        scenario_name: 'Asking for Directions',
        difficulty: 'beginner' as const,
        created_at: '2026-06-04T11:00:00Z',
        ended_at: null,
        overall_score: null,
        is_locked: false,
        locked_at: null,
        locked_by: null,
      },
    ]

    it('displays loading state initially', () => {
      // Mock API to return a promise that never resolves
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() => 
        new Promise(() => {})
      )
      
      render(<IndexPage />)
      
      expect(screen.getByTestId('quick-access-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading recent sessions...')).toBeInTheDocument()
    })

    it('displays sessions when fetch succeeds', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        pagination: {
          total: 2,
          page: 1,
          per_page: 5,
          total_pages: 1,
        },
      })
      
      render(<IndexPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-access-list')).toBeInTheDocument()
      })
      
      // Should show both sessions
      expect(screen.getByText('Ordering at a Café')).toBeInTheDocument()
      expect(screen.getByText('Asking for Directions')).toBeInTheDocument()
    })

    it('displays empty state when no sessions', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        pagination: {
          total: 0,
          page: 1,
          per_page: 5,
          total_pages: 0,
        },
      })
      
      render(<IndexPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-access-empty')).toBeInTheDocument()
      })
      
      expect(screen.getByText('No recent sessions. Start a new one!')).toBeInTheDocument()
    })

    it('displays error state when fetch fails', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )
      
      render(<IndexPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-access-error')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Failed to load recent sessions')).toBeInTheDocument()
      expect(screen.getByTestId('quick-access-retry-btn')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('navigates to /scenarios when Get Started button is clicked', () => {
      render(<IndexPage />)
      
      const button = screen.getByTestId('hero-cta')
      fireEvent.click(button)
      
      expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
    })

    it('navigates to /lessons when Grammar Lessons card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-lessons')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/lessons')
    })

    it('navigates to /reference when Grammar Reference card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-reference')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/reference')
    })

    it('navigates to /exercises when Grammar Exercises card is clicked', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-exercises')
      fireEvent.click(card)
      
      expect(mockNavigate).toHaveBeenCalledWith('/exercises')
    })

    it('does not navigate when Vocabulary Flashcards card is clicked (disabled)', () => {
      render(<IndexPage />)
      
      const card = screen.getByTestId('feature-card-vocabulary')
      fireEvent.click(card)
      
      // Should not call navigate since it's disabled
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('navigates to /sessions when View All Sessions button is clicked', () => {
      render(<IndexPage />)
      
      const button = screen.getByTestId('view-all-sessions-btn')
      fireEvent.click(button)
      
      expect(mockNavigate).toHaveBeenCalledWith('/sessions')
    })

    it('navigates to /scenarios when Start Now button in empty state is clicked', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        pagination: {
          total: 0,
          page: 1,
          per_page: 5,
          total_pages: 0,
        },
      })
      
      render(<IndexPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-access-empty')).toBeInTheDocument()
      })
      
      const button = screen.getByTestId('quick-access-start-btn')
      fireEvent.click(button)
      
      expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
    })
  })

  describe('Accessibility', () => {
    it('has correct data-testid for the page', () => {
      render(<IndexPage />)
      
      expect(screen.getByTestId('index-page')).toBeInTheDocument()
    })

    it('Get Started button has correct aria-label', () => {
      render(<IndexPage />)
      
      const button = screen.getByTestId('hero-cta')
      expect(button).toHaveAttribute('aria-label', 'Get started with French Language Coach')
    })

    it('View All Sessions button has correct aria-label', () => {
      render(<IndexPage />)
      
      const button = screen.getByTestId('view-all-sessions-btn')
      expect(button).toHaveAttribute('aria-label', 'View all sessions')
    })
  })
})
