---
ticket: KEO-156
title: P2 minimum verifier compatibility and canon freeze
status: done
owner: clint.morgan
created: 2026-07-29
updated: 2026-07-30
supersedes: null
superseded_by: null
risk: critical
surfaces:
  - docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md
  - docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md
  - canon/claims/CLAIMS_REGISTRY.yaml
  - canon/claims/EVIDENCE_READINESS_PROFILE.yaml
  - canon/claims/PROOF_MAP.yaml
routing_class: architecture/risk
permission_profile: builder-standard
data_classification: internal
---

# KEO-156 — P2 Minimum Verifier Compatibility and Canon Freeze

## Intent

Freeze the smallest buildable compatibility contract that lets an Evidence
Pack Sprint produce one real artifact whose mandatory integrity and
authorization properties can be checked offline through the existing
`Keon.Cli verify-pack` command. The parcel reconciles the current Keon Evidence
Pack, Runtime producer-receipt, verifier, Ledgerline-candidate, claims, and
proof surfaces without creating `llverify`, adopting `.llbundle`, or claiming
that the formats are equivalent.

P2 is a `keon-docs` contract/canon parcel only. It names every item already
proved, every exact P5 implementation/fixture gap, and every Sprint claim or
lane that remains blocked; it implements no verifier or Runtime behavior.

## Constraints

1. Use one clean isolated `keon-docs` worktree and branch
   `codex/keon-proof-led-p2-verifier-freeze`, created from current
   `origin/main` at `91987e1705803e0854e6d6c7246d3fb332e8f3ce`. If live
   `origin/main` advances, stop for coordinator re-grounding before edits.
2. Edit exactly the five Allowed Files. The dirty shared `keon-docs` checkout
   and every other repository are read-only.
3. Preserve the authority order:
   - the locked Keon Evidence Ledger and Runtime canons define proof and
     authority boundaries;
   - `CLAIMS_REGISTRY.yaml` controls claim truth and terminology;
   - `EVIDENCE_READINESS_PROFILE.yaml` is the buildable Review requirement
     registry;
   - `PROOF_MAP.yaml` routes claims to proof;
   - `PACKAGING_REGISTRY.yaml` controls the Review and Sprint packages and is
     read-only in P2;
   - the ratified initiative charter/tracker controls D1-D9, dependency edges,
     revenue boundaries, and human authority.
4. Preserve D3-D5 exactly:
   - no second `llverify` executable;
   - the compatibility gate is implemented through `Keon.Cli verify-pack`;
   - Review revenue does not depend on P2/P5;
   - no Sprint lane may promise or deliver a real independently verified
     Evidence Pack until every applicable mandatory gate check passes;
   - mandatory checks never return `SKIP`.
5. Ledgerline remains a non-canon, internal candidate source. Its
   `.llbundle` tar layout, four record types, per-record signatures, key
   manifest, checkpoint model, and `llverify` vocabulary are not compatible
   with or equivalent to the current Keon ZIP Evidence Pack, aggregate
   attestations, Runtime producer receipts, or `verify-pack`. P2 must record
   that non-equivalence and must not copy Ledgerline wire shapes into canon by
   implication.
6. Use canonical customer vocabulary only: `Keon Evidence Pack`, `receipt
   chain`, and `offline verifier`. Internal Ledgerline vocabulary may appear
   only in the internal compatibility/non-equivalence section and must remain
   excluded from public copy and customer deliverables.
7. Treat current implementation evidence conservatively:
   - `PackVerifier` recognizes top-level `version: v1` and optional
     `manifestVersion: "1"`, recomputes canonical JSON SHA-256 values for
     listed artifacts, verifies aggregate manifest and receipt-chain Ed25519
     attestations, enforces one receipt tenant, and can validate the signer
     against an external Phase-5 trust bundle;
   - `VerifyPackCommand` emits structured JSON and non-zero failure codes;
   - Runtime `ProducerReceiptContract` signs authorization/completion receipts
     and `SqliteProducerReceiptStore` enforces same tenant, actor,
     `operation_id`, and `request_fingerprint` at issuance;
   - none of that, alone, proves exhaustive archive coverage, a gap-free
     hash-linked chain, offline authorization-to-completion binding,
     completeness/seal, or Ledgerline conformance.
