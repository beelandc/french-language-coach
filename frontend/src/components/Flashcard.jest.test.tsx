/**
 * Tests for Flashcard Component
 * 
 * Tests all acceptance criteria for Flashcard from issue #69:
 * - AC1: Flashcard displays correctly
 * - AC2: Flip animation works
 * 
 * Also tests edge cases and accessibility features.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import Flashcard, { RATING_BUTTONS } from './Flashcard'
import type { CardData } from '../types/index'

// Mock card data for testing
const mockCard: CardData = {
  id: 1,
  deck_id: 1,
  deck_name: 'Greetings',
  card_id: 'card-1',
  front: 'Bonjour',
  back: 'Hello',
  example: "Salut! Comment ça va?",
  next_review_date: '2024-01-01'
}

const mockCardWithoutExample: CardData = {
  id: 2,
  deck_id: 1,
  deck_name: 'Greetings',
  card_id: 'card-2',
  front: 'Au revoir',
  back: 'Goodbye',
  example: null,
  next_review_date: '2024-01-01'
}

const mockCardEmptyContent: CardData = {
  id: 3,
  deck_id: 1,
  card_id: 'card-3',
  front: '',
  back: '',
  next_review_date: '2024-01-01'
}

describe('Flashcard Component', () => {
  
  describe('AC1: Flashcard displays correctly', () => {
    
    test('should display front side initially with French text', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      expect(screen.getByText('Bonjour')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard')).toBeInTheDocument()
    })

    test('should not have flipped class when showing front', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then - both sides are in DOM, but only front should be visible (no flipped class)
      expect(screen.getByText('Bonjour')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard')).not.toHaveClass('flipped')
    })

    test('should display card with correct data-testid attributes', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      expect(screen.getByTestId('flashcard')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard-side-front')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard-side-back')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard-front-content')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard-front-text')).toBeInTheDocument()
    })

    test('should display front text in correct element', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      const frontText = screen.getByTestId('flashcard-front-text')
      expect(frontText).toHaveTextContent('Bonjour')
      expect(frontText.tagName).toBe('SPAN')
    })

    test('should have correct initial class (not flipped)', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      const flashcard = screen.getByTestId('flashcard')
      expect(flashcard).not.toHaveClass('flipped')
    })

    test('should have correct card-id data attribute', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      const flashcard = screen.getByTestId('flashcard')
      expect(flashcard).toHaveAttribute('data-card-id', 'card-1')
    })
    
  })

  describe('AC2: Flip animation works', () => {
    
    test('should flip to back side when clicked', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then - should have flipped class
      expect(flashcard).toHaveClass('flipped')
      expect(screen.getByTestId('flashcard-back-text')).toHaveTextContent('Hello')
    })

    test('should show back side content when flipped', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(flashcard).toHaveClass('flipped')
      expect(screen.getByTestId('flashcard-side-back')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard-back-text')).toHaveTextContent('Hello')
      expect(screen.getByTestId('flashcard-example')).toHaveTextContent("Salut! Comment ça va?")
      expect(screen.getByTestId('flashcard-deck-name')).toHaveTextContent('Deck: Greetings')
    })

    test('should have flipped class when back side is shown', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(flashcard).toHaveClass('flipped')
    })

    test('should flip back to front when clicked again', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Flip to back
      fireEvent.click(flashcard)
      expect(flashcard).toHaveClass('flipped')
      expect(screen.getByText('Hello')).toBeInTheDocument()
      
      // Flip back to front
      fireEvent.click(flashcard)
      
      // Then - should not have flipped class
      expect(flashcard).not.toHaveClass('flipped')
      expect(screen.getByText('Bonjour')).toBeInTheDocument()
    })

    test('should call onFlip callback when flipped', () => {
      // Given
      const card = mockCard
      const mockOnFlip = jest.fn()
      
      // When
      render(<Flashcard card={card} onFlip={mockOnFlip} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(mockOnFlip).toHaveBeenCalledWith(true)
    })

    test('should respect controlled flipped prop', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} flipped={true} />)
      
      // Then
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByTestId('flashcard')).toHaveClass('flipped')
    })

    test('should update when card prop changes', () => {
      // Given
      const { rerender } = render(<Flashcard card={mockCard} />)
      
      // When
      rerender(<Flashcard card={mockCardWithoutExample} />)
      
      // Then
      expect(screen.getByText('Au revoir')).toBeInTheDocument()
    })
    
  })

  describe('Accessibility', () => {
    
    test('should have correct role and tabIndex for accessibility', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      const flashcard = screen.getByTestId('flashcard')
      expect(flashcard).toHaveAttribute('role', 'button')
      expect(flashcard).toHaveAttribute('tabIndex', '0')
    })

    test('should have correct ARIA label when showing front', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      
      // Then
      const flashcard = screen.getByTestId('flashcard')
      expect(flashcard).toHaveAttribute('aria-label', expect.stringContaining('Front side'))
      expect(flashcard).toHaveAttribute('aria-label', expect.stringContaining('Click to show back'))
    })

    test('should have correct ARIA label when showing back', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(flashcard).toHaveAttribute('aria-label', expect.stringContaining('Back side'))
      expect(flashcard).toHaveAttribute('aria-label', expect.stringContaining('Click to show front'))
    })

    test('should have correct aria-pressed attribute', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Then
      expect(flashcard).toHaveAttribute('aria-pressed', 'false')
      
      // When flipped
      fireEvent.click(flashcard)
      expect(flashcard).toHaveAttribute('aria-pressed', 'true')
    })

    test('should respond to keyboard Enter key', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate Enter key press
      fireEvent.keyDown(flashcard, { key: 'Enter' })
      
      // Then
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    test('should respond to keyboard Space key', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate Space key press
      fireEvent.keyDown(flashcard, { key: ' ' })
      
      // Then
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    test('should respond to keyboard events without errors', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate Enter key press - should flip card
      fireEvent.keyDown(flashcard, { key: 'Enter' })
      
      // Then - should have flipped the card
      expect(flashcard).toHaveClass('flipped')
      expect(screen.getByTestId('flashcard-back-text')).toHaveTextContent('Hello')
    })
    
  })

  describe('Edge Cases', () => {
    
    test('should show placeholder for empty front content', () => {
      // Given
      const card = mockCardEmptyContent
      
      // When
      render(<Flashcard card={card} />)
      
      // Then - both sides may show [No content] but front should be visible
      expect(screen.getByTestId('flashcard-front-text')).toHaveTextContent('[No content]')
    })

    test('should show placeholder for empty back content', () => {
      // Given
      const card = mockCardEmptyContent
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then - should have flipped class and show placeholder in back text
      expect(flashcard).toHaveClass('flipped')
      expect(screen.getByTestId('flashcard-back-text')).toHaveTextContent('[No content]')
    })

    test('should not display example section when example is null', () => {
      // Given
      const card = mockCardWithoutExample
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(screen.queryByTestId('flashcard-example')).not.toBeInTheDocument()
    })

    test('should display deck name when available', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(screen.getByTestId('flashcard-deck-name')).toBeInTheDocument()
      expect(screen.getByText('Deck: Greetings')).toBeInTheDocument()
    })

    test('should not display deck name when not available', () => {
      // Given
      const cardWithoutDeckName: CardData = {
        id: 4,
        deck_id: 1,
        card_id: 'card-4',
        front: 'Test',
        back: 'Test',
        next_review_date: '2024-01-01'
      }
      
      // When
      render(<Flashcard card={cardWithoutDeckName} />)
      const flashcard = screen.getByTestId('flashcard')
      fireEvent.click(flashcard)
      
      // Then
      expect(screen.queryByTestId('flashcard-deck-name')).not.toBeInTheDocument()
    })

    test('should reset flip state when card changes (uncontrolled mode)', () => {
      // Given
      const { rerender } = render(<Flashcard card={mockCard} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Flip the card
      fireEvent.click(flashcard)
      expect(flashcard).toHaveClass('flipped')
      
      // Change the card
      rerender(<Flashcard card={mockCardWithoutExample} />)
      
      // Then - should be reset to front
      expect(flashcard).not.toHaveClass('flipped')
      expect(screen.getByText('Au revoir')).toBeInTheDocument()
    })

    test('should respect controlled flipped state over internal state', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} flipped={true} />)
      
      // Then
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
    
  })

  describe('RATING_BUTTONS', () => {
    
    test('should have correct rating button configuration', () => {
      // Given
      const expectedButtons = [
        { label: 'Again', value: 1, color: '#f44336' },
        { label: 'Hard', value: 2, color: '#ff9800' },
        { label: 'Good', value: 3, color: '#4caf50' },
        { label: 'Easy', value: 4, color: '#2196f3' }
      ]
      
      // When/Then
      expect(RATING_BUTTONS).toHaveLength(4)
      expectedButtons.forEach((expected, index) => {
        expect(RATING_BUTTONS[index].label).toBe(expected.label)
        expect(RATING_BUTTONS[index].value).toBe(expected.value)
        expect(RATING_BUTTONS[index].color).toBe(expected.color)
      })
    })
    
  })

  describe('Swipe Gestures (Touch Events)', () => {
    
    test('should handle touch start event', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate touch start
      fireEvent.touchStart(flashcard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Then - should not error
      expect(flashcard).toBeInTheDocument()
    })

    test('should handle touch move with sufficient horizontal distance', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate touch start
      fireEvent.touchStart(flashcard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch move with horizontal swipe > 50px
      fireEvent.touchMove(flashcard, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      
      // Then - should have flipped class
      expect(flashcard).toHaveClass('flipped')
    })

    test('should not flip on vertical swipe', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate touch start
      fireEvent.touchStart(flashcard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch move with vertical swipe (less than horizontal threshold)
      fireEvent.touchMove(flashcard, {
        touches: [{ clientX: 110, clientY: 200 }] // vertical: 100px, horizontal: 10px
      })
      
      // Then - should not have flipped class
      expect(flashcard).not.toHaveClass('flipped')
    })

    test('should handle touch end event', () => {
      // Given
      const card = mockCard
      
      // When
      render(<Flashcard card={card} />)
      const flashcard = screen.getByTestId('flashcard')
      
      // Simulate touch start
      fireEvent.touchStart(flashcard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch end
      fireEvent.touchEnd(flashcard)
      
      // Then - should not error
      expect(flashcard).toBeInTheDocument()
    })
    
  })
})