# Foreman Line — Routing Policy Schema + Validator (W0-P3)

The policy-as-code artifact that governs model/agent-count selection at
dispatch (plan §5, D5/D6). This package ships the schema, the TypeScript type,
the concrete v0.1 `routing-policy.yaml`, and a validator. Primary-model policy
evaluation and the optional shadow-route execution boundary live in
`@foreman-line/dispatch`; this package does not perform provider transport.

## Schema shape

`RoutingPolicy` = `{ classes, data_classification, roles, model_tiers, shadow_routes }`.

- **`classes`** — keyed by `routing_class` value; MUST include the four
  reconciled values (`boilerplate`, `standard-feature`, `architecture/risk`,
  `implementation/standard`) but may carry additional class keys. Each entry:
  `allowlist` (tier names), `ceiling_usd` (> 0), optional `security_flavored`.
- **`data_classification`** — exactly `public` / `internal` / `restricted`,
  each an `eligible_models` list.
- **`roles`** — `coordinator`, `verifier`, `builder`. Schema only requires
  non-empty strings; the frontier pin is enforced as an invariant, not a
  schema `const`, so a schema-valid-but-wrong document is distinguishable from
  a structurally invalid one.
- **`model_tiers`** — resolves each tier name used above to concrete model
  ids. `'frontier'` is the one tier name the validator's invariants depend on
  literally, and its *contents* are anchored against a validator-code
  registry (see "Frontier-tier anchoring registry" below), not left to the
  policy document's own say-so. **Every other tier name (`standard`,
  `economy` in v0.1) is this parcel's own policy content, revisable quarterly
  without touching the validator** — it intentionally diverges from plan
  §5's illustrative `small`/`medium`/`large` labels, which were never
  binding.
- **`shadow_routes`** — separately governed advisory sidecars, never model
  tiers. v0.1 requires the `cerebras-shadow` route to remain public-only and
  candidate-only. A route declares its adapter, approved task types, live
  discovery requirement, zero authority, no tools/effects, and exclusion from
  the Coordinator and verifier roles. The policy neither contains credentials
  nor records a host's current availability; the host verifies availability at
  invocation time and the Parcel supplies the exact public inputs.

