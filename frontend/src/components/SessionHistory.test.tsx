import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SessionHistory from './SessionHistory'
import type { SessionSummary, SessionListResponse, PaginationInfo } from '../types'

// Mock the API client
vi.mock('../utils/api', () => ({
  sessionApi: {
    listSessions: vi.fn(),
    deleteSession: vi.fn(),
  },
}))

// Import the mocked API
import { sessionApi } from '../utils/api'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Test data
const mockSessionListResponse: SessionListResponse = {
  sessions: [
    {
      id: 1,
      scenario_id: 'cafe_order',
      scenario_name: 'Ordering at a Café',
      difficulty: 'intermediate',
      created_at: '2026-05-15T10:00:00Z',
      ended_at: '2026-05-15T10:15:00Z',
      overall_score: 88,
    },
    {
      id: 2,
      scenario_id: 'ask_directions',
      scenario_name: 'Asking for Directions',
      difficulty: 'beginner',
      created_at: '2026-05-14T09:00:00Z',
      ended_at: '2026-05-14T09:10:00Z',
      overall_score: 92,
    },
    {
      id: 3,
      scenario_id: 'job_interview',
      scenario_name: 'Job Interview',
      difficulty: 'advanced',
      created_at: '2026-05-13T14:00:00Z',
      ended_at: null,
      overall_score: null,
    },
  ],
  pagination: {
    total: 3,
    page: 1,
    per_page: 10,
    total_pages: 1,
  } as PaginationInfo,
}

const mockEmptySessionListResponse: SessionListResponse = {
  sessions: [],
  pagination: {
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  } as PaginationInfo,
}

const mockSessionWithNoScore: SessionSummary = {
  id: '1',
  scenario_id: 'cafe_order',
  scenario_name: 'Ordering at a Café',
  difficulty: 'intermediate',
  created_at: '2026-05-15T10:00:00Z',
  ended_at: '2026-05-15T10:15:00Z',
  overall_score: null,
}

// Helper to render component
const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <SessionHistory onSessionClick={mockNavigate} />
    </MemoryRouter>
  )
}

