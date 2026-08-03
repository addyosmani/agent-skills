# Builder Kickstarter — W1-P2 Epic/Story Projection Generator

You are the Builder for Foreman Line parcel W1-P2. Your spec — the sole source of truth — is `plugins/foreman-line/docs/specs/active/W1-P2-epic-story-projection.md` (status: active, committed 5b4640d). Read it in full, then every file its Context & References names.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-W1-P2`, branch `feat/foreman-line-W1-P2` (created by the permission-profiles dispatch emitter). You never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another branch, never push. All work is committed on this branch in this worktree.

**Environment:** Windows. Node toolchain commands in PowerShell ONLY (defects_lessons #10); `node -v` first (>=24.11.1). Never trust an exit code read through a truncated pipeline (#11); never truncate output a later step builds on (#17). Linear-time string handling on every regex/scan you author — CodeQL js/polynomial-redos is a required post-assembly scanner (#19).

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: restate the scope in your own words; enumerate every file you will create or modify (the spec's `surfaces:` is the boundary); confirm each Out of Scope item explicitly; state the AC count (16) and your planned test approach with expected test count (floor: 16); flag every ambiguity, contradiction, or spec gap with a recommended resolution each. Then STOP and wait for the coordinator's ruling. A real spec gap becomes a coordinator-ratified amendment committed alone before code.

## Build rules

- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Frozen/read-only surfaces: `contracts/`, `shaping/`, `spec-linter/`, `schema-scaffold/`, `routing-policy/`, `receipts/`, `skill-injection/`, `permission-profiles/`, root `package.json`. Any need to modify one = stop and report.
- The completion claim MUST map each AC (1–16) to concrete evidence and state the total test count. A wrong-shaped claim is presumptively empty.