Types live in `src/types.ts`; schemas in `schemas/*.json` (hand-authored as
`SchemaObject`, never ajv's `JSONSchemaType`); `tests/parity.test.ts` proves
the two never drift.

## The six enforced invariants

1. **Classification gates before cost (D6):** `eligible_models` must narrow
   monotonically — `restricted ⊆ internal ⊆ public`.
2. **Coordinator/verifier frontier pinning (D4):** both must equal `'frontier'`
   exactly. **Out of reach:** runtime distinctness — coordinator and verifier
   resolving to *separate agent instances* at dispatch — is a W2-P3/W3
   dispatch-time property; this parcel validates the tier pinning only.
3. **Security override + derived guard:** a class self-declaring
   `security_flavored: true` must have every allowlisted tier equal
   `'frontier'` (not merely contain it). Any class whose key matches
   `/security|audit/i` without the flag is rejected outright — declared +
   derived, never "somehow."
4. **Ceiling presence:** `ceiling_usd` required and `> 0`, enforced at the
   schema layer (a static bound needs no cross-field logic).
5. **Frontier-tier anchoring:** every model id in `model_tiers.frontier` must
   belong to `KNOWN_FRONTIER_MODELS`. See below.
6. **Shadow-route containment:** every shadow route is public-only, requires
   live discovery, has no authority/tools/effects, is candidate-only, and
   excludes the Coordinator and verifier. The route key must equal its adapter
   id, preventing a policy entry from silently referring to a different adapter.

## Cerebras shadow route

`cerebras-shadow` is an optional public-analysis sidecar. The executable entry
point is `executeShadowRoute` from `@foreman-line/dispatch`. Before discovery,
it requires a public Parcel authorization reference, a policy- and
Parcel-allowed task type, and a SHA-256 binding to the exact canonical JSON
input (`hashShadowPublicInput`). It also requires an independent reviewer
identity distinct from the adapter.

Caller-constructed authorization fields are claims, not authority. The caller
must inject a trusted host-local `resolveParcelAuthorization(authorizationRef)`
boundary. It must return exactly `parcelId`, `dataClassification`,
`allowedTaskTypes`, and `publicInputSha256`; dispatch independently validates
that record and requires it to match every request claim and the actual input
digest. A missing, throwing, malformed, non-public, or mismatched resolver
fails closed before discovery without persisting raw resolver details.

Canonical public input must be dense JSON and is capped at 65,536 UTF-8 bytes.
Sparse arrays, cycles, non-finite numbers, non-plain/accessor-bearing objects,
and non-JSON values are rejected. Authorization references are capped at 512
bytes, reviewer identities at 256 bytes, Parcel identities at 128 bytes, and
allowed-task lists at 16 unique values of at most 128 bytes each.
Dispatch canonicalizes, hashes, parses into a deep clone, and recursively
freezes this input before its first asynchronous dependency call. Authorization,
discovery, or caller-side mutation therefore cannot change the exact snapshot
later supplied to the adapter.
The same pre-await snapshot freezes `workflowId`, route/task selection, every
Parcel claim field and a copied allowed-task list, authorization reference, and
independent reviewer. Authorization comparison, policy resolution, discovery,
invocation, receipts, and review binding use only that snapshot. The three
dependency function references are also captured before awaiting resolution,
so an async closure cannot replace discovery or invocation mid-flight.

The caller also injects host-local `discoverAdapter` and `invokeAdapter`
functions; the repository provides no Cerebras credential or network
implementation.
Discovery runs on every invocation. Only the exact normalized object
`{ status: 'verified_available' }` permits provider execution. Any exception,
unavailable result, or malformed/extended discovery value writes a normalized
skip receipt and proceeds without Cerebras.

The frozen invocation request is fixed to a runtime-frozen empty tools array,
no effect capability, no authority, and candidate-only use. Untrusted output must have exactly a
non-empty `candidate` string and a non-empty-string `evidence_refs` array;
candidate text is capped at 32,768 UTF-8 bytes, with at most 64 evidence
references of at most 2,048 bytes each. Sparse/extended arrays and additional
authority/gate fields are rejected before receipt creation. An accepted result has fixed
`gateImpact: 'none'`, `approvalImpact: 'none'`, and
`reviewImpact: 'pending_independent_review'`. The receipt binds the candidate
digest to that pending reviewer but deliberately does not store raw candidate,
probe, or provider-failure content. A candidate never counts as the independent
review itself. Accepted evidence references are defensively copied and frozen;
candidate and skip results, their no-tools arrays, and the independent-review
binding are runtime-frozen so later mutation cannot create digest/receipt drift.

Do not add `CEREBRAS_API_KEY`, provider requests, probe outcomes, or other
availability state to this policy file. Actual adapter discovery and provider
transport remain host/operator-owned integration work.

## Frontier-tier anchoring registry

Invariants 2 and 3 pin roles and security-flavored classes to the tier
*name* `'frontier'` — but nothing about tier names constrains which model
ids actually populate `model_tiers.frontier` inside the policy document
itself. A policy document is mutable data under validation; letting it
define its own notion of "frontier" would mean it could satisfy every other
invariant while quietly redefining frontier to point at a cheaper model,
silently gutting D4's pinning and the §5 security hard-override in one edit.

`src/validator.ts` therefore carries `KNOWN_FRONTIER_MODELS` — v0.1:
`['claude-opus-4-8']` — as a constant in reviewed, tested code, not as
policy content. Invariant 5 rejects any `model_tiers.frontier` entry absent
from this registry. This is intentional friction: redefining what counts as
frontier (the quarterly model revisit plan §5 anticipates) requires a code
change with a test, never a one-line policy-file edit.

## Exit-code contract

| Code | Meaning |
|---|---|
| `0` | Valid |
| `1` | Schema or semantic-invariant violation — every violation on stderr, not just the first |
| `2` | Usage error — missing/unreadable path, bad invocation |

Mirrors pcc's contract *style* (same meaning for 0/1/2); it does not claim
parity with pcc's additional `3`/`4` codes, which this validator has no use
for. No CI workflow wiring — that's W4.

## Usage

```bash
npx tsx src/cli.ts validate routing-policy.yaml
```

## Runtime dependencies

Exactly two: `ajv` (validation engine) and `yaml` (policy parsing), both
machine-enforced by `tests/dependency-allowlist.test.ts`.
