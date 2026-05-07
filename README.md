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

## Why Mistral for French

Mistral models are used in this application in part because, as a French AI company, Mistral trains its models with native French fluency — giving Mistral Large demonstrated benchmark advantages in French language comprehension and generation compared to models trained primarily on English.

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
| POST | `/sessions/` | Create a new conversation session |
| GET | `/sessions/{id}` | Get session details and messages |
| POST | `/sessions/{id}/messages` | Send a message, get AI reply |
| POST | `/sessions/{id}/feedback` | Generate end-of-session feedback |

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

> **TODO**: Document the specific workflow, Vibe CLI commands, and agent interactions used during development.
>
> This section will describe:
> - How Vibe was configured and invoked
> - The iterative development process with the agent
> - Prompting strategies for different tasks
> - Lessons learned and best practices

## Limitations

- No user authentication
- Single-user only (all sessions stored in one database)
- Requires Mistral API key (paid service)

## License

MIT License
