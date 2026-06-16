/**
 * Tests for DeckBrowser component
 * 
 * Tests cover:
 * - Loading state
 * - Error state
 * - Empty state
 * - Decks display
 * - Search functionality
 * - Tag filtering
 * - Sorting
 * - Pagination
 * - Progress display
 * - Acceptance criteria from issue #67
 * - Edge cases
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DeckBrowser from './DeckBrowser'
import { vocabularyApi } from '../utils/api'
import type { DeckListResponse, DeckSummary, CardListResponse, CardSummary } from '../types/index'

// Mock deck data
const mockDeckSummaries: DeckSummary[] = [
  { id: 1, name: 'Travel Vocabulary', description: 'Essential words for traveling', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 20 },
  { id: 2, name: 'Food & Dining', description: 'Food-related vocabulary', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 15 },
  { id: 3, name: 'Business French', description: 'Professional vocabulary', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', card_count: 10 },
]

// Mock cards data for each deck
const mockCardsByDeck: Record<number, CardSummary[]> = {
  1: [
    { id: 101, deck_id: 1, card_id: 'travel-1', front: 'Bonjour', back: 'Hello', tags: ['greeting', 'travel'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
    { id: 102, deck_id: 1, card_id: 'travel-2', front: 'Au revoir', back: 'Goodbye', tags: ['greeting', 'travel'], interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
    { id: 103, deck_id: 1, card_id: 'travel-3', front: 'Merci', back: 'Thank you', tags: ['polite', 'travel'], interval: 3, ease_factor: 2.5, next_review_date: '2026-01-12', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
  ],
  2: [
    { id: 201, deck_id: 2, card_id: 'food-1', front: 'Pain', back: 'Bread', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
    { id: 202, deck_id: 2, card_id: 'food-2', front: 'Fromage', back: 'Cheese', tags: ['food', 'beginner'], interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
  ],
  3: [
    { id: 301, deck_id: 3, card_id: 'business-1', front: 'Réunion', back: 'Meeting', tags: ['business', 'advanced'], interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', difficulty: 3 },
  ],
}

const mockPagination = {
  total: 3,
  page: 1,
  per_page: 12,
  total_pages: 1,
}

const mockDeckResponse: DeckListResponse = {
  decks: mockDeckSummaries,
  pagination: mockPagination,
}

// Mock the vocabulary API
vi.mock('../utils/api', () => ({
  vocabularyApi: {
    listDecks: vi.fn(),
    listDeckCards: vi.fn(),
  },
}))

describe('DeckBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation - resolves with mock decks
    ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue(mockDeckResponse)
    
    // Mock listDeckCards to return cards for each deck
    ;(vocabularyApi.listDeckCards as jest.Mock).mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCardsByDeck[deckId] || [],
        pagination: { total: mockCardsByDeck[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders deck browser component', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-browser')).toBeInTheDocument()
    })

    it('renders deck browser header', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Vocabulary Decks')).toBeInTheDocument()
      })
    })

    it('renders DeckSearch component', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-search')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('renders loading state initially', async () => {
      // Override to make it pending
      ;(vocabularyApi.listDecks as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading decks...')).toBeInTheDocument()
    })

    it('renders loading state when fetching decks', async () => {
      let resolveDecks: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolveDecks = resolve
      })

      ;(vocabularyApi.listDecks as jest.Mock).mockReturnValue(pendingPromise)

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      expect(screen.getByTestId('deck-loading')).toBeInTheDocument()

      // Resolve the promise
      if (resolveDecks) {
        resolveDecks(mockDeckResponse)
      }
    })
  })

  describe('Error State', () => {
    it('renders error state when API fails', async () => {
      const errorMessage = 'Failed to load decks'
      ;(vocabularyApi.listDecks as jest.Mock).mockRejectedValue(new Error(errorMessage))

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-error')).toBeInTheDocument()
        expect(screen.getByTestId('deck-error-message')).toHaveTextContent(errorMessage)
        expect(screen.getByTestId('deck-retry-button')).toBeInTheDocument()
      })
    })

    it('calls fetch again when retry button is clicked', async () => {
      const errorMessage = 'Failed to load decks'
      ;(vocabularyApi.listDecks as jest.Mock)
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce(mockDeckResponse)

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-error')).toBeInTheDocument()
      })

      const retryButton = screen.getByTestId('deck-retry-button')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Vocabulary Decks')).toBeInTheDocument()
      })

      expect(vocabularyApi.listDecks).toHaveBeenCalledTimes(2)
    })
  })

  describe('Empty State', () => {
    it('renders empty state when no decks exist', async () => {
      ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue({
        decks: [],
        pagination: { total: 0, page: 1, per_page: 12, total_pages: 0 },
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-empty')).toBeInTheDocument()
        expect(screen.getByText(/No decks found\. Create your first deck/)).toBeInTheDocument()
      })
    })

    it('renders empty state when no decks match filters', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      // Wait for decks to load
      await waitFor(() => {
        expect(screen.getByTestId('deck-search')).toBeInTheDocument()
      })

      // Enter a search query that doesn't match any decks
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-empty')).toBeInTheDocument()
        expect(screen.getByText(/No decks match your filters/)).toBeInTheDocument()
        expect(screen.getByTestId('deck-clear-all-filters')).toBeInTheDocument()
      })
    })
  })

  describe('Decks Display', () => {
    it('displays all decks on initial load', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Should display all 3 decks
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })
    })

    it('displays deck names', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Travel Vocabulary')).toBeInTheDocument()
        expect(screen.getByText('Food & Dining')).toBeInTheDocument()
        expect(screen.getByText('Business French')).toBeInTheDocument()
      })
    })

    it('displays deck descriptions', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Essential words for traveling')).toBeInTheDocument()
        expect(screen.getByText('Food-related vocabulary')).toBeInTheDocument()
        expect(screen.getByText('Professional vocabulary')).toBeInTheDocument()
      })
    })
  })

  describe('Card Count Display (AC2)', () => {
    it('shows card count for each deck', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-count-1')).toHaveTextContent('20 cards')
        expect(screen.getByTestId('deck-card-count-2')).toHaveTextContent('15 cards')
        expect(screen.getByTestId('deck-card-count-3')).toHaveTextContent('10 cards')
      })
    })
  })

  describe('Progress Indicators (AC3)', () => {
    it('shows progress text for each deck', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Deck 1: 2 out of 3 cards have interval > 1 (2 learned)
        expect(screen.getByTestId('deck-progress-text-1')).toHaveTextContent('2/20 cards learned')
        // Deck 2: 1 out of 2 cards have interval > 1 (1 learned)
        expect(screen.getByTestId('deck-progress-text-2')).toHaveTextContent('1/15 cards learned')
        // Deck 3: 0 out of 1 cards have interval > 1 (0 learned)
        expect(screen.getByTestId('deck-progress-text-3')).toHaveTextContent('0/10 cards learned')
      })
    })

    it('shows progress bars for each deck', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-progress-bar-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-bar-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-bar-3')).toBeInTheDocument()
      })
    })

    it('calculates progress percentage correctly', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Deck 1: 2/20 = 10%
        expect(screen.getByTestId('deck-progress-text-1')).toHaveTextContent('(10%)')
        // Deck 2: 1/15 = 6.67% -> 7%
        expect(screen.getByTestId('deck-progress-text-2')).toHaveTextContent('(7%)')
        // Deck 3: 0/10 = 0%
        expect(screen.getByTestId('deck-progress-text-3')).toHaveTextContent('(0%)')
      })
    })
  })

  describe('Search Functionality (AC5)', () => {
    it('filters decks by search query', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })

      // Search for "Travel"
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Travel' } })

      await waitFor(() => {
        // Should show only Travel Vocabulary deck
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
        expect(screen.queryByTestId('deck-card-3')).toBeNull()
      })
    })

    it('filters decks by description search', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Search for "Professional"
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Professional' } })

      await waitFor(() => {
        // Should show only Business French deck
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-1')).toBeNull()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
      })
    })

    it('shows all decks when search query is cleared', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Search for "Travel"
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Travel' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
      })

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })
    })

    it('shows results count when filtering', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Search for "Travel"
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Travel' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-results-info')).toHaveTextContent('Showing 1 of 3 decks')
      })
    })
  })

  describe('Tag Filtering (AC4)', () => {
    it('filters decks by tag', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Filter by "travel" tag
      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'travel' } })

      await waitFor(() => {
        // Should show only Travel Vocabulary deck (has cards with travel tag)
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
        expect(screen.queryByTestId('deck-card-3')).toBeNull()
      })
    })

    it('filters decks by multiple tags', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Filter by "beginner" tag
      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'beginner' } })

      await waitFor(() => {
        // Should show only Food & Dining deck (has cards with beginner tag)
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-1')).toBeNull()
        expect(screen.queryByTestId('deck-card-3')).toBeNull()
      })
    })

    it('shows all decks when tag filter is cleared', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Filter by "travel" tag
      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'travel' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
      })

      // Clear tag filter
      fireEvent.change(tagFilter, { target: { value: '' } })

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('sorts decks by name ascending', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Sort by name ascending (default)
      const sortFilter = screen.getByTestId('deck-sort-filter')
      fireEvent.change(sortFilter, { target: { value: 'name-asc' } })

      await waitFor(() => {
        // Should be sorted alphabetically: Business French, Food & Dining, Travel Vocabulary
        const cards = screen.getAllByText(/Vocabulary|Dining|French/)
        expect(cards[0]).toHaveTextContent('Business French')
        expect(cards[1]).toHaveTextContent('Food & Dining')
        expect(cards[2]).toHaveTextContent('Travel Vocabulary')
      })
    })

    it('sorts decks by name descending', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Sort by name descending
      const sortFilter = screen.getByTestId('deck-sort-filter')
      fireEvent.change(sortFilter, { target: { value: 'name-desc' } })

      await waitFor(() => {
        // Should be sorted reverse alphabetically: Travel Vocabulary, Food & Dining, Business French
        const cards = screen.getAllByText(/Vocabulary|Dining|French/)
        expect(cards[0]).toHaveTextContent('Travel Vocabulary')
        expect(cards[1]).toHaveTextContent('Food & Dining')
        expect(cards[2]).toHaveTextContent('Business French')
      })
    })

    it('sorts decks by card count descending', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Sort by card count descending
      const sortFilter = screen.getByTestId('deck-sort-filter')
      fireEvent.change(sortFilter, { target: { value: 'cards-desc' } })

      await waitFor(() => {
        // Should be sorted by card count: Travel (20), Food (15), Business (10)
        const cards = screen.getAllByText(/Vocabulary|Dining|French/)
        expect(cards[0]).toHaveTextContent('Travel Vocabulary')
        expect(cards[1]).toHaveTextContent('Food & Dining')
        expect(cards[2]).toHaveTextContent('Business French')
      })
    })

    it('sorts decks by progress descending', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Sort by progress descending
      const sortFilter = screen.getByTestId('deck-sort-filter')
      fireEvent.change(sortFilter, { target: { value: 'progress-desc' } })

      await waitFor(() => {
        // Travel: 10%, Food: 7%, Business: 0%
        // Should be sorted by progress: Travel, Food, Business
        const cards = screen.getAllByText(/Vocabulary|Dining|French/)
        expect(cards[0]).toHaveTextContent('Travel Vocabulary')
        expect(cards[1]).toHaveTextContent('Food & Dining')
        expect(cards[2]).toHaveTextContent('Business French')
      })
    })
  })

  describe('Pagination', () => {
    it('renders pagination controls', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-pagination')).toBeInTheDocument()
        expect(screen.getByTestId('deck-pagination-prev')).toBeInTheDocument()
        expect(screen.getByTestId('deck-pagination-info')).toBeInTheDocument()
        expect(screen.getByTestId('deck-pagination-next')).toBeInTheDocument()
      })
    })

    it('shows correct pagination info', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-pagination-info')).toHaveTextContent('Page 1 of 1')
      })
    })

    it('disables previous button on first page', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        const prevButton = screen.getByTestId('deck-pagination-prev')
        expect(prevButton).toBeInTheDocument()
        expect(prevButton).toBeDisabled()
      })
    })

    it('disables next button on last page', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        const nextButton = screen.getByTestId('deck-pagination-next')
        expect(nextButton).toBeInTheDocument()
        expect(nextButton).toBeDisabled()
      })
    })
  })

  describe('Deck Navigation', () => {
    it('navigates to deck detail when deck is clicked', async () => {
      const mockNavigate = vi.fn()
      
      // Mock useNavigate
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom')
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        }
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      const deckCard = screen.getByTestId('deck-card-1')
      fireEvent.click(deckCard)

      expect(mockNavigate).toHaveBeenCalledWith('/vocabulary/decks/1')
    })
  })

  describe('Acceptance Criteria (Issue #67)', () => {
    it('AC1: Displays all decks', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })
    })

    it('AC2: Shows card count per deck', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-count-1')).toHaveTextContent('20 cards')
        expect(screen.getByTestId('deck-card-count-2')).toHaveTextContent('15 cards')
        expect(screen.getByTestId('deck-card-count-3')).toHaveTextContent('10 cards')
      })
    })

    it('AC3: Shows progress indicators', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-progress-text-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-bar-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-text-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-bar-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-text-3')).toBeInTheDocument()
        expect(screen.getByTestId('deck-progress-bar-3')).toBeInTheDocument()
      })
    })

    it('AC4: Filtering works', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
      })

      // Filter by travel tag
      const tagFilter = screen.getByTestId('deck-tag-filter')
      fireEvent.change(tagFilter, { target: { value: 'travel' } })

      await waitFor(() => {
        // Only deck 1 should be visible
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
      })
    })

    it('AC5: Search works', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
      })

      // Search for "Travel"
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Travel' } })

      await waitFor(() => {
        // Only deck 1 should be visible
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles API error gracefully', async () => {
      const errorMessage = 'Network error'
      ;(vocabularyApi.listDecks as jest.Mock).mockRejectedValue(new Error(errorMessage))

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-error')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('handles empty deck list', async () => {
      ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue({
        decks: [],
        pagination: { total: 0, page: 1, per_page: 12, total_pages: 0 },
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-empty')).toBeInTheDocument()
        expect(screen.getByText(/No decks found/)).toBeInTheDocument()
      })
    })

    it('handles decks with no cards', async () => {
      const decksWithNoCards: DeckSummary[] = [
        { id: 1, name: 'Empty Deck', description: 'A deck with no cards', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 0 },
      ]

      ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue({
        decks: decksWithNoCards,
        pagination: { total: 1, page: 1, per_page: 12, total_pages: 1 },
      })

      ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue({
        cards: [],
        pagination: { total: 0, page: 1, per_page: 1000, total_pages: 0 },
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-count-1')).toHaveTextContent('0 cards')
        expect(screen.getByTestId('deck-progress-text-1')).toHaveTextContent('0/0 cards learned (0%)')
      })
    })

    it('handles decks with all cards learned', async () => {
      const allLearnedCards = [
        { id: 101, deck_id: 1, card_id: 'card-1', front: 'Test', back: 'Test', tags: ['test'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
        { id: 102, deck_id: 1, card_id: 'card-2', front: 'Test2', back: 'Test2', tags: ['test'], interval: 3, ease_factor: 2.5, next_review_date: '2026-01-12', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ]

      const decksWithLearnedCards: DeckSummary[] = [
        { id: 1, name: 'Learned Deck', description: 'All cards learned', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 2 },
      ]

      ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue({
        decks: decksWithLearnedCards,
        pagination: { total: 1, page: 1, per_page: 12, total_pages: 1 },
      })

      ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue({
        cards: allLearnedCards,
        pagination: { total: 2, page: 1, per_page: 1000, total_pages: 1 },
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-progress-text-1')).toHaveTextContent('2/2 cards learned (100%)')
        expect(screen.getByTestId('deck-progress-bar-1')).toHaveStyle({ width: '100%' })
      })
    })

    it('handles deck with no tags', async () => {
      const deckNoTags: DeckSummary[] = [
        { id: 1, name: 'No Tags Deck', description: 'Deck without tags', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 1 },
      ]

      const cardsNoTags = [
        { id: 101, deck_id: 1, card_id: 'card-1', front: 'Test', back: 'Test', tags: null, interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ]

      ;(vocabularyApi.listDecks as jest.Mock).mockResolvedValue({
        decks: deckNoTags,
        pagination: { total: 1, page: 1, per_page: 12, total_pages: 1 },
      })

      ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue({
        cards: cardsNoTags,
        pagination: { total: 1, page: 1, per_page: 1000, total_pages: 1 },
      })

      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        // Deck should be visible even without tags
        expect(screen.getByText('No Tags Deck')).toBeInTheDocument()
      })
    })

    it('handles initial filters from props', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser initialSearch="Travel" initialTag="travel" initialSort="name-desc" />
        </MemoryRouter>
      )

      await waitFor(() => {
        const searchInput = screen.getByTestId('deck-search-input')
        const tagFilter = screen.getByTestId('deck-tag-filter')
        const sortFilter = screen.getByTestId('deck-sort-filter')

        expect(searchInput).toHaveValue('Travel')
        expect(tagFilter).toHaveValue('travel')
        expect(sortFilter).toHaveValue('name-desc')
      })
    })
  })

  describe('Integration Tests', () => {
    it('combines search and tag filtering', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Apply both search and tag filter
      const searchInput = screen.getByTestId('deck-search-input')
      const tagFilter = screen.getByTestId('deck-tag-filter')

      fireEvent.change(searchInput, { target: { value: 'Travel' } })
      fireEvent.change(tagFilter, { target: { value: 'travel' } })

      await waitFor(() => {
        // Only Travel Vocabulary deck matches both filters
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.queryByTestId('deck-card-2')).toBeNull()
        expect(screen.queryByTestId('deck-card-3')).toBeNull()
      })
    })

    it('shows clear all filters button when filters are active', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
      })

      // Apply search filter
      const searchInput = screen.getByTestId('deck-search-input')
      fireEvent.change(searchInput, { target: { value: 'Travel' } })

      await waitFor(() => {
        // Should show clear all filters button
        expect(screen.getByTestId('deck-clear-all-filters')).toBeInTheDocument()
      })

      // Clear filters
      fireEvent.click(screen.getByTestId('deck-clear-all-filters'))

      await waitFor(() => {
        // Should show all decks again
        expect(screen.getByTestId('deck-card-1')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-2')).toBeInTheDocument()
        expect(screen.getByTestId('deck-card-3')).toBeInTheDocument()
      })
    })

    it('updates available tags from deck data', async () => {
      render(
        <MemoryRouter>
          <DeckBrowser />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('deck-tag-filter')).toBeInTheDocument()
      })

      // Should have tags from all decks
      const tagFilter = screen.getByTestId('deck-tag-filter')
      
      // Open the dropdown and check options
      fireEvent.change(tagFilter, { target: { value: '' } })

      // Tags from mock data: travel, greeting, polite, food, beginner, business, advanced
      expect(screen.getByRole('option', { name: 'travel' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'beginner' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'business' })).toBeInTheDocument()
    })
  })
})
