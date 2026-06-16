# SPDD Analysis: Create Flashcard and ReviewSession Components

**GitHub Issue**: #69
**Issue Title**: 3.12+3.13: Create Flashcard and ReviewSession components
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/69
**Artifact ID**: FLC-039-202606161000-[Analysis]-issue-69-flashcard-review-session
**Created**: 2026-06-16 10:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #69:

### Description
Flashcard: Display card front/back with flip animation.
ReviewSession: Manage review of due cards.

### Flashcard Features
- Show front (French)
- Flip to show back (English + example)
- Swipe gestures
- Audio option (future)

### ReviewSession Features
- Shows due cards
- Rating buttons (Again, Hard, Good, Easy)
- Progress through session
- End of session summary

### Acceptance Criteria
- [ ] Flashcard displays correctly
- [ ] Flip animation works
- [ ] Rating buttons work
- [ ] Progress tracking
- [ ] Session summary

---

## Background

The French Language Coach application is in Phase 3, focusing on vocabulary learning through spaced repetition. Issue #69 is a critical feature that implements the core flashcard review functionality. This builds upon:

- Issue #51: Seed themed vocabulary decks (already implemented)
- Issue #55: Vocabulary router with API endpoints (already implemented)
- Issue #59: Card review model with SM-2 algorithm (already implemented)
- Issue #67: DeckBrowser component (already implemented)

The Flashcard and ReviewSession components will enable users to actually review their vocabulary cards using the spaced repetition system that's already in place in the backend.

---

## Business Value

1. **Core Feature Delivery**: Implements the primary vocabulary review functionality promised in Phase 3
2. **User Engagement**: Provides interactive learning experience with flip animations and swipe gestures
3. **Spaced Repetition**: Leverages the existing SM-2 algorithm for optimal learning efficiency
4. **Progress Tracking**: Users can see their progress through review sessions
5. **Data-Driven Learning**: Session summaries help users understand their learning patterns

---

## Scope In

### Flashcard Component
- [ ] Display card front (French text)
- [ ] Flip animation to reveal back (English + example)
- [ ] Touch/click interaction to flip card
- [ ] Swipe gesture support for mobile devices
- [ ] Visual styling consistent with existing DeckCard component
- [ ] Accessibility support (keyboard navigation, ARIA labels)

### ReviewSession Component
- [ ] Fetch and display cards due for review from backend API
- [ ] Present cards one at a time using Flashcard component
- [ ] Rating buttons: Again (rating 1), Hard (rating 2), Good (rating 3), Easy (rating 4)
- [ ] Progress tracking (X of Y cards completed)
- [ ] Session summary at end showing performance statistics
- [ ] Submit ratings to backend via existing /vocabulary/review/ endpoint
- [ ] Navigation between cards (Next button or auto-advance)

### Type Definitions
- [ ] Add necessary TypeScript types for Flashcard props
- [ ] Add necessary TypeScript types for ReviewSession props
- [ ] Extend existing vocabulary types if needed

### Styling
- [ ] CSS styles for Flashcard component
- [ ] CSS styles for ReviewSession component
- [ ] Flip animation CSS
- [ ] Rating button styling

### Tests
- [ ] Unit tests for Flashcard component
- [ ] Unit tests for ReviewSession component
- [ ] Integration tests for component interactions
- [ ] 80%+ test coverage for all new code

---

## Scope Out

- [ ] Audio playback functionality (marked as "future" in requirements)
- [ ] Voice recognition for pronunciation
- [ ] Multi-user synchronization (Phase 1.5 uses nullable user_id)
- [ ] Deck selection within ReviewSession (will use /vocabulary/due/ endpoint which returns all due cards)
- [ ] Custom session configuration (will use default due cards)
- [ ] Server-side session state management (client-side only for now)

---

## Acceptance Criteria (ACs)

### Flashcard Component

1. **AC1**: Flashcard displays correctly
   **Given** A card with front="Bonjour", back="Hello", example="Salut!"
   **When** The Flashcard component is rendered with this card data
   **Then** The front side shows "Bonjour" and no back content is visible

2. **AC2**: Flip animation works
   **Given** A Flashcard component showing front side
   **When** User clicks/taps or swipes on the card
   **Then** The card flips with smooth animation to show back side with "Hello" and "Salut!"

### ReviewSession Component

3. **AC3**: Rating buttons work
   **Given** A ReviewSession with a card displayed
   **When** User clicks "Again" button
   **Then** Rating 1 is submitted to backend and next card is shown

4. **AC4**: Progress tracking
   **Given** A ReviewSession with 5 cards
   **When** User completes 2 cards
   **Then** Progress indicator shows "2/5 cards completed"

