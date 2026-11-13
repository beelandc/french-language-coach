# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Shared agent instructions (single source of truth)

This project is developed with both **Mistral Vibe** and **Claude Code**. The rules both agents follow live in `.vibe/instructions.md` and are imported below. **Read them as binding instructions for Claude.** Wherever they name "Mistral Vibe" or "the AI", they apply to Claude equally.

@.vibe/instructions.md

Don't copy rules from that file into this one. Edit `.vibe/instructions.md` (in its own issue) so both agents stay in sync. Everything below this line is Claude-specific.

---

## Guardrails (Claude-specific emphasis)

- **All app LLM calls go through the provider layer in `services/llm/`.** Mistral (`mistral-large-latest`) is the default provider for both features. Issue #228 authorizes Anthropic (Claude) API calls, but only behind this layer, selected per feature with `CHAT_PROVIDER` / `FEEDBACK_PROVIDER=anthropic`. Don't call either SDK from routers or anywhere else, and don't change the default provider or model unless a GitHub issue asks for it.
- **Never read, print, or commit `.env`.** It holds `MISTRAL_API_KEY` and `ANTHROPIC_API_KEY`. Use `.env.example` for reference.
- **Never commit to `main`, force-push, or merge your own PR.** Open the PR with `gh pr create` and stop. A human reviews and merges.
- **No issue, no work.** If the user hasn't given an issue number, ask for one, or offer to create it with `gh issue create` (and wait for a yes) before branching.
- **Ask before architectural decisions** (new dependencies, schema changes, new top-level directories, state-management changes).

## SPDD workflow with Claude Code

Follow the mandatory sequence from `SPDD.md` exactly. Project skills make it easier:

| Step | What to do | Claude tooling |
|------|------------|----------------|
| 1. Issue | `gh issue view <n>`; read the ACs; check dependencies | Bash (`gh`) |
| 2. Branch | `git checkout main && git pull origin main && git checkout -b {type}/issue-<n>-<desc>` | Bash (`git`) |
| 3. Analysis | REASONS-canvas analysis in `spdd/analysis/` | **`/spdd-analysis <n>`** |
| 4. Prompt | Structured prompt in `spdd/prompt/`, **before any code** | **`/spdd-prompt <n> [Feat\|Fix\|Refactor\|Test]`** |
| 5. Review pause | Summarize the prompt artifact and **wait for the user's go-ahead**, unless they already said to proceed end-to-end | — |
| 6. Implement | Implement exactly what the prompt artifact specifies; write tests alongside the code (80%+) | Edit/Write, Bash |
| 7. Verify | Run backend/frontend tests; check every AC; update README.md if structure, API or setup changed | Bash |
| 8. Close the loop | Fill in the prompt artifact's *AI Response*, *Human Review Notes* and *Verification* sections | Edit |
| 9. PR | Commit `{type}(#<n>): <summary>`; push; `gh pr create` with `Closes #<n>`, summary, AC checklist, test results | Bash (`git`, `gh`) |

If you notice you've written code before the prompt artifact exists, stop, tell the user, and create the artifact before continuing. Never backfill it silently (the issue #150 lesson).

**Artifact attribution**: in the `**Author**:` header field, use `Claude Code (<model name>, AI Assistant)`, e.g. `Claude Code (Claude Opus 5.5, AI Assistant)`. Older artifacts say `Mistral Vibe (AI Assistant)`; leave them as they are.

**Sequence numbers**: one `FLC-NNN` per issue, shared by its analysis and prompt artifacts. The next number is the highest `FLC-NNN` anywhere under `spdd/` (search recursively; a few files sit at the `spdd/` root) plus one.

## Commands

Backend (repo root, Python 3.12+, always `python3`):

```bash
pip install -r requirements.txt
uvicorn main:app --reload                         # API on :8000
python3 -m pytest tests/ -v --tb=short            # same as CI
python3 -m pytest tests/test_grammar_router.py -v # single file
python3 -m pytest --cov=. --cov-report=term-missing
python3 scripts/validate_grammar_lessons.py       # content validation
python3 scripts/validate_grammar_reference.py
```

Frontend (`cd frontend`, Node 20/22):

```bash
npm install
npm run dev                 # Vite on :5173, proxies API to :8000
npm run test                # Vitest (Storybook story tests, headless Chromium via Playwright)
npm run test:coverage
npm run test:jest           # Jest: *.jest.test.tsx and __tests__/
npm run test:jest:coverage
npm run lint
npx tsc -b                  # type-check only (tsconfigs set noEmit)
npm run e2e:run             # Cypress (needs backend + dev server running)
npm run storybook           # :6006
```

## Architecture map

- **Backend (FastAPI, async SQLAlchemy, SQLite)**: `main.py` (app, router registration, SPA fallback; auto-seeds vocabulary decks on startup) → `routers/` (HTTP layer) → `services/llm/` (`llm_service`: per-feature Mistral/Claude providers for chat + JSON feedback, logs each call to `llm_calls`; `services/mistral.py` is a compatibility alias) → `models/` (ORM) with `schemas/` (Pydantic). Scenario system prompts live in `scenarios.py`. Static content is JSON under `data/` (grammar lessons, reference, exercises, vocabulary decks, LLM price table `llm_pricing.json`).
- **Frontend (React 19 + TS + Vite, react-router)**: `frontend/src/pages/` (routes, wired in `App.tsx`), `components/` (each with `.stories.tsx` and tests), `hooks/`, `utils/api.ts` (typed API client), `types/index.ts`.
- **Tests**: `tests/` (pytest; `conftest.py` uses in-memory SQLite, factory-boy factories in `tests/factories.py`), `frontend/src/**` (Vitest / Jest), `frontend/cypress/` (E2E).
- **CI**: `.github/workflows/`. Path-filtered pytest/vitest/jest/cypress jobs plus `status-gateway.yml`, the one required check.

## Gotchas

- **`npm run build` overwrites `static/`**: Vite builds to `../static` with `emptyOutDir: true`, and `static/` is tracked. Only build when the issue calls for it, and review the `static/` diff.
- **New API route prefixes need a Vite proxy entry** in `frontend/vite.config.ts` (`server.proxy`), or dev-mode calls hit the SPA. Frontend routes that share a prefix with API routes (e.g. `/vocabulary`) need the narrower per-path proxies used there.
- **Frontend test discovery gap (pre-existing)**: `npm run test` only runs the Storybook project in `vite.config.ts`, and Jest only matches `*.jest.test.*` / `__tests__/`. Plain `src/**/*.test.tsx` files are **not run by either** today. When you add frontend tests, confirm they're discovered (`npx vitest list --filesOnly`, or `npx jest --listTests`) and say in the PR how they ran.
- **Jest coverage excludes** several directories and files (see `frontend/jest.config.cjs`) because of TS compile issues. Don't assume pages, hooks or utils are covered.
- **Scenario data is duplicated**: IDs and names in `scenarios.py` are also hardcoded in `ScenarioSelector.tsx`, `ChatInterface.tsx` and `SessionDetail.tsx` (issue #126). Change them together.
- **`.venv` is optional**: the README suggests one, but CI uses system Python 3.12. Use `python3` either way.

## Commits & PRs

- Commit format: `{type}(#<issue>): <description>`, types `feat|fix|refactor|test|docs|chore`
- Commit SPDD artifacts, code, tests and README updates together on the issue branch
- PR title mirrors the commit style; body links the issue (`Closes #<n>`), lists changes, the AC checklist, test results and the SPDD artifact paths, plus screenshots for UI changes
- Squash-merge is preferred, but merging is the human reviewer's job
