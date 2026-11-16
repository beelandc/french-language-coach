# SPDD Prompt: Hand-Labeled Feedback Dataset

**GitHub Issue**: #230
**Issue Title**: Hand-labeled feedback dataset (25 to 30 conversations)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/230
**Artifact ID**: FLC-062-202611152023
**Created**: 2026-11-15 20:23
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-062-202611152007-[Analysis]-issue-230-feedback-dataset.md`

---

## Context

### Current Codebase State
- The provider layer (#228) and schema-validated feedback (#229) are merged. Feedback quality has no ground truth yet; the metrics report defers quality to the eval harness (#231), which needs this dataset.
- There is no `evals/` directory. The issue approves creating it.
- Feedback output shape: `FeedbackResponse` with `grammar_score` (0–100 int) and `example_corrections[{original, corrected, explanation}]`. The dataset's labels mirror these names so #231 can match them directly.
- CI runs `python3 -m pytest tests/ ... --cov` with `.coveragerc` `source = .` and `fail_under = 80`, then a per-module check. Any new `.py` under `evals/` is measured and must reach 80% on its own.
- The pytest workflow is path-filtered and doesn't include `evals/**`.

### Decisions already made (user, 2026-11-15)
- **Who labels**: Claude Code drafts the conversations and proposes every label and score; the maintainer reviews and corrects them before merge.
- **Labeler proficiency**: the maintainer self-assesses at about **B1**: solid on core grammar, moods and tenses, decent vocabulary, comprehension stronger than production.
- **Bias**: disclose only. Claude drafts all conversations; the README names the possible bias toward Claude models in #231. No per-record `source` field.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `scenarios.py` | Scenario definitions, source of truth for IDs and difficulties | `SCENARIOS` (line 13), `VALID_DIFFICULTIES` (line 619, a set) |
| `schemas/session.py` | Feedback output schema | `ExampleCorrection`, `FeedbackResponse` (lines 71–89) |
| `services/llm/base.py` | Feedback prompt and transcript format | `FEEDBACK_PROMPT` (line 87), `build_transcript` (line 153) |
| `routers/sessions.py` | Message shape; assistant speaks first | line 62 |
| `schemas/grammar_lesson.py` | Content-schema pattern to follow | `field_validator`/`model_validator` (lines 47–104), `load_lesson_from_file` (line 113) |
| `tests/test_grammar_lesson_schema.py` | Test style for content schemas | fixtures + `pytest.raises(ValidationError)` |
| `tests/conftest.py` | `valid_scenario_ids` fixture | line 77 |
| `.github/workflows/pytest-tests.yml` | Path filters for push and pull_request | both `paths:` lists |
| `.coveragerc`, `scripts/check_module_coverage.py` | 80% total and per-module gate | `fail_under`, `ALLOWLIST` (line 52; do not add to it) |
| `README.md` | Intro (line 5) and Project Structure (line 231) | — |

### Existing Patterns
- Pydantic v2 content models with validators and a loader that raises a clear error, tested against real data files plus synthetic invalid inputs (`schemas/grammar_lesson.py`).
- Messages as `{"role": "user"|"assistant", "content": str}`, assistant first.
- Tests import repo-root packages directly (`from schemas... import`, `from scenarios import ...`), so a new `evals` package with `__init__.py` is importable the same way.

---

## Goal

**Primary Objective**: Add `evals/datasets/feedback_v1.jsonl`, 27 labeled learner conversations that serve as ground truth for end-of-session feedback, with a Pydantic schema and a CI test that validates every line.

**Secondary Objectives**:
- A labeling guide (`evals/LABELING.md`) that defines the error categories, span rules and the grammar-score rubric.
- An honest `evals/README.md`: how the data was produced, who reviewed it at what proficiency, and its limits.
- `evals/**` triggers the pytest workflow.
- Root `README.md` mentions `evals/`.

---

## Constraints

### Architecture Constraints
- New files only under `evals/` (approved), `tests/`, plus edits to `.github/workflows/pytest-tests.yml` and `README.md`. No other app code changes.
- No new dependencies. Use Pydantic (already installed); no `jsonschema`.
- No LLM API calls from code. The conversations are static data written by hand in this session.
- Validate `scenario_id` and `difficulty` against `scenarios.SCENARIOS` / `scenarios.VALID_DIFFICULTIES`; don't duplicate the lists.
- Must not change: `services/`, `routers/`, `schemas/`, `models/`, `scenarios.py`, `.coveragerc`, `scripts/check_module_coverage.py` (no `ALLOWLIST` entry).

### Code Quality Constraints
- PEP 8, type hints, module/class/function docstrings, consistent with `schemas/grammar_lesson.py`.
- JSONL: one compact JSON object per line, UTF-8, ASCII apostrophes (`'`), no non-breaking spaces, file ends with a newline.

### Testing Constraints
- `tests/test_feedback_dataset.py`, discovered by the existing `pytest tests/` run.
- `evals/schema.py` ≥ 80% line coverage (aim for ~100%; every validator branch has a rejection test).
- Full suite and per-module gate must still pass.

### Acceptance Criteria
- [ ] At least 25 conversations, with 3 or more per difficulty level, including 2 or 3 clean conversations that should get few or no corrections
- [ ] Every labeled error has a category, an original span and a corrected form
- [ ] `evals/README.md` states how the conversations were produced and the labeler's French proficiency
- [ ] A schema test validates the file in CI

---

## Examples

### Input/Output Examples
1. **Valid record** (pretty-printed; one line in the file):
   ```json
   {"id": "fb-001", "scenario_id": "cafe_order", "difficulty": "beginner",
    "messages": [
      {"role": "assistant", "content": "Bonjour ! Qu'est-ce que vous voulez boire ?"},
      {"role": "user", "content": "Bonjour, je veux un café et un croissant, s'il vous plaît."},
      {"role": "assistant", "content": "Très bien. Sur place ou à emporter ?"},
      {"role": "user", "content": "Sur place. Je vais m'asseoir à le comptoir."}],
    "errors": [
      {"message_index": 3, "category": "contraction", "original": "à le comptoir",
       "corrected": "au comptoir", "note": "à + le contracts to au"}],
    "grammar_score": 88}
   ```
   → validates; `record.is_clean is False`.
2. **Clean record**: `"errors": []`, `"grammar_score": 97` → validates, `is_clean is True`.
3. **Alternatives**: `{"original": "je veux", "corrected": "je voudrais", "alternatives": ["j'aimerais"], "category": "register", ...}` → validates.

### Edge Cases
- `original` not a verbatim substring of `messages[message_index].content` → rejected.
- `message_index` out of range, or pointing to an `assistant` message → rejected.
- `corrected == original`, empty or whitespace-only `original`/`corrected`, an alternative equal to `original` or duplicated → rejected.
- Unknown `category`, `scenario_id` or `difficulty`; `grammar_score` of -1, 101 or `"85"` (string) → rejected.
- First message not from the assistant; two consecutive messages from the same role; no user message → rejected.
- Unknown extra field (e.g. a typo `"categroy"`) → rejected.
- Clean record with `grammar_score < 90` → rejected.
- Loader: blank lines skipped; invalid JSON or schema failure reported with the 1-based line number; duplicate `id` rejected.

### Test Cases
```python
def test_error_span_must_occur_in_message(valid_record):
    # Given a labeled error whose span isn't in the learner message
    valid_record["errors"][0]["original"] = "à la gare"
    # When / Then
    with pytest.raises(ValidationError, match="not found"):
        FeedbackEvalRecord.model_validate_json(json.dumps(valid_record))


def test_loader_reports_line_number(tmp_path, valid_record):
    path = tmp_path / "data.jsonl"
    path.write_text(json.dumps(valid_record) + "\n{not json}\n", encoding="utf-8")
    with pytest.raises(DatasetError, match="line 2"):
        load_dataset(path)


@pytest.mark.parametrize("line_no, line", _dataset_lines())
def test_each_dataset_line_validates(line_no, line):
    FeedbackEvalRecord.model_validate_json(line)
```

---

## Deliverables

### Code Changes
- [ ] `evals/__init__.py`: package docstring
- [ ] `evals/schema.py`: `ErrorCategory`, `GRAMMATICAL_CATEGORIES`, `Message`, `LabeledError`, `FeedbackEvalRecord`, `DatasetError`, `DATASET_PATH`, `load_dataset()`
- [ ] `evals/datasets/feedback_v1.jsonl`: 27 records
- [ ] `.github/workflows/pytest-tests.yml`: `- 'evals/**'` in both path lists

### Tests
- [ ] `tests/test_feedback_dataset.py`: per-line validation of the real file, dataset composition checks (ACs), schema unit tests for every rejection path, loader tests, a LABELING.md ↔ enum sync check

### Documentation
- [ ] `evals/LABELING.md`: labeling guide
- [ ] `evals/README.md`: provenance, format, limits, review status
- [ ] `README.md`: `evals/` in Project Structure; one sentence in the intro's model-evaluation text

---

## Actual Prompt

```
Implement GitHub issue #230: a hand-labeled feedback dataset for the French
Language Coach, with a Pydantic schema and a CI test.

CONTEXT:
- Repo root is a FastAPI app. Scenarios live in scenarios.py: SCENARIOS (list of
  dicts with "id"; 10 IDs: cafe_order, ask_directions, job_interview,
  hotel_checkin, shopping, doctor_visit, train_travel, restaurant_dining,
  apartment_rental, museum_visit) and VALID_DIFFICULTIES (set: beginner,
  intermediate, advanced).
- End-of-session feedback (schemas/session.py FeedbackResponse) returns
  grammar_score (int 0-100) and example_corrections [{original, corrected,
  explanation}]. Conversations are lists of {"role": "user"|"assistant",
  "content": str}, assistant first (routers/sessions.py:62), rendered by
  services/llm/base.py build_transcript.
- Content-schema pattern to follow: schemas/grammar_lesson.py (Pydantic v2,
  field_validator / model_validator, loader function) and its tests.
- CI: python3 -m pytest tests/ --cov with .coveragerc source=. and
  fail_under=80, plus a per-module 80% check (scripts/check_module_coverage.py).
  New modules must meet 80%; do not touch ALLOWLIST.
- .github/workflows/pytest-tests.yml has path filters under push and
  pull_request that don't include evals/**.
- Decisions made by the user: Claude Code drafts the conversations and
  proposes all labels and scores; the maintainer reviews and corrects them
  before merge. Maintainer's French: self-assessed about B1 (solid on core
  grammar, moods and tenses; decent vocabulary; comprehension stronger than
  production). Bias toward Claude in the later Claude-vs-Mistral comparison is
  disclosed in the README only; no per-record source field.

GOAL:
Create the evals/ directory with a 27-conversation labeled dataset, its schema,
a labeling guide, a README, and a pytest test that validates every line in CI.

1) evals/__init__.py
   Docstring only: offline evaluation data and tooling (dataset #230,
   harness #231).

2) evals/schema.py
   - ErrorCategory(str, Enum) with exactly these values:
     gender, agreement, conjugation, tense_mood, auxiliary, article,
     contraction, preposition, pronoun, negation, word_order, spelling,
     register, anglicism, lexical.
   - GRAMMATICAL_CATEGORIES: frozenset of all except register, anglicism,
     lexical (these are labeled but don't drive grammar_score).
   - All models: model_config = ConfigDict(extra="forbid", strict=True).
     Records are parsed with model_validate_json, so strict JSON mode still
     accepts strings for enums and Literals but rejects "85" for an int.
   - Message: role Literal["user", "assistant"]; content str, non-blank.
   - LabeledError: message_index int >= 0; category ErrorCategory;
     original str, non-blank; corrected str, non-blank;
     alternatives list[str] = [] (each non-blank, no duplicates, none equal to
     original or corrected); note Optional[str] = None.
     Validator: corrected != original.
   - FeedbackEvalRecord: id str matching ^fb-\d{3}$; scenario_id str (must be
     one of the IDs in scenarios.SCENARIOS); difficulty str (must be in
     scenarios.VALID_DIFFICULTIES); messages list[Message] (min 2);
     errors list[LabeledError]; grammar_score int 0..100;
     notes Optional[str] = None.
     model_validator(mode="after"):
       * messages[0].role == "assistant", roles strictly alternate, and at
         least one user message exists;
       * for each error: message_index < len(messages), that message's role is
         "user", and error.original occurs verbatim in its content
         (error message includes the record id, index and span, and the
         word "not found" for a missing span);
       * if errors is empty, grammar_score >= 90 (clean conversations must
         score high).
     Property is_clean -> bool (no errors).
   - DATASET_PATH = Path(__file__).parent / "datasets" / "feedback_v1.jsonl".
   - DatasetError(ValueError).
   - load_dataset(path: Path | str = DATASET_PATH) -> list[FeedbackEvalRecord]:
     read UTF-8, skip blank/whitespace lines, parse each line with
     FeedbackEvalRecord.model_validate_json; wrap ValidationError as
     DatasetError("<path> line <n>: <details>") using the 1-based line number;
     raise DatasetError on a duplicate id naming both line numbers.
   - Docstrings on every public name.

3) evals/datasets/feedback_v1.jsonl: 27 records, ids fb-001..fb-027.
   - 9 per difficulty. Scenario use: cafe_order, ask_directions, hotel_checkin,
     shopping, doctor_visit, train_travel, apartment_rental: 3 each
     (one per level); restaurant_dining, museum_visit, job_interview: 2 each.
     Beginner omits job_interview; intermediate omits restaurant_dining;
     advanced omits museum_visit.
   - Exactly 3 clean records (errors: []), one per difficulty level, written
     in correct French at that level.
   - Each conversation: assistant first, alternating, 3 to 5 learner turns.
     Assistant turns are correct, natural French in the scenario's persona and
     level (beginner: short simple sentences, vous; advanced: richer, idioms).
     Learner turns are plausible typed learner French for the level.
   - Planted errors typical of the level, 2 to 6 per non-clean record:
       beginner: gender, article, conjugation (present), contraction,
         negation, basic prepositions (à/en/au with places), word order of
         simple adjectives.
       intermediate: auxiliary (être/avoir in passé composé), agreement
         (past participle, adjectives), tense_mood (imparfait vs passé
         composé), partitive articles, prepositions (depuis/pendant, verb +
         de/à), pronouns (y/en, COD/COI).
       advanced: tense_mood (subjonctif after il faut que / bien que /
         avant que; conditionnel in si-clauses), pronoun order, register
         (tu/vous, "ouais" in an interview), anglicism (e.g. "appliquer pour
         un poste", "être excité", "faire du sens"), lexical.
     For advanced records, prefer errors governed by well-established rules
     over subtle stylistic ones, because the reviewer is about B1; if a label
     is a judgment call, say so in its note.
   - After drafting each conversation, reread every learner turn and label
     EVERY error, not only the planted ones. Unlabeled errors would count
     against correct model corrections in #231.
   - Labeling rules (also documented in LABELING.md):
       * original is the smallest verbatim span containing the error plus
         enough context to be unambiguous and a drop-in replacement;
         corrected replaces exactly that span (applying it yields correct
         French). For a missing word, include neighbors
         ("je vais Paris" -> "je vais à Paris").
       * One error per label. If one span has two errors, use the most
         specific category, correct the whole span, and name the other
         category in note.
       * alternatives: other correct replacements for the same span.
       * Accents: label as spelling only when the error changes the word or
         meaning (a/à, ou/où, du/dû, la/là); otherwise write learner text with
         correct accents.
       * note: short English explanation (optional but encouraged).
   - grammar_score: absolute (not curved by level), from grammatical
     categories only, using this rubric:
       95-100: no grammatical errors
       85-94: 1-2 minor grammatical errors; meaning always clear
       70-84: 3-4 errors, or one that obscures meaning
       50-69: errors in most learner turns; meaning mostly recoverable
       30-49: frequent errors; meaning sometimes unclear
       0-29: grammar prevents communication
     Adjust within a band for how much the learner wrote (errors per
     sentence), and record any judgment call in the record's notes.
   - Compact JSON, one object per line, key order: id, scenario_id,
     difficulty, messages, errors, grammar_score, notes (omit notes when
     unused); ensure_ascii=False; file ends with a newline. Generate it with a
     throwaway script in the scratchpad if convenient, not a committed script.

4) evals/LABELING.md
   Purpose; record fields; the 15 categories, each with a one-line definition,
   a wrong -> right example, and whether it counts toward grammar_score
   (write each category name in backticks, e.g. `gender`); span and
   correction rules; alternatives; accents/spelling rule; multiple errors in
   one span; what "clean" means (errors: [], grammar_score >= 90); the
   grammar-score rubric; how to add records (next id, run the test).

5) evals/README.md
   - What the dataset is for (#231 compares Mistral Large, Claude Sonnet 5.5,
     Claude Haiku 5.5 on feedback quality) and layout of evals/.
   - Record format summary and loading example:
     from evals.schema import load_dataset; records = load_dataset().
   - Composition table: counts per difficulty and per scenario, clean count,
     total errors per category (computed from the file).
   - How it was produced: conversations drafted and labels/scores proposed by
     Claude Code (Claude Opus 5.5) in November 2026 under issue #230; errors
     planted to reflect typical learner errors per level, then every error
     labeled on reread; the maintainer (self-assessed about B1: solid on core
     grammar, moods and tenses; decent vocabulary; comprehension stronger than
     production) reviews and corrects labels and scores.
   - Review status section: "Human review: pending" with a place to record
     the date and what changed. Do not claim the review happened.
   - Limits: synthetic, not real learners; typed text only; one model drafted
     and one person reviewed (no inter-annotator agreement); a B1 reviewer
     verifies beginner/intermediate labels more reliably than advanced ones,
     so #231 should report results per difficulty; the drafts and labels come
     from a Claude model, which may favor Claude models' error choices and
     corrections in #231 (disclosed, mitigated by human review and
     alternatives); small size (27) means wide uncertainty; grammar scores
     are a single judgment; no labels for vocabulary, fluency, overall score,
     strengths or focus area. Suggest a native or C1+ review for a v2.
   - Versioning: fixes or additions go into feedback_v2.jsonl so results stay
     comparable.

6) tests/test_feedback_dataset.py
   - Real file: parametrized test, one case per non-blank line of
     DATASET_PATH (id like "line-7"), each validated with
     model_validate_json; load_dataset() succeeds.
   - Composition (AC1 and design): >= 25 records; >= 3 per difficulty; 2 or 3
     clean records; every scenario id from SCENARIOS appears; ids unique and
     sequential fb-001..fb-NNN; every non-clean record has >= 1 error.
   - AC2: every error has category, non-blank original present in its user
     message, non-blank corrected (covered by the schema; add an explicit
     test that iterates the loaded records).
   - LABELING.md sync: every ErrorCategory value appears in LABELING.md
     in backticks.
   - Schema unit tests from a valid_record fixture (dict) covering each
     rejection: unknown category/scenario/difficulty, score -1/101/"85",
     bad id format, extra field, blank original/corrected, corrected ==
     original, alternative equal to original or corrected, duplicate
     alternatives, index out of range, index on assistant message, span not
     found, first message from user, non-alternating roles, no user message
     (assistant only), fewer than 2 messages, clean record scoring < 90,
     blank message content. Plus positives: valid record, clean record
     (is_clean True), alternatives accepted.
   - Loader tests with tmp_path: blank lines skipped; invalid JSON line
     reported as "line N"; schema failure reported with its line; duplicate
     id rejected; default path loads.

7) .github/workflows/pytest-tests.yml: add - 'evals/**' to both the push and
   pull_request path lists (keep them in sync).

8) README.md: add evals/ (schema.py, datasets/feedback_v1.jsonl, LABELING.md,
   README.md) to the Project Structure tree; in the intro paragraph (line 5)
   mention that the labeled feedback dataset is in evals/ (#230).

CONSTRAINTS:
- No new dependencies, no API calls, no changes outside the files above.
- PEP 8, type hints, docstrings. evals/schema.py >= 80% coverage; don't
  touch ALLOWLIST or .coveragerc.
- Validate against scenarios.SCENARIOS / VALID_DIFFICULTIES; never copy them.
- Honest documentation: never state the human review as done.

EXAMPLES:
- Valid: fb-001 cafe_order beginner, error {message_index: 3, category:
  contraction, original: "à le comptoir", corrected: "au comptoir"}.
- Rejected: span "à la gare" not in message 3 -> ValidationError "not found";
  message_index 2 (assistant) -> rejected; grammar_score "85" -> rejected;
  errors [] with grammar_score 80 -> rejected.
- Loader: "{not json}" on line 2 -> DatasetError matching "line 2".

ACCEPTANCE CRITERIA:
- [ ] At least 25 conversations, >= 3 per difficulty, 2-3 clean
- [ ] Every labeled error has a category, an original span and a corrected form
- [ ] evals/README.md states how the conversations were produced and the
      labeler's French proficiency
- [ ] A schema test validates the file in CI (evals/** in the path filter)

DELIVERABLES:
evals/__init__.py, evals/schema.py, evals/datasets/feedback_v1.jsonl,
evals/LABELING.md, evals/README.md, tests/test_feedback_dataset.py,
.github/workflows/pytest-tests.yml (path filters), README.md (structure +
intro). Then run: python3 -m pytest tests/ -v --tb=short --cov
--cov-report=term-missing --cov-report=json and
python3 scripts/check_module_coverage.py coverage.json.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-15.

- `evals/__init__.py`, `evals/schema.py`: `ErrorCategory` (15 values), `GRAMMATICAL_CATEGORIES`, `Message`, `LabeledError`, `FeedbackEvalRecord` (strict, `extra="forbid"`), `DatasetError`, `DATASET_PATH`, `CLEAN_MIN_GRAMMAR_SCORE`, `load_dataset()`.
- `evals/datasets/feedback_v1.jsonl`: 27 records (fb-001 to fb-027), 9 per level, every scenario 2 or 3 times per the planned split, 3 clean (fb-007, fb-016, fb-027), 71 labeled errors (63 grammatical, 8 vocabulary). Grammar scores 76 to 98. Generated from a throwaway script in the session scratchpad (not committed), which writes errors by learner turn and derives `message_index`.
- `evals/LABELING.md`, `evals/README.md` (provenance, B1 reviewer, review status "Pending", limits including bias toward Claude).
- `tests/test_feedback_dataset.py`: 84 tests (27 per-line, composition, AC2, LABELING sync, rejection paths, loader).
- `.github/workflows/pytest-tests.yml`: `evals/**` in both path lists. `README.md`: Project Structure + intro sentence.

---

## Human Review Notes

### Changes Made
- [x] **Deviation: no separate "at least one user message" check.** With `messages` min length 2, assistant first and strict alternation, `messages[1]` is always a user turn, so the check would be unreachable code. The "assistant only" test case is rejected by the alternation rule instead, and the test says so.
- [x] **Addition: `CLEAN_MIN_GRAMMAR_SCORE` constant** (90) so the schema, the tests and the docs use one number.
- [x] **Addition: tests** for a missing required field, an extra field on an error, an unknown role, a float score, a negative `message_index`, a blank alternative, an empty file, a `str` path, inclusive score bounds, and the file ending with a newline.
- [x] **Clarification: versioning.** README and LABELING say a version is frozen once it's merged and has eval results, so feedback_v1 can still change during the maintainer's initial review.
- [x] **Coverage note:** `negation` and `spelling` have no examples in v1 (the one planned negation item became an elision error, `je ne ai pas`, during drafting). Stated in the README limits.

### Quality Checks
- [x] Code follows existing patterns (Pydantic content model + loader + tests, like `schemas/grammar_lesson.py`)
- [x] Tests pass at 80%+ coverage (`evals/schema.py` 100%)
- [x] Documentation updated (`evals/README.md`, `evals/LABELING.md`, root `README.md`)
- [x] All acceptance criteria met (see Verification)

### Issues Found
- None in the code. **The dataset labels still need the maintainer's review** (the agreed process): conversations and labels are Claude-drafted, and `evals/README.md` records the review as pending until then.

---

## Verification

Commands run (2026-11-15):
- `python3 -m pytest tests/ -v --tb=short --cov --cov-report=term-missing --cov-report=json`: **951 passed, 1 xfailed**; total coverage 94.12% (gate 80%); `evals/schema.py` 136 statements, 100%.
- `python3 scripts/check_module_coverage.py coverage.json`: **PASS** (no new ALLOWLIST entries).

- [x] All acceptance criteria from issue #230 are met
  - [x] AC1: 27 conversations; 9 per difficulty; 3 clean (`TestDatasetFile`)
  - [x] AC2: every error has a category, a verbatim original span and a corrected form (schema + `test_every_error_is_complete_and_located`)
  - [x] AC3: `evals/README.md` states the production method (Claude Code drafted conversations and proposed labels; maintainer reviews) and the maintainer's proficiency (self-assessed about B1)
  - [x] AC4: `tests/test_feedback_dataset.py` runs in the pytest job; `evals/**` added to both path filters
- [x] Tests pass with 80%+ coverage
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (no app code changed)
- [ ] Human review completed (dataset labels reviewed by the maintainer): **pending**

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
