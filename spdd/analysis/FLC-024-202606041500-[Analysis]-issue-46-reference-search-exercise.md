# SPDD Analysis: ReferenceSearch and Exercise Components

**GitHub Issue**: #46
**Issue Title**: 2.11+2.12: Create ReferenceSearch and Exercise components
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/46
**Artifact ID**: FLC-024-202606041500
**Created**: 2026-06-04 15:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #46:

> ReferenceSearch: Searchable grammar reference guide.
> Exercise: Interactive grammar exercises.

## Acceptance Criteria

- [ ] ReferenceSearch: real-time search
- [ ] ReferenceSearch: result display
- [ ] Exercise: displays question
- [ ] Exercise: accepts answer
- [ ] Exercise: provides feedback
- [ ] Exercise: scores results

---

## Background

This issue is part of Phase 2 of the French Language Coach project, which aims to add grammar learning features to the application. Phase 2 expands beyond the core conversation practice to include grammar reference materials and interactive exercises.

The ReferenceSearch component will provide users with a searchable interface to quickly look up grammar terms and concepts, while the Exercise component will allow users to practice their grammar skills interactively.

## Business Value

- **Enhanced Learning Experience**: Users can now look up grammar concepts they encounter during conversations and practice them interactively
- **Comprehensive Grammar Coverage**: Combines reference materials (50+ entries) with practical exercises (20+ exercises)
- **Interactive Learning**: Exercises provide immediate feedback and scoring, reinforcing learning
- **Searchable Knowledge Base**: Quick access to grammar definitions, examples, and common pitfalls

---

## Scope In

### ReferenceSearch Component
- Real-time search functionality for grammar reference entries
- Display of search results with term, definition, category, and difficulty
- Filtering by category and difficulty level
- Responsive design for mobile and desktop

### Exercise Component
- Display interactive grammar questions
- Accept user answers
- Validate answers against correct responses
- Provide immediate feedback on correctness
- Track and display scores
- Support multiple exercise types (fill-in-the-blank, multiple-choice, translation, conjugation, sentence transformation)

### Supporting Infrastructure
- TypeScript type definitions for Exercise and Reference data
- API client functions for fetching reference entries and exercises
- React Router routes for accessing reference search and exercises
- Pages to host the components

---

## Scope Out

