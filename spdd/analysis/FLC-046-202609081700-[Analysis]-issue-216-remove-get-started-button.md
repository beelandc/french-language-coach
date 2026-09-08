# SPDD Analysis: Remove "Get Started" Button from IndexPage

**GitHub Issue**: #216
**Issue Title**: Remove "Get Started" button from IndexPage
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/216
**Artifact ID**: FLC-046-202609081700
**Created**: 2026-09-08 17:00
**Author**: Mistral Vibe AI Assistant

---

## Original Business Requirement

The index page (`IndexPage.tsx`) currently has a "Get Started" button in the hero section that links directly to the Conversation Practice page (`/scenarios`). This button is technical debt from when the French Language Coach app was exclusively focused on Conversation Practice. Now that the index page serves as a central navigation hub showcasing all app features, this button is redundant with the "Conversation Practice" feature card and should be removed.

### Current State
- A "Get Started" button exists in the hero section of `frontend/src/pages/IndexPage.tsx` (lines 78-85)
- It is rendered with `className="hero-cta btn-primary"`, `data-testid="hero-cta"`, and `aria-label="Get started with French Language Coach"`
- Clicking it calls `handleGetStarted`, which navigates to `/scenarios`
- The `handleGetStarted` callback is defined at lines 67-70 and uses `useNavigate`
- This navigation duplicates the "Conversation Practice" feature card's `Browse Scenarios →` CTA, which already routes to `/scenarios`
- Tests in `IndexPage.test.tsx` reference the button: "renders Get Started button" (line 30), "navigates to /scenarios when Get Started button is clicked" (line 80), and "Get Started button has correct aria-label" (line 134)
- The README (line 23) mentions clicking "Get Started" as a way to start Conversation Practice

### Desired State
- Remove the "Get Started" button from the hero section of `IndexPage.tsx`
- Remove the now-unused `handleGetStarted` callback
- Keep `useNavigate`/`navigate`/`handleFeatureClick` intact, since the feature cards still navigate
- Update tests in `IndexPage.test.tsx` to remove the button-specific cases
- Update the README to remove the "Get Started" reference

### Technical Details
- `useCallback` is used for both `handleFeatureClick` (still needed) and `handleGetStarted` (to be removed); keep `useCallback` since `handleFeatureClick` still uses it
- `useNavigate` and `navigate` remain in use by `handleFeatureClick`, so do not remove them
- The `.hero-cta` CSS class (defined in `frontend/src/styles/global.css`) will become unused after removal and should be cleaned up

---

## Background

The French Language Coach app has grown from a single-purpose Conversation Practice tool into a multi-feature language learning platform (lessons, reference, exercises, vocabulary). The landing page (`IndexPage`) was refactored into a central navigation hub showcasing all features via feature cards. The "Get Started" hero CTA button is a leftover from the earlier single-feature era; it duplicates the "Conversation Practice" feature card's navigation to `/scenarios` and adds visual redundancy to the hero section. Removing it simplifies the hero to a title + description and leaves feature discovery to the cards grid.

---

## Business Value

- **Reduced Redundancy**: Eliminates a duplicate navigation path to `/scenarios` (the "Conversation Practice" feature card already provides this)
- **Cleaner Hero Section**: The hero becomes a pure intro (title + description) rather than mixing intro with a single-feature CTA
- **Consistent Information Architecture**: All feature navigation lives in the feature cards grid, not split between hero and cards
- **Reduced Maintenance Surface**: Fewer test cases, CSS rules, and callbacks to maintain

---

## Scope In

- [ ] Remove the "Get Started" `<button>` element from the hero section in `IndexPage.tsx` (lines 78-85)
- [ ] Remove the now-unused `handleGetStarted` callback from `IndexPage.tsx` (lines 67-70)
- [ ] Keep `useNavigate`, `navigate`, `handleFeatureClick`, and `useCallback` intact (feature cards still navigate)
- [ ] Remove the three "Get Started"-specific tests from `IndexPage.test.tsx` (rendering, navigation, aria-label)
- [ ] Remove the now-unused `.hero-cta` and `.hero-cta:hover` rules from `global.css`, plus the `.hero-cta` rule in the `@media (max-width: 768px)` block
- [ ] Update README.md line 23 to remove the "Get Started" reference

