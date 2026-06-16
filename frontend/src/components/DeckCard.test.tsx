/**
 * Tests for DeckCard component
 * 
 * Tests cover:
 * - Rendering with deck data
 * - Displaying deck name, description, and card count
 * - Progress bar rendering and colors
 * - Progress text formatting
 * - Tag display
 * - Click handling
 * - Accessibility
 * - Edge cases
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DeckCard from './DeckCard'
import type { DeckWithProgress } from '../types/index'

// Mock deck data
const mockDeck: DeckWithProgress = {
  id: 1,
  name: 'Travel Vocabulary',
  description: 'Essential words for traveling in French-speaking countries',
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-02T00:00:00',
  card_count: 20,
  learned_count: 10,
  progress_percent: 50,
  tags: ['travel', 'beginner', 'essential'],
}

const mockDeckNoDescription: DeckWithProgress = {
  ...mockDeck,
  id: 2,
  description: null,
}

const mockDeckNoTags: DeckWithProgress = {
  ...mockDeck,
  id: 3,
  tags: [],
}

const mockDeckManyTags: DeckWithProgress = {
  ...mockDeck,
  id: 4,
  tags: ['travel', 'beginner', 'essential', 'common', 'frequent', 'useful'],
}

const mockDeckZeroCards: DeckWithProgress = {
  ...mockDeck,
  id: 5,
  card_count: 0,
  learned_count: 0,
  progress_percent: 0,
}

const mockDeckAllLearned: DeckWithProgress = {
  ...mockDeck,
  id: 6,
  learned_count: 20,
  progress_percent: 100,
}

const mockDeckLowProgress: DeckWithProgress = {
  ...mockDeck,
  id: 7,
  learned_count: 2,
  progress_percent: 10,
}

const mockDeckHighProgress: DeckWithProgress = {
  ...mockDeck,
  id: 8,
  learned_count: 17,
  progress_percent: 85,
}

describe('DeckCard', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders deck card with basic information', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      expect(screen.getByText('Travel Vocabulary')).toBeInTheDocument()
      expect(screen.getByText('Essential words for traveling in French-speaking countries')).toBeInTheDocument()
      expect(screen.getByTestId('deck-card-count-1')).toHaveTextContent('20 cards')
      expect(screen.getByText('ID: 1')).toBeInTheDocument()
    })

    it('renders deck without description', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckNoDescription} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Description should not be rendered
      expect(screen.queryByText('Essential words for traveling in French-speaking countries')).toBeNull()
    })

    it('renders deck with no tags', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckNoTags} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Tags section should not be rendered
      expect(screen.queryByTestId('deck-card-tags')).toBeNull()
    })

    it('renders deck with multiple tags, limiting to 3 with "more" indicator', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckManyTags} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Should show first 3 tags
      expect(screen.getByTestId('deck-tag-4-travel')).toBeInTheDocument()
      expect(screen.getByTestId('deck-tag-4-beginner')).toBeInTheDocument()
      expect(screen.getByTestId('deck-tag-4-essential')).toBeInTheDocument()
      
      // Should show "more" indicator
      expect(screen.getByTestId('deck-more-tags-4')).toHaveTextContent('+3 more')
    })
  })

  describe('Progress Display', () => {
    it('displays progress text correctly', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-progress-text-1')).toHaveTextContent('10/20 cards learned (50%)')
    })

    it('displays zero progress correctly', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckZeroCards} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-progress-text-5')).toHaveTextContent('0/0 cards learned (0%)')
    })

    it('displays 100% progress correctly', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckAllLearned} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-progress-text-6')).toHaveTextContent('20/20 cards learned (100%)')
    })

    it('displays low progress text', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckLowProgress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-progress-text-7')).toHaveTextContent('2/20 cards learned (10%)')
    })

    it('displays high progress text', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckHighProgress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-progress-text-8')).toHaveTextContent('17/20 cards learned (85%)')
    })
  })

  describe('Progress Bar', () => {
    it('renders progress bar with correct width', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-1')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '50%' })
    })

    it('renders zero progress bar', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckZeroCards} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-5')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('renders full progress bar', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckAllLearned} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-6')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })

    it('uses red color for low progress (0-33%)', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckLowProgress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-7')
      expect(progressBar).toHaveStyle({ backgroundColor: '#f44336' })
    })

    it('uses orange color for medium progress (34-66%)', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-1')
      expect(progressBar).toHaveStyle({ backgroundColor: '#ff9800' })
    })

    it('uses green color for high progress (67-100%)', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeckHighProgress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-8')
      expect(progressBar).toHaveStyle({ backgroundColor: '#4caf50' })
    })
  })

  describe('Click Handling', () => {
    it('calls onClick when card is clicked', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      fireEvent.click(card)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(1)
    })

    it('calls onClick when Enter key is pressed', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(1)
    })

    it('calls onClick when Space key is pressed', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      fireEvent.keyDown(card, { key: ' ' })

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(1)
    })

    it('does not call onClick for other keys', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      fireEvent.keyDown(card, { key: 'Escape' })

      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has correct role and tabIndex for accessibility', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has descriptive aria-label', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const card = screen.getByTestId('deck-card-1')
      expect(card).toHaveAttribute('aria-label', 'View deck: Travel Vocabulary. 10/20 cards learned (50%)')
    })

    it('has aria-label on progress bar', () => {
      render(
        <MemoryRouter>
          <DeckCard deck={mockDeck} onClick={mockOnClick} />
        </MemoryRouter>
      )

      const progressBar = screen.getByTestId('deck-progress-bar-1')
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 50%')
    })
  })

  describe('Edge Cases', () => {
    it('handles deck with special characters in name', () => {
      const deckWithSpecialChars: DeckWithProgress = {
        ...mockDeck,
        id: 100,
        name: 'French & "Special" Characters <test>',
      }

      render(
        <MemoryRouter>
          <DeckCard deck={deckWithSpecialChars} onClick={mockOnClick} />
        </MemoryRouter>
      )

      expect(screen.getByText('French & "Special" Characters <test>')).toBeInTheDocument()
    })

    it('handles deck with empty name', () => {
      const deckWithEmptyName: DeckWithProgress = {
        ...mockDeck,
        id: 101,
        name: '',
      }

      render(
        <MemoryRouter>
          <DeckCard deck={deckWithEmptyName} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Should still render without crashing
      expect(screen.getByTestId('deck-card-101')).toBeInTheDocument()
    })

    it('handles negative progress percent', () => {
      const deckWithNegativeProgress: DeckWithProgress = {
        ...mockDeck,
        id: 102,
        progress_percent: -10,
      }

      render(
        <MemoryRouter>
          <DeckCard deck={deckWithNegativeProgress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Should render without crashing
      expect(screen.getByTestId('deck-card-102')).toBeInTheDocument()
    })

    it('handles progress percent over 100', () => {
      const deckWithOver100Progress: DeckWithProgress = {
        ...mockDeck,
        id: 103,
        progress_percent: 150,
      }

      render(
        <MemoryRouter>
          <DeckCard deck={deckWithOver100Progress} onClick={mockOnClick} />
        </MemoryRouter>
      )

      // Should render without crashing
      expect(screen.getByTestId('deck-card-103')).toBeInTheDocument()
      expect(screen.getByTestId('deck-progress-bar-103')).toHaveStyle({ width: '150%' })
    })
  })
})
