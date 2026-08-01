---
ticket: KEO-59
title: P0V portable semantic claims-validation repair
status: done
owner: clint.morgan
created: 2026-07-29
updated: 2026-07-29
supersedes: null
risk: elevated
surfaces:
  - package.json
  - scripts/claims/claim-id-lint.mjs
  - scripts/claims/claim-id-lint.test.mjs
routing_class: architecture/risk
permission_profile: builder-architecture
data_classification: internal
---

# KEO-59 — P0V Portable Semantic Claims-Validation Repair

## Intent

Repair the existing `keon-docs` claim-ID validation gate so its strict mode is
portable on Windows and detects actual structured claim declarations instead
of every governance sentence containing the word `claim`.

P0V is a bounded verification prerequisite before P0 Gate 3. It must preserve
canonical and malformed-ID enforcement, add deterministic black-box regression
tests, and make the repository's existing aggregate `claims:check` command
green without changing any product claim, claim registry, proof map, canon, or
P0 governance wording.

## Constraints

1. Start from current `keon-docs` `origin/main` at
   `807f01b364e1290a8058109f63556c0d8b2b61ff` in a new isolated worktree and
   `codex/keon-proof-led-p0v-claims-validation` branch.
2. Edit exactly the three Allowed Files. Do not edit `package-lock.json`, add a
   dependency, or modify the P0 worktree.
3. Make `--strict` the platform-portable npm-script interface.
   `REQUIRE_CANONICAL=1` remains supported for backward compatibility, but npm
   scripts may not depend on POSIX inline environment syntax.
4. Preserve the canonical ID contract
   `\bKS-[A-Z0-9]{2,32}-\d{3}\b` and all existing malformed-ID rejection
   categories.
5. Strict missing-ID enforcement applies only to a structured Markdown claim
   declaration:
   - a line whose leading content, after optional whitespace, blockquote, or
     list markers and an optional GFM task marker (`[ ]`, `[x]`, or `[X]`), is
     the exact label `Claim:` or `Claim ID:`, optionally Markdown-bolded. Both
     `**Claim:**` and `**Claim**:` forms (and underscore equivalents) are
     supported; or
   - a Markdown table row whose first non-empty cell is the explicit
     colon-bearing label `Claim:` or `Claim ID:`, optionally Markdown-bolded.
     A schema/header cell such as `| Claim |` is not a declaration.
6. A structured declaration passes only when a canonical ID occurs on that
   same line. A malformed ID remains a failure.
7. Prose that discusses claim governance, claims registries, public-claim
   boundaries, falsification, blocked claims, or the word `KS` without
   declaring a claim is not a structured declaration and must not be flagged
   merely for those words.
8. Do not add broad ignore paths, baseline snapshots, waivers, magic
   line-number exclusions, P0-specific exceptions, or a list of currently
   failing files.
9. Tests must execute the real CLI as a subprocess against temporary Markdown
   workspaces. Tests may not reimplement the linter's regular expressions as
   their oracle.
10. Preserve exit-code behavior: zero on a clean scan and non-zero when any
    canonical or strict violation exists.
11. The portable drift wrapper may supply canonical repository paths only when
    `CLAIMS_REGISTRY_PATH` or `PROOF_MAP_PATH` is absent. Caller-supplied
    overrides remain authoritative and may not be overwritten.
12. Do not change D1-D9, the P0 branch, Linear, commercial gates, public claims,
    payment state, or any external system.
13. Gate 3 remains withheld. P0V evidence permits only a parcel-specific merge
    decision request.

## Acceptance Criteria

1. `git diff --name-only origin/main` contains exactly:
   - `package.json`
   - `scripts/claims/claim-id-lint.mjs`
   - `scripts/claims/claim-id-lint.test.mjs`
2. `claims:lint:strict` invokes the linter with `--strict` and runs unchanged
   from the default Windows PowerShell/npm environment.
3. `claims:lint:test` runs the Node black-box test suite, and `claims:check`
   includes that suite before strict lint and drift validation.
4. Strict mode is enabled by either `--strict` or
   `REQUIRE_CANONICAL=1`; default mode remains non-strict.
