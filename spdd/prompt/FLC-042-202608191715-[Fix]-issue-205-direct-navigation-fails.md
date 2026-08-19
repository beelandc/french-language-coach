# SPDD Prompt: Fix Direct Navigation to Pages

**GitHub Issue**: #205
**Issue Title**: Direct navigation to pages fails due to outdated static/index.html
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/205
**Artifact ID**: FLC-042-202608191715
**Created**: 2026-08-19 17:15
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-042-202608191700-[Analysis]-issue-205-direct-navigation-fails.md`

---

## Context

### Current Codebase State

The French Language Coach application has a bug where direct navigation to pages (e.g., `/vocabulary`, `/lessons`, `/exercises`) fails because:

1. The backend FastAPI server has a SPA fallback route that serves `static/index.html` for all non-API routes
2. The current `static/index.html` is an outdated legacy vanilla JavaScript file from the initial project scaffold
3. This legacy file does NOT contain the React bootstrap code (no `div#root` or reference to `/src/main.tsx`)
4. The correct React entry point HTML exists at `frontend/index.html` but has never been copied to `static/index.html`

When users:
- Navigate from within the app → Works (React Router handles client-side navigation)
- Navigate directly to a route or refresh → Fails (server returns legacy HTML, React never initializes)

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `static/index.html` | Outdated legacy HTML (vanilla JS) | Lines 1-47, has `div.app`, references `app.js` |
| `frontend/index.html` | Correct React entry point | Lines 1-13, has `div#root`, references `/src/main.tsx` |
| `main.py` | FastAPI backend with SPA fallback | Lines 91-93 (root route redirects), Lines 98-115 (SPA fallback) |
| `frontend/vite.config.ts` | Vite build configuration | Lines 31-40, builds to `../static/`, `emptyOutDir: true` |
| `frontend/src/main.tsx` | React bootstrap | Creates root at `div#root`, wraps in BrowserRouter |
| `frontend/src/App.tsx` | React Router routes | Defines all app routes (47 routes defined) |

### Existing Patterns

1. **SPA Fallback Pattern**: `main.py:98-115` uses `@app.get("/{full_path:path}")` to catch all non-API routes and serve `static/index.html`
2. **Static Files Mount**: `main.py:69` mounts `/static` directory for CSS, JS, images
3. **React Bootstrap**: `frontend/index.html` uses `div id="root"` and `<script type="module" src="/src/main.tsx"></script>`
4. **Route Order**: FastAPI evaluates routes in order, so specific API routes are registered before the catch-all SPA fallback

---

## Goal

**Primary Objective**: Fix direct navigation to all application pages by updating `static/index.html` to contain the React app entry point and updating the root route to serve it directly without redirect.

**Secondary Objectives**:
- Ensure the frontend build process correctly overwrites `static/index.html` with the React version
- Verify that direct navigation works for all routes: `/vocabulary`, `/lessons`, `/exercises`, `/vocabulary/decks/:deckId`, etc.
- Verify that page refresh works on any route
- Maintain backward compatibility with existing client-side navigation

---

## Constraints

### Architecture Constraints
- Must follow existing FastAPI SPA fallback pattern
- Must not break existing API endpoints
- Must maintain route ordering (API routes before catch-all)
- Must work with existing React Router configuration
- Must work with existing Vite build configuration

### Code Quality Constraints
- Must follow existing code style (PEP 8 for Python, consistent formatting)
- Minimal changes to existing files
- No new dependencies
- No breaking changes

### Testing Constraints
- Must verify all 6 acceptance criteria from issue #205
- Must test direct navigation to multiple routes
- Must test page refresh on multiple routes
- Must verify root route serves without redirect

### Acceptance Criteria

From GitHub issue #205:

1. **AC-1**: Direct navigation to /vocabulary works
2. **AC-2**: Direct navigation to /lessons works
3. **AC-3**: Direct navigation to /exercises works
4. **AC-4**: Page refresh works on any route
5. **AC-5**: Root route (/) serves React app without redirect
6. **AC-6**: SPA fallback route serves React app for all non-API routes

---

## Examples

### Input/Output Examples

1. **Example 1: Direct Navigation to /vocabulary**
   - Input: User enters `http://localhost:8000/vocabulary` in browser
   - Expected Output: VocabularyPage component renders correctly

2. **Example 2: Page Refresh**
   - Input: User is on `/lessons` page, presses F5
   - Expected Output: LessonPage component reloads correctly

3. **Example 3: Root Route**
   - Input: User enters `http://localhost:8000/` in browser
   - Expected Output: IndexPage component renders, no redirect to /static/index.html

4. **Example 4: Nested Route**
   - Input: User enters `http://localhost:8000/vocabulary/decks/123` in browser
   - Expected Output: DeckDetailPage component renders correctly

### Edge Cases

- **Non-existent route**: Navigate to `/nonexistent` → Should handle gracefully (React Router may show blank or 404)
- **API route**: Navigate to `/sessions` → Should return API response (JSON), not HTML
- **Static asset**: Request `/static/style.css` → Should serve CSS file correctly
- **Mixed case route**: Navigate to `/Vocabulary` → Should work (routes are case-sensitive per React Router config)

