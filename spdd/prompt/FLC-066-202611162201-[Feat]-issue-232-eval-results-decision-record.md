# SPDD Prompt: Publish Eval Results and a Model-Choice Decision Record

**GitHub Issue**: #232
**Issue Title**: Publish eval results and a model-choice decision record
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/232
**Artifact ID**: FLC-066-202611162201
**Created**: 2026-11-16 22:01
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [`spdd/analysis/FLC-066-202611162155-[Analysis]-issue-232-eval-results-decision-record.md`](../analysis/FLC-066-202611162155-[Analysis]-issue-232-eval-results-decision-record.md)

---

## Context

### Current Codebase State

- The model-eval milestone (#228–#231) is merged. A full eval run exists on disk but is **untracked**: `evals/results/feedback_eval_20261116-042618.{json,md}` plus `_judge_sample.jsonl` (14 lines). It was run at commit `d4521f5` (on the #231 branch only; PR #266 was squash-merged as `be4efaf`). Since then the only difference in `services/`, `evals/`, `config.py` and `schemas/` is a `print(..., flush=True)` change in the harness. An interrupted partial run `feedback_eval_20261116-033254.*` also sits untracked and **must stay uncommitted**.
- Both features default to Mistral Large (`config.py:30–33`). The maintainer decided (analysis, "Decisions confirmed") to switch **both** defaults to `anthropic` / `claude-sonnet-5-5` in this PR, which authorizes the default change that CLAUDE.md:17 otherwise forbids.
- `docs/` doesn't exist; the issue approves creating `docs/decisions/`.
- The README's "Why Mistral" section (`README.md:741`) makes unqualified French-quality claims backed by external benchmarks.

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `evals/results/feedback_eval_20261116-042618.md` | Source of every published number | Results, By difficulty, Details, Spend, Judge, Caveats |
| `evals/results/feedback_eval_20261116-042618.json` | Per-conversation detail, false corrections | `models[].conversations[].corrections[].status == "false"` |
| `config.py` | Settings and defaults | module docstring `:1–5`; defaults `:30–33`; `check_provider_keys` `:45–59`; `settings = Settings()` `:62` |
| `services/llm/__init__.py` | Package docstring | mentions per-feature config (check for default wording) |
| `.env.example` | Env reference | key comments `:1–5`; provider/model `:9–13` |
| `.github/workflows/pytest-tests.yml` | CI pytest job | env `:72–74` (`MISTRAL_API_KEY: dummy_test_key`) |
| `tests/test_llm_config.py` | Config tests | `TestDefaults` `:33–55` |
| `tests/test_llm_service.py` | Service tests | `make_settings()` `:35–38`; many tests pass only `providers={"mistral": …}` and rely on the Mistral default |
| `tests/test_llm_provider_integration.py` | Router + provider integration | `make_settings()` `:29–33`; same reliance on the default |
| `tests/test_eval_judge.py`, `tests/test_eval_runner.py` | Harness tests | build explicit `Settings`; verify they still pass |
| `README.md` | Docs | intro `:5`; Setup `:116–134`; Tech Stack `:184`; Data Flow `:472–473`; LLM Integration `:503`; metrics walkthrough `:565`; MCP key notes `:605`, `:617`, `:638`, `:652`; Why Mistral `:741–755`; Limitations `:849` |
| `VISION.md` | Vision doc | tagline `:3`; Why Mistral `:33–42`; model lines `:120`, `:188` |
| `CLAUDE.md` | Claude guardrails | `:17` default provider statement |
| `evals/README.md` | Eval docs | review status table (`feedback_v1 \| CB \| 1/15/26`); Reports section (link the record) |

### Existing Patterns

- README style: `##` sections, tables, bold lead-ins, issue references in parentheses ("(Issue #236)"), relative links.
- Config tests: `make_settings(**overrides)` → `Settings(_env_file=None, …)`; Given/When/Then comments.
- Eval reports are committed when cited (`evals/README.md`, Reports: "#232 publishes results from a committed run").

---

## Goal

**Primary Objective**: Publish the feedback eval results and a decision record that names Claude Sonnet 5.5 for chat (effort `low`) and feedback (effort `medium`), with its trade-offs, cost, latency, limitations and revisit triggers, and make the app's defaults match that decision.

**Secondary Objectives**:
- Reconcile the README's "Why Mistral" section with the data (rename to "Model choice").
- Keep every doc that states the default accurate (README, VISION.md, CLAUDE.md, `.env.example`).
- Keep CI green with the new defaults (dummy Anthropic key, updated tests).
- Fix the `feedback_v1` review date typo (approved).
- After the PR: comment on #232 about the scope change and open two follow-up issues (approved).

---

## Constraints

### Architecture Constraints
- Defaults change only in `config.py`. No routing or provider code changes; effort defaults stay chat `low`, feedback `medium`.
- Eval harness defaults are unchanged (judge stays Mistral Large; default eval models unchanged).
- The metrics report baseline default (`mistral:mistral-large-latest`) is unchanged.
- **Don't edit `.vibe/instructions.md`** (shared instructions change in their own issue; follow-up issue instead).
- Never read, print or commit `.env`. Don't commit the interrupted run or anything else under `evals/results/` besides the three cited files.
- No `npm run build`, no frontend changes.

### Code Quality Constraints
- PEP 8; update the `config.py` module docstring so it no longer says the defaults reproduce the original Mistral behavior.
- Docs: every number copied verbatim from `feedback_eval_20261116-042618.md` (same rounding). Chat figures labeled "local manual testing" with sample sizes.
- Present Mistral's wins plainly (best grammar MAE, precision above Sonnet's, lower cost than Sonnet). Mark the false-correction characterization as a qualitative reading by Claude Code, reviewed by the maintainer.