5. **AC5**: Session summary
   **Given** A ReviewSession with 5 cards completed
   **When** User finishes all cards
   **Then** Summary shows total cards reviewed, ratings distribution, and completion message

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **DeckBrowser Component** (`frontend/src/components/DeckBrowser.tsx`): Main component for browsing vocabulary decks. Follows pattern for React components with TypeScript.

- **DeckCard Component** (`frontend/src/components/DeckCard.tsx`): Displays a single vocabulary deck with progress information. Shows styling patterns and accessibility features.

- **CardSummary Type** (`frontend/src/types/index.ts` lines 653-668): Type definition for vocabulary card data from backend.

- **DueCard Type** (`frontend/src/types/index.ts` lines 756-764): Type for cards due for review, returned by /vocabulary/due/ endpoint.

- **ReviewSubmitRequest Type** (`frontend/src/types/index.ts` lines 734-738): Request body for submitting card reviews with ease rating (1-4).

- **Vocabulary Router** (`routers/vocabulary.py`): Backend endpoints including GET /vocabulary/due/ and POST /vocabulary/review/.

- **Card Review Router** (`routers/card_review.py`): Alternative endpoint for submitting reviews with SM-2 algorithm.

- **SM-2 Algorithm** (in both routers): Spaced repetition algorithm that calculates new interval and ease factor based on user rating.

### New Concepts Required

- **Flashcard Component**: Interactive component to display a single vocabulary card with flip animation.
  - Props: card data (front, back, example, etc.), onFlip callback, flipped state
  - State: internal flipped state or controlled via props
  - Behaviors: click/tap to flip, swipe gestures, animation

- **ReviewSession Component**: Manages the review session workflow.
  - Props: deckId (optional), onComplete callback
  - State: current card index, cards array, progress, completed ratings
  - Behaviors: fetch due cards, manage session flow, submit ratings, show summary

- **Rating System**: Maps button labels to numeric ratings for backend.
  - Again = 1 (card was forgotten)
  - Hard = 2 (card was recalled with difficulty)
  - Good = 3 (card was recalled correctly)
  - Easy = 4 (card was recalled easily)

### Key Business Rules

1. **Rating Mapping**: User-friendly button labels map to specific numeric ratings for the SM-2 algorithm.
2. **Session Flow**: Cards are presented sequentially. User must provide rating before advancing.
3. **Progress Calculation**: Progress is current card index + 1 divided by total cards.
4. **Summary Statistics**: At end of session, show count of each rating given.
5. **Auto-advance**: After rating is submitted, automatically show next card or summary.

---

## Strategic Approach

### Solution Direction

1. **Create Flashcard Component First**: Start with the simpler component that has clear requirements and can be tested independently.
2. **Implement Flip Animation**: Use CSS transforms and transitions for smooth flip animation.
3. **Add Swipe Gesture Support**: Use React touch event handlers for mobile swipe detection.
4. **Create ReviewSession Component**: Build on Flashcard component, manage session state.
5. **Integrate with Backend API**: Use existing /vocabulary/due/ to fetch cards and /vocabulary/review/ to submit ratings.
6. **Add Progress Tracking**: Track current position in session and display to user.
7. **Implement Session Summary**: Show statistics when all cards are completed.
8. **Write Comprehensive Tests**: Ensure 80%+ coverage for both components.
9. **Add CSS Styling**: Style components to match existing design language.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Controlled vs Uncontrolled Flashcard** | Controlled: Parent manages state. Uncontrolled: Component manages own state. | Uncontrolled for simplicity, but provide callback for parent to track state |
| **Swipe Detection Library** | Use existing library (hammerjs, react-swipeable) vs custom implementation | Custom implementation for minimal dependencies |
| **Animation Approach** | CSS transitions vs JavaScript animations | CSS transitions for performance and simplicity |
| **Session State Management** | Local state vs context vs Redux | Local state for simplicity, can refactor later |
| **Rating Submission** | Submit immediately vs batch at end | Submit immediately for server-side tracking |
| **Empty State Handling** | What to show when no cards are due | Show "No cards due for review" message with link to decks |

### Alternatives Considered

