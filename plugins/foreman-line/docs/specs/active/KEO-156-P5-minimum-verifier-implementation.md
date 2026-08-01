---
ticket: KEO-156
title: P5 minimum verifier implementation
status: active
owner: clinton.morgan
created: 2026-07-30
updated: 2026-07-30
supersedes: null
superseded_by: null
risk: critical
surfaces:
  - src/Keon.Verify/
  - src/Keon.Cli/
  - tests/Keon.Verify.Tests/
  - tests/Keon.Runtime.Tests/
  - src/Keon.Cli.Tests/
routing_class: architecture/risk
permission_profile: builder-architecture
data_classification: internal
---

## Intent

Implement the frozen P2 minimum-verifier contract through the existing
`Keon.Cli verify-pack` surface and close exactly `P5-GAP-01` through
`P5-GAP-10`. The work is split into dependency-ordered P5A through P5E parcels
so schema/canonical archive checks, identity/authorization, chain/seal,
CLI trust/output compatibility, and final fixture completeness remain
independently reviewable. No Sprint claim becomes publishable merely because
P5 passes.

## Constraints

1. Owning repository: `keon-systems`.
2. Frozen starting base for P5A and the read-only P5D compatibility baseline:
   `50895fa249e885bcdea127b2b9651d2b07555cbc`, the observed
   `keon-systems` `origin/main` on 2026-07-30.
3. P5A branch:
   `codex/keon-proof-led-p5a-schema-canonical-archive`.
