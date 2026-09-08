# SPDD Analysis: Grammar-to-Conversation Recommendation

**GitHub Issue**: #40
**Issue Title**: 2.8: Implement grammar-to-conversation recommendation
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/40
**Artifact ID**: FLC-047-202609081710
**Created**: 2026-09-08 17:10
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

> Analyze conversation feedback and suggest relevant grammar lessons.
>
> ## Logic
> - Map focus_area from feedback to grammar lesson topics
> - Return 1-3 most relevant lessons
> - Fallback to general lessons if no match
>
> ## Acceptance Criteria
> - [ ] Mapping from focus_area to lesson topics
> - [ ] Returns lesson IDs
> - [ ] Handles unknown focus areas
> - [ ] API endpoint: GET /grammar/recommendations/?focus_area=

---

## Background

The French Language Coach app generates end-of-session conversation feedback via the
Mistral API (`services/mistral.py:get_feedback`). That feedback includes a `focus_area`
field — a free-form string identifying the single most impactful area to improve (e.g.,
"grammar", "vocabulary", "Past Tenses"). The grammar module already exposes lessons
organized by `topic` (e.g., "Past Tenses", "Pronouns", "Verb Tenses") via
`GET /grammar/lessons/`. There is currently no bridge between the two: after receiving
feedback, a learner has no automated pointer to which grammar lessons would address the
identified weakness. This feature adds that bridge — a recommendations endpoint that
maps a feedback `focus_area` string to 1-3 relevant grammar lesson IDs.

---

## Business Value

- **Closed feedback loop**: Learner receives feedback, then immediately sees which
  grammar lessons address the weakness — turning feedback into actionable study.
- **Discovery**: Surfaces relevant lessons without requiring the learner to manually
  browse and filter the lesson catalog.
- **Engagement**: Increases the likelihood a learner continues studying after a session
  by reducing friction between feedback and remediation.

---

## Scope In

- [x] A mapping from feedback `focus_area` strings to grammar lesson `topic` values
- [x] New API endpoint `GET /grammar/recommendations/?focus_area=` returning 1-3 lesson IDs
- [x] Response schema for the recommendations endpoint
- [x] Fallback to general lessons when `focus_area` does not match any known topic
- [x] Handling of unknown / empty / malformed `focus_area` values
- [x] Unit and integration tests for the new endpoint and mapping logic
- [x] README.md update documenting the new endpoint

## Scope Out

- [ ] Storing recommendations in the database (recommendations are computed on demand)
- [ ] Frontend UI for displaying recommendations (separate issue)
- [ ] Changing the Mistral feedback prompt to constrain `focus_area` values
- [ ] Personalization based on lesson progress (that data exists but is out of scope here)
- [ ] Re-ranking recommendations by user history or completion status

---

## Acceptance Criteria (ACs)

1. **AC1 — Mapping from focus_area to lesson topics**
   **Given** a set of known focus_area keywords and a catalog of lessons with topics
   **When** a focus_area string is provided
   **Then** the system maps it to one or more matching grammar lesson topics

2. **AC2 — Returns lesson IDs**
   **Given** a matched topic
   **When** the endpoint processes the request
   **Then** the response contains the lesson IDs (and lesson summaries) for matching lessons,
   limited to a maximum of 3

3. **AC3 — Handles unknown focus areas**
   **Given** a focus_area that does not match any known topic mapping
   **When** the endpoint processes the request
   **Then** the system returns a fallback set of general/beginner lessons (not an error)

4. **AC4 — API endpoint: GET /grammar/recommendations/?focus_area=**
   **Given** the grammar router is registered at `/grammar`
   **When** a client requests `GET /grammar/recommendations/?focus_area=<value>`
   **Then** the endpoint returns 200 with a list of recommended lessons

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarLesson** (`schemas/grammar_lesson.py:65`): Pydantic model with `id` (str), `title`,
  `topic` (str), `difficulty` (DifficultyLevel), `sections`. The `topic` field is the join key
  for this feature. Lessons are loaded from JSON files in `data/grammar_lessons/`.
- **DifficultyLevel** (`schemas/grammar_lesson.py:20`): enum `beginner | intermediate | advanced`.
- **LessonSummary** (`schemas/grammar.py:23`): response summary — `id, title, topic, difficulty`.
- **Grammar router** (`routers/grammar.py`): `APIRouter(prefix="/grammar", tags=["grammar"])`,
  reads from JSON files via `get_lessons()` (line 63). No database dependency.
- **FeedbackResponse** (`schemas/session.py:71`): contains `focus_area: str` (line 77). This is
  a free-form string produced by the Mistral LLM (`services/mistral.py:34,41`); fallback
  value on parse error is `"Pratiquer davantage"` (line 62). No enum, no validator.
