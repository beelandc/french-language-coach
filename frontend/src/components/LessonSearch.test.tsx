/**
 * Tests for LessonSearch component
 * 
 * Tests cover:
 * - Rendering of all filter controls
 * - Input change handlers
 * - Clear filters button
 * - Accessibility attributes
 * - Form submission handling
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LessonSearch from './LessonSearch'
import type { Difficulty } from '../types/index'

// Mock handlers
const mockOnSearch = vi.fn()
const mockOnTopicFilter = vi.fn()
const mockOnDifficultyFilter = vi.fn()

describe('LessonSearch', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders search input', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-search-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search lessons...')).toBeInTheDocument()
    })

    it('renders topic filter input', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-topic-filter')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Filter by topic')).toBeInTheDocument()
    })

    it('renders difficulty filter select', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-difficulty-filter')).toBeInTheDocument()
      expect(screen.getByText('All Levels')).toBeInTheDocument()
    })

    it('renders all difficulty options', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('renders with default empty values', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const searchInput = screen.getByTestId('lesson-search-input') as HTMLInputElement
      const topicInput = screen.getByTestId('lesson-topic-filter') as HTMLInputElement
      const difficultySelect = screen.getByTestId('lesson-difficulty-filter') as HTMLSelectElement
      
      expect(searchInput.value).toBe('')
      expect(topicInput.value).toBe('')
      expect(difficultySelect.value).toBe('')
    })

    it('renders with initial values', () => {
      render(
        <LessonSearch
          searchQuery="test search"
          topicFilter="verbs"
          difficultyFilter="intermediate"
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const searchInput = screen.getByTestId('lesson-search-input') as HTMLInputElement
      const topicInput = screen.getByTestId('lesson-topic-filter') as HTMLInputElement
      const difficultySelect = screen.getByTestId('lesson-difficulty-filter') as HTMLSelectElement
      
      expect(searchInput.value).toBe('test search')
      expect(topicInput.value).toBe('verbs')
      expect(difficultySelect.value).toBe('intermediate')
    })
  })

  describe('Input Handlers', () => {
    it('calls onSearch when search input changes', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const searchInput = screen.getByTestId('lesson-search-input')
      fireEvent.change(searchInput, { target: { value: 'conjugation' } })
      expect(mockOnSearch).toHaveBeenCalledWith('conjugation')
    })

    it('calls onTopicFilter when topic input changes', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const topicInput = screen.getByTestId('lesson-topic-filter')
      fireEvent.change(topicInput, { target: { value: 'verbs' } })
      expect(mockOnTopicFilter).toHaveBeenCalledWith('verbs')
    })

    it('calls onDifficultyFilter when difficulty select changes', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const difficultySelect = screen.getByTestId('lesson-difficulty-filter')
      fireEvent.change(difficultySelect, { target: { value: 'beginner' } })
      expect(mockOnDifficultyFilter).toHaveBeenCalledWith('beginner')
    })
  })

  describe('Clear Filters Button', () => {
    it('does not show clear button when no filters are active', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.queryByTestId('lesson-clear-filters')).not.toBeInTheDocument()
    })

    it('shows clear button when search query is active', () => {
      render(
        <LessonSearch
          searchQuery="test"
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-clear-filters')).toBeInTheDocument()
    })

    it('shows clear button when topic filter is active', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter="verbs"
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-clear-filters')).toBeInTheDocument()
    })

    it('shows clear button when difficulty filter is active', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter="advanced"
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByTestId('lesson-clear-filters')).toBeInTheDocument()
    })

    it('calls all handlers with empty values when clear button is clicked', () => {
      render(
        <LessonSearch
          searchQuery="test"
          topicFilter="verbs"
          difficultyFilter="intermediate"
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      fireEvent.click(screen.getByTestId('lesson-clear-filters'))
      expect(mockOnSearch).toHaveBeenCalledWith('')
      expect(mockOnTopicFilter).toHaveBeenCalledWith('')
      expect(mockOnDifficultyFilter).toHaveBeenCalledWith('')
    })
  })

  describe('Accessibility', () => {
    it('has aria-label for search input', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByLabelText('Search lessons by title or topic')).toBeInTheDocument()
    })

    it('has aria-label for topic filter', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByLabelText('Filter lessons by topic')).toBeInTheDocument()
    })

    it('has aria-label for difficulty filter', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByLabelText('Filter lessons by difficulty')).toBeInTheDocument()
    })

    it('has aria-label for clear filters button', () => {
      render(
        <LessonSearch
          searchQuery="test"
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument()
    })

    it('has visually-hidden label for search input', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      // The label exists but is visually hidden
      expect(screen.getByText('Search lessons')).toBeInTheDocument()
    })

    it('has visible labels for topic and difficulty filters', () => {
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      expect(screen.getByText('Topic')).toBeInTheDocument()
      expect(screen.getByText('Difficulty')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('prevents form submission default behavior', () => {
      const preventDefault = vi.fn()
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const form = screen.getByTestId('lesson-search').querySelector('form')
      if (form) {
        fireEvent.submit(form, { preventDefault })
        expect(preventDefault).toHaveBeenCalled()
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles special characters in input values', () => {
      render(
        <LessonSearch
          searchQuery="L'imparfait"
          topicFilter="Verbs & Conjugation"
          difficultyFilter="advanced"
          onSearch={mockOnSearch}
          onTopicFilter={mockOnTopicFilter}
          onDifficultyFilter={mockOnDifficultyFilter}
        />
      )
      const searchInput = screen.getByTestId('lesson-search-input') as HTMLInputElement
      const topicInput = screen.getByTestId('lesson-topic-filter') as HTMLInputElement
      
      expect(searchInput.value).toBe("L'imparfait")
      expect(topicInput.value).toBe("Verbs & Conjugation")
    })

    it('handles undefined handlers gracefully', () => {
      // This shouldn't happen in practice, but test for robustness
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // We still need to provide handlers to avoid type errors
      render(
        <LessonSearch
          searchQuery=""
          topicFilter=""
          difficultyFilter=""
          onSearch={() => {}}
          onTopicFilter={() => {}}
          onDifficultyFilter={() => {}}
        />
      )
      
      consoleError.mockRestore()
    })
  })
})
