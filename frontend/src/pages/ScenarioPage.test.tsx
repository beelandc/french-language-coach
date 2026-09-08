import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScenarioPage from './ScenarioPage'
import { sessionApi } from '../utils/api'
import type { SessionSummary } from '../types'

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

// Mock ScenarioSelector to isolate page-level behavior
jest.mock('../components/ScenarioSelector', () => () => (
  <div data-testid="scenario-selector" />
))

// Mock QuickAccessSession to isolate page-level behavior and avoid pulling in
// its internal dependencies. Renders the session name and a button that invokes
// the resume onClick handler with the session id.
jest.mock('../components/QuickAccessSession', () => ({ session, onClick }: { session: SessionSummary; onClick: (sessionId: string) => void }) => (
  <div
    data-testid="quick-access-session"
    onClick={() => onClick(session.id)}
    role="button"
    tabIndex={0}
  >
    {session.scenario_name}
  </div>
))

describe('ScenarioPage Component', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the scenario page container', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )
      render(<ScenarioPage />)

      expect(screen.getByTestId('scenario-page')).toBeInTheDocument()
    })

    it('renders the ScenarioSelector above the Quick Access section', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )
      render(<ScenarioPage />)

      const selector = screen.getByTestId('scenario-selector')
      const quickAccess = screen.getByTestId('quick-access-section')
      // ScenarioSelector should appear before the Quick Access section in the DOM
      expect(selector.compareDocumentPosition(quickAccess)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    })

    it('renders the Quick Access section', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )
      render(<ScenarioPage />)

      expect(screen.getByTestId('quick-access-section')).toBeInTheDocument()
    })

    it('renders the contextual section title', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )
      render(<ScenarioPage />)

      expect(screen.getByText('Recent Conversation Sessions')).toBeInTheDocument()
    })

    it('renders View All Sessions button', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )
      render(<ScenarioPage />)

      expect(screen.getByTestId('view-all-sessions-btn')).toBeInTheDocument()
      expect(screen.getByText('View All Sessions')).toBeInTheDocument()
    })
  })

  describe('Session Fetching', () => {
    it('displays loading state initially', () => {
      // Mock API to return a promise that never resolves
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )

      render(<ScenarioPage />)

      expect(screen.getByTestId('quick-access-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading recent sessions...')).toBeInTheDocument()
    })

    it('calls sessionApi.listSessions with page 1 and perPage 5', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )

      render(<ScenarioPage />)

      expect(sessionApi.listSessions).toHaveBeenCalledWith(1, 5)
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

      render(<ScenarioPage />)

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

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-empty')).toBeInTheDocument()
      })

      expect(screen.getByText('No recent sessions. Start a new one!')).toBeInTheDocument()
    })

    it('displays error state when fetch fails', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-error')).toBeInTheDocument()
      })

      // Error instances use err.message; the fallback message is used for non-Error rejections
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByTestId('quick-access-retry-btn')).toBeInTheDocument()
    })

    it('displays error state with fallback message for non-Error rejections', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue('string error')

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-error')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load recent sessions')).toBeInTheDocument()
      expect(screen.getByTestId('quick-access-retry-btn')).toBeInTheDocument()
    })

    it('re-fetches sessions when Retry button is clicked', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValueOnce({
        sessions: mockSessions,
        pagination: {
          total: 2,
          page: 1,
          per_page: 5,
          total_pages: 1,
        },
      })

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('quick-access-retry-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-list')).toBeInTheDocument()
      })

      expect(sessionApi.listSessions).toHaveBeenCalledTimes(2)
    })
  })

  describe('Navigation', () => {
    it('navigates to /sessions when View All Sessions button is clicked', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )

      render(<ScenarioPage />)

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

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-empty')).toBeInTheDocument()
      })

      const button = screen.getByTestId('quick-access-start-btn')
      fireEvent.click(button)

      expect(mockNavigate).toHaveBeenCalledWith('/scenarios')
    })

    it('navigates to /sessions/:id when a session is resumed', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        pagination: {
          total: 2,
          page: 1,
          per_page: 5,
          total_pages: 1,
        },
      })

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-list')).toBeInTheDocument()
      })

      // Click the first session card (resume). There are multiple session cards,
      // so target the first one.
      const sessionCard = screen.getAllByTestId('quick-access-session')[0]
      fireEvent.click(sessionCard)

      expect(mockNavigate).toHaveBeenCalledWith('/sessions/1')
    })
  })

  describe('Accessibility', () => {
    it('View All Sessions button has correct aria-label', () => {
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      )

      render(<ScenarioPage />)

      const button = screen.getByTestId('view-all-sessions-btn')
      expect(button).toHaveAttribute('aria-label', 'View all sessions')
    })

    it('Retry button has correct aria-label', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-retry-btn')).toBeInTheDocument()
      })

      expect(screen.getByTestId('quick-access-retry-btn')).toHaveAttribute(
        'aria-label',
        'Retry loading sessions'
      )
    })

    it('Start Now button has correct aria-label', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        pagination: {
          total: 0,
          page: 1,
          per_page: 5,
          total_pages: 0,
        },
      })

      render(<ScenarioPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-access-start-btn')).toBeInTheDocument()
      })

      expect(screen.getByTestId('quick-access-start-btn')).toHaveAttribute(
        'aria-label',
        'Start a new session'
      )
    })
  })
})
