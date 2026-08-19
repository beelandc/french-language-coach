# SPDD Analysis: Direct Navigation to Pages Fails Due to Outdated static/index.html

**GitHub Issue**: #205
**Issue Title**: Direct navigation to pages fails due to outdated static/index.html
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/205
**Artifact ID**: FLC-042-202608191700
**Created**: 2026-08-19 17:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Most pages of the French Language Coach app do not render correctly when navigated to directly. For example, /vocabulary works when navigated from the index page but not when navigated to directly.

**Root Cause**: The application uses React Router for client-side navigation. The backend has a SPA fallback route that serves static/index.html for all non-API routes. However, the current static/index.html is an outdated legacy version from the initial project scaffold that does NOT bootstrap the React app.

The correct index.html is at frontend/index.html. The Vite config is set to build to ../static, but the static/index.html in git has never been updated.

**Why It Works When Navigating From IndexPage**: React Router handles navigation client-side when already running.

**Why It Fails When Navigating Directly**: Browser requests the route from server, FastAPI serves legacy static/index.html, React never initializes, route never matched.

---

## Background

The French Language Coach application has evolved from a vanilla JavaScript implementation to a React-based frontend. During this migration:

1. The original `static/index.html` was created as a legacy vanilla JS entry point
2. The React frontend was developed in the `frontend/` directory with its own `index.html`
3. Vite is configured to build React output to `../static/` directory
4. The FastAPI backend serves `static/index.html` as the SPA fallback for client-side routing
5. However, the `static/index.html` in git has never been updated to match the React app structure

This means when users:
- Navigate from within the app (client-side) → Works (React Router handles it)
- Navigate directly to a route (server-side) → Fails (gets legacy HTML without React bootstrap)
- Refresh the page on any route → Fails (same reason)

---

## Business Value

- **Improved User Experience**: Users can bookmark and directly access any page in the application
- **SEO Benefits**: Direct links to pages will work correctly for search engine crawling
- **App Reliability**: Page refresh works correctly on all routes
- **Standard SPA Behavior**: Matches expected behavior for Single Page Applications

---

## Scope In

- [ ] Update `static/index.html` to match `frontend/index.html` (React bootstrap entry point)
- [ ] Ensure frontend build process correctly overwrites `static/index.html`
- [ ] Update root route (`/`) in `main.py` to serve `index.html` without redirect
- [ ] Verify direct navigation works for all routes: /vocabulary, /lessons, /exercises, etc.
- [ ] Verify page refresh works on all routes

## Scope Out

- [ ] No changes to React Router configuration in frontend
- [ ] No changes to Vite build configuration (already correct)
- [ ] No changes to existing React components
- [ ] No changes to API endpoints
- [ ] No changes to other static assets (CSS, JS bundles)

---

## Acceptance Criteria (ACs)

1. **AC-1**: Direct navigation to /vocabulary works
   **Given** User navigates directly to /vocabulary in browser
   **When** Page loads
   **Then** Vocabulary page renders correctly

2. **AC-2**: Direct navigation to /lessons works
   **Given** User navigates directly to /lessons in browser
   **When** Page loads
   **Then** Lessons page renders correctly

3. **AC-3**: Direct navigation to /exercises works
   **Given** User navigates directly to /exercises in browser
   **When** Page loads
   **Then** Exercises page renders correctly

4. **AC-4**: Page refresh works on any route
   **Given** User is on any route (e.g., /vocabulary)
   **When** User refreshes the page (F5 or Ctrl+R)
   **Then** Page reloads correctly without 404 or blank page

5. **AC-5**: Root route (/) serves React app without redirect
   **Given** User navigates to /
   **When** Page loads
   **Then** React app renders without redirect to /static/index.html

6. **AC-6**: SPA fallback route serves React app for all non-API routes
   **Given** User navigates to any non-API route (e.g., /vocabulary/decks/123)
   **When** FastAPI processes the request
   **Then** React index.html is served, allowing React Router to handle the route

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **FastAPI SPA Fallback Route** (`main.py:98-115`): Route that catches all non-API requests and serves index.html for client-side routing
- **Static Files Mount** (`main.py:69`): FastAPI static files server for the `static/` directory
- **React Entry Point** (`frontend/index.html`): HTML file with root div and main.tsx script tag
- **React Router** (`frontend/src/App.tsx`): Client-side routing configuration with all app routes
- **Vite Build Config** (`frontend/vite.config.ts`): Configured to output to `../static/` directory
- **Legacy Index** (`static/index.html`): Outdated vanilla JS HTML file that doesn't bootstrap React

### New Concepts Required

None - this is a bug fix requiring updates to existing files, not new concepts.

### Key Business Rules

