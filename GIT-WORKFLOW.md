# Git Workflow Strategy

*Strategy: GitHub Flow with Issue-Based Branching*  
*Last updated: May 2026*

## 🎯 Overview

This project uses **GitHub Flow** with **issue-based branching**: one dedicated branch per GitHub issue, created from `main`, merged back via Pull Request.

**Core Principle:** Every change starts with a GitHub issue and has its own isolated branch.

---

## 📋 Workflow Steps

### 1. **Before You Code**

**Always start with a GitHub issue.**

- [ ] Identify or create the issue in GitHub
- [ ] Read the issue carefully (description, acceptance criteria)
- [ ] Check the milestone and priority
- [ ] Verify no duplicate or blocking issues exist

**If no issue exists:**
```bash
# Create the issue first via GitHub UI or gh CLI
gh issue create --title "..." --body "..." --label "..." --milestone "..."
```

---

### 2. **Create Feature Branch**

**Branch naming convention:**
```
{type}/issue-{number}-{short-description}
```

| Type | Prefix | When to Use |
|------|--------|-------------|
| New feature | `feature/` | Adding new functionality |
| Bug fix | `fix/` | Fixing a defect |
| Refactor | `refactor/` | Code restructuring, no new features |
| Test | `test/` | Test-only changes |
| Documentation | `docs/` | Documentation updates |
| Chore | `chore/` | Maintenance tasks (dependencies, config) |

**Examples:**
- `feature/issue-42-grammar-lessons`
- `fix/issue-21-session-filtering`
- `refactor/issue-12-conversation-module`
- `test/issue-15-infra-pytest`

**Create the branch:**
```bash
# From main, create and checkout new branch
git checkout main
git pull origin main
git checkout -b feature/issue-42-grammar-lessons

# Push to remote (creates tracking branch)
git push -u origin feature/issue-42-grammar-lessons
```

---

### 3. **Develop the Feature**

**Make changes following SPDD methodology:**

1. **Context Gathering** (from SPDD.md)
   - Review relevant code
   - Check VISION.md and README.md
   - Understand existing patterns

2. **Structured Development**
   - Implement code changes
   - Write tests (80% coverage required)
   - Update documentation

3. **Frequent Commits**
   - Small, focused commits
   - Clear commit messages
   - Reference issue number in commit message

**Commit message format:**
```
{type}(#{issue-number}): {brief description}

{optional body with details}
```

**Examples:**
```bash
# Good commit messages
git commit -m "feat(#42): add grammar lesson schema"
git commit -m "test(#42): add validation tests for lessons"
git commit -m "docs(#42): update README with grammar feature"

# Bad commit messages (avoid)
git commit -m "fixed stuff"  # No issue reference, vague
git commit -m "WIP"         # No context
```

---

### 4. **Keep Branch Updated**

Regularly merge latest `main` into your feature branch:

```bash
# From your feature branch
git fetch origin
git merge origin/main

# Or use rebase (preferred for clean history)
git fetch origin
git rebase origin/main
```

**Resolve conflicts locally** before pushing.

---

### 5. **Final Review Before PR**

Before creating a Pull Request:

- [ ] All acceptance criteria from the issue are met
- [ ] All tests pass (80%+ coverage)
- [ ] Code follows existing patterns
- [ ] Documentation updated (README.md, docstrings, etc.)
- [ ] No sensitive data (API keys, passwords) in code
- [ ] Branch merges cleanly with `main`
- [ ] Only necessary changes included (no unrelated files)

**Clean up commits:**
```bash
# Interactive rebase to squash/fixup
git rebase -i origin/main

# Or amend the last commit
git commit --amend
```

---

### 6. **Create Pull Request**

**Via GitHub UI (recommended):**
1. Go to GitHub → repository → Pull Requests
2. Click "New pull request"
3. Select your branch as the compare branch
4. Select `main` as the base branch
5. Fill in PR template (if exists)
6. Link to the original issue
7. Add reviewers if applicable

**Via gh CLI:**
```bash
gh pr create \
  --title "feat(#42): Grammar lesson feature" \
  --body "## Description
Implements issue #42: Create grammar lesson functionality.

## Changes
- Added lesson schema
- Created LessonBrowser component
- Added API endpoints

## Acceptance Criteria
- [x] All criteria from #42 met
- [x] Tests pass at 80%+
- [x] Documentation updated

## Related Issue
Fixes #42" \
  --base main \
  --head feature/issue-42-grammar-lessons
```

---

### 7. **Code Review & Merge**

**Required before merge:**
- [ ] All tests pass in CI
- [ ] At least one approval from human reviewer
- [ ] All PR comments addressed
- [ ] Acceptance criteria verified