8. The P2 contract must classify each D5 check using exactly one primary
   disposition:
   - `EXISTING_PROOF` — implementation plus meaningful test proves the frozen
     check;
   - `P5_GAP` — P5 must implement and fixture the exact missing behavior;
   - `CLAIM_OR_LANE_EXCLUDED` — the affected claim/lane is blocked and the
     contract identifies the governing registry statement.
   A check may cite useful partial evidence, but partial evidence never earns
   `EXISTING_PROOF`.
9. The minimum gate must cover all of these checks:
   - version and schema recognition;
   - deterministic RFC 8785 JCS and SHA-256 recomputation;
   - complete listed-artifact coverage, including rejection of unlisted and
     duplicate archive entries;
   - Ed25519 signatures and trusted-key authorization;
   - tenant, actor/principal, correlation, and receipt identity consistency;
   - monotonic, gap-free, hash-linked receipt ordering;
   - authorization-to-completion binding for the same operation and request
     fingerprint;
   - explicit `SEALED`, `OPEN`, and failure semantics, with `OPEN` unable to
     satisfy the Sprint gate;
   - one negative fixture for every mandatory failure; and
   - deterministic machine-readable output and non-zero failure/open exit
     behavior.
10. The baseline evidence matrix must not overstate current support:
    - version recognition: partial implementation; full frozen schema
      validation is a `P5_GAP`;
    - JCS/SHA-256: partial implementation; RFC 8785 conformance corpus,
      exact raw-versus-canonical hash scope, and deterministic cross-platform
      proof are `P5_GAP`;
    - complete archive coverage and duplicate rejection: `P5_GAP`;
    - Ed25519 and trust-bundle authorization: partial implementation; the new
      gate must require trusted-key validation rather than accept Phase-4
      caller assertion, so the enforcement/fixtures are a `P5_GAP`;
    - tenant/identity consistency: partial implementation; receipt-wide
      actor/principal, correlation, and identity checks are `P5_GAP`;
    - gap-free/hash-linked sequence validation: `P5_GAP`;
    - Runtime issuance-time authorization/completion binding is useful
      producer proof but equivalent offline verifier binding is `P5_GAP`;
    - explicit completeness/seal and non-passing open status: `P5_GAP`;
    - stable JSON and base non-zero exits exist, while the frozen gate
      status/error vocabulary and hostile fixture coverage are `P5_GAP`.
11. P2 must freeze a finite P5 handoff, not a roadmap. Every `P5_GAP` row must
    name:
    - owning repository (`keon-systems`);
    - exact existing implementation/test anchor;
    - required behavior and error/status outcome;
    - positive and hostile fixture IDs;
    - expected exit behavior;
    - the claim/lane held closed until the fixture passes; and
    - an explicit proof command or test target.
12. Freeze one sanitized positive fixture and at least these hostile fixture
    classes, with stable IDs and expected outcomes:
    - unknown/downgraded schema or version;
    - malformed or non-canonical JSON and duplicate JSON keys;
    - altered artifact bytes/hash;
    - missing listed artifact, extra unlisted artifact, duplicate archive path;
    - invalid signature, unknown signer, unauthorized signer, revoked signer,
      expired signer, and wrong trust material;
    - cross-tenant, actor/principal, correlation, and identity mismatch;
    - missing, duplicate, reordered, or broken predecessor sequence/link;
    - missing/denied/mismatched authorization, operation mismatch, request
      fingerprint mismatch, and completion-before-authorization;
    - invalid head/count/checkpoint, missing seal, false sealed declaration,
      truncation, and a record after seal;
    - unstable output ordering or a failure/open result returning success.
13. No fixture may contain a real customer, secret, private production key,
    credential, production record, or invented evidence described as
    authentic. Test keys and sanitized deterministic identities must be
    unmistakably non-production.
14. If P5 is deferred, the contract must fail closed:
    - `KS-SPRINT-001` remains draft and non-publishable;
    - `LANE-RECEIPT-INSTRUMENTATION`,
      `LANE-RUNTIME-ENFORCEMENT`, and any other scope promising a real verified
      Evidence Pack remain blocked;
    - `LANE-HARNESS-BINDING` retains its existing diagnostic-only and
      no-offline-verification boundary;
    - Review assessment and customer-remediation recommendations may continue
      only within their existing non-artifact, non-certification boundaries.
15. Do not change Ledgerline status, canonize its schema, register `.llbundle`
    or `llverify`, weaken the locked Evidence Ledger/Runtime canons, change
    price/package/payment, make a claim public, advance G2/G4, or authorize a
    Sprint, customer use, payment, outreach, deployment, or production data.
