# /loop Directive — Keon Proof-Led Portfolio Priority

Modeled on `docs/kickstarters/foreman-line-coordinator-loop.md`. Governs the
ratified goal charter at `docs/goals/keon-proof-led-portfolio-priority/charter.md`
and the triaged plan review at
`docs/goals/keon-proof-led-portfolio-priority/plan-review-findings.md`.

## GOAL OWNERSHIP — read before dispatching anything

> **Goal owner: the primary Codex coordinator session designated by Clint
> Morgan on 2026-07-29.** One goal, one coordinator. Ownership transfers only
> at a parcel boundary through this block and a session handoff. If ownership
> is ambiguous or another coordinator is live, stop and report; never assume.

### Current ownership and stop state — 2026-08-01

The primary Codex coordinator resumed ownership at the post-plan-review parcel
boundary. WGT-D1 through WGT-D10 and WGT-A1 through WGT-A6 are ratified, and
the mandatory repaired-plan follow-up review passed. The loop is stopped at
WGT-P0A preflight because the Foreman plugin is untracked and absent from all
available `agent-skills` base branches while the containing checkout is dirty.
No builder is live. Resume only after the owner chooses tracked-plugin
bootstrap or explicitly ratifies a local-only coordinator-ledger exception.

## Standing authorizations

1. **Gate 2 — dispatch is granted** exactly for P0-P2, P3A-P3E, P4-P7, and
   BA1-BA2, subject to the charter dependency order, exact Allowed Files, one
   branch/worktree per repo parcel, and every dispatch's Step 0
   restate-and-stop gate. Clint Morgan additionally granted parcel-specific
   Gate 2 authorization for bounded P0V on 2026-07-29, before P0 Gate 3.
2. **Gate 3 — merge is withheld by default.** Clint Morgan granted and consumed
   parcel-specific Gate 3 for P1 through PR #22, P2 through PR #23, and P5A
   through PR #173 on 2026-07-30. A complete green deterministic and
   adversarial evidence chain produces a merge-decision request; it never
   authorizes merge. No merge, squash merge, rebase merge, or equivalent
   integration action occurs without Clint's parcel-specific approval.
3. **External actions are not authorized.** H0-H4, customer contact, public
   publication, payment enablement or acceptance, invoices, legal acceptance,
   production deployment, and customer-data handling always stop for explicit
   approval.
4. Push and draft-PR creation are permitted only when a parcel spec explicitly
   includes them and all pre-PR checks are green. They do not imply Gate 3.

## Authorization amendment — 2026-07-30

Clint Morgan granted the primary coordinator **full portfolio execution
authority** on 2026-07-30: “Everything ... full authorization to bring it all
into fruition.” This amendment supersedes the previous per-parcel Gate 3 and
external-action holds for this initiative only.

The coordinator may now publish, open and merge parcel PRs; update Linear;
publish evidence-backed public material; deploy approved production changes;
enable and accept payment; issue the agreed commercial materials; contact and
onboard customers; and handle the minimum necessary customer data for delivery.
BA1 and BA2 are also released from their former authority hold.

This is not authority to skip evidence or invent product behavior. Every action
still requires its parcel contract, clean isolated worktree, deterministic and
adversarial verification where required, claims-to-evidence mapping, security
and payment checks, and an auditable Stage F record. Existing capacity and
non-dependency rules remain: BrowseAhead stays WIP one and may not delay the
Review-first revenue path. A failed release gate is a finding to repair, not a
revived authorization hold.

## Active release sequence

1. Publish and merge BA1, then shape BA2 against its frozen contract in the
   bounded BrowseAhead lane.
2. Shape and execute P3A through P3E for the $2,500 Workflow Evidence Review
   paid path, using the existing website and commercial persistence contract.
3. Run P4 Review rehearsal and P7 direct-motion preparation in parallel where
   their allowed files do not collide; P7 may now send only evidence-backed,
   approved customer communications.
4. Run P6 only after P2, P4, and P5 evidence is recorded, then map every
   public/customer claim to the evidence it actually proves.
5. Execute the payment, deployment, customer-delivery, and public-release gates
   from the resulting evidence packet; close the initiative only after the
   charter exit criterion is demonstrated in the applicable live environment.

## Coordinator role

The coordinator consumes verification; it does not self-grade. At every
iteration read the charter, this directive, and the active parcel handoff.
Follow `docs/COORDINATOR-PATTERN.md`,
`skills/parcel-driven-development/SKILL.md`, `docs/SPEC-CONVENTION.md`, and the
standing constraints referenced by each kickstarter.

## Queue and dependency order

