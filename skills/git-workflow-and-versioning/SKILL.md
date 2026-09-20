---
name: git-workflow-and-versioning
description: Rules for commits, branches, pull requests, and merging — always raise a PR and never merge directly, never hold a PR for a security audit, regular merge commit versus squash (conflict flagged), delete remote and local branches, small working commits that never break the app, commit messages carrying model, thinking effort, harness, and ticket id, branch-per-ticket naming, PR template, PR size limits (~400 lines / 10 files), main always releasable, and the changelog line per merged task. Use when you commit, branch, open, update, or merge a PR, or write a commit message — even for a one-line change or "just push it". Use when making any code change, resolving conflicts, pushing to a remote, or when you need to organize work across multiple parallel streams. Use when cutting a release, choosing a semantic version bump, tagging, or writing a changelog.
category: delivery
---

# Git Workflow and Versioning

## Overview

Git is your safety net. Treat commits as save points, branches as sandboxes, and history as documentation. With AI agents generating code at high speed, disciplined version control is the mechanism that keeps changes manageable, reviewable, and reversible.

This skill holds the rules (P1–P16) and the git mechanics. The GitHub calls that carry them out are `github`; what a review produces is `../../references/merge-and-review.md`.

## When to Use

Always. Every code change flows through git. Whenever you commit, branch, open, update, or merge a PR, or write a commit message — even for a one-line change or "just push it".

## Commits

| ID | Rule |
| --- | --- |
| P1 | **Commits are small, working changes; every commit is usable or at least does not break the app.** Best effort: if a commit were pushed to production it should not cause any issue. This might not be true in all cases — sometimes the whole thing is pushed together — but wherever possible, even when not every commit goes to production, follow it at least in spirit. |
| P2 | Commits are small, **reference the tracker ticket**, and leave the repository runnable. **One coherent capability, contract, or verified behavior per commit; never "implement entire X".** |
| P3 | **A commit message carries the model, thinking effort, and harness**, plus the anatomy in `../../references/commit-and-pr.md`. Include the ticket id in the message. |
| P4 | The reasoning behind a change lives in the ticket; the ticket id lives in the code and the commit. |

### Commit early, commit often (P1, P2)

Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

Commits are save points. If the next change breaks something, you can revert to the last known-good state instantly.

```
# Good: Each commit is self-contained
git log --oneline
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: Everything mixed together
git log --oneline
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

### Keep concerns separate (P2)

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Each type of change should be a separate commit — and ideally a separate PR:

```
# Good: Separate concerns
git commit -m "refactor: extract validation logic to shared utility"
git commit -m "feat: add phone number validation to registration"