16. P2 receives two independent reviews: one architecture/compatibility review
    and one defensive security/claims review. Neither reviewer edits, fixes,
    commits, or self-grades the parcel. Any unknown, `SKIP`, incompatible
    format assertion, missing fixture, or unresolved mandatory check is HOLD.
17. Gate 2 permits P2 dispatch only after coordinator validation and
    promotion. Gate 3 remains withheld; no push, PR, merge, Linear mutation, or
    external action is part of the builder parcel.

## Acceptance Criteria

1. `git diff --name-only origin/main` contains exactly the five Allowed Files.
2. `P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md` is an internal, dated,
   versioned contract that identifies `Keon.Cli verify-pack` as the sole CLI,
   identifies the current Keon ZIP Evidence Pack as the compatibility
   container, and records Ledgerline as a non-equivalent candidate reference.
3. The contract contains a row for every mandatory check in Constraint 9. Each
   row has exactly one primary disposition, direct source/test evidence,
   required fixture IDs, expected machine status/exit behavior, P5 ownership
   where applicable, and a claim/lane consequence.
4. No row treats comments, docs, an unexecuted vector, caller assertions,
   aggregate signing alone, or Runtime issuance-time validation as proof of a
   different offline verifier property.
5. The frozen P5 gap list is finite and implementation-ready. It does not
   create a second executable, adopt `.llbundle`, implement Ledgerline record
   types, or widen into the whole Ledgerline roadmap.
6. The positive fixture represents one sanitized authorization and completion
   for the same tenant, actor/principal, correlation, operation, and request
   fingerprint in a gap-free hash-linked chain whose complete artifact set,
   signer trust, head/count, and seal all validate offline.
7. The hostile matrix covers every class in Constraint 12. Unknown or missing
   required data fails; `OPEN` is explicit and cannot satisfy the Sprint gate;
   no mandatory check reports `SKIP`.
8. `CLAIMS_REGISTRY.yaml` is reconciled without adding a public claim:
   - the already-present machine-readable profile is no longer described as
     merely planned;
   - the compatibility contract is identified as internal and non-equivalent
     to Ledgerline;
   - `KS-PROFILE-001` remains internal/non-publishable and Ledgerline remains
     unfrozen unless separately ratified;
   - `KS-SPRINT-001` remains draft/non-publishable and its verifier dependency
     remains blocked on P5 evidence.
9. `EVIDENCE_READINESS_PROFILE.yaml` records the exact compatibility-contract
   reference and replaces aspirational `verify_pack` prose for ERP-DECISION-001
   through ERP-OFFLINE-010 with honest existing-proof/P5-gap/lane-exclusion
   dispositions. Its versioning rule is followed for every material mapping
   change.
10. `PROOF_MAP.yaml` routes `KS-PROFILE-001` and `KS-SPRINT-001` to the new
    internal contract, current verifier/Runtime evidence, the finite P5 gap,
    hostile fixture requirements, and the non-equivalence/claim blocks. No
    draft or planned artifact is upgraded to proven evidence.
11. `EXECUTION-TRACKER.md` records P2 as contract-frozen pending P5 and Gate 3,
    lists the bounded P5 gap and affected claim/lane holds, preserves G2
    blocked/payment NO-GO, and does not mutate historical D0/D1-D9 decisions
    or declare P5/P6 complete.
12. `PACKAGING_REGISTRY.yaml`, all locked canon JSON files, schemas, the
    initiative charter, Ledgerline draft, code repositories, Linear, and all
    non-Allowed files have zero diff.
13. The exact frozen matrix is internally consistent: every mandatory check,
    fixture ID, status/error, P5 gap, profile requirement, claim, and Sprint
    lane cross-reference resolves with no orphan or contradictory disposition.
14. Repository schema/claims validation, `claims:check`, YAML parsing,
    `git diff --check`, and exact-scope checks pass with no skipped mandatory
    check.
15. The architecture reviewer and security/claims reviewer each return PASS
    against every mandated focus question with no unresolved blocking or
    nonblocking finding.

## Out of Scope

- Editing `keon-systems`, Runtime producer code, `Keon.Cli`, `Keon.Verify`,
  schemas, test vectors, fixtures, samples, or implementation tests.
- Implementing P5 or P6, generating a real customer Evidence Pack, running a
  Sprint rehearsal, or asserting that the current sample pack meets D5.
- Creating `llverify`, supporting `.llbundle`, implementing or canonizing
  Ledgerline record types, or claiming Evidence Pack/Ledgerline equivalence.