5. Black-box fixtures prove:
   - ordinary governance prose containing `claim`, `claims`, public-claim
     boundaries, and `KS` passes strict mode;
   - `Claim: text`, `Claim ID: text`, their bold/list/blockquote forms, and
     colon-bearing first-cell Markdown table forms fail without a canonical
     ID;
   - bold forms with the colon inside or outside the strong span and GFM task
     list forms all enforce the same declaration contract;
   - those declaration forms pass with a canonical ID on the same line;
   - an existing schema/header form such as
     `| Claim | Public wording | Evidence |` passes strict mode without an ID;
   - every existing malformed-ID category fails in default and strict modes;
   - multiple offending declaration lines are all reported deterministically;
   - environment-variable strict mode remains compatible.
6. A black-box package-script test proves a caller-supplied nonexistent drift
   override is preserved and causes a non-zero drift result rather than being
   silently replaced by repository defaults.
7. `rtk npm run claims:check` passes in the pristine P0V worktree under the
   default Windows command environment.
8. Running the P0V linter in `--strict` mode with the P0 worktree as the current
   working directory passes all Markdown there, including the exact ratified
   D1-D9 governance wording. Running P0's underlying drift checker with the
   same canonical default paths installed by P0V also passes. After P0V is
   merged and P0 rebases onto it, P0 must run stock `rtk npm run claims:check`
   and pass before P0 Gate 3; that post-merge/rebase run is not claimed by the
   pre-merge P0V worktree.
9. No canonical claim ID, claim registry, proof map, claim prose, P0 file,
   package dependency, or lockfile changes.
10. `git diff --check origin/main...HEAD` passes and the worktree contains no
   unapproved tracked or untracked file.
11. Two independent adversarial reviewers find no unresolved blocker,
    including no false-negative regression for structured claim declarations
    and no hidden P0-specific waiver.

## Out of Scope

- Changing canonical claim-ID syntax or introducing a new claim taxonomy.
- Editing claims, packaging, proof, capability, product, or Ledgerline canon.
- Migrating the repository's prose or attaching IDs to governance statements.
- Editing P0's charter/tracker implementation or changing its acceptance
  criteria.
- Adding dependencies, cross-platform environment packages, baselines,
  allowlists, file exceptions, or warning-only behavior.
- Mutating Linear, opening a PR, pushing, merging, publishing, deploying, or
  performing any customer/external action.
- Editing any file outside the Allowed Files section.

## Context & References

- Authorization and dependency amendment:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- Coordinator state:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- P0 contract:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/specs/active/KEO-59-proof-led-control-plane-reconciliation.md`
- P0 worktree:
  `D:/Repos/keon-omega/_worktrees/keon-proof-led-p0-20260729`
- Existing linter: `scripts/claims/claim-id-lint.mjs`
- Aggregate scripts: `package.json`

## Allowed Files

- `package.json`
- `scripts/claims/claim-id-lint.mjs`
- `scripts/claims/claim-id-lint.test.mjs`

## Verification Plan

Run from the isolated P0V worktree:

```powershell
rtk git ls-remote origin refs/heads/main
rtk git rev-parse origin/main
rtk git status --short --branch
rtk npm install --ignore-scripts
rtk npm run claims:lint:test
rtk npm run claims:lint
rtk npm run claims:lint:strict
rtk npm run claims:drift
rtk npm run claims:check
rtk git diff --name-only origin/main
rtk git diff --check origin/main -- package.json scripts/claims/claim-id-lint.mjs scripts/claims/claim-id-lint.test.mjs
rtk git diff --exit-code origin/main -- package-lock.json canon/claims
```

Then run the P0V linter executable with
`D:/Repos/keon-omega/_worktrees/keon-proof-led-p0-20260729` as the current
working directory and `--strict`; require exit zero. In that P0 working
directory, run the underlying drift checker with
`CLAIMS_REGISTRY_PATH=canon/claims/CLAIMS_REGISTRY.yaml` and
`PROOF_MAP_PATH=canon/claims/PROOF_MAP.yaml`; require exit zero. After P0V
merges and P0 rebases, stock `rtk npm run claims:check` in P0 becomes a fresh
mandatory Gate 3 check.

Both independent reviewers must answer these focus questions:

1. Does the declaration grammar catch every supported `Claim:` and
   `Claim ID:` form, including colon-inside/colon-outside bold and GFM task-list
   forms, without treating schema/header rows or governance prose as
   declarations?
2. Do malformed canonical IDs still fail in both default and strict modes?
3. Is strict invocation platform-portable without a new dependency or
   lockfile change, and are caller-supplied drift-path overrides preserved?
4. Do the black-box tests execute the real CLI against temporary workspaces
   without duplicating its implementation?
5. Is there any baseline, path, line-number, P0-specific, or warning-only
   waiver hidden in the implementation?
