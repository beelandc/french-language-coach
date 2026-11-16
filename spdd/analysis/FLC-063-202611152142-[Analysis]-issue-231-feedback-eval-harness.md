# SPDD Analysis: Feedback Eval Harness (Accuracy, Cost, Latency)

**GitHub Issue**: #231
**Issue Title**: Feedback eval harness comparing models on accuracy, cost and latency
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/231
**Artifact ID**: FLC-063-202611152142
**Created**: 2026-11-15 21:42
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Add an eval harness that runs each configured provider and model over the labeled feedback dataset and reports accuracy, cost and latency side by side.
>
> **Depends on:** #228 (provider layer), #229 (schema-validated feedback), #230 (labeled dataset)
>
> ## Design
> - `evals/run_feedback_eval.py` runs each configured provider and model over `evals/datasets/feedback_v1.jsonl` and scores the output against the labels.
> - **Matching** a model's correction to a labeled error: a deterministic pass first (span and corrected-form match), then an LLM judge for paraphrases.
> - **Judge validation:** check the judge against hand judgment on a sample and report the agreement rate.
> - Cost and latency come from the provider layer's `llm_calls` records.
>
> ## Configurations
> At least three, all via the first-party APIs:
> - **Mistral Large** (`mistral-large-latest`): current baseline
> - **Claude Sonnet 5.5** (`claude-sonnet-5-5`): quality end
> - **Claude Haiku 5.5** (`claude-haiku-5-5`): low-cost end
> - *Optional ceiling run:* **Claude Opus 5.5** (`claude-opus-5-5`)
>
> ## Acceptance criteria
> - [ ] Reports per model: error recall, precision (false corrections), correction accuracy, grammar-score mean absolute error against the labels, schema-validity rate, cost per conversation, and p50/p95 latency
> - [ ] At least three configurations: Mistral Large, Claude Sonnet 5.5 and Claude Haiku 5.5
> - [ ] Judge agreement with hand labels is measured on at least 10 items and reported
> - [ ] Each run writes a dated JSON report and a Markdown report under `evals/results/`, including the run's total spend
> - [ ] A `--limit` flag and a spend cap prevent accidentally large runs
> - [ ] The harness is never part of required CI (it makes real, paid API calls)
>
> ## Notes
> - Choose the judge model in the SPDD analysis. Consider self-preference bias when the judge shares a provider with a model under test, and state the choice in the report.
> - Unit-test the scoring and matching logic with mocked model outputs (80% coverage applies to the harness code).

**Dependencies:** #228, #229 and #230 are all closed and merged to `main` (`550a9f4` is the #230 merge).

---

## Background

The "Model evaluation (Claude vs Mistral)" milestone asks whether the app should keep Mistral Large for end-of-session feedback or switch to a Claude model. The pieces are in place except the measurement itself:

- **#228** built the provider layer (`services/llm/`): `LLMService` routes the `feedback` feature to a provider and model from `Settings` (`services/llm/service.py:115-126`), times each provider call and writes one `llm_calls` row per call with tokens, latency and estimated cost (`services/llm/recorder.py:17`, `models/llm_call.py:11`). Prices come from `data/llm_pricing.json`, which already lists all four models in this issue.
- **#229** made feedback schema-validated in strict mode with exactly one corrective retry and no fallback (`services/llm/service.py:162-235`). Each failed attempt is recorded as an `error` row whose `error_message` starts with `invalid_json:` or `schema_mismatch:`; a double failure raises `FeedbackValidationError`.
- **#230** produced the ground truth: 27 labeled conversations (9 per level, 3 clean), 71 labeled errors with `original`/`corrected`/`alternatives`, and a labeled `grammar_score` (`evals/datasets/feedback_v1.jsonl`, loader `evals/schema.py:242` `load_dataset()`).

The app's metrics report (#236/#238) explicitly defers feedback **quality** to this harness (`README.md:537`, `:541`, `:551`), and live traffic is not a same-input comparison. The harness gives every model the same 27 conversations through the same code path the app uses, and scores what comes back. #232 then publishes the results and a decision record, linking to a run under `evals/results/`.

---

## Business Value

- Turns "which model should give feedback?" into a measured trade-off of quality, cost and latency on the app's own workload, instead of an assumption (`VISION.md`'s "Mistral is better at French" claim is tested, not repeated).
- Same-input comparison: every model sees identical conversations, which live traffic cannot provide.
- Reuses the production code path (`LLMService.get_feedback`, the same prompt, schema and retry), so results reflect what learners would actually see.
- Reproducible, dated reports (JSON + Markdown) give #232 a citable artifact.
- Guardrails (`--limit`, spend cap, never in CI) keep a paid tool safe to run.

