# FLC-002-202605121600-[Analysis]-issue-121-react-migration

**Issue**: #121 - 1.5.0: Migrate frontend from vanilla JS to React SPA
**Date**: 2026-05-12 16:00
**Author**: Mistral Vibe (with human oversight)
**Status**: Analysis Complete

---

## REASONS Canvas - Refined

### Requirements
**Source**: GitHub Issue #121, VISION.md, README.md, existing codebase

**Definition of Done Checklist:**
- [ ] React project initialized with Vite + TypeScript in `frontend/` directory
- [ ] Directory structure: `src/components/`, `src/pages/`, `src/hooks/`, `src/utils/`, `src/types/`
- [ ] React Router v6 configured for SPA navigation
- [ ] TypeScript configured with strict mode
- [ ] ESLint and Prettier configured
- [ ] Existing static frontend functionality ported:
  - [ ] Scenario selection (ScenarioSelector component)
  - [ ] Chat interface (ChatInterface component)
  - [ ] Feedback display (FeedbackView component)
  - [ ] Navigation between views
- [ ] Vite configured to output to `static/` directory
- [ ] Development server proxy configured for FastAPI API
- [ ] Production build served correctly by FastAPI
- [ ] All existing CSS styles migrated to React
- [ ] Build process documented in README.md
- [ ] 80% test coverage maintained (backend tests unchanged)

**Acceptance Criteria from Issue #121:**
- React project structure created
- All existing static frontend functionality ported
- Build process configured
- Development and production environments work correctly

### Examples

**Current State (Vanilla JS):**
```
static/
├── index.html      # Single HTML file with inline JS
├── style.css      # Global styles (299 lines)
└── app.js         # Vanilla JS with manual DOM manipulation (256 lines)
```

**Target State (React SPA):**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ScenarioSelector.jsx
│   │   ├── ChatInterface.jsx
│   │   ├── FeedbackView.jsx
│   │   ├── Message.jsx
│   │   ├── ScenarioCard.jsx
│   │   ├── ScoreCard.jsx
│   │   └── index.js
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ChatPage.jsx
│   │   └── FeedbackPage.jsx
│   ├── hooks/
│   │   ├── useApi.js
│   │   └── useSessions.js
│   ├── utils/
│   │   ├── api.js
│   │   └── helpers.js
│   ├── types/
│   │   └── index.ts
│   ├── App.jsx
│   ├── main.jsx
│   └── styles/
│       └── global.css
├── public/
│   └── (static assets if any)
├── vite.config.js
├── package.json
└── ...

static/
└── (Vite build output in production)
```

**Key Code Patterns from Current app.js:**
```javascript
// State management (module-level variables)
let currentSessionId = null;
let currentScenarioId = null;
let sessionEnded = false;

// DOM manipulation
scenarioSelectView.classList.add('active');
chatView.classList.remove('active');

// API calls
fetch(`${API_BASE}/sessions/`, { method: 'POST', ... })

// Event listeners
messageForm.addEventListener('submit', async (e) => { ... })
```

**Migration Mapping:**
| Vanilla JS | React Equivalent |
|------------|------------------|
| DOM queries | useRef, useState |
| DOM manipulation | JSX, conditional rendering |
| Event listeners | onClick, onSubmit props |
| Module state | useState, useReducer |
| Manual routing | React Router v6 |
| CSS classes | className, CSS modules |

### Architecture

**Current Architecture:**
```
┌─────────────────────────────────────────────┐
│              FastAPI Backend                 │
│  main.py (static files mount)                │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           Static Directory                    │
│  index.html + app.js + style.css              │
│  - Manual DOM manipulation                    │
│  - Custom view switching                      │
│  - Direct fetch() calls to backend           │
└─────────────────────────────────────────────┘
```

**Target Architecture:**
```
┌─────────────────────────────────────────────┐
│              FastAPI Backend                 │
│  main.py (static files + API endpoints)       │
└─────────────────────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐
│  Production (static/)│ │   Development        │
│  Vite build output   │ │   Vite dev server    │
└─────────────────────┘ │   (port 5173)        │
                        └────────┬──────────┘
                                 ▼