4. P5A worktree:
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-p5a-20260730`.
5. P5B branch:
   `codex/keon-proof-led-p5b-identity-authorization`.
6. P5B worktree:
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-p5b-20260730`.
7. P5C branch/worktree:
   `codex/keon-proof-led-p5c-chain-seal` and
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-p5c-20260730`.
8. P5D branch/worktree:
   `codex/keon-proof-led-p5d-cli-trust-compatibility` and
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-p5d-20260730`.
9. P5E branch/worktree:
   `codex/keon-proof-led-p5e-fixture-completeness` and
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-p5e-20260730`.
10. P5A starts from the exact frozen base. P5B, P5C, P5D, and P5E are not
    dispatched until the immediately preceding parcel is merged. Each actual
    branch/worktree is created directly from that exact predecessor merge SHA,
    never from a stacked or guessed base. Every Step 0 records its predecessor
    merge SHA; any other integration base stops work.
11. For P5D compatibility proof, the coordinator creates a separate read-only
    detached baseline worktree at the frozen starting base. P5D compares the
    baseline CLI binary and the current CLI binary in the same test process,
    OS, runtime, and locale using the deterministic legacy compatibility vector
    frozen below. The detached baseline is never a product branch.
12. The shared `keon-systems` checkout is read-only and already contains an
   unrelated `.serena/project.yml` modification. Do not touch it.
13. Authoritative P2 contract:
   `keon-docs` merge
   `b8b89a901d1221ae7962cefc4d1b16c7d27e40c9`, blob
   `915dc38f23da778aea77161256f8eb44e326079c`, path
   `docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md`.
   Semantic drift from that exact artifact stops the active parcel and all
   successors.
14. Gap ownership is exact and non-overlapping:
    - P5A closes `P5-GAP-01` through `P5-GAP-03`.
    - P5B closes `P5-GAP-05` and `P5-GAP-07`.
    - P5C closes `P5-GAP-06` and `P5-GAP-08`.
    - P5D closes `P5-GAP-04` and `P5-GAP-10`.
    - P5E closes `P5-GAP-09`.
    Earlier parcels may create deterministic fixture infrastructure consumed by
    later parcels, but no gap is partially claimed or closed twice.
15. The Sprint core is invoked only for exact profile
    `evidence-pack-sprint-v1`. Default and `l3` continue through their current
    path. There is no second executable, bundle format, or public vocabulary.
16. Reuse `KeonCanonicalJsonV1`, `TrustBundleVerifier`,
    `KeyRoleEnforcer`, and `ProducerReceiptContract`; do not create alternate
    canonicalization, trust, signature, or Runtime-receipt contracts.
17. Sprint trust is mandatory and offline. Aggregate pack/attestation keys
    require existing `tenant_pack_signer` authorization. Runtime producer
    receipts require their existing literal `runtime-receipt-signer` issuer,
    role, contract, signature, and tenant trust binding. Caller key assertion
    alone is never sufficient.
18. Sprint profile rejects both existing expiry bypasses before verification
    with `FAIL/4`. Default and L3 retain their current handling.
19. Every accepted ZIP entry is exact RFC 8785 JCS UTF-8 JSON. Inventory
    validation occurs before dictionary insertion so duplicate/aliased entries
    cannot collapse. `manifest.json` is the sole unlisted control entry.
    P5A may add a strict RFC 8785 entry point to the existing
    `KeonCanonicalJsonV1` source of truth and route only the new Sprint profile
    plus its synthetic fixture factory through it. The existing
    `Canonicalize` entry points remain byte-compatible for default/L3 and other
    legacy callers; no second canonicalizer class, package, or dependency is
    authorized. Independent literal RFC 8785 numeric vectors must prove the
    strict entry point rather than self-grading through fixture output. The
    strict entry point preserves parsed string values and property names
    byte-semantically as RFC 8785 requires, sorts original property names by
    raw UTF-16 code units, and uses NFC-normalized property names only in the
    required post-NFC duplicate-rejection set. It must not normalize emitted
    Sprint JSON.
20. `OPEN` is diagnostic-only, returns `6`, and is never success-bearing.
    Mandatory checks never emit `SKIP`, `UNKNOWN`, or an empty verdict.
21. Review revenue, assessment, and remediation recommendations remain
    independent of P5. P5 neither fabricates customer evidence nor converts a
    Review finding into verifier proof.
22. P5B-R1 is ratified. The existing Runtime `ProducerReceipt` and
    `ProducerReceiptIssueRequest` may gain a backward-compatible nullable
    `CorrelationId` property. Existing constructors and legacy receipts remain
    valid when it is absent. When supplied, Runtime validates it, the store
    propagates it into the signed receipt and includes it in replay/request
    equality, and `ProducerReceiptCodec` signs it through the existing
    canonical payload. Sprint verification requires it to be non-empty and
    exactly equal to the manifest/attestation correlation. No unsigned wrapper,
    idempotency-key reinterpretation, alternate receipt, schema-version change,
    or database-column migration is authorized.
23. P5B-R2 is ratified. P5B may accept an injected
    `IProducerReceiptVerificationKeyProvider` that the caller represents as
    already tenant-scoped. P5B proves the existing Runtime contract, signature,
    issuer, role, identity, and authorization binding only. It does not
    authenticate the provider, establish tenant trust, or claim GAP-04 closure;
    P5D alone must construct that provider from authenticated tenant trust.
    P5B tests use only deterministic non-production keys.
24. P5B-R3 is ratified. The Sprint TestSupport project may reference
    `Keon.Runtime` so its fixture factory can create and seal the exact typed
    Runtime producer receipts. No direct NSec package, alternate signer, or new
    dependency/version is authorized.
25. P5D-R1 is ratified.
    Only when the exact `evidence-pack-sprint-v1` profile is selected,
    `--pubkey` is the required out-of-band trust-root public-key input, not an
    aggregate pack-signer assertion. The trust bundle's signing root must match
    that external key exactly before the bundle can authorize anything. A
    well-formed, self-consistent bundle rooted in any other key fails as
    unauthenticated trust material. Aggregate manifest/chain keys and Runtime
    receipt keys are then resolved only from the authenticated tenant trust
    records under the exact `tenant_pack_signer` and
    `runtime-receipt-signer` roles, status, tenant, scope, and validity rules.
    Default and `l3` retain the existing `--pubkey` meaning, output bytes, and
    exit behavior. No new CLI option, trust format, dependency, package,
    lockfile, solution change, or Allowed File is authorized.
26. P5D-R2 is ratified.
    Sprint validation requires
    `attestations/manifest.attestation.v1.json` to be present once and listed
    with the exact `attestation` / `v1` manifest declaration before any lookup
    or signature verification. Missing, malformed, or falsely declared input
    returns `FAIL/2` with stable `KEON_VERIFY_PROFILE_SCHEMA_INVALID`; no
    `KeyNotFoundException` or other exception may escape. This is a fail-closed
    completion of the already frozen Sprint schema/signature requirement, not
    a new artifact or bundle format.
27. P5E-R1 is ratified.
    Only for the exact `evidence-pack-sprint-v1` profile, receipt identity
    uniqueness and exact artifact/chain receipt-identity set equality are
    classified before receipt-chain topology, hash-link, root, checkpoint, or
    seal validation. Duplicate receipt identities and artifact/chain identity
    mismatches return stable
    `KEON_VERIFY_IDENTITY_RECEIPT_MISMATCH` / `FAIL/4`, including frozen
    fixture `P2-FX-IDENTITY-RECEIPT-001`. Genuine chain origin, ordering,
    predecessor, hash, root, count, head, checkpoint, completeness, and seal
    failures retain their frozen `FAIL/2` classifications. Default and `l3`,
    trust, authorization, output, claims, public behavior, and every other
    verifier result remain unchanged. This ordering/classification repair adds
    only `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs` to P5E's
    Allowed Files; it authorizes no broader verifier refactor or new behavior.

## Acceptance Criteria

1. P5A through P5E each change only their respective Allowed Files and start
   from the exact base recorded by their Step 0.
2. `P5-GAP-01` rejects unknown/downgraded Sprint declarations and validates the
   full manifest and v2-chain schema. A v2 Sprint manifest requires
   `manifestVersion` exactly `"1"` and every artifact `type` is exactly one of
   `"receipt"` or `"attestation"`; missing/unknown values fail. An honest
   legacy v1 pack is handled only by the frozen `OPEN/6` path.
3. `P5-GAP-02` rejects malformed, duplicate/post-NFC-duplicate, or
   non-canonical JSON and hashes only exact canonical bytes, with canonical
   `manifest.json` as the `pack_hash` preimage. Sprint canonicalization uses
   IEEE-754/ECMAScript number serialization exactly as RFC 8785 requires,
   including independently pinned boundary and exponent vectors, and preserves
   decomposed Unicode property names and values exactly while still rejecting
   post-NFC duplicate property names.
4. `P5-GAP-03` enforces the complete portable ZIP inventory before map
   insertion and rejects every missing, extra, duplicate, alias, case,
   separator, control, and non-ASCII hostile fixture from P2.
5. `P5-GAP-04` requires valid Ed25519 signatures, authenticated trust material,
   exact tenant/role/key authorization, active validity, and no expiry bypass.
6. `P5-GAP-05` proves one tenant, actor, principal, correlation, and unique
   receipt identity across manifest, attestations, receipts, chain entries, and
   authorization references. Under P5E-R1, duplicate receipt identities and
   artifact/chain identity-set mismatches are classified as identity
   `FAIL/4` before chain topology checks, while genuine chain defects retain
   their frozen `FAIL/2` classifications.
7. `P5-GAP-06` proves archive and attestation order, sequence origin `1`,
   uniqueness, gap-free increment, predecessor ID/hash linkage, and exact root.
8. `P5-GAP-07` parses and verifies signed Runtime producer receipts offline and
   binds each completion to the exact earlier successful authorization receipt,
   identity, operation, and request fingerprint. An otherwise-matching
   substitute authorization fails. The receipt's signed `CorrelationId` is
   mandatory for Sprint and matches the single pack correlation.
9. `P5-GAP-08` treats the signed v2 root/count/head/state/seal tuple as the sole
   checkpoint, returns `OPEN/6` for both frozen open cases, and rejects false,
   malformed, truncated, or post-seal evidence.
10. P5E closes `P5-GAP-09` with one catalog entry for `P2-FX-PASS-001` and every 49 hostile
    `P2-FX-*` identifier in the frozen P2 contract: 50 total catalog entries.
    A set-equality tripwire
    fails for missing/extra/duplicate IDs, absent expectations, unsanitized
    values, `SKIP`, or an unclassified result. Fixtures are deterministically
    generated from synthetic IDs and dedicated non-production test keys.
11. `P5-GAP-10` emits the optional top-level `verification_profile` object
    only for the exact Sprint profile, with ID
    `evidence-pack-sprint-v1`, schema
    `keon.verify-pack.profile-result.v1`, and verdict exactly `PASS`, `FAIL`, or
    `OPEN`. Repeated runs produce byte-identical stdout and stable error order.
12. Sprint exit semantics are exactly `PASS/0`, `OPEN/6`, and non-zero
    `FAIL` classified as P2 freezes (`1` through `5`). No failure or open result
    exits `0`.
13. P5D independently reproduces the exact-base default and L3 baseline using
    a read-only baseline `Keon.Cli.dll` built at
    `50895fa249e885bcdea127b2b9651d2b07555cbc` and a deterministic legacy vector
    emitted by `EvidencePackSprintFixtureFactory`. The compatibility test runs
    these exact argument sequences against baseline and current binaries:
    `verify-pack --path <legacy-pack.zip> --pubkey <public-key.json>` and the
    same arguments plus `--profile l3`. It sets redirected stdout encoding to
    UTF-8 without BOM, captures raw bytes including the platform newline,
    records exit code plus lowercase-hex SHA-256, and compares baseline/current
    in the same process, OS, runtime, locale, and working directory. P5D Step 0
    records the baseline DLL SHA-256 and both stdout/exit pins before edits;
    the compatibility test pins them as literals. The architecture reviewer
    rebuilds the baseline detached worktree and independently reproduces every
    pin; builder-generated golden files alone are insufficient.
14. The positive fixture is the only Sprint fixture returning `PASS/0`.
15. All ten frozen P2 proof targets pass, then the complete affected projects
    pass without network access.
16. `KS-SPRINT-001` and `KS-PROFILE-001` remain draft and non-publishable.
    P5 produces implementation/test evidence only; P6 rehearsal, independent
    review, environment evidence, and withheld human/release gates remain.
17. Each parcel receives two fresh independent frontier reviews before its own
    Gate 3 request: one architecture/compatibility review and one security/
    adversarial review. Reviewers never fix the builder branch.

## Out of Scope

- Changing the P2 contract, Evidence Readiness Profile, claim/proof/package
  registries, Review behavior, price, payment, entitlement, or customer flow.
- Publishing or activating `KS-SPRINT-001` or `KS-PROFILE-001`.
- Reinterpreting legacy/default/L3 validation, output, or exits; hardening those
  paths under cover of P5.
- Adopting Ledgerline `.llbundle`, `llverify`, record, checkpoint, signature,
  key-manifest, vocabulary, equivalence, or canon.
- Changing Evidence Pack production, scanner/BA1 behavior, MCP surfaces,
  public copy, deployment, or production data. Runtime issuance remains out of
  scope except the ratified P5B-R1 nullable signed-correlation propagation and
  replay-equality extension in the exact P5B Allowed Files.
- New external dependencies, package-reference/version, lockfile, or solution
  changes. Only the exact test-project-reference edits named in Allowed Files
  are permitted. Network lookups, live keys, customer data, external endpoints,
  and non-synthetic fixtures are forbidden.
- Linear mutation, push, PR, merge, publication, deployment, customer contact,
  payment, or any Gate 3 action from a builder/reviewer session.
- Editing the shared checkout or any path outside Allowed Files.

## Context & References

- `keon-docs@b8b89a901d1221ae7962cefc4d1b16c7d27e40c9:docs/INITIATIVES/keon-proof-led-commercial-entry/P2-MINIMUM-VERIFIER-COMPATIBILITY-CONTRACT.md`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Verify/PackVerifier.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Canonicalization/KeonCanonicalJsonV1.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Verify/TrustBundleVerifier.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Verify/KeyRoleEnforcer.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Runtime/Receipts/ProducerReceiptContract.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Cli/VerifyPackCommand.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:tests/Keon.Verify.Tests/PackVerifierTests.cs`
- `keon-systems@50895fa249e885bcdea127b2b9651d2b07555cbc:src/Keon.Cli.Tests/Phase5FederatedVerificationTests.cs`

