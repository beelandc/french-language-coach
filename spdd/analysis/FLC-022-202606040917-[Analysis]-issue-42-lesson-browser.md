# SPDD Analysis: Create LessonBrowser React Component

**GitHub Issue**: #42
**Issue Title**: 2.9: Create LessonBrowser React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/42
**Artifact ID**: FLC-022-202606040917
**Created**: 2026-06-04 09:17
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #42:

### Description
Component to browse and filter grammar lessons.

### Features
- Grid or list view
- Filter by topic
- Filter by difficulty
- Search functionality
- Pagination

### Acceptance Criteria
- [ ] Displays all lessons
- [ ] Filtering works
- [ ] Search works
- [ ] Clicking lesson navigates to viewer
- [ ] Responsive design

---

## Background

The French Language Coach application is in Phase 2, which includes adding grammar lessons functionality. The backend already has:
- Grammar lesson data stored in JSON files under `data/grammar_lessons/`
- A grammar router (`routers/grammar.py`) with endpoints:
  - GET `/grammar/lessons/` - List all lessons with filtering and pagination
  - GET `/grammar/lessons/{id}` - Get a specific lesson by ID
- Pydantic schemas for lesson validation (`schemas/grammar_lesson.py`)

The frontend needs a way for users to browse, search, filter, and access these lessons.

---

## Business Value

- Enables users to access educational content (20+ grammar lessons)
- Supports self-directed learning by allowing filtering by topic and difficulty
- Provides search functionality for quick lookup
- Improves user engagement with Phase 2 features
- Responsive design ensures accessibility on all devices

---

## Scope In

- Create `LessonBrowser` React component
- Create supporting components: `LessonCard`, `LessonSearch`
- Add grammar API client functions to `api.ts`
- Add TypeScript types for lessons
- Create `LessonPage` for routing
- Add route `/lessons` in App.tsx
- Create `LessonDetail` page/component for viewing individual lessons
- Add route `/lessons/:lessonId` in App.tsx
- Add Storybook stories for new components
- Add tests for new components (80%+ coverage)

## Scope Out

