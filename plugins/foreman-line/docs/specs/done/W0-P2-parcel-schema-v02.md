---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - parcel schema v0.2 (W0-P2)
status: done                # merged via PR #19 (edba0ac), 2026-07-15
owner: clinton.morgan
created: 2026-07-15
updated: 2026-07-15
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [docs/SPEC-CONVENTION.md, plugins/foreman-line/spec-linter/*]
routing_class: architecture/risk   # W0 contract work routes frontier per policy, same reasoning as W0-P1/W0-P3/W0-P4
---

# W0-P2 - Parcel Schema v0.2

## Intent

Formalize the four new spec frontmatter fields — `risk:`, `surfaces:`, `routing_class:`, and `permission_profile:` — that all four W0 precedent specs already carry in practice but that SPEC-CONVENTION §4 does not yet define. Also formalize the coordinator-ratified-amendment pattern already demonstrated in commits 057136b, ff9f6d3, 28a0233, and 5d530fb. Ships as two artifacts: (1) SPEC-CONVENTION.md text updates that define the fields, their allowed values, their lint rules, and the amendment pattern, and (2) a new `plugins/foreman-line/spec-linter/` package that validates spec frontmatter against the v0.2 schema — fulfilling SPEC-CONVENTION §7's requirement that "a convention without a validator is a suggestion." Every downstream wave (W1–W5) authors specs against these definitions; freezing them in W0 is what makes the fields machine-checkable and not just prose convention.

## Constraints

- **Location:** SPEC-CONVENTION.md updated in place at `docs/SPEC-CONVENTION.md`; spec-linter package at `plugins/foreman-line/spec-linter/` — sibling to the frozen `plugins/foreman-line/contracts/`, `routing-policy/`, and `receipts/`, same foundation tier.
- **Stack:** TypeScript, Node >=22, ESM-only. Tests via `node --test` (`npx tsx --test`). Lint/format with `biome`.
- **Standing rule from the W0-P1 rework (binding on this parcel):** ajv's `JSONSchemaType` is banned as a schema authority anywhere in this repo; every schema is standard JSON Schema draft-07 typed as `SchemaObject`.
- **Runtime dependency allowlist:** exactly two runtime dependencies — `ajv` (validation engine) and `yaml` (YAML frontmatter parsing; the same package already in use in `routing-policy/`). A test MUST assert that `package.json`'s `dependencies` keys equal exactly `{ajv, yaml}` — machine-enforced per W0-P3 pattern.
- **v0.2 field definitions (frozen by this parcel):**
  - `risk: low | standard | elevated | critical` — **required**. Declared risk level, set at shaping, human-approved. Consumed by CI audit-trigger rules (W4-P3) and model-routing tier selection (W2-P3). Values per FOREMAN-LINE-PLAN.md §6.
  - `surfaces: [array of strings]` — **required, non-empty**. Repo-relative path or glob patterns describing the filesystem surfaces this parcel touches. Consumed by audit-trigger CI rules (W4-P3) and skill-injection matrix evaluation (W2-P5). At least one entry required. **Semi-controlled vocabulary (coordinator-ratified 2026-07-15):** SPEC-CONVENTION §4 defines a canonical set of known surface prefixes (`docs/`, `plugins/`, `skills/`, `apps/`, `config/`). A `surfaces:` entry that does not begin with any known prefix triggers a non-blocking advisory warning from the spec-linter (exit code remains 0). New prefixes join the vocabulary by adding a doc entry to SPEC-CONVENTION §4's surface vocabulary section — a PR-reviewable extension point that prevents silent proliferation without hard-blocking novel surfaces.
  - `routing_class: boilerplate | standard-feature | architecture/risk | implementation/standard` — **required**. Task-class key used by routing policy evaluation at dispatch (W2-P3). Enum is identical to the reconciled `classes` map keys in the frozen `routing-policy.yaml` (W0-P3); this parcel is the authoritative definition, W0-P3's policy file is the corroborating instantiation.
  - `permission_profile: <name>` — **optional until registry ships**. A name referencing a profile in a reviewed permission-profile registry. Never inline permission rules in the spec (a self-describing document must not be its own authority). The registry and dispatch-time emitter are a separate deferred parcel; this parcel defines the field, its allowed-value source, and its lint rule only. Lint behavior: if present, must be a non-empty string (whitespace-only rejected); if absent, the CLI emits a non-blocking advisory warning to stderr (exit code remains 0). The CLI exposes a `--no-permission-profile-warning` flag to suppress this advisory. The registry parcel will add the enum constraint as a non-breaking additive change.
- **Coordinator-ratified-amendment pattern:** formalized as a new section in SPEC-CONVENTION.md. Shape: the coordinator supplies exact replacement text; that text is committed ALONE in the parcel worktree, before any implementing code, with a commit message that explicitly identifies it as a coordinator amendment. Purpose: the amendment commit is the evidence the ruling did not evaporate as a verbal ruling. Commits 057136b, ff9f6d3, 28a0233, 5d530fb are referenced as worked examples. Placement in SPEC-CONVENTION is deliberate — agents loading SPEC-CONVENTION get the complete picture of spec governance without loading a separate document.
- **`additionalProperties: false` on frontmatter schema:** unknown frontmatter fields are rejected. The schema enumerates all twelve known fields (eight existing + four new v0.2). This means any new field introduced in a future parcel requires a schema update — that is the correct constraint; it prevents silent field sprawl.
- **No shared validator infrastructure with W0-P5:** the spec-linter stands alone. Whether future parcels share machinery with the skill-injection matrix validator (W0-P5) is a deliberate decision to make at W0-P5 shaping, informed by W0-P3's and W0-P4's shipped validators. This parcel does not build preemptively.
- **Frozen packages are untouchable:** `plugins/foreman-line/contracts/`, `plugins/foreman-line/routing-policy/`, and `plugins/foreman-line/receipts/` are out of bounds. The routing-policy.yaml `classes` map is the corroborating instance of the `routing_class:` enum — it is read as a reference only; this parcel does not modify it.
- **Cross-package import policy:** this package does NOT import from any sibling `plugins/foreman-line/*` package. The frontmatter schema is self-contained; it has no dependency on the contracts, routing-policy, or receipts packages.
- **Branch/worktree (defects_lessons #9):** builder works on branch `feat/foreman-line-W0-P2`, isolated in worktree `C:\Repos\foreman-line-W0-P2` — never directly in the main working tree. This line is verbatim in the dispatch kickstarter; it is not ambient knowledge.
- **Deterministic-pass environment (defects_lessons #10):** verification runs in PowerShell only. `node -v` is checked first, before any other command, and must report >=22. Repo root `package.json` `engines.node` requires `>=24.11.1`; this package's own `engines.node` is `>=22` per W0-P3/W0-P4 precedent.
- All source is `readonly`/immutable-shaped where applicable; the schema describes a spec's frontmatter shape, not mutable runtime state.

## Acceptance Criteria

1. **SPEC-CONVENTION.md §4 updated:** the frontmatter schema block includes all four v0.2 fields with inline documentation — their types, allowed values (or optionality semantics for `permission_profile:`), and required/optional status. The existing eight fields are unchanged. §4 also gains a `surfaces:` canonical vocabulary subsection that lists the initial known surface prefixes (`docs/`, `plugins/`, `skills/`, `apps/`, `config/`) and documents the extension mechanism: new prefixes are added to this subsection via PR, creating a reviewed extension point.

2. **SPEC-CONVENTION.md gains a new section (§11) — Coordinator-Ratified Amendment Pattern:** documents the shape (exact replacement text, alone-committed, identifiable commit message), states the purpose (amendment commit is the evidence), and references commits 057136b, ff9f6d3, 28a0233, 5d530fb as worked examples.

3. `npx tsc --noEmit` passes on the spec-linter package.

4. **Schema:** `schemas/spec-frontmatter.schema.json` (JSON Schema draft-07, `additionalProperties: false`) covers all twelve frontmatter fields. Required fields: `ticket`, `title`, `status`, `owner`, `created`, `updated`, `risk`, `surfaces`, `routing_class`. Optional fields: `supersedes`, `superseded_by`, `permission_profile`.

5. **Parity test:** the TypeScript type `SpecFrontmatter` and `spec-frontmatter.schema.json` agree, proven by a generated-agreement test (same pattern as W0-P3/W0-P4).

6. **Semantic-invariant test suites**, each with at least one passing fixture and one rejecting fixture:
   a. `risk:` outside `{low, standard, elevated, critical}` is rejected.
   b. `routing_class:` outside `{boilerplate, standard-feature, architecture/risk, implementation/standard}` is rejected.
   c. `surfaces:` empty array (`[]`) is rejected.
   d. `permission_profile:` present as an empty string or whitespace-only string is rejected.
   e. `status:` outside `{draft, active, done, superseded}` is rejected.
   f. (Semantic rule, not schema-structural) `status: superseded` with `superseded_by: null` is rejected by `validateSpecFrontmatter`.

7. **CLI `validate <path>` command:**
   - `<path>` may be a single spec `.md` file or a directory (`docs/specs/active/`, `docs/specs/done/`, or the parent `docs/specs/`); directory mode validates every `.md` file found recursively.
   - Exits `0` on all four shipped specs in `docs/specs/done/` — the linter must produce zero violations on the existing corpus, proving no false positives on real content.
   - Exits `1` with every violation listed on stderr (not just the first) against fixtures for each of AC6a–6f.
   - Exits `2` on a missing path, an unreadable file, and a directory containing no `.md` files.
   - Emits a non-blocking advisory warning to stderr (exit 0) when a validated spec has no `permission_profile:` field; a `--no-permission-profile-warning` flag fully suppresses this advisory with no other side-effects.
   - Emits a non-blocking advisory warning to stderr (exit 0) when a `surfaces:` entry does not begin with any known prefix from the SPEC-CONVENTION §4 vocabulary. W0-P3/W0-P4/PCC-P0 use standard prefixes and produce no such warnings; W0-P1 uses pre-v0.2 shorthand (`contracts/*`, `platform/correlation`) that predate the vocabulary and are expected to warn — this is informational, not a blocker.

8. `package.json`'s `dependencies` keys equal exactly `{ajv, yaml}`, enforced by a test reading `package.json`.

9. `biome check .` passes with zero diagnostics.

10. All tests pass via `npx tsx --test`; total test count ≥ 20.

11. `spec-linter/README.md` documents the schema shape, all four v0.2 fields (with their allowed values and optionality rules), the `permission_profile:` interim behaviour, the exit-code contract, and how to run the linter in ≤ 1 page.

## Out of Scope

- Implementing the permission-profile registry or any registry-lookup logic — the field is defined and the lint rule (non-empty string if present) is ship; enum validation is the deferred parcel's job.
- Adding CI workflow wiring (a GitHub Actions step that runs the spec-linter and blocks PRs) — the exit-code contract is documented and callable; wiring the workflow file is W4-P3, same deferral pattern as W0-P3 and W0-P4.
- Cross-validating a spec's `routing_class:` against the entries present in `routing-policy.yaml` — that is dispatch-time resolution (W2-P3), not static frontmatter schema validation.
- Cross-validating `surfaces:` values against actual repo paths — the field is a declaration, not a filesystem probe; CI diff-based audit-trigger rules (W4-P3) do the path-matching.
- Modifying SPEC-CONVENTION §1–§10 beyond §4's frontmatter block and the addition of §11.
- Modifying `plugins/foreman-line/contracts/`, `plugins/foreman-line/routing-policy/`, or `plugins/foreman-line/receipts/`.
- Shared validator infrastructure or any abstraction intended for W0-P5 to inherit — that decision is W0-P5 shaping's problem.
- Runtime consumption of `risk:` or `surfaces:` for audit-trigger evaluation or skill-injection matrix lookups (W4-P3, W2-P5).
- `INDEX.md` regeneration or spec-lifecycle tooling beyond the linter itself.
- Any modification to `skills/parcel-compiler/tool/` in either direction.
- Smart Triage / assignment logic (W5).
- CODEOWNERS rules or branch-protection configuration guarding `docs/SPEC-CONVENTION.md` from deletion — noted as a future repository governance item (raised 2026-07-15); out of scope for this parcel.

## Context & References

- `docs/FOREMAN-LINE-PLAN.md` — §2 Stage A.2 (this parcel's direct mandate: "v0.2 schema fields: `risk:` and `surfaces:`"), §3 D5 (declared+derived audit triggers rely on `risk:`/`surfaces:`, the "never somehow" principle), §6 (audit-trigger semantics that consume `risk:` and `surfaces:` at CI time, the declared-vs-derived mismatch flag), §8 W0-P2 one-liner.
- `docs/SPEC-CONVENTION.md` — §4 (frontmatter schema this parcel extends), §7 (lint requirement "a convention without a validator is a suggestion" — load-bearing for scoping this parcel).
- `docs/specs/done/W0-P1-pipeline-stage-contracts.md` — precedent frontmatter carrying all three initial v0.2 fields; dual-representation (type + schema + parity test) pattern followed here.
- `docs/specs/done/W0-P3-routing-policy-schema-validator.md` — authoritative source for the reconciled `routing_class:` enum (all four values); `JSONSchemaType`-ban constraint; machine-enforced dependency-allowlist test pattern; per-invariant passing+rejecting fixture pattern; exit-code contract style.
- `docs/specs/done/W0-P4-receipt-chain-schema-validator.md` — precedent for `additionalProperties: false` + semantic invariant tests; PowerShell pipeline exit-code lesson (defects_lessons #11) carried into Verification Plan.
- `docs/specs/done/PCC-P0-pcc-cli-scaffold.md` — source of `implementation/standard` routing_class value (the fourth reconciled enum entry); exit-code contract style reference.
- `docs/transcripts/defects_lessons.md` — #9 (name the branch/worktree in the spec, not ambient knowledge), #10 (PowerShell + `node -v` first, standing rule), #11 (never truncate a pipeline whose exit code you are about to trust).
- Commits 057136b, ff9f6d3, 28a0233, 5d530fb — worked examples of the coordinator-ratified-amendment pattern this parcel formalizes.

## Verification Plan

Deterministic: `tsc --noEmit`, parity test (AC5), schema-structural rejection tests (AC6a–6e), semantic-invariant test (AC6f), CLI exit-code tests against all fixtures and the live corpus (AC7), dependency-allowlist test (AC8), `biome check`, test-count threshold (AC10). Deterministic pass runs in PowerShell on the coordinator's machine; `node -v` is the first command run before anything else (defects_lessons #10). CLI exit-code tests capture output in full before reading `$LASTEXITCODE` — never truncate a pipeline whose exit code is under test (defects_lessons #11).

Adversarial review mandated focus questions:

1. **`routing_class:` enum exhaustiveness:** is the four-value enum (`boilerplate`, `standard-feature`, `architecture/risk`, `implementation/standard`) actually exhaustive given FOREMAN-LINE-PLAN.md §5's task-class taxonomy — or does the plan's prose imply a fifth class (e.g., a security-audit-flavored task class) that this enum silently excludes? Grep the plan, routing-policy.yaml, and all specs for any routing_class value not in this set before declaring the enum frozen.

2. **Amendment-pattern circularity:** the coordinator-ratified-amendment pattern is itself introduced via an amendment (the kickstarter's "Clint-ratified amendment" directive). Is the §11 definition circular — can a reader understand what the pattern requires without already knowing how to invoke it? Specifically: does §11 state clearly enough that the amendment commit precedes implementing code in the same worktree, that the commit stands alone (no other file changes), and that the commit message must identify it as an amendment (not just be a conventional commit)? If any of those three properties is ambiguous or implied rather than stated, that is a defect.

3. **`permission_profile:` warning correctness:** does the linter's "if absent, emit advisory warning (exit 0)" rule behave correctly in all cases? Specifically: (a) a spec with no `permission_profile:` key at all must exit 0 AND emit exactly one advisory warning to stderr; (b) a spec with `permission_profile: null` (YAML null literal, distinct from key-absent) must be rejected with exit 1 as not a non-empty string; (c) `--no-permission-profile-warning` must fully suppress the advisory warning with no other side effects; (d) confirm the schema's `anyOf`/`type` handling does not silently pass `null` for this field. Confirm all four cases have fixtures.

4. **False-positive hunt on live corpus:** AC7 requires zero violations on all four shipped `docs/specs/done/` specs. Verify this claim by reading each spec's frontmatter against the schema manually — not just trusting the test. In particular: confirm the `supersedes` and `superseded_by` fields in every spec are handled correctly (PCC-P0 carries `supersedes: PR-0 (sandbox directive; ...)`  — a non-null string — and `superseded_by: null`; the schema must accept this without `additionalProperties` rejecting the string value in `supersedes`).

5. **`routing_class:` definition vs. W0-P3 corroboration:** this spec declares W0-P2 as the "authoritative definition" of the `routing_class:` enum and W0-P3's routing-policy.yaml as the "corroborating instantiation." Confirm the four keys in routing-policy.yaml's `classes` map match this spec's enum exactly — by reading `plugins/foreman-line/routing-policy/routing-policy.yaml` from disk, not from W0-P3's spec's description of it. If there is a mismatch, that is a defect in this spec, not a defect to defer.

6. **`surfaces:` vocabulary coverage on live corpus:** read the `surfaces:` frontmatter of every spec in `docs/specs/done/` from disk. The no-schema-violation requirement (exit 0 from AC7) must hold for all four. Advisory warnings are separate: W0-P3/W0-P4/PCC-P0 should produce no vocabulary warnings (their surfaces begin with known prefixes); W0-P1 (`contracts/*`, `platform/correlation`) was written pre-v0.2 and is expected to produce advisory warnings — report these in the deterministic pass transcript as informational, not a blocker. If W0-P3/W0-P4/PCC-P0 unexpectedly produce vocabulary warnings, that indicates a gap in the vocabulary definition and must be fixed before dispatch.
