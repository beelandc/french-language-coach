/**
 * Tests for ReviewSession Component
 * 
 * Tests all acceptance criteria for ReviewSession from issue #69:
 * - AC3: Rating buttons work
 * - AC4: Progress tracking
 * - AC5: Session summary
 * 
 * Also tests edge cases, API integration, and error handling.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReviewSession from './ReviewSession'
import type { DueCardsResponse, ReviewResponse, DueCard } from '../types/index'

// Import vocabularyApi as a mocked module
import * as apiModule from '../utils/api'
const { vocabularyApi } = apiModule as unknown as { vocabularyApi: { 
  listDueCards: jest.Mock, 
  submitReview: jest.Mock 
} }

// Mock the API module
jest.mock('../utils/api', () => ({
  vocabularyApi: {
    listDueCards: jest.fn(),
    submitReview: jest.fn()
  }
}))

// Mock data for testing
const mockDueCards: DueCard[] = [
  {
    id: 1,
    deck_id: 1,
    deck_name: 'Greetings',
    card_id: 'card-1',
    front: 'Bonjour',
    back: 'Hello',
    next_review_date: '2024-01-01'
  },
  {
    id: 2,
    deck_id: 1,
    deck_name: 'Greetings',
    card_id: 'card-2',
    front: 'Au revoir',
    back: 'Goodbye',
    next_review_date: '2024-01-01'
  },
  {
    id: 3,
    deck_id: 2,
    deck_name: 'Food',
    card_id: 'card-3',
    front: 'Pomme',
    back: 'Apple',
    next_review_date: '2024-01-01'
  }
]

const mockEmptyResponse: DueCardsResponse = {
  cards: [],
  pagination: {
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0
  }
}

const mockCardsResponse: DueCardsResponse = {
  cards: mockDueCards,
  pagination: {
    total: 3,
    page: 1,
    per_page: 10,
    total_pages: 1
  }
}

const mockSuccessResponse: ReviewResponse = {
  success: true,
  message: 'Review recorded successfully',
  next_review_date: '2024-01-08',
  new_interval: 4,
  new_ease_factor: 2.5
}

const mockOnComplete = jest.fn()
const mockOnError = jest.fn()

describe('ReviewSession Component', () => {
  
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AC3: Rating buttons work', () => {
    
    test('should display rating buttons when card is flipped', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip the card
      fireEvent.click(screen.getByTestId('flashcard'))
      
      // Then
      expect(screen.getByTestId('review-ratings')).toBeInTheDocument()
      expect(screen.getByTestId('rating-button-Again')).toBeInTheDocument()
      expect(screen.getByTestId('rating-button-Hard')).toBeInTheDocument()
      expect(screen.getByTestId('rating-button-Good')).toBeInTheDocument()
      expect(screen.getByTestId('rating-button-Easy')).toBeInTheDocument()
    })

    test('should submit rating and advance to next card when rating button is clicked', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip the card
      fireEvent.click(screen.getByTestId('flashcard'))
      
      // Click Good button
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      
      // Then
      await waitFor(() => {
        // Should have called submitReview with correct data
        expect(vocabularyApi.submitReview).toHaveBeenCalledWith({
          card_id: 1,
          deck_id: 1,
          ease: 3
        })
        
        // Should show next card after auto-advance
        expect(screen.getByText('Au revoir')).toBeInTheDocument()
      })
    })

    test('should submit Again rating with ease=1', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip and rate as Again
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Again'))
      
      // Then
      await waitFor(() => {
        expect(vocabularyApi.submitReview).toHaveBeenCalledWith({
          card_id: 1,
          deck_id: 1,
          ease: 1
        })
      })
    })

    test('should submit Hard rating with ease=2', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip and rate as Hard
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Hard'))
      
      // Then
      await waitFor(() => {
        expect(vocabularyApi.submitReview).toHaveBeenCalledWith({
          card_id: 1,
          deck_id: 1,
          ease: 2
        })
      })
    })

    test('should submit Easy rating with ease=4', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip and rate as Easy
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Easy'))
      
      // Then
      await waitFor(() => {
        expect(vocabularyApi.submitReview).toHaveBeenCalledWith({
          card_id: 1,
          deck_id: 1,
          ease: 4
        })
      })
    })

    test('should disable rating buttons while submitting', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip the card
      fireEvent.click(screen.getByTestId('flashcard'))
      
      // Click rating button
      const goodButton = screen.getByTestId('rating-button-Good')
      fireEvent.click(goodButton)
      
      // Then - button should be disabled while submitting
      await waitFor(() => {
        expect(goodButton).toBeDisabled()
      })
    })
    
  })

  describe('AC4: Progress tracking', () => {
    
    test('should display progress as "1 of X" for first card', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Then
      expect(screen.getByTestId('review-progress')).toBeInTheDocument()
      expect(screen.getByText('Card 1 of 3')).toBeInTheDocument()
    })

    test('should update progress when advancing to next card', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Expect initial progress
      expect(screen.getByText('Card 1 of 3')).toBeInTheDocument()
      
      // Flip and rate first card
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      
      // Then - wait for auto-advance and check progress
      await waitFor(() => {
        expect(screen.getByText('Card 2 of 3')).toBeInTheDocument()
      })
    })

    test('should show correct progress for last card', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete first card
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      await waitFor(() => expect(screen.getByText('Au revoir')).toBeInTheDocument())
      
      // Complete second card
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Hard'))
      await waitFor(() => expect(screen.getByText('Pomme')).toBeInTheDocument())
      
      // Then - should show "3 of 3"
      expect(screen.getByText('Card 3 of 3')).toBeInTheDocument()
    })

    test('should have progress bar with correct value', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Then
      const progressBar = screen.getByTestId('review-progress-bar')
      expect(progressBar).toHaveAttribute('value', '1')
      expect(progressBar).toHaveAttribute('max', '3')
    })
    
  })

  describe('AC5: Session summary', () => {
    
    test('should show session summary when all cards are completed', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards
      // Card 1: Good
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      await waitFor(() => expect(screen.getByText('Au revoir')).toBeInTheDocument())
      
      // Card 2: Hard
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Hard'))
      await waitFor(() => expect(screen.getByText('Pomme')).toBeInTheDocument())
      
      // Card 3: Easy
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Easy'))
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('session-summary')).toBeInTheDocument()
        expect(screen.getByText(/Session Complete/i)).toBeInTheDocument()
      })
    })

    test('should show correct rating distribution in summary', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards with different ratings
      // Card 1: Again
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Again'))
      await waitFor(() => expect(screen.getByText('Au revoir')).toBeInTheDocument())
      
      // Card 2: Good
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      await waitFor(() => expect(screen.getByText('Pomme')).toBeInTheDocument())
      
      // Card 3: Easy
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Easy'))
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('session-summary-stats')).toBeInTheDocument()
        expect(screen.getByTestId('summary-again')).toHaveTextContent('Again: 1')
        expect(screen.getByTestId('summary-hard')).toHaveTextContent('Hard: 0')
        expect(screen.getByTestId('summary-good')).toHaveTextContent('Good: 1')
        expect(screen.getByTestId('summary-easy')).toHaveTextContent('Easy: 1')
      })
    })

    test('should show total cards reviewed in summary', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('flashcard'))
        fireEvent.click(screen.getByTestId('rating-button-Good'))
        if (i < 2) {
          await waitFor(() => expect(screen.getByText(mockDueCards[i + 1].front)).toBeInTheDocument())
        }
      }
      
      // Then
      await waitFor(() => {
        expect(screen.getByText(/You reviewed 3 cards/i)).toBeInTheDocument()
      })
    })

    test('should call onComplete callback with stats when session completes', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('flashcard'))
        fireEvent.click(screen.getByTestId('rating-button-Good'))
        if (i < 2) {
          await waitFor(() => expect(screen.getByText(mockDueCards[i + 1].front)).toBeInTheDocument())
        }
      }
      
      // Then
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
          totalCards: 3,
          ratings: expect.any(Object)
        }))
      })
    })

    test('should show "Start New Session" button after completion', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('flashcard'))
        fireEvent.click(screen.getByTestId('rating-button-Good'))
        if (i < 2) {
          await waitFor(() => expect(screen.getByText(mockDueCards[i + 1].front)).toBeInTheDocument())
        }
      }
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('summary-new-session')).toBeInTheDocument()
        expect(screen.getByText('Start New Session')).toBeInTheDocument()
      })
    })
    
  })

  describe('Loading States', () => {
    
    test('should show loading state initially', async () => {
      // Given
      vocabularyApi.listDueCards.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve(mockCardsResponse), 100)
      ))
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      
      // Then
      expect(screen.getByTestId('review-session')).toBeInTheDocument()
      expect(screen.getByTestId('review-loading')).toBeInTheDocument()
      expect(screen.getByText(/Loading cards due for review/i)).toBeInTheDocument()
    })

    test('should hide loading state when cards are loaded', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      
      // Then
      await waitFor(() => {
        expect(screen.queryByTestId('review-loading')).not.toBeInTheDocument()
      })
    })
    
  })

  describe('Empty State', () => {
    
    test('should show empty state when no cards are due', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockEmptyResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      
      // Then - need to wait for the async fetch to complete
      await waitFor(() => {
        expect(screen.queryByTestId('review-loading')).not.toBeInTheDocument()
      })
      
      expect(screen.getByTestId('review-empty')).toBeInTheDocument()
      expect(screen.getByText('No Cards Due for Review')).toBeInTheDocument()
    })

    test('should show empty state message', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockEmptyResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      
      // Then
      await waitFor(() => {
        expect(screen.getByText(/Create or study decks to generate reviews/i)).toBeInTheDocument()
      })
    })

    test('should show refresh button in empty state', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockEmptyResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('review-retry-button')).toBeInTheDocument()
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })
    })
    
  })

  describe('Error Handling', () => {
    
    test('should show error state when API fetch fails', async () => {
      // Given
      const mockError = new Error('Network error')
      vocabularyApi.listDueCards.mockRejectedValue(mockError)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} onError={mockOnError} />)
      
      // Then - need to wait for the async error handling
      await waitFor(() => {
        expect(screen.queryByTestId('review-loading')).not.toBeInTheDocument()
      })
      
      expect(screen.getByTestId('review-error')).toBeInTheDocument()
      expect(screen.getByTestId('review-error-message')).toHaveTextContent('Network error')
    })

    test('should call onError callback when API fetch fails', async () => {
      // Given
      const mockError = new Error('Network error')
      vocabularyApi.listDueCards.mockRejectedValue(mockError)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} onError={mockOnError} />)
      
      // Then
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error')
      })
    })

    test('should show retry button on API error', async () => {
      // Given
      const mockError = new Error('Network error')
      vocabularyApi.listDueCards.mockRejectedValue(mockError)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} onError={mockOnError} />)
      
      // Then
      await waitFor(() => {
        expect(screen.queryByTestId('review-loading')).not.toBeInTheDocument()
      })
      
      expect(screen.getByTestId('review-retry-button')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    test('should show submit error when rating submission fails', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockRejectedValue(new Error('Submit failed'))
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip and try to rate
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('review-submit-error')).toBeInTheDocument()
        expect(screen.getByText(/Submit failed/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    test('should show retry and skip buttons on submit error', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockRejectedValue(new Error('Submit failed'))
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip and try to rate
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('submit-retry-button')).toBeInTheDocument()
        expect(screen.getByTestId('submit-skip-button')).toBeInTheDocument()
      })
    })
    
  })

  describe('Hint Display', () => {
    
    test('should show hint when card is not flipped', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Then
      expect(screen.getByTestId('review-hint')).toBeInTheDocument()
      expect(screen.getByText(/Click or tap the card to flip it/i)).toBeInTheDocument()
    })

    test('should not show hint when card is flipped', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Flip the card
      fireEvent.click(screen.getByTestId('flashcard'))
      
      // Then
      expect(screen.queryByTestId('review-hint')).not.toBeInTheDocument()
    })
    
  })

  describe('Deck Filtering', () => {
    
    test('should filter cards by deckId when provided', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      
      // When
      render(<ReviewSession deckId={1} onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Then - should only show cards from deck 1
      expect(screen.getByText('Bonjour')).toBeInTheDocument()
      // Wait a bit for the component to process the deck filtering
      await waitFor(() => {
        // Only 2 cards from deck 1 should be present
        expect(screen.getByTestId('review-progress')).toHaveTextContent('Card 1 of 2')
      })
    })
    
  })

  describe('Single Card Session', () => {
    
    test('should handle single card session correctly', async () => {
      // Given
      const singleCardResponse: DueCardsResponse = {
        cards: [mockDueCards[0]],
        pagination: {
          total: 1,
          page: 1,
          per_page: 10,
          total_pages: 1
        }
      }
      vocabularyApi.listDueCards.mockResolvedValue(singleCardResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Should show "1 of 1"
      expect(screen.getByText('Card 1 of 1')).toBeInTheDocument()
      
      // Flip and rate
      fireEvent.click(screen.getByTestId('flashcard'))
      fireEvent.click(screen.getByTestId('rating-button-Good'))
      
      // Then - should show completion
      await waitFor(() => {
        expect(screen.getByTestId('session-summary')).toBeInTheDocument()
        expect(screen.getByText(/You reviewed 1 card/i)).toBeInTheDocument()
      })
    })
    
  })

  describe('Rating Stats Tracking', () => {
    
    test('should track multiple ratings of same type', async () => {
      // Given
      vocabularyApi.listDueCards.mockResolvedValue(mockCardsResponse)
      vocabularyApi.submitReview.mockResolvedValue(mockSuccessResponse)
      
      // When
      render(<ReviewSession onComplete={mockOnComplete} />)
      await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
      
      // Complete all cards with same rating
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('flashcard'))
        fireEvent.click(screen.getByTestId('rating-button-Good'))
        if (i < 2) {
          await waitFor(() => expect(screen.getByText(mockDueCards[i + 1].front)).toBeInTheDocument())
        }
      }
      
      // Then
      await waitFor(() => {
        expect(screen.getByTestId('summary-good')).toHaveTextContent('Good: 3')
      })
    })
    
  })
})