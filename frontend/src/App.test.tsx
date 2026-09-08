/**
 * Tests for App component - Home Navigation Button Feature (Issue #211)
 * 
 * Tests cover:
 * - Home button rendering
 * - Home button accessibility attributes
 * - Home button navigation functionality
 * - Home button data-testid
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Mock child components to avoid complex setup
vi.mock('./pages/HomePage', () => ({
  default: () => <div data-testid="home-page">HomePage</div>
}))

vi.mock('./pages/IndexPage', () => ({
  default: () => <div data-testid="index-page">IndexPage</div>
}))

vi.mock('./pages/ScenarioPage', () => ({
  default: () => <div data-testid="scenario-page">ScenarioPage</div>
}))

vi.mock('./pages/ChatPage', () => ({
  default: () => <div data-testid="chat-page">ChatPage</div>
}))

vi.mock('./pages/FeedbackPage', () => ({
  default: () => <div data-testid="feedback-page">FeedbackPage</div>
}))

vi.mock('./pages/SessionDetailPage', () => ({
  default: () => <div data-testid="session-detail-page">SessionDetailPage</div>
}))

vi.mock('./pages/LessonPage', () => ({
  default: () => <div data-testid="lesson-page">LessonPage</div>
}))

vi.mock('./pages/LessonDetailPage', () => ({
  default: () => <div data-testid="lesson-detail-page">LessonDetailPage</div>
}))

vi.mock('./pages/ReferencePage', () => ({
  default: () => <div data-testid="reference-page">ReferencePage</div>
}))

vi.mock('./pages/ExercisePage', () => ({
  default: () => <div data-testid="exercise-page">ExercisePage</div>
}))

vi.mock('./pages/ExerciseBrowserPage', () => ({
  default: () => <div data-testid="exercise-browser-page">ExerciseBrowserPage</div>
}))

vi.mock('./pages/VocabularyPage', () => ({
  default: () => <div data-testid="vocabulary-page">VocabularyPage</div>
}))

vi.mock('./pages/DeckDetailPage', () => ({
  default: () => <div data-testid="deck-detail-page">DeckDetailPage</div>
}))

vi.mock('./pages/DeckCardsPage', () => ({
  default: () => <div data-testid="deck-cards-page">DeckCardsPage</div>
}))

describe('App Component - Home Navigation Button (Issue #211)', () => {
  
  describe('Home Button Rendering', () => {
    it('renders home button with correct test id', () => {
      render(
        <MemoryRouter initialEntries={['/scenarios']}>
          <App />
        </MemoryRouter>
      )
      expect(screen.getByTestId('home-button')).toBeInTheDocument()
    })

    it('renders home button with home emoji', () => {
      render(
        <MemoryRouter initialEntries={['/lessons']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton.textContent).toContain('🏠')
    })

    it('renders home button as a Link component', () => {
      render(
        <MemoryRouter initialEntries={['/chat/123']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveAttribute('href', '/')
    })
  })

  describe('Home Button Accessibility', () => {
    it('has aria-label for screen readers', () => {
      render(
        <MemoryRouter initialEntries={['/feedback/456']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveAttribute('aria-label', 'Home')
    })

    it('has title attribute for hover tooltip', () => {
      render(
        <MemoryRouter initialEntries={['/sessions/789']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveAttribute('title', 'Return to Home')
    })

    it('has correct className for styling', () => {
      render(
        <MemoryRouter initialEntries={['/vocabulary']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveClass('home-button')
    })
  })

  describe('Home Button on All Pages', () => {
    const testPages = [
      '/',
      '/home',
      '/scenarios',
      '/chat/123',
      '/feedback/456',
      '/sessions/789',
      '/lessons',
      '/lessons/1',
      '/reference',
      '/exercises',
      '/exercises/2',
      '/vocabulary',
      '/vocabulary/decks/3',
      '/vocabulary/decks/3/cards'
    ]

    testPages.forEach(page => {
      it(`renders home button on ${page} page`, () => {
        render(
          <MemoryRouter initialEntries={[page]}>
            <App />
          </MemoryRouter>
        )
        expect(screen.getByTestId('home-button')).toBeInTheDocument()
      })
    })
  })

  describe('Header Structure', () => {
    it('maintains existing header structure', () => {
      render(
        <MemoryRouter initialEntries={['/lessons']}>
          <App />
        </MemoryRouter>
      )
      expect(screen.getByRole('heading', { name: 'French Language Coach' })).toBeInTheDocument()
    })

    it('renders both home button and title in header', () => {
      render(
        <MemoryRouter initialEntries={['/exercises']}>
          <App />
        </MemoryRouter>
      )
      const header = screen.getByRole('heading', { name: 'French Language Coach' }).parentElement
      expect(header).toContainElement(screen.getByTestId('home-button'))
    })
  })

  describe('Acceptance Criteria Verification', () => {
    it('AC1: All pages display a clickable home button in the header', () => {
      // Test several representative pages
      const pages = ['/', '/scenarios', '/lessons', '/vocabulary', '/exercises']
      
      pages.forEach(page => {
        render(
          <MemoryRouter initialEntries={[page]}>
            <App />
          </MemoryRouter>
        )
        const homeButton = screen.getByTestId('home-button')
        expect(homeButton).toBeInTheDocument()
        expect(homeButton).toBeVisible()
      })
    })

    it('AC3: Home button is visually consistent across all pages', () => {
      // This test verifies the button has consistent styling attributes
      const pages = ['/lessons', '/vocabulary', '/exercises']
      
      pages.forEach(page => {
        render(
          <MemoryRouter initialEntries={[page]}>
            <App />
          </MemoryRouter>
        )
        const homeButton = screen.getByTestId('home-button')
        expect(homeButton).toHaveClass('home-button')
        expect(homeButton).toHaveAttribute('aria-label', 'Home')
        expect(homeButton.textContent).toContain('🏠')
      })
    })

    it('AC4: Home button is accessible (keyboard navigation, screen reader support)', () => {
      render(
        <MemoryRouter initialEntries={['/lessons']}>
          <App />
        </MemoryRouter>
      )
      const homeButton = screen.getByTestId('home-button')
      
      // Check accessibility attributes
      expect(homeButton).toHaveAttribute('aria-label', 'Home')
      expect(homeButton).toHaveAttribute('title', 'Return to Home')
      
      // Check that it's a focusable element (Link renders as <a>)
      expect(homeButton.tagName).toBe('A')
    })
  })
})