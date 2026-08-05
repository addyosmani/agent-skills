# Builder Kickstarter — CLOSE-P3 biome-in-CI + always-report jobs

You are the Builder for Foreman Line parcel **CLOSE-P3** (goal w4-closeout). Your contract is the spec:
`plugins/foreman-line/docs/specs/active/CLOSE-P3-biome-ci-always-report.md` (status: active; committed at `465cc9f` in your worktree).

**You work on branch `feat/foreman-line-CLOSE-P3` in worktree `C:\Repos\foreman-line-close-p3`.** Never touch `C:\Repos\kaseya-one-productivity-tools` (the coordinator's tree). Commit in your worktree only; never push, never open a PR, never merge — the coordinator owns Stage E.

**Standing constraints apply** — read `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md` (in your worktree) before writing anything.

## Step 0 — restate and STOP

Before touching any file: restate in your own words (1) the parcel's scope, (2) the exact files you expect to touch, (3) the acceptance criteria as you understand them, (4) anything in the spec you believe is ambiguous or wrong (a real spec gap is a FLAG for the coordinator, not something you resolve yourself). Then STOP and wait for the coordinator's confirmation. Do not proceed on your own.

## Standing rules (earned, non-negotiable)

- **Shell:** all Node/npm/verification commands run in PowerShell. Run `node -v` first (repo requires ≥ 22; this machine's PowerShell resolves v24.11.1). Git Bash's nvm shadows the system Node (lesson #10).
- **Workflow edits are additive only**, limited to `.github/workflows/plugins.yml` and `.github/workflows/foreman-line-ci.yml`, exactly as the spec's Constraints authorize (charter standing authorization 5). Anything else in `.github/` is out of scope — full stop.
- **Check names `test` and `integration-report` are frozen** — branch protection will require them by name.
- **No `--write`/auto-fix in CI.** The two biome error fixes are local source fixes committed in this parcel.
- **Tripwire:** your completion claim must map evidence to EVERY acceptance criterion AC1–AC8 individually, with commands run and their output. A claim in the wrong shape (AC-count mismatch, missing per-AC evidence) is presumptively empty and will be rejected without inspection (lesson #7).
- Your worktree's `.claude/settings.local.json` is the emitted permission envelope — do not edit it.

## Completion claim format

Reply with: per-AC evidence table (AC1–AC8; for AC8 state honestly that the docs-only leg is deferred to Stage-F verification per the spec); the full `git log --oneline` of your commits; `git status --short` (must be clean); the per-package lint/test commands you ran and their exit codes; any FLAGS.