- **Alternative 1: Use react-flip-card library** - Rejected because we want to minimize external dependencies and understand the animation implementation.
- **Alternative 2: Server-side session management** - Rejected for now, will implement client-side first and can add server-side later.
- **Alternative 3: Separate CardFront and CardBack components** - Rejected in favor of single Flashcard component with flip state.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Swipe gestures | What direction(s) should trigger flip? | Left/right swipe to flip, up/down to navigate cards |
| Audio option | When will this be implemented? | Explicitly out of scope as "future" |
| Session summary | What statistics to show? | Count of each rating, total time, cards reviewed |
| Progress tracking | Where to show progress? | Top of ReviewSession component |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No cards due for review | User has nothing to review | Show empty state with message |
| Backend API error fetching cards | Network or server issues | Show error message with retry button |
| Backend API error submitting rating | Rating not saved | Show error, allow retry or skip |
| Card has no example | Optional field missing | Don't display example section |
| Card has null/empty front or back | Invalid data | Show placeholder text |
| User skips card without rating | Incomplete data | Prevent advancement, require rating |
| Session interrupted (page refresh) | State loss | Start new session or show warning |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Animation performance on mobile | Choppy or slow animations | Use hardware-accelerated CSS properties (transform, opacity) |
| Touch event conflicts | Swipe and tap both triggering | Use event delegation and preventDefault appropriately |
| Memory leaks in event listeners | Component unmount with listeners active | Clean up event listeners in useEffect cleanup |
| API rate limiting | Too many requests to backend | Batch requests where possible, implement retry logic |
| State synchronization issues | Client and server out of sync | Use optimistic updates, show loading states |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Flashcard displays correctly | Yes | Need to implement Flashcard component |
| AC2 | Flip animation works | Yes | Need CSS animation implementation |
| AC3 | Rating buttons work | Yes | Need ReviewSession with rating submission |
| AC4 | Progress tracking | Yes | Need to track and display progress |
| AC5 | Session summary | Yes | Need end-of-session summary screen |

**AC Coverage Summary**: All 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Mobile responsiveness
- Accessibility support (keyboard navigation, screen readers)
- Error handling for API failures
- Empty state handling
- Loading states

---

## REASONS Canvas

### Requirements
From GitHub issue #69 acceptance criteria:
- Flashcard displays correctly
- Flip animation works
- Rating buttons work
- Progress tracking
- Session summary

Additional implicit requirements:
- Mobile responsiveness
- Accessibility support
- Error handling
- 80%+ test coverage

### Examples

1. **Flashcard Display**: Card with front="Le chat", back="The cat", example="J'aime le chat noir"
2. **Flip Animation**: Click on card, front fades out while rotating, back rotates in and fades in
3. **Rating Submission**: Click "Good" button, POST to /vocabulary/review/ with ease=3
4. **Progress**: "3/10 cards reviewed"
5. **Summary**: "Session complete! Reviewed 10 cards: 2 Again, 3 Hard, 4 Good, 1 Easy"

### Architecture
- Frontend: React with TypeScript, CSS modules or global CSS
- Backend: FastAPI with existing vocabulary endpoints
- State: Local component state for session management
- Styling: Global CSS with consistent design language
- Testing: jest for component tests, 80%+ coverage required

Existing patterns to follow:
- DeckBrowser.tsx: Component structure, hooks usage, TypeScript types
- DeckCard.tsx: Styling patterns, accessibility features
- types/index.ts: Type definitions and organization
- global.css: Styling conventions

### Standards
- **Coding**: PEP 8 equivalent for TypeScript, consistent with existing codebase
- **Testing**: 80% minimum coverage per component, jest testing library
- **Documentation**: Docstrings for components, comments for complex logic
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Code Review**: All PRs require approval, tests must pass

### Omissions
Explicitly out of scope:
- Audio playback functionality
- Voice recognition
- Multi-user synchronization
- Custom session configuration
- Server-side session state management
- Deck selection within ReviewSession (uses all due cards)

### Notes
- Use existing /vocabulary/due/ endpoint to fetch cards due for review
- Use existing /vocabulary/review/ endpoint to submit ratings (ease 1-4)
- SM-2 algorithm already implemented in backend
- Follow DeckCard styling patterns for consistency
- CardSummary type already defined in types/index.ts
- DueCard type already defined for due cards response
- See DeckBrowser.tsx for API usage patterns with vocabularyApi

### Solutions
Reference implementations:
- DeckCard.tsx: Component structure and styling
- DeckBrowser.tsx: API integration patterns
- LessonViewer.tsx: Component with similar "viewer" functionality
- ChatInterface.tsx: Component with user interaction handling
- global.css: Existing styling patterns

Patterns to follow:
1. Component props with TypeScript interfaces
2. useState, useEffect, useCallback hooks for state management
3. Error and loading state handling
4. Test IDs for testing (data-testid attributes)
5. Accessibility features (role, aria-label, tabIndex, keyboard handlers)

---

## Files to Create/Modify

### New Files
1. `frontend/src/components/Flashcard.tsx` - Flashcard component
2. `frontend/src/components/Flashcard.test.tsx` - Flashcard tests
3. `frontend/src/components/Flashcard.stories.tsx` - Flashcard Storybook stories (optional but recommended)
4. `frontend/src/components/ReviewSession.tsx` - ReviewSession component
5. `frontend/src/components/ReviewSession.test.tsx` - ReviewSession tests
6. Add Flashcard and ReviewSession styles to `frontend/src/styles/global.css`

### Modified Files
1. `frontend/src/types/index.ts` - Add new TypeScript types if needed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