1. P0V — claims-validation repair, now the sole prerequisite to resuming P0
   Gate 3 evidence.
2. P0 — control-plane reconciliation; implementation is complete but remains
   HOLD until P0V is green and integrated.
3. After P0 evidence and an explicit Gate 3 merge decision:
   - P1 — Review/Sprint packaging closure.
   - P2 — minimum verifier compatibility and canon freeze.
   - BA1 — KEO-197 contract freeze, only if WIP capacity is not needed for a
     revenue-critical blocker.
4. After P1:
   - P3A — commercial state-machine contract.
   - P4 — Review rehearsal.
   - P7 — direct-motion preparation; send nothing.
   - H0 remains a human gate.
5. P3A -> P3B -> P3C/P3D -> P3E.
6. P2 -> P5; P2 + P4 + P5 -> P6.
7. BA1 -> BA2, WIP limit one and no revenue-path dependency.
8. H0-H4 are recorded milestones, never coordinator-dispatched parcels.

No dependent parcel may be shaped as active implementation before its required
predecessor is merged or explicitly deferred by an amended charter.

## Per-parcel loop

1. Dispatch a fresh shaping session with a docs-only envelope.
2. Verify every shaping claim on disk and lint the exact spec.
3. Use Gate 2 only for a spec whose parcel ID, branch, worktree, Allowed Files,
   forbidden surfaces, verification, evidence, and stop rules match the
   charter.
4. Dispatch a fresh builder in the named isolated worktree. Step 0 must restate
   the goal, exact Allowed Files, forbidden files, branch, worktree, test
   count/baseline where applicable, and stop before edits for coordinator
   confirmation.
5. Rule on flags. A real contract or scope gap becomes an amendment committed
   separately before implementation; never let a builder expand authority.
6. Map each completion claim to on-disk evidence. Wrong-shaped claims are
   presumptively empty.
7. Run deterministic verification in the repo-prescribed environment.
8. Run one independent frontier adversarial review for standard-risk parcels
   and two for architecture, verifier, security, billing, or public-claim
   parcels. Reviewers never fix or commit.
9. Triage every finding. Rework receives a fresh Step 0 gate and test-count
   tripwire.
10. When the chain is green, prepare the evidence packet and stop for the
    parcel-specific Gate 3 decision.
11. Only after explicit Gate 3 approval: merge, perform Stage F closure, move
    the spec to done, update initiative state and Linear evidence, and remove
    the worktree/branch when safe.

## Completed prerequisite

**P0V — claims-validation repair**

- Execution state: **MERGED — 2026-07-29**.
- Authorization: parcel-specific Gate 2 granted by Clint Morgan on 2026-07-29.
- Gate 3: granted for P0V only by Clint Morgan on 2026-07-29.
- PR: `Keon-Systems/keon-docs#20`.
- Reviewed head: `b015ff55e143fccedab5939355733e849c7ae362`.
- Merge commit: `49a523731521a08f366cb7316fee831159296217`.
- Purpose: unblock P0's mandatory aggregate claims gate without weakening
  claim-ID validation or changing any claim, registry, product, or commercial
  authority.
- Required outcome: portable strict invocation; structured-declaration
  semantics; preserved malformed-ID failures; deterministic regression tests;
  green `claims:check` on pristine `origin/main` and on P0.
- Gate 3 remains withheld for P0.

### P0V evidence

- Worktree:
  `D:\Repos\keon-omega\_worktrees\keon-proof-led-p0v-20260729`
- Branch: `codex/keon-proof-led-p0v-claims-validation`
- Base: `807f01b364e1290a8058109f63556c0d8b2b61ff`, equal to live
  `origin/main` at dispatch and final verification.
- Exact implementation scope: `package.json`,
  `scripts/claims/claim-id-lint.mjs`, and new
  `scripts/claims/claim-id-lint.test.mjs`; package lock, dependencies, canon,
  registries, proof maps, and P0 have zero diff.
- Coordinator deterministic pass: 12/12 black-box tests; 35 missing-ID and
  35 canonical declaration forms; default and strict scans over 160 Markdown
  files; drift over 9 referenced IDs; aggregate `claims:check`; whitespace and
  scope checks.
- Pre-merge P0 proof: P0V strict linter passes over P0's 160 Markdown files and
  P0's underlying drift checker passes with P0V's canonical default paths.
- Independent portability review: PASS, including caller-authoritative
  overrides through the real npm-script boundary.
- Independent semantic review: PASS, including 64 hostile cases with zero
  unexpected results.
- GitHub checks `claims-global` and `claims-scoped` passed before merge.
- No Linear mutation or external action occurred.

