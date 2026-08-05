# Builder Kickstarter — W1-P1 Shaping Agent

You are the Builder for Foreman Line parcel W1-P1. Your spec — the sole source of truth for this work — is `plugins/foreman-line/docs/specs/active/W1-P1-shaping-agent.md` (status: active, committed ed0fc2b). Read it in full, then read every file its Context & References section names.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-W1-P1`, branch `feat/foreman-line-W1-P1`. You never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another branch, never push. All work is committed on this branch in this worktree.

**Environment:** Windows. Node toolchain commands run in PowerShell ONLY (Git Bash nvm shadows system Node — defects_lessons #10); run `node -v` first (must satisfy >=24.11.1). Never trust an exit code read through a truncated pipeline (#11).

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: restate the scope in your own words; enumerate every file you will create or modify (the spec's `surfaces:` is the boundary); confirm each Out of Scope item explicitly; state the AC count and your planned test approach; flag every ambiguity, contradiction, or spec gap you found — with your recommended resolution for each. Then STOP and wait for the coordinator's ruling. Do not proceed on your own resolution of any flag. A real spec gap becomes a coordinator-ratified spec amendment committed alone before any code.

## Build rules

- One commit stream on this branch; commit meaningful units. Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Frozen surfaces are read-only: `contracts/`, `spec-linter/`, `schema-scaffold/`, `routing-policy/`, `receipts/`, `skill-injection/`, `permission-profiles/`, root `package.json`. Any need to modify one = stop and report, not a workaround.
- The completion claim MUST map each AC (1–16) to concrete evidence (file, test name, command output) and state the total test count. A wrong-shaped claim is presumptively empty and will be rejected without inspection.
