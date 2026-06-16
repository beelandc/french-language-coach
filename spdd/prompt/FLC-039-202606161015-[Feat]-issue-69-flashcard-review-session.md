# SPDD Prompt: Create Flashcard and ReviewSession Components

**GitHub Issue**: #69
**Issue Title**: 3.12+3.13: Create Flashcard and ReviewSession components
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/69
**Artifact ID**: FLC-039-202606161015-[Feat]-issue-69-flashcard-review-session
**Created**: 2026-06-16 10:15
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-039-202606161000-[Analysis]-issue-69-flashcard-review-session.md`

---

## Context

This prompt drives the implementation of GitHub issue #69: Creating Flashcard and ReviewSession React components for the French Language Coach vocabulary review system.

### Current Codebase State

The French Language Coach project is in Phase 3, with the following relevant implementations already complete:

- **Backend API**: Vocabulary router (`routers/vocabulary.py`) with endpoints:
  - GET /vocabulary/due/ - Returns cards due for review (DueCard[])
  - POST /vocabulary/review/ - Submits card ratings (ease 1-4)
  - SM-2 spaced repetition algorithm implemented
  
- **Frontend Components**: Existing React/TypeScript components:
  - DeckBrowser.tsx: Main deck browsing component
  - DeckCard.tsx: Individual deck display component
  - ChatInterface.tsx: Chat-based interaction component
  - LessonViewer.tsx: Lesson viewing component
  
- **Type Definitions**: `frontend/src/types/index.ts` contains:
  - CardSummary: Full card data with all fields
  - DueCard: Card data for due cards (id, deck_id, deck_name, card_id, front, back, next_review_date)
  - ReviewSubmitRequest: Request body for review submission (card_id, deck_id, ease)
  - ReviewResponse: Response from review submission
  
- **API Client**: `frontend/src/utils/api.ts` contains vocabularyApi with methods:
  - listDueCards(): Fetches cards due for review
  - submitReview(): Submits card rating
  
- **Styling**: Global CSS in `frontend/src/styles/global.css` with consistent design patterns

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/types/index.ts` | TypeScript type definitions | DueCard (756-764), CardSummary (653-668), ReviewSubmitRequest (734-738) |
| `frontend/src/components/DeckCard.tsx` | Reference component for styling | Styling patterns, accessibility, TypeScript props |
| `frontend/src/components/DeckBrowser.tsx` | Reference for API usage | vocabularyApi.listDecks, useState, useEffect patterns |
| `frontend/src/utils/api.ts` | API client for vocabulary | vocabularyApi.listDueCards, vocabularyApi.submitReview |
| `frontend/src/styles/global.css` | Global styling | Color scheme, spacing, card styling patterns |
| `routers/vocabulary.py` | Backend vocabulary endpoints | GET /due/, POST /review/, SM-2 algorithm |

### Existing Patterns

1. **Component Structure**: Functional components with TypeScript interfaces for props
2. **State Management**: useState, useEffect, useCallback hooks
3. **Error Handling**: Loading and error states with retry functionality
4. **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
5. **Testing**: data-testid attributes, jest tests with @testing-library/react
6. **API Integration**: Async/await with try/catch, loading states

---

## Goal

**Primary Objective**: Implement Flashcard and ReviewSession React components for vocabulary card review with flip animation and rating system.

**Secondary Objectives**:
- Create reusable Flashcard component with flip animation
- Create ReviewSession component that manages card review workflow
- Integrate with existing backend API endpoints
- Add comprehensive TypeScript type definitions
- Implement swipe gesture support for mobile
- Add CSS styles consistent with existing design
- Write tests achieving 80%+ coverage for all new code
- Ensure accessibility support

---

## Constraints

### Architecture Constraints
- Must use React with TypeScript (existing stack)
- Must follow existing component patterns (DeckCard, DeckBrowser)
- Must use existing backend API endpoints (/vocabulary/due/, /vocabulary/review/)
- Must not introduce new external dependencies (use existing libraries only)
- Must maintain backward compatibility

