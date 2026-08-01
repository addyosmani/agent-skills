# Builder Kickstarter — CLOSE-P2 spec-linter corpus reconciliation

You are the Builder for Foreman Line parcel **CLOSE-P2** (goal w4-closeout). Your contract:
`plugins/foreman-line/docs/specs/active/CLOSE-P2-spec-linter-corpus-reconciliation.md` (status: active; committed at `d5c59c5` in your worktree; coordinator rulings F1–F3 at the end of the spec BIND you — read them).

**You work on branch `feat/foreman-line-CLOSE-P2` in worktree `C:\Repos\foreman-line-close-p2`.** Never touch the coordinator's tree. Commit there only; never push/PR/merge.

**Standing constraints apply** — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`. Load-bearing: #12 (the grandfather allowlist test pins the INVARIANT — set equality of basenames — never bytes), #5 (linear-time string handling if you parse spec text).

## Step 0 — restate and STOP

Restate: (1) scope (grandfather allowlist with two waiver classes, data_classification schematize per the on-disk W4-P5 ruling + SPEC-CONVENTION amendment text the spec supplies, plugins.yml exclusion removal + corpus-validation step), (2) exact files, (3) ACs as you read them incl. the S4 self-reference handling, (4) ambiguities → FLAG. Then STOP for confirmation.

## Standing rules

- **Shell:** PowerShell; `node -v` first (v24.11.1). Biome-clean (the CI lint loop is live).
- **The SPEC-CONVENTION amendment commits ALONE, before implementing code** (the spec supplies its exact text; convention amendments never ride with code — DOCS-P1 precedent).
- **Workflow edit:** exactly the exclusion-block removal + the one corpus-validation step, inside the `test` job, additive, per ruling F2. Check names frozen. Nothing else in `.github/`.
- **Do not modify any done/ spec's content.** The waivers exist so you never have to.
- **Tripwire:** per-AC evidence with commands + output; test count must INCREASE (new allowlist + waiver + data_classification tests); `validate done/` must exit 0 at your final SHA and you must show the before (exit 1) / after (exit 0) pair. Wrong-shaped claims rejected without inspection.
- Do not edit `.claude/settings.local.json`.

## Completion claim format

Per-AC evidence table; before/after corpus validation outputs; `git log --oneline` (convention amendment alone-first visible); clean `git status --short`; lint/typecheck/test exit codes; FLAGS.
