# French Language Coach - React Frontend

React SPA frontend for the French Language Coach project.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ChatInterface.tsx
│   │   ├── FeedbackView.tsx
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
│   │   └── storybookMocks.tsx
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/           # CSS files
│   │   └── global.css
│   ├── App.tsx           # Main app component with React Router
│   └── main.tsx          # App entry point
├── .storybook/           # Storybook configuration
│   ├── main.ts           # Storybook main configuration
│   └── preview.tsx       # Storybook preview configuration
├── public/              # Static assets
├── vite.config.ts        # Vite configuration
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

## SPDD Artifacts

- Analysis: `spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md`
- Prompt: `spdd/prompt/FLC-002-202605121630-[Feat]-issue-121-react-migration.md`
- GitHub Issue: #121
