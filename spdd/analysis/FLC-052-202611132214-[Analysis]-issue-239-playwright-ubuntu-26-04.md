# SPDD Analysis: Playwright Upgrade for Ubuntu 26.04 CI Runners

**GitHub Issue**: #239
**Issue Title**: CI: Vitest jobs fail installing Playwright browsers on Ubuntu 26.04 runners
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/239
**Artifact ID**: FLC-052-202611132214
**Created**: 2026-11-13 22:14
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> Both **Vitest Unit Tests** jobs (Node 20 and 22) fail in the "Install Playwright Browsers" step on every pull request. GitHub's `ubuntu-latest` runner now uses Ubuntu 26.04, which the pinned Playwright 1.60.0 does not support:
>
> ```
> Run npx playwright install --with-deps
> BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu26.04-x64 as a fallback.
> Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.60.0!
> Failed to install browsers
> Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
> Error: Process completed with exit code 1.
> ```
>
> Seen on PR #235 (run 43550210794). The last successful Vitest runs were on 2026-09-09, before the runner image changed.
>
> **Proposed fix:** upgrade `playwright` to a current 1.6x release that supports Ubuntu 26.04 and update the lockfile. Keep `ubuntu-latest`.
>
> **Acceptance criteria**
> - `playwright` in `frontend/package.json` / `package-lock.json` is upgraded to a version that supports Ubuntu 26.04
> - Both Vitest Unit Tests jobs (Node 20 and 22) pass the "Install Playwright Browsers" step and run the tests on a PR
> - `npm run test` passes locally with the upgraded version
> - No other dependency changes beyond what the upgrade requires
>
> **Out of scope:** Cypress, Jest, pytest jobs; upgrading Vitest, Storybook or other frontend dependencies.

---

## Background

`npm run test` runs the Storybook story tests in headless Chromium through `@vitest/browser-playwright` (`frontend/vite.config.ts`, `test.projects[0].browser.provider: playwright({})`). CI installs the browser with `npx playwright install --with-deps` (`.github/workflows/vitest-tests.yml:59-62`) on `runs-on: ubuntu-latest` (line 23). GitHub moved `ubuntu-latest` to Ubuntu 26.04 after the last green run (2026-09-09). Playwright 1.60.0 has no `ubuntu26.04` host platform, so it refuses to install Chromium and the job fails before any test runs. The failure blocks every PR that touches the frontend, including #235.

## Business Value

- Restores frontend test coverage in PR checks (the Vitest jobs feed the required `status-gateway` check).
- Unblocks PR #235 and all later frontend PRs.

---

## Scope In

- [ ] Upgrade the `playwright` dev dependency in `frontend/package.json` and `frontend/package-lock.json` (which brings `playwright-core` along)
- [ ] Verify locally: `npx playwright --version`, browser install, `npm run test`
- [ ] Verify in CI: both Vitest jobs pass on the PR

## Scope Out

- [ ] Workflow changes (keep `ubuntu-latest`; the browser cache key already changes when the lockfile changes)
- [ ] Upgrading Vitest, `@vitest/browser-playwright`, Storybook or any other package
- [ ] Cypress, Jest, pytest jobs (passing)
- [ ] Pre-existing `npx tsc -b` errors in `frontend/src/**`

---

## Acceptance Criteria (ACs)

1. **AC1**: **Given** `frontend/package.json` and `package-lock.json` **When** inspected **Then** `playwright` and `playwright-core` resolve to one version ≥ 1.61.1 that includes `ubuntu26.04-x64` support.
2. **AC2**: **Given** a PR **When** the Vitest workflow runs on `ubuntu-latest` (Ubuntu 26.04) for Node 20 and 22 **Then** "Install Playwright Browsers" succeeds and the tests run.
3. **AC3**: **Given** the upgraded version installed locally **When** `npm run test` runs **Then** it passes (same result as before the upgrade).
4. **AC4**: **Given** the lockfile diff **When** reviewed **Then** only `playwright` and `playwright-core` entries (and the `package.json` range) change.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Vitest Storybook project**: `frontend/vite.config.ts` (`test.projects`, browser `chromium` via `playwright({})`).
- **Playwright dependency**: `frontend/package.json:64` (`"playwright": "^1.60.0"`); lockfile `node_modules/playwright` and `node_modules/playwright-core` at 1.60.0 (`frontend/package-lock.json:13327-13350`).
- **Consumer**: `@vitest/browser-playwright@4.1.6` (peer dependency `playwright: "*"`), pulled in directly and by `@storybook/addon-vitest@10.4.0`.
- **CI workflow**: `.github/workflows/vitest-tests.yml` (matrix Node 20/22, Playwright browser cache keyed on `hashFiles('frontend/package-lock.json')`, `npx playwright install --with-deps`).

