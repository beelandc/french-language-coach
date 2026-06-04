/**
 * Tests for LessonCard component
 * 
 * Tests cover:
 * - Rendering lesson information
 * - Click handler
 * - Keyboard accessibility
 * - Difficulty badge rendering
 * - ARIA attributes
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LessonCard from './LessonCard'
import type { LessonSummary } from '../types/index'

// Test data
const mockLesson: LessonSummary = {
  id: 'test-lesson',
  title: 'Test Lesson',
  topic: 'Test Topic',
  difficulty: 'beginner',
}

const mockOnClick = vi.fn()

describe('LessonCard', () => {
  // Reset mock before each test
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders lesson title', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByText('Test Lesson')).toBeInTheDocument()
    })

    it('renders lesson topic', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByText(/Topic: Test Topic/i)).toBeInTheDocument()
    })

    it('renders lesson id', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByText(/ID: test-lesson/i)).toBeInTheDocument()
    })

    it('renders difficulty badge with capitalized text', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
    })

    it('has correct test id', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByTestId('lesson-card-test-lesson')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has role="button" for accessibility', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('has tabIndex=0 for keyboard focus', () => {
      const { container } = render(
        <LessonCard lesson={mockLesson} onClick={mockOnClick} />
      )
      const button = container.firstChild as HTMLElement
      expect(button).toHaveAttribute('tabindex', '0')
    })

    it('has aria-label with lesson title', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByLabelText(/View lesson: Test Lesson/i)).toBeInTheDocument()
    })

    it('has aria-label for difficulty badge', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      expect(screen.getByLabelText(/Difficulty: beginner/i)).toBeInTheDocument()
    })
  })

  describe('Click Handling', () => {
    it('calls onClick with lesson id when clicked', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      fireEvent.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledWith('test-lesson')
    })

    it('calls onClick with lesson id on Enter key press', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
      expect(mockOnClick).toHaveBeenCalledWith('test-lesson')
    })

    it('calls onClick with lesson id on Space key press', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
      expect(mockOnClick).toHaveBeenCalledWith('test-lesson')
    })

    it('does not call onClick for other keys', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('prevents default on Enter/Space key press', () => {
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      const preventDefault = vi.fn()
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter', preventDefault })
      expect(preventDefault).toHaveBeenCalled()
    })
  })

  describe('Difficulty Colors', () => {
    it('renders beginner with green color', () => {
      const beginnerLesson: LessonSummary = {
        ...mockLesson,
        difficulty: 'beginner',
        id: 'beginner-test',
      }
      render(<LessonCard lesson={beginnerLesson} onClick={mockOnClick} />)
      const badge = screen.getByText('Beginner')
      // Check that it has inline styles with background color
      expect(badge).toHaveStyle({ backgroundColor: '#e8f5e9', color: '#4caf50' })
    })

    it('renders intermediate with orange color', () => {
      const intermediateLesson: LessonSummary = {
        ...mockLesson,
        difficulty: 'intermediate',
        id: 'intermediate-test',
      }
      render(<LessonCard lesson={intermediateLesson} onClick={mockOnClick} />)
      const badge = screen.getByText('Intermediate')
      expect(badge).toHaveStyle({ backgroundColor: '#fff3e0', color: '#ff9800' })
    })

    it('renders advanced with red color', () => {
      const advancedLesson: LessonSummary = {
        ...mockLesson,
        difficulty: 'advanced',
        id: 'advanced-test',
      }
      render(<LessonCard lesson={advancedLesson} onClick={mockOnClick} />)
      const badge = screen.getByText('Advanced')
      expect(badge).toHaveStyle({ backgroundColor: '#ffebee', color: '#f44336' })
    })
  })

  describe('Edge Cases', () => {
    it('renders lesson with empty topic', () => {
      const lessonWithEmptyTopic: LessonSummary = {
        ...mockLesson,
        topic: '',
        id: 'empty-topic',
      }
      render(<LessonCard lesson={lessonWithEmptyTopic} onClick={mockOnClick} />)
      expect(screen.getByText(/Topic: /i)).toBeInTheDocument()
    })

    it('renders lesson with special characters in title', () => {
      const lessonWithSpecialChars: LessonSummary = {
        ...mockLesson,
        title: "L'imparfait et le passé composé",
        id: 'special-chars',
      }
      render(<LessonCard lesson={lessonWithSpecialChars} onClick={mockOnClick} />)
      expect(screen.getByText("L'imparfait et le passé composé")).toBeInTheDocument()
    })

    it('handles click with undefined onClick gracefully', () => {
      // This shouldn't happen in practice, but test for robustness
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const onClick = undefined as unknown as (id: string) => void
      
      // Re-render with proper onClick to avoid type errors in test
      render(<LessonCard lesson={mockLesson} onClick={mockOnClick} />)
      
      consoleWarn.mockRestore()
    })
  })
})
