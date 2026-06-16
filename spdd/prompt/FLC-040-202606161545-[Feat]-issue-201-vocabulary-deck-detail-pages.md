# SPDD Prompt: Implement vocabulary deck detail pages

**GitHub Issue**: #201
**Issue Title**: Implement vocabulary deck detail pages
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/201
**Artifact ID**: FLC-040-202606161545
**Created**: 2026-06-16 15:45
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-040-202606161541-[Analysis]-issue-201-vocabulary-deck-detail-pages.md`

---

## Context

### Current Codebase State
The French Language Coach project is in Phase 3 (Vocabulary). The following are already implemented:
- DeckBrowser component (Issue #67) that lists all vocabulary decks
- Flashcard component (Issue #69) for displaying individual cards with flip animation
- ReviewSession component (Issue #69) for managing spaced repetition review sessions
- Backend vocabulary router with endpoints for listing decks, cards in a deck, and due cards

### Problem
When a user clicks on a deck in the DeckBrowser, they are navigated to `/vocabulary/decks/{id}` but this route doesn't exist, resulting in a blank page. Additionally, the route `/vocabulary/decks/{id}/cards` for viewing all cards in a deck is also missing.

### Relevant Files

| File | Purpose | Key Elements |
|------|---------|--------------|
| `frontend/src/components/DeckBrowser.tsx` | Lists all decks, navigates to `/vocabulary/decks/{id}` on click | `handleDeckClick`, `useNavigate`, DeckCard rendering |
| `frontend/src/pages/VocabularyPage.tsx` | Page that renders DeckBrowser | Simple wrapper component |
| `frontend/src/App.tsx` | Main app with React Router routes | Missing routes for deck detail and cards pages |
| `frontend/src/components/Flashcard.tsx` | Displays individual card with flip animation | `isFlipped` state, `onFlip` callback, swipe gestures |
| `frontend/src/components/ReviewSession.tsx` | Manages review session workflow | Uses Flashcard, rating buttons, SM-2 algorithm |
| `frontend/src/types/index.ts` | TypeScript type definitions | `DeckSummary`, `CardSummary`, `DeckWithProgress` |
| `frontend/src/utils/api.ts` | API client for backend endpoints | `vocabularyApi` with `listDecks`, `listDeckCards` |
| `routers/vocabulary.py` | Backend vocabulary router | Missing `GET /vocabulary/decks/{id}` endpoint |
| `schemas/vocabulary.py` | Pydantic schemas for vocabulary | `DeckResponse`, `DeckSummary`, `CardSummary` |
| `models/deck.py` | SQLAlchemy Deck model | `id`, `name`, `description`, `created_at`, `updated_at` |
| `models/card.py` | SQLAlchemy Card model | `deck_id`, `front`, `back`, SM-2 fields |

### Existing Patterns

1. **List/Detail Pattern**: LessonBrowser (`/lessons`) → LessonDetailPage (`/lessons/{id}`)
2. **Breadcrumb Pattern**: LessonDetailPage shows "Lessons > [Lesson Name]"
3. **Card Display Pattern**: DeckBrowser uses DeckCard component for each deck
4. **Filtering/Sorting Pattern**: DeckBrowser implements client-side filtering and sorting
5. **API Client Pattern**: Separate API modules for each domain (sessionApi, grammarApi, vocabularyApi)
6. **Backend Endpoint Pattern**: GET list with pagination, GET detail by ID, POST create

---

## Goal

**Primary Objective**: Implement the missing vocabulary deck detail pages to complete the navigation flow from DeckBrowser → DeckDetail → DeckCards.

**Secondary Objectives**:
- Add backend endpoint for fetching a single deck
- Create reusable Breadcrumb component
- Maintain consistency with existing patterns
- Achieve 80%+ test coverage for all new code

---

## Constraints

### Architecture Constraints
- MUST follow existing React 19 + TypeScript + Vite architecture
- MUST use existing FastAPI + SQLAlchemy async patterns for backend
- MUST use React Router v6 for routing
- MUST NOT introduce breaking changes to existing functionality
- MUST work with existing Flashcard and ReviewSession components

### Code Quality Constraints
- MUST match existing code style (PEP 8 for Python, ESLint defaults for TypeScript)
- MUST include docstrings for all public functions and components
- MUST use TypeScript types for all props and API responses
- MUST handle errors gracefully (loading states, error states, empty states)
- MUST be accessible (keyboard navigation, ARIA labels)

### Testing Constraints
- MUST create unit tests for all new components
- MUST create integration tests for new backend endpoints
- MUST test edge cases (deck not found, empty decks, API errors)
- MUST achieve 80%+ coverage for all new modules
- MUST follow existing test patterns (Vitest for frontend, pytest for backend)

### Acceptance Criteria
From GitHub issue #201:

**Deck Detail Page** (`/vocabulary/decks/{id}`):
1. Show deck name, description, and metadata
2. Show progress summary for the deck
3. Provide navigation to view cards or start review session
4. Display cards in the deck (with filtering/sorting)

**Deck Cards Page** (`/vocabulary/decks/{id}/cards`):
5. List all cards in the deck with pagination
6. Each card shows front, back, and key metadata
7. Support filtering and sorting
8. Click on card to flip or view details

**Navigation**:
9. DeckBrowser should navigate to deck detail page (already implemented)
10. Deck detail page should have links to view cards
11. Both pages should have breadcrumb navigation back to vocabulary list

---

## Examples

### Input/Output Examples

1. **Navigate to Deck Detail**
   - Input: User clicks deck with id=1 in DeckBrowser
   - Expected: Navigate to `/vocabulary/decks/1`, fetch deck data, display deck detail page

2. **View Deck with Cards**
   - Input: Deck with id=1 has name="Travel", description="Travel vocabulary", 15 cards
   - Expected: Page shows "Travel", description, created date, 15 cards, progress percentage

3. **View Deck Cards**
   - Input: User clicks "View All Cards" on deck detail page
   - Expected: Navigate to `/vocabulary/decks/1/cards`, fetch all cards, display paginated list

4. **Flip Card in List**
   - Input: User clicks a card in the cards list
   - Expected: Card flips to show back side (using Flashcard component)

5. **Filter Cards**
   - Input: User types "transport" in search box on cards page
   - Expected: Only cards matching "transport" are shown

### Edge Cases
- Deck with no cards: Show "No cards in this deck" message
- Deck not found (404): Show error page with link back to vocabulary list
- API error: Show error message with retry button
- Large deck (>100 cards): Use pagination (already in API)
- Deck with many tags: Limit displayed tags with "+X more"

### Test Cases

**Backend (pytest)**:
```python
# Test GET /vocabulary/decks/{id}
def test_get_deck_detail():
    # Given: A deck with id=1 exists in database
    deck_id = 1
    
    # When: GET /vocabulary/decks/1
    response = client.get(f"/vocabulary/decks/{deck_id}")
    
    # Then: Returns 200 with deck details
    assert response.status_code == 200
    assert "name" in response.json()
    assert "description" in response.json()
    assert "card_count" in response.json()