- Editing `PACKAGING_REGISTRY.yaml`, locked canon JSON, package price, deposit,
  scope, payment mechanism, commercial gate, or public copy.
- Making `KS-SPRINT-001`, `KS-PROFILE-001`, or another claim publishable,
  proven, certified, or customer-usable.
- Editing the initiative charter, D1-D9, dependency graph, exit criterion,
  P1/P3-P7, BA1/BA2, H0-H4, or any revenue-path authority.
- Mutating Linear, pushing, opening a PR, merging, publishing, deploying,
  enabling payment, contacting a customer, or handling production/customer
  data.
- Editing any file outside the Allowed Files section.

## Context & References

- Ratified goal charter:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- Coordinator directive:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- Merged initiative authority:
  `docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
- Merged execution tracker:
  `docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`
- Ledgerline candidate draft:
  `strategy/ledgerline-v1-receipt-schema.md`
- Claims/profile/proof authorities:
  `canon/claims/CLAIMS_REGISTRY.yaml`,
  `canon/claims/EVIDENCE_READINESS_PROFILE.yaml`,
  `canon/claims/PROOF_MAP.yaml`, and
  `canon/claims/PACKAGING_REGISTRY.yaml`
- Locked canon:
  `canon/keon_evidence_ledger_canon_v1_locked.json` and
  `canon/keon_runtime_canon_v1_locked.json`
- Read-only `keon-systems` verifier sources:
  `src/Keon.Cli/VerifyPackCommand.cs`,
  `src/Keon.Verification/VerifyPack*.cs`,
  `src/Keon.Verify/PackVerifier.cs`,
  `src/Keon.Verify/CanonicalJson.cs`, and
  `src/Keon.Canonicalization/KeonCanonicalJsonV1.cs`
- Read-only Evidence Pack producer/proof sources:
  `src/Keon.Cli/Evidence/ReceiptChainV1.cs`,
  `src/Keon.Cli/Evidence/AttestationV1.cs`,
  `src/Keon.Cli.Tests/Phase3EvidencePackTests.cs`,
  `tests/Keon.Verify.Tests/PackVerifierTests.cs`, and
  `tests/vectors/evidence-pack-test-vectors-v1.json`
- Read-only Runtime receipt sources:
  `src/Keon.Runtime/Receipts/ProducerReceiptContract.cs`,
  `src/Keon.Runtime/Receipts/SqliteProducerReceiptStore.cs`, and
  `tests/Keon.Runtime.Tests/ProducerReceiptContractTests.cs`
- Read-only Evidence Pack canon/spec surfaces:
  `docs/internal/canon/keon_evidence_pack_canon.md`,
  `docs/compliance/evidence/SPEC-001-evidence-pack-structure.md`, and
  `src/Keon.Contracts/Evidence/schema/pack_manifest.v1.schema.json`

## Allowed Files

- `docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md`
- `docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`
- `canon/claims/CLAIMS_REGISTRY.yaml`
- `canon/claims/EVIDENCE_READINESS_PROFILE.yaml`
- `canon/claims/PROOF_MAP.yaml`

## Verification Plan

Run from the isolated `keon-docs` P2 worktree:

```powershell
rtk git ls-remote origin refs/heads/main
rtk git rev-parse origin/main
rtk git status --short --branch
rtk git diff --name-only origin/main...HEAD
rtk git diff --check origin/main...HEAD -- docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md canon/claims/CLAIMS_REGISTRY.yaml canon/claims/EVIDENCE_READINESS_PROFILE.yaml canon/claims/PROOF_MAP.yaml
rtk git diff --exit-code origin/main...HEAD -- canon/claims/PACKAGING_REGISTRY.yaml canon/keon_evidence_ledger_canon_v1_locked.json canon/keon_runtime_canon_v1_locked.json docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md strategy/ledgerline-v1-receipt-schema.md
rtk git diff --exit-code origin/main...HEAD -- . ":(exclude)docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md" ":(exclude)docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md" ":(exclude)canon/claims/CLAIMS_REGISTRY.yaml" ":(exclude)canon/claims/EVIDENCE_READINESS_PROFILE.yaml" ":(exclude)canon/claims/PROOF_MAP.yaml"
rtk npm install --ignore-scripts
rtk npm run claims:check
```

Also parse all three edited YAML registries, validate them against their
existing schemas, and run a deterministic cross-reference script that proves:

- all mandatory-check IDs have one primary disposition;
- all `P5_GAP` rows name a fixture, expected outcome, proof command, and held
  claim/lane;
- every hostile class in Constraint 12 appears at least once;
- no mandatory check has `SKIP`, `UNKNOWN`, or an empty disposition;
- no fixture is simultaneously positive and negative; and
- the profile, claims registry, proof map, contract, and tracker agree on the
  Ledgerline non-equivalence and P5 hold.

The architecture reviewer must answer:

1. Does the contract extend the existing `Keon.Cli verify-pack`/Keon Evidence
   Pack path without creating a second executable or importing Ledgerline wire
   contracts by implication?
2. Is each current-proof statement supported by actual implementation plus a
   meaningful test, and is every partial or differently shaped proof kept in
   P5?
3. Is P5 finite and buildable, with no hidden whole-Ledgerline roadmap or
   unresolved cross-repo schema ownership?
4. Do the contract, profile, claims, proof map, and tracker give the same
   disposition for every check and Sprint lane?

The security/claims reviewer must answer:

1. Can any missing, extra, duplicated, reordered, cross-tenant, unauthorized,
   mismatched, truncated, unsealed, or post-seal artifact reach a passing
   Sprint-gate result?
2. Can Phase-4 caller-supplied key material, Runtime issuance-time checks,
   aggregate signing, documentation, or a test-vector name be mistaken for the
   required offline proof?
3. Does every mandatory failure have a deterministic hostile fixture and a
   non-zero result, with no `SKIP` or success-bearing `OPEN` path?
4. Do all public/customer claims and affected Sprint lanes remain blocked
   until P5 evidence exists, while Review revenue stays independent?
5. Did exactly the five Allowed Files change, with Ledgerline, packaging,
   locked canons, code, Linear, and external systems untouched?

## Ratified Decisions

Clint Morgan ratified P2-R1 through P2-R5 on 2026-07-30. The following
decisions are authoritative for this parcel; changing one requires a new
ratification.

1. **P2-R1 — Profile activation and identifier.** Add one explicit
   opt-in minimum-Sprint profile to the existing `verify-pack --profile`
   surface as `--profile evidence-pack-sprint-v1`, leaving legacy/default pack
   behavior and `--profile l3` backward compatible. Add one optional top-level
   result field:
   `verification_profile: { id: "evidence-pack-sprint-v1", schema:
   "keon.verify-pack.profile-result.v1", verdict: "PASS|FAIL|OPEN" }`.
   `PASS` is Sprint-gate eligible only when every mandatory check passes;
   `FAIL` and `OPEN` are non-passing. Hardening the default instead is a
   compatibility-breaking product decision. The `PASS|FAIL|OPEN` verdict and
   `0|non-zero|6` exit contract apply only when
   `--profile evidence-pack-sprint-v1` is selected. Legacy/default and
   `--profile l3` behavior, output shape, and existing exit codes `0` through
   `5` remain byte-for-byte compatible.
2. **P2-R2 — Chain-completeness encoding.** Extend the existing
   receipt-chain attestation pattern as the distinct
   `attestations/receipt-chain.attestation.v2.json`; do not mutate or
   reinterpret v1. Its signed payload uses `v: "v2"`, `t:
   "receipt_chain"`, the existing tenant/actor/correlation/root/timestamp/key/
   algorithm fields, `chain_state: "OPEN|SEALED"`, integer `record_count`,
   `head_receipt_id`, lowercase-hex `head_sha256`, nullable RFC3339-UTC
   `sealed_at_utc`, and ordered `receipts` entries containing `sequence`,
   `receipt_id`, lowercase-hex `sha256`, nullable
   `predecessor_receipt_id`, and nullable lowercase-hex
   `predecessor_sha256`. The first predecessor pair is null; every later pair
   binds the immediately prior entry; sequence starts exactly at integer `1`
   and increments by one; `root_receipt_id` equals the first entry's
   `receipt_id`; count equals array length; head equals the final entry;
   `SEALED` requires a non-null seal time and `OPEN` requires null. The signed
   v2 attestation's root/count/head/state/seal tuple is the minimum-Sprint
   checkpoint; no separate inferred checkpoint is permitted. Signature and
   `signing_payload_hash` follow v1. The Sprint profile requires v2; a v1-only
   chain remains legacy-valid but is `OPEN`, never `PASS`, for the Sprint
   profile.
3. **P2-R3 — Open-result exit contract.** `OPEN` is
   machine-readable, non-passing for the Sprint gate, and returns a non-zero
   exit code `6`, which does not collide with the existing `0` success, `1`
   generic, `2` integrity, `3` trust-bundle, `4` authorization, or `5` L3
   failure codes.
4. **P2-R4 — Profile-version transition.** Publish the P2
   compatibility mapping as `profile_version: 1.1.0`; preserve the existing
   requirements, applicability rules, and status vocabulary; require new
   engagements to record `1.1.0`; preserve prior reports at their recorded
   version and never silently rescore them. Any future change to requirements,
   statuses, or applicability requires a separate major/minor canon ruling.
5. **P2-R5 — Diagnostic treatment of an open chain.** An `OPEN`
   chain may emit only the machine-readable diagnostic result above; it may
   not be delivered or represented as a Sprint-eligible Keon Evidence Pack.

## Adversarial Review Closures

The following fail-closed details resolve architecture and security findings
without widening P2 beyond the ratified profile:

1. **JSON hash preimage.** Every ZIP entry in the minimum-Sprint profile is
   JSON. Before hashing, reject malformed input, duplicate keys (including
   duplicates after Unicode NFC normalization), or bytes that are not exactly
   the RFC 8785 JCS UTF-8 encoding of the parsed value. Each
   `artifacts[].sha256` is lowercase-hex SHA-256 of those exact canonical bytes.
   `pack_hash` is `sha256:` plus lowercase-hex SHA-256 of the exact canonical
   `manifest.json` bytes. Raw and canonical hash scopes may not diverge.
2. **Portable ZIP inventory.** `manifest.json` is the sole unlisted control
   entry and must occur exactly once. Every other entry must occur exactly once
   in `manifest.artifacts`. Entry names are lowercase ASCII and match
   `[a-z0-9][a-z0-9._/-]*`; each `/`-separated segment is non-empty and is
   neither `.` nor `..`. Leading/trailing slash, `//`, backslash, colon,
   control characters, non-ASCII, and case variants deny. After those checks
   the normalized name is the unchanged name; duplicate raw or normalized
   names deny before dictionary insertion.
