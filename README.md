# French Language Coach

A comprehensive French language learning platform built end-to-end with Mistral Vibe and Mistral API, combining immersive AI conversation practice with structured grammar lessons, a searchable reference guide, and interactive exercises.

## What it does

Users start at a modern central navigation hub that provides access to all application features. From there, they can:

**Conversation Practice**: Select a scenario (e.g., ordering at a café, asking for directions, job interview in French), then conduct an immersive conversation entirely in French with an AI tutor. At the end of the session, they receive a structured feedback report scoring their grammar, vocabulary, and fluency, with one prioritized focus area for improvement.

**Grammar Mastery**: Study through:
- **Grammar Lessons**: 20+ interactive lessons covering core French grammar topics
- **Grammar Reference Guide**: 50+ searchable reference entries for quick lookup of grammar terms and concepts
- **Grammar Exercises**: 5 interactive exercises with 5 types (fill-in-the-blank, multiple-choice, translation, conjugation, sentence transformation) for practicing grammar skills

The landing page also features a Quick Access section showing recent sessions with resume capability.

## Usage

### From the Central Navigation Hub (Landing Page):

1. **Explore Features**: The landing page displays cards for all major features - click any to get started
2. **Start Conversation Practice**: Click "Conversation Practice" or "Get Started" to select from 10 built-in scenarios
3. **Browse Grammar Lessons**: Click "Grammar Lessons" to browse, search, and filter 20+ interactive lessons
4. **Search Grammar Reference**: Click "Grammar Reference" to access 50+ searchable reference entries
5. **Practice Exercises**: Click "Grammar Exercises" to practice with fill-in-the-blank, multiple-choice, translation, conjugation, and sentence transformation exercises
6. **Resume Recent Session**: Use the Quick Access section to resume any of your last 5 sessions

### Conversation Practice Flow:

1. **Select a Scenario**: Choose from 10 built-in conversation scenarios
2. **Select Difficulty**: Choose your difficulty level (Beginner, Intermediate, or Advanced) to tailor the AI's responses to your proficiency
3. **Start Chatting**: Type messages in French and get responses from the AI tutor
4. **End Session**: Click "End Session" to receive detailed feedback
5. **Review Feedback**: See scores for grammar, vocabulary, fluency, and overall performance with specific corrections
6. **Review Session Details**: Navigate to `/sessions/{id}` to view full conversation transcript alongside feedback
7. **Navigate Back**: Use the Back button to return to scenario selection or start a new session

### Difficulty Levels

Each scenario supports three difficulty levels that affect the AI's system prompt:
- **Beginner**: Simpler vocabulary, slower pace, more helpful hints
- **Intermediate**: Standard prompts (default, backward compatible)
- **Advanced**: More complex vocabulary, faster pace, native idioms and expressions

## Scenarios

- **Ordering at a Café** - Practice ordering coffee and pastries
- **Asking for Directions** - Navigate Parisian landmarks
- **Job Interview** - Software engineering interview simulation
- **Hotel Check-in** - Check into a hotel and ask about amenities
- **Shopping for Clothes** - Shop and try on clothes
- **Doctor's Visit** - Describe symptoms and get medical advice
- **Train Travel** - Buy tickets and check schedules
- **Dining at a Restaurant** - Order a full meal
- **Apartment Rental** - Negotiate and ask about rentals
- **Museum Visit** - Ask about exhibits and tickets

## Features

- **Central Navigation Hub**: Modern landing page with feature cards for all application functionality and Quick Access to recent sessions
- **Conversation Practice**: AI stays strictly in character and responds only in French
- **Session Management**: Conversation history stored in SQLite with resume capability
- **Structured Feedback**: Grammar, vocabulary, and fluency scores with example corrections and explanations
- **Session Detail View**: Full conversation transcript alongside feedback
- **Clean, Responsive Interface**: Single-page application with modern UI/UX
- **Grammar Lessons**: 20+ interactive lessons covering core French grammar topics (Phase 2)
- **Grammar Reference Guide**: 50+ searchable reference entries for quick lookup of grammar terms and concepts (Phase 2)
- **Grammar Exercises**: 5 interactive exercises with 5 types: fill-in-the-blank, multiple-choice, translation, conjugation, and sentence transformation (Phase 2)
  - Real-time answer validation with immediate feedback
  - Score tracking across exercise sessions
  - Filterable by type, topic, and difficulty level