# Bad: Mixed concerns
git commit -m "refactor validation and add phone number field"
```

**Separate refactoring from feature work.** A refactoring change and a feature change are two different changes — submit them separately. This makes each change easier to review, revert, and understand in history. Small cleanups (renaming a variable) can be included in a feature commit at reviewer discretion.

### Message types (P3)

The `<type>` in the anatomy header explains the *why*, not just the *what*:

- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Tooling, dependencies, config

## Branches

| ID | Rule |
| --- | --- |
| P5 | **Branch per ticket named `<ticket>-<slug>`.** |
| P6 | Work in your own git worktree at the project root. |
| P7 | **Delete the remote and local branch after merge.** |

### Trunk-based development (P5, P7)

Work in short-lived branches off `main` (or the team's default branch), one per ticket, that merge back within 1-3 days. Long-lived development branches are hidden costs — they diverge, create merge conflicts, and delay integration. DORA research consistently shows trunk-based development correlates with high-performing engineering teams.

```
main ──●──●──●──●──●──●──●──●──●──  (always deployable)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱    ← PROJ-123-task-creation, PROJ-124-user-settings (1-3 days)
```

- **Dev branches are costs.** Every day a branch lives, it accumulates merge risk.
- **Release branches are acceptable** when you need to stabilize a release while main moves forward (P16).
- **Feature flags > long branches.** Prefer deploying incomplete work behind flags rather than keeping it on a branch for weeks.
- **One worktree per ticket** (P6) is how parallel agents work on one repository without switching branches.

## Pull requests

| ID | Rule |
| --- | --- |
| P8 | **Always raise a PR; never merge directly. Review may be made optional on the ticket.** There is no direct-merge exception for small changes. |
| P9 | **Never hold a PR for a security audit; the audit is a later ticket / next requirement.** |
| P10 | **Every task ships through a pull request with the PR template; reviewed-class PRs merge only on the discipline code reviewer's approval; every review comment is resolved by a commit or an explained reply.** |
| P11 | **A PR is never held open to grow.** Open it when the first verifiable slice is ready; at roughly **400 changed lines or 10 files, split it** — land the mechanical part, the contract, or the flagged-off skeleton first. A long-lived branch is a merge conflict accruing interest. |
| P12 | **Only a change that is deployable on its own merges**; `main` is always releasable. |
| P13 | **Every merged task adds a changelog line** (global and per service), written in the same change while the impact is fresh. |
| P14 | Reviewers create Linear issues for findings and comment on the PR while it is open. |

- One ticket per PR; the title starts with the ticket id; the PR links the ticket and the ticket links the PR (P2, P4).

## Merge

| ID | Rule |
| --- | --- |
| P15 | **Merge with a regular merge commit, not a squash**, so commit ids quoted in review threads stay findable. Never squash. Put the ticket id in the merge commit message. |
| P16 | Branching/merge defaults may be overridden when the service has a recorded reason (for example release branches). |

## The Save Point Pattern

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    ├── Makes another change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

This pattern means you never lose more than one increment of work. If an agent goes off the rails, `git reset --hard HEAD` takes you back to the last successful state.

## Change Summaries

After any modification, provide a structured summary. This makes review easier, documents scope discipline, and surfaces unintended changes:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

This pattern catches wrong assumptions early and gives reviewers a clear map of the change. The "DIDN'T TOUCH" section is especially important — it shows you exercised scope discipline and didn't go on an unsolicited renovation.

## Pre-Commit Hygiene

Before every commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. Run tests
npm test

# 4. Run linting
npm run lint

# 5. Run type checking
npx tsc --noEmit
```

Automate this with git hooks:

```json
// package.json (using lint-staged + husky)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Handling Generated Files

- **Commit generated files** only if the project expects them (e.g., `package-lock.json`, Prisma migrations)
- **Don't commit** build output (`dist/`, `.next/`), environment files (`.env`), or IDE config (`.vscode/settings.json` unless shared)
- **Have a `.gitignore`** that covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

## Using Git for Debugging

```bash
# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Git checkouts midpoints; run your test at each to narrow down

# View what changed recently
git log --oneline -20
git diff HEAD~5..HEAD -- src/

# Find who last changed a specific line
git blame src/services/task.ts

# Search commit messages for a keyword
git log --grep="validation" --oneline
```

## Release & Versioning

Releases follow semver and add a `CHANGELOG.md` entry listing the tickets. Commits are how *you* track change; a **version** is how your *consumers* track it. The moment anything else depends on your code — another team, a published package, a deployed client — "latest on main" stops being a sufficient answer to "what am I running, and is it safe to upgrade?" A version number and a changelog are the contract that answers it.

### Semantic Versioning

For anything with consumers, version `MAJOR.MINOR.PATCH` and let the number carry meaning:

```
  MAJOR  breaking change — consumers must change their code to upgrade
  MINOR  new functionality, backward-compatible — safe to upgrade
  PATCH  bug fix, backward-compatible — safe to upgrade
```

The number is a promise, so make the code match it. A "patch" that changes behavior consumers relied on is a major change wearing a disguise (Hyrum's Law; see `api-and-interface-design`). When unsure whether a change is breaking, assume it is; a surprise major is far cheaper than a broken consumer.

### Tag the release, and let the tag be the source of truth

A release is an immutable point in history, not a moving branch. Tag it so it can always be reproduced:

```bash
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

Derive the version from the tag rather than hand-editing it in scattered files, so the artifact, the tag, and the changelog can never disagree.

### Keep a changelog written for humans (P13)

A changelog is not `git log`. It's the curated, consumer-facing answer to "what changed and do I care?" — grouped by `Added / Changed / Fixed / Deprecated / Removed / Security`, newest on top, every entry phrased around user impact, not internal mechanics.

```markdown
## [1.4.0] - 2025-06-12
### Added
- Bulk task import via CSV
### Fixed
- Timezone drift in recurring task due dates
### Deprecated
- `GET /v1/tasks/all` — use the paginated `GET /v1/tasks` (removal in 2.0)
```

