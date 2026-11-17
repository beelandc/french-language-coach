# SPDD Prompt: French Feedback Rubric as an Agent Skill

**GitHub Issue**: #269
**Issue Title**: French feedback rubric as an Agent Skill
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/269
**Artifact ID**: FLC-065-202611162223
**Created**: 2026-11-16 22:23
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [`spdd/analysis/FLC-065-202611162144-[Analysis]-issue-269-feedback-rubric-skill.md`](../analysis/FLC-065-202611162144-[Analysis]-issue-269-feedback-rubric-skill.md) (including its "Revision after #232 merged" section, which supersedes conflicting text)

---

## Context

### Current Codebase State

- Branch `feature/issue-269-feedback-rubric-skill`, rebased on `main` at `6206019` (#232 merged). The defaults are Claude Sonnet 5.5 for chat (effort `low`) and feedback (effort `medium`). `docs/decisions/001-model-choice.md` exists and names "#269's rubric A/B" as a trigger for moving feedback to Haiku.
- Feedback uses one system prompt, `FEEDBACK_PROMPT` (`services/llm/base.py:87`), sent verbatim by both providers. The model gets no error definitions, no span rules and no score anchors.
- The eval taxonomy (15 categories, 12 grammatical) lives in `evals/LABELING.md` and `evals/schema.py`.
- The baseline run `evals/results/feedback_eval_20261116-042618.*` is committed.

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `services/llm/base.py` | Provider interface, feedback prompt | `FEEDBACK_PROMPT` `:87`; `build_feedback_turns()` `:158`; `LLMProvider.feedback()` `:195` |
| `services/llm/anthropic_provider.py` | Claude provider | `feedback()` `:88`, `system=FEEDBACK_PROMPT` `:102` |
| `services/llm/mistral_provider.py` | Mistral provider | `feedback()` `:76`, system message `:89` |
| `services/llm/service.py` | Routing, validation, retry | `get_feedback()` `:170`, `provider.feedback(...)` `:199` |
| `services/llm/pricing.py` | Pattern for a repo-relative data file | `REPO_ROOT` `:21`, `_resolve()` `:68`, `@lru_cache` loader `:74–75` |
| `config.py` | Settings | `Settings` `:22`; add rubric settings beside `LLM_PRICING_FILE` |
| `evals/schema.py` | Taxonomy oracle, dataset loader | `ErrorCategory` `:39`, `GRAMMATICAL_CATEGORIES` `:61`, `load_dataset()` |
| `evals/run_feedback_eval.py` | Harness | `EvalConfig` `:93`, `EVAL_CONFIGS` `:103`, `RunOptions` `:149`, `ModelRun` `:182`, `parse_args()` `:235`, `estimate_feedback_cost()` `:348`, preflight `:478–519` (per-config settings `:494–501`), `run_eval()` `:632`, `_assemble_report()` `:759` |
| `evals/report.py` | Reports | `SCHEMA_VERSION = 1` `:15`; model label `:120–121`; Markdown header `:257–261` |
| `tests/test_llm_providers.py` | Provider tests | asserts `FEEDBACK_PROMPT` at `:100`, `:116`, `:329`, `:347` |
| `tests/test_llm_service.py` | Service tests | retry asserts `llm_base.FEEDBACK_PROMPT` `:328` (and below); `make_settings()` pins Mistral |
| `tests/test_eval_runner.py` | Harness tests | `FakeProvider.feedback()` `:78`; `fake_settings()` `:91` |
| `tests/test_eval_judge.py` | Judge tests | fake `feedback()` `:60` |
| `.claude/skills/spdd-analysis/SKILL.md` | House skill format | YAML frontmatter `name`, `description` |
| `docs/decisions/001-model-choice.md`, `docs/decisions/README.md` | Decision records | 001 "What would change this decision"; index table |
| `evals/LABELING.md` | Labeling contract | Error categories table (add a pointer only) |

### Existing Patterns
- **Data-file loader**: `pricing.py`: a repo-relative path from settings, resolved against `REPO_ROOT`, loaded with `@lru_cache`; tests call `.cache_clear()`.
- **Settings tests**: `Settings(_env_file=None, …)` with Given/When/Then comments.
- **Harness tests**: fake providers keyed by provider id, `fake_settings()` factory, `run_eval(..., providers=..., settings_factory=..., out=lambda _: None)`.
- **Docs**: README tables and bold lead-ins; decision record format in `docs/decisions/README.md`.

---

## Goal

**Primary Objective**: Create one canonical French feedback rubric (`data/feedback_rubric.md`) that the app's feedback prompt loads from disk and a Claude Code skill (`.claude/skills/french-feedback-rubric/`) points to. Then measure feedback with and without it using the #231 harness, and record the result and its consequences in `docs/decisions/002-feedback-rubric.md`.

**Secondary Objectives**:
- An on/off setting (`FEEDBACK_RUBRIC`) whose "off" state is byte-identical to today's prompt.
- A harness `--rubric on|off|both` flag that compares both arms in one run.
- CI tests keeping the rubric aligned with the eval taxonomy and free of dataset text.
- Apply the pre-registered thresholds mechanically: the rubric default, and a possible feedback switch to Haiku 5.5 with a confirmation rerun.

---

## Constraints

### Architecture Constraints
- All LLM calls stay in `services/llm/`. The rubric loader lives there (`services/llm/rubric.py`).
- The canonical rubric is `data/feedback_rubric.md`. The skill **points to it and doesn't copy it**. No symlinks.
- The prompt travels per call: `LLMService.get_feedback()` composes it from its own settings and passes `system_prompt=` to `provider.feedback()` on both attempts. The harness shares providers across configs, so the prompt must not be fixed at provider construction.
- `FEEDBACK_PROMPT` stays unchanged as the base. With the rubric off, the system prompt `== FEEDBACK_PROMPT`.
- No feedback schema change (`schemas/session.py`, `FEEDBACK_JSON_SCHEMA`), no frontend change, no difficulty level passed to feedback, no prompt caching, no chat or effort change.
- The harness `settings_factory` signature stays the same. Set the arm with `settings.model_copy(update={"FEEDBACK_RUBRIC": config.rubric})`, so a `.env` value can't leak into an arm.
- `evals/LABELING.md`: add a one-line pointer only. No definition changes.
- The feedback **model** default changes **only** if pre-registered rule 2 is met **and** confirmed by the rerun.
- Never read or print `.env`. Paid calls only via the harness, cap $3 for the main run and $1 for the confirmation rerun.

### Code Quality Constraints
- PEP 8, type hints, docstrings on public functions, matching `services/llm/`.
- The rubric is in English (like LABELING.md), about 8–10k characters, written for a model. The taxonomy table has a strict layout for parsing.
- Rubric and skill examples are **fresh**: no labeled `original` span from `feedback_v1.jsonl`, and no LABELING.md example taken from the dataset.

### Testing Constraints
- 80%+ per module (`.coveragerc`, `scripts/check_module_coverage.py`). `services/llm/rubric.py` must reach 80% (aim for 100%), and must not join `ALLOWLIST`.
- Run the backend suite CI-style: a clean copy of the tree with no `.env`, and `MISTRAL_API_KEY=dummy_test_key ANTHROPIC_API_KEY=dummy_test_key`, plus the per-module check.
- Rubric loader tests clear the cache between tests.
- No real API calls in tests. The harness tests use fakes.
- No frontend tests (no frontend changes).

### Acceptance Criteria
1. `SKILL.md` with a clear trigger description, plus reference files for the taxonomy (pointer page) and examples.
2. The app's feedback prompt reads the rubric from `data/feedback_rubric.md` (on by default; off restores today's prompt; a missing or empty file raises a clear error).
3. An eval run via the #231 harness compares feedback with and without the rubric; reports committed; result in `docs/decisions/002-feedback-rubric.md`.
4. (Implicit) The rubric's categories and grammatical split match `evals/schema.py`, enforced in CI.

