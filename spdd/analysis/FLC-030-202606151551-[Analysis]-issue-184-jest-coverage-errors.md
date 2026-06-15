# SPDD Analysis: Fix jest coverage collection errors

**GitHub Issue**: #184
**Issue Title**: Fix jest coverage collection errors
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/184
**Artifact ID**: FLC-030-202606151551
**Created**: 2026-06-15 15:51
**Author**: Mistral Vibe

---

## Original Business Requirement

From GitHub issue #184:

When running `npm run test:jest:coverage`, jest attempts to collect coverage from all TypeScript files in the project, but encounters compilation errors in many files that are not meant to be tested with jest.

### Problem

The current jest configuration has `collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', ...]` which includes files that:
1. Have TypeScript errors (unused variables, type mismatches)
2. Import CSS files (not supported in jest environment)
3. Use browser-specific APIs not available in jsdom

### Solution

Update jest.config.cjs to limit coverage collection to only files that are compatible with jest testing:
1. Only collect coverage from files that are specifically written for jest (or are simple enough to compile)
2. Exclude files with known incompatibilities (CSS imports, browser APIs, etc.)
3. Use a more targeted pattern

---

## Acceptance Criteria (ACs)

From GitHub issue #184:

1. **AC1**: `npm run test:jest` runs without errors
   **Given** the jest configuration is updated
   **When** running `npm run test:jest`
   **Then** all tests pass without compilation errors

2. **AC2**: Coverage report is generated for the sample test file
   **Given** the jest configuration is updated
   **When** running `npm run test:jest:coverage`
   **Then** a coverage report is generated

3. **AC3**: No TypeScript compilation errors during coverage collection
   **Given** the jest configuration is updated
   **When** running `npm run test:jest:coverage`
   **Then** there are no TypeScript compilation errors

4. **AC4**: Documentation updated with coverage instructions
   **Given** the fix is implemented
   **When** reviewing README.md
   **Then** it contains instructions for running jest with coverage

---

## Background

This project uses two test frameworks:
- **Jest**: For unit and component tests (with @testing-library/react)
- **Vitest**: For other frontend tests (already configured separately)

The jest configuration was initially set up in issue #26 (jest-msw-setup) but the coverage collection was too broad, including files like:
- `main.tsx` - imports CSS files and uses `document.getElementById`
- Various component files that use browser APIs directly
- Files with TypeScript errors

This causes jest to fail when trying to collect coverage from these files.

---

## Business Value

- Enables jest coverage collection to work properly
- Allows developers to run jest tests with coverage for debugging
- Supports the project's 80% test coverage requirement
- Maintains the ability to use both jest and vitest in parallel

---

## Scope In

- [ ] Update jest.config.cjs `collectCoverageFrom` pattern
- [ ] Exclude files with CSS imports
- [ ] Exclude files with browser-specific APIs that aren't mocked
- [ ] Ensure coverage can be collected from testable files
- [ ] Verify existing jest tests still pass
- [ ] Update documentation with coverage instructions

## Scope Out

