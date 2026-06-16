# SPDD Prompt: Create DeckBrowser React Component

**GitHub Issue**: #67
**Issue Title**: 3.11: Create DeckBrowser React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/67
**Artifact ID**: FLC-037-202606160000
**Created**: 2026-06-16 00:00
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-037-202606152345-[Analysis]-issue-67-deck-browser-component.md`

---

## Context

### Current Codebase State

The French Language Coach project has a working React frontend with TypeScript, using Vite as the build tool. The backend is FastAPI with SQLAlchemy, and there's already a complete vocabulary router (`routers/vocabulary.py`) with the following endpoints:
- `GET /vocabulary/decks/` - List all decks with pagination (returns DeckSummary with card_count)
- `GET /vocabulary/decks/{id}/cards/` - List cards in a deck with pagination

The frontend already has similar components for grammar lessons:
- `LessonBrowser.tsx` - Main browser component with search, filter, pagination
- `LessonSearch.tsx` - Search and filter controls
- `LessonCard.tsx` - Individual lesson card display

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/components/LessonBrowser.tsx` | Reference implementation for browser components | Uses useState, useEffect, useCallback, useMemo hooks; fetches data with pagination; implements search/filter client-side |
| `frontend/src/components/LessonSearch.tsx` | Reference for search/filter UI | Implements search input, topic filter, difficulty filter with callbacks |
| `frontend/src/components/LessonCard.tsx` | Reference for item display | Shows lesson metadata, handles click events |
| `frontend/src/utils/api.ts` | API client pattern | Contains grammarApi with listLessons, getLesson functions |
| `frontend/src/types/index.ts` | TypeScript type definitions | Contains LessonSummary, LessonListResponse, PaginationInfo |
| `routers/vocabulary.py` | Backend vocabulary endpoints | GET /vocabulary/decks/ returns DeckListResponse with DeckSummary[] |
| `schemas/vocabulary.py` | Backend schemas | DeckSummary includes id, name, description, created_at, updated_at, card_count |
| `models/deck.py` | SQLAlchemy Deck model | Has name, description, cards relationship |
| `models/card.py` | SQLAlchemy Card model | Has deck_id, card_id, front, back, tags, difficulty, interval, ease_factor, next_review_date |

### Existing Patterns

1. **Component Structure Pattern**: LessonBrowser uses component composition with LessonSearch and LessonCard
2. **API Client Pattern**: grammarApi in utils/api.ts provides typed functions that call the generic api() function
3. **TypeScript Types Pattern**: Separate interfaces for Summary and Response types, matching backend schemas
4. **Testing Pattern**: Use @testing-library/react with MSW for API mocking, jest for test runner
5. **Storybook Pattern**: Components have .stories.tsx files for documentation
6. **Styling Pattern**: Use CSS classes like lessons-grid, lesson-card, etc.

### Analysis Reference

This prompt is based on the analysis in `spdd/analysis/FLC-037-202606152345-[Analysis]-issue-67-deck-browser-component.md` which identifies:
- Deck data comes from GET /vocabulary/decks/ endpoint
- Progress is calculated based on cards with interval > 1 (learned)
- Tag filtering should work at the deck level (filtering decks that have cards with matching tags)
- Search should filter by deck name and description client-side

---

## Goal

**Primary Objective**: Create a complete DeckBrowser React component that allows users to browse, search, filter, and sort vocabulary decks.

**Secondary Objectives**:
- Create supporting DeckCard component for displaying individual decks
- Create DeckSearch component for search, tag filtering, and sorting
- Add TypeScript type definitions for vocabulary deck data
- Add vocabulary API client functions to utils/api.ts
- Create comprehensive unit tests with 80%+ coverage
- Create Storybook stories for all new components

---

## Constraints

### Architecture Constraints
- Must follow existing React + TypeScript architecture
- Must use existing vocabulary router endpoints (GET /vocabulary/decks/)
- Must follow component composition pattern from LessonBrowser
- Must use existing API client pattern from grammarApi
- Must match existing TypeScript type patterns
- Must use existing CSS patterns or create consistent deck-specific classes

### Code Quality Constraints
- Must maintain 80% test coverage for all new components
- Must follow ESLint configuration
- Must include docstrings for all exported components and functions
- Must use TypeScript with proper type safety
- Must handle loading, error, and empty states
- Must be responsive (mobile and desktop)

### Testing Constraints
- Must create jest tests for all new components
- Must use @testing-library/react for component testing
- Must use MSW for mocking API endpoints
- Must test edge cases (empty lists, errors, loading states)
- Must achieve 80%+ coverage per component