# Test deck not found
def test_get_deck_not_found():
    # Given: No deck with id=999
    
    # When: GET /vocabulary/decks/999
    response = client.get("/vocabulary/decks/999")
    
    # Then: Returns 404
    assert response.status_code == 404
```

**Frontend (Vitest/Jest)**:
```typescript
// Test DeckDetailPage renders deck info
import { render, screen } from '@testing-library/react'
import DeckDetailPage from './DeckDetailPage'

describe('DeckDetailPage', () => {
  it('displays deck name and description', async () => {
    // Given: Mock API returns deck data
    mockApi.getDeck.mockResolvedValue({
      id: 1,
      name: 'Travel',
      description: 'Travel vocabulary',
      card_count: 15
    })
    
    // When: Render component
    render(<DeckDetailPage />, { wrapper: MemoryRouter })
    
    // Then: Deck info is displayed
    await waitFor(() => {
      expect(screen.getByText('Travel')).toBeInTheDocument()
      expect(screen.getByText('Travel vocabulary')).toBeInTheDocument()
    })
  })
})
```

---

## Deliverables

### Backend Changes
- [ ] `routers/vocabulary.py` - Add `GET /vocabulary/decks/{id}` endpoint
- [ ] `schemas/vocabulary.py` - Verify `DeckResponse` schema is appropriate
- [ ] Tests for new endpoint in `tests/` directory

### Frontend Changes
- [ ] `frontend/src/pages/DeckDetailPage.tsx` - New page component for deck details
- [ ] `frontend/src/pages/DeckCardsPage.tsx` - New page component for deck cards list
- [ ] `frontend/src/components/Breadcrumb.tsx` - New reusable breadcrumb component
- [ ] `frontend/src/App.tsx` - Add routes for both new pages
- [ ] `frontend/src/types/index.ts` - Add types for deck detail and card list
- [ ] `frontend/src/utils/api.ts` - Add `getDeck` method to vocabularyApi
- [ ] Tests for new components

### Documentation Updates
- [ ] Update `README.md` routes table if new routes are public
- [ ] Add docstrings to all new functions and components

---

## Actual Prompt

```
IMPLEMENT GitHub issue #201: Implement vocabulary deck detail pages

