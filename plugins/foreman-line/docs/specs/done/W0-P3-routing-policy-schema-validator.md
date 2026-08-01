---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - routing policy schema + validator (W0-P3)
status: done                # merged via PR #15 (f508e81), 2026-07-14
owner: clinton.morgan
created: 2026-07-14
updated: 2026-07-14
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/routing-policy/*]
routing_class: architecture/risk   # W0 contract work routes frontier per policy, same reasoning as W0-P1
---

# W0-P3 - Routing Policy Schema + Validator

## Intent

Define the frozen JSON Schema (and matching TypeScript type) for `routing-policy.yaml` - the policy-as-code artifact that governs model/agent-count selection at dispatch (plan §5, locked decisions D5/D6) - and ship a validator that checks a policy document against both structure and the semantic invariants the plan already states in prose. Ship the concrete v0 policy file itself, populated with the July-2026 table from §5, so the schema and validator are proven against real content on day one rather than a synthetic fixture. This parcel produces the artifact W2-P3 will later evaluate at dispatch time; it does not perform that evaluation.

## Constraints

- **Location:** `plugins/foreman-line/routing-policy/` in `kaseya-one-productivity-tools` (local: `C:\Repos\kaseya-one-productivity-tools`) - sibling to the frozen `plugins/foreman-line/contracts/`, same foundation tier.
- **Stack:** TypeScript, Node ≥22, ESM-only. Tests via `node --test` (`npx tsx --test`). Lint/format with `biome`.
- **Standing rule from the W0-P1 rework (binding on this parcel):** ajv's
  `JSONSchemaType` is banned as a schema authority anywhere in this repo;
  every schema is standard JSON Schema draft-07 typed as `SchemaObject`.
- **Runtime dependency allowlist (amended at Step 0, coordinator-ratified):**
  exactly two runtime dependencies are permitted - `ajv` (validation
  engine) and `yaml` (policy document parsing; itself dependency-free).
  A test MUST assert that `package.json`'s `dependencies` keys equal
  exactly `{ajv, yaml}` - the allowlist is machine-enforced, not prose.
  (Original draft said ajv was "the one runtime dependency"; that line
  scoped the ajv exception and did not account for YAML parsing.
  Hand-rolling a YAML-subset parser inside a policy validator was
  rejected as bespoke correctness surface in the trust-adjacent path;
  JSON-as-YAML was rejected because plan §5's policy-as-code example is
  commented YAML and human authoring ergonomics are the point.)
- **Dual representation, same discipline as W0-P1:** `RoutingPolicy` and its nested shapes (`ClassEntry`, `DataClassificationRule`, `RoleAssignment`) each ship as (1) a TypeScript type and (2) a JSON Schema, with a parity test proving they agree. Agents consume the schema; humans and compilers consume the type.
- **Class enum reconciliation (mandatory):** the plan's §5 illustrative table lists `boilerplate` / `standard-feature` / `architecture/risk`, but the two shipped precedent specs already use a fourth value not in that table - `implementation/standard` (PCC-P0). This spec's `routing-policy.yaml` is the reconciliation point: its `classes` map MUST include all four values (`boilerplate`, `standard-feature`, `architecture/risk`, `implementation/standard`) so the enum the validator enforces actually covers every `routing_class` value already in use, not just the plan's prose example.
- **Data classification tiers:** `public | internal | restricted`, per §5. Eligibility gating by classification is evaluated before cost optimization (D6) - this ordering is a semantic invariant the validator enforces, not just a comment.
- **Roles:** `coordinator`, `verifier`, `builder`. Per D4 and §5, `coordinator` and `verifier` are structurally pinned to `frontier` tier in the policy file itself. (Runtime distinctness - coordinator and verifier resolving to *separate agent instances* at dispatch - is a W2-P3/W3 dispatch-time property, not something a static policy document can express; this parcel validates the tier pinning only and says so explicitly in the README so the boundary isn't assumed away.)
- **Security override:** any `routing_class` whose semantics are security-audit-flavored (as declared by the policy file's own class entries, per plan §5's table row "Security-audit parcels & security review") must resolve to `frontier` and never a lower tier - hard override, validated structurally.
  Declaration is `ClassEntry.security_flavored: boolean`; the invariant
  requires every tier in a flagged class's allowlist to equal `frontier`
  (not merely contain it). **Derived guard (amended at Step 0):** any
  class whose key matches `/security|audit/i` without
  `security_flavored: true` is rejected as an undeclared security class -
  declared + derived, never "somehow" (plan §6's pattern applied to the
  policy file itself).
  **Frontier-tier anchoring (amended at rework, coordinator-ratified):** the
  validator source carries a `KNOWN_FRONTIER_MODELS` registry (v0:
  `claude-opus-4-8`); semantic invariant (e) rejects any model id in
  `model_tiers.frontier` not present in the registry. The registry is code,
  not policy content - redefining frontier requires a reviewed, tested code
  change (the quarterly revisit), never a policy-file edit.
- **Ceilings:** every class entry has a `ceiling_usd` present and greater than zero.
- **Concrete v0 content:** `routing-policy.yaml` encodes the July-2026 instantiation table verbatim from plan §5 (Claude Sonnet 5 as builder default; Claude Haiku 4.5 for boilerplate / build-fix-loop; Claude Opus 4.8 for coordinator and adversarial reviewer; Claude Opus 4.8 hard override for security-audit routing classes, never Sonnet 5).
- **CLI surface:** a single `validate <path>` command, thin wrapper over an exported library function (`validatePolicy(doc): ValidationResult`). No `explain`/resolve command - resolving what a given parcel's routing decision *would be* is dispatch-time evaluation (W2-P3), not static validation, and is explicitly not built here.
- **Exit-code contract (frozen by this parcel, no workflow wiring):** `0` valid; `1` schema or semantic-invariant violation (stderr lists every violation found, not just the first); `2` usage error (missing/unreadable path, bad invocation). Mirrors the pcc scaffold's contract style. Wiring an actual CI workflow step that blocks PRs on `routing-policy.yaml` changes is explicitly deferred to the CI Integration wave (W4).
- **No pcc dependency:** this parcel does not import from, depend on, or modify `skills/parcel-compiler/tool/`. Standalone library + CLI.
- **Frozen contracts are untouchable:** `plugins/foreman-line/contracts/` (including `DispatchOrder.routingDecisionRef`, which stays exactly as opaque as W0-P1 froze it) is out of bounds. This parcel validates the routing *policy document*; it does not define, touch, or pre-empt the shape of a routing *decision record* (that pairs with `routingDecisionRef` and eventually a W0-P4 receipt).
- **Branch/worktree (defects_lessons #9):** builder works on a named feature branch `feat/foreman-line-w0-p3`, isolated in its own worktree - never directly in the main working tree. This line goes into the dispatch kickstarter verbatim; it is not ambient knowledge.
- **Deterministic-pass environment (defects_lessons #10):** verification runs in PowerShell. `node -v` is checked first, before any other command, and must report ≥22. Shell selection is a standing rule, not left to discovery mid-build.
- All source is `readonly`/immutable-shaped where applicable; the schema describes a policy document's shape, not mutable runtime state.

## Acceptance Criteria

1. `npx tsc --noEmit` passes on the routing-policy package.
2. Every exported type (`RoutingPolicy`, `ClassEntry`, `DataClassificationRule`, `RoleAssignment`) has a matching JSON Schema in `schemas/`, and a parity test proves type ↔ schema agreement for all of them.
3. The shipped `routing-policy.yaml` v0 file validates against `routing-policy.schema.json` with zero errors.
4. `routing-policy.yaml` v0 contains: a `classes` map with all four reconciled values (`boilerplate`, `standard-feature`, `architecture/risk`, `implementation/standard`), each with an `allowlist` and a `ceiling_usd`; a `data_classification` map for `public`/`internal`/`restricted`; a `roles` map with `coordinator: frontier`, `verifier: frontier`, `builder: per-class`; and the concrete July-2026 model table (Sonnet 5 default builder, Haiku 4.5 boilerplate/build-fix-loop, Opus 4.8 coordinator/adversarial-reviewer, Opus 4.8 hard override for security-audit classes).
5. Five semantic-invariant test suites, each with at least one passing fixture and one rejecting fixture:
   a. Classification-gates-before-cost: a policy where a `restricted` classification's eligible set includes a model only eligible under `public` is rejected.
   b. Coordinator/verifier frontier pinning: a policy assigning a non-frontier tier to either role is rejected.
   c. Security-override: a policy permitting a non-frontier model for a security-audit-flavored routing class is rejected.
   d. Ceiling presence: a policy with a missing or zero `ceiling_usd` on any class entry is rejected.
   e. Frontier-tier anchoring: a policy whose `model_tiers.frontier` contains a model id absent from `KNOWN_FRONTIER_MODELS` is rejected.
6. CLI `validate` command: exits `0` on the shipped valid policy; exits `1` with every violation listed on stderr (not just the first) against each of five rejecting fixtures — the four semantic-invariant rejecting fixtures above plus a fifth, purely structural schema-violation fixture (a document that violates `routing-policy.schema.json` without engaging any semantic invariant); exits `2` on a missing path and on an unreadable file.
7. `biome check .` passes with zero diagnostics.
8. All tests pass via `npx tsx --test`; total test count ≥ 20.
9. `routing-policy/README.md` documents the schema shape, the exit-code contract, and each of the four enforced invariants (including the explicit note that runtime coordinator/verifier instance-distinctness is out of this parcel's reach) in ≤ 1 page.

## Out of Scope

- Runtime evaluation of routing decisions at dispatch time - resolving what model(s) and agent count a given parcel gets (W2-P3). This parcel validates the policy document; it does not consume it at dispatch.
- Skill-injection matrix schema/validator (W0-P5) - a sibling parcel. Any shared validator abstraction between the two is a future decision to make deliberately, not something this parcel builds preemptively.
- Receipt shape, `ReceiptRef` contents, or the concrete shape of a routing *decision record* referenced by `DispatchOrder.routingDecisionRef` (W0-P4 owns receipt shape; the frozen W0-P1 contract owns the opaque ref). This parcel never types a decision record - if the builder finds itself doing so, that is a Stop-and-Report, same posture as PCC-P0's W0-P4 non-pre-emption rule.
- Any modification to `plugins/foreman-line/contracts/` (frozen).
- pcc (`skills/parcel-compiler/tool/`) integration of any kind, in either direction.
- Cross-validating individual spec frontmatter (`risk:`/`surfaces:`/`routing_class:`) against `routing-policy.yaml` for a specific parcel - that is dispatch-time resolution (W2-P3), not this parcel's self-validation of the policy document.
- CI workflow wiring (a GitHub Actions step that runs the validator and blocks PRs) - the exit-code contract is documented and callable; wiring the workflow file is W4.
- Modifying `SPEC-CONVENTION.md` (v0.2 frontmatter field definitions, including formalizing `routing_class`, are W0-P2's).
- Smart Triage / assignment logic and its taxonomy (W5).
- Cost tracking, budget enforcement, or Context Ledger ceiling enforcement at runtime - this parcel validates that `ceiling_usd` is structurally present and positive, nothing more.

## Context & References

- FOREMAN-LINE-PLAN.md - §5 (routing policy shape + concrete v0 table, the substance of this parcel), §3 D5/D6 (declared+derived audit triggers rely on this policy; classification-before-cost), §7 open question 3 (N>1 builders forces a shaping-time split - resolved here as not applicable).
- SPEC-CONVENTION.md - schema this parcel is written under.
- `docs/specs/active/W0-P1-pipeline-stage-contracts.md` - frozen contracts this parcel must not touch; dual-representation (type + schema + parity test) pattern followed here; `DispatchOrder.routingDecisionRef` opacity this parcel does not pre-empt.
- `docs/specs/done/PCC-P0-pcc-cli-scaffold.md` - precedent for the `JSONSchemaType`-ban constraint, the exit-code contract style, and the "Stop-and-Report on scope pre-emption" posture; also the source of the `implementation/standard` routing_class value this parcel reconciles.
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` - confirms `routingDecisionRef` and `injectedSkills` are frozen as opaque strings; this parcel supplies the policy that a future decision-record would reference, not the record itself.
- `docs/transcripts/defects_lessons.md` #9 (name the branch/worktree in the spec, not ambient knowledge) and #10 (PowerShell + `node -v` first, standing rule).

## Verification Plan

Deterministic: `tsc --noEmit`, parity tests, the four semantic-invariant test suites (each with passing + rejecting fixtures), CLI exit-code tests against all fixtures, `biome check`, test-count threshold. Deterministic pass runs in PowerShell on the coordinator's machine; `node -v` (must report ≥22) is the first command run, before anything else (defects_lessons #10).

Adversarial review mandated focus questions:
1. **Invariant depth, not strawman fixtures:** do the four enforced invariants actually catch violations of D5/D6 as locked, or only the obvious rejecting fixtures the builder wrote? Construct a policy that is structurally valid and passes the four stated checks but still violates the *intent* of D6 (e.g., a technically-present ceiling that is non-binding, or an allowlist ordering trick that lets a `restricted`-ineligible model back in through a shared class) and confirm the validator still rejects it - if it doesn't, that's a defect, not a pass.
2. **Class-enum reconciliation legitimacy:** is `implementation/standard`'s inclusion actually justified by grep-verified precedent (both `W0-P1` and `PCC-P0` frontmatter), or did shaping silently invent a taxonomy entry? Cite both specs' actual `routing_class:` lines from disk, not from this spec's paraphrase.
3. **Exit-code parity claim:** this spec asserts its CLI's `0`/`1`/`2` mean the same thing as pcc's scaffold contract. Verify that claim against `skills/parcel-compiler/tool`'s actual documented contract, not against this spec's description of it.
4. **W0-P1/W0-P4 non-pre-emption hunt:** confirm no receipt shape, decision-record shape, or `routingDecisionRef` concrete type is smuggled in anywhere - types, test fixtures, or README examples - the same hunt PCC-P0's review ran for W0-P4, applied here.
