# SPDD Analysis: French Feedback Rubric as an Agent Skill

**GitHub Issue**: #269
**Issue Title**: French feedback rubric as an Agent Skill
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/269
**Artifact ID**: FLC-065-202611162144
**Created**: 2026-11-16 21:44
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Package the French feedback rubric (error taxonomy, CEFR-aware severity, correction format, scoring anchors) as an Agent Skill in `.claude/skills/french-feedback-rubric/`, usable in Claude Code to review a transcript. Load the same rubric file into the app's feedback prompt so there is a single source of truth.
>
> > **Backlog item** (post-MVP, presentation-round stretch). Scope, design and acceptance criteria will be refined if and when this is selected for implementation.
>
> **Related:** #230 (labeled dataset and `evals/LABELING.md` error categories), #231 (eval harness), #232 (model-choice decision record)
>
> ## Acceptance criteria
> - [ ] `SKILL.md` with a clear trigger description, plus reference files for the taxonomy and examples
> - [ ] The app's feedback prompt reads the rubric from that file
> - [ ] An eval run (via the #231 harness) compares feedback with and without the rubric, and the result goes in the decision record
>
> ## Notes
> - The rubric should stay consistent with the error categories in `evals/LABELING.md`, so eval labels and model instructions use the same taxonomy.
> - This rubric is intended to become the study-coach agent's grading standard (#270).

**Dependencies:**

| Issue | State | Relevance |
|-------|-------|-----------|
| #230 (dataset, `evals/LABELING.md`) | Closed (PR #265) | Source of the 15-category taxonomy and the grammar-score bands |
| #231 (eval harness) | Closed (PR #266) | Runs the with/without comparison (AC3) |
| #232 (decision record) | Closed (PR #277, merged as `6206019`) | Created `docs/decisions/` and record 001; switched both feature defaults to Claude Sonnet 5.5. No longer blocking |
| #268 (MCP server) | Closed (PR #276) | No dependency. This branch was rebased onto `main` at `6206019`, which includes #268 and #232 |
| #270 (study-coach agent) | Open | Depends on this issue: it will grade with the same rubric |

### Decisions confirmed by the user (2026-11-16)

| Question | Decision |
|----------|----------|
| Where the canonical rubric lives | **Option 1: one file in the app codebase, `data/feedback_rubric.md`.** The app loads it from there. The skill in `.claude/skills/french-feedback-rubric/` points to that file rather than holding a copy. Duplicating the file (CI-checked), symlinking it, or generating the skill copy with a script were considered and rejected (see [Alternatives Considered](#alternatives-considered)) |
| How the with/without A/B is run | **App setting plus harness flag**: `FEEDBACK_RUBRIC` (bool, default `true`) in `config.py`; the harness gets `--rubric on\|off\|both` so one run compares both arms side by side. The setting doubles as a kill switch |
| Who runs the paid eval | **Claude runs it**: `--dry-run`, then a `--limit 3` smoke run, then the full run with `--max-spend-usd 3`. The harness reads keys from `.env`; Claude never reads or prints that file |
| Where the eval result goes, and sequencing | **Do #232 first.** This analysis is committed to `feature/issue-269-feedback-rubric-skill` now. Work then moves to #232 on its own branch; once #232's decision record exists, the prompt artifact and the implementation of #269 resume on this branch |

### Revision after #232 merged (2026-11-16)

#232 (PR #277) merged with no review changes. It made Claude Sonnet 5.5 the default for chat (effort `low`) and feedback (effort `medium`), created `docs/decisions/001-model-choice.md`, and committed the baseline run `evals/results/feedback_eval_20261116-042618.*`. Record 001 lists "#269's rubric A/B" as a revisit trigger for the feedback model. The user then confirmed these decisions, which **supersede** any conflicting text below:

| Question | Decision |
|----------|----------|
| Where the A/B result goes | **Always a new record, `docs/decisions/002-feedback-rubric.md`**, whatever the result. It's linked from 001 and listed in `docs/decisions/README.md`. If the Haiku switch happens, 002 supersedes 001's feedback choice and 001's status says so |
| Model switch inside #269 | **Yes**: if the Haiku switch rule below is met (and confirmed), this PR also changes the feedback default to `claude-haiku-5-5` (provider `anthropic`, effort `medium` unchanged) in `config.py`, `.env.example`, the tests and the docs. This issue is the authorization CLAUDE.md requires for changing a default model |
| Rubric default rule | **On unless Sonnet regresses** (thresholds below). Mistral and Haiku results are reported but don't decide the rubric default |
| Taxonomy reference in the skill | **Pointer page** `references/taxonomy.md`, naming `data/feedback_rubric.md` as canonical; a test checks the path |

**Pre-registered thresholds** (fixed before any eval call, applied mechanically; all comparisons within one `--rubric both` run over `feedback_v1`; "errors" means detected labeled errors out of 71):

1. **Rubric default.** `FEEDBACK_RUBRIC` stays `true` unless Sonnet+rubric, compared with Sonnet without the rubric, catches **≥ 3 fewer errors** OR has grammar MAE **≥ 2.0 higher**, AND shows no offsetting gain (**≥ 3 more errors** caught, or **≥ 4 fewer** false corrections). If it regresses by that rule, the default ships as `false`, and 002 says why.
2. **Haiku switch.** Feedback moves to Haiku 5.5 only if Haiku+rubric, compared with Sonnet+rubric in the same run, meets all of:
   - detected errors **≥ Sonnet+rubric's − 2**
   - grammar MAE **≤ Sonnet+rubric's + 1.0**, and **≤ 9.59** (Sonnet's MAE in the 001 baseline)
   - no-op corrections **≤ 1**
   - false corrections **≤ Sonnet+rubric's**
   - final schema validity **100%**

   If all are met, rerun only those two arms (`--models claude-sonnet,claude-haiku --rubric on`, about $0.25). Switch only if the rule holds again in the rerun. If the rubric default is `false` by rule 1, the Haiku rule compares the no-rubric arms instead, because that's what would ship.
3. Run-to-run variance is acknowledged: one full run per arm (plus the confirmation rerun for a switch). 002 reports the deltas against 001's baseline run as context, not as the comparison.

---

## Background

End-of-session feedback is produced by one system prompt, `FEEDBACK_PROMPT` (`services/llm/base.py:87`). It is 16 lines of French that define the JSON shape and say "Sois strict sur la grammaire, le vocabulaire et la fluidité" but give the model no definition of an error, no categories, no rule about span size or what not to correct, and no anchors for what a score of 70 or 90 means. Both providers send it verbatim: Claude as `system=` (`services/llm/anthropic_provider.py:102`), Mistral as the first `system` message (`services/llm/mistral_provider.py:89`).

The eval work in #230/#231 made the gap measurable. `evals/LABELING.md` defines what the labels mean: 15 error categories (12 grammatical, 3 vocabulary), span and correction rules, and six grammar-score bands on an absolute scale. The models are graded against those labels, but they never see those rules. The first full run (`evals/results/feedback_eval_20261116-042618.md`, untracked at the time of writing, 27 conversations × 3 models, $0.43) shows the effects:

| Model | Recall | Precision (false corrections) | False on clean | Grammar MAE |
|-------|--------|-------------------------------|----------------|-------------|
| mistral-large | 88.7% | 88.7% (8) | 6 | 6.19 |
| claude-sonnet | 95.8% | 81.0% (16) | 7 | 9.59 |
| claude-haiku | 87.3% | 88.4% (8) | 5 | 12.63 |

The weak points are the ones a rubric targets: false corrections (including on the three clean conversations), and grammar scores that disagree with the labels by 6–13 points on a 0–100 scale. These are mostly calibration problems, not detection problems.

The issue asks for the rubric to exist once and serve two consumers: the app's feedback prompt, and a Claude Code Agent Skill that a person (the maintainer, or later the #270 study-coach agent) can use to review a transcript against the same standard.

---

## Business Value

- **Better-calibrated feedback for learners**: explicit "don't correct correct French" rules and score anchors should cut false corrections and make grammar scores mean something consistent from session to session.
- **One grading standard**: the eval labels, the app's model instructions, the Claude Code skill and (in #270) the study-coach agent all use the same taxonomy, so "the model missed an `agreement` error" means the same thing everywhere.
- **Measured, not assumed**: the A/B run shows whether the rubric actually helps each model, and at what cost in input tokens, before it becomes the default.
- **A reusable review tool**: the maintainer can ask Claude Code to review any transcript (a real session, a candidate dataset record) with the project's rubric, which also helps when labeling a future `feedback_v2`.
- **Presentation-round material**: shows an Agent Skill, a prompt grounded in a versioned rubric, and an eval-backed prompt decision.

---

## Scope In

- [ ] **Rubric file** `data/feedback_rubric.md` (new), model-facing, in English, covering:
  - the error taxonomy: the same 15 category IDs as `ErrorCategory` (`evals/schema.py:39`), each with a definition, a wrong → right example, and whether it counts toward the grammar score (matching `GRAMMATICAL_CATEGORIES`, `evals/schema.py:61`)
  - what not to correct: correct-but-unusual French, accents that don't change the word, informal-but-correct typed constructions, assistant turns
  - CEFR-aware severity (see [Key Business Rules](#key-business-rules))
  - the correction format: verbatim `original`, smallest useful span, one error per correction, a short explanation naming the rule
  - scoring anchors: the grammar bands from LABELING.md, plus new anchors for vocabulary and fluency, and how `overall_score`, `focus_area` and `strengths` are chosen
- [ ] **Prompt composition**: the app's feedback system prompt becomes the existing French instructions plus the rubric text when `FEEDBACK_RUBRIC` is on. When it's off, the prompt is byte-identical to today's `FEEDBACK_PROMPT`.
- [ ] **Loader**: a small function in `services/llm/` that reads the rubric from a path in settings (`FEEDBACK_RUBRIC_FILE`, default `data/feedback_rubric.md`), resolved against the repo root the way `services/llm/pricing.py:68` resolves `LLM_PRICING_FILE`. It is cached, and a missing or empty file raises a clear error.
- [ ] **Settings**: `FEEDBACK_RUBRIC: bool = True` and `FEEDBACK_RUBRIC_FILE: str = "data/feedback_rubric.md"` in `config.py`, documented in `.env.example`.
- [ ] **Provider interface**: `LLMService.get_feedback()` (`services/llm/service.py:170`) passes the composed system prompt to `provider.feedback()`, so providers stop importing the `FEEDBACK_PROMPT` constant directly and the prompt follows the service's settings. The corrective retry uses the same system prompt.
- [ ] **Agent Skill** `.claude/skills/french-feedback-rubric/`:
  - `SKILL.md`: frontmatter `name` and a trigger `description` (reviewing or grading a French learner's text or transcript, or applying the app's feedback rubric); a body that tells Claude to read `data/feedback_rubric.md` and gives a review workflow (find the learner turns, infer or ask the level, list errors with category, severity and correction, score with the anchors, pick one focus area) and an output format for a person, with an option to emit `FeedbackResponse` JSON
  - `references/examples.md`: two or three worked reviews of short transcripts written for this purpose, not taken from the dataset
  - `references/taxonomy.md`: a short pointer page that sends the reader to the canonical taxonomy in `data/feedback_rubric.md`, to satisfy the AC's "reference files for the taxonomy" without a second copy. Whether to keep this stub or let SKILL.md point straight at the data file is an [open question](#requirement-ambiguities)
- [ ] **Eval harness**: `--rubric on|off|both` (default `on`, matching the app default). With `both`, each selected model runs twice under distinct keys (e.g. `claude-sonnet` and `claude-sonnet:no-rubric`). Reports record the rubric state per configuration and the rubric file's SHA-256. The a-priori cost estimate (`evals/run_feedback_eval.py:348`) uses the composed prompt length.
- [ ] **The A/B run**: three default models × both arms over `feedback_v1`, spend cap $3 (plus a two-arm confirmation rerun if the Haiku rule is met). The reports are committed under `evals/results/`.
- [ ] **Decision record 002** `docs/decisions/002-feedback-rubric.md`: the A/B result, the pre-registered thresholds and how each was applied, the rubric default, the feedback model decision, cost and latency impact, limitations and revisit triggers. Also: `docs/decisions/README.md` index row, and a link (plus a status update if superseded) in 001.
- [ ] **Conditional default switch** (only if the Haiku rule is met and confirmed): `FEEDBACK_MODEL` default → `claude-haiku-5-5` in `config.py`, `.env.example`, the config tests, README, VISION.md and the CLAUDE.md guardrail.
- [ ] **Tests** (80%+ on new and changed modules):
  - taxonomy consistency: category IDs and the grammatical/vocabulary split in the rubric match `ErrorCategory` and `GRAMMATICAL_CATEGORIES`
  - skill references: every repo path SKILL.md tells Claude to read exists; the frontmatter has `name` and `description`
  - no dataset leakage: no labeled `original` span from `feedback_v1.jsonl` appears verbatim in the rubric or in the skill examples
  - prompt composition: rubric on → base prompt plus rubric text; off → exactly today's prompt; missing or empty file → clear error
  - both providers send the prompt they are given, on the first attempt and on the retry
  - harness: `--rubric` parsing, config expansion for `both`, report fields
- [ ] **Docs**: README "Feedback Mode" section (rubric, `FEEDBACK_RUBRIC`, token cost), README project structure (`data/feedback_rubric.md`, `.claude/skills/french-feedback-rubric/`), `evals/README.md` (the `--rubric` flag), and a one-line pointer in `evals/LABELING.md` to the rubric as the model-facing version of the taxonomy.

## Scope Out

- [ ] **No change to the feedback JSON schema** (`schemas/session.py`, `FEEDBACK_JSON_SCHEMA` in `services/llm/base.py`). In particular, no `category` or `severity` field on corrections; the rubric shapes how the explanation is worded instead.
- [ ] **No difficulty level in the app's feedback request.** `Session.difficulty` exists (`models/session.py:16`), but `get_feedback()` doesn't receive it, and LABELING.md scores on an absolute scale because the model isn't told the level. Passing it would change the provider interface and the meaning of the eval labels. This could be a follow-up issue.
- [ ] **No restructuring of `evals/LABELING.md`.** It keeps its own definitions (it's the labeling contract for #230); only a pointer to the rubric is added. Deduplicating it is a possible follow-up, with the taxonomy test keeping them aligned in the meantime.
- [ ] **No change to the chat default or to Claude effort.** The feedback model default changes only under the pre-registered Haiku rule.
- [ ] **No prompt caching.** The rubric makes the system prompt long enough that caching could pay off, but enabling it is a separate change (README: "Prompt caching is not enabled").
- [ ] **No new dataset version** (`feedback_v2`) and no relabeling.
- [ ] **No #270 work** (study-coach agent). The loader is public so #270 can reuse it.
- [ ] **No Mistral Vibe equivalent of the skill.** Vibe can still read `data/feedback_rubric.md` directly.
- [ ] **No frontend changes.**

---

## Acceptance Criteria (ACs)

1. **AC1: Skill with trigger description and reference files**
   **Given** the repo is open in Claude Code
   **When** the user asks to review or grade a French learner transcript (or invokes `/french-feedback-rubric`)
   **Then** the `french-feedback-rubric` skill is listed with a description that makes that trigger clear, its body directs Claude to the canonical rubric (`data/feedback_rubric.md`) for the taxonomy, severity, correction format and scoring anchors, and `references/examples.md` provides worked reviews
   **And** a test confirms the frontmatter fields and that every path SKILL.md references exists.

2. **AC2: The app's feedback prompt reads the rubric from that file**
   **Given** `FEEDBACK_RUBRIC` is unset or `true`
   **When** `POST /sessions/{id}/feedback/` runs on either provider
   **Then** the system prompt sent is the base French instructions plus the contents of `data/feedback_rubric.md`, read from disk (not a copy in code), on the first attempt and on the corrective retry
   **And Given** `FEEDBACK_RUBRIC=false` **Then** the system prompt is exactly today's `FEEDBACK_PROMPT`
   **And Given** the rubric is enabled but the file is missing or empty **Then** a clear error names the path, rather than feedback silently running without the rubric.

3. **AC3: Eval comparison recorded in the decision record**
   **Given** the #231 harness with `--rubric both` and the three default models
   **When** the full run over `feedback_v1` completes within the $3 cap
   **Then** its JSON and Markdown reports are committed under `evals/results/`, show each model with and without the rubric (recall, precision, false corrections on clean conversations, correction accuracy, grammar MAE, cost, latency), and record the rubric file hash
   **And** `docs/decisions/002-feedback-rubric.md` states the result, links the report(s), quotes the pre-registered thresholds, and records the rubric default and the feedback model that follow from them. If the Haiku rule was met and confirmed, the feedback default is switched in this PR.

**Implicit AC (from the issue notes): taxonomy consistency**
**Given** the rubric and `evals/schema.py`
**When** CI runs
**Then** a test fails if the rubric's category IDs or grammatical/vocabulary split differ from `ErrorCategory` / `GRAMMATICAL_CATEGORIES`.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`FEEDBACK_PROMPT`** (`services/llm/base.py:87`): the French system prompt for feedback. Imported by both providers and by the harness cost estimate (`evals/run_feedback_eval.py:83`, `:350`), and asserted on by `tests/test_llm_providers.py:100,116,329,347` and `tests/test_llm_service.py:328`.
- **`LLMProvider.feedback()`** (`services/llm/base.py:195`): `feedback(messages, model, correction=None)`. Implemented by `AnthropicProvider.feedback()` (`anthropic_provider.py:88`) and `MistralProvider.feedback()` (`mistral_provider.py:76`), and by fake providers in the tests and harness tests.
- **`LLMService.get_feedback()`** (`services/llm/service.py:170`): routes by settings, calls `provider.feedback()` (`:199`), validates, retries once.
- **`build_provider()`** (`services/llm/service.py:78`): builds providers from `Settings`. The harness shares pre-built providers across services (`evals/run_feedback_eval.py:703`), so the prompt can't be fixed at provider construction time. It has to travel with the call.
- **`Settings`** (`config.py:22`): per-feature routing and Claude effort. `LLM_PRICING_FILE` is the model for a repo-relative data-file setting.
- **`_resolve()` / `load_price_document()`** (`services/llm/pricing.py:68`, `:75`): repo-relative path resolution plus `lru_cache` loading. This is the pattern for the rubric loader.
- **`ErrorCategory`, `GRAMMATICAL_CATEGORIES`** (`evals/schema.py:39`, `:61`): the 15 categories and the grammatical subset. These are the test oracle for the rubric's taxonomy.
- **`evals/LABELING.md`**: definitions, span rules, accent and spoken-form rules, grammar-score bands, clean-conversation rule (`grammar_score` ≥ 90).
- **Eval harness** (`evals/run_feedback_eval.py`): `EvalConfig`/`EVAL_CONFIGS` (`:103`), `parse_args()` (`:235`), `build_settings()` (`:324`), per-config `Settings` (`:497`), `_assemble_report()` (`:759`).
- **Project skills** (`.claude/skills/spdd-analysis/SKILL.md`, `.claude/skills/spdd-prompt/SKILL.md`): tracked in git, with YAML frontmatter (`name`, `description`, optional `argument-hint`). These are the house format.
- **`Session.difficulty`** (`models/session.py:16`): stored but not used by feedback (relevant to the CEFR-severity design).

### New Concepts Required

- **Feedback rubric** (`data/feedback_rubric.md`): the canonical, versioned grading standard, read by the app and the skill.
- **Rubric loader / prompt composer** (e.g. `services/llm/rubric.py`): `load_feedback_rubric(path)` (cached) and `build_feedback_system_prompt(settings)` → `str`.
- **`FEEDBACK_RUBRIC` / `FEEDBACK_RUBRIC_FILE` settings**.
- **`french-feedback-rubric` Agent Skill** (`.claude/skills/french-feedback-rubric/`).
- **Rubric arm in the harness**: an `EvalConfig` gains a `rubric: bool` field; `--rubric` expands the selected configs.

### Key Business Rules

- **One taxonomy.** The rubric's 15 category IDs and the grammatical/vocabulary split are exactly those of `evals/schema.py`. Vocabulary categories (`register`, `anglicism`, `lexical`) are corrected but don't lower `grammar_score`.
- **Grammar score is absolute.** The rubric's grammar bands are LABELING.md's bands. The score is not adjusted for the learner's level, because the labels aren't and the app doesn't send the level.
- **CEFR-aware severity drives priority, not the score scale.** Each error gets a severity:
  - *High*: it obscures the meaning, or it breaks a rule well below the learner's apparent level (e.g. article gender at B1+). These come first in the corrections and are the first candidates for `focus_area`.
  - *Medium*: a rule at about the learner's level.
  - *Low*: a structure above the learner's level, or a slip with no effect on meaning. Still corrected, with a gentler explanation.

  When the level isn't given (always, in the app), it is inferred from the learner's own turns. The rubric lists the typical CEFR level of each category's core structures (gender, articles and contractions around A1–A2; *passé composé* auxiliaries and participle agreement around A2–B1; subjunctive, *si* clauses and pronoun order around B1–B2). Within a grammar band, impact on meaning weighs more than frequency, as LABELING.md already says (*si* + conditional outweighs a missing plural *-s*).
- **Don't correct correct French.** Unusual-but-correct forms, informal-but-correct typed constructions (*c'est mieux de…*, questions without inversion) and accents that don't change the word are not errors. Written norms still apply to grammar (keep *ne*).
- **Correction format matches the schema and the matcher.** `original` is copied verbatim from a learner turn, as the smallest span that makes `corrected` a drop-in replacement, with one error per correction and only learner turns corrected. This is what `evals/matching.py` assumes, so following the rubric also makes eval matching more deterministic.
- **Explanations in the requested language.** The app's base prompt asks for French; the skill reviews in English unless asked otherwise. The rubric itself is in English, like LABELING.md.
- **No dataset content in model-facing text.** The rubric's examples and the skill's worked reviews must not reuse spans or conversations from `feedback_v1.jsonl`. Otherwise the eval would test memorized examples. LABELING.md's examples are partly taken from the dataset (e.g. *à le comptoir*, fb-001), so they are not copied into the rubric.
- **Off means off.** `FEEDBACK_RUBRIC=false` restores today's prompt exactly, so the "without" arm of the A/B is the current production behavior.

---

## Strategic Approach

### Solution Direction

1. **Write the rubric** (`data/feedback_rubric.md`): taxonomy table (stable, parseable layout: one row per category, ID in backticks, a grammar-score yes/no column), the don't-correct rules, CEFR severity, correction format, and scoring anchors. Fresh examples only.
2. **Add the loader and composer** (`services/llm/rubric.py`): read the file via a repo-relative setting, cache it, and fail loudly if it's missing or empty. Compose `FEEDBACK_PROMPT + separator + rubric` when enabled. Keep `FEEDBACK_PROMPT` as the unchanged base constant.
3. **Thread the prompt through the provider layer**: `get_feedback()` builds the system prompt from its settings and passes it to `provider.feedback(..., system_prompt=...)` on both attempts. Both providers use the argument instead of the constant. Update the fakes and assertions in the tests.
4. **Add the settings** to `config.py` and `.env.example`.
5. **Create the skill**: `SKILL.md` (trigger description, workflow, output format, pointer to `data/feedback_rubric.md`), `references/examples.md`, and the taxonomy pointer if kept.
6. **Extend the harness**: an `EvalConfig.rubric` field, `--rubric on|off|both`, expanded keys, per-config `Settings` with `FEEDBACK_RUBRIC`, cost estimate from the composed prompt, report fields (rubric state per config, rubric SHA-256). Add unit tests with fake providers.
7. **Tests**: taxonomy consistency, skill references, no dataset leakage, composition, providers, harness.
8. **Run the eval** (Claude, after #232 is merged): `--dry-run` → `--limit 3 --rubric both` → full `--rubric both --max-spend-usd 3`. Commit the reports.
9. **Record the result** in `docs/decisions/002-feedback-rubric.md` and the README, apply the pre-registered thresholds (rubric default; Haiku switch with a confirmation rerun), and, if the switch is triggered, change the feedback default.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Canonical rubric location | `data/` keeps app runtime content in the app codebase next to `llm_pricing.json` and the grammar JSON, but the skill isn't self-contained. Keeping it in `.claude/` makes the backend depend on a tool-config directory | **`data/feedback_rubric.md`** (user decision, option 1) |
| How the skill gets the rubric | A pointer means one copy, but the skill only works inside this repo. A copy is portable but drifts. A symlink breaks on Windows and in packaging | **Pointer** from SKILL.md to `data/feedback_rubric.md`, with a test that the path exists. If the skill ever needs to work outside the repo, move to a generated copy plus a CI check |
| Rubric format | Markdown is readable by people and models and diffs well. JSON is machine-checkable but would need a renderer for the prompt and the skill | **Markdown** with a strict taxonomy table that the consistency test parses |
| Rubric language | French would match the base prompt; English matches LABELING.md and the maintainer (B1 French) who reviews it. Mixed-language prompts work well for these models | **English rubric**; the French base prompt keeps "Évalue uniquement en français", so the output stays French |
| How the prompt reaches the provider | Fixing it at provider construction breaks the harness, which shares providers across configs. Passing it per call needs an interface change | **Per call**: `feedback(..., system_prompt: str)`, chosen by the service from its settings |
| On/off control | A setting gives a kill switch and a clean A/B. A harness-only override can't be turned off in the app. Comparing with an old run mixes commits and noise | **`FEEDBACK_RUBRIC` setting plus harness `--rubric`** (user decision) |
| When the file is read | Read once at import: fast, but tests can't swap files and import fails for unrelated code. Read on every call: slow and noisy | **Lazy, cached per path** (`lru_cache`), like the price table. Tests clear the cache |
| Missing file with the rubric on | A silent fallback to the base prompt hides a broken deploy and corrupts an eval arm | **Raise** with the resolved path. The feedback router doesn't catch it, so the request returns 500, which fits a deploy error (see [Edge Cases](#edge-cases)). The harness checks the file in its preflight |
| What goes into the prompt | The whole rubric versus a model-facing subset. The skill's workflow and worked examples are person-facing and would cost tokens | **The whole `data/feedback_rubric.md`**, which is written to be model-facing. Skill-only material stays in `.claude/skills/` |
| CEFR severity without the level | Passing `Session.difficulty` would make severity precise but breaks the absolute-score contract and the interface | **Infer the level from the learner's turns**; severity affects priority and in-band weighting only |
| Harness default for `--rubric` | `on` matches the app default; `both` doubles the cost of every run | **`on`**, so a plain run evaluates what the app ships. A/B runs pass `both` |

### Alternatives Considered

- **Canonical file in `.claude/skills/french-feedback-rubric/`, app reads it from there** (the issue's literal wording). Rejected by the user: app runtime content belongs in the app codebase.
- **Copy in both `data/` and the skill, with a CI equality check.** Gives a portable skill, but every edit must be made twice and CI goes red in between. Not worth it for a skill that only makes sense inside this repo.
- **Symlink from the skill to `data/`.** Rejected: Windows checkouts without `core.symlinks` get a text file containing the path, and skill or plugin packaging may not follow links. It fails silently on setups nobody tests.
- **`data/` canonical, script generates the skill copy, CI checks freshness.** The best option if portability is ever needed, but it adds a script and a "generated, don't edit" convention for no current benefit. Noted as the upgrade path.
- **Structured `data/feedback_rubric.json` rendered into the prompt and the skill.** Over-engineered for prose-heavy guidance. The taxonomy table in Markdown is parseable enough for the consistency test.
- **Pass the session's difficulty into the feedback prompt.** Rejected for this issue (see Scope Out); a candidate follow-up once the labels have a level-relative counterpart.
- **Add `category` / `severity` fields to `example_corrections`.** This would make the rubric's taxonomy visible in the UI and the eval, but it's a schema change across backend, frontend, stored feedback and the matcher. A follow-up if wanted.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Decision-record location (AC3) | Section of 001, or its own record? | **Resolved**: always a new record, 002 (see Revision after #232) |
| Default after the eval | What decides the rubric default now that Sonnet is the default feedback model? | **Resolved**: pre-registered rule 1, on unless Sonnet+rubric regresses (see Revision after #232) |
| "Reference files for the taxonomy" | Does the AC need a file inside the skill's `references/`? | **Resolved**: pointer page `references/taxonomy.md` |
| Vocabulary, fluency and overall anchors | LABELING.md only anchors `grammar_score`. Anchors for the other scores are new content with no labels to check them against | Write short band anchors for vocabulary and fluency, and define `overall_score` as a holistic judgment normally within a few points of the mean of the three. Flag them as unvalidated in the rubric header and the README |
| LABELING.md edits | The user wanted to approve any change to the #230 labeling contract | Only add a one-line pointer to the rubric. No definitions change |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Rubric file missing or empty, rubric on | Feedback would silently run with a different prompt; an eval arm would be mislabeled | Loader raises with the resolved path. The feedback router today maps only `FeedbackValidationError` / `LLMProviderError` to 502 (`routers/feedback.py:50–53`), so a missing file would become a 500. That's acceptable for a deploy error, but test and document it. The harness preflight checks the file exists before any call |
| `FEEDBACK_RUBRIC=false` | It must equal the A/B "without" arm and today's behavior | The composed prompt `==` `FEEDBACK_PROMPT`; regression test |
| Corrective retry | The retry must not drop the rubric | `system_prompt` is passed on both attempts; test on both providers |
| Rubric edited after a run | Old reports must stay interpretable | Reports record the rubric SHA-256, like the dataset hash |
| `--rubric both` with `--limit` / `--ids` | Both arms must see the same records | Records are selected once, then each arm runs on them; test |
| Spend cap with doubled arms | Cost doubles, plus about 3k more input tokens per call in the rubric arm | The a-priori estimate uses the composed prompt; `--dry-run` shows both arms; cap $3 (expected ≈ $1.1) |
| BOM or CRLF in the rubric file | Invisible characters in the prompt; hash differs across OSes | Read as UTF-8, strip a BOM, normalize line endings before composing and hashing |
| Someone edits a category name in the rubric | Labels and instructions diverge silently | The taxonomy test fails in CI |
| Dataset text copied into rubric examples | Inflates the eval | The leakage test fails if any labeled `original` from `feedback_v1.jsonl` appears verbatim in the rubric or the skill examples |
| Skill used outside this repo | The pointer path doesn't exist | SKILL.md says it's a project skill that needs the repo; documented limit |
| Skill invoked on an empty or non-French transcript | Poor output | The SKILL.md workflow says to ask for the transcript, and to report "no learner turns to review" rather than invent errors |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Rubric aligns models with Claude's labeling style** (the labels and the rubric are both drafted by a Claude model) | Gains in recall, precision and MAE may partly reflect matching the labeler's conventions rather than better feedback | Disclose it in the decision record and the report caveats, alongside the existing self-preference caveat in `evals/README.md`. Fresh examples only (leakage test). Keep the human review of the rubric |
| Longer prompt raises cost | About 3k more input tokens per call: roughly +$0.0015 per conversation on Mistral Large (+34%), +$0.006 on Sonnet 5.5 (+72%), +$0.0003 on Haiku 5.5 (+55%) at `data/llm_pricing.json` prices | Measured in the A/B and stated in the decision record. Prompt caching is a follow-up |
| Longer prompt raises latency | Mistral already takes about 26 s per call | Measured in the A/B (p50/p95 per arm) |
| Interface change breaks fakes | Test providers and harness fakes implement `feedback(messages, model, correction)` | Update every fake in the same change; grep for `def feedback(` under `tests/` and `evals/` |
| Small dataset | 27 conversations: small differences aren't meaningful | Report per difficulty level and state the limits (as #231 does); don't over-claim |
| Run-to-run variance | One run per arm can mislead, as the judge's jv-014 flip showed | Run both arms in the same invocation; note the variance; optionally repeat the smoke run |
| Rubric quality depends on a B1 reviewer | Advanced severity and register guidance carries less authority | Keep the advanced guidance to well-established rules, mark judgment calls, and record the review status in the rubric header |
| New module below 80% coverage | CI gate fails (`.coveragerc`, `scripts/check_module_coverage.py`) | Unit-test the loader and composer fully; harness additions are covered by the existing fake-provider tests |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | SKILL.md with trigger description, plus reference files for taxonomy and examples | Yes | Taxonomy lives in `data/` by user decision; skill has a pointer (form to confirm at the prompt stage) |
| AC2 | The app's feedback prompt reads the rubric from that file | Yes | "That file" is `data/feedback_rubric.md`, the file the skill also uses |
| AC3 | Eval with vs without the rubric, result in the decision record | Yes, **after #232** | Needs #232's `docs/decisions/` record; record placement (section vs 002) to confirm |
| Implicit | Rubric consistent with `evals/LABELING.md` categories | Yes | CI test against `evals/schema.py` |

**AC Coverage Summary**: 3 of 3 ACs (plus the implicit consistency AC) are addressable. AC3 can only be completed once #232 is merged.

**Implicit Requirements Not in ACs**:
- The "without" arm must reproduce today's production prompt exactly.
- No dataset content in model-facing text (eval integrity).
- Reports must identify the rubric version (hash).
- README and `.env.example` document the new settings and the cost impact.
- The loader must be reusable by #270.

---

## REASONS Canvas

### Requirements

- AC1: `.claude/skills/french-feedback-rubric/SKILL.md` with a clear trigger description; reference material for the taxonomy (via the canonical `data/feedback_rubric.md`) and worked examples (`references/examples.md`).
- AC2: the app's feedback system prompt includes the contents of `data/feedback_rubric.md`, read from disk, when `FEEDBACK_RUBRIC` is on (default), on both providers and on the retry. Off restores today's prompt exactly.
- AC3: a `--rubric both` harness run over `feedback_v1` with the three default models, reports committed, and the result written into `docs/decisions/002-feedback-rubric.md`, with the pre-registered thresholds applied.
- Implicit: taxonomy IDs and the grammatical split match `evals/schema.py`; enforced in CI.

### Examples

- **Taxonomy test**: the rubric table lists `gender … lexical` (15 IDs); `register`, `anglicism`, `lexical` are marked "no" for grammar score → test passes. Rename `tense_mood` to `tense` in the rubric → test fails naming the missing and extra IDs.
- **Composition**: `FEEDBACK_RUBRIC=true` → system prompt starts with today's `FEEDBACK_PROMPT` and contains the rubric's taxonomy heading. `FEEDBACK_RUBRIC=false` → system prompt `== FEEDBACK_PROMPT`. `FEEDBACK_RUBRIC_FILE=data/missing.md` → error naming `data/missing.md`.
- **Retry**: the first attempt returns invalid JSON; the second call's `system` (Claude) or first message (Mistral) is the same composed prompt.
- **Leakage**: if the rubric contained "à le comptoir" (a labeled `original` in fb-001), the test fails naming the record and span.
- **Harness**: `--models claude-haiku --rubric both --limit 3` → two configs, `claude-haiku` and `claude-haiku:no-rubric`, each over the same three records. The report lists `rubric: true/false` per config and `rubric_sha256`.
- **Skill review** (illustrative, fresh text): learner turn "Hier je suis allé au marché et j'ai acheté des pommes très bon." → one `agreement` error, `pommes très bon` → `pommes très bonnes`, severity medium at an inferred A2–B1 level, grammar score in the 85–94 band.

### Architecture

- Backend FastAPI; all LLM calls go through `services/llm/` (CLAUDE.md guardrail). The rubric loader lives in `services/llm/`, beside `pricing.py`, which already loads a repo-relative data file.
- Static app content lives under `data/` (grammar JSON, vocabulary decks, `llm_pricing.json`). The rubric joins it.
- Settings in `config.py` (`pydantic_settings`), documented in `.env.example`.
- Project skills in `.claude/skills/<name>/SKILL.md` with YAML frontmatter, tracked in git.
- The eval harness (`evals/`) runs through `LLMService`, with per-config `Settings` and shared providers. That's why the prompt must be chosen per call by the service.

### Standards

- PEP 8, type hints and docstrings on public functions, matching `services/llm/`.
- 80% coverage per module, enforced by `.coveragerc` (`fail_under = 80`) and `scripts/check_module_coverage.py`. New modules must not join the `ALLOWLIST`.
- Tests with pytest; fake providers, no network; harness tests never call real APIs (`tests/test_eval_runner.py` checks that no workflow runs the harness).
- README updated (Feedback Mode, project structure), `evals/README.md` updated (flag), `.env.example` updated.
- Commit `feat(#269): …`; SPDD artifacts committed with the code; PR closes #269.
- Never read or print `.env`; the paid run uses the harness's own key handling.

### Omissions

- No feedback schema change (no `category`/`severity` fields), no frontend change.
- No difficulty level passed to the feedback request.
- No LABELING.md restructuring beyond a pointer.
- No default provider, model or effort change; no prompt caching.
- No `feedback_v2`, no relabeling, no #270 work, no Vibe-specific skill.

### Notes

- `FEEDBACK_PROMPT` stays as the base constant so `FEEDBACK_RUBRIC=false` is trivially identical. Tests that assert on it need updating to assert on the composed prompt instead.
- The harness imports `FEEDBACK_PROMPT` only for its cost estimate (`evals/run_feedback_eval.py:350`); switch that to the composed prompt for the config's arm.
- The baseline report `evals/results/feedback_eval_20261116-042618.*` is untracked on this machine. #232 is expected to commit the run it cites. The A/B run here is a new, self-contained comparison and doesn't depend on that file.
- Session ids in the harness are `index * 1000 + ordinal` (`SESSION_STRIDE`); expanded arms just add indexes.
- Rubric size target: about 8–10k characters (about 3k tokens). Enough to define the categories and anchors, small enough to keep the cost increase modest.
- The study-coach agent (#270) should call the same loader rather than read the file itself.

### Solutions

- **Data-file loader**: mimic `services/llm/pricing.py` (`REPO_ROOT`, `_resolve()`, `@lru_cache` loader, a settings-named path).
- **Settings**: mimic `LLM_PRICING_FILE` and the optional Claude effort settings in `config.py`.
- **Skill format**: mimic `.claude/skills/spdd-analysis/SKILL.md` frontmatter.
- **Taxonomy oracle**: `evals.schema.ErrorCategory` and `GRAMMATICAL_CATEGORIES`.
- **Dataset access for the leakage test**: `evals.schema.load_dataset()`.
- **Harness tests**: extend the fake-provider patterns in `tests/test_eval_runner.py`.
- **Provider tests**: extend `tests/test_llm_providers.py` and `tests/test_llm_service.py`, which already capture the request kwargs.