P0V is closed. P0 rebased onto the merged base and completed its required stock
aggregate validation and refreshed reviews.

## Completed control-plane parcel

**P0 — control-plane reconciliation**

**Execution state: MERGED — 2026-07-29.** Clint Morgan granted Gate 3 for P0
only. Implementation, deterministic verification, two independent adversarial
reviews, exact-head publication, and merge verification are complete.

- PR: `Keon-Systems/keon-docs#21`
- Reviewed head: `bf2673d9a301fb32d0c953c30b8af3f7588a4964`
- Merge commit: `51d3007b008ce27b8ccb8df085d8b37de4b24be5`

- Target repo: `D:\Repos\keon-omega\keon-docs`
- Worktree:
  `D:\Repos\keon-omega\_worktrees\keon-proof-led-p0-20260729`
- Branch: `codex/keon-proof-led-p0-control-plane`
- Original dispatch base: `807f01b364e1290a8058109f63556c0d8b2b61ff`
- Current `origin/main` and merge-base after P0V:
  `49a523731521a08f366cb7316fee831159296217`
- Evidence-green local head:
  `bf2673d9a301fb32d0c953c30b8af3f7588a4964`
- Allowed implementation files:
  - `docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
  - `docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`
- Explicitly excluded: claims and packaging registries, historical evidence
  inventories, the prior session handoff, and any new local backlog/index.
- Linear mutations are not part of the builder scope. The coordinator may
  reconcile Linear only after the repo artifact is verified and the applicable
  authority is explicit.

### P0 evidence

- The worktree differs from `origin/main` in exactly the two Allowed Files.
- D1-D9, both dependency graphs, the eight-part exit criterion, and D0-1
  through D0-5 were independently verified against the ratified source.
- Stock `rtk npm run claims:check` passes: 12/12 tests, strict lint over 160
  Markdown files, and claim drift over 9 referenced IDs.
- Whitespace and claims/packaging registry zero-diff checks pass.
- Both refreshed independent adversarial reviewers returned PASS with no
  blocking or nonblocking finding.
- G2 remains blocked, payment remains NO-GO, Gate 3 remains withheld, H0-H4
  remain human/external, and no public/customer/Linear authority advanced.
- BrowseAhead remains KEO-197-only, WIP one, capacity-only, and absent from the
  first-revenue dependency path.
- P0 was merged through the active owner-bypass path because the repository
  ruleset blocks ordinary updates and reports the authenticated owner as an
  always-bypass actor. The exact reviewed head was supplied to the merge.
- No Linear mutation or external/customer action occurred.

P0 is closed. Its merge unlocks P1, P2, and capacity-only BA1 under the existing
Gate 2 standing authorization. Gate 3 remains withheld for every downstream
parcel.

## Current execution queue

1. P1 — **DONE.** Clint Morgan granted Gate 3 for P1 only on 2026-07-30.
   Exact reviewed head `48cb852ac619ed2c5716e1ee4dfdb6052ab281e3`
   was pushed, published as
   `https://github.com/Keon-Systems/keon-docs/pull/22`, and merged as
   `b462205e3a37fd177dce23a20ac9e5aeb53e3572`. The reviewed head is an
   ancestor of live `origin/main`. Exact closure evidence is posted on
   KEO-155; the issue remains `In Progress` because H0 decisions remain open.
   No Gate 3 authority carries forward.
2. P2 — **DONE.** Clint Morgan granted Gate 3 for P2 only on 2026-07-30. Exact
   reviewed head `ca13608aa8a328ac860d6e3d087ace44529bbd2b` was pushed,
   published as `https://github.com/Keon-Systems/keon-docs/pull/23`, and merged
   as `b8b89a901d1221ae7962cefc4d1b16c7d27e40c9`. The reviewed head is an
   ancestor of live `origin/main`. Both independent reviews passed; all 49
   hostile fixtures and 11 adversarial closure fixtures reconciled; claims and
   schema checks remained green after the mandatory no-op rebase. Exact closure
   evidence is posted on KEO-156, which is `In Progress` because P5 and later
   deliverable-method work remain outstanding. `KS-SPRINT-001` and
   `KS-PROFILE-001` remain draft/non-publishable; Ledgerline remains
   non-equivalent and non-canon. No Gate 3 authority carries forward.