## Scope Out

- [ ] Removing or restyling the hero section title/description (only the button is removed)
- [ ] Modifying the feature cards or their navigation
- [ ] Adding a replacement CTA in the hero
- [ ] Backend changes
- [ ] Modifying vitest/jest test-runner configuration (pre-existing gap; `.test.tsx` files are not matched by either runner's default config)
- [ ] E2E test changes (no Cypress spec references `hero-cta` in scope of this change)

---

## Acceptance Criteria (ACs)

1. **AC1 - Button removed**: "Get Started" button is removed from the IndexPage hero section
   **Given** The IndexPage component
   **When** It renders
   **Then** No element with `data-testid="hero-cta"`, `className="hero-cta"`, or text "Get Started" is present

2. **AC2 - handleGetStarted removed**: `handleGetStarted` callback and any imports it solely relied on are removed
   **Given** The IndexPage source
   **When** Inspected
   **Then** `handleGetStarted` is gone, but `useNavigate`/`navigate`/`handleFeatureClick` remain (feature cards still navigate)

3. **AC3 - Feature card navigation intact**: `useNavigate`/`navigate`/`handleFeatureClick` remain intact (feature cards still navigate)
   **Given** The IndexPage component
   **When** A feature card is clicked
   **Then** `navigate(path)` is called with the card's path (unchanged behavior)

4. **AC4 - Tests updated and pass**: Tests in `IndexPage.test.tsx` are updated and pass
   **Given** The IndexPage test suite
   **When** Tests run
   **Then** The three "Get Started"-specific tests are removed; all remaining tests pass; no test references the removed button

5. **AC5 - Unused CSS removed**: Unused `.hero-cta` CSS is removed
   **Given** `frontend/src/styles/global.css`
   **When** Inspected
   **Then** No `.hero-cta` or `.hero-cta:hover` rules remain (including in the `@media (max-width: 768px)` block)

6. **AC6 - README updated**: README no longer references the "Get Started" button
   **Given** `README.md`
   **When** Inspected
   **Then** Line 23 no longer mentions "Get Started"; the description points to the "Conversation Practice" feature card

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **IndexPage** (`frontend/src/pages/IndexPage.tsx`): Central navigation hub. Contains a hero section (title + description + "Get Started" button) and a feature cards grid. Uses `useNavigate`, `useCallback` for `handleFeatureClick` and `handleGetStarted`. 108 lines total.

- **FeatureCard** (`frontend/src/components/FeatureCard.tsx`): Renders a feature card with icon, title, description, CTA text, and `onClick`. The "Conversation Practice" card's CTA "Browse Scenarios →" already routes to `/scenarios` via `handleFeatureClick`.

- **FeatureConfig** (`frontend/src/types/index.ts`): Type for feature card config; includes `id`, `icon`, `title`, `description`, `ctaText`, `path`, optional `disabled`/`comingSoon`.

- **global.css** (`frontend/src/styles/global.css`): Global stylesheet. `.hero-cta` defined at lines 2799-2805, `.hero-cta:hover` at 2807-2811, and a responsive `.hero-cta` override at 3069-3072 inside `@media (max-width: 768px)`. The `.btn-primary` class (also applied to the button) is shared and must NOT be removed.

- **IndexPage.test.tsx** (`frontend/src/pages/IndexPage.test.tsx`): Jest-style tests (`jest.mock`, `jest.fn`, `@testing-library/react`) covering rendering, navigation, and accessibility. The three "Get Started"-specific tests are at lines 30-35 (rendering), 80-87 (navigation), and 134-139 (aria-label).

- **README.md** (`README.md`): Line 23 reads: `2. **Start Conversation Practice**: Click "Conversation Practice" or "Get Started" to select from 10 built-in scenarios`.

### New Concepts Required

None. This is a pure removal task.

### Key Business Rules

- **Minimal removal**: Only the "Get Started" button, `handleGetStarted`, related tests, and `.hero-cta` CSS are removed. Everything else stays.
- **Keep shared imports**: `useCallback`, `useNavigate`, `navigate` remain because `handleFeatureClick` uses them.
- **Keep `.btn-primary`**: The `.hero-cta` class combined `hero-cta btn-primary`; only `hero-cta` is removed. `btn-primary` is shared across the app and must remain.
- **Hero section stays**: The hero `<section>` with title and description remains; only the button is removed.

---

## Strategic Approach

### Solution Direction

1. **IndexPage.tsx**: Delete the `handleGetStarted` `useCallback` block (lines 67-70) and the `<button className="hero-cta btn-primary" ...>` element (lines 78-85). Leave the hero `<section>` with its title and description. Keep `useNavigate`, `navigate`, `useCallback`, and `handleFeatureClick`.

2. **IndexPage.test.tsx**: Delete the "renders Get Started button" test (lines 30-35), the "navigates to /scenarios when Get Started button is clicked" test (lines 80-87), and the "Get Started button has correct aria-label" test (lines 134-139). Keep all other tests (hero section rendering, feature cards, feature card navigation, accessibility for the page testid). No changes to the `mockNavigate`/`jest.mock('react-router-dom')` setup since feature-card navigation tests still need it.

3. **global.css**: Delete the `.hero-cta` rule (2799-2805), the `.hero-cta:hover` rule (2807-2811), and the `.hero-cta` block inside `@media (max-width: 768px)` (3069-3072). Do NOT touch `.btn-primary`, `.hero-title`, `.hero-description`, `.hero-section`, or any other rules.

4. **README.md**: Update line 23 to remove the `or "Get Started"` phrase, keeping the "Conversation Practice" feature card reference.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Remove button vs. hide it | Remove: cleaner, no dead code; Hide: reversible but leaves debt | Remove entirely — issue explicitly asks for removal. |
| Keep hero `<section>` vs. remove it | Keep: title/description still useful intro; Remove: would change layout | Keep the hero section; only the button is removed. |
| Remove `.hero-cta` CSS vs. leave it | Remove: no dead CSS; Leave: smaller diff but dead code | Remove — issue AC explicitly requires removing unused `.hero-cta` CSS. |
| Remove only the button-specific tests vs. rewrite the test file | Remove only: minimal diff, preserves coverage of remaining behavior | Remove only the three button-specific tests; keep the rest. |
| Test runner gap (`.test.tsx` not matched by vitest/jest) | Fixing config is out of scope | Verify with a one-off `npx jest --testMatch "**/*.test.tsx"` run; do not modify runner config. |

### Alternatives Considered

- **Replace the "Get Started" button with a different hero CTA**: Rejected — the issue asks for removal, and a replacement would reintroduce redundancy with the feature cards.
- **Keep the button but repoint it to a "dashboard"**: Rejected — out of scope; no dashboard exists yet.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Whether `.btn-primary` should also be removed | The button uses `hero-cta btn-primary`; `btn-primary` is shared | Remove only `.hero-cta`; keep `.btn-primary` (shared across app). |
| Whether the hero `<section>` should remain | Issue says remove the button, not the hero | Keep the hero section with title + description. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| E2E/Cypress tests referencing `hero-cta` | Could break E2E | None found in scope; grep confirms `hero-cta` only in IndexPage source/tests and global.css. |
| Other elements using `.hero-cta` | Could regress styling | grep confirms only IndexPage's button used it; safe to remove. |
| Test runner doesn't pick up `.test.tsx` | AC4 says tests pass, but runner config gap exists | Verify with one-off `jest --testMatch`; note gap (pre-existing, out of scope). |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Removing `useCallback`/`useNavigate` by mistake | Build breaks (feature cards lose navigation) | Keep both; only `handleGetStarted` is removed. |
| Stray blank lines/comment artifacts | Lint/TS noise | Remove cleanly — no leftover comments or `_unused` markers. |
| README wording becomes awkward after edit | Docs clarity | Reword line 23 to read naturally without "Get Started". |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Button removed | Yes | Delete button JSX |
| AC2 | handleGetStarted removed | Yes | Delete callback; keep useNavigate/navigate/handleFeatureClick |
| AC3 | Feature card navigation intact | Yes | Do not touch handleFeatureClick/useNavigate |
| AC4 | Tests updated and pass | Yes | Remove 3 tests; verify with one-off jest run |
| AC5 | Unused .hero-cta CSS removed | Yes | Delete 3 CSS rules; keep .btn-primary |
| AC6 | README no longer references "Get Started" | Yes | Edit line 23 |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- TypeScript must still compile with no unused-variable errors after removal (no new unused imports introduced).
- The hero section's visual layout should still render sensibly without the button (title + description alone).

---

## REASONS Canvas

### Requirements
From GitHub issue #216 acceptance criteria:
- "Get Started" button is removed from the IndexPage hero section
- `handleGetStarted` callback and any imports it solely relied on are removed
- `useNavigate`/`navigate`/`handleFeatureClick` remain intact (feature cards still navigate)
- Tests in `IndexPage.test.tsx` are updated and pass
- Unused `.hero-cta` CSS is removed
- README no longer references the "Get Started" button

### Examples
Concrete test cases:
- **After removal — IndexPage renders hero without button**: `screen.queryByTestId('hero-cta')` is `null`; `screen.queryByText('Get Started')` is `null`; `screen.getByTestId('hero-section')` still present; `screen.getByText('Welcome to French Language Coach')` still present.
- **Feature card navigation still works**: Click `feature-card-conversation` → `mockNavigate` called with `/scenarios`; click `feature-card-lessons` → `/lessons`; etc.
- **CSS**: `grep hero-cta frontend/src/styles/global.css` returns no matches after cleanup.
- **README**: `grep "Get Started" README.md` returns no matches after edit.

### Architecture
- **Framework**: React 19 with TypeScript, react-router-dom
- **Routing**: `useNavigate` hook for programmatic navigation; feature cards use `handleFeatureClick(path)`
- **Styling**: Global CSS in `frontend/src/styles/global.css`; `.hero-cta` is the only class being removed (`.btn-primary` is shared, stays)
- **Component structure**: Pages in `frontend/src/pages/`; IndexPage is a pure presentational + navigation component
- **Test patterns**: `IndexPage.test.tsx` uses `jest.mock('react-router-dom')` + `@testing-library/react`; jest-style globals

### Standards
- **Coding**: Match existing React/TypeScript patterns; minimal diff; remove completely (no `_unused`, no leftover comments)
- **Testing**: 80% coverage minimum; follow existing `IndexPage.test.tsx` patterns
- **Documentation**: Update README.md where it references the "Get Started" button
- **Change minimality**: Only remove what the issue specifies; do not refactor the hero section

### Omissions
Explicitly out of scope:
- Removing or restyling the hero section title/description
- Modifying feature cards or their navigation
- Adding a replacement CTA
- Backend changes
- Modifying vitest/jest test-runner configuration (pre-existing gap)
- E2E/Cypress changes (no in-scope references to `hero-cta`)

### Notes
Implementation hints:
- `IndexPage.tsx`: button is lines 78-85; `handleGetStarted` is lines 67-70.
- `IndexPage.test.tsx`: button tests at lines 30-35, 80-87, 134-139.
- `global.css`: `.hero-cta` at 2799-2805, `.hero-cta:hover` at 2807-2811, responsive `.hero-cta` at 3069-3072.
- `README.md`: line 23 is the only "Get Started" reference.
- After removing `handleGetStarted`, `useCallback` is still needed by `handleFeatureClick`; `useNavigate`/`navigate` still needed by `handleFeatureClick`. Do not remove them.
- The `.test.tsx` files are not matched by the default vitest or jest config (pre-existing gap). Verify tests with a one-off `npx jest --testMatch "**/*.test.tsx" src/pages/IndexPage.test.tsx`; do not modify runner config.

### Solutions
Reference implementations to mimic:
- The FLC-045 (issue #214) removal pattern: IndexPage had a larger section removed cleanly; follow the same "remove completely, keep shared imports" approach.
- Existing `IndexPage.test.tsx` structure for the remaining tests (no rewrite, just delete the three button tests).

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