## Allowed Files

### P5A

- `src/Keon.Canonicalization/KeonCanonicalJsonV1.cs`
- `src/Keon.Verify/EvidencePackSprintProfileModels.cs`
- `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/Keon.EvidencePackSprint.TestSupport.csproj`
- `tests/Keon.EvidencePackSprint.TestSupport/EvidencePackSprintFixtureFactory.cs`
- `tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj`
- `tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj`
- `tests/Keon.Verify.Tests/EvidencePackSprintProfileSchemaTests.cs`
- `tests/Keon.Verify.Tests/EvidencePackSprintArchiveCoverageTests.cs`
- `tests/Keon.Runtime.Tests/EvidencePackSprintCanonicalizationTests.cs`

### P5B

- `src/Keon.Runtime/Receipts/ProducerReceiptContract.cs`
- `src/Keon.Runtime/Receipts/SqliteProducerReceiptStore.cs`
- `src/Keon.Verify/EvidencePackSprintProfileModels.cs`
- `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/Keon.EvidencePackSprint.TestSupport.csproj`
- `tests/Keon.EvidencePackSprint.TestSupport/EvidencePackSprintFixtureFactory.cs`
- `tests/Keon.Runtime.Tests/ProducerReceiptContractTests.cs`
- `tests/Keon.Verify.Tests/EvidencePackSprintIdentityTests.cs`
- `tests/Keon.Verify.Tests/EvidencePackSprintAuthorizationBindingTests.cs`