### New Concepts Required

None.

### Key Business Rules

- **Rule**: Playwright's Chromium build is tied to the Playwright version, so upgrading changes the browser too. Story tests must still pass.
- **Rule**: Prefer a release that has been out for a few weeks over one published today.

---

## Strategic Approach

### Solution Direction

1. `cd frontend && npm install -D playwright@1.64.1` (updates `package.json` to `^1.64.1` and the lockfile).
2. Confirm only `playwright` / `playwright-core` changed in the lockfile.
3. `npx playwright install chromium` and `npm run test` locally.
4. Push and confirm both Vitest jobs pass.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Upgrade Playwright vs pin `runs-on: ubuntu-24.04` | Pinning avoids a dependency change but freezes CI on an older image that GitHub will eventually retire, and the user asked for a dependency update | **Upgrade Playwright**, keep `ubuntu-latest` |
| Target version | 1.61.1 is the first release found with `ubuntu26.04` support; 1.65.1 was published today (2026-11-13); 1.64.1 (2026-10-14) is a month old and includes the support | **1.64.1** (latest patch of the previous minor, a month in the field) |
| Upgrade `@vitest/browser-playwright` too | Its peer range is `playwright: "*"`, so no upgrade is required | Leave it unchanged |

### Alternatives Considered

- **Pin `runs-on: ubuntu-24.04`**: rejected (see above).
- **`npx playwright install` without `--with-deps`**: rejected; the Ubuntu 26.04 check runs for the browser download itself ("does not support chromium on ubuntu26.04-x64"), and system dependencies are still needed.
- **Latest 1.65.1**: rejected for now because it was published today; 1.64.1 is enough to support Ubuntu 26.04.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Exact version | Issue says "a current 1.6x release" | 1.64.1, per the decision table |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Restored browser cache from the old version | `restore-keys` may restore a 1.60 browser | Harmless: `playwright install` downloads the browser revision 1.64.1 needs; the exact cache key changes with the lockfile |
| Node 20 vs 22 | Matrix runs both | Playwright 1.64 supports both (Node ≥ 18) |
| Newer Chromium changes rendering/behaviour in story tests | Could fail interaction tests | Run `npm run test` locally before pushing |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| `npm install` updates unrelated packages in the lockfile | Scope creep, surprise breakages | Review the lockfile diff; only `playwright`/`playwright-core` may change |
| Local machine (macOS) differs from CI (Ubuntu 26.04) | Local pass doesn't prove the CI install works | The CI run on the PR is the final check (AC2) |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Version ≥ 1.61.1 with Ubuntu 26.04 support | Yes | 1.64.1 verified to contain `ubuntu26.04-x64` deps |
| AC2 | CI install + tests pass | Yes | Verified on the PR run |
| AC3 | Local `npm run test` passes | Yes | |
| AC4 | Minimal lockfile change | Yes | Reviewed in diff |

**AC Coverage Summary**: 4 of 4 ACs are addressable.

**Implicit Requirements Not in ACs**:
- After merge, PR #235 needs a rebase on `main` to pick up the fix.

---

## REASONS Canvas

### Requirements
Upgrade Playwright so `npx playwright install --with-deps` works on Ubuntu 26.04; both Vitest jobs pass; local `npm run test` passes; minimal lockfile change.

### Examples
- Before: `npx playwright install --with-deps` on ubuntu26.04-x64 with 1.60.0 → "Playwright does not support chromium on ubuntu26.04-x64", exit 1.
- After: same command with 1.64.1 → Chromium and system dependencies installed; `npm run test` runs the Storybook project.
- `npx playwright --version` → `Version 1.64.1`.

### Architecture
Frontend dev tooling only: `frontend/package.json`, `frontend/package-lock.json`. CI workflow unchanged.

### Standards
Commit `fix(#239): …`; SPDD artifacts committed with the change; no unrelated dependency changes; report CI results honestly in the PR.

### Omissions
Workflow edits, other dependency upgrades, Cypress/Jest/pytest, pre-existing TypeScript errors.

### Notes
- Verified by downloading published `playwright-core` tarballs: 1.60.0 has no `ubuntu26.04` entries; 1.61.1, 1.62.0, 1.64.0 and 1.65.1 detect `ubuntu26.04` (`hostPlatform`) and list Chromium dependencies for `ubuntu26.04-x64`/`arm64`.
- Release dates: 1.64.1 on 2026-10-14; 1.65.0 on 2026-11-05; 1.65.1 on 2026-11-13.
- `@vitest/browser-playwright` peer dependency: `playwright: "*"`.

### Solutions
`npm install -D playwright@1.64.1` in `frontend/`, the standard way to bump a dev dependency and lockfile together.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
