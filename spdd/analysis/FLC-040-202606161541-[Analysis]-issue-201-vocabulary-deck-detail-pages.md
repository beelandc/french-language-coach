# SPDD Analysis: Implement vocabulary deck detail pages

**GitHub Issue**: #201
**Issue Title**: Implement vocabulary deck detail pages
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/201
**Artifact ID**: FLC-040-202606161541
**Created**: 2026-06-16 15:41
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Currently, the DeckBrowser component navigates to `/vocabulary/decks/{id}` when a deck is clicked, but there is no route or page component defined for this path. This results in a blank page being displayed.

Additionally, there is no page for viewing all cards in a specific deck at `/vocabulary/decks/{id}/cards`.

### Current State
- `/vocabulary` - Shows DeckBrowser with vocabulary decks (Issue #67)
- `/vocabulary/decks/{id}` - No route exists, shows blank page
- `/vocabulary/decks/{id}/cards` - No route exists, no navigation to it

### Expected Behavior
According to README.md documentation:
- `/vocabulary/decks/{id}/cards` should list all cards in a specific deck with pagination

---

## Background

The vocabulary feature (Phase 3) includes DeckBrowser (Issue #67) which allows users to browse their vocabulary decks. However, clicking on a deck currently results in a blank page because the detail page routes are not implemented. Issue #69 implemented the Flashcard and ReviewSession components which are ready to be used for displaying individual cards.

This issue completes the vocabulary deck navigation flow by implementing the missing detail pages, enabling users to:
1. View detailed information about a specific deck
2. Browse all cards within a deck
3. Navigate to review sessions from deck pages

---

## Business Value

- **Complete User Flow**: Users can now fully navigate from deck list → deck detail → card list → review session
- **Improved User Experience**: Eliminates blank pages and provides expected functionality
- **Leverages Existing Components**: Uses already-implemented Flashcard and ReviewSession components
- **Enables Card Study**: Provides dedicated pages for studying vocabulary cards outside of review sessions
- **Consistent Navigation**: Implements breadcrumb navigation for better UX

---

## Scope In

- [ ] Add backend endpoint `GET /vocabulary/decks/{id}` for fetching single deck details
- [ ] Create `DeckDetailPage` component at `/vocabulary/decks/{id}`
- [ ] Create `DeckCardsPage` component at `/vocabulary/decks/{id}/cards`
- [ ] Add React Router routes for both new pages in App.tsx
- [ ] Add API client methods for new backend endpoints
- [ ] Add TypeScript types for new page components and API responses
- [ ] Implement breadcrumb navigation on both pages
- [ ] Add filtering and sorting capabilities to DeckCardsPage
- [ ] Add pagination to DeckCardsPage
- [ ] Add navigation links from DeckDetailPage to DeckCardsPage and ReviewSession
- [ ] Create comprehensive tests for both new components (80%+ coverage)
- [ ] Update README.md if needed for new routes

## Scope Out

- [ ] Card editing functionality (not mentioned in ACs)
- [ ] Deck editing functionality (not mentioned in ACs)
- [ ] Card creation from UI (already exists in backend but not required by ACs)
- [ ] User authentication (Phase 5, not in scope for Phase 3)
- [ ] Multi-user deck sharing (Phase 5)
- [ ] Import/export decks (not mentioned in requirements)

---

## Acceptance Criteria (ACs)

### Deck Detail Page (`/vocabulary/decks/{id}`)

1. **AC-201-1**: Show deck name, description, and metadata
   **Given** A user navigates to `/vocabulary/decks/{id}`
   **When** The deck exists
   **Then** The page displays the deck's name, description, created_at, updated_at, and card count

2. **AC-201-2**: Show progress summary for the deck
   **Given** A user views a deck detail page
   **When** The deck has cards with spaced repetition data
   **Then** The page displays progress metrics (cards learned, progress percentage)

3. **AC-201-3**: Provide navigation to view cards or start review session
   **Given** A user is on a deck detail page
   **When** The page is loaded
   **Then** There are visible links/buttons to navigate to the deck's cards page and to start a review session

4. **AC-201-4**: Display cards in the deck (possibly with filtering/sorting)
   **Given** A user views a deck detail page
   **When** The deck has cards
   **Then** The page displays a preview or list of cards in the deck with filtering/sorting options

### Deck Cards Page (`/vocabulary/decks/{id}/cards`)

5. **AC-201-5**: List all cards in the deck with pagination
   **Given** A user navigates to `/vocabulary/decks/{id}/cards`
   **When** The deck has cards
   **Then** All cards are displayed with pagination controls

6. **AC-201-6**: Each card shows front, back, and key metadata
   **Given** Cards are displayed on the deck cards page
   **When** Viewing the card list
   **Then** Each card displays front (French), back (English), and key metadata (tags, difficulty, next review date)

7. **AC-201-7**: Support filtering and sorting
   **Given** A user is on the deck cards page
   **When** They apply filters or sorting
   **Then** The card list updates to match the filter/sort criteria

8. **AC-201-8**: Click on card to flip or view details
   **Given** A user views the card list
   **When** They click on a card
   **Then** The card flips to show the back side (using existing Flashcard component)

### Navigation

9. **AC-201-9**: DeckBrowser should navigate to deck detail page
   **Given** A user clicks on a deck in DeckBrowser
   **When** The deck is clicked
   **Then** They are navigated to `/vocabulary/decks/{id}` (already implemented in DeckBrowser)

10. **AC-201-10**: Deck detail page should have links to view cards
    **Given** A user is on a deck detail page
    **When** They want to view all cards
    **Then** There is a visible link to `/vocabulary/decks/{id}/cards`

11. **AC-201-11**: Both pages should have breadcrumb navigation back to vocabulary list
    **Given** A user is on deck detail or deck cards page
    **When** They want to navigate back
    **Then** There is breadcrumb navigation showing: Vocabulary > Deck Name > (optional: Cards)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **DeckBrowser Component** (`frontend/src/components/DeckBrowser.tsx`): Main component for browsing decks, already navigates to `/vocabulary/decks/{id}` on deck click (Issue #67)
- **DeckCard Component** (`frontend/src/components/DeckCard.tsx`): Displays a single deck summary card
- **Flashcard Component** (`frontend/src/components/Flashcard.tsx`): Displays individual vocabulary cards with flip animation (Issue #69)
- **ReviewSession Component** (`frontend/src/components/ReviewSession.tsx`): Manages spaced repetition review sessions (Issue #69)
- **Deck Model** (`models/deck.py`): SQLAlchemy model for vocabulary decks
- **Card Model** (`models/card.py`): SQLAlchemy model for vocabulary cards with spaced repetition fields
- **Vocabulary Router** (`routers/vocabulary.py`): Backend endpoints for vocabulary management
- **Vocabulary Schemas** (`schemas/vocabulary.py`): Pydantic schemas for deck, card, and review operations
- **VocabularyPage** (`frontend/src/pages/VocabularyPage.tsx`): Page that renders DeckBrowser
- **Vocabulary API Client** (`frontend/src/utils/api.ts`): API methods for vocabulary operations

### New Concepts Required

- **DeckDetailPage Component**: Page component for displaying single deck details at `/vocabulary/decks/{id}`
- **DeckCardsPage Component**: Page component for listing all cards in a deck at `/vocabulary/decks/{id}/cards`
- **GET /vocabulary/decks/{id} Endpoint**: Backend endpoint to fetch a single deck's details
- **DeckDetail Types**: TypeScript types for deck detail page data structures
- **CardListView Component** (optional): Reusable component for displaying card lists with filtering/sorting

### Key Business Rules

- Deck ID is a positive integer (auto-incremented primary key)
- Cards belong to exactly one deck (deck_id foreign key)
- Cards have spaced repetition data (interval, ease_factor, next_review_date)
- A card is "learned" when interval > 1 (SM-2 algorithm convention, used in DeckBrowser)
- Progress percentage = (learned cards / total cards) * 100
- Pagination should support 1-1000 items per page (matching existing patterns)

---

## Strategic Approach

### Solution Direction

1. **Backend**: Add `GET /vocabulary/decks/{id}` endpoint to fetch a single deck with its metadata
2. **Frontend Types**: Add TypeScript types for deck detail and card list views
3. **Frontend API**: Add API client methods for the new backend endpoint
4. **Pages**: Create `DeckDetailPage` and `DeckCardsPage` components
5. **Routes**: Add React Router routes in App.tsx for both new pages
6. **Navigation**: Implement breadcrumb navigation on both pages
7. **Card Display**: Use existing Flashcard component for displaying cards in DeckCardsPage
8. **Testing**: Create comprehensive tests for both new page components

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Reuse Flashcard component vs custom card display | Flashcard has flip animation which is good for UX, but may be overkill for a simple list view | Use Flashcard component in a compact mode for consistency with ReviewSession |
| Client-side vs server-side filtering for cards | Client-side is simpler and faster for small datasets, server-side is better for large datasets | Client-side filtering for now (decks typically have <100 cards), add server-side later if needed |
| Separate DeckCardsPage vs integrated into DeckDetailPage | Separate page allows direct linking and cleaner URL structure | Separate DeckCardsPage component |
| Breadcrumbs implementation | Custom component vs use existing patterns | Follow existing patterns from LessonBrowser/LessonDetailPage |

### Alternatives Considered

- **Alternative 1**: Create a single page with tabs (Detail, Cards, Review) - Rejected because separate URLs are more shareable and bookmarkable
- **Alternative 2**: Use server-side filtering for cards - Rejected for initial implementation to keep it simple, can be added later
- **Alternative 3**: Create a new CardList component from scratch - Rejected because existing Flashcard component is already well-tested and functional

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Display cards in the deck" on detail page | Should this be a full list or a preview? | Implement as a preview with link to full list |
| "Filtering and sorting" on cards page | What filters? What sort options? | Match DeckBrowser filters: search, tags, sort by name/difficulty/review date |
| "Click on card to flip or view details" | Should this navigate or flip in place? | Flip in place using existing Flashcard behavior |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Deck with no cards | Empty state should be shown | Display "No cards in this deck" message |
| Deck not found (404) | Invalid deck ID in URL | Show error page with link back to vocabulary list |
| API error when loading deck | Network or server error | Show error message with retry button |
| API error when loading cards | Network or server error | Show error message with retry button |
| Very large deck (>100 cards) | Performance and UX | Use pagination (already in API) |
| Deck with many tags | Tag display might be cluttered | Limit displayed tags, show "+X more" |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| TypeScript type errors | Build failures, runtime errors | Use existing types as templates, run `npm run build` frequently |
| React Router configuration errors | Broken navigation | Test all routes manually, follow existing patterns |
| Backend API changes breaking frontend | Inconsistent data structures | Use shared schemas between frontend and backend where possible |
| Test coverage below 80% | Fails quality gate | Write tests alongside implementation |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-201-1 | Show deck name, description, metadata | Yes | Need backend endpoint |
| AC-201-2 | Show progress summary | Yes | Use existing logic from DeckBrowser |
| AC-201-3 | Navigation to view cards/review | Yes | Add buttons/links |
| AC-201-4 | Display cards with filtering | Yes | Can use existing Flashcard component |
| AC-201-5 | List cards with pagination | Yes | API already supports pagination |
| AC-201-6 | Show front, back, metadata | Yes | Flashcard component already does this |
| AC-201-7 | Support filtering/sorting | Yes | Implement client-side filtering |
| AC-201-8 | Click card to flip | Yes | Use existing Flashcard onClick |
| AC-201-9 | DeckBrowser navigation | Already implemented | Verify it works |
| AC-201-10 | Deck detail links to cards | Yes | Add link in DeckDetailPage |
| AC-201-11 | Breadcrumb navigation | Yes | Implement breadcrumbs component |

**AC Coverage Summary**: All 11 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Error handling for API failures
- Loading states for async data fetching
- Empty states when no data exists
- Responsive design for mobile devices
- Accessibility (keyboard navigation, ARIA labels)

---

## REASONS Canvas

### Requirements
From GitHub issue #201 acceptance criteria:
- Deck Detail Page: Show deck name, description, metadata, progress summary, navigation links, card display
- Deck Cards Page: List all cards with pagination, show front/back/metadata, filtering/sorting, flip on click
- Navigation: DeckBrowser → DeckDetail → DeckCards, breadcrumb navigation

### Examples
Concrete test cases:
1. Navigate to `/vocabulary/decks/1` → See deck "Travel" with description, created date, 15 cards, 75% progress
2. Click "View All Cards" → Navigate to `/vocabulary/decks/1/cards` → See 15 cards with pagination
3. Click a card → Card flips to show back side with example and metadata
4. Apply tag filter "transport" → Only shows cards tagged with "transport"
5. Sort by "difficulty" → Cards reorder by difficulty level

### Architecture
Existing patterns to follow:
- **Frontend**: React 19 + TypeScript + Vite, React Router v6, functional components with hooks
- **Backend**: FastAPI, SQLAlchemy async, Pydantic schemas
- **Patterns**: 
  - LessonBrowser/LessonDetailPage for similar list/detail pattern
  - Existing Flashcard and ReviewSession components for card display
  - Breadcrumb pattern from grammar lessons (LessonBrowser → LessonDetailPage)
- **File structure**: `frontend/src/pages/` for page components, `frontend/src/components/` for reusable components

### Standards
- **Coding**: PEP 8 (Python), ESLint defaults (TypeScript), match existing codebase style
- **Testing**: 80%+ coverage per module, Vitest/Jest for frontend, pytest for backend
- **Documentation**: Docstrings for public functions, TypeScript types for all props, README updates for new features
- **Accessibility**: Keyboard navigation, ARIA labels, semantic HTML

### Omissions
Explicitly out of scope:
- Card/deck editing functionality
- User authentication
- Multi-user features
- Import/export functionality
- Server-side filtering (for now)

### Notes
Implementation hints:
- Reuse existing `isCardLearned` logic from DeckBrowser (`card.interval > 1`)
- Use existing SM-2 progress calculation pattern
- Follow DeckBrowser's filtering/sorting approach for consistency
- API endpoint should match existing patterns in `routers/vocabulary.py`
- Use existing TypeScript types from `frontend/src/types/index.ts` as templates
- Flashcard component already handles flip animation, swipe gestures, keyboard navigation

### Solutions
Reference implementations to mimic:
- `LessonBrowser.tsx` and `LessonDetailPage.tsx` for list/detail pattern
- `LessonCard.tsx` for card display in lists
- `DeckBrowser.tsx` for deck filtering/sorting logic
- `Flashcard.tsx` for individual card display with flip
- `ReviewSession.tsx` for card review workflow
- Backend: `routers/grammar.py` for similar GET detail endpoint patterns

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