### P5C

- `src/Keon.Verify/EvidencePackSprintProfileModels.cs`
- `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/EvidencePackSprintFixtureFactory.cs`
- `tests/Keon.Verify.Tests/EvidencePackSprintChainTests.cs`
- `tests/Keon.Verify.Tests/EvidencePackSprintSealTests.cs`

### P5D

- `src/Keon.Verify/EvidencePackSprintProfileModels.cs`
- `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`
- `src/Keon.Cli/VerifyPackCommand.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/EvidencePackSprintFixtureFactory.cs`
- `src/Keon.Cli.Tests/Keon.Cli.Tests.csproj`
- `src/Keon.Cli.Tests/EvidencePackSprintTrustTests.cs`
- `src/Keon.Cli.Tests/EvidencePackSprintCliContractTests.cs`
- `src/Keon.Cli.Tests/EvidencePackSprintCompatibilityTests.cs`

### P5E

- `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/Keon.EvidencePackSprint.TestSupport.csproj`
- `tests/Keon.EvidencePackSprint.TestSupport/EvidencePackSprintFixtureFactory.cs`
- `tests/Keon.EvidencePackSprint.TestSupport/evidence-pack-sprint-v1.catalog.json`
- `tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj`
- `tests/Keon.Verify.Tests/EvidencePackSprintHostileFixtureCoverageTests.cs`

