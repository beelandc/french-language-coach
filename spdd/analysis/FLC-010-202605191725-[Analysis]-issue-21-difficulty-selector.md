# SPDD Analysis: Difficulty Selector Component

**GitHub Issue**: #21
**Issue Title**: 1.5.8: Add difficulty selector component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/21
**Artifact ID**: FLC-010-202605191725
**Created**: 2026-05-19 17:25
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Create UI component to select difficulty level (beginner/intermediate/advanced) before starting a scenario.

---

## Background

The French Language Coach application currently allows users to select conversation scenarios but does not provide a way to choose the difficulty level. The backend already supports difficulty levels (beginner, intermediate, advanced) in the `SessionCreate` schema and the `scenarios.py` module has difficulty-specific system prompts for each scenario. However, the frontend does not expose this functionality to users.

The difficulty level affects how the AI tutor responds:
- **Beginner**: Simpler vocabulary, slower pace, more helpful hints
- **Intermediate**: Standard prompts (current default)
- **Advanced**: More complex vocabulary, faster pace, native idioms and expressions

This feature will allow users to tailor their practice sessions to their current proficiency level, making the learning experience more personalized and effective.

---

## Business Value

- **Personalized Learning**: Users can practice at their appropriate level
- **Progression Path**: Clear path from beginner to advanced proficiency
- **Better User Experience**: Matches user expectations with appropriate challenge level
- **Leverages Existing Backend**: Backend already supports difficulty levels; this exposes that functionality

---

## Scope In

- [ ] Create a reusable `DifficultySelector` React component
- [ ] Display three difficulty options: beginner, intermediate, advanced
- [ ] Set intermediate as the default selection
- [ ] Provide visual indication of the selected level
- [ ] Persist the selection for the session duration
- [ ] Integrate with the scenario selection flow
- [ ] Pass the selected difficulty to the session creation API
- [ ] Create Storybook stories for the component
- [ ] Create unit tests for the component (80%+ coverage)

## Scope Out

- [ ] Saving user's preferred difficulty across sessions (out of scope for this issue)
- [ ] Dynamic difficulty adjustment during a session (out of scope)
- [ ] Backend changes (already implemented)
- [ ] Changing difficulty after session starts (out of scope)

---

## Acceptance Criteria (ACs)

1. **AC1: Three difficulty options**
   **Given** The user is on the scenario selection screen
   **When** They view the difficulty selector
   **Then** They see three options: beginner, intermediate, advanced

2. **AC2: Default selection is intermediate**
   **Given** The user has not yet selected a difficulty
   **When** They view the difficulty selector
   **Then** The intermediate option is pre-selected

3. **AC3: Selection persists for session**
   **Given** The user has selected a difficulty level
   **When** They start a new scenario session
   **Then** The session is created with the selected difficulty level

4. **AC4: Visual indication of selected level**
   **Given** The user selects a difficulty level
   **When** They view the selector
   **Then** The selected level is visually highlighted/distinguished from unselected options

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Scenario**: Defined in `frontend/src/types/index.ts` with `id`, `name`, `description`
- **Session**: Has `difficulty` field (string) that can be "beginner", "intermediate", or "advanced"
- **SessionCreate schema**: Backend schema in `schemas/session.py` with optional `difficulty` field (default: "intermediate")
- **SCENARIOS**: Backend `scenarios.py` has `difficulty_levels` with beginner/intermediate/advanced system prompts
- **useSessions hook**: Frontend hook in `frontend/src/hooks/useSessions.tsx` for session management
- **sessionApi.create()**: API function that accepts `scenarioId` parameter

### New Concepts Required

- **DifficultySelector Component**: React component for selecting difficulty level
- **Difficulty type**: Type definition for difficulty levels ("beginner" | "intermediate" | "advanced")
- **Difficulty state**: Local state to track user's selection before session creation

### Key Business Rules

- **Rule 1**: Difficulty must be one of: "beginner", "intermediate", "advanced"
- **Rule 2**: Default difficulty is "intermediate" for backward compatibility
- **Rule 3**: Difficulty is set at session creation time and cannot be changed during a session
- **Rule 4**: All scenarios support all three difficulty levels

---

## Strategic Approach

### Solution Direction

