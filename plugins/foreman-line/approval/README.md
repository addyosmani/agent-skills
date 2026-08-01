# @foreman-line/approval — Human Approval Flow CLI, W1-P3

The Stage A **human gate** of the Foreman Line: a CLI by which a human
reviews the projected parcel set + Epic/Story tree, decides to approve or
reject, and — on approval — **binds** the decision to an RFC 8785 canonical
hash of the approved spec-set and mints the receipt chain's genesis
(Stage-A) receipt (charter F7/F8). This is the seam that turns "shaped and
projected" into "approved for registration": W1-P4 later refuses to
register unless the current content still hashes to the approved value.

## The human-gate contract

Three verbs, matching the shipped `routing-policy`/`receipts` CLI
precedent (`process.argv` parsing, `process.exitCode`, exit codes `0`
success / `1` semantic-or-validation failure / `2` usage error):

- **`show <slug|path>`** — renders the Epic/Story tree (Epic key + title,
  each Story key + title, `parcelSpecRefs`). Read-only; mints nothing; safe
  in CI / non-TTY.
- **`approve <slug|path> [--epic-title <title>] --approver <name>`** —
  renders the tree, then requires **both**:
  1. a live interactive TTY (`process.stdin.isTTY`), and
  2. a **typed confirmation phrase** — the human must type the exact
     `<slug>` being approved, compared with a linear-time exact-string
     check (`===`) — no regex, no backtracking risk.

  `--approver <name>` is **required**; omitting it refuses with exit `2`
  before either gate check runs (deterministic, auditable approver
  identity — never inferred from the OS user). There is **no**
  `--yes`/`--force`/auto-approve flag of any kind, and no environment
  variable can substitute for either gate. If stdin is **not** a TTY (CI,
  pipe, redirect), `approve` refuses with exit code `2` and **mints
  nothing** — no receipt file, no approval record, no partial write. Both
  gate checks, in order, are the *only* path in this package that reaches
  the mint/write step.
- **`reject <slug|path> [--epic-title <title>] [--reason <text>]`** —
  records a rejection (`decision: "rejected"`, optional reason, ISO-UTC
  timestamp, and the subject hash **for reference only**) to
  `active/<slug>.rejection.json`. Mints **no receipt** and produces **no**
  `approvedHash` binding — the receipt chain begins only at approval.

`--repo-root <path>` (all three verbs, optional) overrides the filesystem
root every call resolves paths against; it never touches approval
authorization, the TTY check, or the confirmation check.

## The composite approval subject + `approvedHash` (TOCTOU)

The F7 hash covers **both** the projected tree **and** the referenced spec
files' contents — not the projected artifact alone:

```
{ projectedResult: <the filled ShapingResult payload>,
  specSet: [ { ref: <parcelSpecRef, verbatim>, contentHash: sha256Hex(<spec file bytes>) }, ... in parcelSpecRefs order ] }
```

`approvedHash = sha256Hex(canonicalize(composite))` — computed over the
**canonicalized payload**, never the on-disk pretty-printed bytes, so
incidental formatting can never break a match and two spec-sets can never
collide. **TOCTOU rationale:** if only the projected artifact's bytes were
hashed, a human could edit a referenced `.md` spec *after* approval and
W1-P4 would register changed content against a still-matching hash. Because
each spec's content hash sits inside the hashed bytes, any post-approval
edit changes `approvedHash`, and W1-P4's registration-time re-derivation
(out of scope here) forces re-approval.

## One receipt — genesis IS the Stage-A receipt

Exactly **one** `ReceiptDocument` is minted at approval: the genesis
(`sequence: 0`, `prevHash: null`, `stage: 'A'`, `subjectKind:
'ShapingResult'`, `subject` including `approvedHash`, `signature: null`),
validated with the shipped `receipts` `validateReceiptDocument` and stored
at the shipped `receiptPath(workflowId, 0, 'A', 'ShapingResult')` →
`docs/receipts/<workflowId>/000000-A-shaping-result.json`. **W1-P4 inherits
this reading:** there is one Stage-A receipt (the genesis), never two at
sequence 0 and 1; W1-P4 appends the Stage-B receipt at `sequence: 1` with
`prevHash` = the genesis's `hash`, to the same `workflowId` chain.

## Correlation — generated and persisted