- User authentication (not in scope for Phase 1.5-2)
- Progress tracking for exercises (this is covered by issue #38: grammar progress)
- Multi-user support
- Database persistence for exercise results (beyond current scope)
- Advanced analytics on exercise performance
- Social features (sharing results, leaderboards)
- Voice input for exercises

---

## Acceptance Criteria (ACs)

### ReferenceSearch Component

1. **AC-46-1**: ReferenceSearch performs real-time search
   **Given** A user types a search query
   **When** The query is submitted or typed
   **Then** Results matching the query are displayed in real-time

2. **AC-46-2**: ReferenceSearch displays results
   **Given** Search results are available
   **When** The user views the ReferenceSearch page
   **Then** Results are displayed showing term, definition, category, and difficulty

### Exercise Component

3. **AC-46-3**: Exercise displays question
   **Given** An exercise is loaded
   **When** The user views the Exercise component
   **Then** The exercise question/prompt is displayed

4. **AC-46-4**: Exercise accepts answer
   **Given** An exercise is displayed
   **When** The user provides an answer
   **Then** The answer is accepted and stored

5. **AC-46-5**: Exercise provides feedback
   **Given** A user submits an answer
   **When** The answer is validated
   **Then** The user receives feedback on whether the answer is correct

6. **AC-46-6**: Exercise scores results
   **Given** A user completes exercises
   **When** The session ends or results are requested
   **Then** The user's score is calculated and displayed

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarReference Schema** (`schemas/grammar_reference.py`): Pydantic model for reference entries with fields: id, term, category, difficulty, definition, examples, common_pitfalls, related_terms
- **GrammarExercise Schema** (`schemas/grammar_exercise.py`): Pydantic model for exercises with support for 5 types: fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation
- **Grammar Router** (`routers/grammar.py`): Backend endpoints for `/grammar/lessons/` and `/grammar/reference/` with filtering and pagination
- **LessonBrowser Component** (`frontend/src/components/LessonBrowser.tsx`): Grid/list view for browsing grammar lessons with search and filtering
- **LessonSearch Component** (`frontend/src/components/LessonSearch.tsx`): Search and filter controls that can be reused as pattern
- **grammarApi Client** (`frontend/src/utils/api.ts`): API client with functions for lessons, needs extension for reference and exercises
- **Reference Data Files** (`data/grammar/reference/*.json`): 50+ JSON files with grammar reference entries
- **Exercise Data Files** (`data/grammar/exercises/*.json`): 20+ JSON files with interactive exercises

### New Concepts Required

- **ReferenceSearch Component**: Frontend component for searching and displaying grammar reference entries
- **Exercise Component**: Frontend component for displaying and interacting with grammar exercises
- **ReferenceSearchPage**: Page component to host the ReferenceSearch component
- **ExercisePage**: Page component to host the Exercise component (may need multiple pages for different modes)
- **Exercise Types**: TypeScript definitions for the different exercise types
- **API Endpoint for Exercises** (optional): Backend endpoint to list/search exercises if needed

### Key Business Rules

- Search must be case-insensitive
- Search must match on multiple fields: term, definition, examples, common_pitfalls for reference entries
- Exercises must support multiple types with different UI requirements
- Feedback must be immediate after answer submission
- Scoring must be accurate based on correct answers

---

## Strategic Approach

### Solution Direction

1. **Leverage Existing Backend**: The `/grammar/reference/` endpoint already supports search via the `q` query parameter with case-insensitive partial matching. No new backend work is needed for ReferenceSearch.

2. **Extend API Client**: Add functions to the `grammarApi` client for:
   - `searchReferences(query, category, difficulty, page, perPage)`
   - `listExercises(type, topic, difficulty, page, perPage)` (if needed)
   - `getExercise(exerciseId)` (if needed)

3. **Create TypeScript Types**: Add TypeScript interfaces for:
   - `GrammarReference` (matches backend GrammarReference schema)
   - `Exercise` (union type for different exercise types)
   - Props for ReferenceSearch and Exercise components

4. **Build ReferenceSearch Component**: Create a component that:
   - Has a search input field
   - Displays results in a list/card format
   - Shows term, definition, category, difficulty for each result
   - Supports filtering by category and difficulty

5. **Build Exercise Component**: Create a component that:
   - Displays the exercise prompt
   - Renders appropriate input based on exercise type (text input, radio buttons, etc.)
   - Validates answers on submission
   - Shows feedback (correct/incorrect)
   - Tracks score across multiple exercises

6. **Add Routes**: Update `App.tsx` to include routes for:
   - `/reference` - ReferenceSearch page
   - `/exercises` - Exercise browser/list
   - `/exercises/:exerciseId` - Individual exercise

7. **Create Tests**: Comprehensive tests for all new components with 80%+ coverage

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Reuse LessonSearch pattern** | Pros: Consistency with existing code, faster development. Cons: May need adjustments for reference-specific features | ✅ Reuse and adapt LessonSearch component as ReferenceSearch pattern |
| **Single Exercise component vs. type-specific components** | Pros: Single component is simpler. Cons: Harder to handle different UI for each exercise type | ✅ Create a wrapper Exercise component that delegates to type-specific subcomponents |
| **Backend endpoint for exercises** | Pros: Centralized data management. Cons: Adds backend complexity, data is already in static JSON files | ⚠️ Defer backend endpoint for exercises; load from JSON files directly or add endpoint only if needed for filtering |
| **Client-side vs server-side exercise loading** | Pros: Client-side is simpler for static data. Cons: Server-side provides better abstraction | ✅ Client-side loading from static files for MVP, add backend endpoint later if filtering needs arise |

### Alternatives Considered

- **Alternative 1: Server-side rendering for ReferenceSearch** - Rejected because the existing pattern uses client-side rendering with React, and reference data is static
- **Alternative 2: Separate pages for each exercise type** - Rejected because it would create too much duplication; a polymorphic component is more maintainable
- **Alternative 3: Store exercises in database** - Rejected for Phase 2; static JSON files are sufficient and simpler

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Exercise selection mechanism | How do users select which exercises to do? | Implement a browser page listing all exercises with filtering |
| Exercise session length | How many exercises in a session? | Allow users to choose or do one at a time |
| Score persistence | Should scores be saved across sessions? | For MVP, display score for current session only; persist to database in future phase |
| ReferenceSearch page location | Where should ReferenceSearch be accessible from? | Add to navigation menu and link from lessons |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty search results | User searches for something that doesn't exist | Display "No results found" message with helpful suggestions |
| Invalid exercise type | Exercise data has unknown type | Display error message and skip exercise |
| Multiple correct answers | Exercise accepts multiple valid answers | Check if answer is in correct_answers list |
| Network error during data load | Can't load reference/exercise data | Display error message with retry option |
| Mobile viewport | Users on small screens | Responsive design that adapts to screen size |
| Special characters in search | Users search with French accents | Normalize accents in search (é → e) for better matching |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| TypeScript type mismatches | Compile errors, runtime issues | Use exact type definitions matching backend schemas |
| Exercise type union complexity | Hard to handle all types correctly | Create type guards and use discriminated unions |
| Performance with many results | Slow rendering with 50+ reference entries | Implement pagination and virtualization if needed |
| Cross-browser compatibility | Different browser behaviors | Use standard React patterns, test in multiple browsers |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-46-1 | ReferenceSearch: real-time search | ✅ Yes | Will use existing /grammar/reference/ endpoint with `q` parameter |
| AC-46-2 | ReferenceSearch: result display | ✅ Yes | Display results in card/list format |
| AC-46-3 | Exercise: displays question | ✅ Yes | Show exercise prompt in appropriate format |
| AC-46-4 | Exercise: accepts answer | ✅ Yes | Input field matching exercise type |
| AC-46-5 | Exercise: provides feedback | ✅ Yes | Compare answer to correct_answer/correct_answers |
| AC-46-6 | Exercise: scores results | ✅ Yes | Track correct/incorrect count |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Responsive design for mobile and desktop
- Error handling for network issues and invalid data
- Accessibility (keyboard navigation, ARIA labels)
- Type safety with TypeScript
- 80%+ test coverage

---

## REASONS Canvas

### Requirements
From GitHub issue #46 acceptance criteria:
- ReferenceSearch: real-time search capability
- ReferenceSearch: result display functionality
- Exercise: display questions to users
- Exercise: accept user answers
- Exercise: provide feedback on answers
- Exercise: calculate and display scores

### Examples

**ReferenceSearch Examples:**
1. User types "subjonctif" → Results show all reference entries containing "subjonctif" in term, definition, or examples
2. User filters by category "Verbs" → Results show only verb-related reference entries
3. User searches "passé" with difficulty "intermediate" → Results show intermediate-level entries about past tenses

**Exercise Examples:**
1. Fill-in-the-blank: "Je ___ français" → User types "parle" → Correct! Score: 1/1
2. Multiple choice: "What is the feminine form of 'grand'?" with options → User selects "grande" → Correct! Score: 1/1
3. Translation: "I love" → User types "Je t'aime" → Correct! Score: 1/1
4. Conjugation: "Conjugate 'parler' for 'nous' in present tense" → User types "parlons" → Correct! Score: 1/1

### Architecture

**Existing patterns to follow:**
- Backend: FastAPI routers with dependency injection, SQLAlchemy async
- Frontend: React 19 + TypeScript + Vite, functional components with hooks
- Styling: CSS with consistent class naming (see global.css)
- Testing: pytest (backend), Vitest (frontend), 80%+ coverage
- Component organization: components/ for reusable UI, pages/ for route components
- API client: Centralized in utils/api.ts with type-safe functions

**Component structure:**
```
frontend/src/
├── components/
│   ├── ReferenceSearch/
│   │   ├── ReferenceSearch.tsx (main component)
│   │   ├── ReferenceSearch.test.tsx
│   │   └── ReferenceSearch.stories.tsx
│   ├── Exercise/
│   │   ├── Exercise.tsx (wrapper component)
│   │   ├── ExerciseTypes/
│   │   │   ├── FillInTheBlankExercise.tsx
│   │   │   ├── MultipleChoiceExercise.tsx
│   │   │   ├── TranslationExercise.tsx
│   │   │   ├── ConjugationExercise.tsx
│   │   │   └── SentenceTransformationExercise.tsx
│   │   ├── Exercise.test.tsx
│   │   └── Exercise.stories.tsx
├── pages/
│   ├── ReferencePage.tsx
│   └── ExercisePage.tsx
├── types/
│   └── index.ts (add Reference and Exercise types)
└── utils/
    └── api.ts (add reference and exercise API functions)
```

### Standards

**Coding Standards:**
- Follow existing codebase patterns (PEP 8 for Python, consistent with existing React/TS code)
- Use TypeScript interfaces for all props and API types
- Include docstrings for public functions
- Use semantic HTML and ARIA labels for accessibility
- Follow existing component naming conventions (PascalCase for components, camelCase for props)

**Testing Standards:**
- 80% minimum coverage per component
- Test user interactions (clicks, form submissions)
- Test edge cases (empty results, network errors)
- Use @testing-library/react for component tests
- Mock API calls with MSW or jest.mock

**Documentation Standards:**
- Update README.md with new routes and features
- Include Storybook stories for reusable components
- Add inline comments for complex logic

### Omissions

Explicitly out of scope:
- User authentication and multi-user support
- Database persistence for exercise progress
- Advanced analytics and reporting
- Social features (sharing, leaderboards)
- Voice input/output
- Mobile app (web-only for now)
- Offline functionality

### Notes

**Implementation hints:**
- Reuse LessonSearch component pattern for ReferenceSearch
- Use discriminated unions in TypeScript for Exercise types
- Load reference and exercise data from static JSON files initially
- Consider adding backend endpoint for exercises if filtering by type/topic is needed
- Reference existing GrammarLesson and GrammarReference schemas for type definitions
- Use existing pagination patterns from SessionHistory and LessonBrowser

**References to similar code:**
- `frontend/src/components/LessonSearch.tsx` - Search/filter pattern
- `frontend/src/components/LessonBrowser.tsx` - Data listing and pagination
- `frontend/src/pages/LessonPage.tsx` - Page structure for listing
- `frontend/src/pages/LessonDetailPage.tsx` - Page structure for detail view
- `routers/grammar.py` - Backend reference endpoint pattern
- `schemas/grammar_reference.py` - Reference data structure
- `schemas/grammar_exercise.py` - Exercise data structure

### Solutions

**Reference implementations to mimic:**
- LessonBrowser/LessonSearch for search and filter pattern
- ChatInterface for interactive input/output pattern
- FeedbackView for score display pattern
- SessionDetailPage for data fetching and display

**Patterns to follow:**
- Use React hooks (useState, useEffect, useCallback) for state management
- Use custom hooks for API data fetching if needed
- Follow existing styling in global.css
- Use type guards for discriminated union types
- Implement proper error boundaries and loading states

---

*Analysis complete. Next step: Create prompt artifact (FLC-024-202606041530-[Prompt]-issue-46-reference-search-exercise.md)*