CONTEXT:
- Project: French Language Coach (Phase 3 - Vocabulary)
- Current state: DeckBrowser navigates to /vocabulary/decks/{id} but route doesn't exist (blank page)
- Available components: Flashcard, ReviewSession, DeckBrowser, DeckCard
- Backend: FastAPI with SQLAlchemy async, existing vocabulary router
- Frontend: React 19 + TypeScript + Vite, React Router v6
- Existing patterns: LessonBrowser/LessonDetailPage for list/detail pattern

CURRENT CODEBASE FILES TO REFERENCE:
- frontend/src/components/DeckBrowser.tsx (lines 236-242: handleDeckClick navigates to /vocabulary/decks/{id})
- frontend/src/pages/VocabularyPage.tsx (simple wrapper for DeckBrowser)
- frontend/src/App.tsx (React Router routes, missing deck detail routes)
- frontend/src/components/Flashcard.tsx (card display with flip animation)
- frontend/src/components/ReviewSession.tsx (uses Flashcard, rating buttons)
- frontend/src/types/index.ts (DeckSummary, CardSummary, DeckWithProgress types)
- frontend/src/utils/api.ts (vocabularyApi with listDecks, listDeckCards)
- routers/vocabulary.py (missing GET /vocabulary/decks/{id} endpoint)
- schemas/vocabulary.py (DeckResponse, DeckSummary schemas)
- models/deck.py (Deck SQLAlchemy model)
- models/card.py (Card SQLAlchemy model)

GOAL:
1. Add backend endpoint GET /vocabulary/decks/{id} to fetch a single deck with metadata
2. Create DeckDetailPage component at /vocabulary/decks/{id}
3. Create DeckCardsPage component at /vocabulary/decks/{id}/cards
4. Add React Router routes in App.tsx
5. Add API client methods and TypeScript types
6. Implement breadcrumb navigation
7. Create comprehensive tests (80%+ coverage)

CONSTRAINTS:
- MUST follow existing architecture and patterns
- MUST use existing components (Flashcard, ReviewSession)
- MUST match existing code style (PEP 8, TypeScript conventions)
- MUST include docstrings for all public functions
- MUST handle errors, loading states, empty states
- MUST be accessible (keyboard navigation, ARIA labels)
- MUST achieve 80%+ test coverage
- MUST NOT introduce breaking changes

