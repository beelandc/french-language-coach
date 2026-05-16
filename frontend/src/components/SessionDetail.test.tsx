import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SessionDetail from './SessionDetail'
import type { Session, Message, Feedback } from '../types'

// Mock the API client
vi.mock('../utils/api', () => ({
  sessionApi: {
    getSession: vi.fn(),
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
const mockSessionWithFeedback: Session = {
  id: '123',
  scenario_id: 'cafe_order',
  created_at: '2026-05-15T10:00:00Z',
  ended_at: '2026-05-15T10:15:00Z',
  difficulty: 'intermediate',
  messages: [
    {
      id: '1',
      session_id: '123',
      role: 'user',
      content: 'Bonjour, je voudrais un café.',
      created_at: '2026-05-15T10:00:00Z',
    },
    {
      id: '2',
      session_id: '123',
      role: 'assistant',
      content: 'Bonjour ! Que souhaitez-vous ?',
      created_at: '2026-05-15T10:01:00Z',
    },
  ],
  feedback: {
    grammar_score: 85,
    vocabulary_score: 90,
    fluency_score: 88,
    overall_score: 88,
    strengths: ['Good vocabulary usage', 'Natural phrasing'],
    focus_area: 'grammar',
    example_corrections: [
      {
        original: 'je voudrais un café',
        corrected: 'Je voudrais un café',
        explanation: 'Capitalize first person singular',
      },
    ],
  },
}

const mockSessionWithoutFeedback: Session = {
  id: '456',
  scenario_id: 'ask_directions',
  created_at: '2026-05-15T11:00:00Z',
  ended_at: null,
  difficulty: 'beginner',
  messages: [
    {
      id: '1',
      session_id: '456',
      role: 'user',
      content: 'Où est la gare ?',
      created_at: '2026-05-15T11:00:00Z',
    },
  ],
  feedback: null,
}

const mockEmptySession: Session = {
  id: '789',
  scenario_id: 'job_interview',
  created_at: '2026-05-15T12:00:00Z',
  ended_at: null,
  difficulty: 'intermediate',
  messages: [],
  feedback: null,
}

const mockSessionWithEmptyFeedback: Session = {
  id: '101',
  scenario_id: 'hotel_checkin',
  created_at: '2026-05-15T13:00:00Z',
  ended_at: '2026-05-15T13:10:00Z',
  difficulty: 'advanced',
  messages: [
    {
      id: '1',
      session_id: '101',
      role: 'user',
      content: 'Hello',
      created_at: '2026-05-15T13:00:00Z',
    },
  ],
  feedback: {
    grammar_score: 50,
    vocabulary_score: 50,
    fluency_score: 50,
    overall_score: 50,
    strengths: [],
    focus_area: '',
    example_corrections: [],
  },
}

// Helper to render component with router
const renderWithRouter = (sessionId: string) => {
  return render(
    <MemoryRouter initialEntries={`/sessions/${sessionId}`}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<SessionDetail sessionId={sessionId} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SessionDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('displays loading message while fetching session data', async () => {
      // Mock the API to never resolve (simulate loading)
      ;(sessionApi.getSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Loading session...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      ;(sessionApi.getSession as jest.Mock).mockRejectedValue(
        new Error('Failed to load session')
      )

      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Failed to load session')).toBeInTheDocument()
      })
    })

    it('displays error message for invalid session ID', async () => {
      ;(sessionApi.getSession as jest.Mock).mockRejectedValue(
        new Error('Invalid session ID')
      )

      renderWithRouter('invalid')

      await waitFor(() => {
        expect(screen.getByText('Invalid session ID')).toBeInTheDocument()
      })
    })

    it('displays back button on error', async () => {
      ;(sessionApi.getSession as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      )

      renderWithRouter('999')

      await waitFor(() => {
        expect(screen.getByText('Back to Home')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('displays "Session not found" when session is null', async () => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue(null)

      renderWithRouter('999')

      await waitFor(() => {
        expect(screen.getByText('Session not found')).toBeInTheDocument()
      })
    })
  })

  describe('Session with Feedback', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue(
        // Backend format - need to match what the backend returns
        {
          id: 123,
          scenario_id: 'cafe_order',
          difficulty: 'intermediate',
          created_at: '2026-05-15T10:00:00Z',
          ended_at: '2026-05-15T10:15:00Z',
          messages: [
            { role: 'user', content: 'Bonjour, je voudrais un café.' },
            { role: 'assistant', content: 'Bonjour ! Que souhaitez-vous ?' },
          ],
          feedback: {
            grammar_score: 85,
            vocabulary_score: 90,
            fluency_score: 88,
            overall_score: 88,
            strengths: ['Good vocabulary usage', 'Natural phrasing'],
            focus_area: 'grammar',
            example_corrections: [
              {
                original: 'je voudrais un café',
                corrected: 'Je voudrais un café',
                explanation: 'Capitalize first person singular',
              },
            ],
          },
        }
      )
    })

    it('displays scenario name in header', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText(/Session Details: Ordering at a Café/i)).toBeInTheDocument()
      })
    })

    it('displays session metadata (created_at, ended_at, difficulty)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText(/Started:/)).toBeInTheDocument()
        expect(screen.getByText(/Ended:/)).toBeInTheDocument()
        expect(screen.getByText(/Difficulty:/)).toBeInTheDocument()
        expect(screen.getByText('intermediate')).toBeInTheDocument()
      })
    })

    it('displays all messages in conversation', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Bonjour, je voudrais un café.')).toBeInTheDocument()
        expect(screen.getByText('Bonjour ! Que souhaitez-vous ?')).toBeInTheDocument()
      })
    })

    it('displays conversation transcript header', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Conversation Transcript')).toBeInTheDocument()
      })
    })

    it('displays feedback report header', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Feedback Report')).toBeInTheDocument()
      })
    })

    it('displays all score cards', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Grammar')).toBeInTheDocument()
        expect(screen.getByText('Vocabulary')).toBeInTheDocument()
        expect(screen.getByText('Fluency')).toBeInTheDocument()
        expect(screen.getByText('Overall')).toBeInTheDocument()
      })
    })

    it('displays score values', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument()
        expect(screen.getByText('90')).toBeInTheDocument()
        expect(screen.getByText('88')).toBeInTheDocument()
      })
    })

    it('displays strengths list', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument()
        expect(screen.getByText('Good vocabulary usage')).toBeInTheDocument()
        expect(screen.getByText('Natural phrasing')).toBeInTheDocument()
      })
    })

    it('displays focus area', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText(/Priority: Improve your grammar/i)).toBeInTheDocument()
      })
    })

    it('displays example corrections', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByText('Example Corrections')).toBeInTheDocument()
        expect(screen.getByText('je voudrais un café')).toBeInTheDocument()
        expect(screen.getByText('Je voudrais un café')).toBeInTheDocument()
      })
    })

    it('displays back button', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const backButtons = screen.getAllByText('Back to Home')
        expect(backButtons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Session without Feedback', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 456,
        scenario_id: 'ask_directions',
        difficulty: 'beginner',
        created_at: '2026-05-15T11:00:00Z',
        ended_at: null,
        messages: [{ role: 'user', content: 'Où est la gare ?' }],
        feedback: null,
      })
    })

    it('displays messages even when feedback is null', async () => {
      renderWithRouter('456')

      await waitFor(() => {
        expect(screen.getByText('Où est la gare ?')).toBeInTheDocument()
      })
    })

    it('displays "Feedback not yet available" message', async () => {
      renderWithRouter('456')

      await waitFor(() => {
        expect(
          screen.getByText(/Feedback not yet available/i)
        ).toBeInTheDocument()
      })
    })

    it('does not display feedback sections when feedback is null', async () => {
      renderWithRouter('456')

      await waitFor(() => {
        expect(screen.queryByText('Feedback Report')).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty Session', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 789,
        scenario_id: 'job_interview',
        difficulty: 'intermediate',
        created_at: '2026-05-15T12:00:00Z',
        ended_at: null,
        messages: [],
        feedback: null,
      })
    })

    it('displays "No messages in this session" when messages array is empty', async () => {
      renderWithRouter('789')

      await waitFor(() => {
        expect(screen.getByText(/No messages in this session/i)).toBeInTheDocument()
      })
    })
  })

  describe('Session with Empty Feedback Fields', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 101,
        scenario_id: 'hotel_checkin',
        difficulty: 'advanced',
        created_at: '2026-05-15T13:00:00Z',
        ended_at: '2026-05-15T13:10:00Z',
        messages: [{ role: 'user', content: 'Hello' }],
        feedback: {
          grammar_score: 50,
          vocabulary_score: 50,
          fluency_score: 50,
          overall_score: 50,
          strengths: [],
          focus_area: '',
          example_corrections: [],
        },
      })
    })

    it('handles empty strengths array', async () => {
      renderWithRouter('101')

      await waitFor(() => {
        expect(screen.getByText(/No specific strengths identified/i)).toBeInTheDocument()
      })
    })

    it('handles empty focus area', async () => {
      renderWithRouter('101')

      await waitFor(() => {
        expect(screen.getByText(/No focus area specified/i)).toBeInTheDocument()
      })
    })

    it('handles empty example corrections array', async () => {
      renderWithRouter('101')

      await waitFor(() => {
        // Example Corrections section should not be rendered if there are no corrections
        expect(screen.queryByText('Example Corrections')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 123,
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: '2026-05-15T10:00:00Z',
        ended_at: '2026-05-15T10:15:00Z',
        messages: [],
        feedback: null,
      })
    })

    it('navigates to home when Back button is clicked', async () => {
      const { container } = renderWithRouter('123')

      await waitFor(() => {
        const backButtons = container.querySelectorAll('button')
        // Click the first Back to Home button
        backButtons[0]?.click()
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('No Session ID', () => {
    it('handles empty session ID', async () => {
      render(
        <MemoryRouter initialEntries="/sessions/"}>
          <Routes>
            <Route path="/sessions/:sessionId?" element={<SessionDetail sessionId="" />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('No session ID provided')).toBeInTheDocument()
      })
    })
  })

  describe('Delete Functionality (AC-149.2, AC-149.4, AC-149.6, AC-149.7, AC-149.8, AC-149.9)', () => {
    beforeEach(() => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 123,
        scenario_id: 'cafe_order',
        difficulty: 'intermediate',
        created_at: '2026-05-15T10:00:00Z',
        ended_at: '2026-05-15T10:15:00Z',
        messages: [],
        feedback: null,
      })
      ;(sessionApi.deleteSession as jest.Mock).mockResolvedValue(undefined)
    })

    it('renders delete button for completed session (AC-149.2)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        expect(screen.getByTestId('session-detail-delete-button')).toBeInTheDocument()
        expect(screen.getByText('Delete Session')).toBeInTheDocument()
      })
    })

    it('does not render delete button for active session (AC-149.8)', async () => {
      ;(sessionApi.getSession as jest.Mock).mockResolvedValue({
        id: 456,
        scenario_id: 'ask_directions',
        difficulty: 'beginner',
        created_at: '2026-05-15T11:00:00Z',
        ended_at: null, // Active session
        messages: [],
        feedback: null,
      })

      renderWithRouter('456')

      await waitFor(() => {
        expect(screen.queryByTestId('session-detail-delete-button')).not.toBeInTheDocument()
      })
    })

    it('opens confirmation modal when delete button is clicked (AC-149.3)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Modal should be opened
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText('Delete Session')).toBeInTheDocument()
    })

    it('calls deleteSession API when confirmed (AC-149.4)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(sessionApi.deleteSession).toHaveBeenCalledWith('123')
      })
    })

    it('redirects to home page on successful deletion (AC-149.6)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('displays error message when deletion fails (AC-149.7)', async () => {
      ;(sessionApi.deleteSession as jest.Mock).mockRejectedValue(
        new Error('Cannot delete active session')
      )

      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      await waitFor(() => {
        expect(screen.getByText('Cannot delete active session')).toBeInTheDocument()
      })
    })

    it('includes session info in confirmation message (AC-149.3)', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
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

      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Button should show loading text
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    it('closes modal when delete is cancelled', async () => {
      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Modal should be open
      expect(screen.getByTestId('modal')).toBeInTheDocument()

      // Click cancel
      fireEvent.click(screen.getByTestId('modal-cancel'))

      // Modal should be closed
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('disables delete button during deletion (AC-149.9)', async () => {
      // Mock deleteSession to simulate loading
      ;(sessionApi.deleteSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRouter('123')

      await waitFor(() => {
        const deleteButton = screen.getByTestId('session-detail-delete-button')
        fireEvent.click(deleteButton)
      })

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Original delete button should be disabled
      expect(screen.getByTestId('session-detail-delete-button')).toBeDisabled()
    })
  })
})