### Testing Constraints
- The full backend suite must pass **as CI runs it**: no `.env`, only dummy keys. The local `.env` may pin `*_PROVIDER=mistral`, which would mask failures. So run the suite in a clean `git worktree` (no `.env`) with `MISTRAL_API_KEY=dummy_test_key ANTHROPIC_API_KEY=dummy_test_key`, plus the coverage gate and `scripts/check_module_coverage.py coverage.json`.
- Tests whose subject is Mistral behavior pin Mistral routing explicitly in their `make_settings()` helper rather than relying on the default; overrides still win.
- New config tests: the defaults are Anthropic/Sonnet; the default config requires `ANTHROPIC_API_KEY`; an empty Anthropic key counts as missing; the default config does **not** require `MISTRAL_API_KEY`; an explicit all-Mistral config is valid without an Anthropic key.
- No frontend tests (no frontend changes).

### Acceptance Criteria
1. The results table links to the run under `evals/results/` that produced it (committed).
2. The decision record names a model per feature (chat, feedback) with its trade-off in one or two sentences.
3. Limitations are stated: dataset size, single labeler, and judge agreement (plus single run, chat not evaluated, Claude-drafted bias).
4. The README's "Why Mistral" section is reconciled with the results.
5. (User decision) Defaults switched to `anthropic` / `claude-sonnet-5-5` consistently across config, `.env.example`, CI, tests and docs.

---

## Examples

### Input/Output Examples
1. **Default settings**
   - Input: `Settings(_env_file=None, ANTHROPIC_API_KEY="key")`
   - Expected: `CHAT_PROVIDER == FEEDBACK_PROVIDER == "anthropic"`, `CHAT_MODEL == FEEDBACK_MODEL == "claude-sonnet-5-5"`, `MISTRAL_API_KEY is None`, efforts `None`
2. **Missing Anthropic key with defaults**
   - Input: `Settings(_env_file=None)` or `ANTHROPIC_API_KEY=""`
   - Expected: `ValidationError` matching `ANTHROPIC_API_KEY`
3. **Opting back into Mistral**
   - Input: `Settings(_env_file=None, MISTRAL_API_KEY="k", CHAT_PROVIDER="mistral", CHAT_MODEL="mistral-large-latest", FEEDBACK_PROVIDER="mistral", FEEDBACK_MODEL="mistral-large-latest")`
   - Expected: valid; `ANTHROPIC_API_KEY is None`
4. **README results row** (verbatim from the report): `Claude Sonnet 5.5 (effort medium) | 95.8% (68/71) | 81.0% (16) | 100.0% | 9.59 (27) | 100.0% / 100.0% | $0.008381 | 5,143 / 8,980`

