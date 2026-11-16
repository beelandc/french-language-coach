# SPDD Analysis: Hand-Labeled Feedback Dataset

**GitHub Issue**: #230
**Issue Title**: Hand-labeled feedback dataset (25 to 30 conversations)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/230
**Artifact ID**: FLC-062-202611152007
**Created**: 2026-11-15 20:07
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Create a small hand-labeled dataset of learner conversations to serve as ground truth for evaluating end-of-session feedback across models.
>
> **Can start now**, in parallel with #228. Most of the effort is manual labeling (about a day).
>
> ## Architectural changes approved by this issue
> - New top-level directory: `evals/` (dataset here; the eval harness follows in a later issue)
>
> ## Design
> - `evals/datasets/feedback_v1.jsonl`: short learner conversations across the 10 scenarios in `scenarios.py` and the 3 difficulty levels. Each conversation records:
>   - the errors a good tutor should catch, each with **category**, **original span** and **corrected form**
>   - a labeled 0 to 100 **grammar score**
> - `evals/LABELING.md` (or similar): a labeling guide that defines the error categories (agreement, conjugation, gender, prepositions, register, anglicisms, and so on) and how scores are assigned.
> - `evals/README.md`: how the dataset was produced and its limits.
> - A JSON schema or Pydantic model for a dataset record, plus a pytest test that validates every line.
>
> ## Acceptance criteria
> - [ ] At least 25 conversations, with 3 or more per difficulty level, including 2 or 3 clean conversations that should get few or no corrections
> - [ ] Every labeled error has a category, an original span and a corrected form
> - [ ] `evals/README.md` states how the conversations were produced (for example, drafted with an LLM, then corrected and labeled by hand) and the labeler's French proficiency, so the labels' authority is stated honestly
> - [ ] A schema test validates the file in CI
>
> ## Notes
> - The pytest workflow (`.github/workflows/pytest-tests.yml`) is path-filtered and doesn't include `evals/**` today. Add it so dataset changes trigger the schema test.
> - Feeds #231 (eval harness).

---

## Background

