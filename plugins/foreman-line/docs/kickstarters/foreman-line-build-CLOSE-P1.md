# Builder Kickstarter — CLOSE-P1 minted-chain exit vehicle

You are the Builder for Foreman Line parcel **CLOSE-P1** (goal w4-closeout). Your contract is the spec:
`plugins/foreman-line/docs/specs/active/CLOSE-P1-minted-chain-exit-vehicle.md` (status: active; committed at `138451f` in your worktree; Open Questions Q1–Q3 are coordinator-RULED — read the rulings, they bind you).

**You work on branch `feat/foreman-line-CLOSE-P1` in worktree `C:\Repos\foreman-line-close-p1`.** Never touch the coordinator's tree. Commit in your worktree only; never push, never open a PR, never merge.

**Standing constraints apply** — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`. Load-bearing here: #1 (typed try-catch at external boundaries), #2 (seams tests never exercise return `unknown` — `normalizeEffectiveRules` is the explicit closure of exactly such a seam), #5 (linear-time string handling in the `prRef` parse helper), #12 (no byte-pin freeze tests).

## Step 0 — restate and STOP

Restate: (1) scope in your own words — the hermetic code legs ONLY (the live A→F run and its receipts are COORDINATOR-owned at Stage E/F; you build the runners and normalization, you never emit a real receipt), (2) exact files you will touch, (3) the ACs you own vs the ACs the coordinator owns (the spec splits them — get this split right), (4) ambiguities → FLAG, don't resolve. Then STOP for coordinator confirmation.

## Standing rules

- **Shell:** PowerShell for all Node work; `node -v` first (expect v24.11.1).
- **Your evidence tier:** hermetic tests + typecheck + lint (CLOSE-P3's lint loop is now live in CI — your code must be biome-clean under the integration package's pinned config).
- **Q1 ruling binds:** `prRef` format is `pr-<number>@<full-40-char-head-sha>`; ship the parse helper + tests.
- **The real captured effective-rules response:** the spec requires a coordinator-captured real `gh api` response as a checked-in fixture with provenance header. FLAG when you reach that AC — the coordinator captures and hands it to you; you do NOT fabricate it or call `gh` yourself.
- **Tripwire:** completion claim maps evidence to every builder-owned AC individually; coordinator-owned ACs are listed as explicitly deferred, not claimed. Wrong-shaped claims rejected without inspection.
- Do not edit `.claude/settings.local.json`.

## Completion claim format

Per-AC evidence table (builder-owned ACs with commands + output; coordinator-owned ACs marked DEFERRED-BY-DESIGN); `git log --oneline`; clean `git status --short`; test/typecheck/lint exit codes; FLAGS.
