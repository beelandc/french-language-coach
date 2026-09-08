# SPDD Prompt: Add Home Navigation Button to All Views

**GitHub Issue**: #211
**Issue Title**: Add Home Navigation Button to All Views
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/211
**Artifact ID**: FLC-044-202609081506
**Created**: 2026-09-08 15:06
**Author**: Mistral Vibe AI Assistant
**Related Analysis**: `spdd/analysis/FLC-044-202609081505-[Analysis]-issue-211-home-navigation-button.md`

---

## Context

### Current Codebase State

The French Language Coach application currently has a global header defined in `frontend/src/App.tsx` (lines 20-22) that contains only the application title: `<header><h1>French Language Coach</h1></header>`. Most pages in the application have no way for users to navigate back to the homepage (`/`) except using browser navigation.

The application uses:
- **React 18+** with functional components and hooks
- **React Router DOM v6** for client-side routing
- **Global CSS** for styling (located in `/frontend/src/styles/`)
- **TypeScript** for type safety (in migration process)

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/App.tsx` | Main application component with global header and routing | Lines 17-22: Header definition; Lines 25-60: Routes configuration |
| `frontend/src/styles/global.css` | Global CSS styles | Contains existing header and page styling |
| `frontend/src/pages/IndexPage.tsx` | Modern landing page (homepage target) | Uses `useNavigate()` hook for navigation |
| `frontend/src/pages/*.tsx` | Various feature pages | All currently lack home navigation |

### Existing Patterns

- **Navigation**: Components use `useNavigate()` hook from `react-router-dom` for programmatic navigation
- **Styling**: Global CSS classes with BEM-like naming conventions
- **Accessibility**: Some components use `aria-label` and `data-testid` attributes
- **Component Structure**: Functional components with TypeScript interfaces where applicable

---

## Goal

**Primary Objective**: Add a clickable home button to the global header in App.tsx that navigates to `/` (IndexPage) and appears on all pages.

**Secondary Objectives**:
- Add CSS styling for the home button to ensure visual consistency
- Ensure accessibility compliance (keyboard navigation, screen reader support)
- Ensure mobile compatibility with appropriate touch targets
- Maintain existing functionality without breaking changes

---

## Constraints

### Architecture Constraints
- Must use existing React Router DOM v6 patterns
- Must modify only the global header in App.tsx (not individual pages)
- Must maintain existing routing structure and functionality
- Must not introduce breaking changes to existing components

### Code Quality Constraints
- Must follow existing React patterns in the codebase
- Must include appropriate TypeScript types where applicable
- Must use semantic HTML and proper accessibility attributes
- Must add `data-testid` attributes for testing

### Testing Constraints
- Must create tests that verify home button appears on all pages
- Must test navigation functionality
- Must test accessibility compliance
- Must achieve and maintain 80% test coverage for modified components

### Acceptance Criteria

From GitHub issue #211:
- [ ] All pages display a clickable home button in the header
- [ ] Clicking the home button navigates to `/` (IndexPage)
- [ ] Home button is visually consistent across all pages
- [ ] Home button is accessible (keyboard navigation, screen reader support)
- [ ] Home button works on mobile devices
- [ ] Existing functionality is not broken

---

## Examples

### Input/Output Examples

1. **Example 1: Navigation from ScenarioPage**
   - **Input**: User is on `/scenarios` route, clicks home button
   - **Expected Output**: Application navigates to `/` route, IndexPage is rendered

2. **Example 2: Navigation from ChatPage**
   - **Input**: User is on `/chat/123` route, clicks home button
   - **Expected Output**: Application navigates to `/` route, IndexPage is rendered

3. **Example 3: Mobile Interaction**
   - **Input**: User on mobile device with touch screen taps home button
   - **Expected Output**: Navigation occurs successfully, button is large enough for touch

### Edge Cases

- **User already on homepage**: Button is still visible and clickable (navigation to `/` again is harmless)
- **Very small screen sizes**: Button maintains minimum touch target of 44x44px
- **Screen reader users**: Button has appropriate `aria-label` for context
- **Keyboard users**: Button is focusable and responds to Enter/Space keys

### Test Cases

```javascript
// Test case for home button rendering
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('Home Button', () => {
  test('renders home button in header', () => {
    render(<App />)
    expect(screen.getByTestId('home-button')).toBeInTheDocument()
  })

  test('navigates to home when clicked', () => {
    // Mock useNavigate and test navigation
    const mockNavigate = jest.fn()
    // Test implementation...
  })
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/App.tsx` - Add home button to header with navigation functionality
- [ ] `frontend/src/styles/global.css` - Add CSS styling for home button (hover, focus, mobile states)

### Tests
- [ ] Test home button renders in header
- [ ] Test home button navigation functionality
- [ ] Test accessibility attributes (aria-label, keyboard focus)
- [ ] Test mobile touch target size
- [ ] Test appearance on multiple pages

### Documentation
- [ ] Update README.md if this change affects user-facing functionality significantly
- [ ] Add inline comments for complex logic (if any)
- [ ] Update any relevant documentation

---

## Actual Prompt

```
Please implement the home navigation button feature for GitHub issue #211.

CONTEXT:
- Current codebase: French Language Coach React application with TypeScript
- Global header defined in frontend/src/App.tsx (lines 20-22): `<header><h1>French Language Coach</h1></header>`
- Uses react-router-dom v6 for routing
- Global CSS in frontend/src/styles/global.css
- All pages currently lack consistent home navigation

GOAL:
- Add a clickable home button to the global header that navigates to '/' (IndexPage)
- Button should appear on all pages consistently
- Implement accessibility features (aria-label, keyboard support)
- Ensure mobile compatibility

CONSTRAINTS:
- Must modify only App.tsx and global.css (no changes to individual page components)
- Must use react-router-dom v6 patterns (use Link or useNavigate)
- Must follow existing React and TypeScript patterns
- Must include data-testid attributes for testing
- Must maintain existing functionality without breaking changes

EXAMPLES:
- User on /scenarios clicks button → navigates to /
- User on /chat/123 clicks button → navigates to /
- Mobile user taps button → navigation works
- Screen reader announces "Home" when button is focused

ACCEPTANCE CRITERIA:
- [ ] All pages display a clickable home button in the header
- [ ] Clicking the home button navigates to '/' (IndexPage)
- [ ] Home button is visually consistent across all pages
- [ ] Home button is accessible (keyboard navigation, screen reader support)
- [ ] Home button works on mobile devices
- [ ] Existing functionality is not broken

DELIVERABLES:
- Modified App.tsx with home button in header
- Updated global.css with home button styling
- Tests for home button functionality

IMPLEMENTATION GUIDANCE:
1. In App.tsx:
   - Import necessary hooks from react-router-dom
   - Add home button before or after the h1 title in the header
   - Use Link component for declarative navigation to '/'
   - Add appropriate className, aria-label, and data-testid
   - Consider using a simple home icon (Unicode 🏠 or similar)

2. In global.css:
   - Style the home button with appropriate sizing
   - Add hover, focus, and active states
   - Ensure mobile touch targets (min 44x44px)
   - Position the button appropriately relative to the title

3. For accessibility:
   - Add aria-label="Home" or similar descriptive text
   - Ensure button is keyboard focusable
   - Add visual focus indicator
   - Ensure sufficient color contrast

4. For testing:
   - Add data-testid="home-button" to the button element
   - Create tests that verify rendering and navigation
```

---

## AI Response

[To be completed after implementation]

---

## Human Review Notes

[To be completed after implementation]

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

[Checklist for verifying the deliverables.]

- [ ] All acceptance criteria from issue #211 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*