The projected artifact carries no correlation, and the chain key
(`correlation.workflowId`) must be stable P3 → P4. This CLI **generates a
fresh `CorrelationContext`** at approval (`node:crypto` `randomUUID()` for
`correlationId`/`sessionId`/`workflowId`/`runId`) and persists it in the
approval record. W1-P4 reads `workflowId` from the record to rejoin the
same chain.

## The `<slug>.approval.json` sidecar

Written to `plugins/foreman-line/docs/specs/active/<slug>.approval.json` —
a non-`.md` sibling the spec-linter never collects. Contains
`approvedHash`; `artifactRef` (the repo-relative path to the projected
artifact actually presented) **and** the full subject manifest verbatim
(`projectedResult` payload + ordered `specSet` with per-ref `contentHash`);
`decision: "approved"`; an ISO-UTC `timestamp`; the approver identity; the
minted `CorrelationContext`; and the minted `ReceiptRef`. **Refuses to
overwrite** an existing `<slug>.approval.json` (throws naming the colliding
path) — a re-approval after amendment is a deliberate, human-driven act (a
fresh invocation after the stale sidecar is removed), never a silent
clobber.

## Vendored canonicalization — parity-pinned, never imported cross-plugin

The shipped `receipts` (W0-P4) package exports no canonicalizer or hasher
by design; its authority is `skills/parcel-compiler/tool/src/receipts/canonical.ts`
+ `util/hash.ts`, cited by reference only. This package vendors a minimal
`src/canonical.ts` (RFC 8785 object-key sort, no whitespace) + `src/hash.ts`
(`sha256Hex` via `node:crypto`) — never imports pcc internals, never
modifies `receipts/`. Drift is caught mechanically: a parity test
reproduces the `receipts` package's frozen worked vector
(`06d29ab66ebffd099f4e9031f7c38ffb778a996f6e18726ab8eea30a35f3ee23`) by
canonicalizing `receipts/tests/fixtures/hash-vector-genesis.json`'s
document (with `hash` removed) and hashing it.

## Projection invocation — load-if-exists, else project-then-present

For `show`/`approve`/`reject` the CLI resolves the projected artifact
`active/<slug>.projected.shaping-result.json`. If it already exists, it is
loaded and rendered unchanged (the approval subject is the on-disk
artifact). If it does not exist, the shipped `projection`
`writeProjectedResult(inputPath, epicTitle)` produces it first — with
`--epic-title` used **only** on this project path — then it is rendered.
Approval always binds to **the artifact actually presented**, never one
regenerated or mutated after the render.

## Amendment / re-approval semantics

Because `<slug>.approval.json` refuses to overwrite, and because
`approvedHash` changes the instant any referenced spec or the projected
tree changes, the only path after any post-approval amendment is a fresh,
explicit re-approval (removing the stale sidecar and running `approve`
again). W1-P4's hash-mismatch refusal at registration time (out of scope
here) is the other half of this guarantee.

## Import mechanism (relative ESM only; bare specifiers banned)

```ts
import { type ShapingResult, shapingResultSchema } from '../../contracts/src/index.js'
import { receiptPath, validateReceiptDocument } from '../../receipts/src/index.js'
import { writeProjectedResult } from '../../projection/src/index.js'
import { readShapingResult } from '../../shaping/src/index.js'
```

No npm workspace linking exists across `plugins/foreman-line/*`. The bare
specifiers `@foreman-line/contracts`/`@foreman-line/receipts`/
`@foreman-line/projection`/`@foreman-line/shaping` **do not resolve** and
MUST NOT be used. This package's only runtime dependency is `ajv`
(reused to re-validate the projected `ShapingResult` against the frozen
`shapingResultSchema`); all hashing uses `node:crypto`.

## Verification note (install precondition)

Because cross-package imports are relative with no workspace hoisting, run
`npm install` in each of: `plugins/foreman-line/approval/`,
`plugins/foreman-line/contracts/`, `plugins/foreman-line/receipts/`,
`plugins/foreman-line/projection/`, `plugins/foreman-line/shaping/`,
`plugins/foreman-line/spec-linter/`, and (transitively)
`plugins/foreman-line/permission-profiles/` and
`plugins/foreman-line/schema-scaffold/`. Verification runs in
**PowerShell**, `node -v` first (`>=24.11.1`).

Commands: `npx tsc --noEmit` · `npx tsx --test tests/*.test.ts` · `biome check .`
