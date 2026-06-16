# SPDD Analysis: Create DeckBrowser React Component

**GitHub Issue**: #67
**Issue Title**: 3.11: Create DeckBrowser React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/67
**Artifact ID**: FLC-037-202606152345
**Created**: 2026-06-15 23:45
**Author**: Mistral Vibe

---

## Original Business Requirement

Component to browse vocabulary decks.

## Features
- List all decks with card counts
- Show progress (cards learned)
- Filter by tag
- Search decks
- Sort options

## Acceptance Criteria
- [ ] Displays all decks
- [ ] Shows card count per deck
- [ ] Shows progress indicators
- [ ] Filtering works
- [ ] Search works

---

## Background

The French Language Coach project is building a comprehensive language learning platform. Phase 3 focuses on vocabulary management features. Issue #67 requires creating a React component to browse vocabulary decks, similar to the existing LessonBrowser component for grammar lessons.

Users need the ability to:
- View all their vocabulary decks
- See deck metadata (card counts, progress)
- Filter decks by tags
- Search for specific decks
- Sort decks by various criteria

This feature enables users to organize and navigate their vocabulary study materials efficiently.

---

## Business Value

- Provides users with a dedicated interface for managing vocabulary decks
- Enables efficient deck discovery through search and filtering
- Shows progress tracking to motivate continued learning
- Completes the vocabulary management feature set (Phase 3)
- Follows established patterns from LessonBrowser for consistency

---

## Scope In

- [x] Create DeckBrowser React component
- [x] Create supporting DeckCard component for individual deck display
- [x] Create DeckSearch component for filtering and search UI
- [x] Add TypeScript type definitions for vocabulary deck data
- [x] Add API client functions for vocabulary endpoints
- [x] Implement server-side pagination (via existing backend endpoint)
- [x] Implement client-side search filtering
- [x] Implement tag filtering
- [x] Implement sort functionality
- [x] Show progress indicators (cards learned vs total)
- [x] Show card counts per deck
- [x] Responsive design
- [x] Loading, error, and empty states
- [x] Unit tests with 80%+ coverage
- [x] Storybook stories for component documentation

## Scope Out

- [ ] Card-level operations (create, edit, delete individual cards)
- [ ] Deck creation/editing/deletion UI (separate issue)
- [ ] Actual card review functionality (handled by separate component)
- [ ] User authentication/authorization (handled at app level)
- [ ] Real-time updates (polling/websockets)
- [ ] Import/export deck functionality
- [ ] Sharing decks between users

---

## Acceptance Criteria (ACs)

1. **AC1**: Displays all decks
   **Given** User navigates to vocabulary decks page
   **When** Component mounts
   **Then** All available decks are displayed

2. **AC2**: Shows card count per deck
   **Given** Decks exist with cards
   **When** Deck is displayed
   **Then** Each deck shows the number of cards it contains

3. **AC3**: Shows progress indicators
   **Given** User has reviewed some cards in a deck
   **When** Deck is displayed
   **Then** Progress indicator shows percentage/completion status

4. **AC4**: Filtering works
   **Given** Decks have tags assigned
   **When** User selects a tag filter
   **Then** Only decks with that tag are displayed

5. **AC5**: Search works
   **Given** Multiple decks exist
   **When** User enters search query
   **Then** Only decks matching the search query are displayed

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Deck Model** (`models/deck.py`): SQLAlchemy model for vocabulary decks with name, description, and card relationship
- **Card Model** (`models/card.py`): SQLAlchemy model for individual vocabulary cards with spaced repetition fields
- **Vocabulary Router** (`routers/vocabulary.py`): FastAPI endpoints for deck and card CRUD operations
- **Vocabulary Schemas** (`schemas/vocabulary.py`): Pydantic schemas for DeckSummary, DeckResponse, DeckListResponse
- **LessonBrowser Component** (`frontend/src/components/LessonBrowser.tsx`): Existing component with similar functionality for grammar lessons
- **LessonSearch Component** (`frontend/src/components/LessonSearch.tsx`): Search/filter UI pattern to follow
- **LessonCard Component** (`frontend/src/components/LessonCard.tsx`): Card display pattern to follow
- **API Client Pattern** (`frontend/src/utils/api.ts`): Generic API client and grammar-specific functions
- **TypeScript Types** (`frontend/src/types/index.ts`): Existing type definitions for lessons, sessions, etc.

### New Concepts Required