### Test Cases

```python
# Test case for root route
def test_root_route_serves_react_app():
    # Given FastAPI app
    # When GET /
    # Then response status is 200, content contains div#root, no redirect
    pass

def test_vocabulary_route_serves_react_app():
    # Given FastAPI app
    # When GET /vocabulary
    # Then response status is 200, content contains div#root
    pass

def test_spa_fallback_serves_index_html():
    # Given FastAPI app
    # When GET /any/non-api/route
    # Then response status is 200, content contains div#root
    pass
```

---

## Deliverables

### Code Changes

- [ ] `static/index.html` - Replace with content matching `frontend/index.html` (React bootstrap HTML)
- [ ] `main.py` - Update root route (`/`) to serve index.html directly instead of redirecting to `/static/index.html`

### Tests

- [ ] Manual test: Direct navigation to /vocabulary
- [ ] Manual test: Direct navigation to /lessons
- [ ] Manual test: Direct navigation to /exercises
- [ ] Manual test: Page refresh on /vocabulary
- [ ] Manual test: Page refresh on /lessons
- [ ] Manual test: Root route navigation
- [ ] Manual test: Nested route navigation

### Documentation

- [ ] Update README.md if this fix affects setup or deployment instructions
- [ ] Verify existing documentation is still accurate

---

## Actual Prompt

This is the exact prompt text to drive implementation:

```
IMPLEMENT GitHub issue #205: Fix direct navigation to pages failing due to outdated static/index.html

CONTEXT:
- The French Language Coach app uses React Router for client-side navigation
- Backend FastAPI has SPA fallback route serving static/index.html
- Current static/index.html is outdated legacy vanilla JS file (no React bootstrap)
- Correct React entry point is at frontend/index.html
- Vite is configured to build to ../static/ with emptyOutDir: true
- main.py has root route redirecting to /static/index.html and SPA fallback reading from static/index.html

GOAL:
- Update static/index.html to match frontend/index.html (React bootstrap)
- Update main.py root route to serve index.html directly without redirect
- Ensure Vite build process overwrites static/index.html correctly
- Verify direct navigation works for all routes

CONSTRAINTS:
- Must NOT break existing API endpoints
- Must follow existing FastAPI route patterns
- Must maintain route ordering (API routes before catch-all)
- Must work with existing React Router configuration
- Must work with existing Vite build configuration
- Minimal changes to existing files
- No new dependencies

RELEVANT FILES:
- static/index.html (OUTDATED - needs update)
- frontend/index.html (CORRECT - reference for update)
- main.py:91-93 (root route - needs update to serve directly)
- main.py:98-115 (SPA fallback - already correct, reads from static/index.html)
- frontend/vite.config.ts (build config - already correct)

EXACT CHANGES REQUIRED:
1. Copy content from frontend/index.html to static/index.html
   - frontend/index.html has: <div id="root"></div> and <script type="module" src="/src/main.tsx"></script>
   - static/index.html currently has: legacy vanilla JS structure with div.app and script src="app.js"

2. Update main.py root route (line 92-93) from:
   return RedirectResponse(url="/static/index.html")
   TO:
   try:
       with open("static/index.html", "r") as f:
           content = f.read()
       return HTMLResponse(content=content, status_code=200)
   except FileNotFoundError:
       return HTMLResponse(content="<html><body>Not Found</body></html>", status_code=404)
   
   This matches the SPA fallback pattern already used for other routes.

ACCEPTANCE CRITERIA (from issue #205):
- [ ] Direct navigation to /vocabulary works
- [ ] Direct navigation to /lessons works
- [ ] Direct navigation to /exercises works
- [ ] Page refresh works on any route
- [ ] Root route (/) serves React app without redirect
- [ ] SPA fallback route serves React app for all non-API routes

DELIVERABLES:
- Updated static/index.html with React bootstrap HTML
- Updated main.py root route to serve index.html directly
- Verification that all acceptance criteria pass

EXAMPLES:
- Navigate to /vocabulary → VocabularyPage renders
- Navigate to /lessons → LessonPage renders
- Navigate to / → IndexPage renders without redirect
- Refresh on /vocabulary → VocabularyPage reloads
- Navigate to /vocabulary/decks/123 → DeckDetailPage renders
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after implementation]

### Changes Made

- [ ] Updated static/index.html with React bootstrap content
- [ ] Updated main.py root route to serve index.html directly
- [ ] Verified all acceptance criteria

### Quality Checks

- [ ] Code follows existing patterns
- [ ] All acceptance criteria from issue #205 are met
- [ ] No breaking changes introduced
- [ ] Documentation updated if needed

### Issues Found

- [ ] Any issues found during implementation and their resolutions

---

## Verification

- [ ] All acceptance criteria from issue #205 are met
- [ ] Direct navigation to /vocabulary, /lessons, /exercises works
- [ ] Page refresh works on all routes
- [ ] Root route serves without redirect
- [ ] SPA fallback works for all non-API routes
- [ ] API routes still return JSON responses
- [ ] Static assets (CSS, JS) still serve correctly
- [ ] No breaking changes to existing functionality

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
