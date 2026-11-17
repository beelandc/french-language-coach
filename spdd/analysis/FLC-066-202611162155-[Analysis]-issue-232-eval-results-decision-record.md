# SPDD Analysis: Publish Eval Results and a Model-Choice Decision Record

**GitHub Issue**: #232
**Issue Title**: Publish eval results and a model-choice decision record
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/232
**Artifact ID**: FLC-066-202611162155
**Created**: 2026-11-16 21:55
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

> **Sequence note**: FLC-065 is taken by the #269 analysis on the unmerged `feature/issue-269-feedback-rubric-skill` branch, so this issue uses FLC-066 to avoid a collision once both are merged.

---

## Original Business Requirement

> ## Summary
>
> Publish the eval results in the README and record which model the app should use for each feature, at what cost and latency, and what would change that choice. Publish it whichever model wins, including if Mistral wins on French.
>
> **Depends on:** #231 (eval harness)
>
> ## Architectural changes approved by this issue
> - New top-level directory: `docs/` (starting with `docs/decisions/`)
>
> ## Design
> - A new **"Evaluation"** section in `README.md` with the results table.
> - A short decision record, `docs/decisions/001-model-choice.md`: the model chosen for chat and for feedback, its cost and latency, the trade-off, and what evidence would change the decision.
>
> ## Acceptance criteria
> - [ ] The results table links to the run (under `evals/results/`) that produced it
> - [ ] The decision record names a model per feature (chat, feedback) with its trade-off in one or two sentences
> - [ ] Limitations are stated: dataset size, single labeler, and judge agreement
> - [ ] The README's "Why Mistral" section is reconciled with the results, updated or qualified as the data supports
>
> ## Notes
> - Docs-only. Follow-up work (routing models by workload from config) can build on this decision record.

**Dependencies:**

| Issue | State | Relevance |
|-------|-------|-----------|
| #231 (eval harness) | Closed (PR #266) | Produced the run this issue publishes |
| #230 (dataset) | Closed (PR #265) | The ground truth behind the run |
| #228 (provider layer) | Closed | Per-feature `CHAT_PROVIDER` / `FEEDBACK_PROVIDER` routing that makes a default change a config change |
| #269 (feedback rubric) | Open, paused | Its AC3 writes the rubric A/B into this decision record, so it resumes after this issue merges |
| #275 (content routers without an API key) | Open | Related: the MCP server currently needs the default provider's key, which this issue changes (see Edge Cases) |

### Decisions confirmed by the user (2026-11-16)

| Question | Decision |
|----------|----------|
| Feedback model | **Claude Sonnet 5.5** (`anthropic` / `claude-sonnet-5-5`, effort `medium`) |
| Chat model | **Claude Sonnet 5.5** (`anthropic` / `claude-sonnet-5-5`, effort `low`), chosen on latency, with chat quality explicitly **not measured** |
| Config defaults | **Change the defaults in this PR**: `CHAT_*` and `FEEDBACK_*` default to Anthropic / `claude-sonnet-5-5`. This deliberately widens the issue's "Docs-only" note and is the GitHub-issue authorization CLAUDE.md requires for changing the default provider and model |
| Which run to cite | **Commit and cite the existing full run** `evals/results/feedback_eval_20261116-042618.{json,md}` (plus its `_judge_sample.jsonl`). No new spend. The interrupted run `feedback_eval_20261116-033254.*` stays uncommitted |
| "Why Mistral" section | **Rename to "Model choice"**: "The case for Mistral" (references kept as attributed general benchmarks), then "What this app's eval found", then a link to the record |
| False-correction characterization | **Include, flagged as qualitative**: a short paragraph plus a table of about 5 examples across all three models, labeled as Claude Code's reading, reviewed by the maintainer |
| Extra actions | **All approved**: comment on #232 recording the scope change; create a follow-up issue for a chat quality eval; create a follow-up issue to update `.vibe/instructions.md`; fix the `feedback_v1` review date in `evals/README.md` from "1/15/26" to "11/15/26" |
| Review pause | **Implement straight through to the PR** after the prompt artifact; stop at the PR for human review |