- **DeckSummary Type**: TypeScript interface for deck data in frontend (matches DeckSummary schema)
- **DeckListResponse Type**: TypeScript interface for paginated deck list (matches backend response)
- **vocabularyApi Client**: API client functions for vocabulary endpoints (similar to grammarApi)
- **DeckCard Component**: React component to display individual deck information
- **DeckSearch Component**: React component for deck search, tag filter, and sort controls
- **DeckBrowser Component**: Main component that orchestrates deck browsing functionality

### Key Business Rules

- Deck data comes from GET /vocabulary/decks/ endpoint
- Card count is calculated server-side and returned in DeckSummary
- Progress should be calculated based on card review status (cards with interval > 1 are "learned")
- Tags are comma-separated strings in the backend, but frontend can handle as string arrays
- Pagination is server-side for performance (max 100 items per page)
- Search and tag filtering can be client-side for better UX (smaller dataset)

---

## Strategic Approach

### Solution Direction

1. **Extend existing patterns**: Follow the LessonBrowser implementation pattern for consistency
2. **Reuse existing infrastructure**: Use existing vocabulary router endpoints and schemas
3. **Component composition**: Create modular components (DeckCard, DeckSearch) composed into DeckBrowser
4. **Progressive enhancement**: Implement core functionality first, then add sorting and advanced features
5. **Type safety**: Add TypeScript types matching backend schemas

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Client-side vs server-side search | Server-side: More scalable, requires API changes. Client-side: Better UX for small datasets, no API changes needed | Use client-side search for initial implementation (deck counts are typically small) |
| Progress calculation | Server-side: More accurate, consistent. Client-side: Simpler, no API changes | Use client-side calculation based on card interval values (cards with interval > 1 are learned) |
| Tag filtering approach | Filter decks by card tags vs deck tags | Since decks don't have tags in the model, filter by card tags within each deck |
| Sort options | Server-side: Requires API parameter. Client-side: More flexible | Use client-side sorting for initial implementation |

### Alternatives Considered

- **Alternative 1**: Modify backend to add deck-level tags - Rejected because it would require schema changes and is out of scope for this issue
- **Alternative 2**: Server-side filtering by tag - Rejected because it would require new API parameters and backend changes
- **Alternative 3**: Use existing card tags and aggregate at deck level - **Accepted** approach for initial implementation

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Show progress (cards learned)" | How is "learned" defined? | Use SM-2 algorithm convention: cards with interval > 1 are considered learned |
| "Filter by tag" | Decks or cards have tags? | Filter by card tags aggregated at deck level (show decks that have cards with the selected tag) |
| "Sort options" | What sort options are needed? | Sort by: Name (A-Z, Z-A), Created Date (Newest, Oldest), Card Count (Most, Least), Progress (%) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty deck list | First-time users | Show empty state with message and CTA to create decks |
| Deck with no cards | Valid but unusual state | Show deck with 0 cards, 0% progress |
| No decks match filters | User applies restrictive filters | Show empty state with option to clear filters |
| Network error | API failures | Show error message with retry button |
| Loading state | Initial load or filter changes | Show loading spinner |
| Single deck | Edge case for pagination | Hide pagination controls or show "1 of 1" |
| All cards learned | 100% progress | Show full progress bar |
| No cards learned | 0% progress | Show empty progress bar |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Backend API not fully implemented | Blocked development | Verify vocabulary router endpoints exist and work correctly |
| TypeScript type mismatches | Compilation errors, runtime issues | Carefully match backend schema types |
| Performance with many decks | Slow rendering | Implement virtualization if needed (not for initial implementation) |
| Tag aggregation complexity | Performance issues | Cache aggregated tag data or compute on-demand |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Displays all decks | Yes | Use GET /vocabulary/decks/ endpoint |
| AC2 | Shows card count per deck | Yes | card_count field already in DeckSummary from backend |
| AC3 | Shows progress indicators | Yes | Calculate based on card review data |
| AC4 | Filtering works | Yes | Filter by tag at client level |
| AC5 | Search works | Yes | Client-side search on deck name and description |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Pagination for large deck collections
- Responsive design for mobile and desktop
- Loading and error states
- Accessibility (keyboard navigation, ARIA labels)
- Sort functionality (mentioned in features but not in ACs)
- 80% test coverage requirement

---

## REASONS Canvas

### Requirements
From GitHub issue #67:
- Component to browse vocabulary decks
- List all decks with card counts
- Show progress (cards learned)
- Filter by tag
- Search decks
- Sort options

