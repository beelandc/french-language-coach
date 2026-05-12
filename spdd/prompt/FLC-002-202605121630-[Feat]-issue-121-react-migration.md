# SPDD Prompt: React SPA Migration (Issue #121)

**GitHub Issue**: #121
**Issue Title**: 1.5.0: Migrate frontend from vanilla JS to React SPA
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/121
**Artifact ID**: FLC-002-202605121630-[Feat]-issue-121-react-migration
**Created**: 2026-05-12 16:30
**Author**: Mistral Vibe (with human oversight)
**Related Analysis**: spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md

---

## Context

This prompt initiates the React SPA migration for the French Language Coach project. The current frontend uses vanilla HTML/CSS/JS in the `static/` directory. We need to create a React foundation that all future frontend development will build upon.

### Current Codebase State
- **Backend**: FastAPI with 3 main endpoints (`/sessions/`, `/sessions/{id}/messages/`, `/sessions/{id}/feedback/`)
- **Frontend**: Vanilla JS SPA in `static/` directory with 3 views (scenario-select, chat, feedback)
- **Architecture**: FastAPI serves static files from `/static/` route
- **API**: All endpoints return JSON, use POST method with JSON body

### Relevant Files
| File | Purpose | Key Elements |
|------|---------|---------------|
| `static/index.html` | Main HTML structure | 3 view divs (scenario-select, chat, feedback), basic structure |
| `static/app.js` | Application logic | 256 lines, state management, API calls, event listeners, DOM manipulation |
| `static/style.css` | Global styling | 299 lines, responsive design, component styles |
| `main.py` | FastAPI entry | Static files mount, redirect to /static/index.html |
| `scenarios.py` | Scenario data | 10 scenarios with difficulty levels, system prompts |
| `schemas/session.py` | API schemas | Pydantic models for request/response |

### Existing Patterns
- **State Management**: Module-level variables (`currentSessionId`, `currentScenarioId`, `sessionEnded`)
- **View Switching**: Manual classList.add/remove('active') on view divs
- **API Calls**: Direct fetch() to same-origin endpoints with JSON body
- **DOM Manipulation**: createElement, innerHTML, appendChild, addEventListener
- **Styling**: Global CSS with BEM-like class naming (`.btn-primary`, `.message.user`)

### Current Frontend Flow
```
Scenario Select View → Click scenario → startSession() → POST /sessions/ → Chat View
Chat View → Send message → POST /sessions/{id}/messages/ → Display response
Chat View → End Session → POST /sessions/{id}/feedback/ → Feedback View
Feedback View → New Session → Back to Scenario Select View
```

### Backend API Contract