- All non-API routes must serve the React app's index.html
- The React app must be able to initialize and handle client-side routing
- Static assets must be served correctly by FastAPI
- Build process must produce correct output in static/ directory

---

## Strategic Approach

### Solution Direction

1. **Update static/index.html**: Replace the legacy vanilla JS HTML with the React bootstrap HTML from frontend/index.html
2. **Update root route**: Change from redirect to serving index.html directly (matching SPA fallback behavior)
3. **Verify build process**: Ensure Vite build correctly outputs index.html to static/ directory
4. **Test**: Verify direct navigation and page refresh work for all routes

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Whether to redirect root route or serve HTML directly | Redirect adds extra HTTP request; direct serve is more efficient | Serve HTML directly (matches SPA fallback pattern) |
| Whether to update static/index.html in git or ignore it | Updating in git ensures consistency; ignoring requires build step | Update in git to match frontend/index.html |
| Whether to add static/ to .gitignore | Prevents outdated files in git; but static/ has other assets | Keep static/ in git but ensure build overwrites index.html |

### Alternatives Considered

- **Alternative 1**: Add static/ to .gitignore and require build step - Rejected because static/ contains other assets that need to be in git
- **Alternative 2**: Modify SPA fallback to serve from frontend/index.html - Rejected because frontend/ may not exist in production
- **Alternative 3**: Use a build script to copy frontend/index.html to static/ - Acceptable but manual update is simpler for this case

---

## Risk & Gap Analysis

### Requirement Ambiguities

None identified. The issue description is clear and provides specific files to update.

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| User navigates to non-existent route (e.g., /nonexistent) | Should show 404 or redirect to home | React Router handles with NotFound component (if exists) or blank |
| User navigates to API route directly | Should return API response, not HTML | FastAPI route order ensures API routes match first |
| Static assets requested (CSS, JS bundles) | Must be served correctly | FastAPI static files mount handles this |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Outdated static/index.html in git | Could revert to old version | Update the file in git and verify build process |
| Build process doesn't overwrite index.html | Production would have outdated file | Test the build process locally |
| Route ordering issue | API routes might not be matched first | Verify route order in main.py |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | Direct navigation to /vocabulary | Yes | Requires updated static/index.html |
| AC-2 | Direct navigation to /lessons | Yes | Requires updated static/index.html |
| AC-3 | Direct navigation to /exercises | Yes | Requires updated static/index.html |
| AC-4 | Page refresh works | Yes | Requires updated static/index.html |
| AC-5 | Root route serves without redirect | Yes | Update root route handler |
| AC-6 | SPA fallback serves React app | Yes | Verify static/index.html is correct |

**AC Coverage Summary**: All 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- The build process must work correctly to produce updated static files
- The solution must not break existing client-side navigation

---

## REASONS Canvas

### Requirements
From GitHub issue #205 acceptance criteria:
- Update static/index.html to contain the React app entry point
- Ensure frontend build overwrites static/index.html
- Update root route in main.py to serve index.html without redirect
- Test direct navigation to /vocabulary, /lessons, /exercises
- Test page refresh on any route

### Examples
Concrete test cases:
1. Navigate directly to /vocabulary → VocabularyPage renders
2. Navigate directly to /lessons → LessonPage renders
3. Navigate directly to /exercises → ExerciseBrowserPage renders
4. Refresh page on /vocabulary → VocabularyPage reloads correctly
5. Navigate to / → IndexPage renders without redirect
6. Navigate to /vocabulary/decks/123 → DeckDetailPage renders

### Architecture
Existing codebase structure:
- Backend: FastAPI with SPA fallback route pattern
- Frontend: React with Vite build system
- Static files: Served from static/ directory by FastAPI
- Client-side routing: React Router in frontend/src/App.tsx

Design patterns to follow:
- SPA fallback route must be last route registered in FastAPI
- Static files mount at /static for CSS, JS, images
- React entry point uses div#root and /src/main.tsx script

### Standards
- Must follow existing FastAPI route patterns
- Must maintain backward compatibility
- Must not break existing functionality
- Frontend code follows React conventions

### Omissions
Explicitly out-of-scope:
- No changes to React Router configuration
- No changes to Vite build configuration
- No new React components
- No new API endpoints
- No changes to other static assets

### Notes
Implementation hints:
- Compare frontend/index.html and static/index.html to see differences
- The SPA fallback in main.py already reads from static/index.html
- Vite config builds to ../static with emptyOutDir: true (will replace index.html)
- The root route currently redirects to /static/index.html (should serve directly)

### Solutions
Reference implementations:
- SPA fallback pattern already exists in main.py:98-115
- React bootstrap pattern exists in frontend/index.html
- Route definitions exist in frontend/src/App.tsx
- Vite build config exists in frontend/vite.config.ts

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
