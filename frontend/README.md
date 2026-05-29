# French Language Coach - React Frontend

React SPA frontend for the French Language Coach project.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ChatInterface.tsx
│   │   ├── FeedbackView.tsx  # Includes PDF export button
│   │   ├── ScenarioSelector.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── CorrectionItem.tsx
│   │   ├── ScenarioCard.tsx
│   │   ├── *.stories.tsx  # Storybook stories
│   │   └── index.ts
│   ├── pages/            # Page-level components (routes)
│   │   ├── ChatPage.tsx
│   │   ├── FeedbackPage.tsx
│   │   └── HomePage.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useSessions.tsx
│   ├── utils/            # Utility functions and Storybook mocks
│   │   ├── api.ts
│   │   ├── pdfExport.ts   # PDF generation utility (Issue #23)
│   │   └── storybookMocks.tsx
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/           # CSS files
│   │   └── global.css
│   ├── App.tsx           # Main app component with React Router
│   └── main.tsx          # App entry point
├── cypress/             # E2E Test Framework (Issue #27)
│   ├── config/
│   │   └── cypress.config.ts  # Cypress configuration
│   ├── e2e/
│   │   └── conversation-flow.cy.ts  # E2E test for conversation flow
│   ├── fixtures/
│   │   └── test-data.json  # Test data fixtures
│   └── support/
│       ├── commands.ts   # Custom Cypress commands
│       └── index.ts       # Support file with type definitions
├── .storybook/           # Storybook configuration
│   ├── main.ts           # Storybook main configuration
│   └── preview.tsx       # Storybook preview configuration
├── public/              # Static assets
├── vite.config.ts        # Vite configuration
├── cypress.config.ts    # Cypress root configuration
├── package.json          # Dependencies
└── tsconfig.app.json    # TypeScript configuration
```

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
cd frontend
npm install
```

### Run Development Server
```bash
npm run dev
```

The Vite dev server runs on **port 5173** with:
- Hot module replacement (HMR)
- Proxy to FastAPI backend at `http://localhost:8000` for API endpoints (`/sessions/*`)

### Run with FastAPI Backend
1. Start FastAPI backend:
   ```bash
   uvicorn main:app --reload
   ```
2. In another terminal, start Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Production Build

### Build for Production
```bash
npm run build
```

Builds the React app to the `../static/` directory (configured in `vite.config.ts`).

### Serve with FastAPI
The FastAPI backend already serves static files from the `static/` directory. After building:
1. Run FastAPI:
   ```bash
   uvicorn main:app
   ```
