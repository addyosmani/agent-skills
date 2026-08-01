---
ticket: WGT-P0BOOT
title: Tracked Foreman Line bootstrap
status: done
owner: clinton.morgan
created: 2026-07-31
updated: 2026-08-01
supersedes: null
superseded_by: null
risk: elevated
surfaces:
  - plugins/foreman-line/**
routing_class: architecture/risk
data_classification: internal
---

# WGT-P0BOOT — Tracked Foreman Line bootstrap

## Intent

Create the missing durable repository boundary required by ratified parcel
WGT-P0A. Import the exact current Foreman Line plugin source from the dirty
shared `agent-skills` checkout into a clean branch based on `origin/main`,
without carrying unrelated root work, generated dependencies, build output,
caches, local memory, environment files, credentials, or secrets.

This is a provenance parcel, not a product-change parcel. It may track the
frozen source snapshot and create only the contract/evidence records named
below. It may not repair, reformat, upgrade, relocate, delete, or editorialize
plugin source.

## Authorization and baseline

- Owner authorization: on 2026-07-31 Clint Morgan explicitly authorized the
  tracked Foreman bootstrap after WGT-P0A stopped on the missing tracked source
  boundary.
- Clean base: `origin/main` commit
  `260d1eb5afa554ac23ff440a7dd6f92510381113`.
- Branch: `codex/foreman-line-bootstrap`.
- Worktree:
  `D:/Repos/agent-skills-worktrees/foreman-line-bootstrap-20260731`.
- Frozen source root:
  `D:/Repos/agent-skills/plugins/foreman-line`.
- Frozen eligible source snapshot: 649 paths, 4,229,356 bytes.
- Canonical ordinally sorted LF path-list SHA-256:
  `df4b8b955cd18b5ddbe100bf676332a9e4d81a2ef03a25330dce0d35102fbe2b`.
- Canonical content-manifest SHA-256:
  `48120451fda4d1cf6e6d6e5fd11e6ce5a4b1a0605a249b6d7a8dd1d65889e3c4`.

The canonical content manifest is the sorted sequence
`<lowercase file sha256><two spaces><forward-slash repo-relative path><LF>`.
The durable manifest created by this parcel must reproduce that aggregate.

## Constraints

1. Use only the isolated worktree and exact branch above. Never mutate the
   shared checkout or sweep any repo-root change into this parcel.
2. The 649 frozen source paths are copied byte-for-byte. Any source/destination
   hash mismatch is a hard stop; no patch-forward is allowed in this parcel.
3. Exclude every `node_modules`, `dist`, `coverage`, `.remember`, `.git`,
   `.cache`, `.turbo`, `.env`, and `.env.*` path. Exclude credentials, secrets,
   private keys, certificates, and machine-local state regardless of name.
4. Do not alter manifests, package dependencies, lockfiles, product code,
   tests, historical specs, transcripts, goal records, claims, or remote
   metadata. Findings become review evidence or follow-up parcels.
5. Dependency installation is verification-only and must remain untracked.
   Use `npm ci` in each of the 14 package workspaces, then execute the scripts
   each package declares. Do not commit generated output.
6. Both plugin manifests and every JSON file must parse except the exact
   intentional negative-test fixture
   `plugins/foreman-line/receipts/tests/fixtures/malformed.json`. That fixture
   must fail generic JSON parsing and pass its receipts-package rejection test.
   Every package must pass `typecheck`, `test`, and `lint`, subject only to the
   two first-import tripwires defined below; packages exposing `generate` must
   also pass their non-mutating verification of generated parity or leave no
   diff.
7. Two fresh independent reviews are mandatory: review A covers inventory,
   byte provenance, forbidden paths, secret hygiene, and repo-boundary scope;
   review B covers plugin/manifests/package integrity and test evidence.
8. WGT-P0A remains stopped until this parcel is merged and a fresh
   `origin/main` tree check proves `plugins/foreman-line` is tracked there.

## Step 0 — builder restatement and stop gate

Before writing, the builder must report and verify:

1. current directory, branch, HEAD, upstream, and clean status match the
   baseline above;
2. `plugins/foreman-line` is absent from the clean base except for this shaped
   spec and any coordinator-authored shaping evidence;
3. the shared source snapshot still reproduces both frozen aggregate hashes;
4. the builder will create only the exact Allowed Files and will copy the 649
   imported paths byte-for-byte;
5. all exclusions and the zero-product-edit rule are understood; and
6. any mismatch, missing path, extra path, failed verification, secret signal,
   or need for another file causes an immediate stop and coordinator return.

## Acceptance Criteria

1. The destination contains all and only the 649 frozen imported source paths
   plus the exact contract/evidence files listed in Allowed Files.
2. Every imported source file SHA-256 matches its frozen source counterpart,
   and the durable content manifest reproduces both recorded aggregate hashes.
3. `git status` and `git diff --cached --name-only` show no repo-root or other
   plugin change and no forbidden generated, cache, memory, environment, or
   credential path.
4. Secret scanning reports no live credential or private-key material. Test
   fixtures and documentation examples are reviewed rather than accepted by
   filename or regex alone.
5. `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, all package
   manifests, schemas, fixtures, and every other `.json` file parse, except
   the one exact intentional malformed fixture named in Constraint 6. The
   exception is green only when generic parsing rejects it and the receipts
   test proves the product handles that rejection as designed.
6. All 14 package workspaces pass `npm ci`, `typecheck`, `test`, and `lint`;
   declared generators pass without leaving a tracked diff. On the pre-merge
   exact bootstrap commit, only these two frozen-surface tests may fail:
   - `approval/tests/canonical-parity.test.ts` —
     `AC2: no modification to receipts/ since the branch fork point`; and
   - `projection/tests/input-consumption.test.ts` —
     `AC3: no file under shaping/ is modified by this parcel since the branch fork point`.
   Each exception is green only when its diff contains solely byte-frozen
   imported paths from the durable 649-file manifest in the named subtree.
   Every other test and command must pass. After merge, a fresh `origin/main`
   checkout must pass the complete 14-workspace matrix with no exception; both
   named tests must pass because the bootstrap is then part of their merge
   base. A remaining failure keeps WGT-P0A locked and requires rollback or a
   separately authorized repair.
7. The plugin root, both manifests, the three bundled skills, README,
   AGENTS.md, convention, coordinator pattern, package workspaces, and durable
   goal records are present in the tracked tree.
8. Independent review A and review B each return PASS with no unresolved
   blocker, High, or Medium finding. A red or unknown result voids merge
   authority until repaired within a separately authorized exact scope and
   re-reviewed.
9. `git diff --cached --check` findings are classified rather than repaired:
   every finding must belong to one of the 649 byte-frozen imported paths, and
   no parcel-created contract or evidence file may produce a finding. Any
   finding outside the frozen content manifest is a hard stop.
10. The branch is pushed and merged only after the full green chain. A fresh
   fetch then proves the merged commit and tracked plugin subtree on
   `origin/main`; only that evidence unlocks WGT-P0A.

## Out of Scope

- Any Foreman functionality, documentation, manifest, dependency, test, or
  packaging correction.
- Any change outside `plugins/foreman-line`.
- Root marketplace registration or installation/discovery changes.
- Deleting or cleaning the dirty shared checkout.
- WGT-P0A implementation, any Keon repository change, Linear mutation,
  deployment, payment, customer data, outreach, or human/external milestone.

## Allowed Files

Each entry below is exact mutation authority. The mechanically generated
source portion is the frozen 649-path snapshot; globs and directory shorthand
are not used.

<!-- WGT-P0BOOT-ALLOWED-FILES-START -->
- `plugins/foreman-line/.claude-plugin/plugin.json`
- `plugins/foreman-line/.codex-plugin/plugin.json`
- `plugins/foreman-line/AGENTS.md`
- `plugins/foreman-line/CHANGELOG.md`
- `plugins/foreman-line/README.md`
- `plugins/foreman-line/approval/README.md`
- `plugins/foreman-line/approval/biome.json`
- `plugins/foreman-line/approval/package-lock.json`
- `plugins/foreman-line/approval/package.json`
- `plugins/foreman-line/approval/src/approval-record.ts`
- `plugins/foreman-line/approval/src/approve-flow.ts`
- `plugins/foreman-line/approval/src/canonical.ts`
- `plugins/foreman-line/approval/src/cli.ts`
- `plugins/foreman-line/approval/src/confirm.ts`
- `plugins/foreman-line/approval/src/correlation.ts`
- `plugins/foreman-line/approval/src/hash.ts`
- `plugins/foreman-line/approval/src/index.ts`
- `plugins/foreman-line/approval/src/paths.ts`
- `plugins/foreman-line/approval/src/receipt-writer.ts`
- `plugins/foreman-line/approval/src/receipt.ts`
- `plugins/foreman-line/approval/src/rejection-record.ts`
- `plugins/foreman-line/approval/src/render.ts`
- `plugins/foreman-line/approval/src/resolve-input.ts`
- `plugins/foreman-line/approval/src/slug-guard.ts`
- `plugins/foreman-line/approval/src/subject.ts`
- `plugins/foreman-line/approval/tests/approval-record.test.ts`
- `plugins/foreman-line/approval/tests/approved-hash.test.ts`
- `plugins/foreman-line/approval/tests/bare-specifier.test.ts`
- `plugins/foreman-line/approval/tests/canonical-parity.test.ts`
- `plugins/foreman-line/approval/tests/cli-verbs.test.ts`
- `plugins/foreman-line/approval/tests/correlation.test.ts`
- `plugins/foreman-line/approval/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/approval/tests/frozen-surface.test.ts`
- `plugins/foreman-line/approval/tests/helpers.ts`
- `plugins/foreman-line/approval/tests/human-gate-integrity.test.ts`
- `plugins/foreman-line/approval/tests/no-status-flip.test.ts`
- `plugins/foreman-line/approval/tests/projection-invocation.test.ts`
- `plugins/foreman-line/approval/tests/receipt-mint.test.ts`
- `plugins/foreman-line/approval/tests/reject.test.ts`
- `plugins/foreman-line/approval/tests/slug-containment.test.ts`
- `plugins/foreman-line/approval/tests/write-ordering.test.ts`
- `plugins/foreman-line/approval/tsconfig.json`
- `plugins/foreman-line/contracts/README.md`
- `plugins/foreman-line/contracts/biome.json`
- `plugins/foreman-line/contracts/package-lock.json`
- `plugins/foreman-line/contracts/package.json`
- `plugins/foreman-line/contracts/schemas/build-result.schema.json`
- `plugins/foreman-line/contracts/schemas/closure-record.schema.json`
- `plugins/foreman-line/contracts/schemas/correlation-context.schema.json`
- `plugins/foreman-line/contracts/schemas/dispatch-order.schema.json`
- `plugins/foreman-line/contracts/schemas/integration-result.schema.json`
- `plugins/foreman-line/contracts/schemas/receipt-ref.schema.json`
- `plugins/foreman-line/contracts/schemas/registration-result.schema.json`
- `plugins/foreman-line/contracts/schemas/rework-signal.schema.json`
- `plugins/foreman-line/contracts/schemas/shaping-result.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.build-result.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.closure-record.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.dispatch-order.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.integration-result.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.registration-result.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.shaping-result.schema.json`
- `plugins/foreman-line/contracts/schemas/stage-envelope.verification-verdict.schema.json`
- `plugins/foreman-line/contracts/schemas/verification-verdict.schema.json`
- `plugins/foreman-line/contracts/src/correlation.ts`
- `plugins/foreman-line/contracts/src/envelope.ts`
- `plugins/foreman-line/contracts/src/generate.ts`
- `plugins/foreman-line/contracts/src/index.ts`
- `plugins/foreman-line/contracts/src/registry.ts`
- `plugins/foreman-line/contracts/src/stages/a-intake.ts`
- `plugins/foreman-line/contracts/src/stages/b-registration.ts`
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts`
- `plugins/foreman-line/contracts/src/stages/d-verification.ts`
- `plugins/foreman-line/contracts/src/stages/e-integration.ts`
- `plugins/foreman-line/contracts/src/stages/f-closure.ts`
- `plugins/foreman-line/contracts/src/testing.ts`
- `plugins/foreman-line/contracts/tests/parity.test.ts`
- `plugins/foreman-line/contracts/tests/propagation.test.ts`
- `plugins/foreman-line/contracts/tests/rework.test.ts`
- `plugins/foreman-line/contracts/tests/strictness.test.ts`
- `plugins/foreman-line/contracts/tsconfig.json`
- `plugins/foreman-line/dispatch/README.md`
- `plugins/foreman-line/dispatch/biome.json`
- `plugins/foreman-line/dispatch/package-lock.json`
- `plugins/foreman-line/dispatch/package.json`
- `plugins/foreman-line/dispatch/src/approval-cli/index.ts`
- `plugins/foreman-line/dispatch/src/index.ts`
- `plugins/foreman-line/dispatch/src/kompress-adapter/index.ts`
- `plugins/foreman-line/dispatch/src/query/index.ts`
- `plugins/foreman-line/dispatch/src/routing-eval/index.ts`
- `plugins/foreman-line/dispatch/src/skill-resolver/index.ts`
- `plugins/foreman-line/dispatch/tests/approval-cli.test.ts`
- `plugins/foreman-line/dispatch/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/dispatch/tests/kompress-adapter.test.ts`
- `plugins/foreman-line/dispatch/tests/query.test.ts`
- `plugins/foreman-line/dispatch/tests/routing-eval.test.ts`
- `plugins/foreman-line/dispatch/tests/skill-resolver.test.ts`
- `plugins/foreman-line/dispatch/tests/w4-p0-correlation-lineage.test.ts`
- `plugins/foreman-line/dispatch/tsconfig.json`
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
- `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md`
- `plugins/foreman-line/docs/SPEC-CONVENTION.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/discovery.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-closeout-amendment.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-plan-review-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/charter.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/loop-directive.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p1-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p2-adversarial-review-A-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p2-adversarial-review-B-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p3-adversarial-review-A-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p3-adversarial-review-B-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/p4-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/permission-profile-registry/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md`
- `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/charter.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/loop-directive.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/p1-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/p2-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/p3-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/p4-adversarial-review-findings.md`
- `plugins/foreman-line/docs/goals/w1-intake-registration/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/w2-dispatch/charter.md`
- `plugins/foreman-line/docs/goals/w2-dispatch/loop-directive.md`
- `plugins/foreman-line/docs/goals/w2-dispatch/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/w3-verification/charter.md`
- `plugins/foreman-line/docs/goals/w3-verification/loop-directive.md`
- `plugins/foreman-line/docs/goals/w3-verification/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md`
- `plugins/foreman-line/docs/goals/w4-ci-integration/loop-directive.md`
- `plugins/foreman-line/docs/goals/w4-ci-integration/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/w4-closeout/charter.md`
- `plugins/foreman-line/docs/goals/w4-closeout/loop-directive.md`
- `plugins/foreman-line/docs/goals/w4-closeout/plan-review-findings.md`
- `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`
- `plugins/foreman-line/docs/kickstarters/adversarial-review-DOCS-P1.md`
- `plugins/foreman-line/docs/kickstarters/adversarial-review-SCAF-P1.md`
- `plugins/foreman-line/docs/kickstarters/adversarial-review-W0-P3.md`
- `plugins/foreman-line/docs/kickstarters/adversarial-review-W0-P4.md`
- `plugins/foreman-line/docs/kickstarters/adverserial_review.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-CLOSE-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-CLOSE-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-CLOSE-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-SCAF-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-SCAF-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W1-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W1-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W1-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W1-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W3-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W3-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W4-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-build-W4-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-carryover.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-loop.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-DOCS-P1-rework.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-DOCS-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-SCAF-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-SEC-1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P3-rework.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P4-rework.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-W0-P5.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-SCAF-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W0-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W0-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W0-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W0-P5.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W1-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W1-P2.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W1-P3.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W1-P4.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P0.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-shaping-template.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-build-P1.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-build-P2.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-build-P3.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-build-P4.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-review-P3-A.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-review-P3-B.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-shaping-P1.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-shaping-P2.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-shaping-P3.md`
- `plugins/foreman-line/docs/kickstarters/permission-profile-registry-shaping-P4.md`
- `plugins/foreman-line/docs/kickstarters/plan-review-packaging-scaffolder.md`
- `plugins/foreman-line/docs/kickstarters/restart_after_missed_timer_event.md`
- `plugins/foreman-line/docs/specs/active/KEO-156-P5-minimum-verifier-implementation.md`
- `plugins/foreman-line/docs/specs/active/KEO-197-browseahead-domain-path-slop-squatting-contract-freeze.md`
- `plugins/foreman-line/docs/specs/active/P1-plugin-packaging.md`
- `plugins/foreman-line/docs/specs/active/keo-156-p2-minimum-verifier-compatibility-canon-freeze.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/keo-197-browseahead-domain-path-slop-squatting-contract-freeze.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/p1-plugin-packaging.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/receipt-chain-walker.approval.json`
- `plugins/foreman-line/docs/specs/active/receipt-chain-walker.projected.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/receipt-chain-walker.registration.json`
- `plugins/foreman-line/docs/specs/active/receipt-chain-walker.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/scaffold-migration.approval.json`
- `plugins/foreman-line/docs/specs/active/scaffold-migration.projected.shaping-result.json`
- `plugins/foreman-line/docs/specs/active/scaffold-migration.registration.json`
- `plugins/foreman-line/docs/specs/active/scaffold-migration.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/CLOSE-P1-minted-chain-exit-vehicle.md`
- `plugins/foreman-line/docs/specs/done/CLOSE-P2-spec-linter-corpus-reconciliation.md`
- `plugins/foreman-line/docs/specs/done/CLOSE-P3-biome-ci-always-report.md`
- `plugins/foreman-line/docs/specs/done/KEO-155-P1-review-sprint-packaging-closure.md`
- `plugins/foreman-line/docs/specs/done/KEO-156-P2-minimum-verifier-compatibility-canon-freeze.md`
- `plugins/foreman-line/docs/specs/done/KEO-59-P0V-claims-validation-repair.md`
- `plugins/foreman-line/docs/specs/done/KEO-59-proof-led-control-plane-reconciliation.md`
- `plugins/foreman-line/docs/specs/done/P1-permission-profile-registry-schema.md`
- `plugins/foreman-line/docs/specs/done/P2-dispatch-order-permission-profile-field.md`
- `plugins/foreman-line/docs/specs/done/P3-dispatch-time-emitter.md`
- `plugins/foreman-line/docs/specs/done/P4-spec-linter-permission-profile-enum.md`
- `plugins/foreman-line/docs/specs/done/SCAF-P1-shared-schema-scaffold-extraction.md`
- `plugins/foreman-line/docs/specs/done/SCAF-P2-shared-test-scaffold-extraction.md`
- `plugins/foreman-line/docs/specs/done/SCAF-P3-receipt-chain-walker.md`
- `plugins/foreman-line/docs/specs/done/SCAF-P4-exit-vehicle.md`
- `plugins/foreman-line/docs/specs/done/W0-P1-pipeline-stage-contracts.md`
- `plugins/foreman-line/docs/specs/done/W0-P2-parcel-schema-v02.md`
- `plugins/foreman-line/docs/specs/done/W0-P3-routing-policy-schema-validator.md`
- `plugins/foreman-line/docs/specs/done/W0-P4-receipt-chain-schema-validator.md`
- `plugins/foreman-line/docs/specs/done/W0-P5-skill-injection-matrix-schema-validator.md`
- `plugins/foreman-line/docs/specs/done/W1-P1-shaping-agent.md`
- `plugins/foreman-line/docs/specs/done/W1-P2-epic-story-projection.md`
- `plugins/foreman-line/docs/specs/done/W1-P3-human-approval-flow.md`
- `plugins/foreman-line/docs/specs/done/W1-P4-jira-registration.md`
- `plugins/foreman-line/docs/specs/done/W2-P1-jira-query-ranking.md`
- `plugins/foreman-line/docs/specs/done/W2-P2-dispatch-approval-cli.md`
- `plugins/foreman-line/docs/specs/done/W2-P3-routing-eval-engine.md`
- `plugins/foreman-line/docs/specs/done/W2-P4-kompress-integration.md`
- `plugins/foreman-line/docs/specs/done/W2-P5-skill-injection-engine.md`
- `plugins/foreman-line/docs/specs/done/W3-P1-verification-harness.md`
- `plugins/foreman-line/docs/specs/done/W3-P2-adversarial-reviewer.md`
- `plugins/foreman-line/docs/specs/done/W3-P3-pipeline-rework.md`
- `plugins/foreman-line/docs/specs/done/W3-P4-human-gate-jira.md`
- `plugins/foreman-line/docs/specs/done/W4-P0-correlation-lineage-fix.md`
- `plugins/foreman-line/docs/specs/done/W4-P1-integration-stage-e.md`
- `plugins/foreman-line/docs/specs/done/W4-P2-docspine-ci-hook.md`
- `plugins/foreman-line/docs/specs/done/W4-P3-risk-driven-audit-triggers.md`
- `plugins/foreman-line/docs/specs/done/W4-P4-github-gate-stage-f-closure.md`
- `plugins/foreman-line/docs/specs/done/correlation-lineage-fix.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/keo-155-p1-review-sprint-packaging-closure.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/keo-59-p0v-claims-validation-repair.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/keo-59-proof-led-control-plane-reconciliation.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/w4-p1-integration-stage-e.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/w4-p3-risk-driven-audit-triggers.shaping-result.json`
- `plugins/foreman-line/docs/specs/done/w4-p4-github-gate-stage-f-closure.shaping-result.json`
- `plugins/foreman-line/docs/transcripts/adversarial-review-DOCS-P1-findings.md`
- `plugins/foreman-line/docs/transcripts/adversarial-review-SCAF-P1-findings.md`
- `plugins/foreman-line/docs/transcripts/adversarial-review-W0-P3-findings.md`
- `plugins/foreman-line/docs/transcripts/adversarial-review-W0-P4-findings.md`
- `plugins/foreman-line/docs/transcripts/build-SEC-1-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P1-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P1-model-routing.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P1-pass-1.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P1-pass-2.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P1-pass-3.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P3-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W0-P4-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W1-P1-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W1-P2-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W1-P3-deterministic-pass.md`
- `plugins/foreman-line/docs/transcripts/build-W1-P4-deterministic-pass.md`
- `plugins/foreman-line/integration/biome.json`
- `plugins/foreman-line/integration/package-lock.json`
- `plugins/foreman-line/integration/package.json`
- `plugins/foreman-line/integration/src/audit-trigger.ts`
- `plugins/foreman-line/integration/src/auth/coordinator-identity.ts`
- `plugins/foreman-line/integration/src/branch-protection.ts`
- `plugins/foreman-line/integration/src/closure-receipt.ts`
- `plugins/foreman-line/integration/src/closure.ts`
- `plugins/foreman-line/integration/src/docspine-hook.ts`
- `plugins/foreman-line/integration/src/docspine-report.ts`
- `plugins/foreman-line/integration/src/effective-rules.ts`
- `plugins/foreman-line/integration/src/errors.ts`
- `plugins/foreman-line/integration/src/exit-vehicle.ts`
- `plugins/foreman-line/integration/src/gate-assembly.ts`
- `plugins/foreman-line/integration/src/governing-spec.ts`
- `plugins/foreman-line/integration/src/index.ts`
- `plugins/foreman-line/integration/src/pr-plan.ts`
- `plugins/foreman-line/integration/src/receipt.ts`
- `plugins/foreman-line/integration/src/report.ts`
- `plugins/foreman-line/integration/tests/audit-trigger-chain.test.ts`
- `plugins/foreman-line/integration/tests/audit-trigger.test.ts`
- `plugins/foreman-line/integration/tests/branch-protection.test.ts`
- `plugins/foreman-line/integration/tests/closure-fixtures.ts`
- `plugins/foreman-line/integration/tests/closure-receipt.test.ts`
- `plugins/foreman-line/integration/tests/closure.test.ts`
- `plugins/foreman-line/integration/tests/conformance.test.ts`
- `plugins/foreman-line/integration/tests/coordinator-identity.test.ts`
- `plugins/foreman-line/integration/tests/docspine-hook.test.ts`
- `plugins/foreman-line/integration/tests/effective-rules.test.ts`
- `plugins/foreman-line/integration/tests/exit-vehicle.test.ts`
- `plugins/foreman-line/integration/tests/fixtures/effective-rules-live-capture.json`
- `plugins/foreman-line/integration/tests/gate-assembly.test.ts`
- `plugins/foreman-line/integration/tests/governing-spec.test.ts`
- `plugins/foreman-line/integration/tests/pr-plan.test.ts`
- `plugins/foreman-line/integration/tests/receipt.test.ts`
- `plugins/foreman-line/integration/tests/report.test.ts`
- `plugins/foreman-line/integration/tests/scaf-p4-harness.test.ts`
- `plugins/foreman-line/integration/tsconfig.json`
- `plugins/foreman-line/permission-profiles/PROBE.md`
- `plugins/foreman-line/permission-profiles/README.md`
- `plugins/foreman-line/permission-profiles/biome.json`
- `plugins/foreman-line/permission-profiles/package-lock.json`
- `plugins/foreman-line/permission-profiles/package.json`
- `plugins/foreman-line/permission-profiles/permission-profiles.yaml`
- `plugins/foreman-line/permission-profiles/schemas/network-intent.schema.json`
- `plugins/foreman-line/permission-profiles/schemas/permission-envelope.schema.json`
- `plugins/foreman-line/permission-profiles/schemas/permission-profile-registry.schema.json`
- `plugins/foreman-line/permission-profiles/schemas/permission-profile.schema.json`
- `plugins/foreman-line/permission-profiles/src/cli.ts`
- `plugins/foreman-line/permission-profiles/src/emitter.ts`
- `plugins/foreman-line/permission-profiles/src/generate.ts`
- `plugins/foreman-line/permission-profiles/src/index.ts`
- `plugins/foreman-line/permission-profiles/src/registry.ts`
- `plugins/foreman-line/permission-profiles/src/schemas.ts`
- `plugins/foreman-line/permission-profiles/src/testing.ts`
- `plugins/foreman-line/permission-profiles/src/types.ts`
- `plugins/foreman-line/permission-profiles/src/validator.ts`
- `plugins/foreman-line/permission-profiles/tests/cli.test.ts`
- `plugins/foreman-line/permission-profiles/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/permission-profiles/tests/dispatch-cli.test.ts`
- `plugins/foreman-line/permission-profiles/tests/emitter.test.ts`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-bypass-mode.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-malformed-rule.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-missing-envelope-field.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-missing-profile.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-reviewer-incomplete.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-reviewer-shell-denied.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-self-mod-guard.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-unknown-profile.yaml`
- `plugins/foreman-line/permission-profiles/tests/fixtures/reject-unparsable.yaml`
- `plugins/foreman-line/permission-profiles/tests/gitignore.test.ts`
- `plugins/foreman-line/permission-profiles/tests/no-coupling.test.ts`
- `plugins/foreman-line/permission-profiles/tests/parity.test.ts`
- `plugins/foreman-line/permission-profiles/tests/schema-validation.test.ts`
- `plugins/foreman-line/permission-profiles/tests/semantic-invariants.test.ts`
- `plugins/foreman-line/permission-profiles/tsconfig.json`
- `plugins/foreman-line/projection/README.md`
- `plugins/foreman-line/projection/biome.json`
- `plugins/foreman-line/projection/package-lock.json`
- `plugins/foreman-line/projection/package.json`
- `plugins/foreman-line/projection/src/api.ts`
- `plugins/foreman-line/projection/src/discover.ts`
- `plugins/foreman-line/projection/src/guards.ts`
- `plugins/foreman-line/projection/src/index.ts`
- `plugins/foreman-line/projection/src/keys.ts`
- `plugins/foreman-line/projection/src/path-guard.ts`
- `plugins/foreman-line/projection/src/paths.ts`
- `plugins/foreman-line/projection/src/project.ts`
- `plugins/foreman-line/projection/src/title.ts`
- `plugins/foreman-line/projection/src/write.ts`
- `plugins/foreman-line/projection/tests/bare-specifier.test.ts`
- `plugins/foreman-line/projection/tests/canonicalizability.test.ts`
- `plugins/foreman-line/projection/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/projection/tests/epic-title.test.ts`
- `plugins/foreman-line/projection/tests/frozen-surface.test.ts`
- `plugins/foreman-line/projection/tests/helpers.ts`
- `plugins/foreman-line/projection/tests/input-consumption.test.ts`
- `plugins/foreman-line/projection/tests/keys.test.ts`
- `plugins/foreman-line/projection/tests/output-mechanics.test.ts`
- `plugins/foreman-line/projection/tests/path-containment.test.ts`
- `plugins/foreman-line/projection/tests/redos.test.ts`
- `plugins/foreman-line/projection/tests/schema-validation.test.ts`
- `plugins/foreman-line/projection/tests/semantic-guards.test.ts`
- `plugins/foreman-line/projection/tests/title-provenance.test.ts`
- `plugins/foreman-line/projection/tests/topology.test.ts`
- `plugins/foreman-line/projection/tsconfig.json`
- `plugins/foreman-line/receipts/README.md`
- `plugins/foreman-line/receipts/biome.json`
- `plugins/foreman-line/receipts/package-lock.json`
- `plugins/foreman-line/receipts/package.json`
- `plugins/foreman-line/receipts/schemas/receipt-document.schema.json`
- `plugins/foreman-line/receipts/schemas/signature.schema.json`
- `plugins/foreman-line/receipts/src/cli.ts`
- `plugins/foreman-line/receipts/src/generate.ts`
- `plugins/foreman-line/receipts/src/index.ts`
- `plugins/foreman-line/receipts/src/paths.ts`
- `plugins/foreman-line/receipts/src/registry.ts`
- `plugins/foreman-line/receipts/src/schemas.ts`
- `plugins/foreman-line/receipts/src/types.ts`
- `plugins/foreman-line/receipts/src/validator.ts`
- `plugins/foreman-line/receipts/tests/chain-invariants.test.ts`
- `plugins/foreman-line/receipts/tests/cli.test.ts`
- `plugins/foreman-line/receipts/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/receipts/tests/fixtures/chain-empty/.gitkeep`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-correlation-mismatch/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-correlation-mismatch/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-null-correlation/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-null-correlation/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-prevhash-mismatch/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-prevhash-mismatch/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-scalar-member/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-scalar-member/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-scalar-member/notes.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-sequence-gap/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-reject-sequence-gap/000002-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-sealed/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-sealed/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-sealed/000002-F-closure-record.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-single-genesis/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-single-nongenesis/000005-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-unsealed/000000-A-shaping-result.json`
- `plugins/foreman-line/receipts/tests/fixtures/chain-unsealed/000001-C-dispatch-order.json`
- `plugins/foreman-line/receipts/tests/fixtures/hash-vector-genesis.json`
- `plugins/foreman-line/receipts/tests/fixtures/malformed.json`
- `plugins/foreman-line/receipts/tests/fixtures/pass-claimref-claim-nonnull.json`
- `plugins/foreman-line/receipts/tests/fixtures/pass-claimref-stage-null.json`
- `plugins/foreman-line/receipts/tests/fixtures/pass-genesis-null-prevhash.json`
- `plugins/foreman-line/receipts/tests/fixtures/pass-nongenesis-nonnull-prevhash.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-claimref-claim-null.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-claimref-stage-nonnull.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-correlation-unknown-field.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-genesis-nonnull-prevhash.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-hash-badpattern.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-kind-invalid.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-missing-field.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-nongenesis-null-prevhash.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-prevhash-badpattern.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-sequence-negative.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-sequence-noninteger.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-stage-invalid.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-timestamp-badpattern.json`
- `plugins/foreman-line/receipts/tests/fixtures/reject-unknown-field.json`
- `plugins/foreman-line/receipts/tests/hash-vector.test.ts`
- `plugins/foreman-line/receipts/tests/parity.test.ts`
- `plugins/foreman-line/receipts/tests/paths.test.ts`
- `plugins/foreman-line/receipts/tests/schema-validation.test.ts`
- `plugins/foreman-line/receipts/tests/semantic-invariants.test.ts`
- `plugins/foreman-line/receipts/tests/support/canonical.ts`
- `plugins/foreman-line/receipts/tsconfig.json`
- `plugins/foreman-line/registration/README.md`
- `plugins/foreman-line/registration/biome.json`
- `plugins/foreman-line/registration/config/project-allowlist.json`
- `plugins/foreman-line/registration/package-lock.json`
- `plugins/foreman-line/registration/package.json`
- `plugins/foreman-line/registration/src/adapter-docker-mcp.ts`
- `plugins/foreman-line/registration/src/backfill.ts`
- `plugins/foreman-line/registration/src/gate.ts`
- `plugins/foreman-line/registration/src/gated-transport.ts`
- `plugins/foreman-line/registration/src/git.ts`
- `plugins/foreman-line/registration/src/hash-refusal.ts`
- `plugins/foreman-line/registration/src/index.ts`
- `plugins/foreman-line/registration/src/jql.ts`
- `plugins/foreman-line/registration/src/payloads.ts`
- `plugins/foreman-line/registration/src/permalink.ts`
- `plugins/foreman-line/registration/src/prior-registration.ts`
- `plugins/foreman-line/registration/src/receipt.ts`
- `plugins/foreman-line/registration/src/register.ts`
- `plugins/foreman-line/registration/src/types.ts`
- `plugins/foreman-line/registration/tests/adapter-args.test.ts`
- `plugins/foreman-line/registration/tests/adapter-gate.test.ts`
- `plugins/foreman-line/registration/tests/bare-specifier.test.ts`
- `plugins/foreman-line/registration/tests/credential-hygiene.test.ts`
- `plugins/foreman-line/registration/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/registration/tests/frozen-surface.test.ts`
- `plugins/foreman-line/registration/tests/gate-reachability.test.ts`
- `plugins/foreman-line/registration/tests/gate.test.ts`
- `plugins/foreman-line/registration/tests/hash-refusal.test.ts`
- `plugins/foreman-line/registration/tests/helpers.ts`
- `plugins/foreman-line/registration/tests/idempotency.test.ts`
- `plugins/foreman-line/registration/tests/link-recovery.test.ts`
- `plugins/foreman-line/registration/tests/multi-match.test.ts`
- `plugins/foreman-line/registration/tests/payloads.test.ts`
- `plugins/foreman-line/registration/tests/plan-correction.test.ts`
- `plugins/foreman-line/registration/tests/preview.test.ts`
- `plugins/foreman-line/registration/tests/prior-registration.test.ts`
- `plugins/foreman-line/registration/tests/receipt.test.ts`
- `plugins/foreman-line/registration/tests/reconcile-sha.test.ts`
- `plugins/foreman-line/registration/tests/registration-result.test.ts`
- `plugins/foreman-line/registration/tests/two-commit.test.ts`
- `plugins/foreman-line/registration/tests/writeback.test.ts`
- `plugins/foreman-line/registration/tsconfig.json`
- `plugins/foreman-line/routing-policy/README.md`
- `plugins/foreman-line/routing-policy/biome.json`
- `plugins/foreman-line/routing-policy/package-lock.json`
- `plugins/foreman-line/routing-policy/package.json`
- `plugins/foreman-line/routing-policy/routing-policy.yaml`
- `plugins/foreman-line/routing-policy/schemas/class-entry.schema.json`
- `plugins/foreman-line/routing-policy/schemas/data-classification-rule.schema.json`
- `plugins/foreman-line/routing-policy/schemas/role-assignment.schema.json`
- `plugins/foreman-line/routing-policy/schemas/routing-policy.schema.json`
- `plugins/foreman-line/routing-policy/src/cli.ts`
- `plugins/foreman-line/routing-policy/src/generate.ts`
- `plugins/foreman-line/routing-policy/src/index.ts`
- `plugins/foreman-line/routing-policy/src/registry.ts`
- `plugins/foreman-line/routing-policy/src/schemas.ts`
- `plugins/foreman-line/routing-policy/src/testing.ts`
- `plugins/foreman-line/routing-policy/src/types.ts`
- `plugins/foreman-line/routing-policy/src/validator.ts`
- `plugins/foreman-line/routing-policy/tests/cli.test.ts`
- `plugins/foreman-line/routing-policy/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-both.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-ceiling-missing.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-ceiling-zero.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-classification-gate.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-frontier-anchor.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-multiple.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-role-pinning.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-security-override.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-security-undeclared.yaml`
- `plugins/foreman-line/routing-policy/tests/fixtures/reject-structural.yaml`
- `plugins/foreman-line/routing-policy/tests/parity.test.ts`
- `plugins/foreman-line/routing-policy/tests/schema-validation.test.ts`
- `plugins/foreman-line/routing-policy/tests/semantic-invariants.test.ts`
- `plugins/foreman-line/routing-policy/tsconfig.json`
- `plugins/foreman-line/schema-scaffold/README.md`
- `plugins/foreman-line/schema-scaffold/biome.json`
- `plugins/foreman-line/schema-scaffold/package-lock.json`
- `plugins/foreman-line/schema-scaffold/package.json`
- `plugins/foreman-line/schema-scaffold/src/generate.ts`
- `plugins/foreman-line/schema-scaffold/src/index.ts`
- `plugins/foreman-line/schema-scaffold/src/registry.ts`
- `plugins/foreman-line/schema-scaffold/src/test-scaffold.ts`
- `plugins/foreman-line/schema-scaffold/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/schema-scaffold/tests/generate.test.ts`
- `plugins/foreman-line/schema-scaffold/tests/test-scaffold.test.ts`
- `plugins/foreman-line/schema-scaffold/tsconfig.json`
- `plugins/foreman-line/shaping/README.md`
- `plugins/foreman-line/shaping/biome.json`
- `plugins/foreman-line/shaping/package-lock.json`
- `plugins/foreman-line/shaping/package.json`
- `plugins/foreman-line/shaping/src/emit.ts`
- `plugins/foreman-line/shaping/src/index.ts`
- `plugins/foreman-line/shaping/src/read.ts`
- `plugins/foreman-line/shaping/src/self-check.ts`
- `plugins/foreman-line/shaping/tests/advisory.test.ts`
- `plugins/foreman-line/shaping/tests/artifact-path.test.ts`
- `plugins/foreman-line/shaping/tests/bare-specifier.test.ts`
- `plugins/foreman-line/shaping/tests/body-section.test.ts`
- `plugins/foreman-line/shaping/tests/canonicalizability.test.ts`
- `plugins/foreman-line/shaping/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/shaping/tests/empty-epics.test.ts`
- `plugins/foreman-line/shaping/tests/frontmatter-selfcheck.test.ts`
- `plugins/foreman-line/shaping/tests/handoff-read.test.ts`
- `plugins/foreman-line/shaping/tests/helpers.ts`
- `plugins/foreman-line/shaping/tests/redos.test.ts`
- `plugins/foreman-line/shaping/tests/schema-validation.test.ts`
- `plugins/foreman-line/shaping/tests/semantic-guard.test.ts`
- `plugins/foreman-line/shaping/tests/skill-template-presence.test.ts`
- `plugins/foreman-line/shaping/tsconfig.json`
- `plugins/foreman-line/skill-injection/README.md`
- `plugins/foreman-line/skill-injection/biome.json`
- `plugins/foreman-line/skill-injection/package-lock.json`
- `plugins/foreman-line/skill-injection/package.json`
- `plugins/foreman-line/skill-injection/schemas/coordinator-skills.schema.json`
- `plugins/foreman-line/skill-injection/schemas/integration-skills.schema.json`
- `plugins/foreman-line/skill-injection/schemas/role-skill-map.schema.json`
- `plugins/foreman-line/skill-injection/schemas/skill-injection-matrix.schema.json`
- `plugins/foreman-line/skill-injection/skill-injection.yaml`
- `plugins/foreman-line/skill-injection/src/cli.ts`
- `plugins/foreman-line/skill-injection/src/generate.ts`
- `plugins/foreman-line/skill-injection/src/index.ts`
- `plugins/foreman-line/skill-injection/src/registry.ts`
- `plugins/foreman-line/skill-injection/src/schemas.ts`
- `plugins/foreman-line/skill-injection/src/testing.ts`
- `plugins/foreman-line/skill-injection/src/types.ts`
- `plugins/foreman-line/skill-injection/src/validate.ts`
- `plugins/foreman-line/skill-injection/tests/cli.test.ts`
- `plugins/foreman-line/skill-injection/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/skill-injection/tests/fixtures/accept-empty-role-map.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-bad-glob.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-duplicate-nested-key.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-duplicate-top-level.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-empty-glob-array.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-empty-jira.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-empty-rework-first.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-missing-toplevel.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-multiple-violations.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-unknown-nested.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-unknown-toplevel.yaml`
- `plugins/foreman-line/skill-injection/tests/fixtures/reject-whitespace-skill-name.yaml`
- `plugins/foreman-line/skill-injection/tests/parity.test.ts`
- `plugins/foreman-line/skill-injection/tests/schema-validation.test.ts`
- `plugins/foreman-line/skill-injection/tests/semantic-invariants.test.ts`
- `plugins/foreman-line/skill-injection/tsconfig.json`
- `plugins/foreman-line/skills/foreman-shaping/SKILL.md`
- `plugins/foreman-line/skills/goal/SKILL.md`
- `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`
- `plugins/foreman-line/skills/parcel-driven-development/templates/CONTRACT_AMENDMENT.md`
- `plugins/foreman-line/skills/parcel-driven-development/templates/PARCEL.md`
- `plugins/foreman-line/skills/parcel-driven-development/templates/PARCEL_INDEX.md`
- `plugins/foreman-line/spec-linter/README.md`
- `plugins/foreman-line/spec-linter/biome.json`
- `plugins/foreman-line/spec-linter/package-lock.json`
- `plugins/foreman-line/spec-linter/package.json`
- `plugins/foreman-line/spec-linter/schemas/spec-frontmatter.schema.json`
- `plugins/foreman-line/spec-linter/src/cli.ts`
- `plugins/foreman-line/spec-linter/src/generate.ts`
- `plugins/foreman-line/spec-linter/src/grandfather.ts`
- `plugins/foreman-line/spec-linter/src/index.ts`
- `plugins/foreman-line/spec-linter/src/registry.ts`
- `plugins/foreman-line/spec-linter/src/schemas.ts`
- `plugins/foreman-line/spec-linter/src/testing.ts`
- `plugins/foreman-line/spec-linter/src/types.ts`
- `plugins/foreman-line/spec-linter/src/validate.ts`
- `plugins/foreman-line/spec-linter/tests/cli.test.ts`
- `plugins/foreman-line/spec-linter/tests/dependency-allowlist.test.ts`
- `plugins/foreman-line/spec-linter/tests/fixtures/permission-profile-null.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-permission-profile-unknown.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-permission-profile-whitespace.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-risk.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-routing-class.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-status.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-superseded-null.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/reject-surfaces-empty.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/valid-spec-no-perm.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/valid-spec-unknown-surface.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/valid-spec.md`
- `plugins/foreman-line/spec-linter/tests/fixtures/valid-superseded.md`
- `plugins/foreman-line/spec-linter/tests/grandfather.test.ts`
- `plugins/foreman-line/spec-linter/tests/parity.test.ts`
- `plugins/foreman-line/spec-linter/tests/schema-validation.test.ts`
- `plugins/foreman-line/spec-linter/tests/semantic-invariants.test.ts`
- `plugins/foreman-line/spec-linter/tsconfig.json`
- `plugins/foreman-line/verification/AC-CONVENTION.md`
- `plugins/foreman-line/verification/PROBE-HEADLESS.md`
- `plugins/foreman-line/verification/biome.json`
- `plugins/foreman-line/verification/package-lock.json`
- `plugins/foreman-line/verification/package.json`
- `plugins/foreman-line/verification/src/adversarial/index.ts`
- `plugins/foreman-line/verification/src/chainwalk/index.ts`
- `plugins/foreman-line/verification/src/harness/index.ts`
- `plugins/foreman-line/verification/src/human-gate/adapter.ts`
- `plugins/foreman-line/verification/src/human-gate/index.ts`
- `plugins/foreman-line/verification/src/index.ts`
- `plugins/foreman-line/verification/src/pipeline/index.ts`
- `plugins/foreman-line/verification/tests/adversarial-collect.test.ts`
- `plugins/foreman-line/verification/tests/adversarial-dispatch.test.ts`
- `plugins/foreman-line/verification/tests/adversarial-rework.test.ts`
- `plugins/foreman-line/verification/tests/adversarial-scaffold.test.ts`
- `plugins/foreman-line/verification/tests/build-result.test.ts`
- `plugins/foreman-line/verification/tests/chainwalk.test.ts`
- `plugins/foreman-line/verification/tests/harness.test.ts`
- `plugins/foreman-line/verification/tests/helpers.ts`
- `plugins/foreman-line/verification/tests/human-gate-execute.test.ts`
- `plugins/foreman-line/verification/tests/human-gate-helpers.ts`
- `plugins/foreman-line/verification/tests/human-gate.test.ts`
- `plugins/foreman-line/verification/tests/pipeline.test.ts`
- `plugins/foreman-line/verification/tests/rework.test.ts`
- `plugins/foreman-line/verification/tests/scaffold.test.ts`
- `plugins/foreman-line/verification/tsconfig.json`

**Parcel contract/evidence records:**

- `plugins/foreman-line/docs/specs/active/WGT-P0BOOT-tracked-foreman-bootstrap.md`
- `plugins/foreman-line/docs/specs/done/WGT-P0BOOT-tracked-foreman-bootstrap.md`
- `plugins/foreman-line/docs/specs/active/wgt-p0boot-tracked-foreman-bootstrap.shaping-result.json`
- `plugins/foreman-line/docs/transcripts/WGT-P0BOOT-source-manifest.sha256`
- `plugins/foreman-line/docs/transcripts/build-WGT-P0BOOT-tracked-bootstrap.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/wgt-p0boot-review-a-findings.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/wgt-p0boot-review-b-findings.md`
<!-- WGT-P0BOOT-ALLOWED-FILES-END -->

## Verification Plan

The coordinator independently reruns the frozen inventory/hash comparison,
forbidden-path checks, JSON parsing plus the exact negative-fixture rejection,
package command matrix, exact first-import-tripwire classification,
baseline-classified cached-diff check, and secret scan. After merge, the
coordinator reruns the unqualified complete matrix on a fresh `origin/main`
checkout before unlocking WGT-P0A.
Reviewers receive
the spec, build transcript, durable source
manifest, staged diff, and exact commands/results; neither may rely on builder
self-grading. Review A and review B must be context-isolated from the build and
from each other.

## Rollback

Before merge, delete only the isolated branch/worktree if the parcel is
abandoned; the shared source remains untouched. After merge, rollback is a
normal revert of the bootstrap merge commit. Never recursively delete or clean
the shared `D:/Repos/agent-skills` checkout.

## Escalation and exit

Stop on any baseline/hash/scope mismatch, secret signal that cannot be proven
synthetic, failed mandatory command outside the two exact pre-merge exceptions,
review finding at Medium or higher,
remote/branch contradiction, or required path outside Allowed Files. Exit is
the merged `origin/main` tree receipt described in AC 9, not a local copy or
green builder claim.