### Code Quality Constraints
- Must follow existing code style (consistent with DeckCard.tsx, DeckBrowser.tsx)
- Must include JSDoc comments for components and complex functions
- Must use TypeScript interfaces for all props
- Must include data-testid attributes for testing
- Must handle errors gracefully with user feedback

### Testing Constraints
- Must create jest tests for both components
- Must test all acceptance criteria from issue #69
- Must achieve 80%+ code coverage per component
- Must test edge cases (empty cards, API errors, etc.)
- Must follow existing test patterns (see DeckBrowser.test.tsx)

### Acceptance Criteria

From GitHub issue #69:
- [ ] Flashcard displays correctly
- [ ] Flip animation works
- [ ] Rating buttons work
- [ ] Progress tracking
- [ ] Session summary

---

## Examples

### Input/Output Examples

#### Flashcard Component

**Example 1: Display front side**
- Input: `{ card: { front: "Bonjour", back: "Hello", example: "Salut!" } }`
- Expected Output: Card showing "Bonjour" with no back content visible

**Example 2: Flip to back side**
- Input: User clicks on card
- Expected Output: Smooth flip animation, card shows "Hello" and "Salut!"

**Example 3: Swipe gesture**
- Input: User swipes left on mobile device
- Expected Output: Card flips to show back side

#### ReviewSession Component

**Example 4: Initial load with due cards**
- Input: API returns 5 due cards
- Expected Output: First card displayed in Flashcard, progress shows "1/5"

**Example 5: Rating submission**
- Input: User clicks "Good" button on card
- Expected Output: POST to /vocabulary/review/ with ease=3, next card shown, progress "2/5"

**Example 6: Session completion**
- Input: User completes all 5 cards
- Expected Output: Summary screen showing "Session complete! 5 cards reviewed: 1 Again, 1 Hard, 2 Good, 1 Easy"

**Example 7: Empty state**
- Input: API returns 0 due cards
- Expected Output: Message "No cards due for review. Create or study decks to generate reviews."

**Example 8: API error**
- Input: API fetch fails
- Expected Output: Error message with retry button

### Edge Cases

1. **Card with null example**: Don't display example section
2. **Card with empty front/back**: Show placeholder text like "[No content]"
3. **API returns empty array**: Show empty state message
4. **API error on fetch**: Show error with retry button
5. **API error on submit**: Show error, allow retry or skip
6. **User tries to skip without rating**: Prevent advancement, show validation
7. **Component unmount during API call**: Cancel request to prevent memory leaks
8. **Mobile touch events**: Handle both swipe and tap gestures

### Test Cases

