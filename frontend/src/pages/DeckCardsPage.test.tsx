/**
 * DeckCardsPage Tests
 * 
 * Tests for the DeckCardsPage component.
 * Part of Issue #201: Implement vocabulary deck detail pages
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DeckCardsPage from './DeckCardsPage'
import { vocabularyApi } from '../utils/api'
import type { DeckSummary, CardSummary, DeckResponse, CardListResponse } from '../types/index'

// Mock the vocabulary API
vi.mock('../utils/api', () => ({
  vocabularyApi: {
    getDeck: vi.fn(),
    listDeckCards: vi.fn()
  }
}))

// Mock Flashcard component
vi.mock('../components/Flashcard', () => ({
  default: ({ card }: { card: any }) => (
    <div data-testid="flashcard" data-card-id={card.card_id}>
      <div data-testid="flashcard-front">{card.front}</div>
      <div data-testid="flashcard-back">{card.back}</div>
    </div>
  )
}))

// Mock Breadcrumb component
vi.mock('../components/Breadcrumb', () => ({
  default: ({ items }: { items: any[] }) => (
    <nav data-testid="breadcrumb">
      {items.map((item, index) => (
        <span key={index} data-testid={`breadcrumb-item-${index}`}>
          {item.label}
        </span>
      ))}
    </nav>
  )
}))

describe('DeckCardsPage Component', () => {
  const mockDeck: DeckResponse = {
    id: 1,
    name: 'Travel Vocabulary',
    description: 'Travel-related French vocabulary',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    card_count: 15
  }

  const mockCards: CardSummary[] = [
    {
      id: 1,
      deck_id: 1,
      card_id: 'card-1',
      front: 'Bonjour',
      back: 'Hello',
      example: 'Example sentence',
      tags: ['greeting', 'common'],
      context: 'Basic greeting',
      difficulty: 1,
      next_review_date: '2024-01-10',
      interval: 2,
      ease_factor: 2.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      deck_id: 1,
      card_id: 'card-2',
      front: 'Merci',
      back: 'Thank you',
      tags: ['greeting'],
      difficulty: 2,
      next_review_date: '2024-01-12',
      interval: 1,
      ease_factor: 2.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      deck_id: 1,
      card_id: 'card-3',
      front: 'Au revoir',
      back: 'Goodbye',
      tags: ['greeting'],
      difficulty: 1,
      next_review_date: '2024-01-08',
      interval: 3,
      ease_factor: 2.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockCardListResponse: CardListResponse = {
    cards: mockCards,
    pagination: {
      total: 15,
      page: 1,
      per_page: 10,
      total_pages: 2
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test loading state
  it('displays loading state initially', async () => {
    // Mock API calls to never resolve
    ;(vocabularyApi.getDeck as jest.Mock).mockImplementation(() => 
      new Promise(() => {})
    )
    ;(vocabularyApi.listDeckCards as jest.Mock).mockImplementation(() => 
      new Promise(() => {})
    )

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Should show loading state
    expect(screen.getByTestId('deck-cards-page')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-loading')).toBeInTheDocument()
    expect(screen.getByText('Loading cards...')).toBeInTheDocument()
  })

  // Test successful data loading
  it('displays cards after successful API call', async () => {
    // Mock API calls
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-page')).toBeInTheDocument()
      expect(screen.getByTestId('deck-cards-header')).toBeInTheDocument()
    })

    // Check header
    expect(screen.getByTestId('deck-cards-title')).toHaveTextContent('Travel Vocabulary - All Cards')
    expect(screen.getByTestId('deck-cards-count')).toHaveTextContent('15 cards')
    expect(screen.getByTestId('deck-cards-description')).toHaveTextContent('Travel-related French vocabulary')

    // Check filters
    expect(screen.getByTestId('deck-cards-filters')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-search-input')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-tag-filter-select')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-sort-select')).toBeInTheDocument()

    // Check cards grid
    expect(screen.getByTestId('deck-cards-grid')).toBeInTheDocument()
    expect(screen.getAllByTestId('flashcard')).toHaveLength(3) // We have 3 mock cards

    // Check pagination
    expect(screen.getByTestId('deck-cards-pagination')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-pagination-info')).toHaveTextContent('Page 1 of 2')
  })

  // Test error state
  it('displays error state when API call fails', async () => {
    const errorMessage = 'Failed to load cards'
    ;(vocabularyApi.getDeck as jest.Mock).mockRejectedValue(new Error(errorMessage))
    ;(vocabularyApi.listDeckCards as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-error')).toBeInTheDocument()
      expect(screen.getByTestId('deck-cards-error-message')).toHaveTextContent(errorMessage)
      expect(screen.getByTestId('deck-cards-retry-button')).toBeInTheDocument()
      expect(screen.getByTestId('deck-cards-back-button')).toBeInTheDocument()
    })
  })

  // Test breadcrumb navigation
  it('displays breadcrumb navigation with Cards label', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    })

    // Check breadcrumb items
    expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Vocabulary')
    expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('Travel Vocabulary')
    expect(screen.getByTestId('breadcrumb-item-2')).toHaveTextContent('Cards')
  })

  // Test search functionality
  it('filters cards based on search query', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-search-input')).toBeInTheDocument()
    })

    // Initially all 3 cards should be visible
    expect(screen.getAllByTestId('flashcard')).toHaveLength(3)

    // Type in search box to filter for "Bonjour"
    const searchInput = screen.getByTestId('deck-cards-search-input')
    fireEvent.change(searchInput, { target: { value: 'Bonjour' } })

    // Wait for filtering to apply
    await waitFor(() => {
      // Should only show the card with "Bonjour"
      expect(screen.getAllByTestId('flashcard')).toHaveLength(1)
      expect(screen.getByTestId('deck-cards-search-input')).toHaveValue('Bonjour')
    })
  })

  // Test tag filtering
  it('filters cards based on tag selection', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-tag-filter-select')).toBeInTheDocument()
    })

    // Initially all 3 cards should be visible
    expect(screen.getAllByTestId('flashcard')).toHaveLength(3)

    // Select "common" tag
    const tagFilter = screen.getByTestId('deck-cards-tag-filter-select')
    fireEvent.change(tagFilter, { target: { value: 'common' } })

    // Wait for filtering to apply
    await waitFor(() => {
      // Should only show the card with "common" tag (card-1)
      expect(screen.getAllByTestId('flashcard')).toHaveLength(1)
    })
  })

  // Test sorting
  it('sorts cards based on selection', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-sort-select')).toBeInTheDocument()
    })

    // Check initial order (alphabetical by front)
    const flashcards = screen.getAllByTestId('flashcard')
    expect(flashcards[0]).toHaveTextContent('Au revoir')
    expect(flashcards[1]).toHaveTextContent('Bonjour')
    expect(flashcards[2]).toHaveTextContent('Merci')

    // Sort by difficulty (descending)
    const sortSelect = screen.getByTestId('deck-cards-sort-select')
    fireEvent.change(sortSelect, { target: { value: 'difficulty-desc' } })

    // Wait for sorting to apply
    await waitFor(() => {
      const sortedFlashcards = screen.getAllByTestId('flashcard')
      // Merci has difficulty 2, should be first
      expect(sortedFlashcards[0]).toHaveTextContent('Merci')
      // Bonjour and Au revoir have difficulty 1
      expect(sortedFlashcards[1]).toHaveTextContent(/Bonjour|Au revoir/)
      expect(sortedFlashcards[2]).toHaveTextContent(/Bonjour|Au revoir/)
    })
  })

  // Test pagination
  it('displays pagination controls', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-pagination')).toBeInTheDocument()
    })

    // Check pagination info
    expect(screen.getByTestId('deck-cards-pagination-info')).toHaveTextContent('Page 1 of 2')

    // Check pagination buttons
    expect(screen.getByTestId('deck-cards-pagination-prev')).toBeInTheDocument()
    expect(screen.getByTestId('deck-cards-pagination-next')).toBeInTheDocument()

    // Previous button should be disabled on page 1
    expect(screen.getByTestId('deck-cards-pagination-prev')).toBeDisabled()

    // Next button should be enabled
    expect(screen.getByTestId('deck-cards-pagination-next')).not.toBeDisabled()
  })

  // Test back to deck link
  it('displays back to deck link', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
          <Route path="/vocabulary/decks/:deckId" element={<div>Deck Detail</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-back-link')).toBeInTheDocument()
    })

    // Check back button
    const backButton = screen.getByTestId('deck-cards-back-to-deck-button')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveTextContent('Back to Travel Vocabulary')
  })

  // Test empty deck
  it('displays empty state when deck has no cards', async () => {
    const emptyDeck: DeckResponse = {
      ...mockDeck,
      card_count: 0
    }
    const emptyCardList: CardListResponse = {
      cards: [],
      pagination: {
        total: 0,
        page: 1,
        per_page: 10,
        total_pages: 0
      }
    }

    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(emptyDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(emptyCardList)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-empty')).toBeInTheDocument()
      expect(screen.getByText(/No cards in this deck/i)).toBeInTheDocument()
    })
  })

  // Test no results from filters
  it('displays no results message when filters match no cards', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-search-input')).toBeInTheDocument()
    })

    // Type a search query that doesn't match any cards
    const searchInput = screen.getByTestId('deck-cards-search-input')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } })

    // Should show no results
    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-empty')).toBeInTheDocument()
      expect(screen.getByText(/No cards match your filters/i)).toBeInTheDocument()
      expect(screen.getByTestId('deck-cards-clear-all-filters')).toBeInTheDocument()
    })
  })

  // Test clear filters
  it('clears all filters when clear button is clicked', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1/cards']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-cards-search-input')).toBeInTheDocument()
    })

    // Apply search filter
    const searchInput = screen.getByTestId('deck-cards-search-input')
    fireEvent.change(searchInput, { target: { value: 'Bonjour' } })

    await waitFor(() => {
      expect(searchInput).toHaveValue('Bonjour')
    })

    // Clear filters
    const clearButton = screen.getByTestId('deck-cards-clear-filters')
    fireEvent.click(clearButton)

    // Check that filters are cleared
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  })
})
