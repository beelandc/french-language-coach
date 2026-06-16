/**
 * DeckDetailPage Tests
 * 
 * Tests for the DeckDetailPage component.
 * Part of Issue #201: Implement vocabulary deck detail pages
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DeckDetailPage from './DeckDetailPage'
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

describe('DeckDetailPage Component', () => {
  const mockDeck: DeckResponse = {
    id: 1,
    name: 'Travel Vocabulary',
    description: 'Travel-related French vocabulary',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    card_count: 5
  }

  const mockCards: CardSummary[] = [
    {
      id: 1,
      deck_id: 1,
      card_id: 'card-1',
      front: 'Bonjour',
      back: 'Hello',
      example: 'Example sentence',
      tags: ['greeting'],
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
      difficulty: 1,
      next_review_date: '2024-01-10',
      interval: 1,
      ease_factor: 2.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockCardListResponse: CardListResponse = {
    cards: mockCards,
    pagination: {
      total: 5,
      page: 1,
      per_page: 10,
      total_pages: 1
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
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Should show loading state
    expect(screen.getByTestId('deck-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByTestId('deck-detail-loading')).toBeInTheDocument()
    expect(screen.getByText('Loading deck details...')).toBeInTheDocument()
  })

  // Test successful data loading
  it('displays deck details after successful API call', async () => {
    // Mock API calls
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('deck-detail-page')).toBeInTheDocument()
      expect(screen.getByTestId('deck-detail-header')).toBeInTheDocument()
    })

    // Check deck name and description
    expect(screen.getByText('Travel Vocabulary')).toBeInTheDocument()
    expect(screen.getByText('Travel-related French vocabulary')).toBeInTheDocument()

    // Check metadata
    expect(screen.getByTestId('deck-card-count')).toHaveTextContent('5 cards')
    expect(screen.getByTestId('deck-created-date')).toBeInTheDocument()
    expect(screen.getByTestId('deck-updated-date')).toBeInTheDocument()

    // Check progress summary
    expect(screen.getByTestId('deck-progress-summary')).toBeInTheDocument()
    expect(screen.getByTestId('deck-progress-text')).toBeInTheDocument()

    // Check action buttons
    expect(screen.getByTestId('deck-view-cards-button')).toBeInTheDocument()
    expect(screen.getByTestId('deck-start-review-button')).toBeInTheDocument()

    // Check card preview
    expect(screen.getByTestId('deck-cards-preview')).toBeInTheDocument()
    expect(screen.getByTestId('deck-preview-grid')).toBeInTheDocument()
    expect(screen.getAllByTestId('flashcard')).toHaveLength(2) // We have 2 mock cards
  })

  // Test error state
  it('displays error state when API call fails', async () => {
    const errorMessage = 'Failed to load deck details'
    ;(vocabularyApi.getDeck as jest.Mock).mockRejectedValue(new Error(errorMessage))
    ;(vocabularyApi.listDeckCards as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('deck-detail-error')).toBeInTheDocument()
      expect(screen.getByTestId('deck-detail-error-message')).toHaveTextContent(errorMessage)
      expect(screen.getByTestId('deck-detail-retry-button')).toBeInTheDocument()
      expect(screen.getByTestId('deck-detail-back-button')).toBeInTheDocument()
    })
  })

  // Test deck not found (404)
  it('displays not found state when deck does not exist', async () => {
    const errorMessage = 'Deck with ID 999 not found'
    ;(vocabularyApi.getDeck as jest.Mock).mockRejectedValue(new Error(errorMessage))
    ;(vocabularyApi.listDeckCards as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/999']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-detail-error')).toBeInTheDocument()
      expect(screen.getByText(/not found/i)).toBeInTheDocument()
    })
  })

  // Test navigation to view cards
  it('navigates to deck cards page when clicking view all cards button', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
          <Route path="/vocabulary/decks/:deckId/cards" element={<div>Cards Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-view-cards-button')).toBeInTheDocument()
    })

    // Click the View All Cards button
    const viewCardsButton = screen.getByTestId('deck-view-cards-button')
    expect(viewCardsButton).toHaveAttribute('href', '/vocabulary/decks/1/cards')
  })

  // Test breadcrumb navigation
  it('displays breadcrumb navigation', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    })

    // Check breadcrumb items
    expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Vocabulary')
    expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('Travel Vocabulary')
  })

  // Test progress calculation
  it('calculates progress correctly based on learned cards', async () => {
    ;(vocabularyApi.getDeck as jest.Mock).mockResolvedValue(mockDeck)
    ;(vocabularyApi.listDeckCards as jest.Mock).mockResolvedValue(mockCardListResponse)

    render(
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-progress-text')).toBeInTheDocument()
    })

    // card-1 has interval=2 (learned), card-2 has interval=1 (not learned)
    // So 1 out of 5 cards learned = 20%
    expect(screen.getByTestId('deck-progress-text')).toHaveTextContent(/1\/5 cards learned/)
    expect(screen.getByTestId('deck-progress-text')).toHaveTextContent(/20%/)
  })

  // Test empty deck (no cards)
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
      <MemoryRouter initialEntries={['/vocabulary/decks/1']}>
        <Routes>
          <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('deck-empty-state')).toBeInTheDocument()
      expect(screen.getByText(/No Cards Yet/i)).toBeInTheDocument()
    })
  })
})