**POST /sessions/**
- Request: `{ "scenario_id": "string" }`
- Response: `{ "id": "uuid", "scenario_id": "string", "created_at": "datetime" }`

**POST /sessions/{id}/messages/**
- Request: `{ "content": "string" }`
- Response: `{ "role": "assistant", "content": "string", "session_id": "uuid" }`

**POST /sessions/{id}/feedback/**
- Request: (none)
- Response: Feedback object with scores, strengths, focus_area, example_corrections

---

## Goal

**Primary Objective**: Create a React SPA foundation in `frontend/` directory that replicates all existing frontend functionality.

**Secondary Objectives**:
- Set up Vite + React + TypeScript project structure
- Configure React Router for SPA navigation
- Create TypeScript types matching backend API
- Build reusable React components for all UI elements
- Configure Vite to output to `static/` directory
- Set up development proxy for FastAPI API
- Maintain all existing functionality (scenario selection, chat, feedback)

---

## Constraints

### Architecture Constraints
- [ ] Must use Vite as build tool (not Create React App)
- [ ] Must use TypeScript (strict mode)
- [ ] Must use React Router v6 for navigation
- [ ] Must maintain backward compatibility with existing backend API
- [ ] Must not modify backend code (`main.py`, routers, models, schemas)
- [ ] Must keep existing `static/` files until migration complete
- [ ] Vite build output must go to `static/` directory

### Code Quality Constraints
- [ ] Must follow React best practices (functional components, hooks)
- [ ] Must use TypeScript interfaces for API types
- [ ] Must include PropTypes or TypeScript types for all components
- [ ] Must follow naming conventions (PascalCase components, camelCase variables)
- [ ] Must use CSS modules or global CSS (no inline styles)
- [ ] Must handle errors gracefully (try/catch for API calls)
- [ ] Must use async/await for API calls

### Testing Constraints
- [ ] Backend tests must continue to pass (80%+ coverage)
- [ ] Manual testing required for UI functionality
- [ ] Frontend testing setup is separate issue (#26)

### Acceptance Criteria (from Issue #121)
- [ ] React project initialized with Vite + TypeScript
- [ ] Directory structure: `src/components/`, `src/pages/`, `src/hooks/`, `src/utils/`, `src/types/`
- [ ] React Router v6 configured for SPA navigation
- [ ] Existing static frontend functionality ported:
  - [ ] Scenario selection
  - [ ] Chat interface
  - [ ] Feedback display
- [ ] Vite configured to output to `static/` directory
- [ ] Development server works with backend FastAPI API
- [ ] Production build served correctly by FastAPI
- [ ] All existing static assets (CSS, images) migrated

---

## Examples

### Current UI States

**1. Scenario Selection View**
```html
<div id="scenario-select" class="view active">
  <h2>Select a Conversation Scenario</h2>
  <div class="scenarios-grid" id="scenarios-list"></div>
</div>
```
- Displays grid of 10 scenario cards
- Each card has name and description
- Clicking a card starts a new session

**2. Chat View**
```html
<div id="chat" class="view hidden">
  <div class="chat-header">
    <button id="back-to-scenarios">Back</button>
    <h2 id="chat-scenario-name">Scenario</h2>
    <button id="end-session">End Session</button>
  </div>
  <div class="chat-messages" id="chat-messages"></div>
  <form id="message-form">
    <input type="text" id="message-input" placeholder="Type your message in French...">
    <button type="submit">Send</button>
  </form>
</div>
```
- Shows conversation messages (user and assistant)
- Form to send new messages
- Back button to return to scenarios
- End Session button to generate feedback

**3. Feedback View**
```html
<div id="feedback" class="view hidden">
  <div class="feedback-header">
    <h2>Session Feedback</h2>
    <button id="back-to-chat">Back to Chat</button>
    <button id="new-session">New Session</button>
  </div>
  <div class="feedback-content" id="feedback-content"></div>
</div>
```
- Displays 4 score cards (Grammar, Vocabulary, Fluency, Overall)
- Lists strengths as bullet points
- Shows focus area
- Shows example corrections (original, corrected, explanation)

### API Response Examples

**GET Scenarios (via scenarios.py import or API)**
```json
{
  "id": "cafe_order",
  "name": "Ordering at a Café",
  "description": "Practice ordering coffee..."
}
```

**POST /sessions/ Response**
```json
{
  "id": "a1b2c3d4-e5f6-7890",
  "scenario_id": "cafe_order",
  "created_at": "2026-05-12T10:00:00"
}
```

**POST /sessions/{id}/messages/ Response**
```json
{
  "role": "assistant",
  "content": "Bonjour ! Bienvenue au café Le Petit Matin. Que puis-je vous offrir ?",
  "session_id": "a1b2c3d4-e5f6-7890"
}
```

**POST /sessions/{id}/feedback/ Response**
```json
{
  "grammar_score": 85,
  "vocabulary_score": 78,
  "fluency_score": 82,
  "overall_score": 81,
  "strengths": ["Good use of polite phrases", "Correct verb conjugations"],
  "focus_area": "vocabulary breadth",
  "example_corrections": [
    {
      "original": "Je veux un café.",
      "corrected": "Je voudrais un café, s'il vous plaît.",
      "explanation": "More polite form for ordering"
    }
  ]
}
```

### Edge Cases
- Empty message submission (should not send API call)
- API call failures (should show error message)
- No scenarios loaded (should show loading/error state)
- Session not started (should redirect to scenario selection)
- Session already ended (should disable message input)

---

## Deliverables

### Phase 1: Project Setup (Priority: High)
- [ ] `frontend/package.json` - Dependencies and scripts
- [ ] `frontend/vite.config.js` - Vite configuration with proxy and build output
- [ ] `frontend/tsconfig.json` - TypeScript configuration
- [ ] `frontend/index.html` - Main HTML entry point
- [ ] `frontend/src/main.jsx` - App entry point
- [ ] `frontend/src/App.jsx` - Main app component with React Router

### Phase 2: Types and Utilities (Priority: High)
- [ ] `frontend/src/types/index.ts` - TypeScript interfaces for API types
- [ ] `frontend/src/types/scenario.ts` - Scenario type definitions
- [ ] `frontend/src/types/session.ts` - Session and message type definitions
- [ ] `frontend/src/types/feedback.ts` - Feedback type definitions
- [ ] `frontend/src/utils/api.ts` - API client utility
- [ ] `frontend/src/hooks/useApi.js` - Custom hook for API calls
- [ ] `frontend/src/hooks/useSessions.js` - Custom hook for session management

### Phase 3: Components (Priority: Medium)
- [ ] `frontend/src/components/ScenarioSelector.jsx` - Scenario grid component
- [ ] `frontend/src/components/ScenarioCard.jsx` - Individual scenario card
- [ ] `frontend/src/components/ChatInterface.jsx` - Chat container component
- [ ] `frontend/src/components/Message.jsx` - Individual message display
- [ ] `frontend/src/components/FeedbackView.jsx` - Feedback display component
- [ ] `frontend/src/components/ScoreCard.jsx` - Score display card
- [ ] `frontend/src/components/CorrectionItem.jsx` - Individual correction display
- [ ] `frontend/src/components/MessageForm.jsx` - Message input form
- [ ] `frontend/src/components/Header.jsx` - Chat header with buttons

### Phase 4: Pages (Priority: Medium)
- [ ] `frontend/src/pages/HomePage.jsx` - Scenario selection page
- [ ] `frontend/src/pages/ChatPage.jsx` - Chat page with messages
- [ ] `frontend/src/pages/FeedbackPage.jsx` - Feedback display page

### Phase 5: Styles (Priority: Medium)
- [ ] `frontend/src/styles/global.css` - Global styles (migrated from style.css)
- [ ] `frontend/src/styles/components.css` - Component-specific styles

### Phase 6: Configuration (Priority: High)
- [ ] `.eslintrc.js` - ESLint configuration
- [ ] `.prettierrc` - Prettier configuration
- [ ] Updated `main.py` - SPA fallback route for production
- [ ] Updated `README.md` - Frontend setup and build instructions

---

## Actual Prompt

### Prompt 1: Project Setup

```
Please help me set up the React project structure for issue #121: Migrate frontend from vanilla JS to React SPA.

CONTEXT:
- Project: French Language Coach (FastAPI backend + vanilla JS frontend)
- Current frontend: static/index.html, static/app.js, static/style.css
- Backend: FastAPI with endpoints at /sessions/, /sessions/{id}/messages/, /sessions/{id}/feedback/
- Goal: Create React SPA in frontend/ directory using Vite + TypeScript
- Reference: See spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md

GOAL:
- Create frontend/ directory with Vite + React + TypeScript
- Set up directory structure: src/components/, src/pages/, src/hooks/, src/utils/, src/types/
- Configure Vite to output to ../static/ directory
- Configure Vite proxy for FastAPI API endpoints

CONSTRAINTS:
- Must use Vite (not Create React App)
- Must use TypeScript with strict mode
- Must use React Router v6
- Must not modify any backend files
- Vite build output must go to ../static/ directory
- Proxy must forward /sessions/* and /static/* to http://localhost:8000

EXAMPLES:
Current structure:
static/
├── index.html
├── app.js
└── style.css

Target structure:
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
├── package.json
└── tsconfig.json

DELIVERABLES:
- frontend/package.json with dependencies
- frontend/vite.config.js with proxy and build config
- frontend/tsconfig.json with strict TypeScript
- Directory structure created
- Basic frontend/src/main.jsx and frontend/src/App.jsx files

Please provide:
1. Exact commands to run to create the project
2. Content for vite.config.js
3. Content for tsconfig.json
4. Basic content for main.jsx and App.jsx
5. Directory structure creation commands
```

**AI Response**: [To be captured after execution]

---

### Prompt 2: Type Definitions

```
Please create TypeScript type definitions for the French Language Coach API types.

CONTEXT:
- Backend API has endpoints for sessions, messages, feedback
- See schemas/session.py for Pydantic models
- See scenarios.py for scenario data structure
- Need TypeScript interfaces for all API request/response types

GOAL:
- Create frontend/src/types/index.ts with all type definitions
- Types should match backend API exactly
- Include types for: Scenario, Session, Message, Feedback, Correction

CONSTRAINTS:
- Use TypeScript interfaces
- Match backend schema field names and types
- Include optional fields where applicable
- Use proper TypeScript types (string, number, boolean, arrays, etc.)

EXAMPLES:
Backend Session model (from schemas/session.py):
- id: string (UUID)
- scenario_id: string
- created_at: string (datetime)
- ended_at: string (datetime) | null
- messages: array of Message
- feedback: Feedback | null

Backend Message model:
- id: string (UUID)
- session_id: string (UUID)
- role: "user" | "assistant"
- content: string
- created_at: string (datetime)

Backend Feedback model:
- grammar_score: number (0-100)
- vocabulary_score: number (0-100)
- fluency_score: number (0-100)
- overall_score: number (0-100)
- strengths: string[]
- focus_area: string
- example_corrections: Correction[]

Correction model:
- original: string
- corrected: string
- explanation: string

DELIVERABLES:
- frontend/src/types/index.ts with all type definitions
- frontend/src/types/scenario.ts (optional, if splitting)
- frontend/src/types/session.ts (optional, if splitting)
- frontend/src/types/feedback.ts (optional, if splitting)

Please provide:
1. Complete TypeScript type definitions
2. Proper imports/exports
3. TypeScript generics if needed for API responses
```

**AI Response**: [To be captured after execution]

---

### Prompt 3: API Utilities and Hooks

```
Please create API client utilities and custom hooks for the React frontend.

CONTEXT:
- Backend API endpoints: POST /sessions/, POST /sessions/{id}/messages/, POST /sessions/{id}/feedback/
- All endpoints return JSON responses
- All endpoints accept JSON request bodies
- Base URL in development: http://localhost:8000
- Base URL in production: same origin
- See types from frontend/src/types/index.ts

GOAL:
- Create frontend/src/utils/api.ts with API client
- Create frontend/src/hooks/useApi.js for generic API calls
- Create frontend/src/hooks/useSessions.js for session-specific operations

CONSTRAINTS:
- Use fetch() API (not axios)
- Must handle errors gracefully
- Must use async/await
- Must use TypeScript types from types/index.ts
- Must include proper error messages

EXAMPLES:
useSessions hook should provide:
- createSession(scenarioId: string): Promise<Session>
- sendMessage(sessionId: string, content: string): Promise<Message>
- getFeedback(sessionId: string): Promise<Feedback>

API client should:
- Handle JSON request/response
- Include error handling
- Support different HTTP methods

DELIVERABLES:
- frontend/src/utils/api.ts - Generic API client
- frontend/src/hooks/useApi.js - Generic API hook
- frontend/src/hooks/useSessions.js - Session-specific hook

Please provide:
1. Complete API client implementation
2. useApi hook implementation
3. useSessions hook implementation
4. Proper TypeScript typing
```

**AI Response**: [To be captured after execution]

---

### Prompt 4: Component Migration

```
Please help migrate the ScenarioSelector component from vanilla JS to React.

CONTEXT:
- Current implementation: static/app.js lines 40-52 (renderScenarios function)
- Current HTML: static/index.html lines 11-13 (scenarios-grid div)
- Current CSS: static/style.css lines 25-45 (scenario card styles)
- Scenarios data: Available via scenarios.py or GET request (TBD)

GOAL:
- Create frontend/src/components/ScenarioSelector.jsx
- Create frontend/src/components/ScenarioCard.jsx
- Port all functionality from vanilla JS

CONSTRAINTS:
- Must use functional components
- Must use TypeScript types from types/index.ts
- Must use CSS from migrated styles
- Must handle scenario click to start session
- Must display loading state if scenarios not loaded
- Must display error state if scenarios fail to load

EXAMPLES:
Current renderScenarios():
```javascript
function renderScenarios() {
  scenariosList.innerHTML = '';
  scenarios.forEach(scenario => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.innerHTML = `
      <h3>${scenario.name}</h3>
      <p>${scenario.description}</p>
    `;
    card.addEventListener('click', () => startSession(scenario.id));
    scenariosList.appendChild(card);
  });
}
```

Target ScenarioSelector component:
```tsx
function ScenarioSelector({ scenarios, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="scenarios-grid">
      {scenarios.map(scenario => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          onClick={() => onSelect(scenario.id)}
        />
      ))}
    </div>
  );
}
```

DELIVERABLES:
- frontend/src/components/ScenarioSelector.jsx
- frontend/src/components/ScenarioCard.jsx
- Proper TypeScript props typing

Please provide:
1. Complete ScenarioSelector component
2. Complete ScenarioCard component
3. Proper styling (CSS)
4. TypeScript type definitions for props
```

**AI Response**: [To be captured after execution]

---

## Human Review Notes

[To be completed after AI responses]

### Changes Made
- [ ] 

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] 

---

## Verification

**Checklist for Phase 1: Project Setup**
- [ ] frontend/ directory created
- [ ] package.json with correct dependencies
- [ ] vite.config.js with proxy and build config
- [ ] tsconfig.json with strict TypeScript
- [ ] Directory structure exists
- [ ] main.jsx and App.jsx created
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts development server

**Checklist for Phase 2: Types and Utilities**
- [ ] TypeScript types compile without errors
- [ ] API client handles all CRUD operations
- [ ] Hooks use TypeScript types correctly
- [ ] Error handling works correctly

**Checklist for Phase 3: Components**
- [ ] All components render correctly
- [ ] All components use proper TypeScript types
- [ ] All components handle user interactions
- [ ] Styles match original design

**Checklist for Phase 4: Integration**
- [ ] Development: Vite + FastAPI running together
- [ ] Production: Vite build + FastAPI serving static files
- [ ] All existing functionality works
- [ ] No console errors
- [ ] Responsive design maintained

**Checklist for Acceptance Criteria**
- [ ] React project initialized with Vite + TypeScript
- [ ] Directory structure created
- [ ] React Router v6 configured
- [ ] All frontend functionality ported
- [ ] Vite configured to output to static/
- [ ] Development server works with FastAPI
- [ ] Production build served correctly
- [ ] All static assets migrated

---

*SPDD Artifact - Prompt Phase*
*Related Analysis: FLC-002-202605121600-[Analysis]-issue-121-react-migration.md*
*GitHub Issue: #121*
