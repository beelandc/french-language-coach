import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SessionHistoryItem from './SessionHistoryItem'
import type { SessionSummary } from '../types'

// Mock onClick handler
const mockOnClick = vi.fn()

// Test data
const mockSessionWithScore: SessionSummary = {
  id: '123',
  scenario_id: 'cafe_order',
  scenario_name: 'Ordering at a Café',
  difficulty: 'intermediate',
  created_at: '2026-05-15T10:00:00Z',
  ended_at: '2026-05-15T10:15:00Z',
  overall_score: 88,
}

const mockSessionWithoutScore: SessionSummary = {
  id: '456',
  scenario_id: 'ask_directions',
  scenario_name: 'Asking for Directions',
  difficulty: 'beginner',
  created_at: '2026-05-14T09:30:00Z',
  ended_at: null,
  overall_score: null,
}

const mockSessionWithHighScore: SessionSummary = {
  id: '789',
  scenario_id: 'job_interview',
  scenario_name: 'Job Interview',
  difficulty: 'advanced',
  created_at: '2026-05-13T14:00:00Z',
  ended_at: '2026-05-13T14:30:00Z',
  overall_score: 95,
}

const mockSessionWithoutEndedAt: SessionSummary = {
  id: '101',
  scenario_id: 'hotel_checkin',
  scenario_name: 'Hotel Check-in',
  difficulty: 'intermediate',
  created_at: '2026-05-16T11:00:00Z',
  ended_at: null,
  overall_score: null,
}