**Merge strategy:**
- Use **Squash and Merge** (recommended for clean history)
- Or **Merge Commit** (if you want to preserve commit history)
- Avoid **Rebase and Merge** (can cause issues with worktrees)

**After merge:**
```bash
# Delete local branch
git branch -d feature/issue-42-grammar-lessons

# Delete remote branch
git push origin --delete feature/issue-42-grammar-lessons
```

---

## 🌳 Optional: Git Worktrees for Parallel Development

If working on multiple issues simultaneously, use **git worktrees** to avoid stashing:

```bash
# List existing worktrees
git worktree list

# Add a new worktree for issue 43
git worktree add ~/code/french-issue-43 feature/issue-43-vocab
cd ~/code/french-issue-43
# ... work on issue 43 ...

# Switch back to main worktree
cd ~/code/french-language-coach

# Remove worktree when done
git worktree remove ~/code/french-issue-43
```

**Worktree best practices:**
- Use descriptive directory names (include issue number)
- Remove worktrees when no longer needed
- Don't nest worktrees inside each other
- All worktrees share the same `.git` directory

---

## 📊 Branch Management

### Current Branches
```bash
# List all branches
git branch -a

# Show branches with last commit
git for-each-ref --sort=-committerdate refs/heads/ --format='%(committerdate:short) %(refname:short) %(committername)'
```

### Cleanup
```bash
# Delete local branches that are merged
git branch --merged | grep -v "\*\|main\|develop" | xargs git branch -d

# Delete remote branches that are merged
git remote prune origin
```

---

## 🚨 Emergency Situations

### Need to switch branches with uncommitted changes?
```bash
# Option 1: Stash changes
git stash
git checkout other-branch
git stash pop

# Option 2: Use worktree (no stashing needed)
git worktree add ../temp-branch other-branch
cd ../temp-branch
# ... work ...
cd ../original-repo
git worktree remove ../temp-branch
```

### Accidentally committed to wrong branch?
```bash
# Reset the branch but keep changes
git reset --soft HEAD~1

# Or cherry-pick to correct branch
git checkout correct-branch
git cherry-pick wrong-branch-commit
```

---

## 📚 Examples

### Example 1: New Feature (Issue #42)
```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/issue-42-grammar-lessons

# 3. Make changes, commit
git add .
git commit -m "feat(#42): add grammar lesson schema"
git push -u origin feature/issue-42-grammar-lessons

# 4. Create PR
gh pr create --title "feat(#42): Grammar lessons" --body "..." --base main

# 5. After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/issue-42-grammar-lessons
git push origin --delete feature/issue-42-grammar-lessons
```

### Example 2: Bug Fix (Issue #21)
```bash
# 1. Create fix branch
git checkout main
git pull origin main
git checkout -b fix/issue-21-session-filtering

# 2. Fix the bug, commit
git add routers/sessions.py
git commit -m "fix(#21): correct date filtering logic"
git push -u origin fix/issue-21-session-filtering

# 3. Create PR
gh pr create --title "fix(#21): Session date filtering" --base main
```

### Example 3: Using Worktrees for Multiple Issues
```bash
# Main worktree - working on issue 42
git checkout feature/issue-42-grammar-lessons

# Add worktree for issue 43
git worktree add ~/code/french-43 feature/issue-43-vocab
cd ~/code/french-43
# ... work on issue 43 ...

# Switch back to issue 42
cd ~/code/french-language-coach

# Cleanup when done
git worktree remove ~/code/french-43
```

---

## ✅ Quality Checklist

Before merging any PR:

- [ ] Branch follows naming convention
- [ ] Branch is based on `main`
- [ ] All acceptance criteria from GitHub issue are met
- [ ] All tests pass (80%+ coverage)
- [ ] Code follows existing patterns
- [ ] No sensitive data committed
- [ ] Documentation updated
- [ ] PR description links to issue
- [ ] PR has been reviewed and approved

---

## 🔗 References

- [GitHub Flow Guide](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub CLI (gh)](https://cli.github.com/)

---

## 💡 Tips

1. **Small branches, frequent PRs** - Keep branches short-lived (hours/days, not weeks)
2. **One issue per branch** - Never combine unrelated issues in one branch
3. **Rebase, don't merge** - Keep history clean by rebasing onto main
4. **Squash and merge** - Prefer squash merges for feature branches
5. **Delete merged branches** - Keep the branch list clean
6. **Use gh CLI** - Faster than GitHub UI for common operations

---

*This workflow ensures traceability, isolation, and quality for all changes, especially AI-assisted development.*
