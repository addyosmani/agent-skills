# Goal Charter — w4-closeout

**Status:** FULLY RATIFIED — Gate 1 (D1–D6) ratified 2026-07-28 11:17 EDT; plan-adversarial review complete (RATIFY-WITH-AMENDMENTS — `plan-review-findings.md`, all amendments applied); scoped Gate-1 re-open (D4, D6, authorizations, Jira-leg scope) **RE-RATIFIED 2026-07-28 11:35 EDT** (Clint, all four recommendations). Standing authorizations IN FORCE.
**Coordinator:** this session (Clint-launched, 2026-07-28). One goal, one coordinator.
**Predecessor:** `w4-ci-integration` (COMPLETE 2026-07-28; exit items 1 and 6 recorded OPEN at closure — this goal exists to close them and clear the accepted hygiene debt).

## Objective

Close out Wave 4 completely: satisfy the two exit conditions W4 honestly recorded as OPEN (item 6 — minted receipt chain; item 1 — config-proven merge protection), reconcile the spec-linter corpus (W4-P5), and put biome into CI so the two defect classes that landed on main because CI never ran it cannot recur.

## Locked decisions

| # | Decision | Reasoning |
|---|---|---|
| D1 | Single goal covering minted-chain, W4-P5, and biome-CI; FUP-1 / FUP-3 / W4-FUP-AUDIT are **deferred debts**, out of scope | Stage Zero ruling (Clint, 2026-07-28). Items are small, related, and share one paper trail; the deferred three each need spec amendments and have no caller pressure yet. |
| D2 | Exit item 6 is satisfied **only** by real receipts persisted on disk with `validateChain` AND `isSealed` passing over the minted chain — never by fixtures | Lesson #33: a criterion naming a produced artifact is not closable by a fixture imitating one. "Zero self-graded claims" is inherited from the W4 charter verbatim. |
| D3 | CLOSE-P1 carries the live-wiring cluster as one parcel: FUP-2 (route Stage F through the real `emitClosureReceipt`), RW3 (caller passes chain-tip), W4-P1-FUP-1 (GitHub-JSON → `EffectiveRulesResponse` normalization at the live boundary) | These are the same seam — the injected-write/live-fetch boundary no test has ever exercised (lesson #28). Splitting them creates parcels that silently collide on the same files. |
| D4 | Ruleset hardening (required_status_checks `test` + `integration-report` on ruleset 19402394; approval count ≥ 1) is applied by Clint **LAST**, after all three parcels merge; the coordinator verifies via the effective-rules API (lesson #15) and only then records exit item 1 CLOSED. **Precondition (B2, re-ratified):** CLOSE-P3 first ships always-report jobs so both named checks report a conclusion on every PR to main — the hardening is not safe to apply until that parcel is merged. | Raising `required_approving_review_count` above 0 config-blocks the Gate-3 standing authorization itself — an agent could no longer merge behind a green chain. Sequencing it last keeps the loop executable and makes the hardening the goal's final, human, structural act. Both target checks are path-filtered today; requiring them without always-report jobs wedges every PR their paths don't trigger. Verified live 2026-07-28 10:53: rules still show approval count 0 and no required_status_checks. |
| D5 | Parcel order: CLOSE-P3 (biome-CI) → CLOSE-P1 (minted chain) → CLOSE-P2 (W4-P5) | Biome-in-CI first is cheap and makes the CI net stricter for the two parcels that follow; minted chain is the critical path; W4-P5 is decoupled and never blocks. |
| D6 | Standard Gate-2/Gate-3 standing authorizations (green-chain contingent) — **except CLOSE-P1's minted-chain vehicle PR, whose merge is HUMAN (re-ratified per plan review Q3)**: the one PR whose merge the Stage-F receipt records is merged by Clint, preserving the W4 criterion's "on human merge" semantics (same shape as SCAF-P4's exit merge) | The Stage-F seal must record a human merge to honestly close a criterion defined "on human merge." All other merges remain agent-executable behind green chains. D6 is executable only while approval count is 0 — see the D4 interlock stop condition. |

## Parcels

| Parcel | One-liner | Risk | Routing class / review |
|---|---|---|---|
| CLOSE-P3 | Add biome to CI as a per-package `npm run lint --if-present` loop in `plugins.yml`, mirroring the existing test loop (S3 — a single root `biome check` fails on 15 nested-root configs; each package's pinned binary is authoritative); fix the two existing biome errors on main (`integration/src/index.ts` organizeImports, `docspine-hook.test.ts` formatting). Check-only, no auto-fix. **Plus (B2, re-ratified): always-report jobs — additive changes to `plugins.yml` and `foreman-line-ci.yml` so `test` and `integration-report` report a conclusion (pass or no-op) on every PR to main, making them safe to require at D4.** | low | boilerplate — single review |
| CLOSE-P1 | Minted-chain exit vehicle: wire the real write seam (FUP-2), chain-tip passing (RW3), and live effective-rules normalization (W4-P1-FUP-1); execute a genuine Stage A→F run that persists receipts under `docs/receipts/`; `validateChain` + `isSealed` green over the minted chain. | elevated | architecture/risk — dual review |
| CLOSE-P2 | W4-P5: spec-linter corpus reconciliation (grandfather rule for pre-registry `permission_profile` values), `data_classification` schematize, linter CI re-enable. | standard | standard-feature — single review |

## Exit criterion

1. A minted A→F receipt chain exists on disk under `docs/receipts/`, produced by a real run (not a fixture); the coordinator's deterministic pass asserts all three of: `validateChain` passes, `isSealed` passes, and the chain's stages are exactly `['A','B','C','D','E','F']` in sequence order (B1 — `isSealed` alone reads only the last receipt). **Bound to observable events (S1):** the Stage-E receipt's subject names the real PR number and head SHA of an actual PR; the Stage-F receipt's subject names the real merge SHA; the coordinator cross-checks both against `gh`. Emitters invoked against the pre-existing A→D chain (`docs/receipts/1912af36-…`) with hand-assembled subjects do NOT satisfy this item.
2. `spec-linter validate` over `plugins/foreman-line/docs/specs/done/` **as of CLOSE-P2's own final SHA** exits 0 and runs in CI (S4 — the corpus includes the specs P1/P3 move to done/ after shaping; those are also coordinator-linted at their own closures).
3. Biome runs in CI as a blocking check and main is biome-clean.
4. Exit item 1 of the W4 charter: coordinator confirms via `gh api repos/:owner/:repo/rules/branches/main` that `required_status_checks` (`test`, `integration-report`) exist on ruleset 19402394, `required_approving_review_count ≥ 1`, **and `bypass_actors` remains `[]` on both rulesets** (S2b — the original criterion's "binds even the coordinator's identity" clause). **Human gate (D4):** the loop's final stop-report names exactly these two changes; the agent-completable end state is "stop-report written awaiting ruleset change," after which the coordinator verifies and writes the goal-complete report.
5. Stage-F closure for all three parcels (specs → done/, lessons appended **with dispositions installed per FOREMAN-LINE-PLAN §Stage F item 4**, worktree/branch cleanup, loop-directive state current).

## Standing authorizations requested (granted at Gate 1)

1. **Gate 2 (dispatch):** shaping + builder + reviewer dispatch for the three named parcels, in D5 order, one at a time.
2. **Gate 3 (merge):** PR-only merge behind a fully green chain (deterministic pass + adversarial review(s) + required CI checks on the final SHA); any red step voids the authorization for that PR.
3. Push, PR, and Stage-F closure work within this repo only.
4. No Jira writes this goal unless a spec designates them (KONE-only, gated, if so).
5. **Narrow gating-workflow authorization (B3, re-ratified):** additive edits to `.github/workflows/plugins.yml` and `.github/workflows/foreman-line-ci.yml` for exactly the chartered diffs — CLOSE-P3's biome lint-loop + always-report jobs, and CLOSE-P2's spec-linter exclusion removal. PR-only, adversarially reviewed, green-chain contingent, like all other work. Any gating-workflow change beyond these named diffs remains human-apply-only (predecessor D8 carve-out stands).

## Stop conditions

Universal set (COORDINATOR-PATTERN): frozen contract needs modification; a tripwire fires twice on one parcel; a security finding can't close in-parcel; anything outward-facing beyond the standing authorizations; queue empty. Goal-specific: after CLOSE-P2's Stage-F closure, stop and report awaiting D4's human ruleset change (agent-completable condition: stop-report written). **D4 interlock (Q3b, re-ratified): on every wake, before any merge, check the effective-rules API; if `required_approving_review_count > 0` or `required_status_checks` appears before CLOSE-P2 closes, STOP and report — every Gate-3 authorization is void from that moment.**

## Deferred debts (recorded, not chartered)

- **SCAF-P4-FUP-1** — GitHub-login format guard (whitespace/homoglyph/RTL parse today; fails closed for authz, spoofing vector at report sinks — lesson #31 class).
- **SCAF-P4-FUP-3** — own-property guards.
- **W4-FUP-AUDIT** — broader audit follow-up; largest and least defined.
- **W4-item-6 Jira leg (S2a, re-ratified deferral)** — the W4 original required "the Jira ticket transitions to closed via MCP" on human merge; SCAF-P4's ticket was never minted (KONE-TBD). Deferred explicitly, not silently dropped: a future parcel mints a real KONE ticket for a run vehicle and exercises the Stage-F transition through the W1-P4 transport.