describe('SessionHistoryItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnClick.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering (AC-145.2)', () => {
    it('renders session scenario name', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('Ordering at a Café')).toBeInTheDocument()
    })

    it('renders session difficulty badge', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('intermediate')).toBeInTheDocument()
    })

    it('renders date in locale format', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      // Date format depends on locale, but should contain May 15
      expect(screen.getByText(/May 15/)).toBeInTheDocument()
    })

    it('renders time in locale format', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      // Time should be displayed
      expect(screen.getByText(/10:00/)).toBeInTheDocument()
    })

    it('renders ended date when session has ended_at', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText(/Ended:/)).toBeInTheDocument()
    })

    it('does not render ended date when session has no ended_at', () => {
      render(<SessionHistoryItem session={mockSessionWithoutEndedAt} onClick={mockOnClick} />)
      
      expect(screen.queryByText(/Ended:/)).not.toBeInTheDocument()
    })

    it('renders overall score when available (AC-145.2)', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('88%')).toBeInTheDocument()
    })

    it('renders "No score yet" when overall_score is null (AC-145.2)', () => {
      render(<SessionHistoryItem session={mockSessionWithoutScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('No score yet')).toBeInTheDocument()
    })

    it('renders "Click to view details" text', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText(/Click to view details/)).toBeInTheDocument()
    })
  })

  describe('Click Handler (AC-145.3, AC-145.4)', () => {
    it('calls onClick with session id when clicked', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      fireEvent.click(screen.getByText('Ordering at a Café'))
      
      expect(mockOnClick).toHaveBeenCalledWith('123')
    })

    it('calls onClick with correct session id for different sessions', () => {
      render(<SessionHistoryItem session={mockSessionWithoutScore} onClick={mockOnClick} />)
      
      fireEvent.click(screen.getByText('Asking for Directions'))
      
      expect(mockOnClick).toHaveBeenCalledWith('456')
    })

    it('can be clicked anywhere on the session item', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      // Click on the difficulty badge
      fireEvent.click(screen.getByText('intermediate'))
      
      expect(mockOnClick).toHaveBeenCalledWith('123')
    })
  })

  describe('Score Formatting', () => {
    it('formats score with percentage sign', () => {
      render(<SessionHistoryItem session={mockSessionWithHighScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('95%')).toBeInTheDocument()
    })

    it('handles null score gracefully', () => {
      render(<SessionHistoryItem session={mockSessionWithoutScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('No score yet')).toBeInTheDocument()
    })

    it('handles undefined score gracefully', () => {
      const sessionWithUndefinedScore: SessionSummary = {
        ...mockSessionWithScore,
        overall_score: undefined,
      }
      
      render(<SessionHistoryItem session={sessionWithUndefinedScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('No score yet')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('formats date correctly for different locales', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      // Should display date in some format
      const dateElements = screen.getAllByText(/May\s+15/)
      expect(dateElements.length).toBeGreaterThan(0)
    })

    it('formats time correctly', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      // Should display time
      expect(screen.getByText(/10:00/)).toBeInTheDocument()
    })
  })

  describe('Difficulty Badge', () => {
    it('displays beginner difficulty', () => {
      render(<SessionHistoryItem session={mockSessionWithoutScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('beginner')).toBeInTheDocument()
    })

    it('displays intermediate difficulty', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('intermediate')).toBeInTheDocument()
    })

    it('displays advanced difficulty', () => {
      render(<SessionHistoryItem session={mockSessionWithHighScore} onClick={mockOnClick} />)
      
      expect(screen.getByText('advanced')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has clickable element', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      const sessionItem = screen.getByText('Ordering at a Café').parentElement
      expect(sessionItem).toHaveAttribute('onclick')
    })

    it('has appropriate heading level for scenario name', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      expect(screen.getByRole('heading', { level: 4, name: 'Ordering at a Café' })).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('has session-item class', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      const sessionItem = screen.getByText('Ordering at a Café').parentElement
      expect(sessionItem).toHaveClass('session-item')
    })

    it('has session-difficulty class for difficulty badge', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      const difficultyBadge = screen.getByText('intermediate').parentElement
      expect(difficultyBadge).toHaveClass('session-difficulty')
    })

    it('has session-score class for score display', () => {
      render(<SessionHistoryItem session={mockSessionWithScore} onClick={mockOnClick} />)
      
      const scoreElement = screen.getByText('88%').parentElement
      expect(scoreElement).toHaveClass('session-score')
    })

    it('has session-score-pending class when no score', () => {
      render(<SessionHistoryItem session={mockSessionWithoutScore} onClick={mockOnClick} />)
      
      const scoreElement = screen.getByText('No score yet').parentElement
      expect(scoreElement).toHaveClass('session-score', 'session-score-pending')
    })
  })

  describe('Delete Functionality (AC-149.1, AC-149.3, AC-149.8, AC-149.9)', () => {
    const mockOnDelete = vi.fn()

    beforeEach(() => {
      mockOnDelete.mockClear()
    })

    it('renders delete button when onDelete is provided and session is completed', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByTestId('session-delete-button')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('does not render delete button when onDelete is not provided', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick}
        />
      )

      expect(screen.queryByTestId('session-delete-button')).not.toBeInTheDocument()
    })

    it('disables delete button for active sessions (ended_at is null) (AC-149.8)', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithoutEndedAt} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      expect(deleteButton).toBeDisabled()
    })

    it('enables delete button for completed sessions (ended_at is not null)', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      expect(deleteButton).not.toBeDisabled()
    })

    it('has tooltip for disabled delete button on active session', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithoutEndedAt} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      expect(deleteButton).toHaveAttribute('title', 'Cannot delete active session')
    })

    it('opens confirmation modal when delete button is clicked (AC-149.3)', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Modal should be opened
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText('Delete Session')).toBeInTheDocument()
    })

    it('does not trigger item click when delete button is clicked', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // onClick should not be called
      expect(mockOnClick).not.toHaveBeenCalled()
      // But modal should open
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })

    it('displays loading state on delete button when deletion in progress (AC-149.9)', async () => {
      // Mock onDelete to simulate loading
      mockOnDelete.mockImplementation(() => new Promise(() => {}))

      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Button should show loading text
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    it('calls onDelete with session id when confirmed', async () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Wait for the async call
      await vi.waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('123')
      })
    })

    it('closes modal when delete is cancelled', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Modal should be open
      expect(screen.getByTestId('modal')).toBeInTheDocument()

      // Click cancel
      fireEvent.click(screen.getByTestId('modal-cancel'))

      // Modal should be closed
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('displays error message when delete fails', async () => {
      mockOnDelete.mockRejectedValue(new Error('Session not found'))

      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Click confirm in modal
      fireEvent.click(screen.getByTestId('modal-confirm'))

      // Wait for error to be displayed
      await vi.waitFor(() => {
        expect(screen.getByText('Session not found')).toBeInTheDocument()
      })
    })

    it('includes session info in confirmation message (AC-149.3)', () => {
      render(
        <SessionHistoryItem 
          session={mockSessionWithScore} 
          onClick={mockOnClick} 
          onDelete={mockOnDelete}
        />
      )

      const deleteButton = screen.getByTestId('session-delete-button')
      fireEvent.click(deleteButton)

      // Should include scenario name and date
      expect(screen.getByText(/Ordering at a Café/)).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })
  })
})
