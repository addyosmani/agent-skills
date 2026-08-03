# W1-P4 Dual Adversarial Review — findings + coordinator triage (2026-07-22)

Two independent frontier reviews, fresh sessions, zero builder context, both reproducing the deterministic pass (tsc 0, 43/43, biome 0) and probing hostile inputs (gate-slip attempts, JQL injection, hostile records, git failure seams). Neither performed a live Jira write. Verdicts: **A = SHIP WITH FOLLOW-UPS** (no ungated write path; would escalate its Finding 4 to REWORK if the ratified guarantee is binding — it is), **B = REWORK REQUIRED** (one BLOCKER, reproduced with the package's own harness). The reviews **converge** on the same defect; no coordinator tie-break reproduction was needed (B ran it live; A traced the identical mechanism).

## Convergent + unique findings

| # | Reviewer(s) | Severity | Finding |
|---|---|---|---|
| R1 | B#1 + A#4 (convergent; B reproduced live) | **BLOCKER** | Push→link-write failure seam wedges registration: link write (step 9) precedes Stage-B receipt (step 10); a step-7–9 failure leaves back-filled/pushed content with no receipt → re-run detects `first` → F7 re-derives on back-filled content → `HashMismatchError`; reconcile unreachable. Contradicts ratified Q6/AC8/README. The builder's own `failOnLink` harness hook exists but is wired to zero tests. |
| R2 | B#2 | MINOR | README describes a recovery ordering ("after the receipt exists") the code never produces. |
| R3 | B#3 | MINOR | Fake-adapter search semantics (bracket-anchored substring) diverge from production JQL `~` (tokenized fuzzy) — deterministic idempotency proof weaker than it appears. |
| R4 | B#4 + A#3 (convergent) | MINOR | Raw production adapter exported ungated — direct integrator calls bypass the gate (in-package paths all gated). |
| R5 | B#5 | INFO | Reconcile recovers links but never commits a dirty receipt/sidecar. |
| R6 | B#6 + A#6 (convergent) | MINOR | Reconcile recomputes the permalink SHA from `git log` rather than the receipted SHA — silent drift if a later commit touches the spec. |
| R7 | A#2 | MINOR/INFO | `addLinkGated`'s gate assertion is cosmetic on its own arguments (provenance is the real guarantee). |
| R8 | A#8 | INFO | Forged structurally-valid Stage-B receipt would enter reconcile (validateChain doesn't recompute hashes) — explicitly deferred to pcc `receipt verify`; in-repo git-committed threat model. |
| R9 | A#11 | MINOR | "Preview-before-write available" asserted in prose but not implemented or tested. |
| R10 | A#12 + gate findings (A#1, B focus 1) | INFO (positive) | Gate mechanically sound: no ungated in-package path, negative controls real (zero adapter calls), JQL injection closed via char-code token validation, all linear-time. |

## Coordinator triage

| # | Disposition | Ruling |
|---|---|---|
| R1 | **fix (rework item 1) — REWORK REQUIRED** | Adopt the reorder both reviewers point at: mint + write + **commit** the Stage-B receipt and sidecar (commit 2) immediately after push/SHA-capture and BEFORE the Jira link write. The `RegistrationResult`/links are deterministic from the pushed SHA + created keys, so the receipt subject does not depend on the link write succeeding; the Jira-side link write becomes a post-receipt step whose failure re-runs recover via reconcile. Reconcile-abuse stays closed (the receipt is only ever minted after F7 passed on the first run). Wire `failOnLink: true` into a test proving: first run fails at link write AFTER receipt commit → re-run enters reconcile → link idempotently written → no duplicate creates. |
| R2 | **fix (item 1 rider)** | README corrected to the actual (new) ordering and genuine recovery path. |
| R3 | **fix (rework item 2)** | Fake adapter models `~` loosely (bare-token substring, capable of multi-match); add a multi-match → stop-and-report test; JQL exact semantics documented verify-at-probe under L4. |
| R4 | **fix (rework item 3)** | Embed the three gate assertions inside `createDockerMcpAdapter`'s mutating methods (defense-in-depth; export stays for coordinator probe wiring). Rejecting test at the adapter boundary with a stubbed child_process (no live call). |
| R5 | **fix (absorbed by item 1)** | The reorder commits receipt/sidecar in commit 2 before the link write; reconcile no longer inherits dirty state. |
| R6 | **fix (rework item 4)** | Reconcile reads the permalink SHA from the Stage-B receipt subject (the receipted source of truth), falling back to `git log` only if absent; test pinning it. |
| R7 | **accept-as-documented** | Provenance is the guarantee; README already honest. |
| R8 | **accept-as-documented** | Deferred to pcc `receipt verify` per spec Out-of-Scope; in-repo committed-receipt threat model recorded. |
| R9 | **fix (rework item 5)** | Implement a first-class `preview` (dry-run) path returning the built payloads + planned actions with ZERO adapter calls, plus a test; this backs the jira-integration preview-before-write discipline the spec claims. |
| R10 | **informational** | Positive confirmations, no action. |

Rework tripwire: completion-claim test count must EXCEED 43. A second blocking failure on this parcel is a loop-stop (tripwire-twice rule).

## Post-rework focused review (2026-07-22, range 6355b07..3e85eb2 — SDK contingency + async ripple)

Fresh frontier session, zero builder context. Verdict: **SHIP WITH FOLLOW-UPS**, no blockers. Async ripple preserves every prior guarantee (sync gate-before-mutation, single call sites, receipt-before-link, rollback, reconcile-abuse closure, never-clobber, deterministic create ordering); dependency honesty confirmed ({ajv, @modelcontextprotocol/sdk} machine-enforced, fired Q11 contingency recorded with probe evidence); lesson #19 satisfied.

| # | Severity | Disposition | Ruling |
|---|---|---|---|
| F9/F11 | MINOR | **closed by live probe** | The assumed response shapes and error signaling were validated by the final coordinator live probe (PROBE_EXIT=0: create/search/link/reconcile all round-tripped against real KONE). |
| F10 | MINOR | **accept-as-debt-documented** | defaultClientFactory's isError/text-unwrap has no deterministic coverage (stub replaces the wrapper). Follow-up: extract the unwrap into a pure helper + unit tests. Not ship-blocking; the live probe exercised the real path. |
| F1–F8, F12, F13 | INFO | informational | Positive confirmations. |

Reviewer B's earlier verification pass: BLOCKER CLOSED (re-ran own reproduction against the rework). Full live-probe cycle log: build-W1-P4-deterministic-pass.md.
