# French Language Coach — Project Vision Document

*Built with Mistral Vibe · Powered by Mistral AI API*  
*Author: Cecil Beeland · Last updated: May 2026*

---

## The One-Sentence Pitch

A comprehensive French language learning platform that combines immersive AI conversation practice with structured grammar lessons, spaced-repetition vocabulary training, and rich cultural context — built using Mistral's own AI coding tool, powered by Mistral's API, for intermediate learners seeking fluency.

---

## The Problem

Language learning is fragmented. Conversation apps lack structure. Grammar books lack interactivity. Flashcard apps lack context. Culture guides exist in isolation. There is no unified platform that weaves conversation, grammar, vocabulary, and culture together into a coherent learning experience tailored to the intermediate learner who wants to achieve real fluency, not just tourist-level proficiency.

---

## The Solution

French Language Coach is a comprehensive learning platform with four integrated pillars:

1. **Conversation Practice** — Immersive AI scenarios with natural French exchange and actionable feedback
2. **Grammar Mastery** — Interactive lessons and searchable reference with practical exercises
3. **Vocabulary Builder** — Spaced-repetition flashcards with context-rich examples
4. **Cultural Immersion** — Guides to regional variations, holidays, idioms, and daily life in French-speaking countries

Each pillar reinforces the others: vocabulary words appear in conversations, grammar concepts are practiced through dialogue, cultural context informs scenario interactions, and conversation mistakes populate personalized study materials.

---

## Why Mistral

Mistral's models have demonstrably stronger French language quality than most alternatives — an expected outcome for a Paris-based company whose training data and research culture are deeply French. For a comprehensive French language platform, this means:

- **Conversation:** More natural phrasing, better idiomatic corrections, and more culturally authentic scenario responses
- **Grammar:** More accurate explanations of nuanced French grammar rules
- **Vocabulary:** Better context-aware word suggestions and usage examples
- **Culture:** Deeper understanding of regional variations and cultural subtleties

This project is also built entirely using Mistral Vibe, Mistral's AI-assisted coding environment, making it a genuine end-to-end demonstration of the Mistral developer ecosystem.

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

**Backend API (3 endpoints):**
- `POST /sessions/` — creates a new session for a given scenario
- `POST /sessions/{session_id}/messages/` — sends user message, returns AI response
- `POST /sessions/{session_id}/feedback/` — generates structured feedback report

### 🔧 Technical Foundation (Complete)

- **Frontend:** Vanilla HTML/CSS/JavaScript with multi-view navigation
- **Backend:** FastAPI with async SQLAlchemy
- **Storage:** SQLite database with session history
- **AI:** Mistral-large-latest via Mistral API with structured JSON output
- **Hosting:** Local development server

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

**Frontend:** Clean, minimal HTML/CSS with vanilla JavaScript for conversation flow management. Future: Consider lightweight framework (Svelte, Alpine.js) for enhanced interactivity.

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

### Phase 2 — Grammar Mastery (Next)
*Interactive lessons, reference guide, and contextual practice*
- Build grammar lesson database
- Implement lesson viewer and progress tracker
- Connect grammar concepts to conversation feedback

### Phase 3 — Vocabulary Builder
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