If another file is required, stop for a coordinator-ratified amendment.
Parcels may not borrow each other's mutation authority. Reused files are
explicit serialization points and may change only in the dependency order
P5A -> P5B -> P5C -> P5D -> P5E.

## Verification Plan

Run from each isolated parcel worktree with the exact base/dependency state
recorded in its Step 0:

```powershell
rtk git rev-parse HEAD
rtk git merge-base HEAD origin/main
rtk git status --short --branch
rtk git diff --check
rtk git diff --name-only <parcel-base>...HEAD
rtk git diff --exit-code <parcel-base>...HEAD -- . <one-exclude-pathspec-per-Allowed-File>
```

Package restore is a build prerequisite, not verifier evidence. It may contact
configured NuGet sources. After the recorded restore step, every test command
uses `--no-restore`; the verifier, CLI processes, and fixtures make no network
request and use no external endpoint.

P5A proof targets:

```powershell
rtk dotnet restore tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj
rtk dotnet restore tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintProfileSchemaTests
rtk dotnet test tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintCanonicalizationTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintArchiveCoverageTests
```

P5B proof targets:

```powershell
rtk dotnet restore tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj
rtk dotnet restore tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj
rtk dotnet test tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj --no-restore --filter FullyQualifiedName~ProducerReceiptContractTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintIdentityTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintAuthorizationBindingTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore
rtk dotnet test tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj --no-restore
```

