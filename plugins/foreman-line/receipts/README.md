# Foreman Line — Receipt Chain Schema + Validator (W0-P4)

Fills the shape `ReceiptRef` (`plugins/foreman-line/contracts/src/envelope.ts:17`)
points to: what `hash` covers, how receipts chain per parcel, where chains live,
and how they are structurally validated — no hash recomputation, signature
verification, or tamper detection; those remain pcc's future `receipt verify` job.

## `ReceiptDocument` shape

One `kind` serves both per-stage (D8) and per-claim (plan §2 Stage D.1) receipts:

```ts
interface Signature { readonly alg: string; readonly keyId: string; readonly value: string }

interface ReceiptDocument {
  readonly schemaVersion: string
  readonly kind: 'stage' | 'claim'
  readonly stage: StageId                  // 'A'-'F', always present
  readonly claimRef: string | null         // non-null iff kind === 'claim'
  readonly correlation: CorrelationContext // workflowId is the chain key
  readonly sequence: number                // 0-based, contiguous; 0 = genesis
  readonly prevHash: string | null         // null iff sequence === 0
  readonly timestamp: string               // ISO_UTC_PATTERN
  readonly subjectKind: string             // free-form tag, not a closed enum
  readonly subject: JsonValue              // NOT deep-validated here: W0-P1's frozen contracts already enforced it at production time
  readonly signature: Signature | null     // reserved — see below
  readonly hash: string                    // see Hash domain
}
```

Types: `src/types.ts`; JSON Schema (draft-07 `SchemaObject`, never ajv's
`JSONSchemaType`): `schemas/*.json`, generated from `src/schemas.ts`, parity-tested.
`StageId`, `CorrelationContext`, `UUID_PATTERN`, `ISO_UTC_PATTERN`, `STAGE_IDS` come
read-only from the frozen `contracts` package via `../../contracts/src/index.js`.

## Hash domain (frozen by this parcel)

`hash = sha256Hex(canonicalize(doc))`, where `doc` is the full document with
the `hash` key removed (all eleven other keys included) and
`canonicalize`/`sha256Hex` are exactly the RFC 8785 (JCS) + SHA-256 algorithms
in `skills/parcel-compiler/tool/src/receipts/canonical.ts` and
`.../util/hash.ts` — cited by reference, never imported, vendored, or
re-implemented. Worked vector (`tests/fixtures/hash-vector-genesis.json`):
`hash = 06d29ab66ebffd099f4e9031f7c38ffb778a996f6e18726ab8eea30a35f3ee23`,
recomputed by `tests/hash-vector.test.ts` via `tests/support/canonical.ts`
(test-only, never shipped or exported). `prevHash` sits inside the hashed
bytes, so editing an earlier receipt breaks every later pointer —
tamper-evidence whose *detection* still requires pcc's recomputation.

## Storage / locator convention

One git-committed JSON file per receipt:
`docs/receipts/<workflowId>/<sequence, 6-digit zero-padded>-<stage>-<subjectKind-slug>.json`,
with `slug = subjectKind.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()`
(`ShapingResult` → `shaping-result`). `ReceiptRef.locator` is exactly that
path, POSIX separators, repo-root-relative. The slug transform is
non-injective (`HTTPResult` and `Httpresult` both slug to `httpresult`);
filename uniqueness within a chain comes from the sequence+stage prefix, not
the slug. `sequence` has a hard 6-digit ceiling: `<= 999999`.
`receiptPath()` (`src/paths.ts`) builds this path and guards its inputs:
`workflowId` must match `UUID_PATTERN`; `sequence` must be an integer in
0..999999; `stage` must be one of `STAGE_IDS`; the slugified `subjectKind`
must be non-empty and match `^[a-z0-9-]+$` (rejected, never stripped —
stripping changes locators). Violations throw a `RangeError` naming the
offending argument.

## Chain semantics

One chain per parcel, keyed by `correlation.workflowId` (stable across rework
retries; `runId` changes per attempt). Genesis (`sequence: 0`, `prevHash: null`)
is minted at Stage A; rework attempts append to the same chain, never fork.
**"Sealed" is a derived read, not a stored flag:** sealed iff the
highest-`sequence` receipt has `stage === 'F'` (`isSealed()`).
`validateChain` invariants: (1) `sequence` values exactly `0..N-1`,
contiguous, no gaps or duplicates; (2) `receipts[0].prevHash === null` and
`receipts[i].prevHash === receipts[i-1].hash` — **structural pointer
resolution only**: string equality against the *stored* prior `hash`, never
recomputed from canonical bytes; (3) identical `correlation.workflowId` and
`correlationId` throughout. A malformed member (not a JSON object, or
`correlation` not an object) never crashes validation: it is excluded from the
cross-member comparisons it cannot participate in and surfaces via its
per-document schema violations. `validateChain([])` is invalid ("chain
contains no receipts") — that verdict protects direct consumers (W3); the
CLI's exit-2 empty-directory usage error pre-empts it for directory input.

**The honest limit:** a coordinated edit that rewrites a receipt's content and
consistently patches every downstream `hash`/`prevHash` is NOT caught here —
only pcc's future `receipt verify` (cryptographic recomputation from bytes)
closes that gap. Nothing here claims otherwise.

## Validator surface and CLI

Library (`src/index.ts`): `validateReceiptDocument(doc)`, `validateChain(docs)`,
`isSealed(chain)`, `receiptPath(...)`. CLI: `npx tsx src/cli.ts validate <path>`
— a single receipt JSON file or a chain directory. The CLI admits any `*.json`
in the directory and sorts by full filename lexicographically, which coincides
with the 6-digit sequence prefix for conforming names; a filename<->payload
disagreement surfaces as whatever chain-invariant violation it causes. One
conforming file is a trivial chain (valid iff a genesis); zero receipt files
is a usage error. Exit codes (frozen; CI wiring deferred to W4): `0` valid;
`1` schema or semantic-invariant violation, every violation on stderr, not
just the first; `2` usage error (missing/unreadable path, empty chain
directory, bad invocation).

## Signature (reserved) and dependencies

`signature` is null by convention in this wave (not schema-enforced; no signing
infrastructure exists); the schema pre-defines the future shape, and signing
design stays out of scope. Runtime dependencies: exactly one, `ajv`,
machine-enforced by `tests/dependency-allowlist.test.ts`.
