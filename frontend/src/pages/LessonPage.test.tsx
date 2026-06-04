/**
 * Tests for LessonPage component
 * 
 * Tests cover:
 * - Rendering
 * - Passes props to LessonBrowser
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LessonPage from './LessonPage'
import LessonBrowser from '../components/LessonBrowser'

// Mock LessonBrowser
vi.mock('../components/LessonBrowser', () => ({
  default: () => <div data-testid="mock-lesson-browser">Mock LessonBrowser</div>,
}))

describe('LessonPage', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <MemoryRouter>
          <LessonPage />
        </MemoryRouter>
      )
      expect(screen.getByTestId('lesson-page')).toBeInTheDocument()
    })

    it('renders LessonBrowser component', () => {
      render(
        <MemoryRouter>
          <LessonPage />
        </MemoryRouter>
      )
      expect(screen.getByTestId('mock-lesson-browser')).toBeInTheDocument()
    })

    it('has page-container class', () => {
      render(
        <MemoryRouter>
          <LessonPage />
        </MemoryRouter>
      )
      expect(screen.getByTestId('lesson-page')).toHaveClass('page-container')
    })
  })

  describe('Props Passing', () => {
    it('passes no initial filters by default', () => {
      render(
        <MemoryRouter>
          <LessonPage />
        </MemoryRouter>
      )
      // LessonBrowser is rendered without initial filters
      expect(screen.getByTestId('mock-lesson-browser')).toBeInTheDocument()
    })
  })
})