---

## Background

The milestone "Model evaluation (Claude vs Mistral)" set out to test the README's claim that Mistral is the better choice for a French app, using the app's own feedback workload rather than vendor benchmarks. #228 added per-feature provider routing, #229 strict feedback validation, #230 a 27-conversation hand-labeled dataset, and #231 a harness that scores each model on it. This issue publishes the result and acts on it.

### The cited run

`evals/results/feedback_eval_20261116-042618.md`: status `completed`, 27 of 27 conversations per model, $0.4258 total, judge `mistral/mistral-large-latest` with 90.9% agreement on 22 validation items.

| Model | Recall | Precision (false) | False on clean | Correction acc. | Grammar MAE | No-op corrections | Cost / conv. | p50 / p95 latency |
|-------|--------|-------------------|----------------|-----------------|-------------|-------------------|--------------|-------------------|
| Mistral Large | 88.7% (63/71) | 88.7% (8) | 6 | 100.0% | 6.19 | 1 | $0.004373 | 25,968 / 36,195 ms |
| Claude Sonnet 5.5 (medium) | 95.8% (68/71) | 81.0% (16) | 7 | 100.0% | 9.59 | 1 | $0.008381 | 5,143 / 8,980 ms |
| Claude Haiku 5.5 (medium) | 87.3% (62/71) | 88.4% (8) | 5 | 98.4% | 12.63 | 8 | $0.000546 | 4,386 / 7,736 ms |

By difficulty, Sonnet's recall is the highest at every level (100% / 95.7% / 91.7%). Its grammar MAE is worst at beginner level (14.44, against 9.44 for Mistral).

**What the "false corrections" are.** Reading the 32 false corrections in the JSON report, nearly all of them, from all three models, are style or register suggestions on French that was already correct, not wrong fixes. For example, Mistral's `Où sont les toilettes → Où se trouvent les toilettes`, Sonnet's `j'ai raté ma correspondance → j'ai loupé ma correspondance` and Haiku's `Le musée ferme à quelle heure ? → À quelle heure le musée ferme-t-il ?`. A few are actually doubtful, such as Haiku's `vous êtes très gentille → vous êtes très gentil` (the addressee's gender isn't known). So Sonnet's lower precision mostly means more unrequested style advice, which matters less to a learner than a missed error or a wrong fix. This is Claude's reading of the report and should be checked by the maintainer before it goes into the record.

**Provenance.** The run's `git_commit` is `d4521f5`, which exists only on the #231 feature branch (`feature/issue-231-feedback-eval-harness`, local and remote), because PR #266 was squash-merged as `be4efaf`. The only code difference between `d4521f5` and `main` in `services/`, `evals/`, `config.py` and `schemas/` is a `print(..., flush=True)` change in `evals/run_feedback_eval.py`, plus docs (`evals/METHODOLOGY.md`, `evals/README.md`). The run is therefore representative of `main`, and the record should say so, because the commit becomes unreachable if that branch is deleted.

### Chat evidence

There is no chat quality eval. The only chat data is the maintainer's local manual testing in `french_coach.db` `llm_calls` (2026-11-14): Mistral Large averaged 9,042 ms over 9 successful chat calls ($0.000794 per call), and Claude Sonnet 5.5 averaged 1,860 ms over 5 ($0.00189 per call). This is anecdotal, and the record must present it as such.

### Current state of the defaults

`config.py:30–33` defaults both features to `mistral` / `mistral-large-latest`. The key validator (`config.py:45–59`) requires the key of every configured provider, so with Claude defaults `ANTHROPIC_API_KEY` becomes required and `MISTRAL_API_KEY` optional (the eval judge still uses Mistral by default). The README, VISION.md, CLAUDE.md, `.env.example` and the CI test environment all assume the Mistral default today.

---

## Business Value

