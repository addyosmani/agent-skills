# Plan Adversarial Review — w3-verification

**Dispatched:** 2026-07-23
**Model:** Claude Opus (frontier, fresh session, zero coordinator context)
**Mandate:** Decomposition coherence, boundary reality, missing parcels, unexamined load-bearing decisions, silent parcel collisions.

---

## Raw findings (9 total — 4 BLOCKER, 3 SHOULD-FIX, 2 INFO)

| # | Severity | Target | Finding |
|---|---|---|---|
| F1 | BLOCKER | D7 / D3 / P4 | Frozen `VerificationVerdict` Stage-D contract never referenced; no parcel emits it. `ReviewFinding[]` in D3 is a fiction — frozen type is `AdversarialFinding[]`. |
| F2 | BLOCKER | P1 | "Acceptance criteria as executable checks" has no encoding mechanism — prose ACs don't automatically become per-AC pass/fail without a defined mapping convention. |
| F3 | BLOCKER | P2 / D3 | P2 cannot synchronously "dispatch a fresh frontier agent session and collect `ReviewFinding[]`" — no agent-session-spawn primitive exists; "dispatch" in this codebase means worktree + order, with the session running out-of-band. D3's boundary is wishful. |
| F4 | BLOCKER | P1 / D6 | No `BuildResult` emitter exists. P1's declared input ("built parcel branch + `DispatchOrder`") has two holes: (a) no chained receipt bridges Stage-C dispatch to Stage-D; (b) `DispatchOrder` carries no `workflowId` or branch. P1 cannot locate the Stage-C receipt to read its hash for `prevHash` chaining. |
| F5 | SHOULD-FIX | P3 / D4 | Rework attempt-count state is undefined. P3 must know "this is attempt 2" but the charter never says where the counter persists or how P3 discovers it. |
| F6 | SHOULD-FIX | P1–P4 | Shared receipt namespace `docs/receipts/<workflowId>/` with no sequence-allocation owner; rework re-runs can collide or overwrite. |
| F7 | SHOULD-FIX | D7 | Receipt field name unverified — charter says `stageId: 'D'` but actual `ReceiptDocument` field may be `stage`; per-claim kind/claimRef shapes unconfirmed. |
| F8 | INFO | D4 / P2 | D4's isolation guarantee holds only under the session-start-load bound. |
| F9 | INFO | SCAF-P3 / D6 | "Dispatched (W2) to produce a built branch" conflates dispatch with build; the build step is not sequenced. Lesson #23 Kompress ceiling applies. |

---

## Coordinator triage

### F1 — BLOCKER → FIX

**Verified on disk:** `contracts/src/stages/d-verification.ts` exports `VerificationVerdict { verdict: 'pass'|'rework', harnessClaims: HarnessClaimResult[], adversarialFindings: AdversarialFinding[] }` and `AdversarialFinding { summary, citation, severity }` — both frozen (`additionalProperties: false`).

**Ruling:**
1. P4 scope amended: P4 assembles the frozen `VerificationVerdict` object from harness claims + adversarial findings, validates against the schema, emits it as Stage-D's pipeline output in a `StageEnvelope<VerificationVerdict>`. P4 is the natural owner.
2. D3 amended: `ReviewFinding[]` → `AdversarialFinding[]` (using the exact frozen type from `d-verification.ts`).
3. D7 amended: Stage-D pipeline output is the frozen `VerificationVerdict` in a `StageEnvelope` alongside per-claim sub-receipts. D7 updated below.

### F2 — BLOCKER → RULING (no charter amendment; P1 shaping constraint)

**Ruling:** AC→check encoding = **named-test convention**. The frozen `HarnessClaimResult.claim` field is a string; the harness populates it from the parcel's AC text. Convention (enforced at P1 shaping and SCAF-P3 shaping): parcel spec ACs carry sequential IDs ("AC-1: …", "AC-2: …", etc.) and the test suite must include at least one test name containing the corresponding AC ID. Harness maps: for each AC-N in spec, any passing test containing "AC-N" → `HarnessClaimResult { claim: 'AC-N: [text]', passed: true, evidence: '<test name(s)>' }`. Failing test or no matching test → `passed: false`. No SPEC-CONVENTION amendment required.

### F3 — BLOCKER → FIX (D3 redrawn — Gate 1 re-opens for D3 only)

**Verified:** No agent-session-spawn primitive exists. W2 dispatch = worktree + order + settings; session runs out-of-band. P2 as described in D3 is unimplementable.

**Ruling:** P2's boundary redrawn:
- **Dispatch** (in-process): generates the adversarial review kickstarter (code-review skill injection, adversarial permission profile, parcel context) → creates reviewer worktree under adversarial profile → emits review-dispatch Stage-D sub-receipt
- **Session:** coordinator launches reviewer out-of-band as a background agent (same as today), using P2's kickstarter
- **Collect** (in-process): `parseAdversarialFindings(rawText): AdversarialFinding[]` — typed parser called by coordinator after reviewer session completes

D3 updated below. **Gate 1 re-opens for D3 only** per COORDINATOR-PATTERN.

### F4 — BLOCKER → FIX (P1 scope expanded)

**Verified on disk:** `contracts/schemas/build-result.schema.json` exists with `{ branch, commitShas, touchedSurfaces }`. W2's `executeDispatch` returns `{ order, receiptLocator, worktreePath }` — no `BuildResult` receipt is emitted. Stage-C dispatch receipt locator is stored in the DispatchOrder receipt file; coordinator has it.