┌─────────────────────────────────────────────┐
│            React SPA                           │
│  - React Router for navigation                │
│  - Functional components with hooks          │
│  - TypeScript for type safety                 │
│  - Fetch API calls to FastAPI endpoints       │
└─────────────────────────────────────────────┘
```

**Reference Files:**
- `main.py` - FastAPI static files mount
- `static/index.html` - HTML structure
- `static/app.js` - Application logic
- `static/style.css` - Styling
- `scenarios.py` - Scenario data (will be fetched from API)
- `schemas/session.py` - API response schemas

### Standards

**Coding Standards:**
- React 18+ with functional components and hooks
- TypeScript with strict mode
- React Router v6 for navigation
- ESLint (Airbnb config) + Prettier
- CSS: Start with global.css port, consider CSS modules later
- State management: Local state first, context for shared state
- API calls: Custom hooks (useApi, useSessions)

**Project Structure Standards:**
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page-level components (routes)
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── styles/           # CSS files
│   ├── App.jsx           # Main app component
│   └── main.jsx          # App entry point
├── public/              # Static assets
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

**Naming Conventions:**
- PascalCase for components (ScenarioSelector.jsx)
- camelCase for variables and functions
- SCREAMING_SNAKE_CASE for constants
- kebab-case for file names (except components)

**Testing Standards:**
- Backend: Existing pytest tests remain unchanged
- Frontend: Testing setup in separate issue (#26)
- Manual testing required for UI functionality

### Omissions (Explicitly NOT in scope)

**Out of Scope for This Issue:**
- [ ] Backend API changes (already complete, do not modify)
- [ ] Specific React component implementation details (separate issues)
- [ ] Frontend testing setup (Issue #26 covers jest + MSW)
- [ ] PWA configuration (Issues #103, #104)
- [ ] Mobile responsiveness enhancements
- [ ] State management library (Zustand, Redux) - use local state first
- [ ] CSS framework (Tailwind) - start with vanilla CSS
- [ ] Internationalization (i18n)
- [ ] Authentication integration
- [ ] Error boundary components
- [ ] Performance optimization (code splitting, lazy loading)
- [ ] Analytics/tracking integration

**Future Issues Blocked by This:**
- Phase 1.5: #15, #17, #19, #21, #23, #24
- Phase 2-5: 20+ React component issues

**Dependencies:**
- Issue #26 (jest + MSW setup) - can be done in parallel
- No other hard dependencies

### Notes (Implementation Context)

**Reference Context:**
- VISION.md states: "Frontend: Vanilla HTML/CSS/JavaScript with multi-view navigation. Future: Consider lightweight framework (Svelte, Alpine.js)"
- .vibe/instructions.md specifies: "React (migrating from vanilla JS)" - React has been chosen as the framework
- Current frontend: Single-page app with 3 views (scenario-select, chat, feedback)
- Backend API: 3 main endpoints (sessions, messages, feedback) - already complete
- All scenario data available via API or can be imported from scenarios.py

**Technical Notes:**
1. Current app.js uses module-level variables for state - migrate to useState/useReducer
2. View switching uses classList.add/remove('active') - migrate to React Router
3. API_BASE = window.location.origin - configure proxy in Vite for development
4. All API endpoints are relative and work with same-origin requests
5. Current static files served from /static/ route in FastAPI
6. Need to configure Vite to output to ../static for production builds

**Design Decisions:**
- **Build Tool**: Vite chosen over CRA for faster builds and better DX
- **Language**: TypeScript for future type safety and maintainability
- **Routing**: React Router v6 for modern SPA routing
- **Styling**: Start with global.css port, refactor to CSS modules later
- **State**: Local state first, context for cross-component state
- **API Layer**: Custom hooks for API calls (useApi, useSessions)

**Integration Strategy:**
1. Create frontend/ directory with Vite + React + TypeScript
2. Set up project structure and configuration
3. Create type definitions matching backend schemas
4. Build API hook layer (useApi, useSessions)
5. Port components one by one:
   - ScenarioSelector (with scenarios grid)
   - ChatInterface (with messages, form)
   - FeedbackView (with scores, corrections)
6. Configure routing between views
7. Set up Vite build to output to static/
8. Update FastAPI to serve React build in production
9. Test development workflow (Vite + FastAPI running separately)
10. Test production build (Vite build + FastAPI serving static files)

**Risk Mitigation:**
- Keep existing static/ files until migration complete
- Use feature flags to switch between old/new frontend if needed
- Maintain backward compatibility with backend API
- Document migration steps for rollback if issues arise

**Resources:**
- Vite React Template: https://vitejs.dev/guide/
- React Router v6: https://reactrouter.com/
- TypeScript + React: https://create-react-app.dev/docs/adding-typescript/
- Vite Config: https://vitejs.dev/config/
- FastAPI Static Files: https://fastapi.tiangolo.com/tutorial/static-files/

### Solutions (Reference Implementations)

**Recommended Setup Commands:**
```bash
# Create React project with Vite + TypeScript
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install react-router-dom
npm install @types/react @types/react-dom --save-dev

# Install ESLint and Prettier
npm install eslint eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier eslint-plugin-prettier --save-dev
```

**Vite Configuration (vite.config.js):**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/sessions': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    }
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})
```

**TypeScript Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Main FastAPI Update (main.py):**
```python
# For development: No changes needed, Vite runs separately
# For production: Ensure static files are served
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

# Add fallback for SPA routing
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return RedirectResponse(url="/static/index.html")
```

**Directory Structure Creation:**
```bash
# From project root
mkdir -p frontend/src/{components,pages,hooks,utils,types,styles}
mkdir -p frontend/public
```

---

## Analysis Summary

This is a **CRITICAL PREREQUISITE** issue that blocks 20+ future React component issues. The migration from vanilla JS to React SPA requires:

1. **Project Setup** (High Priority): Initialize Vite + React + TypeScript
2. **Configuration** (High Priority): Vite build to static/, proxy setup, ESLint/Prettier
3. **Architecture** (High Priority): Directory structure, React Router, type definitions
4. **Component Migration** (Medium Priority): Port existing functionality to React components
5. **Integration** (High Priority): FastAPI serving, development workflow

**Estimated Complexity**: High (infrastructure change affecting entire frontend)
**Estimated Effort**: 8-12 hours (spread across multiple sessions)
**Priority**: P1 (High Priority - blocks Phase 1.5 and beyond)

**Next Steps:**
1. Create frontend/ directory with Vite + React + TypeScript
2. Set up directory structure and configuration files
3. Create type definitions and API hooks
4. Port components incrementally
5. Configure build and test integration

---

*Generated by Mistral Vibe for French Language Coach Project*
*SPDD Artifact - Analysis Phase Complete*