The "Model evaluation (Claude vs Mistral)" milestone (#228–#232) compares models on the app's own end-of-session feedback workload. #228 built the provider layer and #229 made feedback schema-validated, so the operational side (cost, latency, validity) is measurable from `llm_calls`. Quality is not: the metrics report (`README.md:531`, `:545`) explicitly defers feedback quality to the eval harness (#231). That harness needs ground truth: conversations where we already know which errors a good tutor should catch, what the corrections are, and roughly what grammar score is deserved. This issue produces that ground truth. Nothing in the app consumes it; it is test/eval data plus a validation test.

The feedback the models produce today (`services/llm/base.py:87` `FEEDBACK_PROMPT`, validated by `schemas/session.py:79` `FeedbackResponse`) has `grammar_score`, `vocabulary_score`, `fluency_score`, `overall_score`, `strengths`, `focus_area` and `example_corrections[{original, corrected, explanation}]`. The dataset's labels must line up with these fields so #231 can compare them: labeled errors ↔ `example_corrections`, labeled grammar score ↔ `grammar_score`.

---

## Business Value

- Makes the Claude-vs-Mistral comparison a measurement of feedback **quality**, not only cost and latency, testing the "Mistral is better at French" claim in `VISION.md:42` rather than assuming it.
- Gives #231 a fixed, versioned input (`feedback_v1`) so results across runs and models are comparable.
- States the labels' authority honestly, so readers of eval results know how much weight they bear.
- The schema test keeps the dataset well-formed as it grows (v2, more conversations) without manual checking.

---

## Scope In

- [ ] New top-level `evals/` directory (approved by the issue) with `evals/__init__.py` so the schema module is importable from tests
- [ ] `evals/datasets/feedback_v1.jsonl`: 27 conversations (9 per difficulty), covering all 10 scenarios, 3 of them clean
- [ ] `evals/schema.py`: Pydantic models for a dataset record (conversation, messages, labeled errors, grammar score), cross-field validation, and a loader for the JSONL file
- [ ] `evals/LABELING.md`: error-category definitions with examples, span/correction rules, the grammar-score rubric, and what counts as a clean conversation
- [ ] `evals/README.md`: purpose, file layout, record format, how the conversations were produced, the labeler's French proficiency, known limits and biases
- [ ] `tests/test_feedback_dataset.py`: validates every line of the real file plus unit tests of the schema's rejection paths (80%+ coverage of `evals/schema.py`)
- [ ] `.github/workflows/pytest-tests.yml`: add `evals/**` to both `push` and `pull_request` path filters
- [ ] `README.md`: add `evals/` to Project Structure and a short pointer in the model-evaluation text

## Scope Out

- [ ] The eval harness, model runs, matching logic, LLM judge, results under `evals/results/` (#231)
- [ ] Labels for vocabulary, fluency or overall scores, strengths or focus area (the issue asks for errors and a grammar score only)
- [ ] Any change to `FEEDBACK_PROMPT`, `FeedbackResponse`, the provider layer or the app
- [ ] Calling any LLM API from code in this issue (conversations are authored as static data)
- [ ] Inter-annotator agreement (single labeler; stated as a limit)
- [ ] Real learner data (no privacy concerns; also stated as a limit)
- [ ] New dependencies (Pydantic is already in `requirements.txt`; no `jsonschema`)

---

## Acceptance Criteria (ACs)

1. **AC1: Size and mix**
   **Given** `evals/datasets/feedback_v1.jsonl`
   **When** the schema test loads it
   **Then** it has ≥ 25 records, ≥ 3 per difficulty (`beginner`, `intermediate`, `advanced`), and 2–3 records with no labeled errors (clean); every scenario ID in `scenarios.py` appears at least once (the issue's "across the 10 scenarios").

2. **AC2: Error completeness**
   **Given** any labeled error
   **When** it is validated
   **Then** it has a `category` from the defined set, a non-empty `original` span that occurs verbatim in the learner message it points to, and a non-empty `corrected` form different from the span.

3. **AC3: Honest provenance**
   **Given** `evals/README.md`
   **When** a reader opens it
   **Then** it states how the conversations were produced (drafted by an LLM, then reviewed/corrected and labeled), who labeled them, and the labeler's French proficiency.

4. **AC4: Validated in CI**
   **Given** a PR that changes anything under `evals/`
   **When** CI runs
   **Then** the pytest workflow triggers (path filter includes `evals/**`) and `tests/test_feedback_dataset.py` validates every line; a malformed line fails the job.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Scenario**: `scenarios.py` `SCENARIOS` (10 IDs: `cafe_order`, `ask_directions`, `job_interview`, `hotel_checkin`, `shopping`, `doctor_visit`, `train_travel`, `restaurant_dining`, `apartment_rental`, `museum_visit`), each with `beginner`/`intermediate`/`advanced` system prompts; `VALID_DIFFICULTIES` is the difficulty enum.
- **Conversation messages**: stored as `{"role": "user"|"assistant", "content": str}`; the assistant speaks first (initial greeting, `routers/sessions.py:62`). `build_transcript` (`services/llm/base.py:153`) renders them as `role: content` lines for the feedback request, so the dataset's messages can be fed to the provider layer unchanged in #231.
- **Feedback output**: `FeedbackResponse` / `ExampleCorrection` (`schemas/session.py:71-89`): `grammar_score` 0–100 int, `example_corrections[{original, corrected, explanation}]`.
- **Content-validation pattern**: Pydantic models + loader + pytest over real files, e.g. `schemas/grammar_lesson.py` with `tests/test_grammar_lesson_schema.py`.
- **Coverage gate**: `.coveragerc` (`source = .`, `fail_under = 80`) and `scripts/check_module_coverage.py` apply per module; a new `evals/schema.py` will be measured and must reach 80% (not join `ALLOWLIST`).

### New Concepts Required

- **FeedbackEvalRecord**: one labeled conversation: `id`, `scenario_id`, `difficulty`, `messages`, `errors`, `grammar_score`, optional `notes`.
- **LabeledError**: `message_index` (which learner turn), `category`, `original` (exact span), `corrected` (replacement for the span), optional `alternatives` (other acceptable corrections), optional `note`.
- **ErrorCategory**: a fixed enum defined in `LABELING.md` and mirrored in the schema.
- **Clean conversation**: a record with `errors == []`.

### Key Business Rules

- Errors are labeled only in **learner** (`user`) messages; assistant turns are assumed correct native French.
- `original` must be a verbatim substring of the message at `message_index`, so #231 can match spans deterministically.
- `corrected` replaces exactly `original`; applying it must yield a correct sentence.
- `grammar_score` is an absolute judgment of the learner's grammar in that conversation (not curved by difficulty level), assigned with the rubric in `LABELING.md`.
- Record IDs are unique and stable (`fb-001` …) so results can be compared across runs.

---

## Strategic Approach

### Solution Direction

1. Write `evals/schema.py` (Pydantic v2 models + `load_dataset(path)`) and `evals/LABELING.md` first, so the categories and rules exist before any conversation is written.
2. Draft 27 short conversations (3–5 learner turns each, assistant first), 9 per difficulty, at least 2 per scenario; plant errors typical of each level (beginner: gender, articles, basic conjugation; intermediate: passé composé auxiliaries, agreement, prepositions, partitive; advanced: subjunctive, register, anglicisms, pronoun order). Natural learners also make unplanned errors, so each draft is re-read in full and every error is labeled, not only the planted ones.
3. Label each conversation per `LABELING.md`; assign grammar scores with the rubric.
4. Write `tests/test_feedback_dataset.py`: one parametrized check per record line, dataset-level checks for AC1, and unit tests for each validator's rejection path.
5. Add `evals/**` to the pytest workflow path filters; write `evals/README.md`; update root `README.md`.
6. Human review pass on the conversations and labels before the PR is merged (see Requirement Ambiguities).

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Pydantic model vs JSON Schema file | JSON Schema is language-neutral but needs the `jsonschema` package (new dependency) or hand-rolled checks; Pydantic is already a dependency, matches `schemas/grammar_lesson.py`, and #231 can import the same models to load the data | **Pydantic** in `evals/schema.py` |
| Where the model lives | `schemas/` holds API/content schemas for the app; `evals/` is approved as the home for eval data and harness | **`evals/schema.py`** (with `evals/__init__.py`) so dataset, model and harness stay together |
| How errors point into the conversation | Free-text span only is ambiguous if the same phrase recurs; char offsets are brittle to edit by hand | **`message_index` + verbatim `original` substring**, validated by the test |
| Multiple valid corrections | A single `corrected` makes #231's deterministic match penalize valid alternatives ("je voudrais" vs "j'aimerais") | Optional **`alternatives: list[str]`** |
| Grammar score scale | Curving by level makes scores incomparable to the model's `grammar_score`, which the prompt asks for without level context | **Absolute** rubric with anchored bands in `LABELING.md` |
| Which categories affect the grammar score | Register, anglicisms and lexical choice are vocabulary issues; the app scores vocabulary separately | All categories are labeled as errors to catch; only **grammatical** categories drive `grammar_score` (documented) |
| Accents and spelling | Learners often type without accents; flagging every accent clutters labels | `spelling` category; label it only when the error changes the word or meaning (e.g. `a`/`à`, `ou`/`où`), not for every missing accent. Drafts use correct accents otherwise. |
| Mix | 25 is the minimum; extra records add labeling cost | **27** (9 per level), every scenario 2–3 times, **3 clean** (1 per level) |
| Test location | A test under `evals/` would not run (CI runs `pytest tests/`) | **`tests/test_feedback_dataset.py`** |

### Alternatives Considered

- **One JSON array file instead of JSONL**: rejected; the issue names `.jsonl`, and line-per-record gives clean diffs and per-line error messages.
- **Labels in a separate file from conversations**: rejected; one self-contained record per line is simpler to review and load.
- **Generating conversations at test time with an LLM**: rejected; the dataset must be fixed ground truth, and CI must not make paid API calls.
- **Severity per error (minor/major)**: considered for score weighting; deferred to keep labeling cost down. The rubric uses error count and impact on meaning instead, and `note` can record judgment calls. Can be added in a v2 without breaking v1.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Labeler identity and French proficiency** (AC3) | The README must state the labeler's French proficiency. | **Resolved (user, 2026-11-15):** the human reviewer self-assesses at about **B1**: solid on core grammar, moods and tenses, decent vocabulary, comprehension stronger than production. README states this verbatim in substance. Consequence: a B1 reviewer can reliably confirm beginner and most intermediate labels, but advanced-level judgments (subjunctive edge cases, register, idiomatic anglicisms) carry less authority; README says so, and labels the reviewer is unsure of are marked in `note`. |
| **Who labels** | The issue expects drafting with an LLM, then hand correction and labeling (about a day of manual work). If Claude Code drafts *and* proposes labels, the "hand" part is the human review. | **Resolved (user, 2026-11-15):** Claude drafts conversations and proposes all labels and scores; the user reviews and corrects them before merge. The README states exactly that division of work. |
| **Self-preference bias** | The labels feed a Claude-vs-Mistral comparison. Labels drafted by a Claude model may favor Claude's notion of an error and its preferred corrections. | **Resolved (user, 2026-11-15): disclose only.** Claude drafts all conversations; the README names the bias as a known limit; the human review pass and `alternatives` are the mitigations. No per-record source field in v1. |
| "Clean conversations that should get few or no corrections" | Zero labeled errors, or allow one or two minor ones? | Clean = `errors: []`; the test asserts 2–3 such records. |
| "Short" conversations | No length given | 3–5 learner turns, roughly 7–11 messages including the assistant's. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Same erroneous phrase appears twice in one learner message | Substring match is ambiguous | Allowed; `original` must occur at least once. `LABELING.md`: use a longer span if it would be ambiguous. Two separate errors may each be labeled. |
| One phrase holds two errors (e.g. gender + agreement: "un petite maison") | Two labels vs one | Label one error with the most specific category and a correction fixing the whole span; note the secondary category in `note`. Documented. |
| Error that spans a missing word ("je vais Paris" → "je vais à Paris") | The "original" is an absence | Span includes neighboring words so it's non-empty and verbatim. |
| `message_index` points at an assistant turn or out of range | Mislabel | Schema rejects. |
| Blank lines / trailing newline in the JSONL | Loader robustness | Loader skips blank lines; reports the line number on parse failure. |
| Unicode (curly apostrophes vs `'`, non-breaking spaces before `?`) | Verbatim matching fails silently | Drafts use ASCII `'` and plain spaces consistently; the substring check catches mismatches. Documented in `LABELING.md`. |
| Duplicate IDs | Results keyed by ID collide | Dataset-level test fails. |
| Clean record with a low score, or many errors with a high score | Inconsistent labels | Test sanity check: clean records score ≥ 90. No other score/error-count coupling (rubric is judgment). |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Labels are wrong (a "correction" that's not French, or a missed error) | #231 penalizes models for being right | Human review before merge; `alternatives`; README states single-labeler limits; v1 is versioned so fixes go into v2 |
| Reviewer (B1) can't fully verify advanced-level labels | Advanced records are weaker ground truth; model disagreement there may be the label's fault | Keep advanced errors to well-established rules where possible; mark uncertain labels in `note`; README recommends #231 report results per difficulty and suggests a native or C1+ review for a v2 |
| Claude-authored labels bias the comparison | Unfair eval favoring Claude | Disclose; human review; optionally mix in other drafts (open question) |
| `evals/schema.py` under 80% coverage | CI gate fails | Unit tests for each validator branch and the loader's error paths |
| Importing `evals` from tests | Import error if not on path | Repo root is already on `sys.path` (tests import `schemas.*`, `scenarios`); add `evals/__init__.py` |
| Workflow path filter missed in one of push/PR | Dataset edits skip the gate | Edit both lists; the workflow comment already asks to keep them in sync |
| Scenario IDs change later (#126 duplication) | Dataset goes stale | The test validates `scenario_id` against `scenarios.SCENARIOS`, so drift fails CI |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | ≥ 25 records, ≥ 3 per level, 2–3 clean | Yes | Asserted by dataset-level tests |
| AC2 | Category, span and corrected form on every error | Yes | Enforced by Pydantic + substring check |
| AC3 | README states production method and labeler proficiency | Yes, **with user input** | Proficiency must come from the user |
| AC4 | Schema test validates the file in CI | Yes | Test in `tests/` + `evals/**` path filter |

**AC Coverage Summary**: 4 of 4 ACs are addressable. All open questions are resolved (labeler about B1; Claude drafts and labels, user reviews; bias disclosed).

**Implicit Requirements Not in ACs**:
- Every scenario represented (issue Design: "across the 10 scenarios")
- Records loadable by #231 with the same model, messages compatible with `build_transcript`
- Error categories documented in `LABELING.md` and mirrored exactly by the schema enum
- Root `README.md` mentions `evals/` (project rule: update README for structure changes)
- New module meets 80% coverage

---

## REASONS Canvas

### Requirements
The four ACs above: ≥ 25 conversations (≥ 3 per level, 2–3 clean), complete error labels, honest provenance in `evals/README.md`, a CI-run schema test with `evals/**` in the pytest path filters. Implicitly: all 10 scenarios covered, records loadable by #231.

### Examples
A record (one line in the JSONL, pretty-printed here):
```json
{
  "id": "fb-001",
  "scenario_id": "cafe_order",
  "difficulty": "beginner",
  "messages": [
    {"role": "assistant", "content": "Bonjour ! Qu'est-ce que vous voulez boire ?"},
    {"role": "user", "content": "Bonjour, je veux un café et un croissant, s'il vous plaît."},
    {"role": "assistant", "content": "Très bien. Sur place ou à emporter ?"},
    {"role": "user", "content": "Sur place. Je vais m'asseoir à le comptoir."}
  ],
  "errors": [
    {"message_index": 3, "category": "contraction", "original": "à le comptoir", "corrected": "au comptoir", "note": "à + le contracts to au"}
  ],
  "grammar_score": 85
}
```
Rejections the test must catch: unknown category; `original` not found in the message; `message_index` pointing to an assistant turn or out of range; `corrected == original`; empty span; `grammar_score` 101 or -1; unknown `scenario_id` or difficulty; duplicate `id`; malformed JSON line (reported with its line number).

### Architecture
- `evals/` (new, approved): `__init__.py`, `schema.py`, `datasets/feedback_v1.jsonl`, `LABELING.md`, `README.md`.
- Models follow the content-schema pattern in `schemas/grammar_lesson.py` (Pydantic v2, `field_validator`/`model_validator`, a loader function).
- Validation reuses `scenarios.SCENARIOS` and `scenarios.VALID_DIFFICULTIES` as the source of truth.
- Messages use the app's `{"role", "content"}` shape so #231 can pass them straight to `llm_service`.
- Test in `tests/test_feedback_dataset.py`, run by the existing pytest job.

### Standards
- PEP 8, type hints, docstrings on public classes/functions, matching existing modules.
- 80% coverage per module: `evals/schema.py` is measured (`.coveragerc` `source = .`) and must meet it without joining `ALLOWLIST`.
- README.md updated for the new directory.
- No new dependencies, no API calls, no app changes.

### Omissions
Eval harness and judge (#231); vocabulary/fluency/overall labels; changes to the feedback prompt or schema; real learner data; inter-annotator agreement; severity levels (possible v2).

### Notes
- CI command: `python3 -m pytest tests/ -v --tb=short --cov ...`; partial local runs need `--cov-fail-under=0`.
- Keep apostrophes ASCII and avoid non-breaking spaces so verbatim span matching is predictable.
- `FEEDBACK_PROMPT` asks for `example_corrections` with `original`/`corrected`; using the same field names in labels makes #231's deterministic match direct.
- Proposed categories (final list in `LABELING.md`): `gender`, `agreement`, `conjugation`, `tense_mood`, `auxiliary`, `article`, `contraction`, `preposition`, `pronoun`, `negation`, `word_order`, `register`, `anglicism`, `lexical`, `spelling`. Grammatical ones (all but `register`, `anglicism`, `lexical`) drive `grammar_score`.

### Solutions
- `schemas/grammar_lesson.py` + `tests/test_grammar_lesson_schema.py`: Pydantic content model with a loader and tests over real files.
- `tests/conftest.py:77` `valid_scenario_ids` fixture for scenario IDs.
- `.github/workflows/pytest-tests.yml`: add `- 'evals/**'` to both path lists, keeping the comment's sync rule.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