**Ruling:** P1 scope expanded to include `recordBuildResult(workflowId, dispatchReceiptLocator, branch, commitShas, touchedSurfaces)` — coordinator calls this after builder completes, before harness runs. Reads Stage-C receipt hash from `dispatchReceiptLocator` for `prevHash` chaining. Writes `BuildResult`-typed Stage-D sub-receipt and returns its locator. `workflowId` comes from the parcel spec's Jira ticket (coordinator has it from W2-P1's candidate record). P1 one-liner updated below.

### F5 — SHOULD-FIX → ACCEPT AS AMENDMENT (P3 shaping constraint)

**Ruling:** P3 derives attempt count by counting `ReworkSignal` receipts in `docs/receipts/<workflowId>/` (files where `kind === 'rework-signal'`). Attempt 1 = first rework (original build = attempt 0). P3 shaping spec must include this state-source as an explicit AC. Loop directive carries it.

### F6 — SHOULD-FIX → ACCEPT AS AMENDMENT (P1 sub-function)

**Ruling:** P1 includes `allocateSequence(workflowId): number` — reads highest existing sequence in `docs/receipts/<workflowId>/` and increments. All Stage-D sub-receipts (P1, P2, P3, P4) call this before writing. Rework re-runs append (never overwrite). P1 shaping spec must include sequence-allocator as an AC.

### F7 — SHOULD-FIX → ACCEPT AS DOCUMENTED

**Ruling:** Coordinator verifies exact `ReceiptDocument` field names against the shipped `receipts/` validator at P1 shaping — this is a mandatory coordinator-lint step at spec acceptance (same discipline as lesson #5). No charter amendment. Flagged in loop directive.

### F8 — INFO → ACCEPT AS AMENDMENT (P2 shaping AC)

**Ruling:** P2's spec must include as an explicit AC: "The reviewer session is launched as a fresh Claude Code session that loads the emitted `settings.local.json` at session start; the generated kickstarter carries zero coordinator triage context." Captured in loop directive as P2 shaping constraint.

### F9 — INFO → ACCEPT AS DOCUMENTED

**Ruling:** Loop directive will include an explicit SCAF-P3 build step — after W2 dispatch, coordinator waits for builder completion before calling P1's `recordBuildResult`. SCAF-P3 dispatch context sized at shaping to stay under ~200-token Kompress ceiling (lesson #23).

---

## Charter amendments resulting from triage

### D3 (redrawn — Gate 1 re-opens for this decision only)

*Old:* W3-P2 builds an automated adversarial review orchestrator: generates the review kickstarter for the target parcel + dispatches a fresh frontier agent session + collects structured `ReviewFinding[]` output + emits an adversarial-review Stage-D sub-receipt.

*New:* W3-P2 builds the adversarial review dispatch-and-collect infrastructure: **(a) dispatch** — generates the adversarial review kickstarter (code-review skill injection, adversarial permission profile, parcel context) + creates the reviewer worktree under the adversarial profile + emits a review-dispatch Stage-D sub-receipt; **(b) collect** — provides `parseAdversarialFindings(rawText): AdversarialFinding[]`, a typed parser the coordinator calls after the out-of-band reviewer session completes, to extract structured `AdversarialFinding[]` (frozen type from `d-verification.ts`). The reviewer session itself runs out-of-band as a background agent launched by the coordinator using P2's kickstarter — same pattern as W2 builder dispatch. This preserves D4: coordinator calls P2's functions but the review judgment is produced entirely in the independent reviewer session.

### D7 (amended — additive, no Gate 1 re-open)

*Old:* Stage-D receipts reuse the `ReceiptDocument` schema from W0-P4 (RFC 8785 canonical, `prevHash` chaining). Per-claim sub-receipts carry `stageId: 'D'` and chain from the Stage-C dispatch receipt.

*New:* Stage-D **pipeline output** is the frozen `VerificationVerdict { verdict, harnessClaims, adversarialFindings }` assembled by P4 and emitted as a `StageEnvelope<VerificationVerdict>` (consistent with Stage-A/B/C pattern). Per-claim **sub-receipts** (`ReceiptDocument`, RFC 8785) are a parallel evidence trail: one per AC check (P1), one for the adversarial review dispatch (P2), one for each rework-routing decision (P3, when triggered), one closure sub-receipt (P4). The `BuildResult` sub-receipt (P1's `recordBuildResult`) chains from Stage-C dispatch receipt hash via `prevHash`. Field names and `kind`/`claimRef` shapes verified at P1 shaping against the shipped `receipts/` validator.

### P1 one-liner (amended)

*Adds:* `recordBuildResult` and `allocateSequence` sub-functions. Full text: Verification Harness: creates the `plugins/foreman-line/verification/` package structure. Sub-functions: (1) `recordBuildResult(workflowId, dispatchReceiptLocator, branch, commitShas, touchedSurfaces)` — writes `BuildResult`-typed Stage-D sub-receipt chaining from Stage-C receipt hash; (2) `runHarness(workflowId)` — reads parcel spec ACs, maps to test results via named-test convention (test names contain AC-N labels), emits one `HarnessClaimResult` sub-receipt per AC; (3) `allocateSequence(workflowId)` — monotonic sequence allocator for all Stage-D sub-receipts. Read-only relative to the target parcel's codebase.

### P4 one-liner (amended)

*Adds:* `VerificationVerdict` assembly and emission. See triage F1 ruling.

---

## Gate 1 re-open — D3 only

**Required:** Clint must explicitly ratify the redrawn D3 before W3-P2 is shaped.

**Redrawn D3 summary:** P2 generates the kickstarter + creates reviewer worktree + emits dispatch sub-receipt + provides a `parseAdversarialFindings` typed parser. The reviewer session runs out-of-band. P2 does NOT span the session itself.

**Coordinator recommendation:** ratify. The redrawn D3 is implementable, consistent with the W2 dispatch pattern, and preserves D4's isolation invariant.