- **Honest model selection**: the project's stated purpose includes being "a testbed for … model selection" (VISION.md:10). Publishing the result, including the parts that don't flatter either vendor, is the payoff of the milestone.
- **Better learner experience**: the end-of-session wait drops from a p50 of about 26 s to about 5 s, and feedback catches more of the learner's errors (95.8% vs 88.7% recall on the dataset).
- **Traceable decision**: the record says what would change the choice, so #269's rubric A/B, a chat eval, or a price change can revisit it against stated criteria.
- **Accurate docs**: removes unqualified "Why Mistral" claims that the app's own data doesn't support.

---

## Scope In

- [ ] **Decision record** `docs/decisions/001-model-choice.md` (new `docs/decisions/` directory, approved by the issue): status, date, context, the decision per feature (chat and feedback: Claude Sonnet 5.5, with effort), cost and latency per feature, the trade-off in one or two sentences each, the evidence table linked to the run, the false-correction characterization, limitations, and what would change the decision.
- [ ] **Short `docs/decisions/README.md`** index (one line per record, and the record format) so later records (e.g. a possible #269 entry) have a home. Optional; see the [open questions](#requirement-ambiguities).
- [ ] **Commit the cited run**: `evals/results/feedback_eval_20261116-042618.json`, `.md` and `_judge_sample.jsonl`.
- [ ] **README "Evaluation" section**: the results table (overall, plus a pointer to the per-difficulty table in the report), a link to the run's Markdown and JSON, the decision in brief with a link to the record, and the limitations.
- [ ] **README "Why Mistral" reconciled**: rewritten or qualified as the data supports (see [Key Design Decisions](#key-design-decisions)). It keeps the references as background on Mistral's general French benchmarks, and states what this app's eval found: Mistral Large has the best-calibrated grammar scores and good precision, no detection advantage on this dataset, and about 5× the latency.
- [ ] **Default change** (user decision): `config.py` defaults for `CHAT_PROVIDER`/`CHAT_MODEL` and `FEEDBACK_PROVIDER`/`FEEDBACK_MODEL` become `anthropic` / `claude-sonnet-5-5`; the module docstring updated; `services/llm/__init__.py` docstring if it states the defaults.
- [ ] **`.env.example`**: the provider/model lines and key comments updated (Anthropic key required by default, Mistral key needed only for Mistral features or the eval judge).
- [ ] **CI**: add `ANTHROPIC_API_KEY: dummy_test_key` to the pytest job env (`.github/workflows/pytest-tests.yml:73–74`), because `settings = Settings()` at import (`config.py:62`) would otherwise fail with the new defaults.
- [ ] **Tests**: update `tests/test_llm_config.py` (`TestDefaults`, `:33–55`) to assert the new defaults and that the default config requires `ANTHROPIC_API_KEY` (and not `MISTRAL_API_KEY`). Fix any other test that relies on the implicit Mistral default (candidates: `tests/test_llm_service.py`, `tests/test_eval_runner.py`, `tests/test_eval_judge.py`, `tests/test_llm_metrics.py`, `tests/test_metrics_router.py`, `tests/test_llm_provider_integration.py`). The full suite and the coverage gates must pass.
- [ ] **Docs that state the default**, updated for accuracy:
  - README: intro (line 5, which also says results "haven't been published yet"), Setup step 5 and the config table (`:116–134`), Tech Stack (`:184`), LLM Integration defaults (`:503`), Data Flow (`:472–473`), the metrics walkthrough (`:565`), the MCP server key note (`:605`, `:617`, `:638`, `:652`, which names `MISTRAL_API_KEY` as the default provider's key), Limitations (`:849`)
  - VISION.md: tagline (`:3`), the "Why Mistral" paragraph that calls the eval "planned" (`:33–42`), and the model lines (`:120`, `:188`). Factual updates only
  - CLAUDE.md guardrail (`:17`): the default provider and model statement. This is in the Claude-specific section, so editing it here is allowed
- [ ] **Record the scope change on #232**: a comment on the issue saying the defaults change was approved by the maintainer and is part of this PR. Proposed at the prompt stage; posting it is outward-facing.

## Scope Out

- [ ] **No new eval run** and no chat eval. Chat quality is unmeasured, and the record says so. A chat eval is a candidate follow-up issue.
- [ ] **No change to Claude effort defaults** (chat `low`, feedback `medium`, `services/llm/anthropic_provider.py:24`), which are what the eval ran with.
- [ ] **No change to the eval harness defaults**: the judge stays Mistral Large (the bias rationale in `evals/README.md` still holds), and the default eval model set is unchanged.
- [ ] **No change to the metrics report's default baseline** (`mistral:mistral-large-latest`, README `:431`, `:559`). It's a comparison anchor, not the app default; changing it is a separate decision.
- [ ] **No edit to `.vibe/instructions.md`** (it says "Mistral API" at `:91`). CLAUDE.md requires shared-instruction edits to go in their own issue, so this is a candidate follow-up.
- [ ] **No routing by workload** (the issue's follow-up note), no prompt caching, no rubric (#269).
- [ ] **No frontend changes.** The `LLMMetrics` fixtures that mention Mistral are test data.
- [ ] **No change to stored data**: existing sessions and `llm_calls` rows keep their providers.
- [ ] **No fix for #275** (the MCP server needing an LLM key). Only the docs that name the key change.

---

## Acceptance Criteria (ACs)

1. **AC1: Results table links to its run**
   **Given** the README's new "Evaluation" section
   **When** a reader views the results table
   **Then** it links to `evals/results/feedback_eval_20261116-042618.md` (and the JSON), the run files are committed, and the table's numbers match the report exactly.

2. **AC2: A model per feature, with its trade-off**
   **Given** `docs/decisions/001-model-choice.md`
   **When** a reader looks up chat and feedback
   **Then** each names Claude Sonnet 5.5 (with effort) and states its trade-off in one or two sentences. Feedback: highest recall and about 5× faster than Mistral Large at about twice the cost, with more unrequested style suggestions and looser grammar-score calibration. Chat: chosen on latency (anecdotal), quality not measured
   **And** it gives cost and latency per feature and the evidence that would change each choice.

3. **AC3: Limitations stated**
   **Given** the decision record and the README Evaluation section
   **When** a reader looks for caveats
   **Then** both state at least: the dataset size (27 synthetic conversations, 71 labeled errors), the single drafter and single B1 reviewer (and the Claude-drafted-labels bias), the judge agreement (90.9% on 22 Claude-drafted items still pending human review), a single run per model, and that chat wasn't evaluated.

4. **AC4: "Why Mistral" reconciled**
   **Given** the README's "Why Mistral" section
   **When** a reader compares it with the Evaluation section
   **Then** no claim contradicts the data: general benchmark claims are kept as attributed background, qualified by this app's result, and the section explains why the defaults are now Claude.

**Added by the user's decision, AC5: defaults switched consistently**
**Given** a fresh checkout with `ANTHROPIC_API_KEY` set and no provider variables
**When** the app starts and a session runs
**Then** chat and feedback use `anthropic` / `claude-sonnet-5-5`; without `ANTHROPIC_API_KEY` startup fails with the existing clear validator message
**And** `.env.example`, the README, VISION.md and CLAUDE.md describe the new defaults, and CI passes.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`Settings`** (`config.py:22`): per-feature provider and model defaults (`:30–33`), optional Claude effort (`:37–38`), and `check_provider_keys` (`:45–59`), which requires each configured provider's key and treats an empty string as missing. A module-level `settings = Settings()` (`:62`) runs at import.
- **`DEFAULT_EFFORT`** (`services/llm/anthropic_provider.py:24`): chat `low`, feedback `medium`, the settings the eval measured.
- **Eval reports** (`evals/report.py`): JSON with `git_commit`, dataset SHA-256, prices, spend, judge validation, per-model metrics and conversations; Markdown with the same tables plus caveats.
- **`evals/README.md`**: harness docs, dataset limits, judge rationale, and review status tables (`feedback_v1` reviewed by CB; `judge_validation_v1` **Pending**).
- **README sections**: "LLM Integration" (`:494`), "Why Mistral" (`:741`) with five external references, "Limitations" (`:845`).
- **`tests/test_llm_config.py`**: `TestDefaults` asserts today's Mistral defaults and that the default config requires `MISTRAL_API_KEY`.
- **CI pytest job** (`.github/workflows/pytest-tests.yml:72–76`): sets only `MISTRAL_API_KEY: dummy_test_key`.
- **Cypress job** (`.github/workflows/cypress-tests.yml`): runs against the Vite dev server only, with no backend, so it is unaffected by the key change.
- **Local `llm_calls`** (`french_coach.db`): the anecdotal chat latency and cost figures. Not committed (it's the dev database).

### New Concepts Required

- **Decision record format** (`docs/decisions/NNN-title.md`): a lightweight ADR with Status, Date, Context, Decision, Evidence, Consequences/Trade-offs, Limitations, and Revisit when. 001 is the first; #269 may add to it or add 002.
- **README "Evaluation" section**: the public summary of model-eval results, updated by future runs.

### Key Business Rules

- **Publish whichever model wins.** The record reports where Mistral Large does better (grammar-score calibration, precision equal to Haiku's and above Sonnet's, lower cost than Sonnet) as plainly as where Sonnet does.
- **Every number traces to a committed run.** Table values are copied from `feedback_eval_20261116-042618.md`, which is committed in the same PR. Chat figures are labeled anecdotal, with their source and sample size.
- **Quality claims stay within the evidence.** Chat quality is not claimed. "Small differences aren't meaningful" (27 conversations) is stated, and the conclusion rests on differences large enough to survive that: the latency (5×) and the recall gap (7 points, 5 more errors caught out of 71), not on precision decimals.
- **Defaults need explicit authorization.** CLAUDE.md:17 allows changing the default provider and model only when a GitHub issue asks. The user's decision on this issue is that authorization, and it's recorded on the issue and in the PR.
- **Shared agent instructions change only in their own issue.** `.vibe/instructions.md` isn't edited here.

---

## Strategic Approach

### Solution Direction

1. **Commit the cited run's three files** under `evals/results/`.
2. **Write `docs/decisions/001-model-choice.md`** from the report: decision per feature, trade-offs, cost and latency, evidence table (overall plus per-difficulty recall and MAE), false-correction characterization, provenance note (`d4521f5`), limitations, revisit triggers.
3. **Add the README "Evaluation" section**, placed before "Why Mistral" (near "LLM Integration"), with the table, links, decision summary and limitations.
4. **Reconcile "Why Mistral"**: rename and rewrite it as described in Key Design Decisions.
5. **Switch the defaults**: `config.py`, `.env.example`, CI env, tests.
6. **Sweep the docs that state the default** (README, VISION.md, CLAUDE.md), with factual edits only.
7. **Verify**: the full pytest suite with coverage and the per-module check; check every number in the README and record against the report; preview the Markdown rendering.
8. **Close the loop**: prompt artifact sections, PR with `Closes #232`, plus the issue comment on the scope change and drafts of the follow-up issues (chat eval; `.vibe/instructions.md` update) for the user to approve.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Feedback model | Sonnet: best recall and fast, but about 2× the cost of Mistral, more style suggestions, worse MAE. Mistral: best calibration, 26 s wait. Haiku: cheapest, but no-op corrections and the worst MAE | **Claude Sonnet 5.5, effort medium** (user decision) |
| Chat model | No quality data. Sonnet is faster in anecdotal local use (1.9 s vs 9.0 s); Mistral's French-quality reputation is untested here | **Claude Sonnet 5.5, effort low** (user decision), with the missing quality evidence stated |
| Defaults | Docs-only keeps the PR small but leaves the app contradicting its own record. Switching widens the PR to config, CI, tests and docs | **Switch in this PR** (user decision) |
| Cited run | Existing run: no spend, but its commit is only on the #231 branch. Fresh run: reachable commit, about $0.45 | **Existing run** (user decision), with a provenance note in the record. #269's A/B adds a second baseline sample later |
| "Why Mistral" | Delete: loses useful context and the project history. Leave: contradicts the data and the new defaults. Rename and qualify: keeps the references, tells the story | **Rename to "Model choice"** (the link check found no in-repo `#why-mistral` anchors). Keep a "The case for Mistral" paragraph with the references as attributed general benchmarks, then "What this app's eval found", then a pointer to the record. To confirm at the prompt stage |
| Where the decision rationale lives | The README gets long; a record alone is easy to miss | **Record holds the rationale; the README holds the table, a 2–3 sentence summary and links** |
| Number formatting | Re-deriving numbers risks drift | **Copy values verbatim from the Markdown report**, rounded only where the report rounds |
| False-correction characterization | Drawn from Claude's reading of 32 corrections; could be biased toward excusing Sonnet | **Include it with a short example table**, labeled as a qualitative reading and flagged for the maintainer's check |
| Effort | Recording the model without its effort makes the decision ambiguous | **State effort per feature** (chat `low`, feedback `medium`) as part of the decision |

### Alternatives Considered

- **Keep the defaults and record the choice only (docs-only, as the issue said).** Rejected by the user: the app would keep shipping a configuration its own record argues against.
- **Claude Haiku 5.5 for feedback.** Lowest cost and latency, with recall and precision close to Mistral's, but the worst grammar MAE (17.89 at beginner level) and 8 no-op corrections a learner would see. Named in the record as the main candidate if #269's rubric closes those gaps.
- **Mistral Large for feedback.** The best-calibrated grammar scores, but no detection advantage and a 26 s p50 wait.
- **Keep Mistral for chat pending a chat eval.** Considered. Rejected by the user in favor of latency, with the evidence gap disclosed.
- **Fresh eval run on `main` before publishing.** Rejected by the user to avoid spend. The equivalence of `d4521f5` with `main` is documented instead.
- **Delete the "Why Mistral" section.** Rejected: the references and the project's origin story are still useful context once they're qualified.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Docs-only" vs the defaults change | The issue body says docs-only; the user decided to switch the defaults | Treat the user's decision as authoritative. Post a comment on #232 recording the scope change (needs the user's OK at the prompt stage, since it's outward-facing) |
| "Why Mistral" heading | Rename to "Model choice", or keep the heading and qualify the body? | Rename (no in-repo anchor links found). Confirm at the prompt stage |
| `docs/decisions/README.md` index | Wanted, or just the single record? | Add a minimal index; it costs little and gives #269 a place to look |
| VISION.md scope | The issue names only the README; VISION.md repeats "Why Mistral" and states the model | Factual updates only (tagline, the "planned evaluation" sentence, the model lines). Leave the vision-level prose |
| False-correction characterization | Does the maintainer agree with the reading? | Show the example table in the prompt-stage summary for a quick check before it's written into the record |
| Review status of `judge_validation_v1` | It's "Pending" in `evals/README.md` | State it as a limitation. Don't block on it |
| `feedback_v1` review date "1/15/26" in `evals/README.md` | It's earlier than the dataset's creation (November 2026), so probably a typo for 11/15/26 | Ask the maintainer. Don't change it silently |
| Follow-up issues | A chat quality eval; updating `.vibe/instructions.md:91` | Draft both at PR time for the user to approve before `gh issue create` |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| A developer's existing `.env` sets `CHAT_PROVIDER=mistral` etc. (copied from the old `.env.example`) | The new defaults don't apply to them; the app keeps using Mistral | Document in the PR and README: the explicit `.env` values win, so remove or change them to adopt the defaults. The maintainer's local app is likely in this state |
| A `.env` with only `MISTRAL_API_KEY` and no provider variables | After the change, startup fails: `ANTHROPIC_API_KEY must be set…` | The existing validator message is clear. Call it out in the PR description as a breaking default change, with the one-line fix |
| MCP server config passes `-e MISTRAL_API_KEY=unused` | With the new defaults, the backend settings require `ANTHROPIC_API_KEY`, so the server fails to start unless `.env` has it | Update the README MCP section to name `ANTHROPIC_API_KEY`. Mention #275 as the real fix. Warn the user, since this session's `french-coach` MCP server may be configured this way |
| CI pytest job | `config.py` builds `Settings()` at import; without an Anthropic key, every test fails to import | Add `ANTHROPIC_API_KEY: dummy_test_key` to the job env |
| Tests that build `Settings(_env_file=None, MISTRAL_API_KEY=...)` without provider overrides | They now fail validation (no Anthropic key) | Update each: pass `ANTHROPIC_API_KEY`, or set the providers explicitly where a test is about Mistral |
| Eval harness | It builds its own per-config `Settings` (`evals/run_feedback_eval.py:324`) and the judge defaults to Mistral | No behavior change; check the harness tests still pass |
| The cited commit `d4521f5` becomes unreachable (branch deleted) | Provenance is lost | The record states the equivalence with `main` and names PR #266 / `be4efaf`. Suggest keeping the #231 branch until a run on `main` replaces this one |
| Numbers drift between the README, the record and the report | Readers lose trust | Verification step: diff every figure against the report |
| A metrics dashboard baseline of `mistral:mistral-large-latest` with new traffic on Claude | The default comparison anchor no longer matches the default model | Out of scope; mention as a possible follow-up |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Overstating a 27-conversation result | Misleading decision record | Ground the decision in the large differences (latency 5×, recall +7 points) and state the uncertainty and the single run |
| Claude-drafted labels and a Claude-drafted record favoring Claude | Self-preference in both the evidence and the write-up | Disclose it in the record. Present Mistral's wins plainly. The maintainer reviews the record. The judge is Mistral (already disclosed) |
| Hidden test dependence on the Mistral default | CI failures across several files | Run the whole suite locally with only dummy keys set, like CI. Grep for `MISTRAL_API_KEY=` and default-provider assumptions |
| Coverage gate | `config.py` must stay at or above 80% | Only defaults change; existing tests cover the validator |
| Cost increase | Feedback about $0.0044 → $0.0084 per session; chat about $0.0008 → $0.0019 per turn (anecdotal) | Stated in the record; negligible for a single-user app. The revisit trigger names Haiku plus the rubric as the cost lever |
| Anthropic availability is a new single point of failure | Both features fail together if the Anthropic API or key fails | Record it as a consequence. Switching back is a config change (`.env`), and the record says how |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Results table links to its run | Yes | Commit the run files in the same PR |
| AC2 | A model per feature with its trade-off | Yes | Chat trade-off rests on anecdotal latency, stated as such |
| AC3 | Limitations stated (size, single labeler, judge agreement) | Yes | Also single run, chat not evaluated, Claude-drafted bias |
| AC4 | "Why Mistral" reconciled | Yes | Heading rename to confirm |
| AC5 (user decision) | Defaults switched consistently | Yes | Config, `.env.example`, CI env, tests, docs |

**AC Coverage Summary**: all 4 issue ACs plus the user-added default switch are addressable with this approach.

**Implicit Requirements Not in ACs**:
- Every published number matches the committed report.
- The record states the effort setting as part of the decision.
- The PR flags the breaking default change and how to keep Mistral (set the provider variables in `.env`).
- The scope change from docs-only is recorded on the issue.
- The decision record has a home for #269's rubric result.

---

## REASONS Canvas

### Requirements

- AC1: an "Evaluation" README section whose table links to the committed run `evals/results/feedback_eval_20261116-042618.{md,json}`.
- AC2: `docs/decisions/001-model-choice.md` names Claude Sonnet 5.5 for chat (effort `low`) and feedback (effort `medium`), each with its trade-off, cost and latency, and what would change it.
- AC3: limitations: 27 synthetic conversations and 71 errors, one drafter and one B1 reviewer, judge agreement 90.9% on 22 drafted items pending review, single run, chat not evaluated.
- AC4: "Why Mistral" renamed and qualified, so it agrees with the data and the new defaults.
- AC5 (user): defaults switched to `anthropic` / `claude-sonnet-5-5` across config, `.env.example`, CI, tests and docs.

### Examples

- README table row: `Claude Sonnet 5.5 (medium) | 95.8% (68/71) | 81.0% (16) | 100.0% | 9.59 | $0.008381 | 5,143 / 8,980 ms`, matching the report.
- Record, feedback trade-off: "Sonnet 5.5 caught the most errors (95.8% vs 88.7%) and returned feedback about five times faster than Mistral Large (p50 5.1 s vs 26.0 s), at about twice the cost ($0.0084 vs $0.0044 per session); it also made more unrequested style suggestions and its grammar scores were less well calibrated (MAE 9.6 vs 6.2)."
- Record, revisit trigger: "If #269's rubric brings Haiku 5.5's grammar MAE and no-op corrections in line with Sonnet's, switch feedback to Haiku (about 15× cheaper)."
- Config test: `Settings(_env_file=None, ANTHROPIC_API_KEY="key")` → `CHAT_PROVIDER == "anthropic"`, `FEEDBACK_MODEL == "claude-sonnet-5-5"`; `Settings(_env_file=None)` → `ValidationError` matching `ANTHROPIC_API_KEY`; `Settings(_env_file=None, MISTRAL_API_KEY="k", CHAT_PROVIDER="mistral", CHAT_MODEL="mistral-large-latest", FEEDBACK_PROVIDER="mistral", FEEDBACK_MODEL="mistral-large-latest")` → valid without an Anthropic key.

### Architecture

- Per-feature routing in `config.py` → `LLMService.route()` (`services/llm/service.py`), so the switch is a defaults change with no code-path change. The Claude provider path is already exercised (#228 tests, the eval run).
- New `docs/decisions/` directory (approved by the issue).
- Eval artifacts under `evals/results/`, committed when cited (`evals/README.md`, Reports).

### Standards

- Markdown in the README's existing style (tables, bold lead-ins, issue references).
- 80% coverage maintained (`.coveragerc`, `scripts/check_module_coverage.py`); the full pytest suite passes with CI-like dummy keys.
- PEP 8 and docstrings for any touched Python (`config.py` docstring).
- Commit `docs(#232): …` (or `feat(#232)` given the defaults change; decide at the prompt stage). The PR closes #232 and lists the AC checklist, test results, the breaking-change note and the SPDD artifact paths.
- Never read `.env`.

### Omissions

- No new eval run, no chat eval, no harness or judge default change.
- No effort change, no prompt caching, no workload routing, no rubric work.
- No `.vibe/instructions.md` edit (own issue), no metrics baseline change, no frontend change, no #275 fix.

### Notes

- The interrupted run `feedback_eval_20261116-033254.*` stays untracked (it is partial: Mistral only, 21 conversations). Leave it on disk; it's the user's file.
- Local chat figures come from `french_coach.db` (`llm_calls`, 2026-11-14): Mistral 9 calls, 9,042 ms mean, $0.000794 mean; Sonnet 5 calls, 1,860 ms mean, $0.00189 mean. Cite them as "local manual testing, n=9 / n=5".
- Cost ratios for the record: feedback Sonnet/Mistral = 0.008381 / 0.004373 ≈ 1.9×; Haiku vs Sonnet ≈ 15× cheaper (0.008381 / 0.000546 ≈ 15.4). Latency p50 Mistral/Sonnet = 25,968 / 5,143 ≈ 5.0×.
- `evals/README.md` mentions the first full run's cost ($0.43, 23 minutes). Link the record from there too.
- After the merge, #269 resumes. Its AC3 adds the rubric A/B to this record (a section in 001, or 002).

### Solutions

- Report values: `evals/results/feedback_eval_20261116-042618.md` (Results, By difficulty, Details, Judge, Caveats sections).
- README tone and table style: the "LLM Integration" and "MCP Server" sections.
- Caveat wording: the run report's Caveats list and `evals/README.md` Limits.
- Config tests: extend the patterns in `tests/test_llm_config.py` (`make_settings(_env_file=None, …)`).
- CI env: mirror the existing `MISTRAL_API_KEY: dummy_test_key` line.