### Pre-registered thresholds (from the analysis; do not change after seeing results)
1. **Rubric default**: keep `FEEDBACK_RUBRIC=true` unless Sonnet+rubric, compared with Sonnet without it, catches **≥ 3 fewer** labeled errors OR has grammar MAE **≥ 2.0 higher**, AND shows no offsetting gain (**≥ 3 more** errors caught, or **≥ 4 fewer** false corrections). If it regresses, ship `false`.
2. **Haiku switch**: switch the feedback default to `claude-haiku-5-5` only if Haiku+rubric, compared with Sonnet+rubric in the same run, has detected errors **≥ Sonnet's − 2**, MAE **≤ Sonnet's + 1.0** and **≤ 9.59**, no-op corrections **≤ 1**, false corrections **≤ Sonnet's**, and final schema validity **100%**. Then rerun `--models claude-sonnet,claude-haiku --rubric on` and switch only if the rule holds again. If rule 1 sets the rubric off, compare the no-rubric arms instead.

---

## Examples

### Input/Output Examples
1. **Prompt composition, rubric on (default)**
   - Input: `Settings(_env_file=None, ANTHROPIC_API_KEY="a")`
   - Output: `build_feedback_system_prompt(settings)` starts with `FEEDBACK_PROMPT`, then `RUBRIC_PREAMBLE`, then the text of `data/feedback_rubric.md` (BOM stripped, `\r\n` → `\n`, trailing whitespace trimmed)
