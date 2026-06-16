/**
 * Storybook stories for DeckBrowser component
 * 
 * Stories for Issue #67: Create DeckBrowser React component
 * Note: These stories mock the API responses to demonstrate different states
 * Mocks are configured in src/testSetup.ts
 */

import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import DeckBrowser from './DeckBrowser'
import { vocabularyApi } from '../utils/api'
import type { DeckListResponse, DeckSummary, CardListResponse, CardSummary } from '../types/index'

// Note: vocabularyApi is mocked in testSetup.ts
// All stories can configure the mock responses on vocabularyApi directly

const meta = {
  title: 'Components/DeckBrowser',
  component: DeckBrowser,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DeckBrowser>

export default meta

type Story = StoryObj<typeof meta>

// Helper function to create mock deck data
function createMockDeckResponse(decks: DeckSummary[], cardsByDeck: Record<number, CardSummary[]>) {
  return {
    decks,
    pagination: { total: decks.length, page: 1, per_page: 12, total_pages: 1 },
    cardsByDeck,
  }
}

// Reset mocks before each story - vocabularyApi is already mocked in testSetup.ts

/**
 * Default DeckBrowser with sample decks
 */
export const Default: Story = {
  render: () => {
    vi.clearAllMocks()

    // Mock deck data
    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'Travel Vocabulary', description: 'Essential words for traveling', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 20 },
      { id: 2, name: 'Food & Dining', description: 'Food-related vocabulary', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 15 },
      { id: 3, name: 'Business French', description: 'Professional vocabulary', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', card_count: 10 },
    ]

    // Mock cards for each deck
    const mockCards: Record<number, CardSummary[]> = {
      1: [
        { id: 101, deck_id: 1, card_id: 'travel-1', front: 'Bonjour', back: 'Hello', tags: ['greeting', 'travel'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
        { id: 102, deck_id: 1, card_id: 'travel-2', front: 'Merci', back: 'Thank you', tags: ['polite', 'travel'], interval: 3, ease_factor: 2.5, next_review_date: '2026-01-12', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ],
      2: [
        { id: 201, deck_id: 2, card_id: 'food-1', front: 'Pain', back: 'Bread', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
        { id: 202, deck_id: 2, card_id: 'food-2', front: 'Fromage', back: 'Cheese', tags: ['food', 'beginner'], interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
      ],
      3: [
        { id: 301, deck_id: 3, card_id: 'business-1', front: 'Réunion', back: 'Meeting', tags: ['business', 'advanced'], interval: 1, ease_factor: 2.5, next_review_date: '2026-01-08', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', difficulty: 3 },
      ],
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 3, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with loading state
 */
export const Loading: Story = {
  render: () => {
    vi.clearAllMocks()

    // Make the promise never resolve to show loading state
    vocabularyApi.listDecks.mockReturnValue(new Promise(() => {}))

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with error state
 */
export const Error: Story = {
  render: () => {
    vi.clearAllMocks()

    // Make the promise reject to show error state
    vocabularyApi.listDecks.mockRejectedValue(new Error('Failed to load decks'))

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with empty state (no decks)
 */
export const Empty: Story = {
  render: () => {
    vi.clearAllMocks()

    vocabularyApi.listDecks.mockResolvedValue({
      decks: [],
      pagination: { total: 0, page: 1, per_page: 12, total_pages: 0 },
    })

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with initial search query
 */
export const WithInitialSearch: Story = {
  render: () => {
    vi.clearAllMocks()

    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'Travel Vocabulary', description: 'Essential words for traveling', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 20 },
      { id: 2, name: 'Food & Dining', description: 'Food-related vocabulary', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 15 },
    ]

    const mockCards: Record<number, CardSummary[]> = {
      1: [
        { id: 101, deck_id: 1, card_id: 'travel-1', front: 'Bonjour', back: 'Hello', tags: ['greeting', 'travel'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ],
      2: [
        { id: 201, deck_id: 2, card_id: 'food-1', front: 'Pain', back: 'Bread', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
      ],
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 2, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser initialSearch="Travel" />
  },
}

/**
 * DeckBrowser with many decks to show pagination
 */
export const WithPagination: Story = {
  render: () => {
    vi.clearAllMocks()

    // Create 15 decks
    const mockDecks: DeckSummary[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Deck ${i + 1}`,
      description: `Description for deck ${i + 1}`,
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00`,
      updated_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00`,
      card_count: (i + 1) * 5,
    }))

    const mockCards: Record<number, CardSummary[]> = {}
    mockDecks.forEach((deck) => {
      mockCards[deck.id] = [
        { id: deck.id * 100 + 1, deck_id: deck.id, card_id: `${deck.id}-1`, front: `Word ${deck.id}`, back: `Translation ${deck.id}`, tags: ['common'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: deck.created_at, updated_at: deck.updated_at, difficulty: 1 },
      ]
    })

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 15, page: 1, per_page: 12, total_pages: 2 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with decks at different progress levels
 */
export const ProgressLevels: Story = {
  render: () => {
    vi.clearAllMocks()

    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'New Deck (0%)', description: 'Just created, no cards learned', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 10 },
      { id: 2, name: 'In Progress (50%)', description: 'Half of the cards learned', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 20 },
      { id: 3, name: 'Almost Done (80%)', description: 'Most cards learned', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', card_count: 15 },
      { id: 4, name: 'Completed (100%)', description: 'All cards learned', created_at: '2026-01-07T00:00:00', updated_at: '2026-01-08T00:00:00', card_count: 8 },
    ]

    const mockCards: Record<number, CardSummary[]> = {
      1: Array.from({ length: 10 }, (_, i) => ({
        id: 100 + i,
        deck_id: 1,
        card_id: `new-${i}`,
        front: `New Word ${i}`,
        back: `New Translation ${i}`,
        tags: ['new'],
        interval: 1, // All new (not learned)
        ease_factor: 2.5,
        next_review_date: '2026-01-08',
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-02T00:00:00',
        difficulty: 1,
      })),
      2: Array.from({ length: 20 }, (_, i) => ({
        id: 200 + i,
        deck_id: 2,
        card_id: `inprogress-${i}`,
        front: `In Progress Word ${i}`,
        back: `In Progress Translation ${i}`,
        tags: ['in-progress'],
        interval: i % 2 === 0 ? 2 : 1, // Half learned
        ease_factor: 2.5,
        next_review_date: '2026-01-10',
        created_at: '2026-01-03T00:00:00',
        updated_at: '2026-01-04T00:00:00',
        difficulty: 1,
      })),
      3: Array.from({ length: 15 }, (_, i) => ({
        id: 300 + i,
        deck_id: 3,
        card_id: `almost-${i}`,
        front: `Almost Done Word ${i}`,
        back: `Almost Done Translation ${i}`,
        tags: ['almost'],
        interval: i < 3 ? 1 : 3, // 12 out of 15 learned (80%)
        ease_factor: 2.5,
        next_review_date: '2026-01-12',
        created_at: '2026-01-05T00:00:00',
        updated_at: '2026-01-06T00:00:00',
        difficulty: 1,
      })),
      4: Array.from({ length: 8 }, (_, i) => ({
        id: 400 + i,
        deck_id: 4,
        card_id: `completed-${i}`,
        front: `Completed Word ${i}`,
        back: `Completed Translation ${i}`,
        tags: ['completed'],
        interval: 3, // All learned
        ease_factor: 2.5,
        next_review_date: '2026-01-15',
        created_at: '2026-01-07T00:00:00',
        updated_at: '2026-01-08T00:00:00',
        difficulty: 1,
      })),
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 4, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser />
  },
}

/**
 * DeckBrowser with decks with different tag sets for filtering
 */
export const TagFiltering: Story = {
  render: () => {
    vi.clearAllMocks()

    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'Travel Deck', description: 'Travel vocabulary', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 10 },
      { id: 2, name: 'Food Deck', description: 'Food vocabulary', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 8 },
      { id: 3, name: 'Business Deck', description: 'Business vocabulary', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', card_count: 12 },
    ]

    const mockCards: Record<number, CardSummary[]> = {
      1: [
        { id: 101, deck_id: 1, card_id: 'travel-1', front: 'Bonjour', back: 'Hello', tags: ['travel', 'greeting'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
        { id: 102, deck_id: 1, card_id: 'travel-2', front: 'Au revoir', back: 'Goodbye', tags: ['travel', 'greeting'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ],
      2: [
        { id: 201, deck_id: 2, card_id: 'food-1', front: 'Pain', back: 'Bread', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
        { id: 202, deck_id: 2, card_id: 'food-2', front: 'Fromage', back: 'Cheese', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
      ],
      3: [
        { id: 301, deck_id: 3, card_id: 'business-1', front: 'Réunion', back: 'Meeting', tags: ['business', 'advanced'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-05T00:00:00', updated_at: '2026-01-06T00:00:00', difficulty: 3 },
      ],
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 3, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser initialTag="travel" />
  },
}

/**
 * DeckBrowser with decks sorted by different criteria
 */
export const Sorting: Story = {
  render: () => {
    vi.clearAllMocks()

    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'Charlie Deck', description: 'C deck', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 10 },
      { id: 2, name: 'Alice Deck', description: 'A deck', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 20 },
      { id: 3, name: 'Bob Deck', description: 'B deck', created_at: '2026-01-02T00:00:00', updated_at: '2026-01-03T00:00:00', card_count: 15 },
    ]

    const mockCards: Record<number, CardSummary[]> = {
      1: [{ id: 101, deck_id: 1, card_id: 'c-1', front: 'C1', back: 'C1', tags: ['test'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 }],
      2: [{ id: 201, deck_id: 2, card_id: 'a-1', front: 'A1', back: 'A1', tags: ['test'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 }],
      3: [{ id: 301, deck_id: 3, card_id: 'b-1', front: 'B1', back: 'B1', tags: ['test'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-02T00:00:00', updated_at: '2026-01-03T00:00:00', difficulty: 1 }],
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 3, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser initialSort="name-asc" />
  },
}

/**
 * DeckBrowser with initial filters from props
 */
export const WithInitialFilters: Story = {
  render: () => {
    vi.clearAllMocks()

    const mockDecks: DeckSummary[] = [
      { id: 1, name: 'Travel Vocabulary', description: 'Essential words for traveling', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', card_count: 20 },
      { id: 2, name: 'Food & Dining', description: 'Food-related vocabulary', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', card_count: 15 },
    ]

    const mockCards: Record<number, CardSummary[]> = {
      1: [
        { id: 101, deck_id: 1, card_id: 'travel-1', front: 'Bonjour', back: 'Hello', tags: ['greeting', 'travel'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00', difficulty: 1 },
      ],
      2: [
        { id: 201, deck_id: 2, card_id: 'food-1', front: 'Pain', back: 'Bread', tags: ['food', 'beginner'], interval: 2, ease_factor: 2.5, next_review_date: '2026-01-10', created_at: '2026-01-03T00:00:00', updated_at: '2026-01-04T00:00:00', difficulty: 1 },
      ],
    }

    vocabularyApi.listDecks.mockResolvedValue({
      decks: mockDecks,
      pagination: { total: 2, page: 1, per_page: 12, total_pages: 1 },
    })

    vocabularyApi.listDeckCards.mockImplementation((deckId: number) => {
      return Promise.resolve({
        cards: mockCards[deckId] || [],
        pagination: { total: mockCards[deckId]?.length || 0, page: 1, per_page: 1000, total_pages: 1 },
      } as CardListResponse)
    })

    return <DeckBrowser initialSearch="Travel" initialTag="travel" initialSort="cards-desc" />
  },
}