1. **Create DifficultySelector Component**: Build a reusable React component that displays three difficulty options with visual styling
2. **Integrate with Scenario Selection**: Add the component to the `ScenarioSelector` or `HomePage` to allow users to select difficulty before starting a scenario
3. **Pass Difficulty to API**: Modify `sessionApi.create()` call to include the selected difficulty parameter
4. **Update useSessions Hook**: Modify `createSession` to accept and pass through the difficulty parameter
5. **Add Tests and Stories**: Create comprehensive tests and Storybook stories for the new component

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Component Placement** | Place in ScenarioSelector vs separate page | Place directly in ScenarioSelector for simplicity and better UX flow |
| **Visual Style** | Radio buttons vs custom buttons vs select dropdown | Custom styled buttons for better visual hierarchy and branding |
| **State Management** | Local state vs context/global state | Local state in component, passed to session creation function |
| **Difficulty Type** | String union type vs enum | TypeScript string union type `"beginner" | "intermediate" | "advanced"` for simplicity |

### Alternatives Considered

- **Alternative 1**: Separate difficulty selection page before scenario selection
  - Rejected because: Adds extra navigation step, less intuitive flow
- **Alternative 2**: Modal popup for difficulty selection
  - Rejected because: Less discoverable, hides important feature
- **Alternative 3**: Dropdown select instead of buttons
  - Rejected because: Buttons provide better visual feedback and are more mobile-friendly

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "before starting a scenario" | Should difficulty be selected per-scenario or globally? | Per-scenario: each session has its own difficulty, allowing users to practice different levels for different scenarios |
| "visual indication" | What type of visual indication? | Active button highlighted with different background color, border, or checkmark |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| User doesn't select difficulty | Default to intermediate for backward compatibility | Use intermediate as default |
| Invalid difficulty value | Prevents API errors | TypeScript type prevents this, but runtime validation in API |
| Mobile screen size | Ensures usability on small screens | Responsive layout with stacked or appropriately sized buttons |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing API calls | Existing sessions without difficulty parameter would fail | Difficulty is optional in backend with default value, ensure frontend maintains this |
| Inconsistent UI with existing components | Poor user experience | Follow existing styling patterns from global.css |
| Test coverage below 80% | Fails quality gate | Create comprehensive test suite including edge cases |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Three difficulty options | Yes | Will implement as three selectable options |
| AC2 | Default selection is intermediate | Yes | Set initial state to "intermediate" |
| AC3 | Selection persists for session | Yes | Pass difficulty to createSession API call |
| AC4 | Visual indication of selected level | Yes | Style selected button differently |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Component should be reusable across the application
- Component should be accessible (keyboard navigation, ARIA labels)
- Component should follow existing design system
- Session creation should work with or without explicit difficulty selection

---

## REASONS Canvas

### Requirements
- Create UI component to select difficulty level (beginner/intermediate/advanced)
- Three difficulty options must be displayed
- Default selection is intermediate
- Selection persists for session
- Visual indication of selected level
- 80% test coverage required

### Examples
- User opens app, sees scenario selector, also sees difficulty selector with intermediate pre-selected
- User clicks "advanced" button, it becomes highlighted
- User clicks a scenario, new session is created with difficulty="advanced"
- User doesn't change difficulty, session is created with difficulty="intermediate"

### Architecture
- **Frontend**: React 19 + TypeScript + Vite
- **Component Location**: `frontend/src/components/DifficultySelector.tsx`
- **Type Location**: Add `Difficulty` type to `frontend/src/types/index.ts`
- **Integration**: Modify `ScenarioSelector.tsx` to include DifficultySelector
- **API**: Modify `useSessions.tsx` createSession to accept difficulty parameter
- **Backend**: Already supports difficulty parameter (no changes needed)

### Standards
- **Coding**: TypeScript, React 19, follow existing patterns in codebase
- **Testing**: Vitest, @testing-library/react, 80%+ coverage per component
- **Styling**: CSS classes matching global.css patterns
- **Documentation**: Docstrings, Storybook stories, type definitions
- **Accessibility**: Keyboard navigation, ARIA attributes

### Omissions
- NO backend changes (already implemented)
- NO global state management (local state sufficient)
- NO persistent user preferences across sessions
- NO difficulty adjustment during active session

### Notes
- Backend already has full difficulty support in scenarios.py, schemas/session.py, and routers/sessions.py
- Frontend API client in utils/api.ts needs minor modification to pass difficulty parameter
- Existing SessionCard, ScenarioSelector patterns provide styling reference
- SessionHistory component already displays difficulty as a badge (see global.css .session-difficulty)

### Solutions
- **Reference Component**: ScenarioCard.tsx shows card styling patterns
- **Reference Hook**: useSessions.tsx shows API integration patterns
- **Reference Types**: types/index.ts shows type definition patterns
- **Reference Stories**: ScenarioCard.stories.tsx shows Storybook patterns
- **Reference Tests**: SessionHistoryItem.test.tsx shows test patterns

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