## Setup & Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd french-language-coach
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up the frontend (React SPA):
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

5. Get a Mistral API key from [https://console.mistral.ai/](https://console.mistral.ai/) and add it to `.env`:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```

6. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

7. In a separate terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

8. Open your browser to [http://localhost:5173](http://localhost:5173) (Vite dev server with HMR)

**To run Storybook for component development:**

1. In a separate terminal, start Storybook:
   ```bash
   cd frontend
   npm run storybook
   ```

2. Open your browser to [http://localhost:6006](http://localhost:6006) to view component documentation

**Alternative (Production Mode):**

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Run the backend server (serves the built React app from /static):
   ```bash
   uvicorn main:app
   ```
3. Open your browser to [http://localhost:8000](http://localhost:8000)

## Tech Stack

- **Backend**: Python + FastAPI
- **Frontend**: React 19 + TypeScript + Vite, React Router v6
- **Storybook**: Component documentation at http://localhost:6006
- **Database**: SQLite via SQLAlchemy (async)
- **AI**: Mistral API (model: `mistral-large-latest`)
- **Package management**: pip + requirements.txt (backend), npm (frontend)

## Architecture

The application follows a clean separation of concerns with the following layers:

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                    │
│  React 19 + TypeScript + Vite + React Router v6              │
│  Storybook for component documentation                       │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────┐     │
│  │   pages/      │  │  components/   │  │   hooks/     │     │
│  │  - Route comps│  │  - UI comps    │  │  - Custom    │     │
│  │               │  │  - Stories     │  │    hooks     │     │
│  └───────────────┘  └────────────────┘  └──────────────┘     │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   utils/      │  │   types/     │  │   .storybook/    │   │
│  │  - API client │  │  - TS types  │  │  - Config        │   │
│  │  - Mocks      │  │              │  │                  │   │
│  └───────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │  routers/    │   │   services/  │   │   models/    │     │
│  │  - REST API  │──▶│  - Mistral   │──▶│  - Sessions  │     │
│  │  - Endpoints │   │  - Chat      │   │  - Messages  │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   schemas/   │  │ scenarios.py │                         │
│  │  - Pydantic  │  │ - Prompts    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
              │                             │
              ▼                             ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│    SQLite Database       │    │    Mistral API (External)   │ 
│  - Session storage       │    │  - Chat completions         │
│  - JSON fields           │    │  - Feedback generation      │
│                          │    │                             │
└─────────────────────────-┘    └─────────────────────────────┘
```

## Project Structure

```
french-language-coach/
├── main.py                  # FastAPI app entry point, mounts static files, includes routers
├── config.py                # Settings loaded from .env (MISTRAL_API_KEY, DATABASE_URL)
├── database.py              # SQLite + SQLAlchemy async engine and session setup
├── models/
│   └── session.py           # SQLAlchemy ORM model for a conversation session
├── schemas/
│   ├── session.py           # Pydantic schemas for API request/response
│   ├── grammar_lesson.py    # Pydantic models for grammar lesson validation (Phase 2)
│   ├── grammar_reference.py # Pydantic models for grammar reference entry validation (Phase 2)
│   └── grammar_exercise.py  # Pydantic models for grammar exercise validation (Phase 2)
├── services/
│   └── mistral.py           # Mistral API client: chat completion + feedback generation
├── routers/
│   ├── __init__.py
│   ├── sessions.py          # POST /sessions (start), GET /sessions/{id}, DELETE /sessions/{id}
│   ├── messages.py          # POST /sessions/{id}/messages (send a message, get AI reply)
│   ├── feedback.py          # POST /sessions/{id}/feedback (generate end-of-session report)
│   ├── grammar.py           # GET /grammar/lessons/, /grammar/reference/, /grammar/exercises/ endpoints (Phase 2)
│   └── grammar_progress.py  # GET /grammar/progress/, POST /grammar/progress/ endpoints (Phase 2)
├── scenarios.py             # Static list of 10 built-in conversation scenarios with system prompts
├── data/
│   ├── grammar_lessons/     # Grammar lesson JSON files for Phase 2 (20+ lessons)
│   ├── grammar/reference/   # Grammar reference entry JSON files for Phase 2 (50+ entries)
│   └── grammar/exercises/   # Grammar exercise JSON files for Phase 2 (5 exercises: fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation)
├── scripts/
│   ├── validate_grammar_lessons.py  # Validation script for grammar lessons
│   └── validate_grammar_reference.py  # Validation script for grammar reference entries
├── frontend/                # React SPA frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/      # Reusable UI components + Storybook stories
│   │   │   ├── FeatureCard.tsx       # Feature navigation card for landing page (Issue #177)
│   │   │   ├── FeatureCard.stories.tsx
│   │   │   ├── FeatureCard.test.tsx
│   │   │   ├── QuickAccessSession.tsx # Compact session card for landing page (Issue #177)
│   │   │   ├── QuickAccessSession.stories.tsx
│   │   │   ├── QuickAccessSession.test.tsx
│   │   │   ├── DifficultySelector.tsx
│   │   │   ├── DifficultySelector.stories.tsx
│   │   │   ├── DifficultySelector.test.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatInterface.stories.tsx
│   │   │   ├── FeedbackView.tsx
│   │   │   ├── FeedbackView.stories.tsx
│   │   │   ├── SessionDetail.tsx
│   │   │   ├── SessionDetail.stories.tsx
│   │   │   ├── ScenarioSelector.tsx
│   │   │   ├── ScenarioSelector.stories.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ChatHeader.stories.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageBubble.stories.tsx
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── ScoreCard.stories.tsx
│   │   │   ├── CorrectionItem.tsx
│   │   │   ├── CorrectionItem.stories.tsx
│   │   │   ├── ScenarioCard.tsx
│   │   │   ├── ScenarioCard.stories.tsx
│   │   │   ├── LessonCard.tsx        # Lesson card for browser (Phase 2)
│   │   │   ├── LessonCard.stories.tsx
│   │   │   ├── LessonSearch.tsx      # Search/filter controls (Phase 2)
│   │   │   ├── LessonSearch.stories.tsx
│   │   │   ├── LessonBrowser.tsx     # Main lessons browser (Phase 2)
│   │   │   ├── LessonBrowser.stories.tsx
│   │   │   ├── ReferenceSearch.tsx   # Search and filter for grammar reference (Phase 2)
│   │   │   ├── ReferenceCard.tsx     # Card component for reference entries (Phase 2)
│   │   │   ├── Exercise.tsx          # Main exercise component (Phase 2)
│   │   │   ├── ExerciseTypes/        # Type-specific exercise components (Phase 2)
│   │   │   │   ├── FillInTheBlankExercise.tsx
│   │   │   │   ├── MultipleChoiceExercise.tsx
│   │   │   │   ├── TranslationExercise.tsx
│   │   │   │   ├── ConjugationExercise.tsx
│   │   │   │   └── SentenceTransformationExercise.tsx
│   │   │   └── index.ts
│   │   ├── pages/           # Page-level components (React Router routes)
│   │   │   ├── IndexPage.tsx         # Modern landing page with central navigation hub (Issue #177)
│   │   │   ├── ScenarioPage.tsx      # Scenario selection interface (Issue #177)
│   │   │   ├── HomePage.tsx          # Legacy scenario selection page (kept for backward compatibility)
│   │   │   ├── ChatPage.tsx
│   │   │   ├── FeedbackPage.tsx
│   │   │   ├── SessionDetailPage.tsx
│   │   │   ├── LessonPage.tsx        # Grammar lessons browser (Phase 2)
│   │   │   ├── LessonDetailPage.tsx  # Individual lesson viewer (Phase 2)
│   │   │   ├── ReferencePage.tsx     # Grammar reference search page (Phase 2)
│   │   │   ├── ExerciseBrowserPage.tsx # Exercise listing/browsing page (Phase 2)
│   │   │   └── ExercisePage.tsx      # Individual exercise page (Phase 2)
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useSessions.tsx
│   │   │   └── index.ts
│   │   ├── utils/           # Utility functions
│   │   │   ├── api.ts
│   │   │   └── storybookMocks.tsx
│   │   ├── types/           # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── styles/          # CSS files
│   │   │   └── global.css
│   │   ├── .storybook/      # Storybook configuration
│   │   │   ├── main.ts
│   │   │   └── preview.tsx
│   │   ├── App.tsx          # Main app with React Router
│   │   └── main.tsx        # App entry point
│   ├── public/             # Static assets
│   ├── vite.config.ts      # Vite configuration
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   └── README.md           # Frontend setup documentation
├── static/                 # Static files for development (will be replaced by React build in production)
│   ├── index.html          # Legacy single-page app (development fallback)
│   ├── style.css           # Legacy styles
│   └── app.js              # Legacy frontend logic
├── .env.example             # Template: MISTRAL_API_KEY=, DATABASE_URL=
├── .gitignore               # Python, .env, __pycache__, *.db
├── requirements.txt         # fastapi, uvicorn, sqlalchemy, aiosqlite, mistralai, python-dotenv, pydantic
├── tests/                  # pytest tests for backend
│   ├── __init__.py
│   ├── conftest.py         # Pytest fixtures and configuration
│   ├── test_scenarios.py   # Tests for difficulty levels in scenarios
│   └── test_schemas.py     # Tests for Pydantic schemas
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions/` | List all sessions with pagination. Query parameters: `page` (default 1), `per_page` (default 10, max 100), `scenario_id` (filter by scenario), `date_from` (filter by start date), `date_to` (filter by end date), `min_score` (filter by minimum overall score). Returns summary: id, scenario_id, scenario_name, difficulty, created_at, ended_at, overall_score, **is_locked, locked_at, locked_by** |
| POST | `/sessions/` | Create a new conversation session. Optional `difficulty` parameter: beginner, intermediate (default), or advanced |
| GET | `/sessions/{id}` | Get session details and messages. Returns `difficulty` field, **is_locked, locked_at, locked_by** |
| DELETE | `/sessions/{id}` | Delete a session. Returns 204 on success, 404 if not found. **Returns 400 if session is locked** (prevents deletion of sessions in use) |
| POST | `/sessions/{id}/lock` | Lock a session to prevent deletion while in use. Accepts optional `X-Client-ID` header for lock ownership. Auto-unlocks after 10 minutes (TTL). Returns lock status. |
| POST | `/sessions/{id}/unlock` | Unlock a session to allow deletion. Requires matching `X-Client-ID` header unless lock has expired. Returns lock status. |
| POST | `/sessions/{id}/messages` | Send a message, get AI reply. Uses session's difficulty level for system prompt |
| POST | `/sessions/{id}/feedback` | Generate end-of-session feedback |
| GET | `/grammar/lessons/` | List all grammar lessons with pagination and filtering. Query parameters: `page` (default 1), `per_page` (default 10, max 100), `topic` (filter by grammatical topic), `difficulty` (filter by level: beginner, intermediate, advanced). Returns summary: id, title, topic, difficulty |
| GET | `/grammar/lessons/{id}` | Get a specific grammar lesson by ID. Returns full lesson content including sections with titles, content, and examples. Returns 404 if lesson not found |
| GET | `/grammar/reference/` | Search grammar reference entries with pagination and filtering. Query parameters: `page` (default 1), `per_page` (default 10, max 100), `q` (search query - case-insensitive partial match on term, definition, examples, common_pitfalls), `category` (filter by grammatical category), `difficulty` (filter by level: beginner, intermediate, advanced). Returns full reference entries |
| GET | `/grammar/progress/` | List lesson progress records with optional filtering. Query parameters: `lesson_id` (filter by lesson ID), `user_id` (filter by user ID), `completed` (filter by completion status: true/false). Returns list of progress records with id, user_id, lesson_id, completed, score, last_accessed, time_spent, created_at, updated_at. **user_id is nullable for Phase 1.5** |
| POST | `/grammar/progress/` | Record a new lesson progress entry. Required: `lesson_id` (string, e.g., "articles"). Optional: `user_id` (integer, nullable), `completed` (boolean, default false), `score` (integer 0-100, default 0), `time_spent` (integer seconds >=0, default 0). Returns 201 with created progress record. Returns 422 for invalid score (<0 or >100) or time_spent (<0). **Validates: score must be 0-100, time_spent must be >=0** |
| GET | `/grammar/exercises/` | List grammar exercises with optional filtering and pagination. Query parameters: `page` (default 1), `per_page` (default 10, max 100), `exercise_type` (filter by type: fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation), `topic` (filter by topic substring), `difficulty` (filter by level: beginner, intermediate, advanced). Returns paginated list of exercises with full content |
| GET | `/grammar/exercises/{id}` | Get a specific grammar exercise by ID. Returns full exercise content including all type-specific fields. Returns 404 if exercise not found |

### Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | IndexPage | Modern landing page with central navigation hub (Issue #177) |
| `/scenarios` | ScenarioPage | Scenario selection interface |
| `/chat/:sessionId` | ChatPage | Interactive chat interface for a session |
| `/feedback/:sessionId` | FeedbackPage | Feedback report display for a completed session |
| `/sessions/:sessionId` | SessionDetailPage | Full session details with transcript and feedback |
| `/lessons` | LessonPage | Browse, search, and filter all grammar lessons (Phase 2) |
| `/lessons/:lessonId` | LessonDetailPage | View full content of a specific grammar lesson (Phase 2) |
| `/reference` | ReferencePage | Search and filter grammar reference entries (Phase 2) |
| `/exercises` | ExerciseBrowserPage | Browse and filter all grammar exercises (Phase 2) |
| `/exercises/:exerciseId` | ExercisePage | Practice a specific grammar exercise (Phase 2) |

### Data Flow

1. **User selects scenario** → POST /sessions/ creates session record
2. **User sends message** → POST /sessions/{id}/messages/ → Mistral chat API → AI response stored in session
3. **User requests feedback** → POST /sessions/{id}/feedback/ → Mistral chat API with feedback prompt → structured JSON feedback stored in session
4. **Frontend displays** conversation history and feedback report

### Session Locking (Issue #160)

The application implements a session locking mechanism to prevent accidental deletion of sessions currently in use:

- **Automatic Locking**: Sessions are automatically locked when loaded in the ChatInterface (on mount)
- **Automatic Unlocking**: Sessions are automatically unlocked when the user leaves the ChatInterface (on unmount)
- **Cross-Tab Safety**: Locking works across browser tabs via backend state
- **TTL Auto-Unlock**: Abandoned locks automatically expire after 10 minutes to prevent deadlocks
- **Delete Protection**: Sessions can only be deleted when not locked (regardless of completion status)
- **Continue Session**: Incomplete sessions can be resumed from the SessionDetail view via "Continue Session" button

This allows users to:
- Delete incomplete sessions (previously blocked)
- Continue incomplete sessions from SessionDetail
- Prevent accidental deletion of sessions currently in use

## Mistral LLM Integration

The application integrates with the Mistral API in two key ways:

### 1. Conversation Mode (`services/mistral.py:get_chat_response`)

For each scenario, a system prompt instructs the model to:
- Respond **only in French** (never break into English)
- Stay in character as a native French speaker
- Use natural, authentic language

Example scenario prompt (from `scenarios.py`):
```
"Tu es un serveur/une serveuse natif(ve) dans un café parisien. 
Réponds UNIQUEMENT en français. Reste absolument dans ton rôle..."
```

The conversation history (user + assistant messages) is sent to `mistral-large-latest` via the chat API, and the assistant's response is returned and stored.

### 2. Feedback Mode (`services/mistral.py:get_feedback`)

When a user ends a session, the full conversation history is sent with a separate system prompt that instructs Mistral to analyze the conversation and return a **strictly JSON** response with this structure:

```json
{
    "grammar_score": 0-100,
    "vocabulary_score": 0-100,
    "fluency_score": 0-100,
    "overall_score": 0-100,
    "strengths": ["string", ...],
    "focus_area": "string",
    "example_corrections": [
        {"original": "string", "corrected": "string", "explanation": "string"}
    ]
}
```

The `response_format={"type": "json_object"}` parameter ensures Mistral returns valid JSON that can be directly parsed and stored in the database.

## Why Mistral

Mistral's models have demonstrably stronger French language quality than most alternatives. Mistral trains its models with native French fluency — giving Mistral Large demonstrated benchmark advantages in French language comprehension and generation compared to models trained primarily on English. For a French language coaching application, this is not a minor detail: it means more natural phrasing, better idiomatic corrections, and more culturally authentic conversation scenarios.

This project is also built entirely using Mistral Vibe, Mistral's AI-assisted coding environment, making it an end-to-end demonstration of the Mistral developer ecosystem.

### References

| # | Source | Link | What It Indicates |
|---|--------|------|-------------------|
| 1 | **Mistral AI Official Blog** – *"Au Large"* | https://mistral.ai/news/mistral-large | Primary source from Mistral AI documenting native multilingual capacities and benchmark comparisons (HellaSwag, Arc Challenge, MMLU) vs. LLaMA 2 70B, Mixtral 8x7B in French, German, Spanish, and Italian. |
| 2 | **Prompt Engineering Guide** – *Mistral Large* | https://www.promptingguide.ai/models/mistral-large | Independent summary confirming Mistral Large outperforms Mixtral 8x7B and LLaMA 2 70B across all tested languages including French. Notes it falls behind GPT-4 on some tasks but leads comparable-tier models. |
| 3 | **Built In** – *Mistral AI: Models, Capabilities and Latest Developments* | https://builtin.com/articles/mistral-ai | Third-party technology publication confirming Mistral's native fluency in French, Spanish, German, and Italian, with a nuanced understanding of grammar and cultural context — contrasted with models that are only proficient in a single language. |
| 4 | **Anthem Creation** – *Mistral Large vs. ChatGPT* (Oct 2024) | https://anthemcreation.com/en/artificial-intelligence/mistral-large-cat-gpt-functioning-benefits-modele-francais/ | Documents Mistral Large's GLUE French reading comprehension score of 89.4 (top of evaluated French language models at time of publication) and notes it outperforms ChatGPT on French NLP tasks specifically. |
| 5 | **Cocondesnèiges.fr** – *Mistral AI Review* (Apr 2026) | https://cocondesneiges.fr/en/ai/mistral-ai-review/ | Recent (April 2026) independent review confirming superior French language quality vs. American competitors, noting more natural text with fewer anglicised phrasings. Also notes GPT-4o retains a slight edge on complex reasoning. |

## Development

This project was developed using **Mistral Vibe**, an AI coding agent that provides:
- Intelligent code generation and completion
- Context-aware suggestions based on the codebase
- Multi-file refactoring assistance
- Debugging and error resolution support

### AI-Assisted Development Workflow

This project follows **Structured Prompt Driven Development (SPDD)** methodology as described by Wei Zhang and Jessie Jie Xia (hosted on Martin Fowler's website). SPDD provides a systematic approach to integrating AI coding assistants into the software development lifecycle while maintaining human oversight and quality standards.

#### Intent
SPDD aims to harness the productivity gains of AI coding assistance while mitigating risks through structured prompts, clear context boundaries, and human-in-the-loop validation. It ensures that AI-generated code aligns with project architecture, quality standards, and business requirements.

#### Vision
By adopting SPDD, we achieve:
- **Consistency**: AI assistance follows predictable patterns
- **Quality**: Structured prompts yield higher-quality outputs
- **Maintainability**: Clear documentation of AI interactions for future reference
- **Traceability**: Every AI-generated artifact has a clear lineage

#### REASONS Canvas Components
The REASONS canvas (from the SPDD methodology) guides our AI-assisted development:

- **Requirements**: Clear acceptance criteria defined in each GitHub issue
- **Examples**: Concrete test cases and expected behaviors
- **Architecture**: Existing codebase structure and design patterns
- **Standards**: Coding conventions, testing requirements (80% coverage)
- **Omissions**: Explicitly out-of-scope items documented
- **Notes**: Implementation hints and context
- **Solutions**: Reference implementations and patterns

#### Workflow
1. **Issue Definition**: Each feature starts with a well-structured GitHub issue containing acceptance criteria
2. **Context Gathering**: Agent reviews relevant code, documentation, and existing patterns
3. **Prompt Engineering**: Structured prompts include: goal, constraints, examples, and validation criteria
4. **Iterative Development**: Agent generates code, human reviews, refine, repeat
5. **Validation**: All acceptance criteria verified, tests pass at 80%+ coverage
6. **Documentation**: Code changes documented, reasoning captured

#### SPDD Artifacts

**All AI-assisted development artifacts are captured in the `spdd/` directory.** This includes:

- **Analysis Documents** (`spdd/analysis/`): Structured REASONS canvas analysis for each task
- **Prompt Documents** (`spdd/prompt/`): Exact prompts sent to AI assistants with context and constraints
- **Templates** (`spdd/template/`): Reusable templates for creating artifacts

This ensures:
- **Traceability**: Every AI-generated change can be traced to its source prompt
- **Reproducibility**: Prompts can be re-run to verify outputs
- **Transparency**: The development process is visible and auditable
- **Knowledge Preservation**: Design decisions and context are retained for future developers

**See `spdd/README.md` for complete details on artifact structure and naming conventions.**

**Issue #46 - ReferenceSearch and Exercise Components**:
- Analysis: `spdd/analysis/FLC-024-202606041500-[Analysis]-issue-46-reference-search-exercise.md`
- Prompt: `spdd/prompt/FLC-024-202606041530-[Feat]-issue-46-reference-search-exercise.md`

#### Reference
- [Structured Prompt Driven Development (Wei Zhang & Jessie Jie Xia)](https://martinfowler.com/articles/structured-prompt-driven.html)

> **Note**: We are currently using Mistral Vibe directly without the open-spdd utility. If we adopt open-spdd in the future, this workflow will be updated accordingly.

### Git Workflow

This project uses **GitHub Flow with Issue-Based Branching**: one dedicated branch per GitHub issue, created from `main`, merged back via Pull Request. All development follows this pattern for traceability and isolation.

- **Branch naming**: `{type}/issue-{number}-{description}` (e.g., `feature/issue-42-grammar-lessons`)
- **Workflow**: Branch from `main` → Develop → PR to `main` → Review → Merge → Cleanup
- **Full documentation**: See [GIT-WORKFLOW.md](./GIT-WORKFLOW.md) for complete details including examples, worktree usage, and troubleshooting

## Limitations

- No user authentication
- Single-user only (all sessions stored in one database)
- Requires Mistral API key (paid service)

## Running Tests

This project has test suites for both the backend and frontend components.

### Backend Tests

The backend uses **pytest** with **pytest-asyncio** for testing FastAPI endpoints, services, and schemas.

**Prerequisites:**
- Python virtual environment activated
- Backend dependencies installed (`pip install -r requirements.txt`)

**To run all backend tests:**
```bash
pytest
```

**To run with verbose output:**
```bash
pytest -v
```

**To run a specific test file:**
```bash
pytest tests/test_sessions_listing.py
```

**To run with test coverage:**
```bash
pytest --cov=. --cov-report=term-missing
```

**Available backend test files:**
- `tests/test_scenarios.py` - Tests for scenario difficulty levels
- `tests/test_schemas.py` - Tests for Pydantic schemas
- `tests/test_sessions_listing.py` - Tests for session listing and filtering endpoints
- `tests/test_session_deletion.py` - Tests for session deletion endpoint
- `tests/test_grammar_lesson_schema.py` - Tests for grammar lesson schema (Issue #28)
- `tests/test_grammar_lessons_issue_30.py` - Tests for 20+ grammar lessons (Issue #30)
- `tests/test_grammar_reference.py` - Tests for 50+ grammar reference entries (Issue #32)
- `tests/test_grammar_router.py` - Tests for grammar router endpoints (Issue #36)
- `tests/test_grammar_exercise_schema.py` - Tests for grammar exercise schema (Issue #34, #46)

### Frontend Tests

The frontend uses **Vitest** for most unit and component testing, and **Jest** for specific tests (e.g., MSW-related tests).

**Prerequisites:**
- Frontend dependencies installed (`cd frontend && npm install`)

#### Vitest (Primary Test Framework)

**To run all frontend tests:**
```bash
cd frontend
npm run test
```

**To run tests with UI mode:**
```bash
cd frontend
npm run test:ui
```

**To run tests with coverage:**
```bash
cd frontend
npm run test:coverage
```

**To run Storybook interaction tests:**
```bash
cd frontend
npm run test:storybook
```

#### Jest (For MSW and Specific Tests)

The project also uses Jest for certain tests, particularly those involving MSW (Mock Service Worker).

**To run Jest tests:**
```bash
cd frontend
npm run test:jest
```

**To run Jest tests with coverage:**
```bash
cd frontend
npm run test:jest:coverage
```

**To run Jest tests in watch mode:**
```bash
cd frontend
npm run test:jest:watch
```

> **Note:** Frontend test scripts are defined in `frontend/package.json`. If Vitest is not yet configured, you can add it with: `cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom`
>
> **Jest Coverage Note:** Due to TypeScript compilation errors in some source files, Jest coverage collection currently excludes certain directories (styles, mocks, hooks, pages, utils, types, ExerciseTypes) and files (main.tsx, App.tsx, setupTests.ts, testSetup.ts). These exclusions are configured in `frontend/jest.config.cjs` and can be reduced as TypeScript errors are fixed.

## GitHub Actions CI/CD

This project uses GitHub Actions for Continuous Integration with the following workflows:

### Test Workflows (Conditional)

- **pytest-tests.yml** - Runs backend pytest tests when backend files change
- **jest-tests.yml** - Runs frontend Jest tests when frontend files change
- **vitest-tests.yml** - Runs frontend Vitest tests when frontend files change
- **cypress-tests.yml** - Runs end-to-end Cypress tests when frontend files change

All test workflows use path-based filtering to run only when relevant files are modified, improving CI efficiency.

### Status Gateway Workflow

**status-gateway.yml** - The All Clear Gateway Job (see [Issue #190](https://github.com/beelandc/french-language-coach/issues/190))

This workflow always runs on PRs to main and checks the status of all test workflows that were triggered:

- **Purpose**: Solve the problem where path-based workflow filtering causes workflows to be skipped, and GitHub treats missing required checks as failures
- **Pattern**: Method 1 - The "All Clear" Gateway Job (industry best practice)
- **Usage**: In branch protection rules, require only the `status-gateway` workflow, not the individual conditional workflows

**How it works:**
1. Runs on every PR to main (no path filtering)
2. Uses the GitHub API to query all workflow runs for the current PR's head commit
3. Filters to only the test workflows (pytest, jest, vitest, cypress)
4. If no test workflows ran (e.g., docs-only PR), succeeds with message
5. If workflows are still in progress, reports pending status
6. If any triggered workflow failed, fails with details
7. If all triggered workflows passed, succeeds

**For branch protection:** Configure your branch protection rule to require only the `Status Gateway / Status Check Gateway` check.

## License

MIT License
