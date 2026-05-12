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
│   │   └── index.ts
│   ├── pages/            # Page-level components (routes)
│   │   ├── ChatPage.tsx
│   │   ├── FeedbackPage.tsx
│   │   └── HomePage.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useSessions.ts
│   ├── utils/            # Utility functions
│   │   └── api.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/           # CSS files
│   │   └── global.css
│   ├── App.tsx           # Main app component with React Router
│   └── main.tsx          # App entry point
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
