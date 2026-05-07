Create the initial project scaffold for a web application called "French Language Coach". 

## What it does
Users select a conversation scenario (e.g., ordering at a café, asking for directions, job interview in French), then conduct an immersive conversation entirely in French with an AI. At the end of the session, they receive a structured feedback report scoring their grammar, vocabulary, and fluency, with one prioritized focus area for improvement.

## Tech stack
- Backend: Python + FastAPI
- Frontend: Single-page HTML/CSS/JS (no framework)
- Database: SQLite via SQLAlchemy (async)
- AI: Mistral API (model: mistral-large-latest)
- Package management: pip + requirements.txt

## Project structure to create
french-language-coach/
├── main.py                  # FastAPI app entry point, mounts static files, includes routers
├── config.py                # Settings loaded from .env (MISTRAL_API_KEY, etc.)
├── database.py              # SQLite + SQLAlchemy async engine and session setup
├── models/
│   ├── __init__.py
│   └── session.py           # SQLAlchemy ORM model for a conversation session
├── schemas/
│   ├── __init__.py
│   └── session.py           # Pydantic schemas for API request/response
├── services/
│   ├── __init__.py
│   └── mistral.py           # Mistral API client: chat completion + feedback generation
├── routers/
│   ├── __init__.py
│   ├── sessions.py          # POST /sessions (start), GET /sessions/{id}
│   ├── messages.py          # POST /sessions/{id}/messages (send a message, get AI reply)
│   └── feedback.py          # POST /sessions/{id}/feedback (generate end-of-session report)
├── static/
│   ├── index.html           # Single-page app: scenario selector + chat interface + feedback view
│   ├── style.css            # Clean, minimal styling
│   └── app.js               # Frontend logic: API calls, chat rendering, feedback display
├── scenarios.py             # Static list of 8-10 built-in conversation scenarios with name, description, and system prompt
├── .env.example             # Template: MISTRAL_API_KEY=, DATABASE_URL=
├── .gitignore               # Python, .env, __pycache__, *.db
├── requirements.txt         # fastapi, uvicorn, sqlalchemy, aiosqlite, mistralai, python-dotenv, pydantic
└── README.md                # Project overview, setup instructions, interview story paragraph

## Key behavioral requirements
- The Mistral system prompt for each scenario must instruct the model to respond ONLY in French, stay in character as a native French speaker, and never break into English regardless of what the user writes
- The feedback endpoint should send the full conversation history to Mistral with a separate system prompt that instructs it to respond in JSON with fields: grammar_score (0-100), vocabulary_score (0-100), fluency_score (0-100), overall_score (0-100), strengths (list of strings), focus_area (single string — the one most impactful thing to work on), and example_corrections (list of {original, corrected, explanation} objects)
- Sessions should be stored in SQLite with: id, scenario_id, created_at, ended_at, message history as JSON, and feedback as JSON
- The frontend should have three clear states: (1) scenario selection screen, (2) active chat screen, (3) feedback report screen

## Do not implement yet
- User authentication
- Multiple user support
- Anything requiring a paid database

Create all files with working stub implementations — real structure and wiring, not just empty files. The app should be runnable with `uvicorn main:app --reload` after pip install and .env setup.