2. Open [http://localhost:8000](http://localhost:8000) - FastAPI will serve the React app

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm run storybook` | Start Storybook dev server at http://localhost:6006 |
| `npm run build-storybook` | Build Storybook for deployment |
| `npm run e2e` | Open Cypress Test Runner (GUI) |
| `npm run e2e:run` | Run Cypress tests headlessly |
| `npm run e2e:run:headed` | Run Cypress tests with browser visible |
| `npm run e2e:run:ci` | Run Cypress tests for CI environment |

## E2E Testing with Cypress (Issue #27)

This project uses **Cypress** for end-to-end testing to validate the complete user journey through the application.

### Setup

Cypress is already installed as a dev dependency. No additional setup is required.

### Running Tests

#### Development Mode (GUI)
Open the Cypress Test Runner to interactively run and debug tests:

```bash
npm run e2e
```

This opens the Cypress GUI where you can:
- See all test specs
- Click on tests to run them
- View test results in real-time
- Debug failing tests

#### Headless Mode
Run all tests without opening the browser:

```bash
npm run e2e:run
```

#### Headed Mode (Visible Browser)
Run tests with the browser visible (useful for debugging):

```bash
npm run e2e:run:headed
```

#### CI Mode
Run tests in CI-compatible mode (headless, with specific browser):

```bash
npm run e2e:run:ci
```

### Test Organization

```
cypress/
├── config/
│   └── cypress.config.ts      # Cypress configuration
├── e2e/
│   └── conversation-flow.cy.ts # Main E2E test spec (Issue #27)
├── fixtures/
│   └── test-data.json          # Test data fixtures
└── support/
    ├── commands.ts             # Custom commands
    └── index.ts               # Support file with type definitions
```

### Current Tests

**Issue #27: E2E-1.5: E2E test conversation flow**

All 7 acceptance criteria are tested:

| AC # | Description | Status |
|------|-------------|--------|
| AC-1 | Test scenario selection | ✅ |
| AC-2 | Test starting a session | ✅ |
| AC-3 | Test sending multiple messages | ✅ |
| AC-4 | Test receiving AI responses | ✅ |
| AC-5 | Test ending session | ✅ |
| AC-6 | Test feedback display | ✅ |
| AC-7 | Test runs in CI | ✅ |

### Test Structure

The main test file `cypress/e2e/conversation-flow.cy.ts` tests:

1. **Scenario Selection**: Navigating from home page to chat page
2. **Session Creation**: Verifying POST /sessions/ API call
3. **Message Sending**: Sending multiple messages with AI responses
4. **Session Ending**: Ending session and navigating to feedback
5. **Feedback Display**: Verifying all feedback components render correctly
6. **Complete Flow**: End-to-end test of the entire conversation journey

### Custom Commands

Cypress custom commands for easier test writing:

| Command | Description |
|---------|-------------|
| `cy.selectScenario(scenarioId)` | Select a scenario by ID |
| `cy.sendMessage(content)` | Type and send a message |
| `cy.endSession()` | Click the end session button |
| `cy.getFeedbackScore(scoreType)` | Get a specific score element |
| `cy.shouldBeOnPage(page)` | Verify current page |
| `cy.waitForLoadingComplete()` | Wait for loading to finish |
| `cy.mockSessionCreation()` | Mock session creation API |
| `cy.mockMessageResponse()` | Mock message sending API |
| `cy.mockFeedbackResponse()` | Mock feedback API |

### API Mocking

Tests use `cy.intercept()` to mock API responses for deterministic testing:

```typescript
// Example: Mock session creation
cy.intercept('POST', '/sessions/', {
  id: 1,
  scenario_id: 'cafe_order',
  created_at: '2024-01-01T00:00:00Z',
}).as('createSession')

// Later in test
cy.wait('@createSession')
```

### Data Test IDs

Components have `data-testid` attributes for stable selectors:

- `home-page` - Home page container
- `chat-page` - Chat page container
- `feedback-page` - Feedback page container
- `scenario-{id}` - Individual scenario card
- `message-input` - Chat message input field
- `send-button` - Send message button
- `end-session-button` - End session button
- `chat-interface` - Chat interface container
- `feedback-view` - Feedback view container
- `grammar-score`, `vocabulary-score`, etc. - Individual score displays

### CI Integration

For CI/CD pipelines, use:

```bash
npm run e2e:run:ci
```

Or configure GitHub Actions workflow:

```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run e2e:run
```

### Configuration

Cypress is configured in `cypress.config.ts`:

- **Base URL**: http://localhost:5173 (Vite dev server)
- **Browser**: Chrome
- **Port**: 5173 (matches Vite)
- **TypeScript**: Enabled with path aliases
- **Timeouts**: Configured for reliable testing

### Best Practices

1. **Use `data-testid` selectors** for stable tests
2. **Mock API responses** for deterministic tests
3. **Keep tests independent** - each test should set up its own state
4. **Use custom commands** for reusable actions
5. **Test user journeys** not just individual features
6. **Keep tests fast** - aim for < 5 minutes total runtime

### Troubleshooting

**Issue: Tests fail with "Cannot read properties of null (reading 'call')"**
- Solution: Ensure the Vite dev server is running (`npm run dev`)
- Cypress needs the app to be running at http://localhost:5173

**Issue: API calls are not being intercepted**
- Solution: Check that the URL pattern matches exactly
- Use `cy.intercept('POST', '/sessions/')` not `cy.intercept('POST', 'sessions/')`

**Issue: Tests are flaky**
- Solution: Use `cy.wait()` or `cy.wait('@alias')` to wait for async operations
- Avoid arbitrary timeouts - wait for specific conditions

### Related Files

- **Cypress Config**: `cypress.config.ts`
- **TypeScript Config**: `cypress/tsconfig.json`
- **Tests**: `cypress/e2e/conversation-flow.cy.ts`
- **Fixtures**: `cypress/fixtures/test-data.json`
- **Commands**: `cypress/support/commands.ts`
- **Support**: `cypress/support/index.ts`

### SPDD Artifacts

- **Analysis**: `spdd/analysis/FLC-016-202605211712-[Analysis]-issue-27-e2e-conversation-flow.md`
- **Prompt**: `spdd/prompt/FLC-016-202605211725-[Feat]-issue-27-e2e-conversation-flow.md`
- **GitHub Issue**: #27

## Storybook

This project uses [Storybook](https://storybook.js.org/) for component documentation, testing, and development.

### Running Storybook

To start the Storybook development server:

```bash
npm run storybook
```

Storybook will be available at **http://localhost:6006**

### Features

- **Component Documentation**: All components have stories with prop documentation
- **Autodocs**: Automatic documentation generation for components
- **Accessibility**: Built-in a11y testing (via @storybook/addon-a11y)
- **Vitest Integration**: Test stories with Vitest (via @storybook/addon-vitest)

### Project Components

All components in `src/components/` have corresponding Storybook stories:

| Component | Story File | Description |
|-----------|------------|-------------|
| ScenarioSelector | `ScenarioSelector.stories.tsx` | Grid of scenario cards for selection |
| ScenarioCard | `ScenarioCard.stories.tsx` | Individual scenario card |
| ChatInterface | `ChatInterface.stories.tsx` | Chat UI with messages and input |
| MessageBubble | `MessageBubble.stories.tsx` | Individual message display |
| ChatHeader | `ChatHeader.stories.tsx` | Chat header with controls |
| FeedbackView | `FeedbackView.stories.tsx` | Session feedback display |
| ScoreCard | `ScoreCard.stories.tsx` | Score display component |
| CorrectionItem | `CorrectionItem.stories.tsx` | Individual correction display |

### Adding New Stories

When creating a new component:

1. Create the component file (e.g., `MyComponent.tsx`)
2. Create a story file (e.g., `MyComponent.stories.tsx`)
3. Use Component Story Format 3 (CSF3)
4. Include `tags: ['autodocs']` for automatic documentation
5. Document all props using `argTypes`
6. Add multiple story variants (Default, Loading, Error, etc.)

**Example Story Template:**

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import MyComponent from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    // Document your props here
    myProp: {
      description: 'Description of the prop',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Default prop values
    myProp: 'default value',
  },
}

export const Variant: Story = {
  args: {
    myProp: 'variant value',
  },
}
```

### Mocking Context

Components that use hooks (like `useSessions`) require mock context providers in stories. Use the `MockSessionsProvider` from `utils/storybookMocks.tsx`:

```typescript
import { MockSessionsProvider } from '../utils/storybookMocks'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  decorators: [
    (Story) => (
      <MockSessionsProvider initialSessions={[mockSession]}>
        <Story />
      </MockSessionsProvider>
    ),
  ],
}
```

### Related Files

- Storybook configuration: `.storybook/main.ts` and `.storybook/preview.tsx`
- Mock utilities: `src/utils/storybookMocks.tsx`
- Component types: `src/types/index.ts`

## SPDD Artifacts

- Analysis: `spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md`
- Prompt: `spdd/prompt/FLC-002-202605121630-[Feat]-issue-121-react-migration.md`
- GitHub Issue: #121

## Storybook SPDD Artifacts

- Analysis: `spdd/analysis/FLC-003-202605140812-[Analysis]-issue-133-storybook.md`
- Prompt: `spdd/prompt/FLC-003-202605140830-[Feat]-issue-133-storybook.md`
- GitHub Issue: #133

## TypeScript Configuration

- Strict mode enabled
- Path aliases: `@/*` maps to `src/*`
- ES2023 target
- JSX: react-jsx

## Vite Configuration

- Proxy: API endpoints (`/sessions/*`, `/static/*`) are proxied to `http://localhost:8000`
- Build output: `../static/` directory
- Port: 5173

## Related Files

- **Backend API**: See `routers/sessions.py`, `routers/messages.py`, `routers/feedback.py`
- **Schemas**: See `schemas/session.py`
- **Scenarios**: See `scenarios.py`

## Features

### PDF Export (Issue #23)

The FeedbackView component includes a **PDF Export** feature that allows users to download their feedback reports as PDF files for offline review and sharing.

#### How it works:
1. User views feedback in the FeedbackView component
2. User clicks the "Export to PDF" button
3. The `generateFeedbackPDF` utility function creates a jsPDF document containing:
   - Session ID and generation date
   - All four score categories (Grammar, Vocabulary, Fluency, Overall)
   - Complete list of strengths
   - Focus area for improvement
   - All example corrections with original, corrected, and explanation text
4. PDF automatically downloads with filename: `french-coach-feedback-{sessionId}-{date}-{time}.pdf`

#### Technical Details:
- **Library**: jsPDF v2.5.1 (client-side PDF generation)
- **Implementation**: `frontend/src/utils/pdfExport.ts`
- **Component Integration**: `frontend/src/components/FeedbackView.tsx`
- **Features**:
  - A4 portrait format
  - Automatic pagination for long content
  - UTF-8 support for French characters (é, è, ê, à, ç, etc.)
  - Loading state during PDF generation
  - Error handling with user feedback
  - Dynamic import to reduce initial bundle size
  - Cross-browser compatible (Chrome, Firefox, Safari, Edge)

#### Usage:
```typescript
import { generateFeedbackPDF } from './utils/pdfExport';

// Generate and download PDF from feedback data
await generateFeedbackPDF(feedback, sessionId);
```

## SPDD Artifacts

- Analysis: `spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md`
- Prompt: `spdd/prompt/FLC-002-202605121630-[Feat]-issue-121-react-migration.md`
- GitHub Issue: #121

### PDF Export Feature (Issue #23)
- Analysis: `spdd/analysis/FLC-015-202605211800-[Analysis]-issue-23-pdf-export.md`
- Prompt: `spdd/prompt/FLC-015-202605211830-[Feat]-issue-23-pdf-export.md`
- GitHub Issue: #23
