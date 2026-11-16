# SPDD Prompt: Feedback Eval Harness (Accuracy, Cost, Latency)

**GitHub Issue**: #231
**Issue Title**: Feedback eval harness comparing models on accuracy, cost and latency
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/231
**Artifact ID**: FLC-063-202611152149
**Created**: 2026-11-15 21:49
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-063-202611152142-[Analysis]-issue-231-feedback-eval-harness.md](../analysis/FLC-063-202611152142-[Analysis]-issue-231-feedback-eval-harness.md)

**Decisions confirmed by the user (2026-11-15):**
1. Judge model: **Mistral Large** (`mistral/mistral-large-latest`) by default, with a flag to rerun the judge on Claude Opus 5.5 as a sensitivity check.
2. Judge-validation set: Claude drafts ~20 items with proposed verdicts; the maintainer reviews them (same draft-then-review process as #230).
3. A small real, paid smoke run (`--limit 3`, three default configs) is part of verifying the implementation. Its report is not committed.

---

## Context

### Current Codebase State
- **Provider layer (#228)** in `services/llm/`: `LLMService` routes the `feedback` feature to `(FEEDBACK_PROVIDER, FEEDBACK_MODEL)` from the `Settings` passed to it, times each provider call, and writes one `llm_calls` row per call (tokens, `latency_ms`, `estimated_cost_usd`, `status`, `error_message`).
- **Schema-validated feedback (#229)**: `LLMService.get_feedback` validates in strict mode and retries exactly once. Each failed attempt is an `error` row (`invalid_json: …` / `schema_mismatch: …`); two failures raise `FeedbackValidationError`.
- **Dataset (#230)**: `evals/datasets/feedback_v1.jsonl`, 27 records (fb-001–009 beginner, fb-010–018 intermediate, fb-019–027 advanced; fb-007/016/027 clean), 71 labeled errors. Loader `evals.schema.load_dataset()`.
- `evals/` is an existing package; nothing in the app imports it. `.coveragerc` (`source = .`) measures `evals/*.py`, so new modules fall under the 80% total and per-module gate.
- The pytest workflow already runs on `evals/**` changes with `MISTRAL_API_KEY: dummy_test_key` (`.github/workflows/pytest-tests.yml:74`). No workflow runs anything under `evals/` other than pytest.
- `data/llm_pricing.json` has prices for all four models.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `services/llm/service.py` | Routing, validation, retry, recording | `LLMService` :98, `__init__(settings, providers)` :101; `route()` :115; `get_chat_response()` :129; `get_feedback()` :170; `validate_feedback()` :53; `build_provider()` :78; `_timed_call()` :260 (latency measured around the provider call only) |
| `services/llm/base.py` | Provider interface, prompt | `LLMResult` :21; `LLMProviderError` :41; `FeedbackValidationError` :54; `FEEDBACK_PROMPT` :87; `LLMProvider.chat()/feedback()` :189/:195 |
| `services/llm/pricing.py` | Price table, cost estimate | `load_price_table()` :97 (cached; keys `(provider, model)`); `estimate_cost_usd()` :111 (returns `None` if unpriced); `PriceEntry.checked_on` |
| `services/llm/metrics.py` | Nearest-rank percentile | `percentile(values, p)` :194; `_md_cell` :638 (Markdown cell escaping pattern) |
| `services/llm/recorder.py` | Writes `llm_calls` rows | `record_call()` :17 |
| `models/llm_call.py` | `LLMCall` ORM model | columns :39-49 |
| `database.py` | `Base` metadata | `Base` :11 |
| `config.py` | `Settings` | per-feature routing :30-33; `CLAUDE_FEEDBACK_EFFORT` :38; key validator :47 (requires keys for **both** `CHAT_PROVIDER` and `FEEDBACK_PROVIDER`) |
| `schemas/session.py` | `ExampleCorrection` (`original`, `corrected`, `explanation`; no message index), `FeedbackResponse` | :71, :79 |
| `evals/schema.py` | Dataset models + loader | `FeedbackEvalRecord`, `LabeledError`, `GRAMMATICAL_CATEGORIES`, `load_dataset()`, `DatasetError`, `_MODEL_CONFIG` |
| `evals/README.md`, `evals/LABELING.md` | Dataset docs, limits, review table | "Limits" section; "Review status" table |
| `tests/test_llm_service.py` | Fake-provider test pattern | `make_settings()` :35 (`Settings(_env_file=None, MISTRAL_API_KEY="m", ANTHROPIC_API_KEY="a", ...)`) |
| `tests/conftest.py` | In-memory async SQLite pattern | `TEST_DATABASE_URL`, `create_test_db()` |
| `README.md` | Project structure tree (:283-287), tests list (:391), intro paragraph (:5), metrics notes (:537, :541, :551) | update |

### Existing Patterns
- **Fakes, not SDK calls, in tests**: `LLMService(settings=make_settings(...), providers={"mistral": fake, "anthropic": fake})` with a fake `LLMProvider` subclass returning `LLMResult(text=..., input_tokens=..., output_tokens=...)`.
- **Strict Pydantic JSONL schemas**: `ConfigDict(extra="forbid", strict=True)` and a loader that reports 1-based line numbers (`evals/schema.py`).
- **Docstrings**: Google style with `Args:` / `Returns:` / `Raises:`, as in `services/llm/` and `evals/schema.py`.
- **Markdown reports**: tables with `n/a` for `None` and escaped `|`, plus a caveats section (`services/llm/metrics.py:665`).

---

## Goal

**Primary Objective**: Add `evals/run_feedback_eval.py`, a CLI that runs each selected model configuration over the labeled feedback dataset through the app's provider layer, matches each model's corrections to the labeled errors (deterministic pass, then an LLM judge), validates the judge against hand verdicts, and writes dated JSON and Markdown reports with per-model quality, cost and latency metrics and the run's total spend.

**Secondary Objectives**:
- A committed judge-validation set (`evals/datasets/judge_validation_v1.jsonl`, ~20 items) with a schema and a CI test.
- Guardrails: `--limit`, `--ids`, a spend cap (default $5), `--dry-run`, preflight checks for prices and API keys.
- Unit tests with fake providers, 80%+ coverage for every new module.
- Documentation in `evals/README.md` and the root `README.md`.
- A real smoke run (`--limit 3`) after the tests pass, to confirm the real providers work end-to-end.

---

## Constraints

### Architecture Constraints
- **All LLM calls go through `services.llm.LLMService`.** Feedback via `get_feedback(messages, db=..., session_id=...)`; the judge via `get_chat_response(messages, system_prompt, db=..., session_id=...)` on a **separate** `LLMService` whose `CHAT_PROVIDER/CHAT_MODEL` are the judge's. No `mistralai` or `anthropic` imports anywhere in `evals/`.
- **Don't change** `services/llm/*`, `config.py`, `schemas/*`, `models/*`, `FEEDBACK_PROMPT`, the retry logic, the app's default provider/model, or `evals/datasets/feedback_v1.jsonl`.
- **Isolated recording**: an in-memory async SQLite engine per run (`sqlite+aiosqlite:///:memory:` with `poolclass=StaticPool`), `Base.metadata.create_all` after importing `models.llm_call`, one `AsyncSession`. Never touch `french_coach.db`.
- **Per-config settings**: `Settings(FEEDBACK_PROVIDER=p, FEEDBACK_MODEL=m, CHAT_PROVIDER=p, CHAT_MODEL=m, CLAUDE_FEEDBACK_EFFORT=<override or None>)`, keys from `.env` via `Settings`' normal loading. Never read, print or log `.env` or key values.
- Sequential calls (no concurrency).
- No new dependencies, no new top-level directories, no app DB schema change, no provider-interface change.
- New code lives in `evals/`: `run_feedback_eval.py`, `matching.py`, `judge.py`, `scoring.py`, `report.py`. Output dir `evals/results/` (tracked, with `.gitkeep`).
- The harness must never run in CI. Tests only import its functions and use fake providers.

### Code Quality Constraints
- PEP 8, type hints, Google-style docstrings on public functions and classes; module docstrings naming issue #231.
- Pure functions for normalization, matching, scoring and report rendering (no I/O), so they're unit-testable.
- Ratios are `None` (rendered `n/a`) when the denominator is 0; ratios rounded to 4 decimals, USD to 8, MAE to 2.
- Use `services.llm.metrics.percentile` for p50/p95.

### Testing Constraints
- New test files: `tests/test_eval_matching.py`, `tests/test_eval_scoring.py`, `tests/test_eval_judge.py`, `tests/test_eval_report.py`, `tests/test_eval_runner.py`.
- No network: fake `LLMProvider` subclasses injected through `LLMService(providers=...)`; `Settings(_env_file=None, MISTRAL_API_KEY="m", ANTHROPIC_API_KEY="a", ...)`.
- Each new `evals/*.py` module ≥ 80% line coverage; no new `ALLOWLIST` entries in `scripts/check_module_coverage.py`.
- A test validates `judge_validation_v1.jsonl` (schema + ≥ 10 items + references resolve against `feedback_v1`).
- A test asserts no file in `.github/workflows/` mentions `run_feedback_eval`.
- Full suite and coverage gate: `python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json` then `python3 scripts/check_module_coverage.py coverage.json`.

### Acceptance Criteria
From issue #231:
- [ ] Reports per model: error recall, precision (false corrections), correction accuracy, grammar-score mean absolute error against the labels, schema-validity rate, cost per conversation, and p50/p95 latency
- [ ] At least three configurations: Mistral Large, Claude Sonnet 5.5 and Claude Haiku 5.5
- [ ] Judge agreement with hand labels is measured on at least 10 items and reported
- [ ] Each run writes a dated JSON report and a Markdown report under `evals/results/`, including the run's total spend
- [ ] A `--limit` flag and a spend cap prevent accidentally large runs
- [ ] The harness is never part of required CI (it makes real, paid API calls)

---

## Examples

### Input/Output Examples

Normalization `normalize(s)`: Unicode NFC → replace `’ ‘ ʼ` with `'` and `“ ” « »` with `"` → casefold → collapse runs of whitespace to one space → strip leading/trailing whitespace and the characters `.,;:!?"()…` (not `'`).

1. **Exact match** (fb-001, labeled `une croissant → un croissant`)
   - Model correction: `{"original": "une croissant", "corrected": "un croissant"}`
   - Output: labeled error 0 → `detected=True, correct=True, method="deterministic"`
2. **Wider model span** (fb-001, labeled `Je ne ai pas → Je n'ai pas`)
   - Model: `{"original": "Je ne ai pas de monnaie", "corrected": "Je n’ai pas de monnaie"}`
   - Labeled span is inside the model span; substituting the labeled correction into the model span gives `je n'ai pas de monnaie` == normalized model correction → detected, correct, deterministic.
3. **Narrower model span** (fb-001, labeled `à le comptoir → au comptoir`)
   - Model: `{"original": "à le", "corrected": "au"}`
   - Model span inside labeled span; `"à le comptoir".replace("à le", "au")` == `"au comptoir"` → detected, correct, deterministic.
4. **Alternative** (fb-002, labeled `avec le train → en train`, alternative `par le train`)
   - Model: `{"original": "avec le train", "corrected": "par le train"}` → detected, correct, deterministic.
5. **Wrong fix → judge** (fb-001)
   - Model: `{"original": "une croissant", "corrected": "une croissante"}` → span match, corrected form mismatch → judge pair. Judge `{"addresses_error": true, "correction_acceptable": false}` → detected, not correct, method `judge`.
6. **False correction on a clean record** (fb-007)
   - Any correction → no labeled errors to pair with → false correction; recall denominator 0 → recall `None` for that record; `false_corrections_on_clean += 1`.
7. **No-op** — model `original` and `corrected` normalize to the same string → ignored, counted in `no_op_corrections`, neither true nor false.
8. **Invalid feedback** — fake returns `"pas du json"` twice → `FeedbackValidationError` → outcome `invalid_feedback`; its labeled errors count as missed in recall; cost and latency of both attempts counted; first-attempt and final validity both false.
9. **Grammar MAE** — labels 80, 80, 90; model scores 85, 70, 90 → MAE 5.0, `grammar_mae_n=3`.
10. **Spend cap** — fake calls priced at $0.004 each (via token counts and the real price table, or an injected price table), cap $0.01 → the third conversation is not started; status `stopped_spend_cap`; reports written; `main()` returns 2.
11. **`--limit 4`** → records fb-001, fb-010, fb-019, fb-002 (round-robin by difficulty in `VALID_DIFFICULTIES` order, file order within a level).

### Deterministic matching rules (exact)

For one conversation, with labeled errors `L` (each with `message_index`, accepted corrections `A_L = [corrected] + alternatives`) and model corrections `C` (deduplicated on normalized `(original, corrected)`, no-ops removed):

1. **Locate** each correction `c`: the learner (user) messages whose normalized content contains `norm(c.original)`. If at least one, the candidate errors for `c` are the labeled errors in those messages; otherwise (not found verbatim) the candidates are all labeled errors in the conversation.
2. **Span match** between `c` and a candidate `L`: `norm(L.original) in norm(c.original)` or `norm(c.original) in norm(L.original)`.
3. **Corrected-form match** (only if span match):
   - Model span ⊇ labeled span: let `S` = candidate labeled errors whose normalized span lies inside `norm(c.original)`. Match all of `S` if `norm(c.corrected)` equals `norm(c.original)` with each `L ∈ S` replaced by some `a ∈ A_L` (try every combination; `S` is small). Otherwise, `L` alone matches if some normalized `a ∈ A_L` is in `norm(c.corrected)` and (`norm(L.original)` is not in `norm(c.corrected)` or `norm(L.original)` is a substring of `norm(a)`).
   - Model span ⊂ labeled span: match if `norm(L.original).replace(norm(c.original), norm(c.corrected), 1)` equals some normalized `a ∈ A_L`.
4. Span match + corrected-form match → `detected=True, correct=True, method="deterministic"`.
5. Span match without corrected-form match → **judge pair** `(L, c)`.
6. A correction with no span match against any candidate → judge pairs `(L, c)` for **every** candidate `L` (if there are no candidates at all, it's a false correction without a judge call).
7. After the judge: a labeled error is detected if any pair says `addresses_error`; it's correct if any detecting pair is deterministic-correct or `correction_acceptable`. A correction is a true correction if it detects at least one labeled error, otherwise a false correction.

### Judge

- System prompt (English instructions; French content), asking the judge to decide whether the tutor's correction addresses the labeled learner error and whether the correction of that error is acceptable French, and to reply with **only** `{"addresses_error": <bool>, "correction_acceptable": <bool>, "reason": "<short English reason>"}`. It must not say which model produced the correction.
- User message: the learner message (full text), the labeled error (category, erroneous span, accepted corrections, labeler note if any) and the tutor's correction (`original`, `corrected`, `explanation`).
- Parsing: strip whitespace and Markdown code fences, take the substring from the first `{` to the last `}`, validate with a strict Pydantic model (`addresses_error: bool`, `correction_acceptable: bool`, `reason: str = ""`; extra keys ignored). `correction_acceptable` is forced `False` when `addresses_error` is `False`.
- On a parse failure: one re-ask (the same request plus the failed output as an assistant turn and a user turn "Reply with only the JSON object."). A second failure → verdict `None` (`judge_error`), treated as not matched and counted.
- Provider exceptions on a judge call → also `judge_error`, counted, run continues.
- Verdicts are cached per `(record_id, error_index, norm(c.original), norm(c.corrected))` within a run.
- Judge calls are recorded in the eval DB (`feature="chat"`) with the conversation's `session_id` (validation items use `session_id = 900000 + i`).

### Judge-validation set

`evals/datasets/judge_validation_v1.jsonl`, one item per line:

```json
{"id": "jv-001", "record_id": "fb-001", "error_index": 0, "source_style": "mistral",
 "candidate": {"original": "une croissant", "corrected": "un croissant", "explanation": "Croissant est masculin."},
 "verdict": {"addresses_error": true, "correction_acceptable": true},
 "note": "Exact match; sanity item"}
```

- `record_id` must exist in `feedback_v1`; `error_index` must index its `errors`; `source_style` ∈ `mistral | claude | neutral` (the phrasing style the candidate imitates, so agreement can be broken down); `id` matches `jv-NNN`, unique.
- ~20 items covering: correct paraphrases with a different span (6–7), wrong or partial fixes on the right span (4–5), corrections that target a different word in the same message (3–4), correct fixes with a different but acceptable form (3–4), and a few exact-match sanity items. Mixed across difficulty levels and styles. At least 5 items with `addresses_error: false` or `correction_acceptable: false`.
- **Agreement**: an item agrees when both normalized booleans equal the hand verdict; a `judge_error` is a disagreement. Report overall agreement, per-field agreement, agreement by `source_style`, n, and the list of disagreements (item id, hand vs judge, judge reason).
- `evals/README.md` gets a review-status row for `judge_validation_v1` (drafted by Claude Code, pending maintainer review).

### Configurations

```python
EVAL_CONFIGS = {
    "mistral-large": EvalConfig("mistral-large", "mistral", "mistral-large-latest"),
    "claude-sonnet": EvalConfig("claude-sonnet", "anthropic", "claude-sonnet-5-5"),
    "claude-haiku": EvalConfig("claude-haiku", "anthropic", "claude-haiku-5-5"),
    "claude-opus": EvalConfig("claude-opus", "anthropic", "claude-opus-5-5"),
}
DEFAULT_CONFIG_KEYS = ("mistral-large", "claude-sonnet", "claude-haiku")
DEFAULT_JUDGE = ("mistral", "mistral-large-latest")
DEFAULT_MAX_SPEND_USD = 5.00
```

Claude feedback effort is the app default (`medium`) unless `--claude-effort` is given; the effort used is recorded per config (`None` for Mistral).

### CLI

`python3 -m evals.run_feedback_eval [options]` (also `python3 evals/run_feedback_eval.py`, via a small `sys.path` shim when `__package__` is empty):

| Flag | Default | Meaning |
|------|---------|---------|
| `--models` | `mistral-large,claude-sonnet,claude-haiku` | Comma-separated config keys, or `all` (adds `claude-opus`) |
| `--limit N` | none | At most N conversations per config, round-robin by difficulty; N ≥ 1 |
| `--ids` | none | Comma-separated record ids (applied before `--limit`); unknown id → error |
| `--max-spend-usd X` | 5.00 | Spend cap for the whole run, X > 0 |
| `--dry-run` | off | Preflight + plan + a-priori cost estimate; no calls, no reports |
| `--judge-provider`, `--judge-model` | `mistral`, `mistral-large-latest` | Judge |
| `--skip-judge-validation` | off | Don't run the validation set (report says so) |
| `--claude-effort` | none | Override Claude feedback effort (`low…max`) |
| `--dataset`, `--judge-validation`, `--output-dir` | v1 paths, `evals/results` | Paths |
| `--export-judge-sample N` | 0 | Also write up to N judge-decided pairs from the run as `<run>_judge_sample.jsonl` in the validation-set format, with the judge's verdict and `"needs_review": true` |

Exit codes: 0 completed; 1 preflight/argument error or any config aborted; 2 `stopped_spend_cap`; 130 interrupted (Ctrl-C, after writing a partial report).

### Run flow

1. Parse args; load dataset; select records (`--ids`, then `--limit`).
2. **Preflight** (no calls): every config and the judge has a price entry in `load_price_table()`; build every config's `Settings` and the judge's (a missing key raises → exit 1 with the `Settings` error message, which names the variable but not its value); load and validate the judge-validation set (unless skipped).
3. Print the plan: configs, records, judge, cap, a-priori estimate. `--dry-run` returns 0 here.
4. Create the eval DB and session.
5. Judge validation first (cheap, and its result is needed even if the cap stops the run later), with spend checks.
6. For each config, for each record: spend check → `get_feedback` → classify the outcome (`valid` / `invalid_feedback` / `provider_error`) → read this `session_id`'s `feedback` rows (cost sum, latency sum, attempts, first-attempt status, per-call latencies) → deterministic matching → judge pairs (spend check before each judge call) → score. After 3 consecutive `provider_error`s, mark the config `aborted_errors` and move on.
7. Aggregate per config (overall and per difficulty) and write the reports.

**Spend check**: `spent = SUM(estimated_cost_usd)` over all rows in the eval DB. Projection for the next feedback conversation = the largest per-conversation cost observed so far for this config, or, before any observation, `estimate_cost_usd(provider, model, input_tokens=ceil(chars/3), output_tokens=8000, cache_read_tokens=0)` where `chars = len(FEEDBACK_PROMPT) + len(transcript)`. Judge projection = largest observed judge call cost, or the same estimate with 1000 output tokens. Stop if `spent + projection > cap`.

**Per-conversation outputs** read from the eval DB for that `session_id` and `feature="feedback"`: `cost_usd` (sum), `latency_ms` (sum of attempts), `attempts`, `first_attempt_valid` (first row's `status == "success"`), `call_latencies_ms`.

### Metrics (per config: `overall` and `by_difficulty[level]`)

| Key | Definition |
|-----|------------|
| `conversations` | Attempted conversations |
| `valid_conversations` | Outcome `valid` |
| `labeled_errors` | Labeled errors in attempted conversations |
| `detected_errors`, `correctly_fixed_errors` | From matching (0 for non-valid conversations) |
| `error_recall` | `detected_errors / labeled_errors` |
| `corrections_total`, `true_corrections`, `false_corrections`, `false_corrections_on_clean`, `no_op_corrections` | Over valid conversations |
| `precision` | `true_corrections / corrections_total` |
| `correction_accuracy` | `correctly_fixed_errors / detected_errors` |
| `grammar_mae`, `grammar_mae_n` | Over valid conversations |
| `schema_valid_first_attempt_rate`, `schema_valid_final_rate` | Over attempted conversations |
| `provider_errors` | Outcome `provider_error` count |
| `cost_per_conversation_usd`, `total_cost_usd` | Mean / sum of per-conversation feedback cost (judge excluded) |
| `latency_p50_ms`, `latency_p95_ms` | Nearest-rank over per-conversation latency |
| `call_latency_p50_ms`, `call_latency_p95_ms` | Nearest-rank over individual feedback calls |
| `judge_pairs`, `judge_errors`, `judge_cost_usd` | Judge activity attributable to this config |
| `mean_corrections_per_conversation` | Over valid conversations |

### Reports

Files: `<output-dir>/feedback_eval_<YYYYMMDD-HHMMSS>.json` and `.md` (UTC start time; on a name collision append `-2`, `-3`, …). Written for `completed`, `stopped_spend_cap` and `interrupted` runs. Directory created if missing.

JSON top level: `schema_version` (1), `run_id`, `started_at`, `finished_at`, `status`, `git_commit` (best-effort `git rev-parse HEAD`, `None` on failure), `dataset` (`path`, `sha256`, `records_total`, `records_selected`), `options` (models, limit, ids, max_spend_usd, claude_effort, skip_judge_validation), `judge` (`provider`, `model`, `shares_provider_with` (config keys), `rationale`), `prices` (per used model: rates and `checked_on`), `spend` (`total_usd`, `feedback_by_config`, `judge_usd`, `judge_validation_usd`, `cap_usd`), `judge_validation` (or `null` with a reason), `models` (per config: key, provider, model, effort, status `completed|stopped_spend_cap|aborted_errors|not_run|interrupted`, `metrics`, `conversations` with raw corrections, per-error match details, false corrections, outcome, error messages, cost, latency, attempts), `caveats` (list of strings).

Markdown: title and run metadata; a summary table with one row per model (recall, precision with false count, correction accuracy, grammar MAE (n), schema valid first/final, cost per conversation, p50/p95 latency); per-difficulty tables (recall, precision, MAE, n); spend breakdown with the cap; judge section (choice, rationale, shared provider, agreement, disagreements); caveats. Caveats always include: synthetic conversations; labels and validation verdicts drafted by a Claude model and reviewed by a B1 maintainer; small sample, small differences aren't meaningful; the feedback prompt asks for *example* corrections, which caps recall; single run of non-deterministic models; prices as of their `checked_on` dates; status note when the run was partial.

### Edge Cases
- Curly apostrophes, case, trailing punctuation, extra spaces → normalized away.
- Correction quoting the assistant or paraphrasing (not found in learner messages) → judged against all labeled errors; otherwise false.
- Duplicate corrections → deduplicated before scoring.
- Clean record → recall contribution 0/0; corrections are false.
- `FeedbackValidationError` / provider exception → outcome recorded, run continues; 3 in a row → `aborted_errors`.
- Unpriced config or judge model → preflight exit 1, no calls.
- Missing API key → preflight exit 1, no calls, no key value printed.
- `--limit 0`, negative, `--max-spend-usd 0` → argparse error (exit 2 from argparse is fine for argument errors; document).
- Unknown `--models` key or `--ids` id → error before any call.
- Judge malformed JSON → one re-ask → `judge_error`.
- Judge model also under test → allowed; `shares_provider_with` lists it.
- Ctrl-C → `interrupted`, partial reports, return 130.

### Test Cases
```python
def test_wider_model_span_matches_with_curly_apostrophe():
    # Given fb-001's "Je ne ai pas" error and a correction over a wider span
    record = record_by_id("fb-001")
    corrections = [Correction("Je ne ai pas de monnaie", "Je n’ai pas de monnaie", "")]

    # When
    result = match_deterministic(record, corrections)

    # Then
    assert result.decided[2].detected and result.decided[2].correct
    assert result.judge_pairs == []


async def test_spend_cap_stops_run_and_writes_partial_report(tmp_path):
    # Given a fake provider whose calls cost ~$0.004 and a $0.01 cap
    options = make_options(limit=5, max_spend_usd=0.01, output_dir=tmp_path,
                           skip_judge_validation=True, models=["mistral-large"])

    # When
    result = await run_eval(options, settings_factory=fake_settings,
                            providers=fake_providers(cost_tokens=...))

    # Then
    assert result.status == "stopped_spend_cap"
    report = json.loads(next(tmp_path.glob("feedback_eval_*.json")).read_text())
    assert report["status"] == "stopped_spend_cap"
    assert report["spend"]["total_usd"] <= 0.01


def test_no_workflow_runs_the_harness():
    for workflow in Path(".github/workflows").glob("*.yml"):
        assert "run_feedback_eval" not in workflow.read_text()
```

---

## Deliverables

### Code Changes
- [ ] `evals/matching.py`: `normalize()`, `Correction` dataclass, `MatchDecision`, `JudgePair`, `match_deterministic(record, corrections)` returning decided matches, judge pairs, false/no-op corrections
- [ ] `evals/judge.py`: judge prompts, `JudgeVerdict` model, `parse_verdict()`, `Judge` (async, cached, through `LLMService.get_chat_response`), `JudgeValidationItem` schema, `load_judge_validation()`, `compute_agreement()`
- [ ] `evals/scoring.py`: `score_conversation()` (combines deterministic and judge decisions), `ConversationScore`, `aggregate_metrics()` (overall + by difficulty)
- [ ] `evals/report.py`: `build_report()` (JSON dict), `render_markdown()`, `write_reports()` (dated names, collision suffix, creates dir)
- [ ] `evals/run_feedback_eval.py`: `EvalConfig`, `EVAL_CONFIGS`, defaults, `parse_args()`, `select_records()`, preflight, `SpendTracker`, `run_eval()` (accepts `settings_factory` and `providers` for tests), `main(argv) -> int`, `__main__` guard and `sys.path` shim
- [ ] `evals/datasets/judge_validation_v1.jsonl`: ~20 drafted items with proposed verdicts
- [ ] `evals/results/.gitkeep`
- [ ] `evals/__init__.py`: docstring mentions the harness

### Tests
- [ ] `tests/test_eval_matching.py`: normalization; exact, wider, narrower, alternative, multi-error span, wrong fix → judge pair, unlocated correction, clean record, duplicates, no-ops
- [ ] `tests/test_eval_judge.py`: verdict parsing (fences, prose around JSON, invalid, forced false), re-ask then success, double failure → `judge_error`, provider exception, caching, validation-set loading and schema errors, the committed set (≥ 10 items, refs resolve), agreement computation
- [ ] `tests/test_eval_scoring.py`: per-conversation scoring incl. invalid/provider-error outcomes, recall/precision/accuracy/MAE/validity/cost/latency aggregation, by-difficulty split, `None` ratios
- [ ] `tests/test_eval_report.py`: JSON structure, Markdown sections and `n/a`, file naming and collision suffix, total spend present
- [ ] `tests/test_eval_runner.py`: arg parsing and validation, `select_records` round-robin and `--ids`, preflight (unpriced model, missing key), dry run (no calls, no files), full fake run over 3 configs (reports written, metrics present), spend cap stop (exit 2), consecutive provider errors → `aborted_errors`, judge sharing provider, `--export-judge-sample`, `main()` exit codes, no-workflow test

### Documentation
- [ ] `evals/README.md`: harness section (what it does, how to run, flags, guardrails, cost expectation, metric definitions, matching rules summary, judge choice and rationale, judge-validation set and its review status, report files, limits); layout tree updated
- [ ] `README.md`: intro sentence (harness exists, no published results yet; #232 publishes), project structure tree (`evals/` new files), tests list (new test files)
- [ ] Docstrings on all public functions

---

## Actual Prompt

```
Implement GitHub issue #231 in the french-language-coach repo: a feedback eval harness
that compares models on accuracy, cost and latency. Follow this prompt artifact exactly
(spdd/prompt/FLC-063-202611152149-[Feat]-issue-231-feedback-eval-harness.md) and the
analysis (spdd/analysis/FLC-063-202611152142-[Analysis]-issue-231-feedback-eval-harness.md).

CONTEXT:
- Provider layer (#228): services/llm/service.py LLMService(settings, providers=None).
  get_feedback(messages, db, session_id) validates strictly, retries once, records each
  attempt as an llm_calls row (feature "feedback"; failed attempts status "error" with
  "invalid_json: ..."/"schema_mismatch: ..."), raises FeedbackValidationError after two
  failures. get_chat_response(messages, system_prompt, db, session_id) records feature
  "chat". Latency is measured around the provider call only.
- Settings (config.py) route by CHAT_PROVIDER/CHAT_MODEL and FEEDBACK_PROVIDER/FEEDBACK_MODEL
  and require an API key for both providers named; CLAUDE_FEEDBACK_EFFORT overrides
  Claude's default feedback effort (medium).
- Pricing: services/llm/pricing.py load_price_table() keyed (provider, model);
  estimate_cost_usd() returns None when unpriced. data/llm_pricing.json prices all four
  models. services/llm/metrics.py percentile() is nearest-rank.
- Dataset (#230): evals/schema.py load_dataset() -> list[FeedbackEvalRecord] from
  evals/datasets/feedback_v1.jsonl (27 records ordered beginner, intermediate, advanced;
  fb-007/016/027 clean; errors have message_index, category, original, corrected,
  alternatives, note; grammar_score label). Model corrections (schemas/session.py
  ExampleCorrection) have original, corrected, explanation and no message index.
- Tests use fake LLMProvider subclasses via LLMService(providers={...}) and
  Settings(_env_file=None, MISTRAL_API_KEY="m", ANTHROPIC_API_KEY="a", ...)
  (tests/test_llm_service.py). .coveragerc measures evals/*.py; 80% total and per module.

GOAL:
Create evals/run_feedback_eval.py (CLI: python3 -m evals.run_feedback_eval) plus
evals/matching.py, evals/judge.py, evals/scoring.py, evals/report.py. For each selected
config (default mistral-large = mistral/mistral-large-latest, claude-sonnet =
anthropic/claude-sonnet-5-5, claude-haiku = anthropic/claude-haiku-5-5; claude-opus =
anthropic/claude-opus-5-5 only with --models all or by name), run every selected dataset
record through LLMService.get_feedback, recording into an in-memory SQLite eval DB
(sqlite+aiosqlite:///:memory:, StaticPool, Base.metadata.create_all after importing
models.llm_call). Match corrections to labeled errors (deterministic rules below, then an
LLM judge for undecided pairs), validate the judge on a hand-verdict set, compute
per-model metrics overall and per difficulty, and write dated JSON and Markdown reports
under evals/results/ with the run's total spend.

CONSTRAINTS:
1. All LLM calls through services.llm.LLMService; the judge uses a separate LLMService
   whose CHAT_PROVIDER/CHAT_MODEL are the judge (default mistral/mistral-large-latest;
   --judge-provider/--judge-model override, e.g. anthropic/claude-opus-5-5 as a
   sensitivity check). No mistralai/anthropic imports in evals/.
2. Do not modify services/llm/*, config.py, schemas/*, models/*, FEEDBACK_PROMPT,
   evals/datasets/feedback_v1.jsonl, or the app's defaults. No new dependencies, no new
   top-level directories. Sequential calls only.
3. Per-config Settings(FEEDBACK_PROVIDER=p, FEEDBACK_MODEL=m, CHAT_PROVIDER=p,
   CHAT_MODEL=m, CLAUDE_FEEDBACK_EFFORT=override-or-None); keys come from .env through
   Settings. Never read/print .env or key values. run_eval() accepts settings_factory and
   providers so tests inject fakes.
4. Normalization: NFC; ’ ‘ ʼ -> '; “ ” « » -> "; casefold; collapse whitespace; strip
   leading/trailing whitespace and .,;:!?"()… (not ').
5. Deterministic matching per conversation (corrections deduplicated on normalized
   (original, corrected); no-ops, where both normalize equal, removed and counted):
   a. Locate c: learner messages whose normalized content contains norm(c.original);
      candidates = labeled errors in those messages, else all labeled errors.
   b. Span match: norm(L.original) in norm(c.original) or the reverse.
   c. Corrected form: if model span ⊇ labeled span, S = candidates whose span is inside
      norm(c.original); all of S match if norm(c.corrected) equals norm(c.original) with
      each L in S replaced by one of its accepted corrections (corrected + alternatives,
      all combinations); else L alone matches if a normalized accepted correction is in
      norm(c.corrected) and (norm(L.original) not in norm(c.corrected) or norm(L.original)
      is a substring of that correction). If model span ⊂ labeled span: match if
      norm(L.original).replace(norm(c.original), norm(c.corrected), 1) equals a normalized
      accepted correction.
   d. Span + corrected form -> detected, correct, "deterministic". Span only -> judge pair.
      No span match with any candidate -> judge pairs with every candidate (no candidates
      at all -> false correction, no judge call).
   e. Labeled error detected if any pair addresses it; correct if any detecting pair is
      deterministic-correct or judge-acceptable. A correction detecting no labeled error
      is a false correction.
6. Judge: blind to model identity; system prompt asks whether the tutor's correction
   addresses the labeled learner error and whether its fix is acceptable French; reply
   ONLY {"addresses_error": bool, "correction_acceptable": bool, "reason": str}. User
   message carries the full learner message, labeled error (category, span, accepted
   corrections, note) and the correction (original, corrected, explanation). Parse: strip
   code fences, take first "{" to last "}", strict Pydantic; correction_acceptable forced
   False when addresses_error is False. One re-ask on parse failure (failed output as an
   assistant turn + "Reply with only the JSON object."), then judge_error (not matched,
   counted). Provider exceptions -> judge_error. Cache per (record_id, error_index,
   norm(original), norm(corrected)). Judge calls use the conversation's session_id;
   validation items use 900000 + i.
7. Judge-validation set evals/datasets/judge_validation_v1.jsonl: ~20 items
   {id "jv-NNN", record_id, error_index, source_style mistral|claude|neutral,
   candidate {original, corrected, explanation}, verdict {addresses_error,
   correction_acceptable}, note?}; strict schema (extra="forbid"), refs must resolve in
   feedback_v1; at least 5 negative items; mix of paraphrases with different spans,
   wrong/partial fixes, corrections targeting another word, acceptable alternative forms,
   sanity exact matches; across levels. Agreement = both normalized booleans equal;
   judge_error = disagreement. Report overall, per field, per source_style, n, and
   disagreements. Run it before the configs unless --skip-judge-validation. Drafted by
   Claude Code, pending maintainer review (say so in evals/README.md and the report).
8. Spend: spent = SUM(estimated_cost_usd) in the eval DB. Before each feedback
   conversation and each judge call, stop if spent + projection > cap. Feedback
   projection = max observed per-conversation cost for this config, else
   estimate_cost_usd(p, m, ceil((len(FEEDBACK_PROMPT)+len(transcript))/3), 8000, 0);
   judge projection = max observed judge call cost, else same with 1000 output tokens.
   Default cap $5.00 (--max-spend-usd, > 0). On stop: status stopped_spend_cap, partial
   reports, exit 2. Unpriced config/judge model or missing key -> preflight failure, exit
   1, no calls.
9. Outcomes per conversation: valid / invalid_feedback (FeedbackValidationError) /
   provider_error (any other exception). Three consecutive provider_errors -> config
   aborted_errors, continue with the next config, final exit 1. Per-conversation cost =
   sum of that session_id's feedback rows' estimated_cost_usd; latency = sum of their
   latency_ms; first_attempt_valid = first row's status == "success".
10. Metrics (overall and by difficulty): conversations, valid_conversations,
    labeled_errors, detected_errors, correctly_fixed_errors, error_recall (over all
    attempted conversations; non-valid ones contribute 0 detections), corrections_total,
    true_corrections, false_corrections, false_corrections_on_clean, no_op_corrections,
    precision, correction_accuracy (correct / detected), grammar_mae + grammar_mae_n (valid
    only), schema_valid_first_attempt_rate, schema_valid_final_rate, provider_errors,
    cost_per_conversation_usd, total_cost_usd (judge excluded), latency_p50_ms /
    latency_p95_ms (per conversation), call_latency_p50_ms / call_latency_p95_ms,
    judge_pairs, judge_errors, judge_cost_usd, mean_corrections_per_conversation. Ratios
    None when the denominator is 0; round ratios 4, USD 8, MAE 2. Use
    services.llm.metrics.percentile.
11. CLI flags: --models (comma keys or "all"), --limit N (>= 1, round-robin by difficulty
    in VALID_DIFFICULTIES order, file order within a level), --ids (applied before
    --limit; unknown id -> error), --max-spend-usd, --dry-run (preflight + plan +
    a-priori estimate, no calls, no files, exit 0), --judge-provider, --judge-model,
    --skip-judge-validation, --claude-effort (low|medium|high|xhigh|max), --dataset,
    --judge-validation, --output-dir (default evals/results), --export-judge-sample N
    (write up to N judge-decided pairs as <run>_judge_sample.jsonl in the validation
    format with the judge's verdict and "needs_review": true). Exit codes 0/1/2/130.
    `python3 evals/run_feedback_eval.py` also works via a sys.path shim.
12. Reports: feedback_eval_<YYYYMMDD-HHMMSS>.json/.md (UTC start; -2, -3 suffix on
    collision; dir created). JSON keys: schema_version, run_id, started_at, finished_at,
    status, git_commit, dataset {path, sha256, records_total, records_selected}, options,
    judge {provider, model, shares_provider_with, rationale}, prices (rates + checked_on),
    spend {total_usd, feedback_by_config, judge_usd, judge_validation_usd, cap_usd},
    judge_validation, models [{key, provider, model, effort, status, metrics,
    conversations}], caveats. Markdown: metadata, summary table (one row per model),
    per-difficulty tables, spend, judge section with rationale and agreement, caveats
    (synthetic data; Claude-drafted labels and validation verdicts, B1 reviewer; small n;
    prompt asks for example corrections so recall is capped; single non-deterministic
    run; price checked_on dates; partial-run note).
13. Google-style docstrings, PEP 8, type hints. Pure functions for normalization,
    matching, scoring and rendering.
14. Tests (no network): tests/test_eval_matching.py, test_eval_judge.py,
    test_eval_scoring.py, test_eval_report.py, test_eval_runner.py; each new evals module
    >= 80%; a test that no .github/workflows file mentions run_feedback_eval; a test that
    validates judge_validation_v1.jsonl (>= 10 items, refs resolve). Run the full suite
    with coverage and scripts/check_module_coverage.py.

EXAMPLES:
- fb-001 "une croissant"->"un croissant" exact -> detected, correct, deterministic.
- fb-001 model "Je ne ai pas de monnaie"->"Je n’ai pas de monnaie" vs label
  "Je ne ai pas"->"Je n'ai pas" -> deterministic match (wider span, curly apostrophe).
- fb-001 model "à le"->"au" vs label "à le comptoir"->"au comptoir" -> deterministic
  match (narrower span).
- fb-002 model "avec le train"->"par le train" (alternative) -> deterministic match.
- fb-001 model "une croissant"->"une croissante" -> judge pair; judge
  {true,false} -> detected, not correct.
- fb-007 (clean) any correction -> false correction, false_corrections_on_clean += 1.
- Fake returns "pas du json" twice -> invalid_feedback; labeled errors missed; both
  attempts' cost counted; first/final validity false.
- Labels 80, 80, 90 vs model 85, 70, 90 -> grammar_mae 5.0, n 3.
- Cap $0.01 with ~$0.004 calls -> third conversation not started, stopped_spend_cap,
  exit 2, reports written with spend.total_usd <= 0.01.
- --limit 4 -> fb-001, fb-010, fb-019, fb-002.

ACCEPTANCE CRITERIA:
- [ ] Reports per model: error recall, precision (false corrections), correction
      accuracy, grammar-score MAE against the labels, schema-validity rate, cost per
      conversation, and p50/p95 latency
- [ ] At least three configurations: Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5
- [ ] Judge agreement with hand labels is measured on at least 10 items and reported
- [ ] Each run writes a dated JSON report and a Markdown report under evals/results/,
      including the run's total spend
- [ ] A --limit flag and a spend cap prevent accidentally large runs
- [ ] The harness is never part of required CI

DELIVERABLES:
- evals/matching.py, evals/judge.py, evals/scoring.py, evals/report.py,
  evals/run_feedback_eval.py, evals/datasets/judge_validation_v1.jsonl,
  evals/results/.gitkeep, evals/__init__.py docstring update
- tests/test_eval_matching.py, tests/test_eval_judge.py, tests/test_eval_scoring.py,
  tests/test_eval_report.py, tests/test_eval_runner.py
- evals/README.md harness section + layout; README.md intro sentence, structure tree,
  tests list
- Verification: full pytest suite + coverage gate; then a real smoke run
  `python3 -m evals.run_feedback_eval --limit 3` (default configs, Mistral judge,
  validation set included) whose reports are reviewed but not committed
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-15.

- `evals/matching.py`: `normalize()`, `Correction`, `prepare_corrections()`, `match_deterministic()` implementing rules 5a–5e exactly (locate, span match, wide-span combination substitution with the single-error fallback, narrow-span substitution, judge pairs, no-candidate corrections).
- `evals/judge.py`: `JUDGE_SYSTEM_PROMPT`, strict `JudgeVerdict` + `parse_verdict()` (fences/prose stripped, acceptable forced false when not addressed), `Judge` (calls `LLMService.get_chat_response`, one re-ask, `judge_error` on a second failure or provider exception, spend hooks, per-run cache; the spend-cap exception is never swallowed), the `JudgeValidationItem` schema, `load_judge_validation()`, `run_judge_validation()`, `compute_agreement()`, `judge_rationale()`, `sample_record()`.
- `evals/scoring.py`: `CallUsage`, `ConversationScore`, `score_conversation()`, `compute_metrics()` / `aggregate_metrics()` with every metric in constraint 10, overall and per difficulty (`DIFFICULTY_ORDER`, since `VALID_DIFFICULTIES` is a set).
- `evals/report.py`: `build_report()`, `render_markdown()` (summary, by difficulty, details, spend, judge, prices, caveats), `write_reports()` with the collision suffix.
- `evals/run_feedback_eval.py`: `EVAL_CONFIGS` (three defaults + opt-in Opus), argparse CLI with every flag in constraint 11, `select_records()` (round-robin), preflight (prices, keys via `Settings` with value-free error messages, validation set ≥ 10 items), `SpendTracker`, in-memory eval DB, `run_eval()` and `main()` with exit codes 0/1/2/130.
- `evals/datasets/judge_validation_v1.jsonl`: 22 drafted items (12 positive, 5 wrong/partial fixes, 5 unrelated corrections; 9 Claude-style, 8 Mistral-style, 5 neutral; all three levels).
- Tests: `tests/test_eval_matching.py` (26), `test_eval_judge.py` (32), `test_eval_scoring.py` (10), `test_eval_report.py` (9), `test_eval_runner.py` (41): 118 tests, all with fake providers.
- Docs: `evals/README.md` harness section (running, flags, cost, guardrails, matching, metrics, judge choice, judge validation + review-status table, reports) and layout; `README.md` intro, project tree, tests list, metrics link.

---

## Human Review Notes

### Changes Made
- [x] **Judge prompt clarified after the first smoke run.** The first run's judge agreement was 20/22 (90.9%). Both disagreements were wrong fixes that the judge called "not addressed", which would have turned wrong fixes into "missed error + false correction" and pinned correction accuracy at 100%. The prompt now says a wrong or partial fix of the same mistake still addresses it. The rerun agreed on 21/22 (95.5%). Because this change was made after seeing the validation items, the agreement figure is somewhat optimistic; `evals/README.md` says so.
- [x] **Spend cap shown with 4 decimals** in the CLI output and the reports (a $0.015 cap printed as "$0.01").
- [x] **Partial runs:** a conversation in progress when the cap (or Ctrl-C) stops the run is left out of the metrics, but its cost stays in the total spend. The prompt didn't say; the partial-run caveat in the report states it.
- [x] **Judge cache across models:** an identical (record, error, correction) pair from two models is judged once, so its judge cost is attributed to the first model. It's within "cache per run" as specified; noted here for readers of `judge_cost_usd`.
- [x] **22 validation items** instead of "~20".
- [x] The `sys.path` shim and the `__main__` guard are `# pragma: no cover`. The only uncovered line is the "≥ 999 conversations" guard in `run_eval()`.
- [x] Argparse argument errors exit with 2, the same code as a spend-cap stop. Documented in `evals/README.md` rather than overriding argparse.
- [x] **Methodology explainer added at the maintainer's request (after the full run).** `evals/METHODOLOGY.md` explains the scoring with worked examples: labeled span vs model span (same, wider, narrower), normalization, locating candidates, the fix checks including the multi-error and fallback cases, the judge's inputs, outputs and failure handling, how decisions become metrics, an end-to-end example, and known limits. Every matching example in it was run through `match_deterministic()` to confirm the documented outcome. It's linked from `evals/README.md` and the root `README.md` tree. Documentation only; no code changes.
- [x] **Progress output flushed (after the first full run).** The first full run froze on a Mistral call after the machine slept: the socket stayed open but no data arrived. Its log showed nothing because stdout was block-buffered when redirected. Ctrl-C wrote a partial report as designed (exit 130, $0.137 spent). `run_eval()`'s default `out` is now `print(..., flush=True)`, with a regression test. The underlying hang comes from the provider layer having no explicit request timeout, which is outside this issue's scope; it's tracked in **#267**.

### Quality Checks
- [x] Code follows existing patterns (fake providers via `LLMService(providers=...)`, strict Pydantic JSONL schemas, Google-style docstrings)
- [x] Tests pass at 80%+ coverage (`evals/` modules at 99–100%)
- [x] Documentation updated
- [x] All acceptance criteria met

### Issues Found
- **Smoke run** (`python3 -m evals.run_feedback_eval --limit 3 --max-spend-usd 1 --export-judge-sample 20`, reports written to the session scratchpad, **not committed**): completed, $0.0827 total. Mistral Large: recall 12/12, 0 false, grammar MAE 10.0, $0.0043 per conversation, p50 22.8 s. Sonnet 5.5: 11/12, 2 false, MAE 11.67, $0.0094, p50 6.7 s. Haiku 5.5: 10/12, 0 false, MAE 12.33, $0.0006, p50 5.2 s. All feedback was schema-valid on the first attempt. Checked by hand: Sonnet's two false corrections are real changes to correct French ("le jus" → "le jus d'orange"; "peux" → "pourrais"), the judge's paraphrase decisions were right, and the misses are real misses. Three conversations prove nothing about the models; this run only shows the pipeline works.
- **Judge-check rerun** after the prompt fix (`--models claude-haiku --ids fb-001`): $0.0315. **Total paid spend in this issue: $0.1142.**
- **For the maintainer's review:** jv-016 ("Si on aurait su" → "Si on aurait pu savoir") is the remaining disagreement. The drafted verdict says the correction addresses the error but fixes it wrongly; the judge says it doesn't address the tense error at all. Either reading is defensible.
- Mistral Large took 14–34 s per feedback call against 3–7 s for the Claude models. That's measured data, not a harness problem, but worth watching in the full run.
- **First full run** (`python3 -u -m evals.run_feedback_eval --export-judge-sample 50` under `caffeinate -i`, commit `d4521f5`, report `evals/results/feedback_eval_20261116-042618.*`, **not committed**; citing a run is #232's job): completed in 23 min, **$0.4258**. All 81 conversations were schema-valid on the first attempt, with no provider errors.

  | Model | Recall | Precision (false) | Correction accuracy | Grammar MAE | Cost / conversation | p50 / p95 latency |
  |---|---|---|---|---|---|---|
  | Mistral Large | 88.7% (63/71) | 88.7% (8) | 100% | 6.19 | $0.0044 | 26.0 / 36.2 s |
  | Claude Sonnet 5.5 | 95.8% (68/71) | 81.0% (16) | 100% | 9.59 | $0.0084 | 5.1 / 9.0 s |
  | Claude Haiku 5.5 | 87.3% (62/71) | 88.4% (8) | 98.4% | 12.63 | $0.0005 | 4.4 / 7.7 s |

  Judge agreement was 20/22 (90.9%); jv-014 flipped back from the rerun, so the judge isn't consistent across runs on that item. Every false correction and miss was checked by hand. False corrections are mostly stylistic rewrites of correct French; a few are real errors (Haiku "gentille" → "gentil"; Sonnet "corrected" the deliberate trap "je crains qu'on me licencie"). The misses are genuine. Total paid spend in this issue, including the interrupted run: **$0.6768**.

---

## Verification

- [x] All acceptance criteria from issue #231 are met
  - [x] Per-model recall, precision (false corrections), correction accuracy, grammar MAE, schema validity, cost per conversation, p50/p95 latency: in the JSON and the Markdown summary (`test_full_run_with_three_default_configs`, `test_markdown_sections_and_values`)
  - [x] Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5 are the default configurations (Opus 5.5 opt-in); all three ran in the smoke run
  - [x] Judge agreement measured on 22 items and reported (95.5% in the rerun)
  - [x] Dated JSON + Markdown under `evals/results/` (or `--output-dir`) with the total spend split by component
  - [x] `--limit` and a $5 default spend cap (`test_spend_cap_stops_the_run`, `test_spend_cap_during_judge_validation`), plus `--dry-run` and preflight checks
  - [x] Never in CI: `test_no_workflow_runs_the_harness`; the harness tests use fakes only
- [x] Tests pass with 80%+ coverage: `python3 -m pytest tests/ --cov ...`: 1069 passed, 1 xfailed, total 95.72%; `scripts/check_module_coverage.py`: PASS
- [x] Code follows project conventions
- [x] Documentation is updated (`evals/README.md`, `README.md`)
- [x] No breaking changes introduced (no app code, config, schema or provider-layer changes)
- [x] Real smoke run (`--limit 3`) completed and its reports reviewed
- [ ] Human review completed (maintainer, including the judge-validation verdicts)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