### Acceptance Criteria

From GitHub issue #67:
1. **AC1**: Displays all decks - Component must fetch and display all available decks
2. **AC2**: Shows card count per deck - Each deck must display its card_count
3. **AC3**: Shows progress indicators - Each deck must show progress (cards learned / total)
4. **AC4**: Filtering works - Users must be able to filter decks (by tag)
5. **AC5**: Search works - Users must be able to search decks

---

## Examples

### Input/Output Examples

1. **Example 1: Initial Load**
   - Input: User navigates to vocabulary page
   - Expected Output: DeckBrowser fetches decks from /vocabulary/decks/, displays them in a grid

2. **Example 2: Search Functionality**
   - Input: User types "travel" in search box
   - Expected Output: Only decks with "travel" in name or description are displayed

3. **Example 3: Tag Filtering**
   - Input: User clicks "food" tag
   - Expected Output: Only decks containing cards with "food" tag are displayed

4. **Example 4: Progress Calculation**
   - Input: Deck has 10 cards, 3 have interval > 1
   - Expected Output: Deck shows "3/10 cards learned (30%)" with progress bar

5. **Example 5: Empty State**
   - Input: No decks exist or no decks match filters
   - Expected Output: Show empty state message with option to clear filters

6. **Example 6: Error State**
   - Input: API request fails
   - Expected Output: Show error message with retry button

### Edge Cases

- Empty deck list (first-time users)
- Deck with 0 cards
- Deck with all cards learned (100% progress)
- No decks match current filters
- Network errors during API calls
- Single deck (pagination edge case)
- Decks with no description
- Decks with special characters in name/description

### Test Cases

```typescript
// DeckBrowser.test.tsx examples
describe('DeckBrowser', () => {
  it('displays all decks on initial load', async () => {
    // Given: mocked API returns list of decks
    // When: component mounts
    // Then: all decks are displayed
  })

  it('shows card count for each deck', async () => {
    // Given: decks with various card counts
    // When: component displays decks
    // Then: each deck shows its card_count
  })

  it('shows progress indicators', async () => {
    // Given: decks with cards at different progress states
    // When: component displays decks
    // Then: each deck shows progress percentage
  })

  it('filters decks by search query', async () => {
    // Given: multiple decks, user enters search query
    // When: search input changes
    // Then: only matching decks are displayed
  })

  it('filters decks by tag', async () => {
    // Given: decks with various card tags
    // When: user selects tag filter
    // Then: only decks with cards having that tag are displayed
  })
})
```

---

## Deliverables

### Code Changes

1. **New Files**
   - [ ] `frontend/src/types/vocabulary.ts` - TypeScript types for vocabulary (DeckSummary, DeckListResponse, etc.)
   - [ ] `frontend/src/utils/vocabularyApi.ts` - OR extend utils/api.ts with vocabularyApi section
   - [ ] `frontend/src/components/DeckCard.tsx` - Component for displaying individual deck
   - [ ] `frontend/src/components/DeckSearch.tsx` - Component for search, filter, and sort controls
   - [ ] `frontend/src/components/DeckBrowser.tsx` - Main deck browser component
   - [ ] `frontend/src/components/DeckCard.stories.tsx` - Storybook story for DeckCard
   - [ ] `frontend/src/components/DeckSearch.stories.tsx` - Storybook story for DeckSearch
   - [ ] `frontend/src/components/DeckBrowser.stories.tsx` - Storybook story for DeckBrowser

2. **Modified Files**
   - [ ] `frontend/src/types/index.ts` - Add vocabulary types (or reference from new file)
   - [ ] `frontend/src/utils/api.ts` - Add vocabularyApi client functions
   - [ ] `frontend/src/components/index.ts` - Export new components
   - [ ] `frontend/src/App.tsx` - Add route for vocabulary decks page (optional, if adding navigation)

3. **Test Files**
   - [ ] `frontend/src/components/DeckCard.test.tsx` - Unit tests for DeckCard
   - [ ] `frontend/src/components/DeckSearch.test.tsx` - Unit tests for DeckSearch
   - [ ] `frontend/src/components/DeckBrowser.test.tsx` - Unit tests for DeckBrowser

### Tests

- Unit tests for DeckCard component (rendering, props handling)
- Unit tests for DeckSearch component (filter changes, callbacks)
- Unit tests for DeckBrowser component (data fetching, state management, rendering)
- Edge case tests (empty lists, errors, loading states)
- Integration tests for component composition

