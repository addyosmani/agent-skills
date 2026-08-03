# w4-closeout — Plan-Level Adversarial Review Findings & Triage

**Review:** fresh adversarial session, 2026-07-28. **Verdict: RATIFY-WITH-AMENDMENTS** (3 BLOCKER, 4 SHOULD-FIX, 3 INFO).
**Coordinator reproduction:** B1 (`validator.ts:192-196` — `isSealed` checks only that the highest-sequence receipt is stage F), B2 (both workflows path-filtered: `plugins.yml` → `plugins/**`/`skills/**`/`packages/kds-spec/**`; `foreman-line-ci.yml` → `integration/**` only, self-declared non-blocking), and S1 (minted A→D chain exists at `docs/receipts/1912af36-…/000000-A…000013-D`) all reproduced on disk before triage.

| # | Finding | Ruling | Disposition |
|---|---|---|---|
| B1 | Exit item 1's pass (`validateChain`+`isSealed`) doesn't bind to A→F — recreates lesson #32 in the charter | **fix** | Exit item 1 amended: deterministic pass adds an explicit stage-sequence assertion (`['A','B','C','D','E','F']` in sequence order). Applied. |
| B2 | Requiring `test`+`integration-report` wedges every PR the path filters don't trigger — incl. this goal's own closure PRs | **fix (re-opens D4)** | D4 paired with a chartered workflow deliverable making both checks report on every PR before the hardening is applied. Ratified per Gate-1 re-open 2026-07-28. |
| B3 | Standing authorizations silent on live gating-workflow (`plugins.yml`) edits; predecessor canon classified the exclusion-removal human-only | **fix (re-opens authorizations)** | Ratified per Gate-1 re-open 2026-07-28 — see charter Standing authorizations item 5. |
| S1 | "Real run" undefined — emitters invoked against the existing A→D tip with hand-assembled subjects would pass; fixture wearing a disk path | **fix** | Exit item 1 amended: Stage-E receipt subject must name the real PR number + head SHA; Stage-F subject the real merge SHA; coordinator cross-checks both via `gh`. Applied. |
| S2a | Restated item 6 silently drops the W4 original's Jira transition ("on human merge: the Jira ticket transitions…") | **decision (re-opens scope)** | Ratified per Gate-1 re-open 2026-07-28 — see charter Deferred debts / D2. |
| S2b | Restated item 1 drops "binds even the coordinator's identity" — post-change verification must re-confirm `bypass_actors: []` | **fix** | Exit item 4 amended. Applied. |
| S3 | Repo-wide `biome check` impossible (15 nested-root configs); mechanism unpinned | **fix** | CLOSE-P3 one-liner pins per-package `npm run lint --if-present` loop in `plugins.yml`, mirroring the test loop. Applied. |
| S4 | P1/P3 Stage-F spec-moves land in `done/` before P2 lints it | **fix** | CLOSE-P2 AC amended: linter exits 0 over `done/` **as of its own final SHA**; P1/P3 specs coordinator-linted at their own closure. Applied. |
| Q3 | D6 unexamined: (a) coordinator-merged Stage-F seal vs the W4 criterion's "on human merge" semantics; (b) early D4 application voids Gate-3 mid-goal with no stop condition | **decision (re-opens D6)** | Ratified per Gate-1 re-open 2026-07-28 — see charter D6 + stop conditions. |
| I1 | `integration/src/index.ts` shared between P3 (lint fix) and P1 (new exports) | **accept-as-documented** | D5 serial order handles it; P1 runs under the stricter net P3 built. |
| I2 | `specs/done/` shorthand — actual path `plugins/foreman-line/docs/specs/done/` | **fix** | Path corrected. Applied. |
| I3 | All checkable factual claims verified true, incl. live ruleset state | **informational** | Noted. Predecessor loop-directive's "no minted chain exists anywhere" was overstated (A→D exists; E/F missing) — recorded here as the correction. |
