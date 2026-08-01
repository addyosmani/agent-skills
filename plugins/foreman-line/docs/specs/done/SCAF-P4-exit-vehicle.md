---
ticket: KONE-TBD
title: Foreman Line - SCAF-P4 exit vehicle (auth surface, elevated-risk A→F chain proof, drift-block harness)
status: done
owner: clinton.morgan
created: 2026-07-27
updated: 2026-07-28
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/integration/src/auth/]
routing_class: standard-feature
permission_profile: builder
---

# SCAF-P4 — Exit vehicle: A→F chain proof (auth surface, drift-block harness)

## Intent

SCAF-P4 is the W4 CI-integration goal's exit proof vehicle. It proves the full W1/W2/W3/W4
machinery end-to-end by:

1. **Shipping a bounded module** at an elevated-risk surface (`*/auth/*`) that travels Stage A→F.
2. **The live PR** declares `risk: elevated` matching the derived risk (`auth` segment trips the
   W4-P3 security domain rule → derived = elevated) — **no drift → clean pass → human-mergeable**.
3. **The drift-block behavior** is proven at harness level: a deliberately-mismatched AC
   (declared = `standard`, derived = `elevated`) asserts `drift: true` — the W4-P3 engine result
   that would block in CI if promoted to required status (D8 promotion is a future human gate).
4. **The A→F receipt chain** passes `validateChain` (AC5c correlationId invariant) as proven by
   a fixture harness test using the live `validateChain` function from `receipts/src/`.
5. **The exit merge is the non-delegable human gate** (charter D6/D8; Gate-3 standing
   authorization does NOT apply).