Write the entry in the same change that makes the change, while the impact is fresh — not reconstructed from commit archaeology at release time. Breaking changes get a migration note and a deprecation window; this section is the versioning contract that shipping consumes.

## Interaction with other skills

- `github` carries the GitHub calls for the PR, review, merge, and release rules here; `development-setup` carries the worktree procedure behind P6.
- `continuous-delivery` owns releasability and the changelog rule that P12 and P13 serve; `deprecation-and-migration` owns the migration window a breaking change needs; `shipping-and-launch` ships the release this section versions.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice (P1, P2). |
| "It's a one-line change, I'll merge it directly" | Always raise a PR; there is no direct-merge exception for small changes (P8). |
| "Let's hold the PR until the security audit is done" | Never hold a PR for a security audit; the audit is a later ticket (P9). |
| "I'll open the PR once there's enough to review" | A PR is never held open to grow; open it at the first verifiable slice and split at ~400 lines / 10 files (P11). |
| "Model, effort and harness lines are noise in a commit message" | The message carries the model, thinking effort, harness, and ticket id (P3); reviewers and future agents need them. |
| "The message doesn't matter" | Messages are documentation. Future you (and future agents) will need to understand what changed and why. |
| "I'll squash it all later" | Never squash: commit ids quoted in review threads must stay findable (P15). Squashing also destroys the development narrative. |
| "Branches add overhead" | Short-lived branches are free and prevent conflicting work from colliding. Long-lived branches are the problem — merge within 1-3 days. |
| "I'll split this change later" | Large changes are harder to review, riskier to deploy, and harder to revert. Split before submitting, not after (P11). |
| "I'll delete the branch some other time" | Delete the remote and local branch after merge (P7). |
| "I don't need a .gitignore" | Until `.env` with production secrets gets committed. Set it up immediately. |
| "It's just a small fix, bump the patch" | Check what consumers can observe. A behavior change they relied on is a major, whatever the diff size. |
| "The changelog is just the commit log" | Commits are for you; the changelog is for consumers, curated by impact. Generating one from raw commits buries what matters. |
| "We'll write the changelog at release time" | By then the impact is reconstructed from memory and half of it is missing. Every merged task adds its changelog line (P13). |

## Red Flags

- A change merged to `main` without a PR (P8)
- A PR waiting on a security audit (P9)
- A PR past ~400 changed lines or 10 files that has not been split (P11)
- A commit message without the ticket id, model, thinking effort, or harness (P3)
- A branch not named `<ticket>-<slug>`, or work done outside your own worktree (P5, P6)
- A squash merge, or a merge commit without the ticket id (P15)
- A branch left on the remote or locally after merge (P7)
- A merged task with no changelog line (P13)
- Large uncommitted changes accumulating
- Commit messages like "fix", "update", "misc"
- Formatting changes mixed with behavior changes
- No `.gitignore` in the project
- Committing `node_modules/`, `.env`, or build artifacts
- Long-lived branches that diverge significantly from main
- Force-pushing to shared branches
- A breaking change shipped under a minor or patch version bump
- A release with no tag, or a version number hand-edited out of sync with the tag
- A user-facing release with no changelog entry, or a changelog that's just dumped commit messages

## Verification

Before you push — checklist:

1. Does the app still run after this commit alone? (P1, P2, P12)
2. Is the diff one capability, under ~400 lines / 10 files? If not, split. (P2, P11)
3. Message has ticket id, model, thinking effort, harness. (P3, P2)
4. Unfinished paths behind a flag defaulting off or without an entry point. (P12)
5. Changelog line added. (P13)
6. PR opened from `<ticket>-<slug>` with the template; review required or explicitly optional per the ticket. (P5, P10, P8)
7. Never wait for a security audit. (P9)
8. On merge: regular merge commit with the ticket id; delete remote and local branch. (P15, P16)

For every commit, also:

- [ ] Tests pass before committing
- [ ] No secrets in the diff
- [ ] No formatting-only changes mixed with behavior changes
- [ ] `.gitignore` covers standard exclusions

For every release (anything with consumers):

- [ ] The version bump matches the change: breaking → major, additive → minor, fix → patch
- [ ] The release is tagged, and the version is derived from the tag, not hand-edited out of sync
- [ ] The changelog has a curated, human-readable entry grouped by impact for this version