---

## Scope In

- [ ] `evals/run_feedback_eval.py`: CLI entry point (`python3 -m evals.run_feedback_eval` and `python3 evals/run_feedback_eval.py`)
- [ ] A fixed set of model configurations: Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5 (default set), plus optional Claude Opus 5.5, selectable with a CLI flag
- [ ] Per configuration, call feedback through the provider layer (`LLMService.get_feedback`) for each dataset record, recording calls into an **isolated eval database** (not the app's `french_coach.db`)
- [ ] Deterministic matching of model corrections to labeled errors (span match and corrected-form match, with text normalization)
- [ ] LLM-judge matching for pairs the deterministic pass can't decide (paraphrases, different span boundaries), called through the provider layer
- [ ] A hand-judged judge-validation set (at least 10 items, target ~20) and a per-run judge agreement rate
- [ ] Metrics per model, overall and per difficulty level: error recall, precision / false-correction count, correction accuracy, grammar-score MAE, schema-validity rate (first attempt and after retry), cost per conversation, p50/p95 latency
- [ ] Run-level total spend (models under test + judge), broken down by component
- [ ] `--limit N` and `--max-spend-usd` (default cap) guardrails, plus a no-cost `--dry-run`
- [ ] Dated JSON and Markdown reports under `evals/results/`
- [ ] Unit tests with mocked providers for matching, scoring, judge parsing, spend cap, report writing and the CLI (80%+ per harness module)
- [ ] Documentation: `evals/README.md` (how to run, metric definitions, judge choice and limits), root `README.md` (project structure, tests list, pointer to the harness)

## Scope Out

- [ ] **Changing the feedback prompt, schema or retry logic.** The harness measures the app as it is. If the prompt's "example_corrections" wording caps recall, that's a finding for a follow-up issue, not a fix here.
- [ ] **Changing the app's default provider or model.** That's #232's decision record, and only via its own issue.
- [ ] **Publishing results in the README or a decision record** (#232).
- [ ] **Committing an actual full results run.** The harness writes reports; which run gets committed and cited is #232's job. (A small smoke run is discussed under ambiguities.)
- [ ] **Chat (role-play) evaluation.** Feedback only.
- [ ] **New providers** (OpenAI, Gemini, etc.) or new SDK dependencies. Judge and models under test use the existing Mistral and Anthropic providers.
- [ ] **Scoring vocabulary, fluency or overall scores, strengths or focus area.** The dataset has no labels for them (`evals/README.md`, "Partial labels").
- [ ] **Changes to `feedback_v1.jsonl`.** The dataset is input; label fixes go through the versioning rules in `evals/LABELING.md`.
- [ ] **Running the harness in any CI workflow**, required or optional.
- [ ] **Statistical significance testing.** 27 conversations; the report states the sample size and warns that small differences aren't meaningful, but doesn't compute confidence intervals.
- [ ] **Concurrency / parallel requests.** Sequential calls keep latency measurements clean and avoid rate limits.

---

## Acceptance Criteria (ACs)

1. **AC1: Per-model metrics**
   **Given** a run over the dataset with one or more configurations
   **When** the run finishes
   **Then** the report shows, for each model (overall and per difficulty level): error recall, precision with the false-correction count, correction accuracy, grammar-score MAE, schema-validity rate, cost per conversation, and p50/p95 latency

2. **AC2: Three required configurations**
   **Given** the harness's default configuration set
   **When** it runs with no `--models` flag
   **Then** it evaluates `mistral/mistral-large-latest`, `anthropic/claude-sonnet-5-5` and `anthropic/claude-haiku-5-5`; `anthropic/claude-opus-5-5` runs only when explicitly selected

3. **AC3: Judge agreement**
   **Given** a judge-validation set of at least 10 hand-judged items
   **When** a run executes (not in `--dry-run`, and unless `--skip-judge-validation`)
   **Then** the judge rules on every validation item and the report states the agreement rate with the hand verdicts, the number of items and the disagreements

4. **AC4: Dated reports with total spend**
   **Given** a run that made at least one call (completed or stopped by the spend cap)
   **When** it finishes
   **Then** `evals/results/feedback_eval_<YYYYMMDD-HHMMSS>.json` and `.md` exist, both carrying the run's total spend (models under test + judge + judge validation) and its status

5. **AC5: `--limit` and spend cap**
   **Given** `--limit N`
   **When** the run starts
   **Then** each configuration evaluates at most N conversations (chosen round-robin across difficulty levels)
   **Given** `--max-spend-usd X` (or the default cap)
   **When** cumulative recorded spend plus the projected cost of the next conversation would exceed X
   **Then** the harness makes no further calls, writes a partial report marked `stopped_spend_cap`, and exits non-zero

6. **AC6: Never part of required CI**
   **Given** the CI workflows in `.github/workflows/`
   **When** any of them runs
   **Then** none invokes the harness; the harness unit tests use fake providers and make no network calls

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`LLMService`** (`services/llm/service.py:105`): routes `feedback` to `(FEEDBACK_PROVIDER, FEEDBACK_MODEL)` from the `Settings` it's given; accepts pre-built `providers` for tests. `get_feedback(messages, db, session_id)` validates, retries once and records every attempt.
- **`Settings`** (`config.py:22`): per-feature provider/model routing; its validator requires an API key for both `CHAT_PROVIDER` and `FEEDBACK_PROVIDER`, so a per-config `Settings` must set both. Reads keys from `.env` (the harness never prints them).
- **`build_provider`** (`services/llm/service.py:89`): builds `MistralProvider` / `AnthropicProvider` from settings. Claude feedback uses `effort=medium` by default (`services/llm/anthropic_provider.py:24`), overridable with `CLAUDE_FEEDBACK_EFFORT`.
- **`LLMProvider.chat()`** (`services/llm/base.py:182`): system prompt + messages → text. The judge can use it without extending the provider interface.
- **`llm_calls` / `LLMCall`** (`models/llm_call.py:11`): `feature`, `provider`, `model`, `session_id`, tokens, `latency_ms`, `estimated_cost_usd`, `status`, `error_message`.
- **`estimate_cost_usd` / `load_price_table`** (`services/llm/pricing.py:96`, `:116`): returns `None` for unpriced models.
- **`percentile`** (`services/llm/metrics.py:194`): nearest-rank percentile used by the app's reports; reuse it so p50/p95 mean the same thing everywhere.
- **`FeedbackResponse` / `ExampleCorrection`** (`schemas/session.py:71`, `:79`): corrections have `original`, `corrected`, `explanation`, with **no message index**, so the harness has to locate a correction in the conversation itself.
- **`FeedbackEvalRecord`, `LabeledError`, `GRAMMATICAL_CATEGORIES`, `load_dataset`** (`evals/schema.py`): the ground truth and its loader.
- **`database.Base`** (`database.py:11`): metadata used to create the `llm_calls` table in the eval database.

### New Concepts Required

- **`EvalConfig`**: a named configuration (`key`, `provider`, `model`, optional Claude effort), e.g. `mistral-large`, `claude-sonnet`, `claude-haiku`, `claude-opus`.
- **Normalization**: NFC, casefold, curly→ASCII apostrophes and quotes, collapse whitespace, strip surrounding punctuation. Used only for matching; reports keep the raw text.
- **`CorrectionMatch`**: the outcome for one (labeled error, model correction) pair: `detected` (the correction addresses the error), `correct` (its fix is acceptable), `method` (`deterministic` or `judge`).
- **`ConversationScore`**: per record and config: matched labeled errors, false corrections, grammar-score error, validity outcome, cost, latency.
- **`ModelMetrics`**: aggregates overall and per difficulty.
- **Judge**: a prompt plus a strict JSON verdict parser (`{"addresses_error": bool, "correction_acceptable": bool, "reason": str}`), called through a dedicated `LLMService` instance (see design decisions).
- **Judge-validation set**: `evals/datasets/judge_validation_v1.jsonl`, items of (conversation excerpt, labeled error, candidate correction, hand verdict), validated by a Pydantic schema like `evals/schema.py`.
- **Spend tracker**: sums `estimated_cost_usd` from the eval database and projects the next conversation's cost.
- **Run report**: JSON (full detail, including raw model outputs per conversation) and Markdown (summary tables, per-difficulty tables, judge section, caveats).

### Key Business Rules

- **Same code path as the app:** feedback goes through `LLMService.get_feedback` with the app's prompt, strict validation and single retry. The harness doesn't re-implement provider calls.
- **All LLM calls go through `services/llm/`** (CLAUDE.md guardrail), including the judge. No SDK imports in `evals/`.
- **Isolated metrics:** eval calls are recorded in an eval-only SQLite database (in memory), never in the app's `french_coach.db`, so the app's metrics dashboard and comparison report (#236/#238) stay live-traffic-only.
- **Unpriced models can't run:** if a configuration's or the judge's model has no price entry, the spend cap can't be enforced, so preflight fails before any call.
- **Missing API keys fail fast:** preflight builds every configuration's `Settings` before the first call, so a missing key stops the run with no spend.
- **Spend cap is checked before each call batch:** before each conversation (and before each judge call), `spent + projected_next > cap` stops the run. The cap is soft by at most the difference between the projection and one actual call.
- **Clean conversations count:** any correction on a clean record is a false correction.
- **Labels are treated as exhaustive** (`evals/LABELING.md` rule 6): a correction that matches no labeled error counts as false, even if it improves style.
- **Failing doesn't help a model's score:** recall is computed over **all attempted conversations**, and a conversation with invalid feedback (or a provider error) contributes zero detections, so its labeled errors count as misses. Precision and grammar-score MAE are computed over conversations with valid feedback only, with that count shown next to them.

---

## Strategic Approach

### Solution Direction

1. **Configurations and preflight.** Define `EVAL_CONFIGS` (four entries; default set = the three required). For each selected config, build `Settings(FEEDBACK_PROVIDER=p, FEEDBACK_MODEL=m, CHAT_PROVIDER=p, CHAT_MODEL=m)` (keys come from `.env`), check price entries for every model including the judge, load the dataset, apply `--limit`. Print the plan (configs × conversations, judge, cap). `--dry-run` stops here with a rough upper-bound cost estimate and makes no calls.
2. **Isolated recording.** Create an in-memory async SQLite engine (`sqlite+aiosqlite:///:memory:`, `StaticPool`), `Base.metadata.create_all`, one `AsyncSession` for the run. Each (config, record) pair gets a unique `session_id`, so `llm_calls` rows group by conversation.
3. **Generation.** For each config, sequentially for each record: spend check → `LLMService(settings).get_feedback(messages, db, session_id)`. Catch `FeedbackValidationError` (both attempts invalid) and other provider exceptions, record the outcome, continue.
4. **Read back cost and latency** from the eval DB per `session_id`: cost = sum of `estimated_cost_usd` (attempts incl. retry); latency = sum of `latency_ms` across attempts (end-to-end time the learner waits); first-attempt validity = first row's status.
5. **Deterministic matching.** For each model correction: find the learner message(s) containing its normalized `original` (or that its `original` overlaps). For each labeled error in that message: **span match** if the normalized labeled `original` and model `original` overlap (one contains the other); **corrected-form match** if the normalized labeled `corrected` or any `alternative` appears in the normalized model `corrected` in place of the labeled span (applying the model's replacement to the message yields text containing the labeled correction). Span + corrected-form → `detected, correct, deterministic`.
6. **Judge pass** for undecided pairs only: (a) span-matched but corrected-form mismatch; (b) a model correction with no span match, paired with each labeled error in the same learner message (the model may have used a different span or a whole sentence). The judge sees the learner message, the labeled error (category, span, accepted corrections, note) and the model's correction + explanation, with **model identity hidden**. Verdict `addresses_error` → detected; `correction_acceptable` → correct. A correction matched to no labeled error after both passes is a false correction. Judge calls are cached per unique (record, labeled error, correction) triple within a run.
7. **Judge validation.** Run the judge over `judge_validation_v1.jsonl` and compare its verdicts with the hand verdicts: agreement rate on `addresses_error` and on `correction_acceptable`, with the disagreements listed.
8. **Aggregate and report.** Compute `ModelMetrics` overall and per difficulty. Write `evals/results/feedback_eval_<YYYYMMDD-HHMMSS>.{json,md}` with run metadata (UTC timestamp, git commit, dataset path + SHA-256, configs + efforts, judge, limit, cap, status), metrics, spend breakdown, judge agreement and caveats.

### Metric definitions

| Metric | Definition |
|--------|------------|
| Error recall | Detected labeled errors ÷ labeled errors, over all attempted conversations (invalid feedback = all its errors missed) |
| Precision | Matched model corrections ÷ all model corrections; false corrections = unmatched corrections (count shown, plus count on clean conversations) |
| Correction accuracy | Detected labeled errors whose fix is acceptable ÷ detected labeled errors |
| Grammar-score MAE | Mean \|model `grammar_score` − label\| over conversations with valid feedback (n shown) |
| Schema validity | First-attempt valid ÷ conversations, and final valid (after the one retry) ÷ conversations |
| Cost per conversation | Mean of per-conversation summed `estimated_cost_usd` (incl. retries), judge cost excluded and shown separately |
| p50/p95 latency | Nearest-rank percentiles (`services/llm/metrics.py:194`) of per-conversation summed feedback latency; per-call percentiles also in the JSON |

A single correction may match more than one labeled error (e.g. a whole corrected sentence). For recall, a labeled error is detected if any correction matches it; for precision, a correction is a true correction if it matches at least one labeled error.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Judge model** | **Claude Opus 5.5**: strongest, but shares a provider with two or three models under test, on top of a dataset whose conversations and labels were already drafted by a Claude model (`evals/README.md`, "Possible bias toward Claude"): two Claude-favoring biases stacked. **Mistral Large**: shares a provider with only the baseline; French is its strength; doesn't compound the dataset's Claude tilt; but it may favor the Mistral baseline's phrasing. **A third provider**: no shared provider at all, but needs a new provider + SDK (architectural change, out of scope). **Cross-judging** (each model judged by the other provider): no self-preference, but two judges with different strictness confound the comparison. | **Mistral Large (`mistral-large-latest`) as the default judge**, with `--judge-provider/--judge-model` to rerun with Opus 5.5 as a sensitivity check. Mitigations either way: the judge only decides pairs the deterministic pass can't; it's blind to which model produced a correction; the task is narrow (does X fix labeled error Y?); judge-validation agreement is reported, broken down by the provider that produced each item, so asymmetric errors would show. The report states the choice and this reasoning. **Confirmed by the user (2026-11-15).** |
| How the judge calls the LLM | Extend `LLMProvider` with a `judge()` method (clean, but changes the provider interface for an offline tool) vs reuse `chat()` with a judge system prompt and parse JSON from the text. | **Reuse `chat()` via a separate `LLMService` whose `CHAT_PROVIDER/CHAT_MODEL` are the judge.** Judge rows land in the eval DB as `feature="chat"`, so they never mix with `feature="feedback"` rows even when the judge model is also under test. Strict JSON parsing with one re-ask on malformed output; still malformed → the pair is marked `judge_error` and counted as not matched, with the count reported. |
| Where calls are recorded | App DB (pollutes the live-traffic metrics and #238's report) vs a per-run SQLite file vs in-memory. | **In-memory SQLite** per run; the JSON report keeps every call's row, so nothing is lost. |
| Latency unit | Per call (what `llm_calls` stores) vs per conversation (includes the retry, which is what a learner waits for). | **Per conversation** for the headline p50/p95; per-call p50/p95 in the JSON. |
| Invalid feedback in quality metrics | Exclude (a failing model looks better on recall) vs include as zero detections. | **Include in recall** as misses; precision and MAE over valid outputs only, with counts shown. |
| `--limit` selection | First N in file order (file is ordered by difficulty, so `--limit 5` would be beginner-only) vs round-robin by difficulty. | **Round-robin by difficulty, file order within a level.** Deterministic and representative for smoke runs. Plus `--ids fb-001,fb-010` for targeted runs. |
| Default spend cap | Too low blocks a full run; too high defeats the guardrail. Rough full-run estimate: ~27 × (2–4k input + up to ~4k output incl. thinking) → about $1 for Sonnet, under $0.10 for Haiku and Mistral, ~$2 with Opus, plus judge and validation calls (cents with Mistral). | **Default `--max-spend-usd 5.00`.** Projection for the next conversation = max of (an a-priori estimate from transcript length and a fixed output allowance, the largest per-conversation cost seen so far for that config). |
| Spend-cap exit behaviour | Raise and lose results vs stop and report. | **Stop, write the partial report with `status: stopped_spend_cap`, exit code 2.** Reports also written on Ctrl-C (`status: interrupted`) when possible. |
| Judge-validation items | Hand judgments need real candidate corrections; real model outputs only exist after a run. | **Commit ~20 drafted items** (paraphrased-correct, wrong fix, right span with wrong fix, different span same error, unrelated correction), drafted from plausible model phrasings in Mistral and Claude styles, **with verdicts for the maintainer to review before results are cited** (same model as #230: AI-drafted, human-reviewed). Add `--export-judge-sample N` to write judged pairs from a real run for adding to a v2 set. **Confirmed by the user (2026-11-15).** |
| Module layout | One big script vs small modules. | `evals/run_feedback_eval.py` (CLI + orchestration), `evals/matching.py` (normalization + deterministic matching, pure), `evals/judge.py` (prompt, parsing, validation-set schema and agreement), `evals/scoring.py` (per-conversation and aggregate metrics, pure), `evals/report.py` (JSON + Markdown). All under the existing `evals/` package; no new top-level directory. |
| Results in git | Ignore `evals/results/` vs track it. | **Track it** (#232 must link to a committed run). Add `evals/results/.gitkeep`; the harness never commits anything itself. |

### Alternatives Considered

- **Calling SDKs directly from `evals/`.** Rejected: violates the "all LLM calls through `services/llm/`" guardrail and would diverge from the app's prompt, schema-constrained output and retry.
- **Reading cost/latency from the app's `french_coach.db`.** Rejected: mixes eval runs into live-traffic metrics, and #238's report would then compare eval and live calls.
- **Judge every pair (no deterministic pass).** Rejected: the issue specifies deterministic-first; it also costs more and adds judge noise to clear-cut matches.
- **Token-overlap / fuzzy-ratio thresholds instead of a judge.** Rejected as the only mechanism: French corrections that differ by one morpheme (`essayé` vs `essayée`) are exactly what we need to score, and fuzzy ratios can't tell a right fix from a near-miss. Normalized substring matching handles the clear cases; the judge handles the rest.
- **Changing `FEEDBACK_PROMPT` to ask for all errors.** Rejected here (out of scope; it would also change the app). Flagged as a likely finding.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Judge model | The issue asks for the choice to be made here. | Mistral Large default, Opus 5.5 as a sensitivity rerun (see decisions). **Confirmed by the user.** |
| Source of "hand judgment" for judge validation | Who supplies the ≥10 hand verdicts, and on what items. | Claude drafts ~20 items with proposed verdicts; the maintainer reviews them (as with #230). The README states this. **Confirmed by the user.** |
| Should this issue include a real, paid run? | AC4 says "each run writes…"; #232 links to a run. A real run needs the maintainer's API keys and costs money. | Implementation is verified with mocked providers. Optionally, with the user's explicit go-ahead, a `--limit 3` smoke run of the three default configs (well under $0.50) to confirm the real providers work end-to-end; its report is **not** committed (the cited run belongs to #232). **Confirmed by the user: do the smoke run as part of verification.** |
| Recall when feedback is invalid | Not specified. | Count as misses (see decisions). |
| Which "precision" | "precision (false corrections)". | Report precision as a ratio **and** the false-correction count (overall and on clean conversations). |
| Correction accuracy denominator | Over all labeled errors or detected ones. | Over detected errors (so it measures fix quality separately from recall); the JSON also has "detected and correct ÷ all labeled". |
| Claude effort | The provider defaults Claude feedback to `medium`. | Use the app default (`medium`) so results reflect production; record effort per config in the report; allow `--claude-effort` override. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Model `original` isn't verbatim (different accents, curly apostrophe, extra punctuation, case) | Deterministic pass would miss real matches | Normalize both sides before matching |
| Model `original` is a whole sentence covering two labeled errors | One correction, two errors | Span overlap matches both; corrected-form checked per error; judge for any undecided |
| Model `original` not found in any learner message (paraphrased quote, or quotes the assistant) | Can't locate it | Judge it against all labeled errors in the conversation; if none match, false correction |
| Model "correction" where `corrected == original` (normalized) | Not a correction | Ignore it (count separately as `no_op_corrections`), not a false correction |
| Duplicate corrections in one response | Inflates false corrections | De-duplicate on normalized (original, corrected) |
| Labeled `corrected` appears in the model `corrected` but the model also changed other words wrongly | Substring match would pass a bad fix | Corrected-form match requires the model's corrected text, with the labeled span replaced by the labeled correction, to equal the model's corrected text after normalization — or the judge decides. (Exact rule to be pinned in the prompt artifact with test cases.) |
| Clean conversation (`fb-007`, `fb-016`, `fb-027`) | Any correction is false; recall undefined | Exclude from recall's denominator naturally (0 errors); count false corrections; report clean-conversation false corrections separately |
| `FeedbackValidationError` (both attempts invalid) | No output to score | Schema-invalid; labeled errors count as missed; cost/latency of both attempts still counted |
| Provider exception (network, refusal, rate limit) | Run shouldn't die on one call | Record as `provider_error` with message; continue; report error count. Abort a config after 3 consecutive provider errors (likely bad key/outage) to avoid burning spend |
| Unpriced model (`estimated_cost_usd` is `None`) | Spend cap can't work | Preflight refuses to run |
| Spend cap hit mid-run | Partial results | Partial report with `stopped_spend_cap`; configs not reached are listed as `not_run` |
| `--limit 0` or negative | Nonsense | argparse validation error |
| Judge returns malformed JSON | Can't score the pair | One re-ask; then `judge_error` (not matched), counted |
| Judge model is also a model under test (e.g. Opus judging Opus) | Self-preference | Allowed; report flags "judge shares a provider with: …" |
| `evals/results/` missing | Write fails | Create it |
| Two runs in the same second | Filename collision | Timestamp to the second plus config suffix not needed; on collision append `-2` |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Recall is capped by the prompt, which asks for *example* corrections, not all errors | Low recall for all models may reflect the prompt, not the model | Report it as a caveat in every report; report recall alongside "corrections returned per conversation"; follow-up issue if it dominates |
| Dataset's Claude bias (`evals/README.md`) | Claude models may match labels more often | Caveat in every report; `alternatives` field and judge for paraphrases; judge default is non-Claude |
| Judge self-preference | Skewed paraphrase decisions | Blind judge, narrow task, agreement broken down by source provider, sensitivity rerun flag |
| Small sample (27 conversations) | Differences may be noise | Report n everywhere; caveat that small differences aren't meaningful; per-difficulty tables show n |
| Importing `services.llm` creates the app `settings = Settings()` at import time, requiring `MISTRAL_API_KEY` | Harness or its tests fail to import without a key | CI sets a dummy key already (`pytest-tests.yml:74`); the harness builds its own `Settings` per config; tests construct `Settings` explicitly as `tests/test_llm_service.py:36` does |
| Coverage gate: `.coveragerc` measures `evals/*.py` (`source = .`) | New modules below 80% fail CI | Pure functions for matching/scoring; CLI orchestration tested with fake providers; no allowlist entries |
| Latency includes local overhead (DB writes) | Slight inflation | `latency_ms` is measured around the provider call only (`service.py:268`), so DB writes aren't included |
| Spend estimate ignores thinking tokens before the first call | First Claude conversation could exceed the projection | A-priori projection includes a generous output allowance (e.g. 8k tokens at the output price); after the first call the observed max is used |
| `anthropic`/`mistralai` SDKs reachable in tests by accident | Real calls in CI | Tests inject fake providers through `LLMService(providers=...)`; a test asserts no workflow file references `run_feedback_eval` |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Per-model metrics | Yes | Definitions above; per difficulty too |
| AC2 | Three configurations | Yes | Default set; Opus opt-in |
| AC3 | Judge agreement on ≥10 items | Yes | Depends on the hand-verdict decision (drafted items need maintainer review before results are cited) |
| AC4 | Dated JSON + Markdown with total spend | Yes | Spend broken down by model, judge, validation |
| AC5 | `--limit` and spend cap | Yes | Plus `--dry-run`, `--ids` |
| AC6 | Never in required CI | Yes | Unit tests only, fake providers; workflow-reference test |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Per-difficulty breakdown (requested by `evals/README.md`, "Reviewer proficiency")
- The report states the judge choice and the self-preference reasoning (issue notes)
- Reproducibility metadata: git commit, dataset hash, configs, efforts, prices' `checked_on`
- Eval calls must not pollute the app's live metrics
- 80% coverage on each new `evals/` module (CI per-module gate, #252)
- Docs: `evals/README.md` run instructions and metric definitions; root `README.md` structure/tests tables

---

## REASONS Canvas

### Requirements

From #231: per-model error recall, precision (false corrections), correction accuracy, grammar-score MAE, schema-validity rate, cost per conversation, p50/p95 latency; at least Mistral Large, Claude Sonnet 5.5 and Claude Haiku 5.5 (Opus 5.5 optional); judge agreement with hand labels on ≥10 items, reported; dated JSON + Markdown reports under `evals/results/` with total spend; `--limit` and a spend cap; never in required CI; matching and scoring unit-tested with mocked outputs at 80% coverage.

### Examples

- **Exact match:** `fb-001` labeled `une croissant → un croissant`; model `{"original": "une croissant", "corrected": "un croissant"}` → detected, correct, deterministic.
- **Normalization:** model `original: "Je ne ai pas de monnaie"` (wider span, same error), `corrected: "Je n'ai pas de monnaie"` → span overlap, labeled correction `Je n'ai pas` present in place → detected, correct, deterministic. Curly `n’ai` normalizes to `n'ai`.
- **Alternative:** `fb-002` `avec le train → en train`, alternative `par le train`; model corrects to `par le train` → detected, correct.
- **Wrong fix:** model `une croissant → une croissante` → span match, corrected-form mismatch → judge → `addresses_error: true, correction_acceptable: false` → detected, not correct.
- **Paraphrase / different span:** model `original: "je vais m'asseoir à le comptoir"`, `corrected: "je vais m'asseoir au comptoir"` → deterministic match (labeled span inside; labeled correction in place). Model `original: "à le"`, `corrected: "au"` → span overlap (model span inside labeled span), corrected-form via in-place substitution → match.
- **False correction:** on clean `fb-007`, any correction → false correction, precision drops; recall unaffected (0 labeled errors).
- **Trap:** advanced record with *je me suis rendu compte* (correct, per `notes`); a model "correcting" it to *rendue* → no labeled error → false correction.
- **Invalid output:** fake provider returns non-JSON twice → `FeedbackValidationError` → schema-invalid, its 3 labeled errors missed, both attempts' cost counted.
- **Grammar MAE:** labels 80, 80, 90; model scores 85, 70, 90 → MAE = (5 + 10 + 0) / 3 = 5.0.
- **Spend cap:** cap $0.01, fake priced calls at $0.004 each → stops before the third conversation, `status: stopped_spend_cap`, exit code 2, report written.
- **`--limit 4`:** picks fb-001 (beginner), fb-010 (intermediate), fb-019 (advanced), fb-002 (beginner).

### Architecture

- **Package:** existing `evals/` (approved in #230); new modules `evals/run_feedback_eval.py`, `evals/matching.py`, `evals/scoring.py`, `evals/judge.py`, `evals/report.py`; new data `evals/datasets/judge_validation_v1.jsonl`; output dir `evals/results/` (tracked, `.gitkeep`).
- **LLM access:** only `services.llm.LLMService` (feedback via `get_feedback`, judge via `get_chat_response` on a separate instance), with per-config `config.Settings`.
- **Recording:** async SQLAlchemy, in-memory `sqlite+aiosqlite` with `StaticPool`, `database.Base.metadata.create_all` (importing `models.llm_call` registers the table), one `AsyncSession`, `record_call` writes rows as in production.
- **Tests:** `tests/test_eval_matching.py`, `tests/test_eval_scoring.py`, `tests/test_eval_judge.py`, `tests/test_eval_report.py`, `tests/test_eval_runner.py` (pytest, pytest-asyncio, fake `LLMProvider` subclasses as in `tests/test_llm_service.py`).
- **No new dependencies, no schema changes to the app DB, no new top-level directory, no provider-interface changes.**

### Standards

- PEP 8, type hints, docstrings on public functions (Google style, as in `evals/schema.py` and `services/llm/`).
- 80% coverage per new module (`.coveragerc` `fail_under = 80`, `scripts/check_module_coverage.py`); no new `ALLOWLIST` entries.
- `python3` everywhere; partial test runs with `--cov-fail-under=0`.
- Never read or print `.env`; the harness reads keys only through `Settings`, and reports never contain keys.
- README updates: `evals/README.md` (usage, flags, metric definitions, judge choice, limits, result file format); root `README.md` (project structure tree, tests list, intro sentence pointing to the harness).
- Commit `feat(#231): …`; PR with `Closes #231`, AC checklist, test results, SPDD artifact paths.

### Omissions

- No prompt, schema or retry changes; no default provider/model changes.
- No publishing of results or decision record (#232); no committed full run.
- No chat evaluation; no vocabulary/fluency/overall/strengths/focus scoring.
- No new providers or SDKs; no CI job for the harness (not even optional).
- No statistical significance tests; no parallel requests.
- No changes to `feedback_v1.jsonl`.

### Notes

- `FEEDBACK_PROMPT` (`services/llm/base.py:87`) asks for `example_corrections`, so models may return a handful of examples rather than every error; recall must be read with that in mind (caveat in every report).
- `Settings` requires keys for **both** `CHAT_PROVIDER` and `FEEDBACK_PROVIDER` (`config.py:46`), so set both to the config's provider.
- `LLMService.get_feedback` records each attempt; `FeedbackValidationError.errors` holds the per-attempt errors; first-attempt validity = first `llm_calls` row for the `session_id` has `status == "success"`.
- Reuse `services/llm/metrics.py:194` `percentile` for nearest-rank p50/p95.
- `load_price_table()` is cached; preflight checks `(provider, model) in load_price_table()` for every config and the judge.
- The dataset is ordered by difficulty (fb-001–009 beginner, fb-010–018 intermediate, fb-019–027 advanced), which is why `--limit` round-robins.
- Price entries carry `checked_on`; include it in the report so readers know how current the cost figures are.
- Record the git commit (`git rev-parse HEAD`, best-effort) and the dataset SHA-256 for reproducibility.

### Solutions

- **Fake providers and settings in tests:** follow `tests/test_llm_service.py` (explicit `Settings` with dummy keys, `LLMService(settings, providers={...})`) and `tests/test_llm_provider_integration.py`.
- **Schema + JSONL loader for the validation set:** mirror `evals/schema.py` (`ConfigDict(extra="forbid", strict=True)`, `load_dataset` with line-numbered errors).
- **Markdown report rendering:** follow `services/llm/metrics.py:665` `render_report_markdown` (`_md_cell`, `_usd` helpers, caveats section).
- **Strict JSON parsing of model output:** follow `services/llm/service.py:52` `validate_feedback` (Pydantic `model_validate_json(strict=True)`) for the judge verdict.
- **In-memory async DB for tests:** follow `tests/conftest.py`.