```typescript
// Flashcard.test.tsx examples

import { render, screen, fireEvent } from '@testing-library/react'
import Flashcard from './Flashcard'
import type { CardData } from '../types'

describe('Flashcard Component', () => {
  const mockCard: CardData = {
    id: 1,
    front: 'Bonjour',
    back: 'Hello',
    example: "Salut! Cava?"
  }

  test('AC1: Flashcard displays correctly - shows front side initially', () => {
    // Given
    const card = mockCard
    
    // When
    render(<Flashcard card={card} />)
    
    // Then
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
    expect(screen.queryByText("Salut! Cava?")).not.toBeInTheDocument()
  })

  test('AC2: Flip animation works - click flips to back side', () => {
    // Given
    const card = mockCard
    
    // When
    render(<Flashcard card={card} />)
    const cardElement = screen.getByTestId('flashcard')
    fireEvent.click(cardElement)
    
    // Then
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText("Salut! Cava?")).toBeInTheDocument()
    expect(screen.getByTestId('flashcard')).toHaveClass('flipped')
  })

  test('Card without example does not show example section', () => {
    // Given
    const cardWithoutExample = { ...mockCard, example: null }
    
    // When
    render(<Flashcard card={cardWithoutExample} />)
    fireEvent.click(screen.getByTestId('flashcard'))
    
    // Then
    expect(screen.queryByTestId('flashcard-example')).not.toBeInTheDocument()
  })
})

// ReviewSession.test.tsx examples
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReviewSession from './ReviewSession'
import { vocabularyApi } from '../utils/api'

// Mock the API
jest.mock('../utils/api')

describe('ReviewSession Component', () => {
  const mockDueCards = [
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
    }
  ]

  test('AC3: Rating buttons work - submits rating and advances', async () => {
    // Given
    vocabularyApi.listDueCards.mockResolvedValue({ cards: mockDueCards, pagination: { total: 2, page: 1, per_page: 10, total_pages: 1 } })
    vocabularyApi.submitReview.mockResolvedValue({ success: true })
    
    // When
    render(<ReviewSession />)
    await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
    
    const goodButton = screen.getByTestId('rating-button-Good')
    fireEvent.click(goodButton)
    
    // Then
    await waitFor(() => {
      expect(vocabularyApi.submitReview).toHaveBeenCalledWith(1, 1, 3) // card_id, deck_id, ease=3
      expect(screen.getByText('Au revoir')).toBeInTheDocument()
    })
  })

  test('AC4: Progress tracking - shows current progress', async () => {
    // Given
    vocabularyApi.listDueCards.mockResolvedValue({ cards: mockDueCards, pagination: { total: 2, page: 1, per_page: 10, total_pages: 1 } })
    
    // When
    render(<ReviewSession />)
    await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
    
    // Then
    expect(screen.getByTestId('review-progress')).toHaveTextContent('1/2')
  })

  test('AC5: Session summary - shows summary at end', async () => {
    // Given
    vocabularyApi.listDueCards.mockResolvedValue({ cards: mockDueCards, pagination: { total: 2, page: 1, per_page: 10, total_pages: 1 } })
    vocabularyApi.submitReview.mockResolvedValue({ success: true })
    
    // When
    render(<ReviewSession />)
    await waitFor(() => expect(screen.getByText('Bonjour')).toBeInTheDocument())
    
    // Rate first card
    fireEvent.click(screen.getByTestId('rating-button-Good'))
    await waitFor(() => expect(screen.getByText('Au revoir')).toBeInTheDocument())
    
    // Rate second card
    fireEvent.click(screen.getByTestId('rating-button-Easy'))
    
    // Then
    await waitFor(() => {
      expect(screen.getByTestId('session-summary')).toBeInTheDocument()
      expect(screen.getByText(/2 cards reviewed/i)).toBeInTheDocument()
      expect(screen.getByText('Good: 1')).toBeInTheDocument()
      expect(screen.getByText('Easy: 1')).toBeInTheDocument()
    })
  })

  test('Empty state - no cards due', async () => {
    // Given
    vocabularyApi.listDueCards.mockResolvedValue({ cards: [], pagination: { total: 0, page: 1, per_page: 10, total_pages: 0 } })
    
    // When
    render(<ReviewSession />)
    
    // Then
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText(/No cards due for review/i)).toBeInTheDocument()
    })
  })
})
```

---

## Deliverables

### Code Changes

#### New Files to Create:

1. **`frontend/src/components/Flashcard.tsx`**
   - Functional React component with TypeScript
   - Props: `card` (CardData), `onFlip?` (callback), `flipped?` (controlled state)
   - State: `isFlipped` (local state if uncontrolled)
   - Behaviors: click to flip, swipe gestures, flip animation
   - Styling: CSS classes for card, front, back, animation
   - Accessibility: ARIA labels, keyboard support

2. **`frontend/src/components/ReviewSession.tsx`**
   - Functional React component with TypeScript
   - Props: `deckId?` (optional deck filter), `onComplete?` (callback)
   - State: `cards` (DueCard[]), `currentIndex`, `isLoading`, `error`, `ratings` (Map or object)
   - Behaviors: fetch due cards, manage session flow, submit ratings
   - Sub-components: Progress display, Rating buttons, Session summary
   - Styling: CSS classes for session container, progress, buttons
   - Accessibility: ARIA live regions for progress updates

3. **`frontend/src/components/Flashcard.test.tsx`**
   - Comprehensive jest tests for Flashcard component
   - Test all acceptance criteria related to Flashcard
   - Test edge cases (null example, empty content)
   - Test accessibility features