2. **Rubric off**
   - Input: `FEEDBACK_RUBRIC=False`
   - Output: `build_feedback_system_prompt(settings) == FEEDBACK_PROMPT`; the file isn't read
3. **Missing file**
   - Input: `FEEDBACK_RUBRIC_FILE="data/missing.md"`
   - Output: `FeedbackRubricError` with a message containing `data/missing.md`
4. **Harness expansion**
   - Input: `--models claude-haiku --rubric both --limit 3`
   - Output: two configs, `claude-haiku` (rubric on) and `claude-haiku:no-rubric`, over the same three records. The fake provider receives a different `system_prompt` per arm. The report's model entries carry `"rubric": true/false`, and the run carries `"rubric": {"path": "data/feedback_rubric.md", "sha256": "…"}`
5. **Taxonomy test failure**
   - Input: the rubric table renames `tense_mood` to `tense`
   - Output: the test fails listing missing `tense_mood` and unexpected `tense`

### Edge Cases
- An empty or whitespace-only rubric file → `FeedbackRubricError`.
- Corrective retry → the same composed `system_prompt` on attempt 2 (both providers).
- `--rubric off` alone → keys `<key>:no-rubric`, and no rubric file is needed (preflight doesn't read it).
- `--rubric on|both` with a missing rubric file → `PreflightError` before any call, naming the path.
- `.env` sets `FEEDBACK_RUBRIC=false` → the harness arms still run as configured (`model_copy` override).
- The feedback router doesn't catch `FeedbackRubricError` → 500 (a deploy error), documented.

### Test Cases
```python
class TestBuildFeedbackSystemPrompt:
    def test_rubric_off_is_exactly_the_base_prompt(self):
        settings = make_settings(FEEDBACK_RUBRIC=False)
        assert build_feedback_system_prompt(settings) == FEEDBACK_PROMPT

    def test_rubric_on_appends_rubric_file(self, tmp_path):
        rubric = tmp_path / "rubric.md"
        rubric.write_text("﻿# Rubric\r\nline\r\n\n", encoding="utf-8")
        prompt = build_feedback_system_prompt(make_settings(FEEDBACK_RUBRIC_FILE=str(rubric)))
        assert prompt == FEEDBACK_PROMPT + RUBRIC_PREAMBLE + "# Rubric\nline"

    def test_missing_rubric_file_names_the_path(self):
        with pytest.raises(FeedbackRubricError, match="data/missing.md"):
            build_feedback_system_prompt(make_settings(FEEDBACK_RUBRIC_FILE="data/missing.md"))


class TestRubricTaxonomy:
    def test_categories_match_eval_schema(self):
        rows = parse_taxonomy_table(RUBRIC_PATH.read_text(encoding="utf-8"))
        assert set(rows) == {c.value for c in ErrorCategory}
        assert {c for c, counts in rows.items() if counts} == {c.value for c in GRAMMATICAL_CATEGORIES}
```

---

## Deliverables

### Code Changes
- [ ] `data/feedback_rubric.md` (new): the canonical rubric (sections below)
- [ ] `services/llm/rubric.py` (new): `FeedbackRubricError`, `RUBRIC_PREAMBLE`, `load_feedback_rubric(path)`, `feedback_rubric_sha256(path)`, `build_feedback_system_prompt(settings)`
- [ ] `services/llm/base.py`: `LLMProvider.feedback(..., system_prompt: str = FEEDBACK_PROMPT)`
- [ ] `services/llm/anthropic_provider.py`, `services/llm/mistral_provider.py`: use `system_prompt`
- [ ] `services/llm/service.py`: compose once per `get_feedback()`, pass it on both attempts
- [ ] `config.py`: `FEEDBACK_RUBRIC: bool = True`, `FEEDBACK_RUBRIC_FILE: str = "data/feedback_rubric.md"`
- [ ] `.env.example`: both settings, commented
- [ ] `evals/run_feedback_eval.py`: `EvalConfig.rubric`, `--rubric`, expansion, per-arm settings, preflight, estimate, report fields
- [ ] `evals/report.py`: `SCHEMA_VERSION = 2`; rubric in the model label and header
- [ ] `.claude/skills/french-feedback-rubric/SKILL.md`, `references/taxonomy.md`, `references/examples.md` (new)
- [ ] **Conditional** (rule 2 met and confirmed): `config.py` `FEEDBACK_MODEL="claude-haiku-5-5"`, plus `.env.example`, tests and docs

### Tests
- [ ] `tests/test_feedback_rubric.py` (new): loader (BOM, CRLF, cache, missing, empty), composition (on/off/file override), sha256, taxonomy consistency, dataset leakage, skill frontmatter and referenced paths, example categories valid
- [ ] `tests/test_llm_providers.py`: both providers send the given `system_prompt`; default still `FEEDBACK_PROMPT`
- [ ] `tests/test_llm_service.py`: `get_feedback` passes the composed prompt (rubric on and off) on attempt 1 and the retry
- [ ] `tests/test_eval_runner.py`, `tests/test_eval_judge.py`: fakes accept `system_prompt`; `--rubric` parsing and expansion; arms get different prompts; report fields; preflight on a missing rubric; estimate uses the composed prompt
- [ ] `tests/test_eval_report.py`: schema version 2 and the rubric label

### Documentation
- [ ] `README.md`: Feedback Mode (rubric, token cost, kill switch), config table (2 settings), Project Structure (`data/feedback_rubric.md`, skill), the `.claude/skills` description and the AI-Assisted Development paragraph (new skill), Evaluation (rubric A/B summary, link to 002)
- [ ] `docs/decisions/002-feedback-rubric.md` (new), `docs/decisions/README.md` (index row), `docs/decisions/001-model-choice.md` (link to 002; status update if superseded)
- [ ] `evals/README.md`: `--rubric` flag, configurations with arms, report fields, schema v2
- [ ] `evals/LABELING.md`: pointer to `data/feedback_rubric.md` as the model-facing version
- [ ] **Conditional** (Haiku switch): README, VISION.md, CLAUDE.md guardrail

---

## Actual Prompt

```
Implement GitHub issue #269 ("French feedback rubric as an Agent Skill") in the French
Language Coach repo, branch feature/issue-269-feedback-rubric-skill (rebased on main at
6206019), following spdd/analysis/FLC-065-202611162144-[Analysis]-issue-269-feedback-rubric-skill.md
and its "Revision after #232 merged" section.

CONTEXT:
- FastAPI backend; all LLM calls go through services/llm/. Defaults (since #232): chat and
  feedback on anthropic / claude-sonnet-5-5 (effort low / medium). Mistral selectable.
- FEEDBACK_PROMPT (services/llm/base.py:87) is the French feedback system prompt; both
  providers send it verbatim (anthropic_provider.py:102 system=; mistral_provider.py:89
  system message). LLMService.get_feedback (service.py:170) calls
  provider.feedback(messages, model, correction=c) (:199) up to twice.
- Taxonomy oracle: evals/schema.py ErrorCategory (15 values) and GRAMMATICAL_CATEGORIES
  (all but register, anglicism, lexical). Labeling rules: evals/LABELING.md. Dataset:
  evals.schema.load_dataset() -> feedback_v1 records with errors[].original.
- Harness: evals/run_feedback_eval.py runs EVAL_CONFIGS through LLMService with
  per-config Settings from settings_factory(provider, model, effort) and shared
  providers; reports via evals/report.py (SCHEMA_VERSION = 1).
- Repo-relative data loader pattern: services/llm/pricing.py (REPO_ROOT, _resolve,
  lru_cache).
- Decision records: docs/decisions/ (001-model-choice.md, README.md index + format).
  001 lists "#269's rubric A/B" as a trigger for moving feedback to Haiku.
- Maintainer decisions: canonical rubric in data/feedback_rubric.md, skill points to it
  (no copy, no symlink); FEEDBACK_RUBRIC setting + harness --rubric; Claude runs the paid
  eval (cap $3); result always in a new docs/decisions/002-feedback-rubric.md; if the
  Haiku rule is met and confirmed, switch the feedback default to claude-haiku-5-5 in
  this PR; taxonomy pointer page in the skill.

GOAL:
1. data/feedback_rubric.md (English, ~8-10k chars, model-facing). Sections:
   - Header blockquote: purpose (one grading standard for the app's feedback prompt,
     the french-feedback-rubric Claude Code skill and the eval labels), version 1,
     issue #269, "canonical: edit here, don't copy", review status (drafted by Claude
     Code, pending maintainer review), and that vocabulary/fluency/overall anchors are
     unvalidated (no labels).
   - "## Scope": review learner (user) turns only; written norms for grammar (keep ne),
     but informal-but-correct typed constructions are fine; correct what a good tutor
     would correct, and nothing else.
   - "## Error taxonomy": ONE markdown table, exactly these columns:
     | Category | Counts toward grammar score | Definition | Example (wrong → right) | Typical CEFR level |
     One row per category, Category cell = the ID in backticks (gender, agreement,
     conjugation, tense_mood, auxiliary, article, contraction, preposition, pronoun,
     negation, word_order, spelling, register, anglicism, lexical), "Yes" for the 12
     grammatical, "No" for register/anglicism/lexical. Definitions consistent with
     LABELING.md; FRESH examples (not from feedback_v1 or LABELING.md's dataset
     examples). Then the "most specific category" rule and the one-error-per-span rule.
   - "## What not to correct": correct-but-unusual French (give fresh generic examples
     of patterns, e.g. optional ne explétif, conditional in indirect questions, "se
     rendre compte" participle invariance), accents that don't change the word (only
     a/à, ou/où, la/là, du/dû-type count, as spelling), informal-but-correct typed forms
     (questions without inversion, "c'est mieux de"), stylistic rephrasing of correct
     sentences, assistant turns, and register choices that fit the scenario.
   - "## Severity (CEFR-aware)": high (meaning obscured, or a rule well below the
     learner's level), medium (a rule at about the learner's level), low (a structure
     above the level, or no effect on meaning: still correct it, gently). If the level
     isn't given, infer it from the learner's own turns. Severity orders corrections
     and picks the focus area; it does not change the absolute grammar scale. Within a
     band, impact on meaning outweighs frequency.
   - "## Correction format": original copied verbatim from one learner turn; the
     smallest span that makes corrected a drop-in replacement; include neighbors for a
     missing word; one error per correction; most severe first; explanation names the
     rule in one or two sentences, in the language the caller asks for; if several
     corrections are right, give the most natural one and optionally mention another in
     the explanation; never return a correction whose corrected equals original.
   - "## Scores": grammar bands copied from LABELING.md (95-100 none; 85-94 1-2 minor;
     70-84 3-4 or one that obscures meaning; 50-69 most turns; 30-49 frequent; 0-29
     prevents communication), absolute (not adjusted for level), only grammatical
     categories count, adjust within a band for amount written and severity; a
     conversation with no grammatical errors scores >= 90. Short anchors (4-5 bands) for
     vocabulary (range, precision, anglicisms/lexical errors) and fluency (connected,
     natural turns, appropriate length and register for the scenario). Overall: a
     holistic judgment, normally within a few points of the mean of the three.
   - "## Strengths and focus area": strengths are specific and evidenced by the
     learner's turns; focus_area is the single highest-impact recurring issue, chosen by
     severity then frequency, phrased as something to practise.
2. services/llm/rubric.py:
   - class FeedbackRubricError(RuntimeError)
   - RUBRIC_PREAMBLE: str, French, starting "\n\n", saying: apply the following
     grading rubric (written in English) to find, classify and correct errors and to
     assign the scores; explanations and all text in the JSON stay in French; the JSON
     structure above is unchanged. End with "\n\n".
   - load_feedback_rubric(path: str) -> str, @lru_cache: resolve against REPO_ROOT
     (reuse the pricing._resolve approach), read UTF-8, strip a leading BOM, normalize
     \r\n and \r to \n, strip trailing whitespace; raise FeedbackRubricError naming the
     path if missing, unreadable or empty.
   - feedback_rubric_sha256(path: str) -> str: sha256 of the normalized text.
   - build_feedback_system_prompt(settings: Settings) -> str: FEEDBACK_PROMPT if not
     settings.FEEDBACK_RUBRIC, else FEEDBACK_PROMPT + RUBRIC_PREAMBLE +
     load_feedback_rubric(settings.FEEDBACK_RUBRIC_FILE).
   - Module docstring: issue #269, canonical file, reused by #270.
3. Provider interface: LLMProvider.feedback(self, messages, model, correction=None,
   system_prompt: str = FEEDBACK_PROMPT); AnthropicProvider uses system=system_prompt;
   MistralProvider uses {"role": "system", "content": system_prompt}. Docstrings updated.
4. LLMService.get_feedback: system_prompt = build_feedback_system_prompt(self._settings)
   once before the loop; pass system_prompt=system_prompt on every attempt. A
   FeedbackRubricError propagates (no llm_calls row, since no call was made).
5. config.py: FEEDBACK_RUBRIC: bool = True; FEEDBACK_RUBRIC_FILE: str =
   "data/feedback_rubric.md" with a comment (issue #269). .env.example: commented
   "# FEEDBACK_RUBRIC=true" and "# FEEDBACK_RUBRIC_FILE=data/feedback_rubric.md" with
   one-line explanations.
6. Skill .claude/skills/french-feedback-rubric/:
   - SKILL.md frontmatter: name: french-feedback-rubric; description: one sentence
     that triggers on reviewing, correcting, grading or scoring a French learner's
     writing or conversation transcript (including feedback dataset records), using
     this project's feedback rubric. Body: (a) read data/feedback_rubric.md first,
     it's canonical; don't restate or copy it; (b) workflow: get the transcript (ask if
     none), identify the learner turns, ask for or infer the level, list errors per the
     rubric, score with the anchors, pick strengths and one focus area; (c) output for
     a person: short summary, a corrections table (Turn | Original | Corrected |
     Category | Severity | Why), scores with one-line justifications, strengths, focus
     area; on request, also JSON matching the app's FeedbackResponse
     (schemas/session.py); (d) worked examples in references/examples.md, taxonomy
     pointer in references/taxonomy.md; (e) this is a project skill that needs the
     repo; if there are no learner turns, say so rather than invent errors.
   - references/taxonomy.md: a short page saying the taxonomy is the "Error taxonomy"
     section of data/feedback_rubric.md (canonical; kept in line with evals/schema.py
     and evals/LABELING.md by tests/test_feedback_rubric.py); don't copy it here.
   - references/examples.md: 2-3 worked reviews of short, FRESH transcripts (beginner,
     intermediate, advanced), each in the SKILL.md output format, including at least
     one correct-but-unusual form left uncorrected with a note, and one vocabulary
     category.
7. Harness (evals/run_feedback_eval.py):
   - EvalConfig gains rubric: bool = True. Keys: rubric on -> base key; off ->
     "<key>:no-rubric".
   - RunOptions.rubric: "on" | "off" | "both" (default "on"); --rubric
     {on,off,both}. Configs expand in order: for each model, the rubric arm then the
     no-rubric arm (both), keeping the model order.
   - Per-config settings: settings_factory(...) then .model_copy(update={"FEEDBACK_RUBRIC":
     config.rubric}).
   - Preflight: if any arm has rubric on, call build_feedback_system_prompt on its
     settings; on FeedbackRubricError raise PreflightError("rubric: <message>").
   - estimate_feedback_cost uses len(build_feedback_system_prompt(arm settings)) or an
     equivalent composed prompt length per arm.
   - Report JSON: each model entry gains "rubric": bool; top-level "rubric":
     {"path", "sha256"} when any arm has the rubric on, else null; options gain
     "rubric". The _print_plan line shows "rubric on/off". evals/report.py:
     SCHEMA_VERSION = 2; model label appends ", rubric on" / ", rubric off"; header
     line shows the rubric path and sha256 prefix.
8. Tests (see Deliverables): write them alongside the code; existing assertions on
   FEEDBACK_PROMPT keep passing for direct provider calls without system_prompt.
9. Docs (see Deliverables). README Feedback Mode: the rubric file, what it contains,
   the FEEDBACK_RUBRIC kill switch, about 3k more input tokens per call, and that a
   missing file fails loudly (500). README Evaluation: a short "Feedback rubric (#269)"
   subsection with the A/B table and a link to 002.
10. Paid eval, after all tests pass and the code is committed locally:
    a. python3 -m evals.run_feedback_eval --dry-run --rubric both --max-spend-usd 3
    b. python3 -m evals.run_feedback_eval --limit 3 --rubric both --max-spend-usd 3
       (smoke; check both arms run and differ; don't commit the smoke reports)
    c. python3 -m evals.run_feedback_eval --rubric both --max-spend-usd 3 (full; commit
       its .json/.md)
    d. Apply rule 1 (rubric default), then rule 2 (Haiku switch) EXACTLY as
       pre-registered. If rule 2 is met: python3 -m evals.run_feedback_eval --models
       claude-sonnet,claude-haiku --rubric on --max-spend-usd 1 (commit it); switch
       only if rule 2 holds again.
    e. If anything fails or the cap is hit, stop and report; don't rerun to fish for a
       result.
11. docs/decisions/002-feedback-rubric.md (format from docs/decisions/README.md):
    Status Accepted, date, issue #269; context (rubric, why, link to 001's trigger);
    the pre-registered thresholds quoted verbatim and marked as fixed before the run;
    the decision (rubric default; feedback model unchanged or switched to Haiku);
    evidence tables (all six arms: recall, precision (false), false on clean, no-op,
    correction accuracy, grammar MAE, cost/conv., p50/p95) with links; each threshold
    check shown as numbers and pass/fail; cost and latency impact of the rubric;
    consequences; what would change it; limitations (27 conversations, single run per
    arm, rubric and labels both drafted by Claude, so part of any gain may be alignment
    with the labeler's conventions, B1 reviewer, judge agreement). Add 002 to the index;
    add a "See also 002" line to 001 (and, if switched, 001 status "Accepted; feedback
    choice superseded by 002").
12. Conditional Haiku switch (only if confirmed): config.py FEEDBACK_MODEL default
    "claude-haiku-5-5"; .env.example; tests/test_llm_config.py defaults; README (intro,
    setup, config table, tech stack, data flow, LLM integration, Evaluation decision),
    VISION.md model lines, CLAUDE.md guardrail (chat Sonnet 5.5, feedback Haiku 5.5).

CONSTRAINTS:
- Don't change FEEDBACK_PROMPT, the feedback JSON schema, frontend/, static/, chat
  defaults, Claude effort, the judge, or evals/LABELING.md definitions.
- No copies of the rubric outside data/; no symlinks.
- No feedback_v1 spans in the rubric or the skill examples (the test enforces it).
- 80%+ coverage per module; CI-style test run (clean copy, no .env, dummy keys).
- Never read or print .env. Paid calls only via the harness, within the caps.
- Thresholds are fixed; apply them as written and report the numbers either way.
- Commit as feat(#269): ... with SPDD artifacts, code, tests, docs and committed reports.

EXAMPLES:
- FEEDBACK_RUBRIC=False -> system prompt == FEEDBACK_PROMPT.
- Default settings -> FEEDBACK_PROMPT + RUBRIC_PREAMBLE + rubric text, on both attempts.
- FEEDBACK_RUBRIC_FILE="data/missing.md" -> FeedbackRubricError mentioning the path.
- --models claude-haiku --rubric both -> configs claude-haiku, claude-haiku:no-rubric.
- Rubric row "| `tense` | Yes | ..." -> taxonomy test fails (missing tense_mood).

ACCEPTANCE CRITERIA:
- [ ] SKILL.md with a clear trigger description, plus references/taxonomy.md (pointer)
      and references/examples.md
- [ ] The app's feedback prompt reads the rubric from data/feedback_rubric.md
- [ ] A --rubric both harness run compares with and without the rubric; reports
      committed; result in docs/decisions/002-feedback-rubric.md
- [ ] Rubric taxonomy matches evals/schema.py, enforced in CI

DELIVERABLES:
- data/feedback_rubric.md, services/llm/rubric.py, provider/service/config changes,
  .env.example
- .claude/skills/french-feedback-rubric/{SKILL.md, references/taxonomy.md,
  references/examples.md}
- Harness --rubric support and report schema v2
- Tests: tests/test_feedback_rubric.py (new) + updates to provider, service, eval
  runner, judge and report tests
- docs/decisions/002-feedback-rubric.md, index and 001 link; README, evals/README.md,
  evals/LABELING.md pointer
- Committed full A/B run reports (and the confirmation rerun if any)
- Conditional: the Haiku feedback default switch across config, tests and docs
```

---

## AI Response

*To be completed after implementation.*

---

## Human Review Notes

*To be completed after implementation.*

---

## Verification

*To be completed after implementation.*

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