Acceptance Criteria:
- Displays all decks
- Shows card count per deck
- Shows progress indicators
- Filtering works
- Search works

### Examples

**Example 1: Basic Deck Display**
- Input: User navigates to /vocabulary page
- Expected: All decks are displayed in a grid layout with name, card count, and progress

**Example 2: Search Filtering**
- Input: User types "travel" in search box
- Expected: Only decks with "travel" in name or description are shown

**Example 3: Tag Filtering**
- Input: User clicks "food" tag filter
- Expected: Only decks containing cards with "food" tag are shown

**Example 4: Progress Display**
- Input: Deck has 10 cards, 3 with interval > 1
- Expected: Deck shows "3/10 cards learned (30%)"

**Example 5: Sorting**
- Input: User selects "Most Cards" sort
- Expected: Decks are sorted by card count descending

### Architecture

Existing codebase structure:
- **Backend**: FastAPI with SQLAlchemy async, routers/ directory with RESTful endpoints
- **Frontend**: React with TypeScript, Vite, component-based architecture
- **Database**: SQLite with SQLAlchemy ORM
- **Testing**: pytest (backend), jest (frontend), Cypress (E2E)

Design patterns to follow:
- LessonBrowser.tsx pattern for main browser components
- LessonSearch.tsx pattern for search/filter controls
- LessonCard.tsx pattern for individual item display
- grammarApi in utils/api.ts pattern for API client functions
- Component composition with clear separation of concerns

Relevant files and patterns:
- `frontend/src/components/LessonBrowser.tsx`: Main browser component pattern
- `frontend/src/components/LessonSearch.tsx`: Search/filter UI pattern
- `frontend/src/components/LessonCard.tsx`: Item display pattern
- `frontend/src/utils/api.ts`: API client pattern
- `frontend/src/types/index.ts`: TypeScript type definitions
- `routers/vocabulary.py`: Backend endpoints to consume
- `schemas/vocabulary.py`: Backend data schemas

### Standards

Coding standards:
- PEP 8 for Python backend
- ESLint configuration for TypeScript frontend
- Consistent indentation (2 or 4 spaces based on file type)
- Descriptive variable and function names
- Docstrings for public functions and components

Testing standards:
- 80% minimum test coverage per module/component
- jest for frontend testing
- @testing-library/react for component testing
- MSW (Mock Service Worker) for API mocking in tests
- Cypress for E2E testing (optional for this component)

Documentation standards:
- Docstrings for all exported functions and components
- JSDoc comments for TypeScript interfaces and types
- Storybook stories for UI components
- README.md updates for new features affecting setup/usage

Code review standards:
- All PRs require approval
- Tests must pass before merge
- No sensitive data in code

### Omissions

Explicitly out of scope:
- Deck creation/editing/deletion UI
- Card-level CRUD operations
- User authentication/authorization
- Real-time updates
- Import/export functionality
- Deck sharing between users
- Mobile app (web-only for now)

### Notes

Implementation hints:
- Follow LessonBrowser.tsx as the primary reference
- Backend already has GET /vocabulary/decks/ endpoint that returns DeckSummary with card_count
- Card progress can be determined by checking if interval > 1 (SM-2 convention for learned cards)
- For tag filtering: need to fetch cards for each deck or add a new endpoint (use client-side approach with cached data)
- Consider adding a new endpoint GET /vocabulary/decks/with-cards/ if tag filtering becomes too complex

References:
- See LessonBrowser.tsx for component structure pattern
- See grammarApi in utils/api.ts for API client pattern
- See DeckSummary schema in schemas/vocabulary.py for data structure
- See models/deck.py and models/card.py for database structure

### Solutions

Reference implementations to mimic:
- **Component Pattern**: LessonBrowser.tsx (main browser), LessonSearch.tsx (filters), LessonCard.tsx (item display)
- **API Pattern**: grammarApi in utils/api.ts
- **Type Pattern**: LessonSummary, LessonListResponse in types/index.ts
- **Testing Pattern**: LessonBrowser.test.tsx, LessonSearch.test.tsx
- **Styling Pattern**: Use existing CSS classes (lessons-grid, lesson-card, etc.) or create deck-specific classes

Existing code to leverage:
- pagination helper in routers/vocabulary.py (paginate_items function)
- DeckSummary schema already includes card_count
- Backend endpoint GET /vocabulary/decks/ with pagination support

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