3. **Trust overrides.** When `--profile evidence-pack-sprint-v1` is selected,
   presence of `--allow-expired-trust-bundle` or
   `--allow-expired-tenant-key`, or any equivalent expiry bypass, returns
   `FAIL/4`. The profile never honors, ignores, or silently downgrades those
   switches. Other profiles retain existing behavior.
4. **Authorization reference.** Every completion receipt's
   `authorization_receipt_id` must equal the `receipt_id` of the exact signed,
   successful, earlier authorization receipt validated for that completion.
   A different otherwise-matching authorization receipt is not substitutable.
5. **Fixture determinism.** `P2-FX-VERSION-DOWNGRADE-001` means only a false,
   inconsistent, or downgraded Sprint-profile declaration and returns
   `FAIL/2`. Honest v1-only input is represented only by
   `P2-FX-SEAL-OPEN-001` and returns diagnostic `OPEN/6`. Add distinct hostile
   fixtures for both prohibited expiry switches, an authorization-receipt ID
   mismatch, archive path aliases/case variants, wrong root/checkpoint, and
   sequence origin other than `1`. Every fixture ID has one exact input and
   one exact result.

## Closure Evidence

Gate 3 for P2 only was granted and consumed on 2026-07-30.

- Exact reviewed head:
  `ca13608aa8a328ac860d6e3d087ace44529bbd2b`
- Pull request:
  `https://github.com/Keon-Systems/keon-docs/pull/23`
- Merge commit:
  `b8b89a901d1221ae7962cefc4d1b16c7d27e40c9`
- Live `origin/main` contains the exact reviewed head as an ancestor.
- Both independent exact-head architecture and security/claims reviews returned
  PASS with no blocking or nonblocking finding.
- The diff contains exactly the five Allowed Files; protected and excluded
  files have zero diff; whitespace checks pass.
- Forty-nine unique hostile fixtures have one outcome each, and all eleven
  adversarial closure fixtures agree across the contract, claims registry,
  evidence-readiness profile, proof map, and execution tracker.
- `claims:check` passes 12/12 tests, strict lint across 164 Markdown files, and
  drift validation across 10 claim IDs.
- All three edited YAML registries parse and validate against their existing
  schemas.
- KEO-156 records the exact evidence and remains `In Progress` because P5 and
  later deliverable-method work remain outstanding.

P5 remains unimplemented. `KS-SPRINT-001` and `KS-PROFILE-001` remain
draft/non-publishable. Ledgerline remains non-equivalent and non-canon. No
payment, customer, public-release, deployment, or BrowseAhead authority
advanced.
