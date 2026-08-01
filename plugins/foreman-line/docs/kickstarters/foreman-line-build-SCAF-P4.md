# Build Kickstarter — SCAF-P4 Exit Vehicle

**Parcel:** SCAF-P4  
**Risk:** standard routing (D7), but parcel declares `risk: elevated`  
**Permission profile:** builder  
**Spec:** `plugins/foreman-line/docs/specs/active/SCAF-P4-exit-vehicle.md`  
**Worktree:** `C:\Repos\foreman-line-scaf-p4`  
**Branch:** `feat/foreman-line-scaf-p4`

---

## Step 0 — Gate (read before writing a single line of code)

1. Confirm you are in worktree `C:\Repos\foreman-line-scaf-p4`, branch `feat/foreman-line-scaf-p4`.
2. Read the spec at `plugins/foreman-line/docs/specs/active/SCAF-P4-exit-vehicle.md` in full.
3. Run `git diff --stat origin/main` — expected: only the spec + kickstarter (untracked new files; zero source changes from main after branching).
4. Run `node -v` in PowerShell — must report ≥ 24.11.1 (repo `engines.node >= 24.11.1`).
5. Run `npm install` in `plugins/foreman-line/` if `node_modules` is absent.
6. Run `node_modules/.bin/tsc --noEmit -p plugins/foreman-line/integration/tsconfig.json` from repo root — must be zero errors **before** you write anything. (If the `node_modules/.bin/tsc` path doesn't resolve, try `npx tsc --noEmit` inside `plugins/foreman-line/integration/`.)
7. Run the test suite to establish the baseline count. From repo root:
   ```bash
   cd plugins/foreman-line && npx vitest run
   ```
   Expected: ≥116 tests pass (W4-P2 baseline). Record the exact number.
8. **STOP** if any baseline check fails — report to coordinator, do not proceed.

---

## Context

SCAF-P4 is the W4 CI-integration goal's exit proof vehicle. Two deliverables:

1. **`integration/src/auth/coordinator-identity.ts`** — a bounded module at an `*/auth/*`
   surface. This path segment trips the W4-P3 derived-risk engine's security domain rule
   (`auth` substring within a path segment), making `derivedRisk = 'elevated'` for any diff
   touching this file.

2. **Harness tests** (`scaf-p4-harness.test.ts`) proving ≥3 load-bearing ACs:
   - AC-H1: `evaluateAuditTrigger({ declaredRisk: 'elevated', changedPaths: [...auth...] })` → no drift, triggered
   - AC-H2: `evaluateAuditTrigger({ declaredRisk: 'standard', changedPaths: [...auth...] })` → drift=true (the "drift-block" proof)
   - AC-H3: Fixture A→F chain (6 receipts, shared correlationId) passes `validateChain`
   - AC-H4: Forked correlationId at Stage F → `validateChain` returns `{ valid: false }`

The `foreman-line-ci.yml` is **BYTE-UNCHANGED** — the existing CI already runs `report.ts`
(Stage-E receipt emission including audit trigger evaluation) on every PR.

---

## Files to create / modify

| File | Action |
|------|--------|
| `plugins/foreman-line/integration/src/auth/coordinator-identity.ts` | **NEW** |
| `plugins/foreman-line/integration/src/index.ts` | **ADDITIVE** exports only |
| `plugins/foreman-line/integration/tests/scaf-p4-harness.test.ts` | **NEW** |
| `plugins/foreman-line/integration/tests/coordinator-identity.test.ts` | **NEW** |
| `.github/workflows/foreman-line-ci.yml` | **BYTE-UNCHANGED** |

No `package.json` changes. No new npm dependencies. No new directories beyond `src/auth/`.

---

## Critical implementation notes

### 1. `coordinator-identity.ts` — exact implementation

Create directory `plugins/foreman-line/integration/src/auth/` and write:

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

### 2. `integration/src/index.ts` — append after last block

The current file ends with the `docspine-report.js` export block (W4-P2). Append AFTER it:

```ts
// --- auth ---
export {
  type CoordinatorIdentity,
  CoordinatorIdentityError,
  parseCoordinatorIdentity,
} from './auth/coordinator-identity.js'
```

Do NOT touch any existing lines. The `.js` extension is required for ESM resolution.

### 3. `coordinator-identity.test.ts` — unit tests

Cover ACs AC2–AC5:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCoordinatorIdentity,
  CoordinatorIdentityError,
} from '../src/auth/coordinator-identity.js'

test('AC2: happy-path parse', () => {
  const result = parseCoordinatorIdentity({ login: 'alice', node_id: 'U_abc123' })
  assert.deepEqual(result, { login: 'alice', nodeId: 'U_abc123' })
})