- **Lesson topics in catalog** (from `data/grammar_lessons/*.json`, 22 lessons, 9 distinct topics):
  - `Nouns and Adjectives` (articles, gender-agreement)
  - `Verb Tenses` (present-tense-regular, present-tense-irregular)
  - `Past Tenses` (passe-compose, imparfait, plus-que-parfait)
  - `Future Tenses` (future-proche, future-simple)
  - `Moods` (conditional, subjunctive, imperative)
  - `Pronouns` (subject-pronouns, indirect-object-pronouns, direct-object-pronouns, relative-pronouns)
  - `Questions` (questions-words, questions-est-ce-que, questions-inversion)
  - `Sentence Structure` (negation, prepositions-conjunctions-adverbs)
  - `Verbs` (present-tense / example_lesson)

### New Concepts Required

- **FocusAreaTopic mapping**: a dictionary mapping focus_area keywords (and keyword groups)
  to lesson topic strings. This is the core domain logic of this feature.
- **RecommendationResponse schema**: a Pydantic response model holding the focus_area
  queried, the matched topic (if any), and the list of recommended `LessonSummary` items.
- **Recommendation endpoint**: `GET /grammar/recommendations/` on the grammar router.

### Key Business Rules

- **Rule**: A recommendation request returns at most 3 lessons.
- **Rule**: Mapping is case-insensitive and based on keyword/substring matching against a
  curated keyword-to-topic dictionary, because `focus_area` is free-form LLM output.
- **Rule**: Unknown focus areas never error — they return a fallback of general beginner lessons.
- **Rule**: When a topic matches multiple lessons, the returned lessons are capped at 3
  (deterministic order — by lesson ID — so results are stable).
- **Rule**: The endpoint lives on the existing grammar router (no new router, no DB dependency)
  because lessons are file-backed, consistent with the rest of `/grammar`.

---

## Strategic Approach

### Solution Direction

1. Add a curated `FOCUS_AREA_TO_TOPIC` mapping in `routers/grammar.py` (or a small adjacent
   module) that maps common focus_area keywords to the 9 existing lesson topics. Keywords
   cover both English and French terms since the LLM emits French focus areas.
2. Add a `map_focus_area_to_topics(focus_area: str) -> list[str]` function that returns
   matching topic strings (case-insensitive substring/keyword match). Returns `[]` when
   nothing matches.
3. Add a `get_recommendations(focus_area)` function that loads lessons, filters by matched
   topics, sorts deterministically, and caps at 3. On no match, returns a fallback set of
   general beginner lessons.
4. Add `RecommendationResponse` schema to `schemas/grammar.py` reusing `LessonSummary`.
5. Add `GET /grammar/recommendations/` endpoint to the grammar router returning
   `RecommendationResponse`.
6. Add tests to `tests/test_grammar_router.py` covering mapping, matching, cap-at-3,
   unknown focus areas, empty/blank focus areas, and fallback behavior.
7. Document the endpoint in `README.md`.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Where to put the mapping | Inline in router vs separate module | Inline dict + helper fn in `routers/grammar.py` — keeps the feature co-located with other grammar endpoints and matches existing single-file router style |
| Matching strategy | Exact enum vs substring/keyword | Keyword/substring match against a curated dictionary — `focus_area` is free-form LLM text (French/English), so an exact enum would be too brittle |
| Response shape | Just IDs vs full summaries | Return `LessonSummary` list (id, title, topic, difficulty) — gives clients enough to render links without a second request; the issue says "Returns lesson IDs" but summaries include IDs and add value |
| Fallback behavior | Empty list vs general lessons | General beginner lessons — the issue explicitly says "Fallback to general lessons if no match"; an empty list is less useful and the issue forbids erroring |
| Determinism | LLM-order vs sorted | Sort matched lessons by `id` ascending before capping at 3 — stable, testable results |
| Max returned | 1-3 per issue | Hard cap at 3 as the issue specifies "Return 1-3 most relevant lessons" |
| French vs English keywords | One or both | Both — the feedback prompt is French (`services/mistral.py:26`) and test fixtures use English; supporting both maximizes match rate |

### Alternatives Considered

- **Alternative 1**: Constrain the LLM to emit a focus_area enum, then map enum->topic.
  Rejected — changes the feedback prompt/contract and risks breaking existing stored
  feedback; out of scope for this issue.
- **Alternative 2**: Store recommendations in the DB and persist per-session.
  Rejected — issue scope is on-demand recommendations; persistence is a future concern.
- **Alternative 3**: Compute recommendations from lesson progress / completion history.
  Rejected — personalization is explicitly out of scope; the issue is about topic mapping.
- **Alternative 4**: Return only lesson IDs (bare strings). Rejected — returning `LessonSummary`
  objects that include IDs is a superset that still satisfies "Returns lesson IDs" while being
  more useful to clients.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Fallback to general lessons" — which lessons? | Which lessons count as "general"? | Use beginner-difficulty lessons as general fallback; they are the broadest entry point. Cap at 3. |