### Edge Cases
- A developer `.env` with explicit `*_PROVIDER=mistral` keeps Mistral: say so in the README Setup and the PR.
- A `.env` with only `MISTRAL_API_KEY` now fails at startup with the validator message: the PR flags it as a breaking default change.
- MCP server: with the new defaults the backend settings need `ANTHROPIC_API_KEY` (until #275). Update the README MCP notes from `MISTRAL_API_KEY` to `ANTHROPIC_API_KEY`, including the `-e …=unused` and `.mcp.json` `env` examples.
- The cited commit `d4521f5` may become unreachable: the record names PR #266 / `be4efaf` and the flush-only difference.

### Test Cases
```python
class TestDefaults:
    def test_defaults_use_claude_sonnet_for_both_features(self):
        # Given only an Anthropic key / When settings load
        settings = make_settings(ANTHROPIC_API_KEY="key")

        # Then both features use Claude Sonnet 5.5 (issue #232 decision record)
        assert settings.CHAT_PROVIDER == "anthropic"
        assert settings.CHAT_MODEL == "claude-sonnet-5-5"
        assert settings.FEEDBACK_PROVIDER == "anthropic"
        assert settings.FEEDBACK_MODEL == "claude-sonnet-5-5"
        assert settings.MISTRAL_API_KEY is None

    def test_default_config_requires_anthropic_key(self):
        with pytest.raises(ValidationError, match="ANTHROPIC_API_KEY"):
            make_settings(ANTHROPIC_API_KEY=None)

    def test_default_config_does_not_require_mistral_key(self):
        assert make_settings(ANTHROPIC_API_KEY="key", MISTRAL_API_KEY=None).MISTRAL_API_KEY is None

    def test_all_mistral_config_needs_no_anthropic_key(self):
        settings = make_settings(MISTRAL_API_KEY="key", **ALL_MISTRAL)
        assert settings.ANTHROPIC_API_KEY is None
```

---

## Deliverables

### Code Changes
- [ ] `config.py`: defaults → `anthropic` / `claude-sonnet-5-5` for both features; docstring updated (decision record reference)
- [ ] `services/llm/__init__.py`: docstring only, if it states the defaults
- [ ] `.env.example`: provider/model lines → Anthropic/Sonnet; key comments (Anthropic required by default; Mistral needed for Mistral features and the eval judge)
- [ ] `.github/workflows/pytest-tests.yml`: add `ANTHROPIC_API_KEY: dummy_test_key`
- [ ] `evals/results/feedback_eval_20261116-042618.json`, `.md`, `_judge_sample.jsonl`: committed as-is

### Tests
- [ ] `tests/test_llm_config.py`: new defaults tests (above); existing Mistral-key tests rewritten for an explicit Mistral config
- [ ] `tests/test_llm_service.py`, `tests/test_llm_provider_integration.py`: `make_settings()` pins Mistral routing (overrides still win)
- [ ] Any other failure found by the clean-worktree run is fixed in the same spirit (pin the provider the test is about)

### Documentation
- [ ] `docs/decisions/001-model-choice.md` (new): see the outline in the prompt
- [ ] `docs/decisions/README.md` (new): index plus record format
- [ ] `README.md`: new "Evaluation" section; "Why Mistral" → "Model choice"; default-stating lines updated (list in Relevant Files); project structure gains `docs/decisions/`
- [ ] `VISION.md`: factual updates (tagline, "planned evaluation" sentence, model lines)
- [ ] `CLAUDE.md:17`: default provider statement
- [ ] `evals/README.md`: review date `1/15/26` → `11/15/26`; link the decision record and README Evaluation section from the Reports paragraph

### After the PR (approved outward actions)
- [ ] Comment on #232: the defaults change was approved by the maintainer and is included, widening "docs-only"
- [ ] Follow-up issue: chat quality eval (the evidence that could reverse the chat choice)
- [ ] Follow-up issue: update `.vibe/instructions.md` ("Backend: FastAPI, SQLAlchemy async, Mistral API") for the new defaults

---

## Actual Prompt

```
Implement GitHub issue #232 in the French Language Coach repo (branch
docs/issue-232-eval-results-decision-record), following the analysis
spdd/analysis/FLC-066-202611162155-[Analysis]-issue-232-eval-results-decision-record.md.

CONTEXT:
- The feedback eval harness (#231) produced a completed full run, untracked on disk:
  evals/results/feedback_eval_20261116-042618.{json,md} and
  feedback_eval_20261116-042618_judge_sample.jsonl. 27 conversations x 3 models,
  $0.4258 total, judge mistral/mistral-large-latest, judge agreement 90.9% on 22 items
  (judge_validation_v1, drafted by Claude Code, human review Pending).
  Run commit d4521f5 is only on the #231 branch (PR #266 squash-merged as be4efaf); the
  only code difference vs main in services/, evals/, config.py, schemas/ is a
  print(flush=True) change in the harness.
- Results (copy verbatim from the .md):
  mistral-large: recall 88.7% (63/71), precision 88.7% (8), correction acc 100.0%,
    grammar MAE 6.19 (27), schema 100.0%/100.0%, $0.004373/conv, p50/p95 25,968/36,195 ms,
    false on clean 6, no-op 1
  claude-sonnet (effort medium): 95.8% (68/71), 81.0% (16), 100.0%, 9.59 (27),
    100.0%/100.0%, $0.008381, 5,143/8,980 ms, false on clean 7, no-op 1
  claude-haiku (effort medium): 87.3% (62/71), 88.4% (8), 98.4%, 12.63 (27),
    100.0%/100.0%, $0.000546, 4,386/7,736 ms, false on clean 5, no-op 8
  By difficulty (recall / MAE): mistral 95.8%/9.44, 87.0%/4.67, 83.3%/4.44;
  sonnet 100.0%/14.44, 95.7%/6.11, 91.7%/8.22; haiku 91.7%/17.89, 91.3%/8.78, 79.2%/11.22
  (beginner, intermediate, advanced).
- False corrections (32 total) are almost all style/register suggestions on correct
  French. Examples: mistral fb-007 "Où sont les toilettes" -> "Où se trouvent les
  toilettes"; sonnet fb-016 "j'ai raté ma correspondance" -> "j'ai loupé ma
  correspondance"; sonnet fb-022 "je crains qu'on me licencie" -> "je crains qu'on ne me
  licencie"; haiku fb-007 "Le musée ferme à quelle heure ?" -> "À quelle heure le musée
  ferme-t-il ?"; doubtful: haiku fb-018 "vous êtes très gentille" -> "vous êtes très
  gentil" (addressee's gender unknown).
- Chat has no quality eval. Local manual testing (french_coach.db llm_calls,
  2026-11-14): Mistral Large 9 calls, mean 9,042 ms, $0.000794/call; Claude Sonnet 5.5
  5 calls, mean 1,860 ms, $0.00189/call. Anecdotal.
- Defaults today: config.py:30-33 = mistral / mistral-large-latest for chat and feedback.
  check_provider_keys (config.py:45-59) requires each configured provider's key;
  settings = Settings() runs at import (config.py:62). CI pytest sets only
  MISTRAL_API_KEY: dummy_test_key (.github/workflows/pytest-tests.yml:72-74).
- Maintainer decisions: Claude Sonnet 5.5 for feedback (effort medium) and chat (effort
  low); switch the defaults in this PR (this issue authorizes the default change
  CLAUDE.md:17 otherwise forbids); cite the existing run; rename "Why Mistral" to
  "Model choice"; include the false-correction reading flagged as qualitative; fix the
  feedback_v1 review date 1/15/26 -> 11/15/26.

GOAL:
1. Commit the three cited run files unchanged (not the interrupted 033254 run).
2. Create docs/decisions/001-model-choice.md with these sections:
   - Header: Status Accepted; Date 2026-11-16; Issue #232; Decided by the project
     maintainer.
   - Context: the milestone's question (does Mistral's French reputation hold on this
     app's feedback workload?), what was measured, link to evals/README.md and
     evals/METHODOLOGY.md.
   - Decision table: Feature | Provider / model | Effort | Cost | Latency | Basis.
     Feedback: anthropic / claude-sonnet-5-5, medium, $0.008381 per session, p50 5.1 s /
     p95 9.0 s, eval run. Chat: anthropic / claude-sonnet-5-5, low, about $0.0019 per
     turn, mean 1.9 s, local manual testing (n=5; Mistral n=9: 9.0 s, $0.0008), quality
     not measured.
   - Trade-offs: one or two sentences per feature. Feedback: highest recall and about 5x
     faster than Mistral Large at about 1.9x the cost; more unrequested style suggestions
     and looser grammar-score calibration (MAE 9.59 vs 6.19, worst at beginner level).
     Chat: chosen for latency; French conversational quality unmeasured, so Mistral's
     reputation for natural French is neither confirmed nor refuted here.
   - Evidence: overall results table (from the report, linked), by-difficulty recall/MAE
     table, a "What the false corrections are" paragraph with a 5-row example table
     labeled "qualitative reading by Claude Code, reviewed by the maintainer", and a
     provenance note on d4521f5.
   - Where Mistral Large did better: best grammar MAE at intermediate and advanced
     levels and overall, precision equal to Haiku's and above Sonnet's, half Sonnet's
     cost. Haiku: about 15x cheaper than Sonnet, but 8 no-op corrections and the worst
     MAE.
   - Consequences: defaults changed in config.py and .env.example; ANTHROPIC_API_KEY now
     required by default, MISTRAL_API_KEY only for Mistral features and the eval judge;
     both features now depend on one provider; how to switch back (set the four
     provider/model variables in .env); explicit .env values override the defaults.
   - What would change this decision: #269's rubric A/B (if Haiku plus rubric matches
     Sonnet's recall with acceptable MAE and no no-op corrections, move feedback to
     Haiku); a chat quality eval showing Mistral clearly better for role-play; a v2
     dataset reviewed by a native or C1+ speaker that reverses the recall ordering;
     price or latency changes that remove the 5x latency gap or flip cost by more
     than 2x.
   - Limitations: 27 synthetic conversations, 71 labeled errors (small differences not
     meaningful); single drafter (Claude Code) and single reviewer at about B1; possible
     bias toward Claude from Claude-drafted labels; judge agreement 90.9% on 22
     Claude-drafted items, human review pending, prompt tuned on those items; one run
     per model (non-deterministic); recall capped because the prompt asks for example
     corrections; chat not evaluated; costs are estimates from data/llm_pricing.json
     (checked 2026-11-13).
   - References: run files, evals/README.md, evals/METHODOLOGY.md, #228-#231, #269.
3. Create docs/decisions/README.md: one-line purpose, a table of records (001), and the
   record format (sections listed above), noting that #269 will add its rubric result.
4. README.md:
   - Add "## Evaluation" immediately before the renamed model section: two sentences
     on what was evaluated; the overall results table (Model | Recall | Precision
     (false) | Correction accuracy | Grammar MAE (n) | Schema valid 1st / final |
     Cost / conversation | p50 / p95 latency (ms)) with values verbatim; a line linking
     evals/results/feedback_eval_20261116-042618.md and .json; a 2-3 sentence decision
     summary linking docs/decisions/001-model-choice.md; a short limitations list
     (size, single labeler, judge agreement, single run, chat not evaluated).
   - Rename "## Why Mistral" to "## Model choice" with "### The case for Mistral"
     (keep the existing paragraph's substance, attributed as general benchmark
     evidence, and keep the References table) and "### What this app's eval found"
     (Mistral Large: best-calibrated grammar scores, solid precision, no detection
     advantage, about 5x slower; the defaults are now Claude Sonnet 5.5 for both
     features; link the record). Keep the Mistral Vibe / Claude Code paragraph.
   - Update every line that states the Mistral default: intro (:5, also replace "results
     haven't been published yet" with a link to the Evaluation section); Setup step 5
     and config table (:116-134: Anthropic key first and required by default, Mistral
     optional; mention that explicit .env provider values override the defaults); Tech
     Stack (:184); Data Flow (:472-473); LLM Integration (:503); metrics walkthrough
     (:565); MCP server key notes (:605, :617, :638, :652 -> ANTHROPIC_API_KEY, still
     tracked in #275); Limitations (:849). Add docs/decisions/ to Project Structure.
5. config.py: CHAT_PROVIDER="anthropic", CHAT_MODEL="claude-sonnet-5-5",
   FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-sonnet-5-5"; module docstring
   says the defaults follow docs/decisions/001-model-choice.md (issue #232). Update
   services/llm/__init__.py docstring only if it states the defaults.
6. .env.example: provider/model lines set to anthropic / claude-sonnet-5-5; key
   comments updated.
7. .github/workflows/pytest-tests.yml: add ANTHROPIC_API_KEY: dummy_test_key next to
   MISTRAL_API_KEY.
8. Tests: rewrite tests/test_llm_config.py TestDefaults for the new defaults (see
   EXAMPLES) and keep Mistral-key coverage via an explicit all-Mistral config. In
   tests/test_llm_service.py and tests/test_llm_provider_integration.py, make
   make_settings() pin CHAT_/FEEDBACK_ provider+model to Mistral before applying
   overrides. Fix any other failures the same way.
9. VISION.md: tagline (:3) no longer says "Claude API support in progress"; the "Why
   Mistral" paragraph's "planned evaluation" sentence (:42) points to the completed
   evaluation and the record; model lines (:120, :188) state Claude Sonnet 5.5 as the
   default with Mistral supported. Leave vision-level prose alone.
10. CLAUDE.md:17: "Claude Sonnet 5.5 (claude-sonnet-5-5) is the default provider for
    both features (issue #232, docs/decisions/001-model-choice.md); Mistral is
    selectable per feature..." keeping the rest of the guardrail (provider layer only,
    no default changes without an issue).
11. evals/README.md: feedback_v1 review date -> 11/15/26; in Reports, link the
    decision record and the README Evaluation section as where #232 published results.

CONSTRAINTS:
- Do not edit .vibe/instructions.md, frontend/, static/, the harness or judge defaults,
  the metrics baseline default, or Claude effort defaults.
- Never read or print .env. Don't commit the interrupted run.
- Every published number matches the report exactly; chat numbers are labeled
  anecdotal with n.
- State Mistral's advantages plainly; label the false-correction reading as
  qualitative.
- Verify like CI: in a clean git worktree with no .env, run
  MISTRAL_API_KEY=dummy_test_key ANTHROPIC_API_KEY=dummy_test_key python3 -m pytest tests/
  --cov --cov-report=term-missing --cov-report=json, then
  python3 scripts/check_module_coverage.py coverage.json. Everything passes.
- Commit as feat(#232): ... with the SPDD artifacts, docs, run files, config, CI and
  tests together.

EXAMPLES:
- make_settings(ANTHROPIC_API_KEY="key") -> anthropic/claude-sonnet-5-5 for both features.
- make_settings() with no keys -> ValidationError mentioning ANTHROPIC_API_KEY.
- All-Mistral explicit config with only MISTRAL_API_KEY -> valid.
- README row: "Claude Sonnet 5.5 (effort medium) | 95.8% (68/71) | 81.0% (16) | 100.0% |
  9.59 (27) | 100.0% / 100.0% | $0.008381 | 5,143 / 8,980".

ACCEPTANCE CRITERIA:
- [ ] The results table links to the committed run under evals/results/
- [ ] The decision record names a model per feature with its trade-off in 1-2 sentences
- [ ] Limitations stated: dataset size, single labeler, judge agreement
- [ ] "Why Mistral" reconciled with the results
- [ ] Defaults switched consistently (config, .env.example, CI, tests, docs)

DELIVERABLES:
- docs/decisions/001-model-choice.md, docs/decisions/README.md
- evals/results/feedback_eval_20261116-042618.{json,md}, _judge_sample.jsonl
- README.md, VISION.md, CLAUDE.md, evals/README.md, .env.example updates
- config.py (+ services/llm/__init__.py docstring if needed)
- .github/workflows/pytest-tests.yml
- tests/test_llm_config.py, tests/test_llm_service.py,
  tests/test_llm_provider_integration.py (+ any others that need pinning)
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, on `docs/issue-232-eval-results-decision-record`:

- **Decision record** `docs/decisions/001-model-choice.md`: Claude Sonnet 5.5 for feedback (effort medium) and chat (effort low), with the cost and latency per feature, trade-offs, overall and by-difficulty evidence tables, a false-corrections section with 5 examples (labeled qualitative), where Mistral Large and Haiku did better, provenance of `d4521f5`, consequences (including how to switch back), revisit triggers and limitations. `docs/decisions/README.md` is the index and format.
- **Run committed**: `evals/results/feedback_eval_20261116-042618.{json,md}` and `_judge_sample.jsonl`, unchanged. The interrupted `033254` run is left untracked.
- **README**: new "Evaluation" section (results table verbatim from the report, run links, decision summary, limitations). "Why Mistral" became "Model choice" ("The case for Mistral", "What this app's eval found", references kept). Every Mistral-default statement was updated: intro, Setup step 5 and the config table, Tech Stack, Project Structure (`docs/decisions/`), Data Flow, LLM Integration, the metrics walkthrough, the MCP key notes (now `ANTHROPIC_API_KEY`) and Limitations.
- **Defaults**: `config.py` uses `anthropic` / `claude-sonnet-5-5` for both features (docstring cites the record); `.env.example` updated; CI pytest env gains `ANTHROPIC_API_KEY: dummy_test_key`.
- **Tests**: `tests/test_llm_config.py` has new `TestDefaults` (4 tests) and `TestMistralOptIn` (4 tests, including env values overriding the defaults); the mixed-provider and effort tests are made explicit. `make_settings()` in `tests/test_llm_service.py` and `tests/test_llm_provider_integration.py` pins Mistral routing (overrides still win). No other test needed changes.
- **Other docs**: VISION.md (tagline, the evaluation sentence, model lines), the CLAUDE.md guardrail, `evals/README.md` (review date 11/15/26; Reports links to the record and the Evaluation section).

---

## Human Review Notes

### Changes Made
- [x] `services/llm/__init__.py` left unchanged: its docstring doesn't state the defaults (the prompt said "only if").
- [x] Added `test_environment_values_override_the_defaults` (not in the prompt's examples) to pin down the documented behavior that an older `.env` keeps Mistral.
- [x] README Setup gained a sentence on `.env` values overriding the defaults and on the eval judge's use of `MISTRAL_API_KEY`, covering the edge cases listed in the prompt.
- [x] False-corrections table: after checking the dataset records, the fb-018 reading became "the transcript doesn't give the museum attendant's gender", and fb-022 is noted as a deliberate trap (the record's `notes` say the *ne explétif* is optional).
- [x] Wording "precision equal to Haiku's" softened to "about the same" (88.7% vs 88.4%).

### Quality Checks
- [x] Code follows existing patterns (`make_settings` helpers, Given/When/Then comments)
- [x] Tests pass at 80%+ coverage (98.19% total; per-module check passes)
- [x] Documentation updated (README, VISION.md, CLAUDE.md, evals/README.md, .env.example)
- [x] All acceptance criteria met (see Verification)

### Issues Found
- The local `.env` can mask default-routing bugs, because it may pin `*_PROVIDER=mistral`. Resolution: tests were run in a clean copy of the working tree with no `.env` and only dummy keys, as CI does.
- `scripts/check_module_coverage.py` prints "seed_database.py is allowlisted but now meets 80%". This is pre-existing and unrelated (tracked in #259); left alone.
- Breaking change for local setups: an `.env` with only `MISTRAL_API_KEY` and no provider variables now fails at startup with `ANTHROPIC_API_KEY must be set…`. Documented in the README, the record and the PR.
- The maintainer should review the false-corrections reading in the record (it's labeled as reviewed by the maintainer).

---

## Verification

- [x] **AC1** The README results table links to the committed run `evals/results/feedback_eval_20261116-042618.md` (and JSON). A script checked that all three result rows in the README and the record match the report verbatim, and that the by-difficulty values match the JSON.
- [x] **AC2** `docs/decisions/001-model-choice.md` names Claude Sonnet 5.5 for feedback (medium) and chat (low), each with a 1–2 sentence trade-off, cost, latency and revisit triggers.
- [x] **AC3** Limitations stated in the record and the README: dataset size, single labeler, judge agreement (90.9% on 22, review pending), single run, chat not evaluated, possible Claude bias.
- [x] **AC4** "Why Mistral" → "Model choice", with the benchmarks attributed and qualified by the app's own result.
- [x] **AC5** Defaults switched consistently: config, `.env.example`, CI env, tests, README, VISION.md, CLAUDE.md.
- [x] Tests: `MISTRAL_API_KEY=dummy_test_key ANTHROPIC_API_KEY=dummy_test_key python3 -m pytest tests/ --cov` in a clean copy with no `.env` → **1111 passed, 1 xfailed** (main: 1106 passed), total coverage **98.19%**; `scripts/check_module_coverage.py` → PASS.
- [x] `Settings()` with only `ANTHROPIC_API_KEY` → `anthropic claude-sonnet-5-5` for both features; without it → `ANTHROPIC_API_KEY must be set…`.
- [x] All relative links in the changed Markdown files resolve.
- [x] No frontend changes, so no frontend tests were run.
- [x] **Intentional breaking default change** (approved by the maintainer on this issue), documented with how to switch back.
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