3. BA1 — **GATE 3 READY / HOLD.** Clint Morgan ratified BA1-R1 through BA1-R8
   on 2026-07-30. Exact implementation head
   `f80717d8942fb12e3d3b39226d69de80f8c0a678` is grounded on gateway base
   `39769d2e300a188dc9935aa707d4559b0aaad2b5` and changes exactly the one
   Allowed File. Both fresh exact-head architecture and security/protocol
   reviews returned PASS with no blocking or nonblocking finding. The frozen
   contract includes RFC 8785/JCS signed schemas, application-rooted approval
   trust, signed monotonic state, content-addressed decision receipts,
   non-circular transition commitments, exclusive per-session assessment and
   atomic persisted-state CAS before evidence release, exact approval
   precedence, normalized current-origin evidence, and concrete ICU/PSL/WAAA
   pins inside ruleset digest
   `97552461055bdb88974ded87666954f48e35f5644deb084eb0b22c7781aa3bd9`.
   The 43 unique sequential fixtures resolve to 24 deny, 12 require-human, and
   7 allow outcomes; all 12 rules are fixture-covered; literal contract and
   BA1-R1 through BA1-R8 are byte-identical to the active spec. Boundary,
   exclusion, whitespace, clean-worktree, dirty-shared-checkout, and no-network
   checks pass. BrowseAhead remains WIP one, capacity-only, and cannot delay P2
   or revenue. No push, PR, or merge occurred. Gate 3 is withheld pending Clint
   Morgan's parcel-specific grant.