| "1-3 most relevant" ordering | How to rank lessons within a topic? | Deterministic sort by lesson `id` ascending, then cap at 3. Stable and testable. |
| focus_area language | English or French? | Support both via bilingual keyword dictionary; the LLM prompt is French but fixtures use English. |
| Required vs optional focus_area param | Is the query param required? | Make it required (per the issue's endpoint spec `?focus_area=`), but treat blank/whitespace as unknown -> fallback. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty string focus_area | Client sends `?focus_area=` | Treat as unknown -> fallback general lessons |
| Whitespace-only focus_area | `"   "` | Trim then treat as unknown -> fallback |
| Unknown focus_area (e.g. "Pratiquer davantage") | LLM fallback value, no topic match | Return fallback general lessons (AC3) |
| Partial match (e.g. "past") | Substring should catch "Past Tenses" | Match via keyword dictionary |
| Topic with >3 lessons (e.g. Pronouns has 4) | Must honor 1-3 cap | Sort by id, return first 3 |
| No lessons directory / empty catalog | Defensive | Return empty recommendations list (no 500) |
| focus_area matching multiple topics | e.g. "tenses" matches Verb/Past/Future Tenses | Collect across all matched topics, sort, cap at 3 |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Keyword dictionary drifts from lesson topics | Missed matches | Keep mapping keys aligned to the 9 topics; add tests that assert each topic is reachable |
| LLM emits unanticipated focus_area phrasing | Fallback overused | Acceptable per AC3; bilingual keywords reduce miss rate; can be extended later |
| Breaking existing grammar endpoints | Regression | Add new endpoint + schema only; do not modify existing endpoints |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Mapping from focus_area to lesson topics | Yes | `FOCUS_AREA_TO_TOPIC` dict + `map_focus_area_to_topics()` |
| AC2 | Returns lesson IDs | Yes | `RecommendationResponse` includes `LessonSummary` (which has `id`); capped at 3 |
| AC3 | Handles unknown focus areas | Yes | Fallback to general beginner lessons |
| AC4 | API endpoint GET /grammar/recommendations/?focus_area= | Yes | New endpoint on grammar router |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- The endpoint must be registered on the existing grammar router (no new router registration).
- The response should be deterministic for testability.
- The mapping must be case-insensitive (LLM output casing is unpredictable).

---

## REASONS Canvas

### Requirements
- Mapping from focus_area to lesson topics (AC1)
- Returns lesson IDs (AC2)
- Handles unknown focus areas (AC3)
- API endpoint: GET /grammar/recommendations/?focus_area= (AC4)
- Return 1-3 most relevant lessons
- Fallback to general lessons if no match

### Examples
- `focus_area="Past Tenses"` -> topics ["Past Tenses"] -> lesson IDs ["passe-compose", "imparfait", "plus-que-parfait"] (capped at 3)
- `focus_area="grammar"` -> broad keyword -> match a general/default topic set -> fallback if no curated keyword
- `focus_area="Pratiquer davantage"` (LLM fallback) -> no topic match -> fallback general beginner lessons
- `focus_area=""` -> treated as unknown -> fallback general beginner lessons
- `focus_area="pronoms"` (French for pronouns) -> topic ["Pronouns"] -> up to 3 lesson IDs

### Architecture
- Grammar router: `routers/grammar.py`, `APIRouter(prefix="/grammar", tags=["grammar"])`, file-backed via `get_lessons()`
- Response schemas in `schemas/grammar.py`, reuse `LessonSummary`
- No database dependency for grammar endpoints (file-backed)
- Test client fixture in `tests/conftest.py` (async, overrides `get_db`)

### Standards
- PEP 8, match existing codebase style
- Pydantic schemas with docstrings and `Field(..., description=...)`
- 80% test coverage minimum for new code
- FastAPI `Query` params with descriptions
- Docstrings for public functions
- Update README.md API table for the new endpoint

### Omissions
- No frontend UI (separate issue)
- No DB persistence of recommendations
- No change to the Mistral feedback prompt
- No personalization via lesson progress

### Notes
- `focus_area` is free-form LLM text in French (`services/mistral.py:26-41`); fallback `"Pratiquer davantage"`.
- 9 distinct lesson topics exist across 22 lessons in `data/grammar_lessons/`.
- Existing grammar router reads JSON files; follow that pattern (no `get_db`).
- Tests live in `tests/test_grammar_router.py` alongside existing grammar tests.

### Solutions
- Reuse `LessonSummary` from `schemas/grammar.py` for response items.
- Reuse `get_lessons()` from `routers/grammar.py` to load the lesson catalog.
- Follow the existing endpoint pattern: `@router.get(...)`, async def, `Query(...)` params, `response_model=...`.
- Follow the existing test pattern: `@pytest.mark.asyncio` + `client` fixture, integration tests hitting the real JSON data.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
