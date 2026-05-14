# FLC-003-202605140812-[Analysis]-issue-133-storybook

**Issue**: #133 - Add Storybook for component documentation
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/133
**Artifact ID**: FLC-003-202605140812
**Created**: 2026-05-14 08:12
**Author**: Mistral Vibe (with human oversight)
**Status**: Analysis Complete

---

## Original Business Requirement

From GitHub Issue #133:

As the component library grows, we need a way to:
- Document components
- Show usage examples
- Test components in isolation
- Maintain a visual style guide

**Proposed Solution**: Add Storybook for component documentation

---

## Background

The French Language Coach frontend has completed migration from vanilla JavaScript to React (Issue #121). The current frontend structure includes:
- 3 main components: ScenarioSelector, ChatInterface, FeedbackView
- Multiple sub-components: ScenarioCard, MessageBubble, ChatHeader, ScoreCard, CorrectionItem
- React Router v6 for navigation
- TypeScript for type safety
- Vite as build tool

As the component library continues to grow (with Phase 1.5 and beyond adding more components), there is a critical need for:
1. **Component Documentation**: Clear documentation of props, usage patterns, and examples
2. **Visual Regression Testing**: Ability to test components in isolation
3. **Design System**: Consistent style guide for UI patterns
4. **Onboarding**: Easier onboarding for new team members

Storybook is the industry-standard tool for this purpose, widely adopted in the React ecosystem.

---

## Business Value

- **Developer Productivity**: Faster component development with live preview and documentation
- **Quality Assurance**: Test components in isolation before integration
- **Team Collaboration**: Single source of truth for UI components and their usage
- **Onboarding**: New team members can explore components interactively
- **Consistency**: Enforces design patterns and reduces duplicate code
- **Maintainability**: Self-documenting components with built-in examples

---

## Scope In

**Storybook Setup:**
- [ ] Install Storybook in the frontend directory
- [ ] Configure Storybook for TypeScript and React 19
- [ ] Set up proper Vite integration
- [ ] Configure Storybook to work with project's TypeScript settings

**Component Stories:**
- [ ] Create stories for all existing main components (ScenarioSelector, ChatInterface, FeedbackView)
- [ ] Create stories for all sub-components (ScenarioCard, MessageBubble, ChatHeader, ScoreCard, CorrectionItem)
- [ ] Document props using Storybook's argTypes
- [ ] Add usage examples for each component
- [ ] Include interaction examples where applicable

**Documentation:**
- [ ] Add component descriptions
- [ ] Document props with types, defaults, and descriptions
- [ ] Add usage notes and best practices
- [ ] Include example code snippets

**Integration:**
- [ ] Add Storybook scripts to package.json
- [ ] Configure Storybook to run on a dedicated port
- [ ] Set up proper path aliases for imports
- [ ] Verify Storybook runs locally without errors

**README Updates:**
- [ ] Document Storybook setup in README.md
- [ ] Add Storybook commands and usage instructions
- [ ] Update project structure documentation

---

## Scope Out

**Explicitly NOT in scope:**
- [ ] Deploying Storybook to a public URL (optional, mentioned in issue but not required for AC)
- [ ] Setting up Chromatic for visual regression testing
- [ ] Storybook addons beyond essentials (a11y, viewport, etc. are optional)
- [ ] Automated documentation generation tools
- [ ] Component testing with Storybook test runner (can be added later)
- [ ] Style system or design tokens library
- [ ] Theme switching or dark mode for Storybook
- [ ] Integration with CI/CD pipeline for Storybook deployment

---

## Acceptance Criteria (ACs)

From GitHub Issue #133:

1. **AC1**: Storybook installed and configured
   **Given** fresh clone of the repository
   **When** running Storybook setup commands
   **Then** Storybook is properly installed with correct configuration

2. **AC2**: Stories created for all existing components
   **Given** Storybook is running
   **When** navigating to component stories
   **Then** All existing components have corresponding stories

3. **AC3**: New components include Storybook stories
   **Given** a new component is created
   **When** following project conventions
   **Then** The component includes a Storybook story file

4. **AC4**: Documentation includes props, examples, usage notes
   **Given** viewing a component's story
   **When** inspecting the documentation
   **Then** Props are documented with types, examples, and usage notes

5. **AC5**: Storybook runs locally
   **Given** dependencies are installed
   **When** running the Storybook development command
   **Then** Storybook starts and is accessible at http://localhost:6006

6. **AC6**: Documentation updated
   **Given** README.md is reviewed
   **When** looking for Storybook instructions
   **Then** README contains clear setup and usage instructions for Storybook

---

## Domain Concept Identification

### Existing Concepts (from codebase)

**Frontend Structure (`frontend/src/`):**
- **components/**: Reusable UI components (ScenarioSelector.tsx, ChatInterface.tsx, FeedbackView.tsx)
- **pages/**: Page-level components (HomePage.tsx, ChatPage.tsx, FeedbackPage.tsx)
- **hooks/**: Custom React hooks (useSessions.tsx)
- **utils/**: Utility functions (api.ts)
- **types/**: TypeScript type definitions (index.ts)
- **styles/**: CSS files (global.css)

**Current Components:**
- **ScenarioSelector**: Displays grid of scenario cards, handles scenario selection
- **ChatInterface**: Manages chat messages, input form, session lifecycle
- **FeedbackView**: Displays session feedback with scores, strengths, corrections
- **ScenarioCard**: Sub-component of ScenarioSelector, displays individual scenario
- **MessageBubble**: Sub-component of ChatInterface, displays a single message
- **ChatHeader**: Sub-component of ChatInterface, displays header with controls
- **ScoreCard**: Sub-component of FeedbackView, displays a score
- **CorrectionItem**: Sub-component of FeedbackView, displays a correction

**Type Definitions (`frontend/src/types/index.ts`):**
- Scenario, Message, Session, Feedback, Correction interfaces

**Build System:**
- Vite as build tool with React plugin
- TypeScript for type checking
- ESLint for linting

### New Concepts Required

**Storybook Configuration:**
- **`.storybook/` directory**: Contains Storybook configuration files
  - `main.ts`: Main configuration (stories globs, addons, webpack/vite config)
  - `preview.ts`: Preview configuration (global decorators, parameters)
- **`*.stories.tsx` files**: Story files for each component

**Storybook Terminology:**
- **Story**: A single visualization state of a component
- **Component Story Format (CSF)**: Standard for writing stories
- **Args**: Inputs/props passed to components in stories
- **ArgTypes**: Type definitions for args (maps to prop types)
- **Decorator**: Wraps stories to provide context (e.g., styles, providers)
- **Parameters**: Meta-configuration for stories

### Key Business Rules

1. **Component Coverage**: Every new component MUST have a corresponding story
2. **Documentation Standard**: All stories must include argTypes for props
3. **Type Safety**: Storybook must work with TypeScript types
4. **Naming Convention**: Story files follow `{ComponentName}.stories.tsx` pattern
5. **Location**: Story files co-located with components or in dedicated stories directory

---

## Strategic Approach

### Solution Direction

1. **Phase 1: Storybook Setup (High Priority)**
   - Install Storybook via npm
   - Configure for TypeScript and Vite
   - Set up path aliases and build configuration

2. **Phase 2: Main Component Stories (High Priority)**
   - Create stories for ScenarioSelector, ChatInterface, FeedbackView
   - Document props and usage
   - Add interaction examples

3. **Phase 3: Sub-component Stories (Medium Priority)**
   - Create stories for ScenarioCard, MessageBubble, ChatHeader, ScoreCard, CorrectionItem
   - Document props and usage
   - Add examples showing different states

4. **Phase 4: Documentation & Integration (High Priority)**
   - Update README.md with Storybook instructions
   - Verify all stories work correctly
   - Add Storybook scripts to package.json

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Story file location** | Co-located vs dedicated stories dir | Co-located (`Component.stories.tsx`) - better discoverability |
| **Storybook version** | Latest stable vs specific version | Latest stable (8.x) - compatibility with React 19 |
| **Addons** | Many available (a11y, viewport, etc.) | Start with essentials (controls, actions) only |
| **Configuration** | Manual vs automated (storybook init) | Automated init + manual tweaks for TypeScript |
| **Import aliases** | Use @/* path alias vs relative paths | Use @/* for consistency with existing code |

### Alternatives Considered

- **Alternative 1: Ladle** - Modern Storybook alternative, but less mature ecosystem - Rejected
- **Alternative 2: Bit** - Component-driven development platform, but overkill for documentation needs - Rejected
- **Alternative 3: Docz** - Simpler documentation tool, but limited interactivity - Rejected
- **Alternative 4: Custom documentation site** - Full control but high maintenance - Rejected

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Deployment** | Issue mentions "Deploy Storybook (optional)" | Focus on local setup first, deployment can be a follow-up |
| **Component coverage** | "Stories created for all existing components" | Include both main components and sub-components |
| **Documentation depth** | "Documentation includes props, examples, usage notes" | Include JSDoc comments and Storybook argTypes |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **TypeScript types in stories** | Type safety for story args | Use TypeScript types from component files |
| **Component with hooks** | ChatInterface uses useSessions hook | Create mock versions or use decorator to provide context |
| **Component with router** | Components use useNavigate | Use React Router decorator or mock in stories |
| **Styling in stories** | Global CSS needed for proper rendering | Import global.css in preview.ts |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Version compatibility** | Storybook 8.x may have issues with React 19 | Verify compatibility, use latest versions |
| **Vite integration** | Vite + Storybook integration issues | Follow official Storybook Vite docs |
| **TypeScript configuration** | Type errors in stories | Extend tsconfig for Storybook |
| **Import path resolution** | Path alias issues in Storybook | Configure vite-final in .storybook/main.ts |
| **Dependency conflicts** | Storybook may require different dependency versions | Use npm's resolution field if needed |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Storybook installed and configured | Yes | Standard setup process |
| AC2 | Stories created for all existing components | Yes | Need to create stories for all 8+ components |
| AC3 | New components include Storybook stories | Yes | Will be enforced by convention, not automation |
| AC4 | Documentation includes props, examples, usage notes | Yes | Use Storybook's automatic prop documentation |
| AC5 | Storybook runs locally | Yes | Standard npm script setup |
| AC6 | Documentation updated | Yes | Update frontend/README.md |

**AC Coverage Summary**: All 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs:**
- TypeScript support in Storybook
- Vite integration
- Component interaction examples
- Path alias configuration

---

## REASONS Canvas

### Requirements
**Source**: GitHub Issue #133 acceptance criteria

- Storybook installed and configured
- Stories created for all existing components
- New components include Storybook stories
- Documentation includes props, examples, usage notes
- Storybook runs locally
- Documentation updated

### Examples

**Current Component Structure:**
```
frontend/src/components/
├── ScenarioSelector.tsx  (main component)
├── ChatInterface.tsx    (main component)
├── FeedbackView.tsx     (main component)
├── ScenarioCard.tsx     (sub-component - extracted)
├── MessageBubble.tsx    (sub-component - extracted)
├── ChatHeader.tsx       (sub-component - extracted)
├── ScoreCard.tsx        (sub-component - extracted)
└── CorrectionItem.tsx    (sub-component - extracted)
```

**Target Storybook Structure:**
```
frontend/src/components/
├── ScenarioSelector.tsx
├── ScenarioSelector.stories.tsx  <-- NEW
├── ChatInterface.tsx
├── ChatInterface.stories.tsx     <-- NEW
├── FeedbackView.tsx
├── FeedbackView.stories.tsx      <-- NEW
├── ScenarioCard.tsx
├── ScenarioCard.stories.tsx      <-- NEW
├── MessageBubble.tsx
├── MessageBubble.stories.tsx     <-- NEW
├── ChatHeader.tsx
├── ChatHeader.stories.tsx        <-- NEW
├── ScoreCard.tsx
├── ScoreCard.stories.tsx         <-- NEW
└── CorrectionItem.tsx
└── CorrectionItem.stories.tsx    <-- NEW

.storybook/
├── main.ts                        <-- NEW
├── preview.ts                     <-- NEW
└── vite.config.ts                 <-- NEW (optional)
```

**Example Story (ScenarioCard.stories.tsx):**
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import ScenarioCard from './ScenarioCard'

const meta: Meta<typeof ScenarioCard> = {
  title: 'Components/ScenarioCard',
  component: ScenarioCard,
  tags: ['autodocs'],
  argTypes: {
    scenario: {
      description: 'The scenario data to display',
      type: { required: true },
    },
    onClick: {
      description: 'Callback when card is clicked',
      action: 'clicked',
    },
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    scenario: {
      id: 'cafe_order',
      name: 'Ordering at a Café',
      description: 'Practice ordering coffee, pastries, and asking about menu items in a Parisian café.',
    },
  },
}
```

### Architecture

**Current Frontend Architecture:**
```
frontend/
├── src/
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   └── styles/           # CSS
├── package.json          # Dependencies
├── vite.config.ts        # Vite configuration
└── tsconfig.app.json     # TypeScript configuration
```

**Target Architecture with Storybook:**
```
frontend/
├── src/
│   ├── components/       # Reusable components + stories
│   │   ├── *.tsx         # Component files
│   │   └── *.stories.tsx # Story files
│   ├── pages/            # Page components + stories
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   └── styles/           # CSS
├── .storybook/           # Storybook configuration
│   ├── main.ts           # Main config
│   ├── preview.ts        # Preview config
│   └── vite.config.ts    # Vite config for Storybook (optional)
├── package.json          # Dependencies + Storybook scripts
├── vite.config.ts        # Vite configuration (main app)
└── tsconfig.app.json     # TypeScript configuration
```

**Reference Files:**
- `frontend/src/components/ScenarioSelector.tsx` - Main component example
- `frontend/src/components/ChatInterface.tsx` - Complex component with sub-components
- `frontend/src/components/FeedbackView.tsx` - Component with data display
- `frontend/src/types/index.ts` - TypeScript type definitions
- `frontend/package.json` - Current dependencies
- `frontend/vite.config.ts` - Current Vite configuration

### Standards

**Coding Standards:**
- Follow existing TypeScript and React patterns
- Use Component Story Format 3 (CSF3)
- Type all story args using TypeScript
- Include argTypes for all props
- Add descriptive JSDoc comments

**Project Structure Standards:**
- Story files co-located with component files
- Story file naming: `{ComponentName}.stories.tsx`
- Use `@/*` path alias for imports in stories
- Group stories by component hierarchy

**Storybook Configuration Standards:**
- Use Vite as the builder (matches main app)
- Enable TypeScript support
- Configure proper path resolution
- Include global styles in preview

**Documentation Standards:**
- Include component description in story default export
- Document all props with argTypes
- Add at least 2-3 story variants per component (Default, states, etc.)
- Include usage examples in MDX or as additional stories

**Testing Standards:**
- Not required for this issue (AC doesn't mention tests)
- Future: Can add Storybook test runner for interaction tests

### Omissions

**Explicitly out of scope:**
- Storybook deployment to GitHub Pages, Netlify, or Chromatic
- Storybook test runner integration
- Chromatic visual regression testing
- Addons: @storybook/addon-a11y, @storybook/addon-viewport, etc.
- Custom Storybook theme or branding
- Automated story generation from component files
- Documentation site beyond Storybook
- Integration with CI/CD pipeline
- Performance optimizations for Storybook build

**Future considerations (not this issue):**
- Issue #XX: Deploy Storybook to GitHub Pages
- Issue #XX: Add accessibility testing with addon-a11y
- Issue #XX: Add viewport testing for responsive components

### Notes (Implementation Context)

**Reference Context:**
- VISION.md states frontend uses React 19 SPA with TypeScript and Vite
- Issue #121 (React migration) is complete - frontend is ready for Storybook
- Current component count: 8 components (3 main + 5 sub-components)
- Backend API is stable and won't change for this issue

**Technical Notes:**
1. Frontend already uses React 19, TypeScript, Vite - Storybook 8.x supports this
2. Components use React Router hooks (useNavigate) - need decorators to provide router context
3. Components use custom hooks (useSessions) - need to mock or provide context in stories
4. Global CSS is in `frontend/src/styles/global.css` - needs to be imported in preview.ts
5. Path alias `@/*` is configured in tsconfig.app.json - needs to work in Storybook too

**Storybook Setup Commands:**
```bash
# From frontend/ directory
npx storybook@latest init
```

**Expected Storybook Dependencies:**
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

**Decorators Needed:**
- **Router Decorator**: For components using useNavigate, useParams, etc.
- **Sessions Context Decorator**: For components using useSessions hook
- **Global Styles Decorator**: Import global.css for consistent styling

### Solutions (Reference Implementations)

**Recommended Storybook Configuration (.storybook/main.ts):**
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

**Recommended Preview Configuration (.storybook/preview.ts):**
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

**Router Decorator for Stories:**
```typescript
import { MemoryRouter } from 'react-router-dom'

export const decorators = [
  (Story) => (
    <MemoryRouter initialEntries={['/']}>
      <Story />
    </MemoryRouter>
  ),
]
```

**Mock Sessions Context for Stories:**
```typescript
import { UseSessionsReturn } from '../hooks/useSessions'

const mockUseSessions: UseSessionsReturn = {
  sessions: [],
  currentScenarioId: null,
  sessionEnded: false,
  isLoading: false,
  error: null,
  createSession: async () => 'mock-session-id',
  sendMessage: async () => {},
  getFeedback: async () => null,
}

// In story decorators
export const decorators = [
  (Story) => {
    // Mock the useSessions hook
    // This requires a custom decorator or wrapper
    return <Story />
  },
]
```

---

## Analysis Summary

This is a **Medium Priority** issue that enhances developer experience and maintainability. The addition of Storybook provides:

1. **Immediate Benefits**: Component documentation, visual testing, better onboarding
2. **Long-term Value**: Scalable documentation as component library grows
3. **Technical Fit**: Storybook integrates seamlessly with React + TypeScript + Vite

**Estimated Complexity**: Medium
- Storybook setup: Low complexity (automated init)
- Creating stories: Medium complexity (8+ components to document)
- Configuration: Medium complexity (TypeScript, Vite, path aliases, decorators)

**Estimated Effort**: 4-6 hours
- Setup and configuration: 1 hour
- Creating main component stories: 1-2 hours
- Creating sub-component stories: 1-2 hours
- Documentation updates: 1 hour

**Priority**: Medium (Low as stated in issue, but High value for team)
**Blocks**: None (no other issues depend on this)
**Blocked by**: None (React migration complete)

**Next Steps:**
1. Install Storybook and required dependencies
2. Configure Storybook for TypeScript and Vite
3. Create stories for all existing components
4. Add documentation and examples
5. Update README.md
6. Verify Storybook runs locally

---

*Generated by Mistral Vibe for French Language Coach Project*
*SPDD Artifact - Analysis Phase Complete*
