import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SessionsContext, SessionsProvider } from '../hooks/useSessions'
import ChatInterface from './ChatInterface'
import type { Session, Message, SessionsContextType } from '../types'

/**
 * Tests for ChatInterface component - Issue #19: Loading States and Disabled Buttons
 * 
 * Acceptance Criteria:
 * - [x] Spinner visible during AI response
 * - [x] Send button disabled during loading
 * - [x] End session button disabled during loading
 * - [x] Loading state clears on response or error
 * - [x] Visual feedback is clear
 */

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Helper to create a wrapper with mocked SessionsContext
const createContextWrapper = (contextValue: Partial<SessionsContextType> = {}) => {
  const defaultContext: SessionsContextType = {
    sessions: [{
      id: '1',
      scenario_id: 'cafe_order',
      difficulty: 'beginner',
      created_at: '2026-05-21T12:00:00Z',
      ended_at: null,
      messages: [],
      feedback: null,
    }],
    currentSessionId: '1',
    currentScenarioId: 'cafe_order',
    sessionEnded: false,
    isLoading: false,
    error: null,
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    getFeedback: vi.fn(),
    endSession: vi.fn(),
    setCurrentSessionId: vi.fn(),
    clearError: vi.fn(),
  }

  const mergedContext = { ...defaultContext, ...contextValue }

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <SessionsContext.Provider value={mergedContext}>
          {children}
        </SessionsContext.Provider>
      </MemoryRouter>
    )
  }
}

describe('ChatInterface Component - Issue #19 Loading States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC1: Spinner visible during AI response', () => {
    it('displays spinner when isLoading is true', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Spinner should be visible
      const spinner = screen.getByRole('status', { name: /Loading AI response/i })
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('loading-spinner')
      
      // Verify spinner element exists
      const spinnerElement = screen.getByRole('status').querySelector('.spinner')
      expect(spinnerElement).toBeInTheDocument()
    })

    it('hides spinner when isLoading is false', () => {
      // Given: isLoading = false
      const wrapper = createContextWrapper({ isLoading: false })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Spinner should not be visible
      expect(screen.queryByRole('status', { name: /Loading AI response/i })).not.toBeInTheDocument()
    })

    it('spinner has proper ARIA attributes for accessibility', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Spinner has accessibility attributes
      const spinner = screen.getByRole('status', { name: /Loading AI response/i })
      expect(spinner).toHaveAttribute('aria-live', 'polite')
      expect(spinner).toHaveAttribute('aria-label', 'Loading AI response...')
    })
  })

  describe('AC2: Send button disabled during loading', () => {
    it('Send button is disabled when isLoading is true', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Send button should be disabled
      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).toBeDisabled()
    })

    it('Send button is enabled when isLoading is false', () => {
      // Given: isLoading = false
      const wrapper = createContextWrapper({ isLoading: false })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Send button should be enabled
      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('AC3: End session button disabled during loading', () => {
    it('End Session button is disabled when isLoading is true', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: End Session button should be disabled
      const endSessionButton = screen.getByRole('button', { name: /End Session/i })
      expect(endSessionButton).toBeDisabled()
    })

    it('End Session button is disabled when sessionEnded is true', () => {
      // Given: sessionEnded = true
      const wrapper = createContextWrapper({ sessionEnded: true, isLoading: false })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: End Session button should be disabled
      const endSessionButton = screen.getByRole('button', { name: /End Session/i })
      expect(endSessionButton).toBeDisabled()
    })

    it('End Session button is enabled when isLoading is false and session is valid', () => {
      // Given: isLoading = false, sessionEnded = false, sessionId exists
      const wrapper = createContextWrapper({ isLoading: false, sessionEnded: false })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: End Session button should be enabled
      const endSessionButton = screen.getByRole('button', { name: /End Session/i })
      expect(endSessionButton).not.toBeDisabled()
    })

    it('End Session button is disabled when sessionId is null', () => {
      // Given: sessionId = null
      const wrapper = createContextWrapper({ isLoading: false, sessionEnded: false })
      
      // When: Component renders with null sessionId
      render(<ChatInterface sessionId="" />, { wrapper })
      
      // Then: End Session button should be disabled
      const endSessionButton = screen.getByRole('button', { name: /End Session/i })
      expect(endSessionButton).toBeDisabled()
    })
  })

  describe('AC5: Visual feedback is clear', () => {
    it('spinner has appropriate styling classes', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Spinner elements have correct classes
      const spinnerContainer = screen.getByRole('status', { name: /Loading AI response/i })
      expect(spinnerContainer).toHaveClass('loading-spinner')
      
      const spinner = spinnerContainer.querySelector('.spinner')
      expect(spinner).toBeInTheDocument()
    })

    it('disabled buttons have visual indication via class names', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Buttons have btn-primary and btn-danger classes
      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).toHaveClass('btn-primary')
      
      const endSessionButton = screen.getByRole('button', { name: /End Session/i })
      expect(endSessionButton).toHaveClass('btn-danger')
    })
  })

  describe('Integration: Loading state behavior', () => {
    it('Back button remains enabled during loading', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Back button should still be enabled (users can navigate away)
      const backButton = screen.getByRole('button', { name: /Back/i })
      expect(backButton).not.toBeDisabled()
    })

    it('input field is disabled during loading', () => {
      // Given: isLoading = true
      const wrapper = createContextWrapper({ isLoading: true })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Input field should be disabled
      const input = screen.getByPlaceholderText(/Type your message in French.../i)
      expect(input).toBeDisabled()
    })

    it('input field is enabled when not loading', () => {
      // Given: isLoading = false
      const wrapper = createContextWrapper({ isLoading: false })
      
      // When: Component renders
      render(<ChatInterface sessionId="1" />, { wrapper })
      
      // Then: Input field should be enabled
      const input = screen.getByPlaceholderText(/Type your message in French.../i)
      expect(input).not.toBeDisabled()
    })
  })
})