4. **`frontend/src/components/ReviewSession.test.tsx`**
   - Comprehensive jest tests for ReviewSession component
   - Test all acceptance criteria related to ReviewSession
   - Test API integration with mocking
   - Test error handling and edge cases

5. **`frontend/src/components/Flashcard.stories.tsx`** (Optional but recommended)
   - Storybook stories for Flashcard component
   - Show different states (front, back, with/without example)

### Modified Files:

1. **`frontend/src/types/index.ts`**
   - Add `CardData` interface for Flashcard props
   - Add `FlashcardProps` interface
   - Add `ReviewSessionProps` interface
   - Add `Rating` type (1 | 2 | 3 | 4)
   - Add `RatingButton` type or interface

2. **`frontend/src/styles/global.css`**
   - Add styles for `.flashcard` component
   - Add styles for `.flashcard-front`, `.flashcard-back`
   - Add CSS for flip animation
   - Add styles for rating buttons
   - Add styles for review session container
   - Add styles for session summary

3. **`frontend/src/utils/api.ts`** (Verify existence)
   - Ensure `vocabularyApi.listDueCards()` exists
   - Ensure `vocabularyApi.submitReview()` exists
   - If not, add these methods

### Documentation Updates:

1. **README.md** (if needed)
   - Add documentation for new components
   - Update feature list with vocabulary review

---

## Actual Prompt

This section contains the exact prompt text that will be used to drive implementation. As the AI assistant, I will use this structured prompt to guide my own implementation.

