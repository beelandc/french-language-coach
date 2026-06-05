import { render, screen, fireEvent } from '@testing-library/react'
import QuickAccessSession from './QuickAccessSession'
import type { SessionSummary } from '../types'

// Mock useNavigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('QuickAccessSession Component', () => {
  const mockSession: SessionSummary = {
    id: '1',
    scenario_id: 'cafe_order',
    scenario_name: 'Ordering at a Café',
    difficulty: 'intermediate',
    created_at: '2026-06-04T10:00:00Z',
    ended_at: '2026-06-04T10:15:00Z',
    overall_score: 85,
    is_locked: false,
    locked_at: null,
    locked_by: null,
  }

  const mockSessionInProgress: SessionSummary = {
    id: '2',
    scenario_id: 'ask_directions',
    scenario_name: 'Asking for Directions',
    difficulty: 'beginner',
    created_at: '2026-06-04T11:00:00Z',
    ended_at: null,
    overall_score: null,
    is_locked: false,
    locked_at: null,
    locked_by: null,
  }

  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with session data', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByText('Ordering at a Café')).toBeInTheDocument()
      expect(screen.getByText('intermediate')).toBeInTheDocument()
    })

    it('displays formatted date', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      // Should display date in a readable format
      expect(screen.getByTestId('quick-access-session-date')).toBeInTheDocument()
    })

    it('displays score when available', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByText('Score: 85/100')).toBeInTheDocument()
    })

    it('displays "In Progress" when score is null', () => {
      render(<QuickAccessSession session={mockSessionInProgress} onClick={mockOnClick} />)
      
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('displays ended date when session has ended', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByText(/Ended:/)).toBeInTheDocument()
    })

    it('does not display ended date when session is in progress', () => {
      render(<QuickAccessSession session={mockSessionInProgress} onClick={mockOnClick} />)
      
      expect(screen.queryByText(/Ended:/)).not.toBeInTheDocument()
    })

    it('has correct data-testid', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByTestId('quick-access-session')).toBeInTheDocument()
    })

    it('has correct data-testid for title', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByTestId('quick-access-session-title')).toBeInTheDocument()
    })

    it('has correct data-testid for date', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByTestId('quick-access-session-date')).toBeInTheDocument()
    })

    it('has Resume button with correct data-testid', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      expect(screen.getByTestId('quick-access-resume-btn')).toBeInTheDocument()
      expect(screen.getByText('Resume')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick with session ID when clicked', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      fireEvent.click(card)
      
      expect(mockOnClick).toHaveBeenCalledWith('1')
    })

    it('calls onClick with session ID when Resume button is clicked', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const button = screen.getByTestId('quick-access-resume-btn')
      fireEvent.click(button)
      
      // Should still call onClick with session ID
      expect(mockOnClick).toHaveBeenCalledWith('1')
    })

    it('calls onClick with session ID when Enter key is pressed', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(mockOnClick).toHaveBeenCalledWith('1')
    })

    it('calls onClick with session ID when Space key is pressed', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      fireEvent.keyDown(card, { key: ' ' })
      
      expect(mockOnClick).toHaveBeenCalledWith('1')
    })
  })

  describe('Accessibility', () => {
    it('has role="button"', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('has tabIndex=0', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('has aria-label with session info', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const card = screen.getByTestId('quick-access-session')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Ordering at a Café'))
    })

    it('Resume button has correct aria-label', () => {
      render(<QuickAccessSession session={mockSession} onClick={mockOnClick} />)
      
      const button = screen.getByTestId('quick-access-resume-btn')
      expect(button).toHaveAttribute('aria-label', 'Resume session Ordering at a Café')
    })
  })

  describe('Session without scenario_name', () => {
    it('uses scenario_id as fallback for title', () => {
      const sessionWithoutName: SessionSummary = {
        ...mockSession,
        scenario_name: undefined,
      }
      // Cast to allow undefined
      render(<QuickAccessSession session={sessionWithoutName as unknown as SessionSummary} onClick={mockOnClick} />)
      
      // Should use scenario_id as fallback
      expect(screen.getByText('cafe_order')).toBeInTheDocument()
    })
  })
})