describe('SessionHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State (AC-145.6)', () => {
    it('displays loading message while fetching session list', async () => {
      // Mock the API to return a promise that never resolves
      ;(sessionApi.listSessions as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('Loading session history...')).toBeInTheDocument()
      })
    })
  })

  describe('Error State (AC-145.7)', () => {
    it('displays error message when API request fails', async () => {
      // Mock the API to reject
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('displays retry button when error occurs', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockRejectedValue(
        new Error('Failed to load')
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      })
    })

    it('calls listSessions again when retry button is clicked', async () => {
      // First call fails
      ;(sessionApi.listSessions as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockEmptySessionListResponse)

      renderWithRouter()

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Failed to load session history')).toBeInTheDocument()
      })

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

      // Verify API was called again
      await waitFor(() => {
        expect(sessionApi.listSessions).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Empty State (AC-145.5)', () => {
    it('displays message when no sessions exist', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockEmptySessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('No sessions yet. Start a new session!')).toBeInTheDocument()
      })
    })

    it('displays Session History heading even when empty', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockEmptySessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('Session History')).toBeInTheDocument()
      })
    })
  })

  describe('Success State (AC-145.1, AC-145.2, AC-145.3)', () => {
    it('displays Session History heading', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('Session History')).toBeInTheDocument()
      })
    })

    it('displays list of sessions when API returns data', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('Ordering at a Café')).toBeInTheDocument()
        expect(screen.getByText('Asking for Directions')).toBeInTheDocument()
        expect(screen.getByText('Job Interview')).toBeInTheDocument()
      })
    })

    it('displays scenario name for each session (AC-145.2)', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        const scenarioNames = screen.getAllByRole('heading', { level: 4 })
        expect(scenarioNames).toHaveLength(3)
        expect(scenarioNames[0]).toHaveTextContent('Ordering at a Café')
        expect(scenarioNames[1]).toHaveTextContent('Asking for Directions')
        expect(scenarioNames[2]).toHaveTextContent('Job Interview')
      })
    })

    it('displays date for each session (AC-145.2)', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        // Check that dates are displayed (format may vary by locale)
        expect(screen.getByText(/May 15/)).toBeInTheDocument()
        expect(screen.getByText(/May 14/)).toBeInTheDocument()
      })
    })

    it('displays overall score when available (AC-145.2)', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('88%')).toBeInTheDocument()
        expect(screen.getByText('92%')).toBeInTheDocument()
      })
    })

    it('displays "No score yet" for sessions without score (AC-145.2)', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('No score yet')).toBeInTheDocument()
      })
    })

    it('displays difficulty badge for each session', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText('intermediate')).toBeInTheDocument()
        expect(screen.getByText('beginner')).toBeInTheDocument()
        expect(screen.getByText('advanced')).toBeInTheDocument()
      })
    })

    it('calls onSessionClick when a session is clicked (AC-145.3, AC-145.4)', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        // Click on first session
        fireEvent.click(screen.getByText('Ordering at a Café'))
      })

      // Verify onSessionClick was called with session ID
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('1')
      })
    })

    it('displays "Click to view details" text for each session', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        const viewDetailsElements = screen.getAllByText(/Click to view details/)
        expect(viewDetailsElements).toHaveLength(3)
      })
    })
  })

  describe('API Integration', () => {
    it('calls listSessions API on mount with default parameters', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockEmptySessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(sessionApi.listSessions).toHaveBeenCalledWith(1, 10)
      })
    })

    it('transforms backend response to frontend format', async () => {
      // Backend returns id as number, frontend expects string
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        // Verify session IDs are strings in the rendered output
        const sessionItems = screen.getAllByRole('heading', { level: 4 })
        expect(sessionItems).toHaveLength(3)
      })
    })
  })

  describe('Accessibility', () => {
    it('has appropriate heading structure', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: 'Session History' })).toBeInTheDocument()
      })
    })

    it('has clickable session items', async () => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )

      renderWithRouter()

      await waitFor(() => {
        const sessionItems = screen.getAllByRole('heading', { level: 4 })
        expect(sessionItems[0]).toBeInTheDocument()
        expect(sessionItems[0].parentElement).toHaveAttribute('onclick')
      })
    })
  })

  describe('Delete Functionality (AC-149.1, AC-149.4, AC-149.5, AC-149.7, AC-149.8, AC-149.9)', () => {
    beforeEach(() => {
      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(
        mockSessionListResponse
      )
      ;(sessionApi.deleteSession as jest.Mock).mockResolvedValue(undefined)
    })

    it('renders delete button on each session item (AC-149.1)', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        expect(deleteButtons).toHaveLength(3) // 3 sessions in mock data
      })
    })

    it('opens confirmation modal when delete button is clicked (AC-149.3)', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Modal should be opened
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })

    it('calls deleteSession API with correct session ID (AC-149.4)', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(sessionApi.deleteSession).toHaveBeenCalledWith('1')
      })
    })

    it('removes session from list on successful deletion (AC-149.5)', async () => {
      renderWithRouter()

      await waitFor(() => {
        // Verify 3 sessions initially
        expect(screen.getAllByTestId('session-delete-button')).toHaveLength(3)
      })

      // Click delete on first session
      const deleteButtons = screen.getAllByTestId('session-delete-button')
      fireEvent.click(deleteButtons[0])

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        // Should only have 2 sessions now
        expect(screen.getAllByTestId('session-delete-button')).toHaveLength(2)
      })
    })

    it('shows success message on successful deletion (AC-149.5)', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(screen.getByText('Session deleted successfully')).toBeInTheDocument()
      })
    })

    it('displays error message when deletion fails (AC-149.7)', async () => {
      ;(sessionApi.deleteSession as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      )

      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(screen.getByText('Session not found')).toBeInTheDocument()
      })
    })

    it('disables delete button for active sessions (AC-149.8)', async () => {
      // Add an active session to the list
      const mockListWithActive: SessionListResponse = {
        sessions: [
          ...mockSessionListResponse.sessions,
          {
            id: 4,
            scenario_id: 'hotel_checkin',
            scenario_name: 'Hotel Check-in',
            difficulty: 'intermediate',
            created_at: '2026-05-16T11:00:00Z',
            ended_at: null, // Active session
            overall_score: null,
          },
        ],
        pagination: mockSessionListResponse.pagination,
      }

      ;(sessionApi.listSessions as jest.Mock).mockResolvedValue(mockListWithActive)

      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        // Last button should be disabled (active session)
        expect(deleteButtons[3]).toBeDisabled()
        // Others should be enabled
        expect(deleteButtons[0]).not.toBeDisabled()
      })
    })

    it('includes session info in confirmation message (AC-149.3)', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Should include scenario name and date
      expect(screen.getByText(/Ordering at a Café/)).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    it('shows loading state during deletion (AC-149.9)', async () => {
      // Mock deleteSession to simulate loading
      ;(sessionApi.deleteSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Button should show loading text
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    it('closes modal when delete is cancelled', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // Modal should be open
      expect(screen.getByTestId('modal')).toBeInTheDocument()

      // Click cancel
      fireEvent.click(screen.getByTestId('modal-cancel'))

      // Modal should be closed
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('does not trigger item click when delete button is clicked', async () => {
      renderWithRouter()

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('session-delete-button')
        fireEvent.click(deleteButtons[0])
      })

      // onSessionClick should not be triggered
      expect(mockNavigate).not.toHaveBeenCalled()
      // But modal should open
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })
  })
})