P5C proof targets:

```powershell
rtk dotnet restore tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintChainTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintSealTests
```

P5D baseline and proof targets:

```powershell
# Run the first two commands in the detached frozen-base baseline worktree.
rtk dotnet restore src/Keon.Cli/Keon.Cli.csproj
rtk dotnet build src/Keon.Cli/Keon.Cli.csproj --configuration Release --no-restore
rtk proxy certutil -hashfile src/Keon.Cli/bin/Release/net10.0/Keon.Cli.dll SHA256

# Run the remaining commands in the P5D worktree with
# KEON_BASELINE_CLI_DLL set to that exact baseline DLL absolute path.
rtk dotnet restore src/Keon.Cli.Tests/Keon.Cli.Tests.csproj
rtk dotnet test src/Keon.Cli.Tests/Keon.Cli.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintTrustTests
rtk dotnet test src/Keon.Cli.Tests/Keon.Cli.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintCliContractTests
rtk dotnet test src/Keon.Cli.Tests/Keon.Cli.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintCompatibilityTests
```

P5E and final integrated proof targets:

```powershell
rtk dotnet restore tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj
rtk dotnet restore tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj
rtk dotnet restore src/Keon.Cli.Tests/Keon.Cli.Tests.csproj
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore --filter FullyQualifiedName~EvidencePackSprintHostileFixtureCoverageTests
rtk dotnet test tests/Keon.Verify.Tests/Keon.Verify.Tests.csproj --no-restore
rtk dotnet test tests/Keon.Runtime.Tests/Keon.Runtime.Tests.csproj --no-restore
rtk dotnet test src/Keon.Cli.Tests/Keon.Cli.Tests.csproj --no-restore
```

After package restore, verification uses only local synthetic fixtures and
performs no application, fixture, customer, production, deployment, or payment
network action. Each handoff records exact test counts; rework must rerun the
complete relevant set and may not reduce the count without an explicit
fixture-by-fixture explanation.

Mandated architecture-review questions:

1. Is Sprint activation genuinely isolated so default and L3 bytes/exits remain
   identical to the exact-base captures?
2. Does one canonicalization implementation define every accepted hash
   preimage, with inventory rejection before duplicate collapse?
3. Do all ten P2 gaps have executable proof targets and exactly one disposition?
4. Can any builder-generated fixture or golden file self-grade a compatibility
   or completeness claim without independent reproduction?

Mandated security-review questions:

1. Can caller-supplied keys, absent trust, role confusion, expiry bypass, or an
   otherwise-matching authorization receipt produce `PASS`?
2. Can archive aliasing, duplicate/post-NFC keys, truncation, reordered chain
   entries, false sealing, or post-seal records evade a mandatory failure?
3. Is any `OPEN`, `FAIL`, `SKIP`, unknown, or empty result success-bearing?
4. Do fixtures contain only synthetic identifiers and dedicated test keys, with
   no secret, production, customer, or authentic-evidence representation?

## Stop Rules and Gate Hold