The coordinator must verify branch protection via the GitHub effective-rules API **before opening
the PR** (charter exit criterion item 1; lesson #15). The coordinator presents this result to Clint
for confirmation before the PR is opened.

## Module: `integration/src/auth/coordinator-identity.ts`

A small, meaningful module tied to the branch-protection precondition: it parses the GitHub
actor shape that the effective-rules API returns for the coordinator identity check.

Exports:
- `CoordinatorIdentity` — `{ readonly login: string; readonly nodeId: string }`
- `CoordinatorIdentityError` — extends `Error`, `.name === 'CoordinatorIdentityError'`
- `parseCoordinatorIdentity(raw: unknown): CoordinatorIdentity` — validates + extracts from a
  GitHub actor JSON object; throws `CoordinatorIdentityError` on any shape failure

This module is the **only new production file**. It deliberately resides at `src/auth/` to ensure
the derived-risk engine flags the parcel's diff as elevated.

## Coordinator rulings

| # | Question | Ruling |
|---|---|---|
| Q1 | Module content? | `coordinator-identity.ts` — parses GitHub actor JSON to `CoordinatorIdentity`. Tied to the branch-protection precondition (exit criterion item 1). Small, meaningful, elevated-surface. |
| Q2 | `CoordinatorIdentityError` extends `IntegrationError`? | **No** — `IntegrationError` union is frozen (byte-unchanged). Standalone `CoordinatorIdentityError extends Error` only. |
| Q3 | Auth dir as a new directory inside `integration/src/`? | **Yes** — `integration/src/auth/` is a new sub-directory. The builder creates it as part of creating `coordinator-identity.ts`. No `index.ts` barrel in `auth/`; export directly from `integration/src/index.ts`. |
| Q4 | `foreman-line-ci.yml` touched? | **No** — BYTE-UNCHANGED. The existing CI already runs `report.ts` (Stage-E) on PR open. No new job or step is added in this parcel. |
| Q5 | Routing? | **Standard** (D7 — one review; not dual). SCAF-P4 is `routing_class: standard-feature`, `permission_profile: builder`. |
| Q6 | Pre-PR effective-rules gate? | Coordinator queries the effective-rules API and reports to Clint before opening the PR. This is a coordinator-level stop-and-report; the builder does NOT handle it. |

## Acceptance criteria

### Module surface (integration/src/auth/coordinator-identity.ts)

**AC1 — Exports:** `CoordinatorIdentity`, `CoordinatorIdentityError`, `parseCoordinatorIdentity`
are exported from `integration/src/index.ts`. All pre-existing exports are byte-unchanged.
`integration/src/index.ts` changes are **additive only** (appended after the last existing
export block — same rule as W4-P2 AC18).

**AC2 — Happy-path parse:** `parseCoordinatorIdentity({ login: 'alice', node_id: 'U_abc123' })`
returns `{ login: 'alice', nodeId: 'U_abc123' }`.

**AC3 — Shape failures throw `CoordinatorIdentityError`:**
- `parseCoordinatorIdentity(null)` → throws `CoordinatorIdentityError`
- `parseCoordinatorIdentity('string')` → throws `CoordinatorIdentityError`
- `parseCoordinatorIdentity({ login: '' })` → throws `CoordinatorIdentityError` (empty login)
- `parseCoordinatorIdentity({ login: 'alice' })` → throws `CoordinatorIdentityError` (missing `node_id`)
- `parseCoordinatorIdentity({ node_id: 'U_abc' })` → throws `CoordinatorIdentityError` (missing `login`)
- `parseCoordinatorIdentity({ login: 'alice', node_id: '' })` → throws `CoordinatorIdentityError` (empty node_id)

**AC4 — Error class shape:** `CoordinatorIdentityError` extends `Error`; thrown instance has
`.name === 'CoordinatorIdentityError'`; thrown instance is `instanceof CoordinatorIdentityError`.

**AC5 — Extra fields are ignored:** `parseCoordinatorIdentity({ login: 'alice', node_id: 'U_x', extra: 42 })`
returns `{ login: 'alice', nodeId: 'U_x' }` (no throw, no extra fields on result).

### Harness ACs (≥3 — core of this parcel)

**AC-H1 — Elevated match (live proof invariant):**
```ts
evaluateAuditTrigger({
  declaredRisk: 'elevated',
  changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
})
```
Returns `{ triggered: true, drift: false, derivedRisk: 'elevated', decision: 'elevated' }`.

This is the machine-level proof that SCAF-P4's live PR passes the trigger cleanly: declared
matches derived, no drift, triggered. The `toAuditTriggerEvaluation` projection must return
`{ triggered: true }` (with a non-empty `reason` string mentioning the security domain).

**AC-H2 — Drift-block harness:**
```ts
evaluateAuditTrigger({
  declaredRisk: 'standard',
  changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
})
```
Returns `{ triggered: true, drift: true, derivedRisk: 'elevated', decision: 'elevated' }`.

`drift: true` is the W4-P3 engine result that causes the CI job to block a PR that
under-declares its risk. This harness test proves the drift-block behavior on the SCAF-P4
surface without needing a live blocking run.

**AC-H3 — `validateChain` A→F (fixture):**
A synthetic 6-stage fixture chain (stages A, B, C, D, E, F) where:
- All receipts share the same `correlationId`
- Each receipt's `prevHash` = the previous receipt's `hash`
- Stages A=sequence 0 (prevHash null), B=1, C=2, D=3, E=4, F=5
- Stage F's `subjectKind` = `'ClosureRecord'`

`validateChain([A, B, C, D, E, F])` returns `{ valid: true }`.

This proves the chain-sealing invariant holds end-to-end, including Stage F. Use the same
fixture pattern as `audit-trigger-chain.test.ts` and `receipt.test.ts`.

**AC-H4 — Forked correlationId invalidates chain:**
Same fixture as AC-H3 except Stage F mints a DIFFERENT `correlationId`. `validateChain`
returns `{ valid: false }` and the message references the AC5c shared-correlationId invariant.
Proves the invariant is enforced, not merely asserted.

### Conformance

**AC6 — `foreman-line-ci.yml` byte-unchanged:** Same byte-comparison check as `conformance.test.ts`
AC14/AC19. The PR must not touch `foreman-line-ci.yml`.

**AC7 — No `IntegrationError` mutation:** `plugins/foreman-line/integration/src/errors.ts` is
byte-unchanged. `IntegrationError`'s union members are byte-unchanged.

**AC8 — `integration/src/index.ts` update count:** All existing export blocks are byte-unchanged;
new exports are appended after the last existing block (same append rule as W4-P2).

## Implementation notes

### `coordinator-identity.ts` skeleton

```ts
export interface CoordinatorIdentity {
  readonly login: string
  readonly nodeId: string
}

export class CoordinatorIdentityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoordinatorIdentityError'
  }
}

export function parseCoordinatorIdentity(raw: unknown): CoordinatorIdentity {
  if (typeof raw !== 'object' || raw === null) {
    throw new CoordinatorIdentityError('actor must be a non-null object')
  }
  const obj = raw as Record<string, unknown>
  if (typeof obj['login'] !== 'string' || obj['login'].length === 0) {
    throw new CoordinatorIdentityError('actor.login must be a non-empty string')
  }
  if (typeof obj['node_id'] !== 'string' || obj['node_id'].length === 0) {
    throw new CoordinatorIdentityError('actor.node_id must be a non-empty string')
  }
  return { login: obj['login'], nodeId: obj['node_id'] }
}
```

### Harness test imports

```ts
import { evaluateAuditTrigger, toAuditTriggerEvaluation } from '../src/audit-trigger.js'
import { validateChain } from '../../receipts/src/index.js'
```

### Fixture receipt builder (for AC-H3/AC-H4)

Use the same `makeReceipt` pattern as `audit-trigger-chain.test.ts`:

```ts
const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-00000000000f'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-00000000000f'
const FORKED_CORRELATION_ID = 'bbbbbbbb-0000-4000-8000-00000000000f'
```

Stage F receipt: `stage: 'F'`, `sequence: 5`, `prevHash: HASH_E`, `hash: HASH_F`,
`subjectKind: 'ClosureRecord'`.

### `integration/src/index.ts` — append after the last `docspine-report.js` block

The current last block exports from `docspine-report.js`. Append the new block AFTER it:

```ts
export {
  CoordinatorIdentity,
  CoordinatorIdentityError,
  parseCoordinatorIdentity,
} from './auth/coordinator-identity.js'
```

Note: TypeScript + ESM requires the `.js` extension in the export path even though the
source file is `.ts`.

## File layout

| File | Action |
|------|--------|
| `integration/src/auth/coordinator-identity.ts` | **NEW** — module + error class |
| `integration/src/index.ts` | **ADDITIVE** exports only (append) |
| `integration/tests/scaf-p4-harness.test.ts` | **NEW** — harness ACs (AC-H1 to AC-H4, AC6) |
| `integration/tests/coordinator-identity.test.ts` | **NEW** — module unit tests (AC2–AC5) |
| `.github/workflows/foreman-line-ci.yml` | **BYTE-UNCHANGED** |

No other files change. No new packages. No `package.json` changes. No new npm dependencies.
