# SPDD Analysis: Create LessonViewer React Component

**GitHub Issue**: #44
**Issue Title**: 2.10: Create LessonViewer React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/44
**Artifact ID**: FLC-023-202606041423
**Created**: 2026-06-04 14:23
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #44:

### Description
Component to display grammar lesson content.

### Features
- Render markdown content
- Section navigation
- Example highlighting
- Related lessons

### Acceptance Criteria
- [ ] Displays lesson title and metadata
- [ ] Renders all sections
- [ ] Displays examples
- [ ] Navigation between sections
- [ ] Links to related lessons

---

## Background

The French Language Coach application is in Phase 2 (Grammar Mastery). Issue #42 (Create LessonBrowser React component) was recently completed and implemented:
- `LessonBrowser` component for browsing, searching, and filtering grammar lessons
- `LessonCard` component for displaying lesson summaries
- `LessonSearch` component for filtering and search UI
- `LessonPage` for the `/lessons` route
- `LessonDetailPage` for the `/lessons/:lessonId` route

The `LessonDetailPage` currently exists and provides basic lesson viewing functionality, but it lacks several features specified in issue #44:
- **Markdown rendering**: Currently only does simple line break conversion with `<br />` tags
- **Section navigation**: No table of contents or way to jump between sections
- **Example highlighting**: Examples are displayed as a simple list without special styling
- **Related lessons**: No links to related lessons (data structure doesn't currently support this)

Note: Issue #42's analysis document mentions creating a "LessonDetail" page/component, which was implemented as `LessonDetailPage`. Issue #44 appears to be a follow-up to enhance or refactor the lesson viewing experience.

### Related Work
- **Issue #42 (CLOSED)**: Created LessonBrowser and related components - **ALREADY IMPLEMENTED**
  - LessonBrowser navigates to `/lessons/:lessonId` which uses LessonDetailPage
  - The routing and basic viewing infrastructure is in place
- **Issue #38 (CLOSED)**: Lesson progress model and tracking endpoints
- **Issue #28 (OPEN)**: Grammar lesson schema
- **Issue #32 (OPEN)**: Grammar reference

---

## Business Value

- **Improved content presentation**: Markdown rendering allows for rich formatting (bold, italics, lists, code blocks) in lesson content
- **Better user experience**: Section navigation (TOC) enables quick jumping between lesson sections
- **Enhanced readability**: Example highlighting makes examples stand out and easier to find
- **Contextual learning**: Related lessons links help users discover connected content
- **Professional appearance**: Proper markdown rendering makes lessons look more polished and professional

---

## Scope In

- Create `LessonViewer` React component as a reusable component
- Implement markdown rendering for lesson content
- Add section navigation (table of contents) with anchor links
- Add example highlighting with special styling
- Add related lessons links section (if backend supports it)
- Update `LessonDetailPage` to use the new `LessonViewer` component
- Add TypeScript types for any new props
- Add CSS styles for markdown rendering, section navigation, and example highlighting
- Create Storybook stories for the new component
- Write comprehensive tests (80%+ coverage)

## Scope Out

- Backend API changes (backend lesson data structure already exists)
- Creating new lesson content (data already exists in `data/grammar_lessons/`)
- Adding related lessons to data structure (out of scope for this issue, but component should be prepared to display if data is available)
- Editing/management of lessons (admin feature, future)
- Interactive exercises within lessons (future feature)
- Audio/video content (future feature)
- User progress tracking for lesson viewing (already handled by issue #38)

---

## Acceptance Criteria (ACs)

1. **AC-1: Displays lesson title and metadata**
   - **Given** User navigates to a lesson detail page
   - **When** Page loads successfully
   - **Then** The lesson title and metadata (topic, difficulty, ID, section count) are displayed
   - **Status**: ✅ **PARTIALLY IMPLEMENTED** - LessonDetailPage already does this

2. **AC-2: Renders all sections**
   - **Given** A lesson with multiple sections exists
   - **When** User views the lesson
   - **Then** All sections are displayed with their titles and content
   - **Status**: ✅ **PARTIALLY IMPLEMENTED** - LessonDetailPage does this but without markdown

3. **AC-3: Displays examples**
   - **Given** A lesson section has examples
   - **When** User views the lesson
   - **Then** All examples are displayed
   - **Status**: ✅ **PARTIALLY IMPLEMENTED** - LessonDetailPage does this but without highlighting

4. **AC-4: Navigation between sections**
   - **Given** A lesson with multiple sections
   - **When** User views the lesson
   - **Then** There is a table of contents or similar navigation to jump between sections
   - **Status**: ❌ **NOT IMPLEMENTED**

5. **AC-5: Links to related lessons**
   - **Given** A lesson has related lessons defined
   - **When** User views the lesson
   - **Then** Links to related lessons are displayed
   - **Status**: ❌ **NOT IMPLEMENTED** (data structure may not support this yet)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **LessonDetailPage** (`frontend/src/pages/LessonDetailPage.tsx`): Page component that fetches and displays a single lesson. Currently handles loading, error, and not-found states. Displays lesson metadata, sections, and examples.

- **Lesson** (`frontend/src/types/index.ts`): TypeScript interface for full lesson data including id, title, topic, difficulty, and sections array.

- **LessonSection** (`frontend/src/types/index.ts`): TypeScript interface for lesson sections with title, content, and examples.

- **GrammarLesson** (`backend/schemas/grammar_lesson.py`): Pydantic model for backend lesson data validation.

- **GET /grammar/lessons/{id}** (`routers/grammar.py`): Backend endpoint that returns a single lesson with full content.

- **LessonBrowser** (`frontend/src/components/LessonBrowser.tsx`): Component for browsing and filtering lessons, navigates to lesson detail view.

### New Concepts Required

- **LessonViewer**: New reusable React component specifically for rendering lesson content with enhanced features.

- **MarkdownRenderer**: Utility or component for rendering markdown content safely in React. Options include:
  - Use a library like `react-markdown`
  - Custom implementation with sanitization
  - Server-side markdown to HTML conversion

- **TableOfContents**: Component for displaying section navigation with anchor links.

- **ExampleHighlight**: Styled component for displaying examples with enhanced visual treatment.

- **RelatedLessons**: Component for displaying links to related lessons (if data available).

### Key Business Rules

- Lesson content should be rendered as markdown to support rich formatting
- Section navigation should allow one-click jumping to any section
- Examples should have distinct styling to make them stand out
- Related lessons should link to other lessons in the same topic or difficulty level
- All content must be properly sanitized to prevent XSS attacks

---

## Strategic Approach

### Solution Direction

**Recommended Approach**: Create a new `LessonViewer` component that encapsulates the enhanced lesson viewing functionality, and update `LessonDetailPage` to use it.

1. **Create LessonViewer component** in `frontend/src/components/LessonViewer.tsx`
   - Accept a `lesson` prop of type `Lesson`
   - Render lesson metadata and title
   - Render table of contents for section navigation
   - Render sections with markdown content
   - Render examples with highlighting
   - Render related lessons links (if available)

2. **Add markdown support**
   - Option A: Use `react-markdown` library (recommended - lightweight, well-maintained)
   - Option B: Use `marked` library (more features but heavier)
   - Option C: Custom implementation (most control but more work)
   - **Recommendation**: Use `react-markdown` as it's a small, fast library specifically designed for React

3. **Add section navigation**
   - Create a sticky or fixed table of contents on the side or top
   - Use anchor links to jump to sections
   - Highlight current section in viewport

4. **Add example highlighting**
   - Style examples with distinct background, border, and typography
   - Consider using a card-like design for each example

5. **Add related lessons**
   - Check if backend lesson data has related_lessons field
   - If not, the component should gracefully handle absence
   - Display as a list of lesson cards or links at the bottom

6. **Update LessonDetailPage**
   - Replace current rendering logic with `<LessonViewer lesson={lesson} />`
   - Keep loading, error, and not-found states handling

7. **Add CSS styles**
   - Markdown-specific styles (code blocks, tables, lists, etc.)
   - Section navigation styles
   - Example highlighting styles
   - Related lessons styles

8. **Add tests**
   - Unit tests for LessonViewer component
   - Integration tests with LessonDetailPage
   - Coverage for all new features
   - 80%+ test coverage required

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use react-markdown vs custom markdown parser | react-markdown: Small (5KB), React-specific, good performance, supports plugins. Custom: More control, no dependencies, more development time. | **Use react-markdown** - Proven library, small bundle size, actively maintained |
| Section TOC placement (sidebar vs top) | Sidebar: Always visible, good for long lessons, takes screen space. Top: Saves space, scrolls with content, less accessible. | **Sticky sidebar** for desktop, **collapsible drawer** for mobile - Best UX for long-form content |
| Example highlighting style | Card design: Clear visual separation, professional. Simple list: Consistent with current, less visual weight. | **Card design** with subtle background, border, and icon - Makes examples pop without being distracting |
| Related lessons data source | Backend: Requires API endpoint, consistent. Frontend: Can filter existing lessons, no backend changes. | **Frontend filtering** initially - Filter lessons by same topic/difficulty, link to backend endpoint later |

### Alternatives Considered

- **Alternative 1: Enhance LessonDetailPage directly** - Rejected because a separate LessonViewer component provides better reusability and separation of concerns. The LessonDetailPage handles data fetching and state, while LessonViewer handles presentation.

- **Alternative 2: Server-side markdown rendering** - Rejected because client-side rendering with react-markdown is simpler, faster (no additional API call), and allows for dynamic content updates without server round-trip.

- **Alternative 3: Use dangerouslySetInnerHTML with server-rendered markdown** - Rejected due to XSS security concerns. react-markdown is safer as it parses markdown to React elements without raw HTML.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Navigation between sections" | Does this mean a table of contents, prev/next buttons, or both? | Implement both: TOC for jumping to any section + prev/next for sequential navigation |
| "Related lessons" | Are related lessons stored in the lesson data, or should we compute them from topic/difficulty? | Check if lesson data has related_lessons field. If not, compute from same topic/difficulty. Current data structure doesn't have this field. |
| "Render markdown content" | What markdown features should be supported? Full GFM? Tables? | Support common markdown: headings, bold/italic, lists, links, code blocks, blockquotes. Use react-markdown plugins for tables if needed. |
| "Example highlighting" | What does "highlighting" mean? Background color? Border? Icon? | Use card-style with subtle background, left border accent, and slightly larger font |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Lesson with no sections | Shouldn't happen per schema (min_length=1), but handle gracefully | Display "No content" message |
| Section with no title | Schema requires title, but handle empty | Use "Untitled Section" |
| Section with no content | Valid per schema (content is required, but could be empty string) | Display section title only, or "No content" |
| Lesson with no examples | Common case | Don't display examples section header |
| Empty example strings | Validated by backend schema | Filter out empty strings before display |
| Very long lesson (10+ sections) | TOC could be very long | Use scrollable TOC or hierarchical display |
| Mobile viewport | Limited screen space | TOC should be collapsible or placed at top |
| Markdown with HTML | Security concern | Sanitize with remark plugins or strip HTML |
| Markdown with scripts | XSS vulnerability | react-markdown doesn't render HTML by default, but if plugins add it, need sanitization |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| XSS vulnerability with markdown | Malicious markdown could inject scripts | Use react-markdown without HTML support, or add sanitization with DOMPurify |
| Large markdown content performance | Many sections could cause slow rendering | Use React.memo, virtualization for TOC, and lazy loading |
| Bundle size increase | react-markdown adds ~5KB to bundle | Acceptable trade-off for functionality |
| CSS conflicts | Markdown styles could conflict with existing styles | Use scoped CSS (CSS Modules) or specific class names |
| Missing dependencies | react-markdown not in package.json | Add to requirements.txt and document in README |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | Displays lesson title and metadata | ✅ Yes | Already implemented in LessonDetailPage |
| AC-2 | Renders all sections | ✅ Yes | Already implemented, needs markdown enhancement |
| AC-3 | Displays examples | ✅ Yes | Already implemented, needs highlighting |
| AC-4 | Navigation between sections | ✅ Yes | New feature - TOC and/or prev/next |
| AC-5 | Links to related lessons | ✅ Yes | New feature - needs backend check for data |

**AC Coverage Summary**: All 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Markdown rendering should support common formatting (bold, italics, lists, code)
- Section navigation should work on mobile devices
- Component should handle loading and error states gracefully (already in LessonDetailPage)
- Should maintain existing accessibility standards

---

## REASONS Canvas

### Requirements
From GitHub issue #44 acceptance criteria:
- Display lesson title and metadata
- Render all sections
- Display examples
- Navigation between sections
- Links to related lessons

Implicit requirements:
- Render markdown content (from features list)
- Section navigation (from features list)
- Example highlighting (from features list)
- Related lessons (from features list)

### Examples

**Concrete test cases:**
1. User views lesson "articles"
   - Title: "French Articles" displayed prominently
   - Topic: "Nouns and Adjectives" shown
   - Difficulty: "beginner" shown with color coding
   - All 6 sections displayed with proper markdown formatting
   - Examples in each section displayed with highlighting
   - TOC allows jumping to "Definite Articles" section

2. User views lesson with markdown formatting
   - Content with `*italic*` renders as italic
   - Content with `**bold**` renders as bold
   - Content with code blocks renders with monospace font and background
   - Lists render with proper bullet points/numbers

3. User uses section navigation
   - TOC shows all section titles
   - Clicking "Partitive Articles" jumps to that section
   - Current section is highlighted in TOC

4. User views related lessons
   - If lesson has related lessons, they appear at the bottom
   - Clicking a related lesson navigates to that lesson

### Architecture

**Existing codebase structure:**
```
frontend/src/
├── components/
│   ├── LessonBrowser.tsx    # Already implemented (issue #42)
│   ├── LessonCard.tsx       # Already implemented (issue #42)
│   ├── LessonSearch.tsx     # Already implemented (issue #42)
│   └── LessonViewer.tsx     # TO BE CREATED (issue #44)
├── pages/
│   ├── LessonPage.tsx       # Already implemented (issue #42)
│   └── LessonDetailPage.tsx # EXISTS, needs to use LessonViewer
├── types/index.ts           # Contains Lesson, LessonSection types
└── utils/api.ts             # Contains grammarApi client
```

**Design patterns to follow:**
- Reusable React components with TypeScript props
- CSS in separate files (global.css or component-specific)
- Test files co-located with components
- Storybook stories for component documentation
- API client functions in api.ts
- Error handling with try/catch and user-friendly messages

**Reference implementations:**
- LessonBrowser.tsx: Shows pattern for loading, filtering, error handling
- LessonCard.tsx: Shows pattern for displaying lesson summary data
- LessonDetailPage.tsx: Shows pattern for fetching and displaying single lesson

### Standards

**Coding standards:**
- PEP 8 equivalent for TypeScript (consistent with existing code)
- TypeScript interfaces for all props
- JSDoc comments for exported functions/components
- Consistent naming: PascalCase for components, camelCase for variables/functions
- Data fetching in page components, presentation in separate components

**Testing requirements:**
- 80%+ code coverage for new components
- Test loading, success, error, and empty states
- Test user interactions (clicking, scrolling, etc.)
- Use @testing-library/react and jest

**Documentation requirements:**
- JSDoc comments for all exported components/functions
- README.md update if new features affect setup/usage
- Storybook stories for reusable components
- SPDD artifacts (analysis and prompt documents)

### Omissions

**Explicitly out of scope:**
- Backend API changes (already implemented)
- Creating lesson content (data already exists)
- Authentication/authorization
- User progress tracking (issue #38)
- Interactive exercises
- Audio/video content
- Lesson editing/management

**Not implemented yet:**
- Related lessons in backend data structure (component should handle gracefully if absent)

### Notes

**Implementation hints:**
- Use `react-markdown` library for markdown rendering
- Consider `react-syntax-highlighter` for code block syntax highlighting
- Use CSS sticky positioning for TOC sidebar
- Consider using `IntersectionObserver` API for active section highlighting
- Look at existing lesson data in `data/grammar_lessons/` to understand content structure

**References to similar code:**
- LessonBrowser.tsx: Pattern for component structure and state management
- LessonCard.tsx: Pattern for displaying lesson data
- LessonDetailPage.tsx: Current implementation to be enhanced
- ChatInterface.tsx: Example of markdown-like rendering (message bubbles)

**Context:**
- This is a follow-up to issue #42 which created the browsing infrastructure
- LessonDetailPage already exists and provides basic viewing
- The focus is on enhancing the viewing experience with rich formatting and navigation
- Related lessons feature may require frontend computation if not in backend data

### Solutions

**Reference implementations to mimic:**
- `LessonCard.tsx`: How to display lesson metadata
- `LessonBrowser.tsx`: How to handle loading/error states at component level
- `LessonDetailPage.tsx`: Current lesson viewing implementation (to be refactored)

**Patterns to follow:**
- Separation of concerns: data fetching in pages, presentation in components
- Reusable components with clear props interfaces
- Consistent error handling and user feedback
- Accessible markup (semantic HTML, ARIA labels)

**Libraries to consider:**
- `react-markdown`: For markdown rendering
- `rehype-highlight` or `react-syntax-highlighter`: For code syntax highlighting
- `DOMPurify`: For sanitizing HTML if needed
- No new libraries for TOC or example highlighting (can be done with custom CSS/JS)

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
