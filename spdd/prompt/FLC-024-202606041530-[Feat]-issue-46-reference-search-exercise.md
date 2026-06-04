# SPDD Prompt: ReferenceSearch and Exercise Components

**GitHub Issue**: #46
**Issue Title**: 2.11+2.12: Create ReferenceSearch and Exercise components
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/46
**Artifact ID**: FLC-024-202606041530
**Created**: 2026-06-04 15:30
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: FLC-024-202606041500-[Analysis]-issue-46-reference-search-exercise.md

---

## Context

This prompt drives the implementation of GitHub issue #46: Create ReferenceSearch and Exercise components for the French Language Coach Phase 2 grammar features.

### Current Codebase State

The codebase already has significant groundwork for grammar features:

**Backend (Complete):**
- ✅ `/grammar/reference/` endpoint with search (q), category, and difficulty filtering
- ✅ `/grammar/lessons/` endpoint with topic and difficulty filtering
- ✅ GrammarReference Pydantic schema (`schemas/grammar_reference.py`)
- ✅ GrammarExercise Pydantic schema (`schemas/grammar_exercise.py`) supporting 5 types
- ✅ 50+ reference entries in `data/grammar/reference/*.json`
- ✅ 20+ exercises in `data/grammar/exercises/*.json`

**Frontend (From Issue #42):**
- ✅ LessonBrowser component with search and filtering
- ✅ LessonSearch component with search input, topic filter, difficulty filter
- ✅ LessonCard component for displaying lesson summaries
- ✅ LessonPage and LessonDetailPage pages
- ✅ grammarApi.client with listLessons() and getLesson()
- ✅ TypeScript types for Lesson, LessonSummary, etc.
- ✅ Routes for /lessons and /lessons/:lessonId

**What's Missing:**
- ❌ ReferenceSearch component for grammar reference
- ❌ Exercise component for interactive grammar practice
- ❌ API client functions for reference search and exercises
- ❌ TypeScript types for GrammarReference and Exercise
- ❌ Pages for reference search and exercises
- ❌ Routes for /reference and /exercises

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/grammar.py` | Backend grammar endpoints | `list_references()` with q, category, difficulty params |
| `schemas/grammar_reference.py` | Reference data model | GrammarReference class with all fields |
| `schemas/grammar_exercise.py` | Exercise data model | Exercise union type, 5 exercise type classes |
| `schemas/grammar.py` | Response schemas | ReferenceListResponse, ReferenceResponse |
| `frontend/src/components/LessonSearch.tsx` | Search pattern | Search input, filters, callbacks |
| `frontend/src/components/LessonBrowser.tsx` | Browser pattern | Data fetching, pagination, card display |
| `frontend/src/utils/api.ts` | API client | grammarApi object needs extension |
| `frontend/src/types/index.ts` | TypeScript types | Needs GrammarReference and Exercise types |
| `frontend/src/App.tsx` | Routes | Needs /reference and /exercises routes |
| `data/grammar/reference/*.json` | Reference data | 50+ entries to display |
| `data/grammar/exercises/*.json` | Exercise data | 20+ exercises to practice |

### Existing Patterns

1. **Component Pattern**: Functional components with TypeScript, props via interfaces, hooks for state
2. **Styling Pattern**: CSS classes with BEM-like naming (e.g., `lesson-search`, `lesson-search-input`)
3. **API Client Pattern**: Centralized functions in `utils/api.ts` that call the `api()` base function
4. **Testing Pattern**: Vitest with @testing-library/react, 80%+ coverage, test user interactions
5. **Storybook Pattern**: Stories for reusable components in `*.stories.tsx` files
6. **Pagination Pattern**: Page and perPage parameters, PaginationInfo type for metadata

---

## Goal

Implement the ReferenceSearch and Exercise components as specified in GitHub issue #46.

**Primary Objectives:**
1. Create ReferenceSearch component with real-time search and result display
2. Create Exercise component that displays questions, accepts answers, provides feedback, and scores results
3. Add supporting infrastructure (types, API client functions, pages, routes)
4. Ensure 80%+ test coverage for all new code

**Secondary Objectives:**
- Reuse existing patterns from LessonSearch and LessonBrowser
- Maintain consistency with existing codebase
- Add Storybook stories for reusable components
- Update README.md with new features

---

## Constraints

### Architecture Constraints
- Must follow existing FastAPI backend architecture
- Must follow existing React + TypeScript frontend architecture
- Must use existing component patterns (functional components, hooks)
- Must not introduce breaking changes to existing features
- Must use existing API endpoint patterns

### Code Quality Constraints
- Must maintain 80% minimum test coverage per module/component
- Must follow existing code style (PEP 8 for Python, existing TS patterns)
- Must include docstrings for public functions and components
- Must use TypeScript interfaces for all props
- Must include ARIA labels for accessibility

### Testing Constraints
- Must create unit tests for all new functions and components
- Must test user interactions (clicks, form submissions, typing)
- Must test edge cases (empty results, network errors, invalid data)
- Must use @testing-library/react for component tests
- Must mock API calls appropriately

### Acceptance Criteria (from Issue #46)

**ReferenceSearch:**
- [ ] Real-time search
- [ ] Result display

**Exercise:**
- [ ] Displays question
- [ ] Accepts answer
- [ ] Provides feedback
- [ ] Scores results

---

## Examples

### ReferenceSearch Examples

**Example 1: Basic Search**
- Input: User types "subjonctif" in search box
- Expected: Display all reference entries containing "subjonctif" in term, definition, examples, or common_pitfalls
- Output: List of ReferenceCard components showing term, definition preview, category, difficulty

**Example 2: Filtered Search**
- Input: User searches "passé" with category="Verbs" and difficulty="intermediate"
- Expected: API call to `/grammar/reference/?q=passé&category=Verbs&difficulty=intermediate`
- Output: Filtered list of reference entries matching all criteria

**Example 3: Empty Results**
- Input: User searches "nonexistent"
- Expected: API returns empty list
- Output: Display "No results found. Try a different search term." message

### Exercise Examples

**Example 1: Fill-in-the-blank**
```json
{
  "id": "fill-in-the-blank-present-tense",
  "type": "fill-in-the-blank",
  "prompt": "Je ___ français.",
  "correct_answer": "parle",
  "topic": "Verbs",
  "difficulty": "beginner",
  "hint": "Conjugate 'parler' for 'je' in present tense"
}
```
- Display: Input field for user to type answer
- User types: "parle"
- Submission: Compare to correct_answer
- Feedback: "Correct!" with green styling
- Score: Increment correct count

**Example 2: Multiple Choice**
```json
{
  "id": "multiple-choice-etre",
  "type": "multiple-choice",
  "prompt": "What is the feminine form of 'grand'?",
  "correct_answer": "grande",
  "options": ["grand", "grande", "grands", "grandes"],
  "topic": "Adjectives",
  "difficulty": "beginner"
}
```
- Display: Radio buttons for each option
- User selects: "grande"
- Submission: Check if selected option equals correct_answer
- Feedback: "Correct!" or "Incorrect. The correct answer is 'grande'."
- Score: Increment correct count if correct

**Example 3: Translation**
```json
{
  "id": "translation-j-aime",
  "type": "translation",
  "prompt": "Translate 'I love' to French",
  "correct_answer": "J'aime",
  "source_language": "en",
  "target_language": "fr",
  "topic": "Verbs",
  "difficulty": "beginner"
}
```
- Display: Input field for translation
- User types: "J'aime"
- Submission: Compare to correct_answer
- Feedback: "Correct!" or "Incorrect. The correct translation is 'J'aime'."

### Edge Cases

**ReferenceSearch:**
- Empty search query → Show all results or prompt to enter search
- Network error → Display error message with retry button
- Accented characters in search (e.g., "é") → Normalize for matching (é → e)

**Exercise:**
- Multiple correct answers (correct_answers array) → Check if answer is in array
- Case sensitivity → Normalize case for comparison (case-insensitive)
- Whitespace in answers → Trim whitespace before comparing
- Exercise type not recognized → Display error, skip exercise

---

## Deliverables

### Backend Deliverables

1. **Optional: Exercise Endpoint** (if determined needed during implementation)
   - `GET /grammar/exercises/` - List/search exercises with filtering
   - `GET /grammar/exercises/{id}` - Get specific exercise
   - File: `routers/grammar.py` (extend existing)

### Frontend Deliverables

1. **TypeScript Types** (`frontend/src/types/index.ts`)
   - `GrammarReference` interface matching backend schema
   - `Exercise` union type with discriminated union on `type` field
   - Type-specific interfaces: `FillInTheBlankExercise`, `MultipleChoiceExercise`, etc.
   - Props interfaces: `ReferenceSearchProps`, `ExerciseProps`, etc.
   - Response types: `ReferenceListResponse`, `ReferenceResponse`

2. **API Client Functions** (`frontend/src/utils/api.ts`)
   - `grammarApi.searchReferences(query, category, difficulty, page, perPage)`
   - `grammarApi.listExercises(type, topic, difficulty, page, perPage)` (if backend endpoint added)
   - `grammarApi.getExercise(exerciseId)` (if backend endpoint added)

3. **ReferenceSearch Component** (`frontend/src/components/ReferenceSearch.tsx`)
   - Search input with real-time search (debounced)
   - Category filter dropdown
   - Difficulty filter dropdown
   - Clear filters button
   - Results display (list or grid of ReferenceCard components)
   - Loading and error states
   - Pagination controls

4. **ReferenceCard Component** (`frontend/src/components/ReferenceCard.tsx`)
   - Display term, definition preview, category, difficulty
   - Click to expand for full definition, examples, common pitfalls
   - Consistent styling with LessonCard

5. **Exercise Component** (`frontend/src/components/Exercise.tsx`)
   - Wrapper component that delegates to type-specific components
   - State for user answer, score, feedback
   - Submit button handler
   - Display current score (e.g., "Score: 3/5")

6. **Exercise Type Components** (`frontend/src/components/ExerciseTypes/`)
   - `FillInTheBlankExercise.tsx` - Text input for answer
   - `MultipleChoiceExercise.tsx` - Radio buttons for options
   - `TranslationExercise.tsx` - Text input for translation
   - `ConjugationExercise.tsx` - Text input for conjugation
   - `SentenceTransformationExercise.tsx` - Text input for transformation

7. **Page Components**
   - `ReferencePage.tsx` - Page hosting ReferenceSearch
   - `ExercisePage.tsx` - Page for single exercise practice
   - `ExerciseBrowserPage.tsx` - Page listing all exercises (optional)

8. **Routes** (`frontend/src/App.tsx`)
   - `/reference` → ReferencePage
   - `/exercises` → ExerciseBrowserPage (optional)
   - `/exercises/:exerciseId` → ExercisePage

9. **Tests**
   - `ReferenceSearch.test.tsx` - 80%+ coverage
   - `ReferenceCard.test.tsx` - 80%+ coverage
   - `Exercise.test.tsx` - 80%+ coverage
   - `ExerciseTypes/*.test.tsx` - 80%+ coverage for each type
   - `ReferencePage.test.tsx` - 80%+ coverage
   - `ExercisePage.test.tsx` - 80%+ coverage

10. **Storybook Stories**
    - `ReferenceSearch.stories.tsx`
    - `ReferenceCard.stories.tsx`
    - `Exercise.stories.tsx`
    - Stories for each exercise type component

11. **CSS Styles** (`frontend/src/styles/global.css`)
    - Styles for reference search layout
    - Styles for reference card
    - Styles for exercise display
    - Styles for exercise input types

12. **README Updates**
    - Add new routes to Frontend Routes table
    - Add new features to Features list
    - Document new API endpoints if added

---

## Implementation Prompt

The following is the structured prompt to use for implementation:

```
IMPLEMENT GitHub Issue #46: Create ReferenceSearch and Exercise components

CONTEXT:
- Backend already has /grammar/reference/ endpoint with search (q), category, difficulty filters
- Backend already has GrammarReference and GrammarExercise schemas
- Data files exist: data/grammar/reference/*.json (50+ entries) and data/grammar/exercises/*.json (20+ exercises)
- Frontend has LessonSearch, LessonBrowser, LessonCard patterns to follow
- Must maintain 80%+ test coverage
- Must follow existing code patterns and architecture

GOAL:
Implement ReferenceSearch component (real-time search, result display) and Exercise component (display question, accept answer, provide feedback, score results)

CONSTRAINTS:
- Use existing /grammar/reference/ endpoint for ReferenceSearch (NO new backend needed for reference)
- Reuse LessonSearch pattern for ReferenceSearch component
- Use TypeScript discriminated unions for Exercise types
- Must follow existing component patterns (functional components, hooks, TypeScript props)
- Must include tests with 80%+ coverage for all new code
- Must include Storybook stories for reusable components
- Must update README.md with new features and routes
- NO breaking changes to existing functionality

EXAMPLES:

ReferenceSearch:
- Input: "subjonctif" → API call: /grammar/reference/?q=subjonctif → Display matching reference entries
- Input: "" (empty) → Display all reference entries or prompt to search
- Input: "xyz123" (no match) → Display "No results found" message

Exercise (Fill-in-the-blank):
- Exercise: {type: "fill-in-the-blank", prompt: "Je ___ français.", correct_answer: "parle"}
- User types: "parle" → Compare to correct_answer → Display "Correct!" → Score: 1/1
- User types: "mange" → Compare to correct_answer → Display "Incorrect. Correct answer: parle" → Score: 0/1

Exercise (Multiple Choice):
- Exercise: {type: "multiple-choice", prompt: "Feminine of 'grand'?", correct_answer: "grande", options: ["grand", "grande", "grands"]}
- User selects: "grande" → Check if in correct_answer → Display "Correct!" → Score: 1/1

EXPECTED DELIVERABLES:

1. TypeScript Types (frontend/src/types/index.ts):
   - GrammarReference interface
   - Exercise union type with discriminated union
   - ReferenceListResponse, ReferenceResponse interfaces
   - Props interfaces for all new components

2. API Client (frontend/src/utils/api.ts):
   - grammarApi.searchReferences(query, category, difficulty, page, perPage)

3. Components:
   - ReferenceSearch.tsx (main search component)
   - ReferenceCard.tsx (result display)
   - Exercise.tsx (wrapper component)
   - ExerciseTypes/FillInTheBlankExercise.tsx
   - ExerciseTypes/MultipleChoiceExercise.tsx
   - ExerciseTypes/TranslationExercise.tsx
   - ExerciseTypes/ConjugationExercise.tsx
   - ExerciseTypes/SentenceTransformationExercise.tsx

4. Pages:
   - ReferencePage.tsx
   - ExercisePage.tsx

5. Routes (frontend/src/App.tsx):
   - /reference → ReferencePage
   - /exercises/:exerciseId → ExercisePage

6. Tests:
   - ReferenceSearch.test.tsx
   - ReferenceCard.test.tsx
   - Exercise.test.tsx
   - ExerciseTypes/*.test.tsx
   - ReferencePage.test.tsx
   - ExercisePage.test.tsx
   - All with 80%+ coverage

7. Stories:
   - ReferenceSearch.stories.tsx
   - ReferenceCard.stories.tsx
   - Exercise.stories.tsx
   - ExerciseTypes/*.stories.tsx

8. CSS:
   - Add styles to frontend/src/styles/global.css

9. README.md:
   - Update with new routes
   - Update with new features

ACCEPTANCE CRITERIA:
- [ ] ReferenceSearch: real-time search works
- [ ] ReferenceSearch: results display correctly
- [ ] Exercise: displays question/prompt
- [ ] Exercise: accepts user answer
- [ ] Exercise: provides feedback on correctness
- [ ] Exercise: tracks and displays score
- [ ] All tests pass at 80%+ coverage
- [ ] No breaking changes to existing features
```

---

## Implementation Order

**Phase 1: Foundation (Do First)**
1. Create feature branch: `feature/issue-46-reference-exercise`
2. Add TypeScript types for GrammarReference and Exercise
3. Extend grammarApi client with searchReferences function

**Phase 2: ReferenceSearch**
4. Create ReferenceCard component
5. Create ReferenceSearch component
6. Create ReferencePage
7. Add /reference route to App.tsx
8. Create tests and stories for ReferenceSearch and ReferenceCard

**Phase 3: Exercise**
9. Create Exercise type components (FillInTheBlank, MultipleChoice, etc.)
10. Create Exercise wrapper component
11. Create ExercisePage
12. Add /exercises/:exerciseId route to App.tsx
13. Create tests and stories for Exercise and all type components

**Phase 4: Polish**
14. Add CSS styles
15. Update README.md
16. Run all tests, verify 80%+ coverage
17. Manual testing of all acceptance criteria

**Phase 5: Deliver**
18. Commit all changes
19. Push branch to remote
20. Create Pull Request to main

---

## Quality Gates

Before considering implementation complete:
- ✅ All 6 acceptance criteria from issue #46 are met
- ✅ All tests pass (backend and frontend)
- ✅ 80%+ test coverage for all new code
- ✅ Code follows existing patterns
- ✅ No breaking changes to existing features
- ✅ README.md updated with new features and routes
- ✅ All components have appropriate TypeScript types
- ✅ All reusable components have Storybook stories
- ✅ Proper error handling and loading states
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Responsive design (mobile and desktop)

---

*Prompt artifact complete. Next step: Begin implementation following the structured prompt above.*