```
IMPLEMENT GitHub Issue #69: Create Flashcard and ReviewSession React components

CONTEXT:
- Project: French Language Coach (Phase 3)
- Stack: React 18+, TypeScript, Vite, Vitest/Jest
- Existing patterns: DeckCard.tsx, DeckBrowser.tsx, ChatInterface.tsx
- Backend API: FastAPI with /vocabulary/due/ and /vocabulary/review/ endpoints
- Type definitions: DueCard, CardSummary, ReviewSubmitRequest in types/index.ts
- Styling: Global CSS with consistent design language in global.css
- Testing: jest with @testing-library/react, 80%+ coverage required

RELEVANT FILES:
- frontend/src/types/index.ts: TypeScript types (DueCard lines 756-764, CardSummary lines 653-668)
- frontend/src/components/DeckCard.tsx: Reference component structure and styling
- frontend/src/components/DeckBrowser.tsx: Reference API usage patterns
- frontend/src/utils/api.ts: API client (verify listDueCards and submitReview methods)
- frontend/src/styles/global.css: Styling patterns
- routers/vocabulary.py: Backend endpoints (GET /due/, POST /review/)

EXISTING PATTERNS TO FOLLOW:
1. Functional components with TypeScript interfaces
2. useState, useEffect, useCallback for state management
3. Loading and error state handling
4. Accessibility: role, aria-label, tabIndex, keyboard handlers
5. Testing: data-testid attributes, describe/it blocks
6. Styling: BEM-like class names, consistent spacing and colors

GOAL:
Create two new React components for vocabulary card review:

PRIMARY: Flashcard component
- Display card front (French) initially
- Flip animation to show back (English + example)
- Support click/tap to flip
- Support swipe gestures for mobile
- Provide callback for parent to track flip state
- Consistent styling with existing DeckCard

PRIMARY: ReviewSession component  
- Fetch cards due for review from /vocabulary/due/
- Display cards one at a time using Flashcard
- Rating buttons: Again (1), Hard (2), Good (3), Easy (4)
- Progress tracking: "X of Y cards"
- Submit ratings to /vocabulary/review/ with card_id, deck_id, ease
- Auto-advance to next card after rating
- Session summary at end with rating distribution
- Handle empty state (no cards due)
- Handle API errors with retry

SECONDARY: TypeScript types
- Add CardData interface for Flashcard
- Add FlashcardProps, ReviewSessionProps interfaces
- Add Rating type for button values

SECONDARY: CSS styles
- Add .flashcard styles with flip animation
- Add rating button styles
- Add session container and progress styles
- Add session summary styles

SECONDARY: Tests
- Flashcard.test.tsx with 80%+ coverage
- ReviewSession.test.tsx with 80%+ coverage
- Test all acceptance criteria from issue #69

CONSTRAINTS:
- MUST follow existing code patterns (DeckCard.tsx, DeckBrowser.tsx)
- MUST use existing API endpoints (/vocabulary/due/, /vocabulary/review/)
- MUST use TypeScript with proper type definitions
- MUST include data-testid attributes for testing
- MUST implement accessibility features (ARIA, keyboard)
- MUST handle loading and error states
- MUST achieve 80%+ test coverage per component
- MUST NOT introduce new external dependencies
- MUST maintain existing code style

ACCEPTANCE CRITERIA (from issue #69):
- [ ] Flashcard displays correctly
- [ ] Flip animation works
- [ ] Rating buttons work
- [ ] Progress tracking
- [ ] Session summary

EXAMPLES:
1. Flashcard: Card with front="Bonjour", back="Hello", example="Salut!"
   - Initially shows "Bonjour"
   - Click flips to show "Hello" and "Salut!"

2. ReviewSession: 5 due cards
   - Shows first card, progress "1/5"
   - Click "Good" button -> submits ease=3, shows next card, progress "2/5"
   - Complete all cards -> shows summary "5 cards reviewed: Again:1, Hard:1, Good:2, Easy:1"

3. Edge cases:
   - No cards due -> show "No cards due for review" message
   - API error -> show error with retry button
   - Card without example -> don't show example section

DELIVERABLES:
1. frontend/src/components/Flashcard.tsx
2. frontend/src/components/Flashcard.test.tsx
3. frontend/src/components/ReviewSession.tsx
4. frontend/src/components/ReviewSession.test.tsx
5. frontend/src/components/Flashcard.stories.tsx (optional)
6. Updates to frontend/src/types/index.ts (if new types needed)
7. Updates to frontend/src/styles/global.css
8. Updates to frontend/src/utils/api.ts (if methods missing)

TESTING REQUIREMENTS:
- Test Flashcard rendering (AC1)
- Test flip functionality (AC2)
- Test rating submission (AC3)
- Test progress tracking (AC4)
- Test session summary (AC5)
- Test edge cases (empty cards, API errors, null fields)
- Achieve 80%+ coverage for all new code

STYLE GUIDE:
- Match existing code style in DeckCard.tsx and DeckBrowser.tsx
- Use consistent TypeScript patterns
- Follow existing naming conventions
- Use existing color scheme from global.css
- Maintain existing indentation (2 spaces for TypeScript)
```

---

## AI Response

[This section will be updated with the actual implementation as it is created]

---

## Human Review Notes

[To be completed after implementation]

### Changes Made
- [ ] [Change 1: Description and reason]
- [ ] [Change 2: Description and reason]

### Quality Checks
- [ ] Code follows existing patterns (DeckCard.tsx, DeckBrowser.tsx)
- [ ] Tests pass at 80%+ coverage
- [ ] All acceptance criteria from issue #69 are met
- [ ] Documentation (JSDoc comments) added
- [ ] Accessibility features implemented
- [ ] Error handling implemented

### Issues Found
- [Issue 1: Description and resolution]

---

## Verification

Checklist for verifying the deliverables:

- [ ] All acceptance criteria from issue #69 are met
- [ ] Flashcard component displays cards correctly
- [ ] Flip animation works on click and swipe
- [ ] Rating buttons submit correctly to backend
- [ ] Progress tracking shows correct count
- [ ] Session summary displays at end with statistics
- [ ] Tests pass with 80%+ coverage for Flashcard
- [ ] Tests pass with 80%+ coverage for ReviewSession
- [ ] Code follows project conventions
- [ ] No new external dependencies introduced
- [ ] All data-testid attributes present for testing
- [ ] Accessibility features implemented
- [ ] Loading and error states handled
- [ ] Empty state handled

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