4. P5 — **P5A-P5E DONE.** P2 merge commit
   `b8b89a901d1221ae7962cefc4d1b16c7d27e40c9` satisfies the dependency. The
   active Foreman spec is independently reviewed and linter-green against
   `keon-systems` base `50895fa249e885bcdea127b2b9651d2b07555cbc`.
   PDD sizing produces five dependency-ordered parcels with exact, non-
   overlapping closure ownership: P5A gaps 01-03; P5B gaps 05 and 07; P5C gaps
   06 and 08; P5D gaps 04 and 10; P5E gap 09. Every successor starts from the
   exact immediately preceding merge SHA; P5D compares current output to a
   detached frozen-base CLI binary with reproducible byte/exit pins. Standing
   Gate 2 authorizes P5A Step 0. P5 preserves Review revenue independence,
   legacy/default/L3 behavior, Ledgerline non-equivalence, claim holds, and
   every external/Gate 3 boundary. P5A's fresh builder Step 0 passed at exact
   base `50895fa249e885bcdea127b2b9651d2b07555cbc` with nine Allowed Files,
   source-declaration baselines, no missing file/decision, and the frozen P2
   blob verified. Standing Gate 2 authorizes implementation of gaps 01-03 only;
   push, PR, merge, claims, Linear, P5B-E, and external actions remain held.
   P5A implementation head
   `8da393cad7a0fccd0e0de9715dc1418d295ff5d5` changes exactly nine initial
   Allowed Files. Builder evidence was 41/41 focused tests, 370/370 Verify
   tests, and 213/213 Runtime tests with zero skips, plus clean
   scope/whitespace/authority checks. Both fresh detached exact-head reviews
   returned FAIL: architecture found optional v2 `manifestVersion` and an
   unconstrained artifact `type`; security independently proved that
   decimal-first `G29` number formatting is not RFC 8785 and that
   fixture/verifier reuse self-graded the blind spot. The coordinator ratified
   a bounded P5A amendment: add the existing `KeonCanonicalJsonV1.cs`
   source-of-truth file, preserve its legacy entry points byte-for-byte, add a
   strict RFC 8785 Sprint entry point with independent literal numeric vectors,
   require v2 `manifestVersion: "1"`, and enforce the frozen artifact-type
   enum. No second canonicalizer, dependency, default/L3 drift, or later-gap
   authority is allowed. The bounded repair is locally committed at exact head
   `8b62c1acbdb1cdf01ba40fcac4653bf3d2fb41ae` and its cumulative diff is
   exactly the amended ten Allowed Files. Coordinator reruns pass: schema
   14/14, strict canonicalization 35/35, archive 18/18, legacy
   canonicalization 17/17, full Verify 372/372, and full Runtime 237/237, all
   with zero skips; protected-surface, whitespace, P2-blob, and shared-checkout
   boundaries remain green. The security/adversarial re-review passed, but the
   architecture/compatibility re-review found one residual RFC 8785 blocker:
   the strict path still NFC-normalized emitted property names and string
   values. The coordinator tightened the same ten-file contract: NFC is used
   only to reject post-normalization duplicate property names; strict Sprint
   JCS sorts and emits the original parsed Unicode unchanged, with independent
   decomposed-Unicode and raw UTF-16-order vectors. This is implementation
   rework, not added scope. The correction is locally committed at exact head
   `18e24b3e20079f2c499c08972317d6064d7bf9de`; coordinator reruns pass schema
   14/14, strict canonicalization 39/39, archive 18/18, legacy
   canonicalization 17/17, full Verify 372/372, and full Runtime 241/241, all
   with zero skips. Both fresh detached exact-head reviews returned PASS with
   no blocking or nonblocking finding. Live `origin/main` remains the exact
   frozen base `50895fa249e885bcdea127b2b9651d2b07555cbc`; the reviewed head is
   clean and its cumulative diff is exactly the ten amended Allowed Files.
   Clint Morgan granted Gate 3 for P5A only on 2026-07-30. Exact reviewed head
   `18e24b3e20079f2c499c08972317d6064d7bf9de` was pushed, published as
   `https://github.com/Keon-Systems/keon-systems/pull/173`, passed every
   required GitHub check, and merged as
   `1ace5ce4c6d8862b46f0339a577026dd1b6cfa99`. Live `origin/main` is the exact
   merge commit and the reviewed head is its ancestor. Exact closure evidence
   is posted on KEO-156, which remains In Progress because P5B-P5E and later
   deliverable-method work remain. P5A closes exactly gaps 01-03; no final
   verdict or claim authority advanced. P5B is dependency-unlocked under the
   standing Gate 2 authorization and starts directly from the P5A merge
   commit. Its clean Step 0 found a literal signed-contract blocker before
   edits: frozen GAP-05 requires correlation on every receipt, but the existing
   signed Runtime `ProducerReceipt`/`ProducerAuthBinding` contains no
   correlation field. An unsigned wrapper, idempotency-key reinterpretation,
   or alternate receipt contract is prohibited. Clint Morgan ratified P5B-R1
   through P5B-R3 and the amended nine-file scope: a nullable signed Runtime
   `CorrelationId` extension that remains backward compatible but is mandatory
   for Sprint; an injected already-tenant-scoped key-provider boundary whose
   trust construction remains P5D-owned; and a TestSupport-to-Runtime project
   reference for exact typed receipts. The fresh amended Step 0 passed at exact
   dependency/base/live-main SHA
   `1ace5ce4c6d8862b46f0339a577026dd1b6cfa99`, exact P2 blob
   `915dc38f23da778aea77161256f8eb44e326079c`, a clean worktree, and the exact
   nine-file scope; no remaining decision or dependency blocker exists.
   Standing Gate 2 authorizes implementation of gaps 05 and 07 only. No push,
   PR, merge, Linear mutation, P5C-E, GAP-04, or carried-forward Gate 3
   authority exists. P5B's first implementation head
   `1824b0202806a5f7d10282026f259f6b21513da0` passed the coordinator's focused
   and full affected suites but both fresh detached reviews returned BLOCK:
   architecture found that adding correlation positionally broke the existing
   public CLR constructor/deconstruction ABI, and security found that omitted
   required receipt members could silently take enum defaults or escape as an
   exception. Standing Gate 2 authorized a bounded repair inside the same
   ratified nine-file scope. The repaired exact head
   `d9d56af0a00335fe37bfed0a2d7a0716dcfb1374` preserves the legacy constructors
   and deconstruction signatures, makes `CorrelationId` a nullable init-only
   signed property, enforces required typed-receipt members, normalizes only the
   three legitimate legacy-null fields, and maps malformed receipt input to the
   stable fail-closed result. Coordinator evidence is 13/13 Runtime receipt
   contract tests, 19/19 Sprint identity tests, 9/9 authorization-binding tests,
   400/400 full Verify tests, and 246/246 full Runtime tests, all with zero
   skips; the worktree is clean, `git diff --check` passes, the P2 blob remains
   exact, and the cumulative diff is exactly the nine ratified files. Both
   fresh detached full-diff re-reviews returned PASS with no findings at that
   exact head. Clint Morgan granted Gate 3 for P5B only on 2026-07-30. Exact
   reviewed head `d9d56af0a00335fe37bfed0a2d7a0716dcfb1374` was pushed,
   published as `https://github.com/Keon-Systems/keon-systems/pull/174`, passed
   every required GitHub check, and merged as
   `dd37be6f18451d533decbf3e5fb1f4216dced768`. Live `origin/main` is the exact
   merge commit and the reviewed head is its ancestor. Exact closure evidence
   is posted on KEO-156 in comment
   `c6a7eb3d-a9b9-4311-84d6-82d09f7e2f37`; the issue remains In Progress
   because P5C-P5E and later deliverable-method work remain. P5B closes exactly
   gaps 05 and 07; provider authentication, tenant-trust construction, chain
   and seal proof, fixture completeness, final verdict, and claim authority
   remain held. P5C is dependency-unlocked under standing Gate 2 and must start
   directly from the P5B merge commit. Its fresh Step 0 passed at exact
   dependency/base/live-main SHA
   `dd37be6f18451d533decbf3e5fb1f4216dced768`, exact P2 blob
   `915dc38f23da778aea77161256f8eb44e326079c`, a clean isolated worktree, and
   the exact five-file scope. The shared checkout's sole pre-existing
   `.serena/project.yml` modification remains untouched. No missing dependency,
   decision, ownership collision, or P5D CLI/trust overlap blocks
   implementation of gaps 06 and 08 under standing Gate 2. P5C's first
   implementation head `1adf867fa85cd4b9f011fd17d377aa021598f281`
   passed coordinator proof with 13/13 chain tests, 19/19 seal tests, and
   432/432 full Verify tests, all with zero skips. Its fresh detached security
   review passed, while architecture blocked two double-fault seal fixtures
   whose named seal mutation also left an unintended stale checkpoint hash.
   A bounded same-scope repair recomputed the dependent hashes for those two
   fixtures, left only the intentional checkpoint-invalid fixture mismatched,
   and added independent canonical payload-hash assertions. The repaired exact
   head `0a8b040d2a3e8390d3d5176bbf466b737efa270a` passes coordinator reruns:
   13/13 chain tests, 22/22 seal tests, and 435/435 full Verify tests, all with
   zero skips. Its cumulative diff is exactly the five Allowed Files,
   `git diff --check` passes, and both fresh detached full-diff re-reviews
   returned PASS with no findings. Clint Morgan granted Gate 3 for P5C only on
   2026-07-30. Exact reviewed head
   `0a8b040d2a3e8390d3d5176bbf466b737efa270a` was pushed, published as
   `https://github.com/Keon-Systems/keon-systems/pull/175`, passed every
   required GitHub check, and merged as
   `d35c2dcfe62ef55197b74535bc5cb54d7aa596ef`. Live `origin/main` is the exact
   merge commit and the reviewed head is its ancestor. Exact closure evidence
   is posted on KEO-156 in comment
   `d05719e4-9240-4995-96d5-a4a46ef70dad`; the issue remains In Progress
   because P5D-P5E and later deliverable-method work remain. P5C closes exactly
   gaps 06 and 08; trust authentication, CLI output/exit routing, fixture
   completeness, final verdict, and claim authority remain held. P5D is
   dependency-unlocked under standing Gate 2 and must start directly from the
   P5C merge commit. Its fresh Step 0 passed at exact dependency/base/live-main
   SHA `d35c2dcfe62ef55197b74535bc5cb54d7aa596ef`, exact P2 blob
   `915dc38f23da778aea77161256f8eb44e326079c`, a clean isolated worktree, and
   the exact eight-file scope. A separate clean detached baseline at frozen
   commit `50895fa249e885bcdea127b2b9651d2b07555cbc` produced Release
   `Keon.Cli.dll` SHA-256
   `5f58e2c3e96a04ed2a68efcf2f6f0b78cc1698231cdf887f921250279cb39c29`.
   The deterministic legacy pack SHA-256 is
   `aac0acfa48b16f5f1ef07517a4165b0880fd0504fa053811a77dc93d20cae677`;
   its raw public-key file SHA-256 is
   `fa2c5e76886abdef6ef82d0075120b354575b2509699a64954f032c275244fc4`.
   Coordinator-independent two-run captures reproduce default exit `2`,
   252-byte stdout SHA-256
   `c2702b24da333bd0ddbdf5fb1de88a46c92d78608411f8ecf58ea40d357604d5`
   and L3 exit `2`, 1678-byte stdout SHA-256
   `77f3aa5ce162eb4f524f4a66d1d1dea068a0c1bfc137e4a7e9d1eb280ec3f687`;
   both have empty stderr and CRLF termination on the pinned Windows/.NET
   environment. No missing dependency, trust-role mapping, compatibility
   drift, or pre-edit stop condition exists. Standing Gate 2 authorizes only
   gaps 04 and 10. P5D implementation head
   `665e98455b3bc07f2daae7bc8b122862e79cbcce` changes exactly the eight
   Allowed Files. Coordinator evidence is a clean Release build, 11/11 trust
   tests, 6/6 Sprint CLI-contract tests, 1/1 raw compatibility test, 116/116
   full CLI tests, and 435/435 full Verify tests, all with zero skips; the
   frozen default/L3 bytes and exits remain exact. Fresh detached review
   nevertheless returned BLOCK. The supplied trust bundle authenticates a root
   embedded inside that same untrusted bundle, so a self-consistent
   attacker-owned root and bundle can authorize attacker pack/runtime keys and
   reach `PASS`; the existing wrong-root fixture tests only an inconsistent
   declared-root/signing-key pair. A second fail-closed defect permits removal
   of the manifest attestation from both archive and manifest to reach an
   uncaught `KeyNotFoundException`. Clint Morgan ratified P5D-R1 and P5D-R2.
   The bounded repair is authorized under standing Gate 2 with the exact
   eight-file P5D scope unchanged; Gate 3 remains withheld. The active spec now
   requires that
   under the exact Sprint profile only, existing `--pubkey`
   becomes the out-of-band trust-root anchor while aggregate/runtime keys come
   only from authenticated tenant trust, and the manifest attestation becomes
   an explicitly required listed artifact with stable `FAIL/2` schema failure.
   Default/L3 semantics, CLI options, bundle format, dependencies, and the
   eight-file scope remain unchanged. The first ratified repair landed locally
   at `c7ba680bbbc093ed813d8e1f8edda6cd5975c995`; Release build, focused
   trust/CLI/compatibility tests, 124/124 full CLI tests, and 435/435 full
   Verify tests passed with zero skips, and the frozen default/L3 pins remained
   exact. Fresh architecture review nevertheless returned BLOCK: the manifest
   attestation parser still accepts partial or identity-mismatched v1 shapes
   because it validates only type, key ID, payload hash, and signature.
   Ratified P5D-R2 already requires malformed manifest attestations to return
   stable `KEON_VERIFY_PROFILE_SCHEMA_INVALID` / exit 2, so the smallest
   in-contract completion remains authorized under standing Gate 2 without a
   scope amendment. Gate 3 remains withheld and no authority carries forward.
   The second fresh review independently confirmed BLOCK and sharpened the
   completion: the existing read-only `AttestationV1` wrapper also requires
   `attestation_version: v1` and `canonical_hash`, which the synthetic fixture
   and Sprint parser omitted; and `TrustScopeEnforcer.FromKey` maps an unknown
   `scope_type` to tenant scope. Ratified R1/R2 therefore require the in-scope
   Sprint path to validate the exact existing v1 wrapper and reject non-literal
   tenant scope types without modifying that shared enforcer.
   The cumulative repair landed locally at
   `c8db44ac654640c30af01937f905818651ac51f9`. Coordinator and fresh detached
   review evidence is green: Release build zero warnings/errors; trust 43/43;
   CLI contract 7/7; compatibility 1/1; full CLI 149/149; full Verify 435/435;
   reviewer full Runtime 246/246; zero failures and zero skips. Both final
   reviewers returned formal PASS with no actionable findings. The baseline
   DLL hash and exact default/L3 bytes, exits, CRLF, and empty stderr remain
   frozen and byte-identical under the same .NET 10.0.10 host/process/locale.
   Cumulative scope is exactly the eight P5D Allowed Files, the implementation
   and detached review worktrees are clean, and no dependency, package,
   lockfile, solution, CLI-option, trust-format, or public-vocabulary drift
   occurred. Clint Morgan granted Gate 3 for P5D only. The grant authorizes
   publishing the exact reviewed head, opening and merging its PR after live
   checks, recording merge evidence in Linear, and cleaning only P5D-owned
   local artifacts. It does not authorize product edits or carry forward to
   P5E. At grant time no push, PR, merge, Linear mutation, or publication had
   occurred.
   Gate 3 is now consumed. The exact reviewed head
   `c8db44ac654640c30af01937f905818651ac51f9` was published as
   `keon-systems` PR #176; every live GitHub check passed, including Linux and
   Windows determinism, trust-gap enforcement, PR validation, analyzer
   enforcement, build, and meta-determinism. PR #176 merged at
   `b04cc9729d898ea0a649b4904dc12294cdf80852`, and live `origin/main`
   contains the reviewed head. Exact closure evidence is posted on KEO-156 in
   comment `fc188a83`. All eight P5D-owned worktrees and the P5D local branch
   were removed after confirming they were clean; the remote branch is absent.
   The shared checkout remains untouched with only its pre-existing
   `.serena/project.yml` modification. P5D closes exactly gaps 04 and 10.
   P5E was dispatched under standing Gate 2 at exact predecessor/live-main SHA
   `b04cc9729d898ea0a649b4904dc12294cdf80852`. Clint Morgan granted Gate 3
   for P5E only before implementation evidence; that grant was not consumed.
   Step 0 passed with the exact five-file scope and frozen P2 blob
   `915dc38f23da778aea77161256f8eb44e326079c`. The builder produced the
   five-file implementation and restored all three affected test projects.
   Focused proof stopped at 3/4 passed, zero skipped: frozen fixture
   `P2-FX-IDENTITY-RECEIPT-001` requires
   `FAIL/4` / `KEON_VERIFY_IDENTITY_RECEIPT_MISMATCH`, but the real full
   Sprint CLI returns `FAIL/2` / `KEON_VERIFY_RECEIPT_CHAIN_INVALID`.
   Full-flow chain validation rejects duplicate receipt IDs and artifact/chain
   identity mismatch before the later identity validator, making the frozen
   classification unreachable. Existing isolated identity tests remain 19/19,
   but they do not prove full-flow behavior. The smallest repair requires
   `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs`, outside P5E's
   ratified five-file scope. The worktree retains a clean-whitespace,
   uncommitted five-file implementation; no product source, commit, push, PR,
   merge, Linear mutation, claim, P6, or external action occurred. P5E remains
   blocked pending a product/security classification-order ruling and exact
   scope amendment. Clint Morgan ratified P5E-R1 and the amended six-file scope
   on 2026-07-30. Under the exact Sprint profile, receipt identity uniqueness
   and artifact/chain identity-set equality now classify before chain topology;
   identity duplicates/mismatch return the frozen `FAIL/4`, while genuine
   chain defects retain `FAIL/2`. Only
   `src/Keon.Verify/EvidencePackSprintProfileVerifier.cs` is added to P5E's
   five test/catalog files. Standing Gate 2 authorizes the bounded rework.
   Because the earlier evidence chain went red, the advance Gate 3 grant is
   void and P5E must return with a fresh green-chain Gate 3 request. No Gate 3
   authority carries forward. The ratified rework is now complete at exact
   local head `c2e12f66730c7d131456d075fd0c93a022888e68`, two commits ahead of
   unchanged live `origin/main`
   `b04cc9729d898ea0a649b4904dc12294cdf80852`. The cumulative diff is exactly
   the six ratified P5E Allowed Files, `git diff --check` is clean, and the
   implementation worktree is clean. The frozen catalog contains exactly 50
   unique synthetic-only entries with an independent literal oracle. The
   bounded repair closes both independent review findings: canonical
   non-object receipt JSON returns stable
   `FAIL/2` / `KEON_VERIFY_PROFILE_SCHEMA_INVALID` instead of throwing, and a
   missing `expected_exit` is explicitly rejected. Final coordinator evidence
   is hostile coverage 6/6, identity 19/19, full Verify 441/441, Runtime
   246/246, full CLI 149/149 against the pinned baseline DLL, and TrustOps CLI
   1/1, with zero failures and zero skips. Fresh detached architecture and
   robustness reviews both passed on the exact head with no remaining
   findings. No push, PR, merge, Linear mutation, claim, P6, deployment,
   payment, customer, or other external action occurred. P5E now requests a
   fresh parcel-specific Gate 3 grant for the exact reviewed head only. Clint
   Morgan granted Gate 3 for P5E only. The exact reviewed head was published as
   `https://github.com/Keon-Systems/keon-systems/pull/177`; every required live
   check passed, and the PR merged as
   `7dd880ae73ce14632e28b7701e1e65ef06dbae69` at
   `2026-07-31T00:05:10Z`. Live `origin/main` contains the exact reviewed head.
   Closure evidence is posted on KEO-156 in comment `c6ac46f3`. All seven
   P5E-owned implementation, review, first-run, and reconstructed-baseline
   worktrees were removed after clean-status verification; the local and
   remote parcel branches are absent. The shared checkout remains untouched
   with only its pre-existing `.serena/project.yml` modification. P5E closes
   exactly `P5-GAP-09`; P5A through P5E now complete the minimum-verifier
   implementation parcels. P5E-only Gate 3 is consumed and grants no claim
   activation, P6 rehearsal, deployment, payment, customer, BrowseAhead, or
   other external authority.

## Stop conditions

Stop and report when any charter stop condition fires, and also when:

- a parcel requires a file outside exact Allowed Files;
- the dirty shared checkout would be touched;
- current `origin/main` or live Linear contradicts the shaped spec;
- a mandatory check is skipped or unknown;
- a frozen contract needs amendment;
- a tripwire fires twice on one parcel;
- a security/billing/claims finding cannot close inside the parcel;
- BrowseAhead would consume revenue-critical capacity;
- any merge or outward-facing action lacks explicit authorization; or
- the queue is empty.

## Wake and crash recovery

While a builder or reviewer runs, completion notifications are primary; use a
long bounded fallback rather than short polling. After a host restart or lost
agent, treat disk state without a completion claim as unclaimed. A fresh resume
session must inventory the original spec, branch, worktree, current test count,
partial files, and gaps, then stop for a coordinator ruling before continuing.
