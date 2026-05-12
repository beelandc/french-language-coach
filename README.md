# French Language Coach

An immersive French conversation practice web application with AI-powered feedback.

## What it does

Users select a conversation scenario (e.g., ordering at a café, asking for directions, job interview in French), then conduct an immersive conversation entirely in French with an AI tutor. At the end of the session, they receive a structured feedback report scoring their grammar, vocabulary, and fluency, with one prioritized focus area for improvement.

## Tech Stack

- **Backend**: Python + FastAPI
- **Frontend**: Single-page HTML/CSS/JS (no framework)
- **Database**: SQLite via SQLAlchemy (async)
- **AI**: Mistral API (model: `mistral-large-latest`)
- **Package management**: pip + requirements.txt

## Architecture

The application follows a clean separation of concerns with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Static)                      │
│  index.html + app.js + style.css                            │
│  - Scenario selection, chat UI, feedback display            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │  routers/    │   │   services/  │   │   models/    │     │
│  │  sessions    │──▶│   mistral.py │──▶│   session.py │     │
│  │  messages    │   │              │   │              │     │
│  │  feedback    │   │              │   │              │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   schemas/   │  │ scenarios.py │                         │
│  │   session.py │  | (static data)│                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
              │                             │
              ▼                             ▼
┌────────────────────────-─┐    ┌─────────────────────────────┐
│    SQLite Database       │    │    Mistral API (External)   | 
│                          |    |                             |
│  sessions table: id,     │    │  - Chat completions for     │
│  scenario_id, created_at,│    │    immersive French conv.   │
│  ended_at, messages      │    │  - JSON-structured feedback │
│  (JSON), feedback (JSON) │    │    generation               │
└─────────────────────────-┘    └─────────────────────────────┘
```

### Data Flow

1. **User selects scenario** → POST /sessions/ creates session record
2. **User sends message** → POST /sessions/{id}/messages/ → Mistral chat API → AI response stored in session
3. **User requests feedback** → POST /sessions/{id}/feedback/ → Mistral chat API with feedback prompt → structured JSON feedback stored in session
4. **Frontend displays** conversation history and feedback report

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

## Project Structure

```
french-language-coach/
├── main.py                  # FastAPI app entry point, mounts static files, includes routers
├── config.py                # Settings loaded from .env (MISTRAL_API_KEY, DATABASE_URL)
├── database.py              # SQLite + SQLAlchemy async engine and session setup
├── models/
│   └── session.py           # SQLAlchemy ORM model for a conversation session
├── schemas/
│   └── session.py           # Pydantic schemas for API request/response
├── services/
│   └── mistral.py           # Mistral API client: chat completion + feedback generation
├── routers/
│   ├── __init__.py
│   ├── sessions.py          # POST /sessions (start), GET /sessions/{id}
│   ├── messages.py          # POST /sessions/{id}/messages (send a message, get AI reply)
│   └── feedback.py          # POST /sessions/{id}/feedback (generate end-of-session report)
├── scenarios.py             # Static list of 10 built-in conversation scenarios with system prompts
├── static/
│   ├── index.html           # Single-page app: scenario selector + chat interface + feedback view
│   ├── style.css            # Clean, minimal styling
│   └── app.js               # Frontend logic: API calls, chat rendering, feedback display
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

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

5. Get a Mistral API key from [https://console.mistral.ai/](https://console.mistral.ai/) and add it to `.env`:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```

6. Run the application:
   ```bash uvicorn main:app --reload
   ```

7. Open your browser to [http://localhost:8000/](http://localhost:8000/) (redirects to /static/index.html)

## Usage

1. **Select a Scenario**: Choose from 10 built-in conversation scenarios
2. **Start Chatting**: Type messages in French and get responses from the AI tutor
3. **End Session**: Click "End Session" to receive detailed feedback
4. **Review Feedback**: See scores for grammar, vocabulary, fluency, and overall performance with specific corrections
5. **Start Again**: Begin a new session with any scenario

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions/` | List all sessions with pagination. Returns summary: id, scenario_id, scenario_name, difficulty, created_at, ended_at, overall_score |
| POST | `/sessions/` | Create a new conversation session. Optional `difficulty` parameter: beginner, intermediate (default), or advanced |
| GET | `/sessions/{id}` | Get session details and messages. Returns `difficulty` field |
| POST | `/sessions/{id}/messages` | Send a message, get AI reply. Uses session's difficulty level for system prompt |
| POST | `/sessions/{id}/feedback` | Generate end-of-session feedback |

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

- AI stays strictly in character and responds only in French
- Conversation history stored in SQLite
- Structured feedback with grammar, vocabulary, fluency scores
- Example corrections with explanations
- Clean, responsive single-page interface

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

## License

MIT License
aid service)

## License

MIT License