### Documentation

- Docstrings for all exported components and functions
- JSDoc comments for TypeScript interfaces
- Storybook stories for visual documentation
- Update spdd/README.md with new artifact references (optional)

---

## Actual Prompt

This is the exact prompt text that will be used to drive implementation:

```
IMPLEMENTATION TASK: Create DeckBrowser React Component for GitHub Issue #67

CONTEXT:
- Project: French Language Coach (React + TypeScript frontend, FastAPI + SQLAlchemy backend)
- Issue: #67 - Create DeckBrowser React component
- Backend already has complete vocabulary router (routers/vocabulary.py) with:
  - GET /vocabulary/decks/ - Returns paginated list of DeckSummary with card_count
  - GET /vocabulary/decks/{id}/cards/ - Returns paginated list of cards in a deck
- Backend schemas (schemas/vocabulary.py):
  - DeckSummary: id, name, description, created_at, updated_at, card_count
  - DeckListResponse: decks (DeckSummary[]), pagination (PaginationInfo)
  - CardSummary: id, deck_id, card_id, front, back, tags (list[str]), interval, ease_factor, next_review_date
- Existing patterns to follow:
  - LessonBrowser.tsx for main browser component structure
  - LessonSearch.tsx for search/filter UI
  - LessonCard.tsx for item display
  - grammarApi in utils/api.ts for API client functions
  - TypeScript types in types/index.ts

GOAL:
Create a complete DeckBrowser React component that:
1. Fetches and displays all vocabulary decks
2. Shows card count per deck
3. Shows progress indicators (cards learned / total)
4. Supports filtering by tag
5. Supports searching by deck name and description
6. Supports sorting (name, created date, card count, progress)
7. Handles loading, error, and empty states
8. Is responsive for mobile and desktop
9. Achieves 80%+ test coverage

REQUIREMENTS FROM ISSUE #67:
- List all decks with card counts
- Show progress (cards learned)
- Filter by tag
- Search decks
- Sort options

ACCEPTANCE CRITERIA:
- [ ] Displays all decks
- [ ] Shows card count per deck
- [ ] Shows progress indicators
- [ ] Filtering works
- [ ] Search works

IMPLEMENTATION DETAILS:

1. TYPES (in frontend/src/types/index.ts or new file):
   - DeckSummary: { id: number, name: string, description: string | null, created_at: string, updated_at: string, card_count: number }
   - DeckWithProgress: DeckSummary + { learned_count: number, progress_percent: number }
   - DeckListResponse: { decks: DeckSummary[], pagination: PaginationInfo }
   - DeckCardProps: { deck: DeckWithProgress, onClick: (deckId: number) => void }
   - DeckSearchProps: { searchQuery: string, tagFilter: string, sortBy: string, onSearch: (query: string) => void, onTagFilter: (tag: string) => void, onSort: (sortBy: string) => void, onClearFilters: () => void, availableTags: string[] }
   - DeckBrowserProps: { initialSearch?: string, initialTag?: string, initialSort?: string }

2. API CLIENT (extend frontend/src/utils/api.ts):
   - vocabularyApi.listDecks(page: number, perPage: number) => Promise<DeckListResponse>
   - vocabularyApi.listDeckCards(deckId: number, page: number, perPage: number) => Promise<CardListResponse>
   - Note: For initial implementation, we may need to fetch cards to calculate progress and get tags

3. COMPONENTS:

   A. DeckCard.tsx:
   - Displays individual deck information
   - Props: deck (DeckWithProgress), onClick
   - Shows: deck name, description, card count, progress bar/indicator
   - Uses similar styling to LessonCard.tsx

   B. DeckSearch.tsx:
   - Search input for deck name/description
   - Tag filter dropdown (populated from available tags)
   - Sort dropdown with options:
     - Name (A-Z)
     - Name (Z-A)
     - Created Date (Newest)
     - Created Date (Oldest)
     - Card Count (Most)
     - Card Count (Least)
     - Progress (Highest)
     - Progress (Lowest)
   - Clear filters button
   - Props: searchQuery, tagFilter, sortBy, onSearch, onTagFilter, onSort, onClearFilters, availableTags

   C. DeckBrowser.tsx (main component):
   - Fetches decks from vocabularyApi.listDecks()
   - For each deck, fetches cards from vocabularyApi.listDeckCards() to calculate progress and get tags
   - Combines deck data with progress information
   - Manages state: decks, loading, error, searchQuery, tagFilter, sortBy, availableTags
   - Implements client-side search filtering (on deck name and description)
   - Implements client-side tag filtering (filter decks that have cards with the selected tag)
   - Implements client-side sorting
   - Handles pagination from backend
   - Renders: DeckSearch, deck count, decks grid (DeckCard[]), pagination controls
   - Handles loading, error, and empty states
   - Uses similar patterns to LessonBrowser.tsx

4. PROGRESS CALCULATION:
   - A card is considered "learned" if interval > 1 (SM-2 algorithm convention)
   - For each deck: learned_count = cards.filter(c => c.interval > 1).length
   - progress_percent = (learned_count / card_count) * 100

5. TAG AGGREGATION:
   - For each deck, collect all unique tags from its cards
   - availableTags = all unique tags across all decks (for tag filter dropdown)
   - When filtering by tag, show only decks that have at least one card with that tag

6. STYLING:
   - Create new CSS classes: deck-browser, deck-search, decks-grid, deck-card, deck-progress
   - Or reuse existing classes from lesson components where appropriate
   - Follow existing styling patterns in style.css

7. TESTING:
   - Use @testing-library/react
   - Use MSW for API mocking
   - Test all acceptance criteria
   - Test edge cases (empty, errors, loading)
   - Achieve 80%+ coverage

8. STORYBOOK:
   - Create stories for DeckCard, DeckSearch, DeckBrowser
   - Show different states (loading, error, empty, with data)
   - Document props and usage

CONSTRAINTS:
- Must follow existing code patterns (LessonBrowser, LessonSearch, LessonCard)
- Must use TypeScript with proper types
- Must handle loading, error, and empty states
- Must be responsive
- Must achieve 80%+ test coverage
- Must use existing API patterns (similar to grammarApi)
- Must use existing type patterns
- Must not introduce breaking changes

DELIVERABLES:
1. TypeScript types for vocabulary decks
2. vocabularyApi client functions
3. DeckCard component with tests and stories
4. DeckSearch component with tests and stories
5. DeckBrowser component with tests and stories
6. All acceptance criteria verified

EXAMPLES:
- Basic deck display: Deck shows name, description, "5/10 cards learned (50%)", progress bar
- Search: Typing "food" shows only decks with "food" in name or description
- Tag filter: Selecting "travel" tag shows only decks with cards tagged "travel"
- Sort: Selecting "Most Cards" sorts decks by card_count descending
- Empty state: "No decks found. Create your first deck to get started!"
- Error state: "Failed to load decks. Retry"

NOTES:
- Backend DeckSummary already includes card_count
- Need to fetch cards separately to calculate progress (learned count)
- Tag filtering is at the deck level (decks that have cards with the tag)
- Progress calculation uses SM-2 convention: interval > 1 means learned
- For initial implementation, fetch all cards for all decks to calculate progress and get tags
- Consider pagination performance - may need to fetch cards in batches or add a new endpoint

START IMPLEMENTATION:
1. First, add TypeScript types for vocabulary
2. Then, add vocabularyApi client functions
3. Then, create DeckCard component
4. Then, create DeckSearch component
5. Finally, create DeckBrowser component
6. Create tests for each component
7. Create Storybook stories
8. Verify all acceptance criteria
```

---

## AI Response

[AI response will be captured here during implementation]

---

## Human Review Notes

[Human review notes will be added here after AI generates code]

### Changes Made
- [ ] Any changes made after AI generation
- [ ] Reasoning for each change

### Quality Checks
- [ ] Code follows existing patterns (LessonBrowser, LessonSearch, LessonCard)
- [ ] TypeScript types match backend schemas
- [ ] Tests pass at 80%+ coverage
- [ ] All acceptance criteria met
- [ ] Loading, error, empty states handled
- [ ] Responsive design implemented
- [ ] Documentation (docstrings, stories) complete

### Issues Found
- [ ] Any issues found during implementation or review
- [ ] Resolution for each issue

---

## Verification

Checklist for verifying the deliverables:

- [ ] All acceptance criteria from issue #67 are met
  - [ ] Displays all decks
  - [ ] Shows card count per deck
  - [ ] Shows progress indicators
  - [ ] Filtering works
  - [ ] Search works
- [ ] Tests pass with 80%+ coverage for all new components
- [ ] Code follows project conventions and patterns
- [ ] TypeScript types are correct and complete
- [ ] No breaking changes introduced
- [ ] Human review completed
- [ ] Storybook stories created and working
- [ ] All edge cases handled (empty, error, loading states)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
