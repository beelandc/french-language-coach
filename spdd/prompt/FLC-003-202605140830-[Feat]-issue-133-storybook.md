# FLC-003-202605140830-[Feat]-issue-133-storybook

**Issue**: #133 - Add Storybook for component documentation
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/133
**Artifact ID**: FLC-003-202605140830
**Related Analysis**: FLC-003-202605140812-[Analysis]-issue-133-storybook.md
**Created**: 2026-05-14 08:30
**Author**: Mistral Vibe
**Type**: Feature Implementation
**Status**: Ready for Execution

---

## Context

### Current State

The French Language Coach frontend (React 19 + TypeScript + Vite) has completed migration from vanilla JavaScript (Issue #121). The component library includes:

**Main Components (3):**
- `ScenarioSelector.tsx` - Displays scenario cards, handles selection
- `ChatInterface.tsx` - Manages chat messages and input
- `FeedbackView.tsx` - Displays session feedback with scores

**Sub-components (5):**
- `ScenarioCard.tsx` - Individual scenario card
- `MessageBubble.tsx` - Single message display
- `ChatHeader.tsx` - Chat header with controls
- `ScoreCard.tsx` - Score display component
- `CorrectionItem.tsx` - Individual correction display

**Project Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ScenarioSelector.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── FeedbackView.tsx
│   │   ├── ScenarioCard.tsx (needs to be extracted)
│   │   ├── MessageBubble.tsx (needs to be extracted)
│   │   ├── ChatHeader.tsx (needs to be extracted)
│   │   ├── ScoreCard.tsx (needs to be extracted)
│   │   └── CorrectionItem.tsx (needs to be extracted)
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── styles/
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

**Current Dependencies:**
- React 19.2.6
- React DOM 19.2.6
- React Router DOM 7.15.0
- TypeScript 6.0.2
- Vite 8.0.12

### Goal

Install and configure Storybook, then create stories for all existing components with proper documentation (props, examples, usage notes).

### Constraints

1. **Must use**: Storybook 8.x (latest stable)
2. **Must integrate with**: Vite (matching main app build tool)
3. **Must support**: TypeScript
4. **Must work with**: React Router v6 (components use useNavigate)
5. **Must work with**: Custom hooks (components use useSessions)
6. **Path aliases**: Use @/* alias for imports
7. **Global styles**: Import global.css in preview
8. **File naming**: `{ComponentName}.stories.tsx` co-located with components

---

## Prompt Engineering

### Prompt 1: Extract Sub-components

**Before Storybook setup, we need to extract the sub-components from the main component files.**

Currently:
- `ScenarioCard` is defined inside `ScenarioSelector.tsx`
- `MessageBubble` and `ChatHeader` are defined inside `ChatInterface.tsx`
- `ScoreCard` and `CorrectionItem` are defined inside `FeedbackView.tsx`

**Task**: Extract these into separate files.

**CONTEXT:**
- Frontend directory: `frontend/`
- Components directory: `frontend/src/components/`
- Current files: ScenarioSelector.tsx, ChatInterface.tsx, FeedbackView.tsx contain nested components

**GOAL:**
Extract nested components into separate files:
1. `frontend/src/components/ScenarioCard.tsx` from ScenarioSelector.tsx
2. `frontend/src/components/MessageBubble.tsx` from ChatInterface.tsx
3. `frontend/src/components/ChatHeader.tsx` from ChatInterface.tsx
4. `frontend/src/components/ScoreCard.tsx` from FeedbackView.tsx
5. `frontend/src/components/CorrectionItem.tsx` from FeedbackView.tsx
6. Update imports in parent components
7. Update component index.ts exports

**CONSTRAINTS:**
- Preserve existing functionality
- Maintain TypeScript type safety
- Use same directory structure
- Export from index.ts

**EXAMPLES:**

**Before (ScenarioSelector.tsx):**
```typescript
interface ScenarioCardProps {
  scenario: Scenario
  onClick: () => void
}

function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (...)
}

export default function ScenarioSelector() {
  // uses ScenarioCard
}
```

**After:**
```typescript
// ScenarioCard.tsx
export interface ScenarioCardProps {
  scenario: Scenario
  onClick: () => void
}

export default function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (...)
}

// ScenarioSelector.tsx
import ScenarioCard from './ScenarioCard'

export default function ScenarioSelector() {
  // uses <ScenarioCard ... />
}

// components/index.ts
export { default as ScenarioCard } from './ScenarioCard'
```

**DELIVERABLES:**
- 5 new component files in `frontend/src/components/`
- Updated parent component files with imports
- Updated `frontend/src/components/index.ts`

---

### Prompt 2: Install and Configure Storybook

**CONTEXT:**
- Frontend is React 19 + TypeScript + Vite
- Need Storybook 8.x with Vite builder
- Project uses path aliases (@/*)
- Components use React Router hooks

**GOAL:**
Install Storybook and configure it to work with the project.

**REQUIREMENTS:**
1. Install Storybook packages as devDependencies
2. Create `.storybook/` directory with configuration files
3. Configure main.ts for Vite + TypeScript
4. Configure preview.ts with global styles and decorators
5. Add Storybook scripts to package.json
6. Handle path alias resolution

**COMMAND:**
```bash
cd frontend
npx storybook@latest init --builder=vite --type=react
```

**EXPECTED DEPENDENCIES:**
```json
{
  "devDependencies": {
    "@storybook/addon-essentials": "^8.x",
    "@storybook/addon-links": "^8.x",
    "@storybook/blocks": "^8.x",
    "@storybook/react": "^8.x",
    "@storybook/react-vite": "^8.x",
    "@storybook/testing-library": "^8.x"
  }
}
```

**EXPECTED CONFIGURATION:**

`.storybook/main.ts`:
```typescript
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
}

export default config
```

`.storybook/preview.ts`:
```typescript
import type { Preview } from '@storybook/react'
import '../src/styles/global.css'
import { MemoryRouter } from 'react-router-dom'

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
```

**PACKAGE.JSON SCRIPTS:**
```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

**DELIVERABLES:**
- `.storybook/main.ts`
- `.storybook/preview.ts`
- Updated `frontend/package.json` with Storybook scripts and dependencies

---

### Prompt 3: Create Component Stories

**CONTEXT:**
- All components are in `frontend/src/components/`
- Sub-components have been extracted to separate files
- Storybook is installed and configured
- Need to create stories for all 8 components

**GOAL:**
Create `.stories.tsx` files for each component with:
- Component meta configuration
- Type-safe args
- argTypes documentation
- Multiple story variants
- Usage examples

**REQUIREMENTS:**
- Use Component Story Format 3 (CSF3)
- Type all story args using TypeScript
- Include argTypes for all props
- Add descriptive JSDoc comments
- Include at least 2 story variants per component

**COMPONENTS TO DOCUMENT:**

1. **ScenarioSelector** (`ScenarioSelector.stories.tsx`)
   - Props: none (uses internal state)
   - Variants: Default, Loading, Error, Empty
   - Notes: Uses useSessions hook - needs mock

2. **ScenarioCard** (`ScenarioCard.stories.tsx`)
   - Props: scenario, onClick
   - Variants: Default, Hover (simulated)
   - Notes: Simple presentational component

3. **ChatInterface** (`ChatInterface.stories.tsx`)
   - Props: sessionId
   - Variants: With messages, Empty, Loading, Ended session
   - Notes: Uses useSessions hook - needs mock context

4. **MessageBubble** (`MessageBubble.stories.tsx`)
   - Props: message (role, content, id)
   - Variants: User message, AI message
   - Notes: Simple presentational component

5. **ChatHeader** (`ChatHeader.stories.tsx`)
   - Props: scenarioName, onBack, onEndSession, disabled
   - Variants: Default, Disabled
   - Notes: Simple presentational component

6. **FeedbackView** (`FeedbackView.stories.tsx`)
   - Props: sessionId
   - Variants: With feedback, Loading, Error, No feedback
   - Notes: Uses useSessions hook - needs mock context

7. **ScoreCard** (`ScoreCard.stories.tsx`)
   - Props: label, value
   - Variants: Different scores (0-100)
   - Notes: Simple presentational component

8. **CorrectionItem** (`CorrectionItem.stories.tsx`)
   - Props: correction (original, corrected, explanation)
   - Variants: Default
   - Notes: Simple presentational component

**EXAMPLE STORY TEMPLATE:**

`ScenarioCard.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import ScenarioCard from './ScenarioCard'
import type { Scenario } from '@/types'

const meta: Meta<typeof ScenarioCard> = {
  title: 'Components/ScenarioCard',
  component: ScenarioCard,
  tags: ['autodocs'],
  argTypes: {
    scenario: {
      description: 'The scenario data to display',
      type: { required: true },
      table: {
        type: { summary: 'Scenario' },
      },
    },
    onClick: {
      description: 'Callback function when the card is clicked',
      action: 'clicked',
      table: {
        type: { summary: 'function' },
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

const mockScenario: Scenario = {
  id: 'cafe_order',
  name: 'Ordering at a Café',
  description: 'Practice ordering coffee, pastries, and asking about menu items in a Parisian café.',
}

export const Default: Story = {
  args: {
    scenario: mockScenario,
  },
}

export const LongDescription: Story = {
  args: {
    scenario: {
      ...mockScenario,
      description: 'This is a much longer description that tests how the component handles wrapping text. It should properly display multiple lines of text while maintaining the card layout.',
    },
  },
}
```

**MORE COMPLEX EXAMPLE (ChatInterface):**

`ChatInterface.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import ChatInterface from './ChatInterface'
import type { Session, Message } from '@/types'

// Mock useSessions hook
const mockSessions: Session[] = [
  {
    id: 'mock-session-1',
    scenario_id: 'cafe_order',
    messages: [
      { id: '1', role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?' },
      { id: '2', role: 'user', content: 'Je voudrais un café s\'il vous plaît.' },
      { id: '3', role: 'assistant', content: 'Quel type de café préférez-vous ?' },
    ],
  },
]

const meta: Meta<typeof ChatInterface> = {
  title: 'Components/ChatInterface',
  component: ChatInterface,
  tags: ['autodocs'],
  argTypes: {
    sessionId: {
      description: 'The ID of the session to display',
      type: { required: true },
      table: {
        type: { summary: 'string' },
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof meta>

export const WithMessages: Story = {
  args: {
    sessionId: 'mock-session-1',
  },
  // In a real implementation, we'd mock the useSessions hook
  // This requires a custom decorator or wrapper component
}

export const EmptySession: Story = {
  args: {
    sessionId: 'empty-session',
  },
}
```

**DELIVERABLES:**
- 8 `.stories.tsx` files (one per component)
- All stories use TypeScript
- All stories include argTypes
- All stories include at least 2 variants

---

### Prompt 4: Create Mock Context Decorators

**CONTEXT:**
- Components use custom hooks (useSessions)
- Components use React Router hooks (useNavigate, useParams)
- Storybook needs these hooks to be available in stories

**GOAL:**
Create mock context providers for useSessions hook so components can be tested in isolation.

**REQUIREMENTS:**
1. Create mock implementation of useSessions hook
2. Create SessionsContext wrapper for stories
3. Configure in preview.ts or per-story decorators

**EXAMPLE:**

Create `frontend/src/utils/storybookMocks.tsx`:
```typescript
import { useSessions as useRealSessions } from '../hooks/useSessions'
import type { UseSessionsReturn, Session, Feedback } from '../types'

export interface MockSessionsConfig {
  sessions?: Session[]
  currentScenarioId?: string | null
  sessionEnded?: boolean
  isLoading?: boolean
  error?: string | null
  createSession?: () => Promise<string>
  sendMessage?: (sessionId: string, content: string) => Promise<void>
  getFeedback?: (sessionId: string) => Promise<Feedback | null>
}

export function createMockUseSessions(config: MockSessionsConfig = {}): UseSessionsReturn {
  const defaultSessions: Session[] = []
  const defaultFeedback: Feedback = {
    session_id: 'mock-session',
    grammar_score: 85,
    vocabulary_score: 90,
    fluency_score: 75,
    overall_score: 83,
    strengths: ['Good vocabulary usage', 'Natural phrasing'],
    focus_area: 'grammar',
    example_corrections: [],
  }

  return {
    sessions: config.sessions || defaultSessions,
    currentScenarioId: config.currentScenarioId ?? null,
    sessionEnded: config.sessionEnded ?? false,
    isLoading: config.isLoading ?? false,
    error: config.error ?? null,
    createSession: config.createSession ?? (async () => 'mock-session-id'),
    sendMessage: config.sendMessage ?? (async () => {}),
    getFeedback: config.getFeedback ?? (async () => defaultFeedback),
  }
}

// Mock provider component
export function MockSessionsProvider({
  children,
  config,
}: {
  children: React.ReactNode
  config?: MockSessionsConfig
}) {
  // In a real implementation, we'd use a context provider
  // For simplicity, we'll just render children
  // The actual mocking would be done via jest.mock or similar
  return <>{children}</>
}
```

**USAGE IN STORIES:**

In `.storybook/preview.ts`:
```typescript
import { MockSessionsProvider } from '../src/utils/storybookMocks'

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <MockSessionsProvider>
          <Story />
        </MockSessionsProvider>
      </MemoryRouter>
    ),
  ],
}
```

**ALTERNATIVE: Per-story mocking**

For simpler cases, mock directly in story:
```typescript
import { useSessions } from '@/hooks/useSessions'

// Mock the hook
jest.mock('@/hooks/useSessions', () => ({
  useSessions: () => ({
    sessions: [mockSession],
    currentScenarioId: 'cafe_order',
    sessionEnded: false,
    isLoading: false,
    error: null,
    createSession: async () => 'mock-id',
    sendMessage: async () => {},
    getFeedback: async () => mockFeedback,
  }),
}))
```

**DELIVERABLES:**
- `frontend/src/utils/storybookMocks.tsx` (optional, if needed)
- Updated preview.ts with necessary decorators
- Working stories that don't crash due to missing hooks

---

### Prompt 5: Update Documentation

**CONTEXT:**
- Storybook is installed and configured
- Stories are created for all components
- Need to document how to use Storybook

**GOAL:**
Update README.md files with Storybook instructions.

**REQUIREMENTS:**
1. Update `frontend/README.md` with Storybook section
2. Document setup, running, and usage
3. Add component development workflow

**EXPECTED CONTENT:**

In `frontend/README.md`:

```markdown
## Storybook

This project uses [Storybook](https://storybook.js.org/) for component documentation and testing.

### Setup

Storybook is automatically installed as a dev dependency. No additional setup is required.

### Running Storybook

To start the Storybook development server:

```bash
npm run storybook
```

Storybook will be available at http://localhost:6006

### Adding Stories

Every new component should have a corresponding story file. Create a `{ComponentName}.stories.tsx` file alongside your component:

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import MyComponent from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    // Document your props here
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Default prop values
  },
}
```

### Storybook Scripts

| Script | Description |
|--------|-------------|
| `npm run storybook` | Start Storybook dev server |
| `npm run build-storybook` | Build Storybook for deployment |

### Tips

- Use `tags: ['autodocs']` to enable automatic documentation
- Document all props using `argTypes`
- Include multiple story variants (Default, Loading, Error, etc.)
- Use decorators for required context (Router, providers)

### Component Checklist

When creating a new component:

- [ ] Component file created
- [ ] Story file created
- [ ] Props typed with TypeScript
- [ ] Props documented in argTypes
- [ ] Multiple story variants included
- [ ] Component exported from index.ts
```

**DELIVERABLES:**
- Updated `frontend/README.md` with Storybook section

---

## Execution Plan

### Phase 1: Extract Sub-components (30 min)
1. Extract ScenarioCard from ScenarioSelector.tsx
2. Extract MessageBubble and ChatHeader from ChatInterface.tsx
3. Extract ScoreCard and CorrectionItem from FeedbackView.tsx
4. Update all imports
5. Update index.ts exports
6. Verify no regressions

### Phase 2: Install Storybook (30 min)
1. Run `npx storybook@latest init --builder=vite --type=react`
2. Verify installation
3. Configure main.ts
4. Configure preview.ts with global styles and router decorator
5. Add scripts to package.json
6. Test Storybook starts

### Phase 3: Create Stories (2-3 hours)
1. Create stories for simple components (ScenarioCard, MessageBubble, ChatHeader, ScoreCard, CorrectionItem)
2. Create stories for complex components (ScenarioSelector, ChatInterface, FeedbackView)
3. Add argTypes to all stories
4. Add multiple variants to each story
5. Verify all stories work

### Phase 4: Mock Context (1 hour)
1. Create storybookMocks.tsx for useSessions
2. Configure preview.ts with decorators
3. Update complex component stories to work with mocks
4. Verify stories don't crash

### Phase 5: Documentation (30 min)
1. Update frontend/README.md
2. Add Storybook section
3. Document usage and workflow

### Phase 6: Final Verification (30 min)
1. Run `npm run storybook`
2. Verify all 8 component stories appear
3. Verify props are documented
4. Verify interactions work
5. Fix any issues

---

## Success Criteria

All Acceptance Criteria from Issue #133 must be met:

- [ ] ✅ Storybook installed and configured
- [ ] ✅ Stories created for all existing components
- [ ] ✅ Template for new component stories exists (by convention)
- [ ] ✅ Documentation includes props, examples, usage notes
- [ ] ✅ Storybook runs locally at http://localhost:6006
- [ ] ✅ Documentation updated (frontend/README.md)

---

## Estimates

| Task | Estimated Time | Priority |
|------|---------------|----------|
| Extract sub-components | 30 min | High |
| Install Storybook | 30 min | High |
| Create simple component stories (5) | 1.5 hours | High |
| Create complex component stories (3) | 1 hour | High |
| Mock context setup | 1 hour | Medium |
| Update documentation | 30 min | Medium |
| Verification & fixes | 30 min | High |
| **Total** | **5.5 hours** | - |

---

## Next Steps

1. Execute Phase 1: Extract sub-components
2. Execute Phase 2: Install Storybook
3. Execute Phase 3: Create stories
4. Execute Phase 4: Mock context
5. Execute Phase 5: Update documentation
6. Execute Phase 6: Final verification

---

*Generated by Mistral Vibe for French Language Coach Project*
*SPDD Artifact - Prompt Phase Complete*
*Ready for execution*