- [ ] Fixing TypeScript errors in non-test files (separate task)
- [ ] Adding new tests (separate task)
- [ ] Modifying vitest configuration (separate issue #185)
- [ ] Fixing storybook-related files (separate task)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **jest.config.cjs**: Jest configuration file at `frontend/jest.config.cjs`
- **Test files**: Files matching `**/*.jest.test.[tj]s?(x)` pattern
- **MSW mocks**: Mock handlers in `src/mocks/` directory
- **setupTests.ts**: Jest setup file at `src/setupTests.ts`
- **testSetup.ts**: Additional test setup at `src/testSetup.ts`

### New Concepts Required

- **Targeted coverage pattern**: A glob pattern that only includes files safe for jest coverage collection

### Key Business Rules

- Coverage should only be collected from files that can be processed by ts-jest without errors
- Files with CSS imports should be excluded from coverage
- Files using browser APIs without proper mocking should be excluded
- Test files themselves should not be included in coverage (they are the test, not the code under test)

---

## Strategic Approach

### Solution Direction

1. Identify which files currently cause errors during coverage collection
2. Update `collectCoverageFrom` to use a more restrictive pattern
3. Explicitly exclude problematic directories and file patterns
4. Test the updated configuration
5. Update documentation

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Pattern approach** | More maintainable vs more explicit | Use pattern-based exclusion (more maintainable) |
| **Coverage scope** | Broader coverage vs fewer errors | Start with safe files only, expand later |
| **Exclusion list** | Manual maintenance vs auto-detection | Use explicit exclusion list |

### Alternatives Considered

- **Alternative 1**: Use `collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.{stories,test,spec}.{ts,tsx}', '!src/**/*.d.ts']` - Too broad, doesn't solve the CSS/browser API issue
- **Alternative 2**: Use a allow-list instead of deny-list - More explicit but requires updating when new testable files are added
- **Alternative 3**: Create a separate tsconfig for coverage - More complex, not necessary

**Chosen**: Update the current pattern to add specific exclusions for known problematic files and directories

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Files that are not meant to be tested with jest" | Which specific files? | Exclude files with CSS imports, browser APIs, and TypeScript errors |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| New files added that import CSS | Could break coverage collection | Exclude all `styles/` directory |
| Files with conditional browser API usage | May or may not cause errors | Test and add to exclusion if needed |
| TypeScript errors in source files | Will cause coverage collection to fail | These should be fixed separately, but exclude for now |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Over-exclusion reduces coverage | Low coverage numbers | Start conservative, expand as issues are fixed |
| Under-exclusion causes errors | Tests still fail | Add specific exclusions for known problematic files |
| Pattern too restrictive | Misses important files | Test coverage collection, verify important files are included |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | `npm run test:jest` runs without errors | Yes | Need to verify |
| AC2 | Coverage report generated for sample test file | Yes | Need to verify |
| AC3 | No TypeScript compilation errors during coverage | Yes | Need to verify |
| AC4 | Documentation updated | Yes | Add to README.md |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Existing jest tests should continue to pass
- Configuration should be maintainable

---

## REASONS Canvas

### Requirements
From GitHub issue #184 acceptance criteria:
- [ ] `npm run test:jest` runs without errors
- [ ] Coverage report is generated for the sample test file
- [ ] No TypeScript compilation errors during coverage collection
- [ ] Documentation updated with coverage instructions

### Examples

**Current failing command:**
```bash
npm run test:jest:coverage
# Results in TypeScript compilation errors from files with CSS imports
```

**Expected working command:**
```bash
npm run test:jest:coverage
# Runs successfully and generates coverage report
```

### Architecture

**Current jest configuration location:** `frontend/jest.config.cjs`

**Key configuration sections:**
- `collectCoverageFrom`: Array of glob patterns for coverage collection
- Currently: `['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts', '!src/**/*.config.*', '!src/**/__tests__/**', '!src/**/*.test.*', '!src/**/*.spec.*', '!src/**/*.stories.*']`

**Project structure:**
```
frontend/
├── src/
│   ├── components/        # React components (some may have issues)
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   ├── styles/            # CSS files (should be excluded)
│   ├── mocks/             # MSW mocks (for testing)
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point (imports CSS, uses document)
│   └── ...
├── jest.config.cjs        # Configuration to update
└── tsconfig.jest.json     # TypeScript config for jest
```

### Standards

- Must follow existing jest configuration patterns
- Must maintain backward compatibility with existing tests
- Must meet 80% test coverage requirement for testable files
- Must use glob patterns for file matching
- Exclusions should be explicit and documented

### Omissions

**Explicitly out of scope:**
- Fixing TypeScript errors in non-test files
- Adding new tests
- Modifying vitest configuration
- Modifying babel/jest transform configuration
- Fixing issues in storybook files

### Notes

- The issue is specifically with `collectCoverageFrom` in jest.config.cjs
- Files like `main.tsx` import CSS which ts-jest cannot handle without additional configuration
- Files like `main.tsx` use `document.getElementById` which is available in jsdom but may cause issues in certain contexts
- The `testMatch` pattern already correctly identifies test files: `**/*.jest.test.[tj]s?(x)`
- Coverage should be collected from source files, not test files
- The msconfig (MSW configuration) is not related to this issue

### Solutions

**Reference implementations:**
- See existing jest configuration in `frontend/jest.config.cjs`
- Look at issue #26 (jest-msw-setup) for initial setup
- Look at issue #185 (vitest-workflow) for parallel testing setup

**Pattern to follow:**
- Add specific exclusions to `collectCoverageFrom` array
- Exclude directories known to have problematic files: `styles/`, `mocks/`
- Exclude entry point files: `main.tsx`, `App.tsx`
- Exclude files with known issues (to be identified)

**Files to exclude from coverage:**
1. `src/styles/**` - Contains CSS files
2. `src/mocks/**` - MSW mock configuration (not application code)
3. `src/main.tsx` - Entry point with CSS imports and browser APIs
4. `src/testSetup.ts` - Test setup file (not application code)
5. `src/setupTests.ts` - Jest setup file (not application code)
6. `**/*.stories.tsx` - Storybook files (already excluded)
7. `**/*.test.*` - Test files (already excluded)
8. `**/*.spec.*` - Test files (already excluded)

**Files to potentially exclude if they cause issues:**
- `src/components/*.tsx` - Some may have browser API usage
- Individual files with TypeScript errors

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