// AC3: shape failures — write individual test() calls for each invalid shape listed in the spec
// AC4: error class shape (name, instanceof)
// AC5: extra fields are ignored
```

All 6 AC3 invalid-shape cases must be separate assertions or test blocks (lesson #30 —
write each invalid shape as an independent assertion, not one try/catch that only tests
the first failure).

### 4. `scaf-p4-harness.test.ts` — harness ACs

Imports:

```ts
import { evaluateAuditTrigger, toAuditTriggerEvaluation } from '../src/audit-trigger.js'
import { validateChain } from '../../receipts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
```

Constants (use distinct UUIDs from other test files):

```ts
const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-00000000000f'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-00000000000f'
const FORKED_CORRELATION_ID = 'bbbbbbbb-0000-4000-8000-00000000000f'
const HASH_A = '1'.repeat(64)
const HASH_B = '2'.repeat(64)
const HASH_C = '3'.repeat(64)
const HASH_D = '4'.repeat(64)
const HASH_E = '5'.repeat(64)
const HASH_F = '6'.repeat(64)
```

Fixture builder (same pattern as `audit-trigger-chain.test.ts`):

```ts
function makeReceipt(args: {
  stage: string
  sequence: number
  prevHash: string | null
  hash: string
  correlationId: string
  subjectKind: string
}): ReceiptDocument {
  return {
    schemaVersion: '1',
    kind: 'stage',
    stage: args.stage,
    claimRef: null,
    correlation: {
      correlationId: args.correlationId,
      sessionId: 'a1a1a1a1-0000-4000-8000-00000000000f',
      workflowId: WORKFLOW_ID,
      runId: 'a2a2a2a2-0000-4000-8000-00000000000f',
    },
    sequence: args.sequence,
    prevHash: args.prevHash,
    timestamp: new Date().toISOString(),
    subjectKind: args.subjectKind,
    subject: {},
    signature: null,
    hash: args.hash,
  } as unknown as ReceiptDocument
}
```

**AC-H1 test:**
```ts
test('AC-H1: declaredRisk=elevated + auth surface → triggered=true drift=false', () => {
  const result = evaluateAuditTrigger({
    declaredRisk: 'elevated',
    changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
  })
  assert.equal(result.triggered, true)
  assert.equal(result.drift, false)
  assert.equal(result.derivedRisk, 'elevated')
  assert.equal(result.decision, 'elevated')
  // toAuditTriggerEvaluation projection: triggered=true, reason contains domain
  const eval_ = toAuditTriggerEvaluation(result)
  assert.equal(eval_.triggered, true)
  assert.ok(typeof eval_.reason === 'string' && eval_.reason.includes('security'))
})
```

**AC-H2 test:**
```ts
test('AC-H2: declaredRisk=standard + auth surface → drift=true (drift-block harness)', () => {
  const result = evaluateAuditTrigger({
    declaredRisk: 'standard',
    changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
  })
  assert.equal(result.drift, true)
  assert.equal(result.triggered, true)
  assert.equal(result.derivedRisk, 'elevated')
  assert.equal(result.decision, 'elevated')
  // reason includes spec-drift note
  const eval_ = toAuditTriggerEvaluation(result)
  assert.equal(eval_.triggered, true)
  assert.ok(typeof eval_.reason === 'string' && eval_.reason.includes('spec-drift'))
})
```

**AC-H3 test:**
```ts
test('AC-H3: synthetic A→F chain passes validateChain', () => {
  const receiptA = makeReceipt({ stage: 'A', sequence: 0, prevHash: null,   hash: HASH_A, correlationId: SHARED_CORRELATION_ID, subjectKind: 'IntakeResult' })
  const receiptB = makeReceipt({ stage: 'B', sequence: 1, prevHash: HASH_A, hash: HASH_B, correlationId: SHARED_CORRELATION_ID, subjectKind: 'RegistrationResult' })
  const receiptC = makeReceipt({ stage: 'C', sequence: 2, prevHash: HASH_B, hash: HASH_C, correlationId: SHARED_CORRELATION_ID, subjectKind: 'DispatchResult' })
  const receiptD = makeReceipt({ stage: 'D', sequence: 3, prevHash: HASH_C, hash: HASH_D, correlationId: SHARED_CORRELATION_ID, subjectKind: 'VerificationResult' })
  const receiptE = makeReceipt({ stage: 'E', sequence: 4, prevHash: HASH_D, hash: HASH_E, correlationId: SHARED_CORRELATION_ID, subjectKind: 'IntegrationResult' })
  const receiptF = makeReceipt({ stage: 'F', sequence: 5, prevHash: HASH_E, hash: HASH_F, correlationId: SHARED_CORRELATION_ID, subjectKind: 'ClosureRecord' })

  const chainResult = validateChain([receiptA, receiptB, receiptC, receiptD, receiptE, receiptF])
  assert.equal(chainResult.valid, true)
})
```

**AC-H4 test:**
```ts
test('AC-H4: forked correlationId at Stage F → validateChain invalid', () => {
  const receiptA = makeReceipt({ stage: 'A', sequence: 0, prevHash: null,   hash: HASH_A, correlationId: SHARED_CORRELATION_ID, subjectKind: 'IntakeResult' })
  const receiptB = makeReceipt({ stage: 'B', sequence: 1, prevHash: HASH_A, hash: HASH_B, correlationId: SHARED_CORRELATION_ID, subjectKind: 'RegistrationResult' })
  const receiptC = makeReceipt({ stage: 'C', sequence: 2, prevHash: HASH_B, hash: HASH_C, correlationId: SHARED_CORRELATION_ID, subjectKind: 'DispatchResult' })
  const receiptD = makeReceipt({ stage: 'D', sequence: 3, prevHash: HASH_C, hash: HASH_D, correlationId: SHARED_CORRELATION_ID, subjectKind: 'VerificationResult' })
  const receiptE = makeReceipt({ stage: 'E', sequence: 4, prevHash: HASH_D, hash: HASH_E, correlationId: SHARED_CORRELATION_ID, subjectKind: 'IntegrationResult' })
  // Stage F has a different (forked) correlationId — must fail AC5c
  const receiptF = makeReceipt({ stage: 'F', sequence: 5, prevHash: HASH_E, hash: HASH_F, correlationId: FORKED_CORRELATION_ID, subjectKind: 'ClosureRecord' })

  const chainResult = validateChain([receiptA, receiptB, receiptC, receiptD, receiptE, receiptF])
  assert.equal(chainResult.valid, false)
})
```

**AC6 (conformance — ci yml unchanged):**
Add to `scaf-p4-harness.test.ts` OR as a new test in `conformance.test.ts`. Follow the
same byte-comparison pattern as the existing AC14/AC19 conformance test in `conformance.test.ts`.
Since the conformance test already has the pattern for `foreman-line-ci.yml`, add a comment
in the harness test referencing it, or add the SCAF-P4 assertion to the existing `conformance.test.ts`.

**Recommendation:** Add the SCAF-P4 `foreman-line-ci.yml` conformance check to the EXISTING
`conformance.test.ts` rather than duplicating the pattern in the harness file. This keeps all
yml byte-unchanged assertions in one place.

### 5. Test framework note

The test files in `integration/tests/` use **Node.js built-in `node:test`** (not Vitest).
Vitest is the runner but the tests are written with `import { test } from 'node:test'` and
`import assert from 'node:assert/strict'`. Follow the same pattern as existing test files.

### 6. `foreman-line-ci.yml` — BYTE-UNCHANGED

Do NOT add a job or step. Confirm with `git diff .github/workflows/foreman-line-ci.yml`
returning empty before committing.

---

## Test coverage requirements

| Test | AC |
|------|----|
| happy-path parse: `{ login: 'alice', node_id: 'U_abc' }` → `{ login: 'alice', nodeId: 'U_abc' }` | AC2 |
| AC3 shape 1: `null` → throws `CoordinatorIdentityError` | AC3 |
| AC3 shape 2: `'string'` → throws `CoordinatorIdentityError` | AC3 |
| AC3 shape 3: `{ login: '' }` → throws `CoordinatorIdentityError` | AC3 |
| AC3 shape 4: `{ login: 'alice' }` (missing node_id) → throws | AC3 |
| AC3 shape 5: `{ node_id: 'U_x' }` (missing login) → throws | AC3 |
| AC3 shape 6: `{ login: 'alice', node_id: '' }` → throws | AC3 |
| error .name === 'CoordinatorIdentityError' | AC4 |
| error instanceof CoordinatorIdentityError | AC4 |
| extra fields ignored | AC5 |
| AC-H1: elevated + auth path → triggered=true, drift=false | AC-H1 |
| AC-H2: standard + auth path → drift=true (drift-block harness) | AC-H2 |
| AC-H3: A→F fixture chain → validateChain valid | AC-H3 |
| AC-H4: forked correlationId at F → validateChain invalid | AC-H4 |
| `foreman-line-ci.yml` byte-unchanged vs origin/main | AC6 |

---

## Completion claim format

When done, output exactly:

```
SCAF-P4 BUILD COMPLETE
TSC: <error count>
BIOME: <diagnostic count>
TESTS: <pass>/<total>
FILES: <count of new/modified files>
COMMIT: <sha>
BRANCH: feat/foreman-line-scaf-p4
```

Then stop. Do not open a PR. Do not push. Coordinator handles that.