- Stop if P2 authority, the frozen base, or an existing source contract drifts.
- Stop if any required path is outside Allowed Files or requires a dependency,
  package, lockfile, solution, Runtime producer, or bundle-writer change.
- Stop if default/L3 baseline bytes cannot be reproduced before P5D edits.
- Stop if the required trust-role mapping cannot be expressed through existing
  `tenant_pack_signer` and `runtime-receipt-signer` contracts.
- Stop if a fixture cannot remain deterministic, synthetic, and offline.
- Stop on any product/security interpretation not literal in P2; do not invent
  a schema, claim, waiver, equivalence, or customer representation.
- Gate 3 remains held by default. P5A's parcel-specific Gate 3 was granted and
  consumed; it creates no authority for P5B through P5E. Passing tests and
  reviews authorize no push, PR, merge, Linear mutation, publication,
  deployment, payment, customer action, claim activation, P6 rehearsal, or BA1
  work for any remaining parcel.

## P5A Closure Evidence

- Parcel-specific Gate 3 for P5A only was granted and consumed on 2026-07-30.
- Repository: `Keon-Systems/keon-systems`.
- PR: `https://github.com/Keon-Systems/keon-systems/pull/173`.
- Frozen base: `50895fa249e885bcdea127b2b9651d2b07555cbc`.
- Exact reviewed head: `18e24b3e20079f2c499c08972317d6064d7bf9de`.
- Merge commit and verified live `origin/main`:
  `1ace5ce4c6d8862b46f0339a577026dd1b6cfa99`.
- The reviewed head is an ancestor of the merge commit.
- Final scope is exactly the ten amended P5A Allowed Files.
- Final post-rebase evidence: schema 14/14, Sprint canonicalization 39/39,
  archive 18/18, legacy canonicalization 17/17, full Verify 372/372, and full
  Runtime 241/241; zero failures and zero skips.
- Both final exact-head architecture/compatibility and security/adversarial
  reviews passed with no findings.
- Every required GitHub check passed before the guarded exact-head merge.
- Linear closure evidence is recorded on KEO-156 in comment
  `6e7d19b1-1c44-4061-a7c4-6d6226dc4be7`; the issue remains In Progress because
  P5B through P5E and later deliverable-method work remain.
- P5A closes exactly `P5-GAP-01` through `P5-GAP-03`. It grants no final
  verifier verdict, claim publication, P5B-P5E, P6, BA1, deployment, payment,
  customer, or external authority. No Gate 3 authority carries forward.

## P5E Closure Evidence

- Parcel-specific Gate 3 for P5E only was granted and consumed on 2026-07-30.
- Repository: `Keon-Systems/keon-systems`.
- PR: `https://github.com/Keon-Systems/keon-systems/pull/177`.
- Frozen predecessor/base:
  `b04cc9729d898ea0a649b4904dc12294cdf80852`.
- Exact reviewed head:
  `c2e12f66730c7d131456d075fd0c93a022888e68`.
- Merge commit and verified live `origin/main`:
  `7dd880ae73ce14632e28b7701e1e65ef06dbae69`.
- The reviewed head is an ancestor of the merge commit.
- Final cumulative scope is exactly the six ratified P5E Allowed Files.
- Final post-rebase evidence: hostile fixture coverage 6/6, identity 19/19,
  chain 13/13, seal 22/22, full Verify 441/441, full Runtime 246/246, and full
  CLI 149/149 against the pinned P5D baseline DLL; zero failures and zero
  skips.
- Both final detached architecture and robustness reviews passed with no
  remaining findings.
- Every required GitHub check passed before the exact-head merge.
- Linear closure evidence is recorded on KEO-156 in comment `c6ac46f3`; the
  issue remains In Progress for separately scoped Workflow Evidence Review
  deliverable-method work.
- P5E closes exactly `P5-GAP-09` and completes the P5A-P5E minimum-verifier
  implementation parcels. It grants no claim activation, P6 rehearsal,
  deployment, payment, customer, BrowseAhead, or other external authority.
  No Gate 3 authority carries forward.