- Backend API changes (already implemented in routers/grammar.py)
- Lesson data creation (already exists in data/grammar_lessons/)
- Authentication/authorization for lessons
- User progress tracking (covered by issue #38, already implemented)
- Exercises or interactive practice (future issue)
- Lesson editing/management (admin feature, future)

---

## Acceptance Criteria (ACs)

1. **AC-1: Displays all lessons**
   - **Given** User navigates to lessons page
   - **When** Page loads
   - **Then** All grammar lessons are displayed

2. **AC-2: Filtering works**
   - **Given** Lessons are displayed
   - **When** User filters by topic
   - **Then** Only lessons matching that topic are shown
   - **When** User filters by difficulty
   - **Then** Only lessons matching that difficulty are shown
   - **When** User applies multiple filters
   - **Then** Only lessons matching ALL filters are shown

3. **AC-3: Search works**
   - **Given** Lessons are displayed
   - **When** User enters search query
   - **Then** Only lessons matching the search query (in title or topic) are shown

4. **AC-4: Clicking lesson navigates to viewer**
   - **Given** Lessons are displayed
   - **When** User clicks on a lesson
   - **Then** User is navigated to lesson detail/viewer page

5. **AC-5: Responsive design**
   - **Given** User views lessons page on mobile
   - **Then** Layout adapts to small screen
   - **Given** User views lessons page on desktop
   - **Then** Layout uses available space efficiently

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarLesson**: Pydantic model in `schemas/grammar_lesson.py` with fields: id, title, topic, difficulty, sections
- **GrammarRouter**: FastAPI router in `routers/grammar.py` with lesson listing endpoint
- **DifficultyLevel**: Enum in `schemas/grammar_lesson.py` with values: beginner, intermediate, advanced
- **LessonListResponse**: Pydantic model with lessons array and pagination info
- **LessonSummary**: Pydantic model with id, title, topic, difficulty
- **PaginationInfo**: Model with total, page, per_page, total_pages
- **API Client**: `api.ts` in frontend with generic request handling
- **TypeScript Types**: `frontend/src/types/index.ts` with existing type definitions
- **Component Patterns**: Existing components in `frontend/src/components/` follow React + TypeScript pattern
- **Page Patterns**: Pages in `frontend/src/pages/` handle routing and use components
- **React Router**: Used in App.tsx for navigation

### New Concepts Required

- **Lesson**: TypeScript type for lesson data (id, title, topic, difficulty, sections)
- **LessonSummary**: TypeScript type for lesson summary in listings
- **LessonBrowser**: Component for browsing, filtering, and searching lessons
- **LessonCard**: Component for displaying a single lesson in the browser
- **LessonSearch**: Component for search and filter controls
- **LessonDetail**: Component/page for viewing full lesson content
- **Grammar API**: Client functions for lesson-related endpoints

### Key Business Rules

- Lessons are loaded from backend API endpoint `/grammar/lessons/`
- Filtering uses AND logic (all filters must match)
- Pagination is handled by backend (page, per_page parameters)
- Search should be case-insensitive substring matching on title and topic
- Difficulty filter uses exact match on enum values
- Topic filter uses case-insensitive substring matching
- Clicking a lesson navigates to `/lessons/:lessonId`
- Responsive design should work on mobile and desktop

---

## Strategic Approach

### Solution Direction

1. **Add TypeScript types** for lesson data structures in `frontend/src/types/index.ts`
2. **Extend API client** in `frontend/src/utils/api.ts` with grammar lesson functions
3. **Create reusable components**:
   - `LessonCard` - Displays a single lesson (title, topic, difficulty, preview)
   - `LessonSearch` - Search input and filter controls (topic, difficulty)
   - `LessonBrowser` - Main component combining search, filters, and lesson grid
4. **Create pages**:
   - `LessonPage` - Container page for LessonBrowser
   - `LessonDetailPage` - Page for viewing individual lesson content
5. **Add routing** in App.tsx for `/lessons` and `/lessons/:lessonId`
6. **Add tests** for all new components (80%+ coverage)
7. **Add Storybook stories** for new components

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Grid vs List view | Grid: Better visual browsing, List: Better for many items, easier to scan | Implement grid view first (matches ScenarioSelector pattern), can add toggle later |
| Client-side vs Server-side filtering | Client: Faster, all data loaded, Server: Less data transfer, more scalable | Use server-side filtering (backend already supports it) |
| Pagination strategy | Client: Simpler, Server: More scalable | Use server-side pagination (backend already implements it) |
| Search implementation | Client: Full control, Server: Consistent with backend | Use server-side search (backend filters support topic/difficulty) - for full-text search, may need client-side |
| Lesson detail display | Modal vs New page | Use new page (`/lessons/:id`) for better URL sharing and navigation |

### Alternatives Considered

- **Single LessonBrowser component vs Multiple components**: Could build everything in one component, but separating concerns (LessonCard, LessonSearch) improves maintainability and testability. **Decision**: Use multiple components.
- **Custom pagination vs use existing**: Could implement custom pagination, but backend already provides it. **Decision**: Use backend pagination.
- **Full-text search scope**: Could search only title, or title+topic, or include content. **Decision**: Search title and topic for AC-3.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Grid or list view" | Should we implement both with a toggle, or just one? | Implement grid view first (matches existing ScenarioSelector), can add toggle as enhancement |
| "Search functionality" | What fields should search cover? Title only? Topic? Both? Content? | Search title and topic to meet AC-3 |
| "Clicking lesson navigates to viewer" | What does the viewer look like? Full lesson content? | Create LessonDetailPage showing full lesson with sections and examples |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No lessons exist | Empty state for new installations | Show "No lessons found" message |
| No lessons match filters | User applies filters with no results | Show "No lessons match your filters" message |
| Network error loading lessons | API call fails | Show error message with retry button |
| Invalid lesson ID | User navigates to `/lessons/nonexistent` | Show 404 or "Lesson not found" message |
| Empty search query | User clears search | Show all lessons (or all matching current filters) |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Backend API changes | If grammar router changes, frontend breaks | Use types that match backend response models |
| TypeScript type mismatches | Frontend and backend types don't align | Match TypeScript types to Pydantic models |
| Performance with many lessons | Slow loading if many lessons | Use pagination from backend (already implemented) |
| Responsive design issues | Layout breaks on mobile | Test on multiple screen sizes, use CSS media queries |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | Displays all lessons | Yes | Use `/grammar/lessons/` endpoint with default pagination |
| AC-2 | Filtering works | Yes | Use topic and difficulty query parameters |
| AC-3 | Search works | Yes | Implement search input, filter client-side or add to backend |
| AC-4 | Clicking lesson navigates to viewer | Yes | Add route and navigation |
| AC-5 | Responsive design | Yes | Use CSS Grid/Flexbox with media queries |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Loading states while fetching lessons
- Error handling for API failures
- Empty state handling
- Accessibility (keyboard navigation, ARIA labels)

---

## REASONS Canvas

### Requirements
From GitHub issue #42 acceptance criteria:
- Displays all lessons
- Filtering works (by topic, by difficulty)
- Search works
- Clicking lesson navigates to viewer
- Responsive design

### Examples
1. User navigates to /lessons, sees grid of all lessons
2. User selects "beginner" difficulty, sees only beginner lessons
3. User searches for "verb", sees lessons with "verb" in title or topic
4. User clicks on a lesson, navigates to /lessons/verb-conjugation
5. User views page on mobile, sees responsive layout

### Architecture
- **Backend**: FastAPI router at `/grammar/lessons/` with filtering and pagination
- **Frontend**: React + TypeScript components in `frontend/src/components/`
- **Patterns**: Follow existing component patterns (ScenarioSelector, SessionHistory)
- **State Management**: Use React hooks (useState, useEffect) for local state
- **Navigation**: React Router v6 for page routing
- **Styling**: CSS modules or global.css (match existing patterns)

### Standards
- **Coding**: TypeScript, React 19, functional components with hooks
- **Testing**: Jest + @testing-library/react, 80%+ coverage
- **Styling**: Match existing style.css patterns
- **Documentation**: JSDoc comments for functions, Storybook stories
- **Accessibility**: ARIA labels, keyboard navigation

### Omissions
- No authentication/authorization
- No lesson editing/creation
- No user progress integration (yet)
- No interactive exercises
- No voice/speech features

### Notes
- Backend grammar router already implements filtering and pagination
- Grammar lesson data exists in `data/grammar_lessons/*.json`
- Existing patterns: ScenarioSelector for grid layout, SessionHistory for pagination
- TypeScript types should match backend Pydantic models
- Use existing api.ts pattern for API calls

### Solutions
- **Reference for grid layout**: ScenarioSelector.tsx (existing component)
- **Reference for pagination**: Backend already implements it in routers/grammar.py
- **Reference for filtering**: Backend filter_lessons function supports topic and difficulty
- **Reference for API client**: api.ts has generic request handler
- **Reference for types**: types/index.ts has existing type definitions

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
