# Plan-Level Adversarial Review — w1-intake-registration (2026-07-22)

Fresh frontier session (Opus-class), zero coordinator context beyond the charter and repo canon, per COORDINATOR-PATTERN. Findings summarized below; coordinator reproduced F1, F2, and F9 on disk before triage (a-intake.ts:5-24 is Epic→Story only; skills/jira-workflow/SKILL.md is a fetch→POML→execute read-direction pipeline; plugins/foreman-line/schema-scaffold/ exists).

## Findings (reviewer)

1. **F1 BLOCKER** — Exit criterion demands an Epic/Story/**Task** tree; frozen `contracts/src/stages/a-intake.ts` `ShapingResult` is two-level (no task children). Unbuildable without a frozen-contract change (a loop-stop).
2. **F2 BLOCKER** — W1-P4 scoped "built on `jira-workflow`", which is the read-direction skill; the write-direction skill that matches P4 is `plugins/audit-suite/skills/jira-integration` (idempotent create/update, preview-before-write). Error inherited from FOREMAN-LINE-PLAN.md §8.
3. **F3 MAJOR** — D4 (Jira MCP hosting/auth) defers the highest-blast-radius decision onto tooling that provides neither a local Jira MCP server nor a scoped service principal (both skills read personal `JIRA_API_TOKEN` env). Likely trips its own stop condition at P4.
4. **F4 MAJOR** — D3's sandbox-only rule has no mechanism: a default-deny *write* gate doesn't pin the *project*. Needs a mechanical project-key allowlist + a negative-control probe.
5. **F5 MAJOR** — Bidirectional SHA-permalink write-back protocol owned by no parcel; ordering paradox (ticket key exists only after create; permalink must bind a pushed post-key SHA).
6. **F6 MAJOR** — P1/P2 split conflicts with frozen `ShapingResult` (bundles `parcelSpecRefs` + `epics` as one Stage-A output). Charter must state P1 emits `ShapingResult` with provisional/empty `epics` that P2 fills, and name the shared contract types.
7. **F7 MAJOR** — P3 approval has no integrity binding to what P4 registers (TOCTOU). Bind approval to an RFC 8785 content hash; P4 refuses on mismatch.
8. **F8 MAJOR** — No receipt emission anywhere in W1 despite plan D8 and receipts/README (genesis minted at Stage A). Add receipt ACs or consciously defer in the charter.
9. **F9 MINOR** — Shipped `schema-scaffold` (SCAF-P1) absent from charter canon; W1 packages need consume-vs-copy guidance.
10. **F10 MINOR** — Sandbox credential home unspecified; SPEC-CONVENTION §7 forbids credentials in specs; personal token is a stand-in for, not an instance of, a scoped service principal.
11. **INFO** — D7 (branch protection via `tools protector` ruleset, `pull_request` rule) independently verified sound via the effective-rules API.

## Coordinator triage

| # | Severity | Disposition | Ruling |
|---|---|---|---|
| F1 | BLOCKER | **fix** | Align the exit criterion to the frozen Epic/Story two-level tree; Task tier explicitly deferred (a future contract-rev goal, not W1). Frozen contract wins. **Re-opens Gate 1: exit criterion.** |
| F2 | BLOCKER | **fix** | Repoint W1-P4 to `plugins/audit-suite/skills/jira-integration` as the write-path base; §5 SHA-permalink linking noted as net-new on top. One-line correction to FOREMAN-LINE-PLAN.md §8 rides in the first W1 PR. **Re-opens Gate 1: W1-P4 scope.** |
| F3 | MAJOR | **fix** | Gate 1 re-open ruling (Clint): use the **Atlassian remote MCP server** already registered in the docker MCP `ai_coding` profile (`atlassian-remote`, coordinator-verified via `docker mcp profile server ls`). D4 amended accordingly; recorded deviations: OAuth-as-Clint stands in for the scoped service principal (F10), and gateway connectivity (failing in the coordinator session at charter time) must be verified at P4 shaping. |
| F4 | MAJOR | **fix** | Charter's P4 one-liner gains: mechanical pinned-sandbox-project-key assertion before any create call + negative-control probe (attempted non-sandbox write must be refused). Spec-level enforcement at P4 shaping. |
| F5 | MAJOR | **fix** | Write-back protocol assigned to W1-P4 explicitly: create → back-fill `ticket:` frontmatter → commit → push → write `commit->ticket` permalink bound to the pushed post-key SHA. Recorded in charter; detailed in P4 spec. |
| F6 | MAJOR | **fix** | Charter states: P1 emits schema-valid `ShapingResult` with provisional/empty `epics`; P2 fills `epics`. `ShapingResult` (a-intake.ts) and `RegistrationResult` (b-registration.ts) named as the inter-parcel contract types. |
| F7 | MAJOR | **fix** | P3 approval binds to an RFC 8785 canonical hash of the approved ShapingResult/spec-set (W0-P4 receipts machinery); P4 refuses to register on hash mismatch. Added to P3/P4 one-liners. |
| F8 | MAJOR | **fix** | Receipt emission added to parcel scope: genesis + Stage-A receipt at approval (P3), Stage-B receipt at registration (P4), per W0-P4 receipt chain spec. |
| F9 | MINOR | **fix** | `schema-scaffold` added to canon; W1 packages MUST consume the shared extraction, not copy. |
| F10 | MINOR | **accept-as-documented** | Credential resolves via env/secret management, never in a spec; personal token acknowledged as a stand-in pending the D4 spike. Folded into P4 shaping. |
| INFO | — | **informational** | D7 stands verified. |

## Gate 1 re-open scope

Per COORDINATOR-PATTERN, triage changed locked content in three places only: **exit criterion (F1), W1-P4 scope (F2), D4 (F3)**. D1, D2, D3, D5, D6, D7 remain ratified and closed.
