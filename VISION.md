# French Language Coach — Project Vision Document

*Built with Mistral Vibe and Claude Code · LLM features on the Mistral API, with Claude API support in progress*  
*Author: Cecil Beeland · Last updated: November 2026*

---

## The One-Sentence Pitch

A French learning app for intermediate learners that pairs AI conversation practice and feedback with grammar lessons and spaced-repetition vocabulary (cultural content is planned), developed with Mistral Vibe and Claude Code as a testbed for AI-assisted development and model selection.

---

## The Problem

Language learning is fragmented. Conversation apps lack structure. Grammar books lack interactivity. Flashcard apps lack context. Culture guides exist in isolation. There is no unified platform that weaves conversation, grammar, vocabulary, and culture together into a coherent learning experience tailored to the intermediate learner who wants to achieve real fluency, not just tourist-level proficiency.

---

## The Solution

French Language Coach is organized around four pillars, the first three of which have shipped in some form:

1. **Conversation Practice** — Immersive AI scenarios with natural French exchange and actionable feedback
2. **Grammar Mastery** — Interactive lessons and searchable reference with practical exercises
3. **Vocabulary Builder** — Spaced-repetition flashcards with context-rich examples
4. **Cultural Immersion** — Guides to regional variations, holidays, idioms, and daily life in French-speaking countries

Each pillar reinforces the others: vocabulary words appear in conversations, grammar concepts are practiced through dialogue, cultural context informs scenario interactions, and conversation mistakes populate personalized study materials.

---

## Why Mistral

Mistral's models have demonstrably stronger French language quality than most alternatives — an expected outcome for a Paris-based company whose training data and research culture are deeply French. For a French learning app, this means:

- **Conversation:** More natural phrasing, better idiomatic corrections, and more culturally authentic scenario responses
- **Grammar:** More accurate explanations of nuanced French grammar rules
- **Vocabulary:** Better context-aware word suggestions and usage examples
- **Culture:** Deeper understanding of regional variations and cultural subtleties

The project was originally built with Mistral Vibe, Mistral's AI-assisted coding environment, and is now developed with both Mistral Vibe and Claude Code, Anthropic's AI coding agent. That makes it a testbed for AI-assisted development and model selection: a planned evaluation will compare Mistral and Claude on the app's own feedback workload (accuracy, cost, latency) to test the French-quality claim above rather than assume it (see the "Model evaluation (Claude vs Mistral)" milestone, #228–#232).

---

## Target User

Intermediate English-speaking learners of French (B1-B2 level) who want to:
- Move beyond tourist phrases towards fluency
- Practice conversation without a tutor
- Understand grammar in context, not just rules
- Build vocabulary that sticks through spaced repetition
- Learn cultural nuances that native speakers take for granted

---

## Current State (Implemented)

### ✅ Conversation Practice (Core - Complete)

The user engages in realistic French conversation scenarios with AI role-play. Features implemented:

- **Scenario Selection:** 10 curated scenarios (Ordering at a Café, Asking for Directions, Job Interview, Hotel Check-in, Shopping for Clothes, Doctor's Visit, Train Travel, Dining at a Restaurant, Apartment Rental, Museum Visit)
- **Immersive Chat:** Multi-turn conversation with AI staying in character
- **Structured Feedback:** End-of-session report with grammar/vocabulary/fluency/overall scores, strengths, focus area, and example corrections
- **Session Persistence:** SQLite async database storing full conversation transcripts and feedback
- **Phase 1.5 additions:** Beginner/intermediate/advanced difficulty per scenario, session history with resume (Quick Access on the scenarios page), session detail view (transcript alongside feedback), session deletion, and session locking

**Backend API:**
- `POST /sessions/` — creates a new session for a given scenario and difficulty
- `GET /sessions/` — lists sessions
- `GET /sessions/{session_id}` — gets a session with its messages and feedback
- `DELETE /sessions/{session_id}` — deletes a session
- `POST /sessions/{session_id}/lock`, `POST /sessions/{session_id}/unlock` — locks or unlocks a session
- `POST /sessions/{session_id}/messages/` — sends user message, returns AI response
- `POST /sessions/{session_id}/feedback/` — generates structured feedback report

### ✅ Grammar (Phase 2 - Mostly Shipped)

Structured grammar study alongside conversation practice. Features implemented:

- **Grammar Lessons:** 21 interactive lessons covering core topics (present tense, passé composé, imparfait, subjunctive, pronouns, negation, questions and more), with a browser, search and filters
- **Reference Guide:** 50 searchable reference entries for quick lookup of grammar terms and concepts
- **Exercises:** 5 interactive exercises across 5 types (fill-in-the-blank, multiple-choice, translation, conjugation, sentence transformation) with immediate answer checking
- **Progress Tracking:** Lesson progress recorded per lesson
- **Recommendations:** Grammar lessons suggested from conversation feedback and shown in the feedback view

**Backend API:**
- `GET /grammar/lessons/`, `GET /grammar/lessons/{lesson_id}` — lists lessons, gets lesson content
- `GET /grammar/reference/` — lists and searches reference entries
- `GET /grammar/exercises/`, `GET /grammar/exercises/{exercise_id}` — lists exercises, gets an exercise
- `GET /grammar/recommendations/` — recommends lessons based on conversation feedback
- `POST /grammar/progress/`, `GET /grammar/progress/` — records and lists lesson progress

*Still open:* contextual practice using vocabulary from the user's conversations, and the remaining Phase 2 test and E2E issues.

### ✅ Vocabulary & Spaced Repetition (Phase 3 - Partly Shipped)

Flashcard study with SM-2 spaced repetition. Features implemented:

- **Themed Decks:** 11 pre-built decks with 553 cards, seeded automatically on startup
- **Deck Browsing:** Browse and search decks, view a deck and its cards
- **Flashcards:** Click/tap to flip between French and English with an example; swipe support on mobile
- **Review Sessions:** Cards due for review, rated Again/Hard/Good/Easy, with SM-2 interval and ease-factor updates

**Backend API:**
- `GET /vocabulary/decks/`, `POST /vocabulary/decks/` — lists decks, creates a deck
- `GET /vocabulary/decks/{deck_id}` — gets a deck
- `GET /vocabulary/decks/{deck_id}/cards/`, `POST /vocabulary/decks/{deck_id}/cards/` — lists cards, adds a card
- `GET /vocabulary/due/` — lists cards due for review
- `POST /vocabulary/review/`, `POST /card-review/` — records a review and updates spaced-repetition state

*Still open:* vocabulary extraction from conversations, a daily review scheduler, custom deck creation in the UI, a card editor, and a progress dashboard.

### 🔧 Technical Foundation (Complete)

- **Frontend:** React 19 SPA with TypeScript, Vite, and React Router v6. Organized into reusable components, pages, custom hooks, and utilities. Production build outputs to `static/` directory.
- **Backend:** FastAPI with async SQLAlchemy
- **Storage:** SQLite database with session history
- **AI:** Mistral-large-latest via Mistral API with structured JSON output
- **Hosting:** Local development with Vite (port 5173) + FastAPI (port 8000), production via FastAPI serving static files

---

## Future Enhancements (Backlog)

### 📚 Grammar Mastery (Phase 2)

Interactive grammar learning system that explains concepts in context and reinforces through practice.

- **Interactive Lessons:** Step-by-step tutorials covering French grammar topics (verb conjugations, tense usage, gender rules, pronoun placement, subjunctive mood, etc.)
- **Reference Guide:** Searchable grammar database with clear explanations, examples, and common pitfalls
- **Contextual Practice:** Grammar exercises that use vocabulary from the user's conversation history
- **Personalized Focus:** System identifies grammar weaknesses from conversation feedback and suggests targeted lessons
- **Difficulty Progression:** Three levels (beginner/intermediate/advanced) for each grammar topic

### 📖 Vocabulary Builder (Phase 3)

Spaced-repetition flashcard system integrated with conversation practice.

- **Smart Flashcards:** Anki-style spaced repetition with algorithm-adjusted review intervals
- **Contextual Learning:** Words and phrases extracted from user conversations with usage examples
- **Themed Decks:** Pre-built vocabulary sets (travel, dining, business, medical, etc.)
- **Custom Decks:** Users can create and share their own vocabulary collections
- **Multi-format Practice:** Recognition (French → English), recall (English → French), listening (audio), usage (fill-in-blank)
- **Progress Tracking:** Vocabulary mastery scores and learning streaks

### 🎭 Cultural Immersion (Phase 4)

Comprehensive cultural context to deepen understanding and fluency.

- **Regional Guides:** Differences between France, Belgium, Switzerland, Quebec, and African Francophone countries
- **Holidays & Traditions:** Calendar of French-speaking world holidays with cultural significance
- **Idioms & Expressions:** Searchable database of common French idioms with explanations and usage examples
- **Daily Life:** Guides to French etiquette, social norms, and practical situations (banking, healthcare, transportation)
- **Media Library:** Curated recommendations for French films, books, podcasts, and news sources with difficulty ratings
- **Cultural Notes in Conversations:** Optional hints about cultural context during scenarios

### 🎯 Platform Enhancements (Ongoing)

- **Difficulty Levels:** User-selectable difficulty (beginner/intermediate/advanced) for scenarios with adjusted vocabulary pace and complexity
- **Session History UI:** Browseable history of past sessions with filtering and search
- **PDF Export:** Download feedback reports and vocabulary lists as PDF
- **Loading States:** Improved UI feedback during AI response generation
- **Mobile Responsiveness:** Enhanced mobile experience
- **User Accounts:** Cloud sync across devices (post-MVP)
- **Audio Input/Output:** Voice conversation practice (stretch goal)
- **Progress Analytics:** Charts and statistics tracking improvement over time

---

## Technical Architecture

**Frontend:** React 19 SPA with TypeScript, Vite, and React Router v6. The frontend is organized into reusable components (ScenarioSelector, ChatInterface, FeedbackView), pages (HomePage, ChatPage, FeedbackPage), custom hooks (useSessions, useApi), and utility functions. The React app is built with Vite and outputs to the `static/` directory for production serving by FastAPI.

**Backend:** Python with FastAPI. Current endpoints:
- `POST /sessions/` — creates a new session for a given scenario
- `POST /sessions/{session_id}/messages/` — sends user message, returns model response
- `POST /sessions/{session_id}/feedback/` — sends full transcript, returns structured feedback report

Future endpoints:
- `GET /grammar/lessons/` — list available grammar lessons
- `GET /grammar/lessons/{id}` — get lesson content
- `GET /vocabulary/decks/` — list vocabulary decks
- `POST /vocabulary/review/` — submit flashcard review, update spaced repetition intervals
- `GET /culture/regions/` — list cultural guides

**Model:** `mistral-large-latest` via the Mistral API for all AI-powered features. Structured output (JSON mode) for feedback, grammar explanations, and vocabulary examples.

**Storage:** SQLite async database for session history, user progress, vocabulary decks, and grammar lesson completion. Future: PostgreSQL for multi-user cloud deployment.

**Prompting Strategy:**
- System prompts establish scenario persona with explicit instruction NOT to correct mid-conversation
- Full conversation history passed on each turn for context continuity
- Separate structured feedback prompt with JSON schema for consistent parsing
- Grammar and vocabulary prompts optimized for educational clarity

---

## Roadmap

### Phase 1 — Conversation Foundation (✅ Complete)
*Core conversation practice with feedback and session persistence*

### Phase 2 — Grammar Mastery (Mostly shipped)
*Interactive lessons, reference guide, and contextual practice*
- Build grammar lesson database
- Implement lesson viewer and progress tracker
- Connect grammar concepts to conversation feedback

### Phase 3 — Vocabulary Builder (In progress)
*Spaced-repetition flashcards integrated with conversation*
- Implement Anki-style algorithm
- Create vocabulary extraction from conversations
- Build themed and custom deck system

### Phase 4 — Cultural Immersion
*Comprehensive cultural context and guides*
- Develop regional and cultural content database
- Integrate cultural hints into conversations
- Create media recommendation system

### Phase 5 — Polish & Deployment
*Production-ready features and cloud hosting*
- User accounts and cloud sync
- Mobile optimization
- Public deployment (Railway, Render)

---

## Success Criteria

### Phase 1 (Current)
- [x] A complete conversation session can be conducted and feedback received in under 5 minutes
- [x] The French feels natural enough to be genuinely useful for practice
- [x] The feedback report identifies real errors with accurate corrections
- [ ] README tells the complete story in under 90 seconds of reading

### Full Vision
- [ ] Users can seamlessly transition from conversation practice to grammar study to vocabulary review
- [ ] Cultural context appears naturally within conversations
- [ ] Spaced repetition system demonstrates measurable vocabulary retention
- [ ] Grammar lessons reduce conversation errors over time
- [ ] Users report improved confidence in real French conversations
- [ ] Platform has 100+ active monthly users (post-public deployment)