ACCEPTANCE CRITERIA (from issue #201):

Deck Detail Page (/vocabulary/decks/{id}):
- Show deck name, description, and metadata (AC-201-1)
- Show progress summary for the deck (AC-201-2)
- Provide navigation to view cards or start review session (AC-201-3)
- Display cards in the deck (with filtering/sorting) (AC-201-4)

Deck Cards Page (/vocabulary/decks/{id}/cards):
- List all cards in the deck with pagination (AC-201-5)
- Each card shows front, back, and key metadata (AC-201-6)
- Support filtering and sorting (AC-201-7)
- Click on card to flip or view details (AC-201-8)

Navigation:
- DeckBrowser should navigate to deck detail page (AC-201-9) - ALREADY IMPLEMENTED
- Deck detail page should have links to view cards (AC-201-10)
- Both pages should have breadcrumb navigation back to vocabulary list (AC-201-11)

EXAMPLES:
1. User clicks deck in DeckBrowser → Navigate to /vocabulary/decks/1 → Show deck details
2. User clicks "View All Cards" → Navigate to /vocabulary/decks/1/cards → Show all cards
3. User clicks card in list → Card flips to show back (using Flashcard component)
4. User searches "transport" → Only cards matching filter are shown

EDGE CASES TO HANDLE:
- Deck with no cards: Show "No cards in this deck"
- Deck not found (404): Show error with link back
- API error: Show error message with retry button
- Large deck: Use existing pagination (already in API)

DELIVERABLES:

Backend (Python):
1. routers/vocabulary.py - Add GET /vocabulary/decks/{id} endpoint
2. tests/test_vocabulary_deck_detail.py - Tests for new endpoint

Frontend (TypeScript):
3. frontend/src/pages/DeckDetailPage.tsx - Deck detail page component
4. frontend/src/pages/DeckCardsPage.tsx - Deck cards list page component
5. frontend/src/components/Breadcrumb.tsx - Reusable breadcrumb component
6. frontend/src/App.tsx - Add routes: <Route path="/vocabulary/decks/:deckId" element={<DeckDetailPage />} /> and <Route path="/vocabulary/decks/:deckId/cards" element={<DeckCardsPage />} />
7. frontend/src/types/index.ts - Add types: DeckDetail, DeckCardsPageProps, etc.
8. frontend/src/utils/api.ts - Add vocabularyApi.getDeck method
9. frontend/src/pages/DeckDetailPage.test.tsx - Tests for DeckDetailPage
10. frontend/src/pages/DeckCardsPage.test.tsx - Tests for DeckCardsPage
11. frontend/src/components/Breadcrumb.test.tsx - Tests for Breadcrumb

IMPLEMENTATION NOTES:
- Reuse existing isCardLearned logic: card.interval > 1
- Use existing SM-2 progress calculation: learnedCount/card_count * 100
- Follow DeckBrowser's filtering/sorting approach for DeckCardsPage
- Use Flashcard component for card display (already handles flip, swipe, keyboard)
- Breadcrumb pattern: Vocabulary > Deck Name > (Cards)
- For deck detail page, show a preview of cards (first 5-10) with link to full list
- Use existing pagination from backend API (page, per_page query params)

START IMPLEMENTATION IN THIS ORDER:
1. Backend endpoint (routers/vocabulary.py)
2. Frontend types (types/index.ts)
3. Frontend API client (utils/api.ts)
4. Breadcrumb component (components/Breadcrumb.tsx)
5. DeckDetailPage component (pages/DeckDetailPage.tsx)
6. DeckCardsPage component (pages/DeckCardsPage.tsx)
7. Update App.tsx routes
8. Create all tests
```

---

## AI Response

[AI-generated content will be documented here during implementation]

---

## Human Review Notes

[Changes made after AI generation will be documented here]

### Changes Made
- [ ] [Change 1: Description and reason]
- [ ] [Change 2: Description and reason]

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [Issue 1: Description and resolution]
- [Issue 2: Description and resolution]

---

## Verification

- [ ] All acceptance criteria from issue #201 are met
- [ ] Backend endpoint GET /vocabulary/decks/{id} works correctly
- [ ] DeckDetailPage component renders and functions correctly
- [ ] DeckCardsPage component renders and functions correctly
- [ ] Breadcrumb navigation works on both pages
- [ ] Routes are properly configured in App.tsx
- [ ] API client methods work correctly
- [ ] TypeScript types are properly defined
- [ ] Tests pass with 80%+ coverage for all new code
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
