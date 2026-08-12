---
name: nss-lifecycle
description: "Cycle-15 deep-research synthesis for the NSS Lifecycle axis (axis 8/12 in negative-skill-space). For each file in a corpus, the Lifecycle axis identifies HOW THE FILE EVOLVES: versioning (SemVer 2.0.0 MAJOR.MINOR.PATCH), changelog (Keep-a-Changelog 1.1.0 Added/Changed/Deprecated/Removed/Fixed/Security), deprecation state (RFC 8594 Sunset header, RFC 9745 Deprecation header, planned removal in version X.Y.Z), migration guide presence (codemod, upgrade-helper, manual steps, validation), conventional-commit compatibility, release-drafter/automated changelog parsing, feature-flag lifecycle (temporary/permanent + expiry + archive), SBOM/versioned-evidence lifecycle (2026 CISA minimum elements), ADR-driven lifecycle decisions (Context/Decision/Status/Supersedes), and the negative states (Removed, Archived, Cancelled, Unknown). Use when the NSS 12-axis sweep lands on lifecycle as the highest-priority Extend gap, when a file lacks a Changelog section, when versioning is documented but lifecycle state machine is missing, when deprecation is announced without a Removal-in-version target, when a flag never reaches cleanup, when migration prose has no codemod/upgrade-helper, when a `Deprecated` entry has no replacement, when an SBOM is treated as a one-time compliance attachment rather than a versioned evidence artifact, when Sunset is confused with Deprecation, or when an ADR is orphaned from affected files. Triggers on: NSS lifecycle axis, changelog gap, SemVer lifecycle, keep-a-changelog 1.1.0, deprecation state, removal-in-version, sunset policy, migration guide, codemod, conventional commits lifecycle, feature flag cleanup, SBOM retention, ADR-driven deprecation, lifecycle stage transitions, experimental/beta/stable/deprecated/removed/archived. NOT for inputs (use nss-inputs), outputs (use nss-outputs), audience (use nss-audience), mode (use nss-mode), or any of the other 11 NSS axes."
---

# nss-lifecycle

The **Lifecycle** axis (8/12 of `negative-skill-space`) asks: **how does this
file evolve, and what is the state machine + obligations between releases?**

A version number answers "which release and which compatibility increment?"
A lifecycle block answers "where is this artifact in its state machine, what
transition is next, what must users do, and who owns the evidence?" The two
are orthogonal: several lifecycle stages can coexist inside one SemVer major
line, a beta API may change under a minor version while a stable API cannot,
deprecation is a period (not a point release), and a feature flag can be
removed without a package-version change.

The cycle-15 NSS-lifecycle sweep applies this rubric to ~40 files in the
yubiOS corpus, where each file gets ONE lifecycle-aware section added per
lens-format patch (`## Lifecycle -- cycle 15`).

## What Lifecycle covers

For every file, the Lifecycle axis records the *complete surface* a
maintainer, operator, contributor, or auditor needs to plan a release,
deprecate an API, retire a flag, or migrate consumers. The eleven channels
and their distinctions:

| Channel | Examples |
|---|---|
| **Identity** | file name, owner, scope (file/symbol/endpoint/flag), public API surface |
| **Lifecycle stage** | experimental, beta, stable, deprecated, removed, archived, cancelled, unknown |
| **Versioning rule** | semver-2.0.0, calver, epochs, none -- declares the compatibility increment rule |
| **Changelog entry** | keep-a-changelog 1.1.0 category (Added/Changed/Deprecated/Removed/Fixed/Security), conventional-commit type (feat/fix/chore/refactor/perf/test/docs) |
| **Deprecation record** | deprecated_since, reason, replacement, removal_version, sunset_at (RFC 8594), notice_period |
| **Migration guide** | replacement symbol/endpoint, codemod availability, upgrade-helper, manual steps, validation |
| **Removal target** | Removal in version X.Y.Z, removal date, archive path, decommissioning procedure |
| **Feature flag** | key, stage (temporary/permanent), environments, rollout state, expiry, removal PR, archive date |
| **SBOM evidence** | artifact digest, format (SPDX/CycloneDX), generation phase, tool/version, VEX status, retention policy |
| **ADR linkage** | ADR number, decision status, supersedes, owner, implementation evidence |
| **Review cadence** | next_review, owner, fresh-evidence requirement, as_of timestamp |

For each lifecycle field, document:

| Field | What to record |
|---|---|
| `name` | Canonical artifact name; aliases (former names, file-id, scope) |
| `stage` | One of the lifecycle-stage vocabulary; `unknown` is permitted |
| `stage_since` | Effective date (YYYY-MM-DD) of the current stage |
| `current_version` | Version coordinate under the declared versioning rule |
| `versioning` | semver-2.0.0 / calver / epochs / none |
| `introduced_in` | Version where the file/symbol/endpoint first appeared |
| `last_changed_in` | Version of the most recent functional change |
| `deprecated_in` | Version when deprecated (null if not deprecated) |
| `removed_in` | Version when removed (null if still present) |
| `deprecation` | deprecated + deprecated_since + reason + replacement + removal_version + sunset_at + notice_period |
| `migration` | guide + codemod + upgrade_helper + manual_steps + validation |
| `changelog_category` | keep-a-changelog category; conventional-commit type |
| `release` | release_notes + introduced_in + last_changed_in + superseded_by |
| `flag` | feature_flag key + stage + environments + expiry + removal_pr + archive_date |
| `sbom` | sbom format + sbom_generated_at + artifact_digest + vex_status + retention_policy |
| `adr` | adr number + decision_status + supersedes + owner |
| `owner` | team or person accountable for transitions |
| `evidence` | URLs / SBOM paths / ADR refs / test refs |
| `review` | next_review + owner + fresh_evidence_required |

A useful rule: **version is an event or coordinate; lifecycle is the state
machine and the obligations between events.** `2.4.0` tells a consumer which
release they have. It does not tell them whether an API is experimental,
whether it is still supported, when it will be removed, how to migrate,
whether a feature flag can be deleted, or which SBOM describes the deployed
artifact. The lifecycle block is the layer where those obligations live.

## Lifecycle and the yubiOS surface

Every yubiOS file has a Lifecycle surface; declaring it is the single
highest-leverage move for each NSS-lifecycle Extend gap.

### Markdown / SKILL.md / docs/*.md

- `## Changelog` section in keep-a-changelog 1.1.0 categories
  (Added/Changed/Deprecated/Removed/Fixed/Security); an `Unreleased`
  block for in-flight changes.
- Frontmatter `stage: stable` or `stage: beta` or `stage: experimental`
  (one of the vocabulary; `unknown` permitted with a `since:` date).
- `introduced_in` and `last_changed_in` populated when meaningful.
- Conventional-commit types in commit messages (`feat:`, `fix:`,
  `chore:`, `refactor:`, `perf:`, `test:`, `docs:`,
  `BREAKING CHANGE:` / `!:`).
- ADR links for any breaking change (Nygard format: Context, Decision,
  Status, Consequences, Supersedes).

### Containerfile / mkosi / systemd unit

- Image labels carry provenance: `io.yubios.commit=<sha>`,
  `io.yubios.build-ts=<rfc3339>`, `io.yubios.source-date-epoch=<unix-ts>`.
- Reproducibility claim (reproducible_build / byte_identical /
  logical / none) declared in a `## Lifecycle` block.
- `LABEL` deprecation marker (`io.yubios.stage=<stage>`,
  `io.yubios.deprecated-since=<date>`, `io.yubios.removal-version=<X.Y.Z>`).
- Drop-in deprecation: a deprecated unit's `ExecStart=` becomes
  `ExecStart=-/usr/bin/echo DEPRECATED: ... ; /usr/bin/old-binary` so the
  old path still works but logs the migration signal.
- SBOM generation phase declared: `before build`, `build`,
  `after build`; format (SPDX 2.3 / CycloneDX 1.5); tool/version;
  retention policy (`builds/`, `releases/`, `archive/`).

### Shell / Python / Ruby scripts

- Top-of-file `## Lifecycle` block with: stage, introduced_in,
  last_changed_in, conventional-commit compatibility, exit-code semantics
  on stage transitions.
- `set -euo pipefail` declared; exit code 2 on `Deprecated: stage`
  (with a single-line migration message to stderr); exit code 3 on
  `Cancelled: stage` (script refuses to run, prints replacement command).
- Codemod / upgrade-helper pointer in the migration field when a
  signature or flag set changes between minors.

### GitHub Actions workflows

- `workflow_call.outputs.<name>` declared when consumers depend on it;
  output includes `current_stage`, `last_changed_in`, and `next_review`.
- `permissions:` block declared at workflow level; never widened by a
  `feat:` commit without an ADR.
- `concurrency:` group declared with `cancel-in-progress: true` so a
  re-trigger cancels the prior lifecycle-stage transition.
- Release-drafter classification (`.github/release-drafter.yml`) maps
  `feat` → MINOR, `fix` → PATCH, `BREAKING CHANGE` / `!` → MAJOR;
  a workflow's deprecation lands as a `Deprecated` changelog category
  with an ADR link.

### Refs/notes (`refs/*.md`)

- Frontmatter `stage:`, `stage_since:`, `introduced_in:`,
  `last_changed_in:`, `supersedes:`, `superseded_by:`, `owner:`,
  `next_review:`.
- Trailing `## Changelog` block in keep-a-changelog 1.1.0 format.
- ADR-linkage explicit: every Note carries an `ADR-NNN` ref when it
  drives a lifecycle decision; ADR carries the Note back-link in its
  `## Note back-links` section.

## State machine (the lifecycle stages)

```
experimental ──► beta ──► stable ──► deprecated ──► removed ──► archived
       │           │         │             │             │
       └───────────┴─────────┴─────────────┴─────────────┴────► cancelled (never shipped)
```

Each transition needs:

- **Entry criterion** -- what makes the artifact eligible for the new stage.
- **Exit criterion** -- what triggers the next transition.
- **Compatibility promise** -- what the artifact guarantees during this stage.
- **Owner + ADR + evidence** -- who decides, which ADR records the decision, which tests/SBOMs prove it.
- **Review date** -- when the next transition decision is owed.

Stage semantics (yubiOS convention; align with Google's API versioning and Square's lifecycle policy):

| Stage | Compatibility | Notice for transition | Removal eligibility |
|---|---|---|---|
| experimental | may break in any release | none required | immediate on cancellation |
| beta | may break in any MINOR | one release with `Deprecated` marker | after one `Stable` cycle, with ADR |
| stable | breaks only at MAJOR | one MAJOR of `Deprecated` first | requires ADR + Migration + Codemod |
| deprecated | still operational; new uses discouraged | per `notice_period` (default 180 days) | after notice + replacement reached `stable` |
| removed | not present in code | n/a (gone) | archived for reproducibility |
| archived | historical only; not maintained | n/a | n/a |

The state machine is a yubiOS convention; align to upstream when
interfacing with external ecosystems (Kubernetes deprecation policy uses
9-month notice, Google APIs use 180 days, Square uses ≥12 months before
retirement + ≥6 months maintenance after GA replacement).

## Standards the section encodes

### 1. SemVer is the compatibility rule, not the lifecycle model

SemVer 2.0.0 requires a declared, precise public API and uses
`MAJOR.MINOR.PATCH`: MAJOR for backward-incompatible public-API changes,
MINOR for backward-compatible functionality, PATCH for
backward-compatible bug fixes. A public API deprecation itself requires a
MINOR release; removal normally belongs in a later MAJOR release. Released
versions must not be modified in place.

The lifecycle block records **both** `introduced_in`,
`deprecated_in`, `removed_in`, `current_version` **and** the reason and
user action associated with each transition. A version number cannot
express "stable but deprecated for six months," "beta may break in a
minor release," or "removed from code but retained in the archived
documentation."

### 2. Keep a Changelog is the reader-facing projection

Keep a Changelog 1.1.0 defines `Added`, `Changed`, `Deprecated`,
`Removed`, `Fixed`, and `Security`, with an `Unreleased` section and
chronological releases. It explicitly recommends announcing a deprecation
before removal and naming the version in which removal will occur.

A good entry identifies the affected surface, user-visible effect,
reason, replacement, first affected version, planned removal version/date,
and migration path. "Deprecated old API" is not a good entry because it
does not enable planning or action.

`Security` is used when the change addresses a vulnerability, even if
technically it is also a `Fixed` or `Changed` item, because its urgency
and audience differ.

### 3. Conventional Commits provide automation signals, not complete truth

Conventional Commits 1.0.0 maps `fix` to PATCH, `feat` to MINOR, and
`BREAKING CHANGE` or `!` to MAJOR. It permits `chore`, `refactor`,
`perf`, `test`, `docs`, but those types do not inherently imply a
SemVer increment.

| Commit type | Typical lifecycle meaning | Default release effect |
|---|---|---|
| `feat` | Added capability or new API | MINOR |
| `fix` | Corrected behavior | PATCH |
| `chore` | Maintenance/tooling; verify lifecycle review | none / PATCH if user-visible |
| `refactor` | Internal restructuring; verify public compatibility | none / PATCH |
| `perf` | Performance behavior change | PATCH or MINOR |
| `test` | Test-only change | none |
| `docs` | Documentation including migration/deprecation notices | none, but may be lifecycle-critical |
| `BREAKING CHANGE` / `!` | Incompatible public change | MAJOR |

A `docs:` commit can be the event that makes a deprecation
discoverable, while the lifecycle state remains `deprecated` until
removal. A `chore:` can delete an old flag or API and therefore require
a lifecycle review despite its low-information commit type.

Release Drafter can classify changes by labels, paths, and
conventional-commit predicates, and separately resolve a SemVer
increment. That is useful automation, but it should consume explicit
lifecycle metadata rather than infer every lifecycle fact from a title.

### 4. RFC 8594 / RFC 9745 headers -- the HTTP-API case

For HTTP endpoints, **RFC 8594 defines `Sunset`, not the `Deprecation`
header.** `Sunset` indicates that a URI is likely to become unresponsive
at a future point and is only a hint; it does not itself mean "no longer
recommended." **RFC 9745** defines the `Deprecation` response header and
the `deprecation` link relation. It distinguishes "deprecated but still
operational" from "expected to become unavailable." When both are
present, Sunset must not precede the deprecation date.

A correct API response:

```http
Deprecation: @<effective-unix-timestamp>
Sunset: <HTTP-date>
Link: <https://example.com/migrations/old-api>; rel="deprecation"
```

The headers are signals, not a substitute for an API specification,
changelog, migration guide, customer communication, usage telemetry,
or owner approval. Record all of those in the file's lifecycle block.

A six-month / 180-day graceful deprecation period is a reasonable
default for many stable APIs, but it is a **policy choice**, not a
universal RFC requirement. Google recommends 180 days for beta API
functionality; Square commonly gives at least 12 months before
retirement and describes a maintenance period of at least six months
after a replacement reaches GA.

### 5. Feature flags need their own lifecycle

A flag is not "done" when the feature reaches 100%; it is done when
the temporary decision mechanism has been removed or deliberately
converted into a permanent control. LaunchDarkly distinguishes Live,
Ready for code removal, Ready to archive, Deprecated, Archived, and
Deleted, with environment-specific status and safeguards around
prerequisites and code references.

Per-flag coverage should include: purpose, owner, temporary/permanent
classification, creation date, intended expiry, environments,
variations, prerequisites, rollout state, code references, removal PR,
archive date, and fallback behavior. OpenFeature reinforces that
provider state transitions such as ready, error, stale, reconciling,
and context change should be observable events rather than silently
inferred state.

### 6. SBOM lifecycle coverage

Treat an SBOM as a versioned evidence artifact tied to a specific
source/build/package/deployment, not as a one-time compliance
attachment. The current 2026 CISA-led minimum-elements document calls
for metadata such as author/signature, format name/version, generation
context, timestamp, tool/version, SBOM version, component identifiers,
dependency relationships, hashes, licenses, and component versions. It
also says each software version or update should have an associated
SBOM and that revised component information requires a revised SBOM.

Per release/file coverage captures: source revision and artifact
digest; SBOM format and schema version; generation phase (`before
build`, `build`, or `after build`); tool and generator version; direct
and transitive dependency coverage; signature/provenance; VEX/advisory
relationships and remediation status; superseded SBOMs; and
retention/decommissioning policy.

This matters because an old SBOM may remain essential for
investigating a historical compromise even after the software is no
longer deployed. CISA/NTIA guidance recommends correlating SBOM
retention with software lifecycle and generally favors archival
retention when decommissioning cannot be positively verified.

### 7. ADR-driven lifecycle decisions

Use an ADR for decisions that affect public interfaces, compatibility
promises, deprecation windows, replacement selection, flag permanence,
support policy, or supply-chain evidence. A good ADR records **Context,
Decision, Alternatives/trade-offs, Consequences, Owner, Status, Date,
and Links to implementation/migration evidence**. Accepted ADRs are
immutable; a changed decision creates a new ADR that supersedes the
old one.

The file-level lifecycle block links to the ADR, while the ADR should
explain *why* the transition exists. This prevents a changelog from
becoming the only, usually too-short, record of a sunset decision.

## Examples

### Example 1 -- Markdown / SKILL.md Lifecycle block

```markdown
---
stage: stable
introduced_in: 1.0.0
last_changed_in: 1.4.2
owner: platform-team
next_review: 2026-11-12
---

## Lifecycle -- cycle 15

**Stage**: stable (since 2026-02-14, introduced_in 1.0.0).
**Versioning rule**: semver-2.0.0.
**Compatibility promise**: this SKILL.md's frontmatter keys and
section heading names are part of the public contract; PATCH versions
may add `##` sections without notice, MINOR versions may rename a
section only with the prior MINOR marked `Deprecated`, MAJOR versions
may reorganize the section layout with a one-MINOR `Deprecated` notice.
**Changelog category**: `Changed` (when adding a section without
renaming), `Deprecated` (when renaming a section), `Removed` (when
deleting a section without renaming first).
**Deprecation record**: not deprecated. Replacement: n/a.
Removal-in-version: not planned.
**Migration guide**: none required at the current stage; the
`naming-conventions.md` doc covers the cross-skill section-name rules.
**Conventional-commit compatibility**: `docs:` for section adds,
`feat!:` or `feat:` + `BREAKING CHANGE` footer for section renames.
**Review cadence**: next_review 2026-11-12; refresh evidence when
NSS sweep lands lifecycle as the top gap again.
```

### Example 2 -- Containerfile Lifecycle block

```dockerfile
# Lifecycle -- cycle 15
#   stage: stable
#   introduced_in: 1.0.0
#   last_changed_in: 1.4.2
#   versioning: semver-2.0.0
#   changelog_category: Changed
#   deprecation: not deprecated
#   removal-in-version: not planned
#   sbom_format: SPDX-2.3
#   sbom_generated_at: 2026-08-12T17:21:36Z
#   artifact_digest: sha256:c965a816b9173cf6f227e6b5b09e321e841ab5f8a49075c112657a0a40b5e761
#   reproducibility: reproducible_build (when SOURCE_DATE_EPOCH pinned)
#   image_labels:
#     io.yubios.commit=ee62285834e6b1a26e11858273084686cb862702
#     io.yubios.build-ts=2026-08-12T17:21:36Z
#     io.yubios.source-date-epoch=1755009696
#     io.yubios.stage=stable
#   review_cadence: every main build (no manual next_review)
```

### Example 3 -- Shell script Lifecycle block (deprecation with codemod)

```bash
#!/usr/bin/env bash
# Lifecycle -- cycle 15
#   stage: deprecated
#   introduced_in: 0.9.0
#   last_changed_in: 1.4.0
#   deprecated_in: 1.5.0
#   deprecated_since: 2026-08-12
#   reason: replaced by `yubios-validate-v2`; old signature is a
#           frequent source of `set -u` failures on empty arrays.
#   replacement: yubios-validate-v2 (introduced_in 1.5.0, stable)
#   removal_in_version: 2.0.0
#   sunset_at: 2027-02-12 (180-day notice_period)
#   notice_period: 180 days
#   migration:
#     codemod: npx @yubios/codemod legacy-validate-to-v2
#     upgrade_helper: none
#     manual_steps:
#       1. replace `yubios-validate --foo=X` with `yubios-validate-v2 --foo=X`
#       2. replace `yubios-validate --bar` with `yubios-validate-v2 --bar=1`
#     validation: ./scripts/ci_test-vm.sh group=smoke
#   changelog_category: Deprecated
#   conventional_commit: feat!: deprecate legacy-validate
```

### Example 4 -- GitHub Actions Lifecycle block

```yaml
# Lifecycle -- cycle 15
#   stage: stable
#   introduced_in: 0.9.0
#   last_changed_in: 1.4.2
#   versioning: semver-2.0.0 (workflow_call inputs/outputs follow MAJOR.MINOR)
#   deprecation: not deprecated
#   permissions:
#     contents: read  # declared at workflow level; never widened by feat: commits
#   concurrency:
#     group: ci-${{ github.ref }}
#     cancel-in-progress: true  # re-trigger cancels prior stage transition
#   release_drafter: maps feat:→MINOR, fix:→PATCH, !:→MAJOR
#   outputs:
#     current_stage: workflow stage label (stable|beta|deprecated)
#     last_changed_in: workflow's last_changed_in coordinate
#     next_review: ISO 8601 timestamp of the next_review date
#   review_cadence: next_review 2026-11-12
```

### Example 5 -- Refs/note Lifecycle block

```markdown
---
stage: stable
introduced_in: 0.9.0
last_changed_in: 1.4.2
supersedes: refs/curve-compass-lifecycle-2026-07-29.md
superseded_by: null
owner: rsi-phi-skill-team
next_review: 2026-11-12
adr: ADR-031
decision_status: accepted
---

## Lifecycle -- cycle 15

**Stage**: stable (since 2026-08-12).
**Introduced_in**: 0.9.0 (initial research note); **Last_changed_in**:
1.4.2 (cycle-15 patch).
**Supersedes**: `refs/curve-compass-lifecycle-2026-07-29.md` (the prior
note this revision replaced).
**Superseded_by**: null (this is the current canonical note).
**ADR**: ADR-031 (PCI-mediation trust boundary; this note is the
implementation evidence).
**Review cadence**: next_review 2026-11-12.
**Changelog category**: `Changed` (note body extended; ADR-linkage
preserved; `## Changelog` block updated).

## Changelog

- 2026-08-12 -- **Changed** -- cycle-15 NSS-lifecycle patch added
  `## Lifecycle -- cycle 15` section; frontmatter `stage:`,
  `next_review:`, `owner:`, `adr:` populated; `## Changelog` block
  initialized.
- 2026-07-29 -- **Added** -- initial research note under
  `refs/curve-compass-lifecycle-2026-07-29.md`.
```

### Example 6 -- Feature-flag Lifecycle block

```yaml
# Lifecycle -- cycle 15
#   flag_key: yubios.experimental.vgpu-passthrough
#   stage: deprecated  # temporary → permanent after Stage 1 launch
#   introduced_in: 1.2.0
#   last_changed_in: 1.4.2
#   deprecated_in: 1.5.0
#   deprecation:
#     reason: superseded by ADR-031 hardware-enforced IOMMU gate.
#     replacement: ADR-031 trust boundary (no flag needed).
#     removal_in_version: 2.0.0
#     sunset_at: 2027-02-12
#   code_references:
#     - usr/lib/systemd/yubiOS-enroll.service
#     - tests/vm/test-vgpu-virtio-ci.sh
#   removal_pr: null  # pending after Stage 1 GA
#   archive_date: null  # set when removal_pr merges
#   environments: [dev, ci]  # NOT in production
#   variations: off (default) | on (Stage 1 dev only)
```

### Example 7 -- SBOM Lifecycle block

```yaml
# Lifecycle -- cycle 15
#   artifact: yubios-oci-image
#   artifact_digest: sha256:c965a816b9173cf6f227e6b5b09e321e841ab5f8a49075c112657a0a40b5e761
#   sbom_format: SPDX-2.3
#   sbom_generated_at: 2026-08-12T17:21:36Z
#   generation_phase: build
#   tool: syft 1.6.0
#   vex_status: no_known_vulnerabilities  # green-main baseline
#   retention_policy: archive_after_removal  # CISA 2026 minimum-elements
#   superseded_sboms:
#     - sha256:6a60ff82...:2026-08-05:replaced-by-current
#   review_cadence: per build (CI re-emits SBOM on every main build)
```

## Guidelines

1. **Version is an event; lifecycle is the state machine.** Both go in
   the same `## Lifecycle -- cycle 15` block, but the block's *primary*
   job is to surface stage + transition obligations, not the version
   coordinate alone.
2. **Stage transitions need entry + exit criteria + ADR.** A bare
   `stage: deprecated` with no `removal_in_version` and no ADR is a
   partial block; close it with the missing fields.
3. **Keep a Changelog entries name the affected surface.** "Deprecated
   old API" is not an entry; identify the symbol/endpoint/flag,
   reason, replacement, removal-in-version.
4. **Conventional Commits type aligns with the changelog category.**
   `feat:` → `Added`; `fix:` → `Fixed`; `chore:` → usually no entry
   unless it affects lifecycle; `BREAKING CHANGE` → `Changed` or
   `Removed` (depending on what was changed).
5. **Sunset is not Deprecation.** RFC 8594 vs RFC 9745. Sunset is a
   hint; Deprecation is the operational signal.
6. **Removal-in-version is required for any deprecation.** A
   `Deprecated` entry without `removal_in_version` is incomplete.
7. **Migration guide lives next to the changelog entry.** Codemod or
   upgrade-helper pointer + manual steps + validation procedure.
8. **Feature-flag lifecycle ends at `removed` or `archived`** -- not
   "Live forever."
9. **SBOMs are versioned evidence, not compliance attachments.** Per
   2026 CISA minimum elements; per-build generation + retention
   policy declared.
10. **ADRs link back from affected files.** A `Deprecated` changelog
    entry without an ADR is unauditable.
11. **Negative states are first-class.** `Removed`, `Archived`,
    `Cancelled`, `Superseded` are valid `stage` values; do not
    collapse them to "doesn't exist anymore."
12. **Review cadence is named.** `next_review: 2026-11-12` (or
    "every main build" / "weekly Sunday sweep") -- pick one and stick
    to it.
13. **Lens-format patches only (cycle 15).** Each file patch is a
    lens with hypothesis + method + parameters + delta + verdict +
    score + caveat. No templated `## Lifecycle` sections.
14. **Close the NSS-lifecycle Extend gap with one section per file.**
    The atomic cycle-15 patch for any file with an NSS-lifecycle gap
    is ONE `## Lifecycle -- cycle 15` section, file-type-aware
    comment syntax, with the eleven-field table or its file-type
    equivalent.

## Constraints

- **Self-contained.** This skill does not depend on
  `negative-skill-space` being loaded; it composes *with* NSS as a
  follow-up action (NSS proposes the gap, nss-lifecycle closes it).
- **No runtime.** This is a documentation skill. It does not run
  `git tag`, `release-drafter`, or `syft`.
- **Schema is for humans first.** The Lifecycle section a cycle-15
  patch adds is read by humans (and by the next RSI cycle's NSS
  sweep) before it is consumed by any parser. Clarity > strict YAML.
- **One section per file.** Do not stack multiple `## Lifecycle`
  blocks in one file; do not nest Lifecycle inside another section
  heading.
- **Stage vocabulary is fixed.** experimental / beta / stable /
  deprecated / removed / archived / cancelled / unknown. A new
  stage needs a new skill, not a new label.
- **Conventional-commit types are fixed.** feat / fix / chore /
  refactor / perf / test / docs / BREAKING CHANGE. Custom commit
  types need a new skill.
- **Keep-a-changelog categories are fixed.** Added / Changed /
  Deprecated / Removed / Fixed / Security. Custom categories need
  a new skill.
- **Pair with `negative-skill-space`.** This skill is the
  Lifecycle-axis specialist; the parent NSS skill orchestrates the
  12-axis sweep and the action taxonomy (Extend / Pair / Accept).

## Anti-patterns

- **Lifecycle without a stage.** "This file evolves" without saying
  which of the eight stages it's in *is worse* than no block.
- **Deprecated without replacement.** A `Deprecated` block that
  names no successor leaves consumers stranded.
- **Deprecation without removal-in-version.** A deprecated artifact
  with no `removal_in_version` field stays in limbo.
- **Sunset as a Deprecation substitute.** RFC 8594 Sunset is a
  hint, not the operational signal; RFC 9745 Deprecation is.
- **Conventional-commit without a changelog entry.** A `feat:`
  commit without a corresponding keep-a-changelog `Added` entry
  breaks the audit trail.
- **`chore:` that quietly removes a public API.** A chore commit
  that retires a flag or removes an endpoint is lifecycle-critical,
  even though the type signals "no release effect."
- **Version-only record.** A lifecycle block that lists only the
  current version and not the state machine is missing 9 of the 11
  fields.
- **Feature flag that never reaches `removed`.** A flag is not
  "done" when the feature is at 100%; it is done when the
  decision-mechanism is removed.
- **SBOM as a compliance attachment.** Per 2026 CISA minimum
  elements, an SBOM is a versioned evidence artifact tied to a
  specific source/build/package/deployment, with retention policy.
- **ADR orphaned from affected files.** A `Deprecated` changelog
  entry without an ADR link is unauditable; an ADR without a back-
  link from the affected file is hidden.
- **Negative states collapsed.** A file that's been removed but
  stays in the docs as "deprecated" misleads consumers about
  whether they can rely on it.
- **An Lifecycle section that does not name the file's own
  fields.** A cycle-15 patch that adds `## Lifecycle` to
  `Containerfile` but does not list the image label, the digest,
  the SBOM, etc. is a placeholder patch and counts as a NO verdict,
  not a YES.

## Red flags

| Observation | What it means |
|---|---|
| `## Lifecycle` section lists zero concrete fields | the section is a placeholder |
| A file declares `stage: stable` but no `next_review` | review cadence missing |
| A `Deprecated` entry has no `removal_in_version` | removal plan missing |
| A `Removed` entry has no earlier `Deprecated` entry with prior notice | removal was unannounced |
| Sunset appears before Deprecation date | RFC 8594 vs RFC 9745 ordering violated |
| Conventional-commit type does not match the changelog category | automation signal vs reader-facing projection misaligned |
| Feature flag is "Live" for >12 months with no expiry date | flag debt accumulating |
| SBOM has no `retention_policy` field | SBOM treated as compliance attachment, not evidence artifact |
| `Removed` entry without a `superseded_by` link | archive path unknown |
| Lifecycle block is identical across 40+ files | templated, not inspected -- likely wrong for at least one |
| A `## Lifecycle -- cycle 15` patch lands but the next NSS sweep still flags lifecycle as the top gap | the patch did not close the gap |
| Stage transition without an ADR | decision unauditable |

## Composition

| Skill | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `lifecycle` as a candidate Extend gap; nss-lifecycle is the closure skill for that one axis. Pair the two in every cycle. | negative-skill-space -> nss-lifecycle |
| `curve-compass-skill` | Lens-format patches in cycle-15 use nss-lifecycle as the lifecycle-axis lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the Lifecycle section this skill defines. | nss-lifecycle -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-15 sweep operates over is the same `lens --corpus` JSON; the corpus's `lifecycle` column maps to this skill's eleven-field taxonomy. | nss-lifecycle <-> curved-corpus-create |
| `nss-inputs` / `nss-outputs` / `nss-audience` / `nss-mode` | Sister NSS-axis closure skills. The Inputs / Outputs / Audience / Mode blocks a file declares upstream compose with the Lifecycle block's transition obligations. | nss-lifecycle <-> siblings |
| `deprecation-and-migration` | Owns the broader deprecation-policy + migration-guide pattern; nss-lifecycle owns the per-file Lifecycle block that records it. | nss-lifecycle <-> deprecation-and-migration |
| `git-workflow-and-versioning` | Owns atomic commits + clean history; nss-lifecycle owns the lifecycle-stage recording of those commits (conventional-commit type -> changelog category). | git-workflow-and-versioning -> nss-lifecycle |
| `documentation-and-adrs` | Owns the ADR convention (Nygard format); nss-lifecycle links the per-file Lifecycle block to its driving ADR. | documentation-and-adrs <-> nss-lifecycle |
| `audit-evidence-packaging` | Owns SLSA + SBOM + provenance; nss-lifecycle owns the SBOM-evidence field of the Lifecycle block (digest, generation phase, retention policy). | audit-evidence-packaging -> nss-lifecycle |
| `single-action-curve-rsi` | Consumes the Extend-gap list this skill emits and applies one atomic primitive flip per file. | nss-lifecycle -> single-action-curve-rsi |
| `recursive-self-improvement` | When the same NSS-lifecycle Extend gap keeps reappearing after a cycle-15 patch, RSI's self-mode should re-isolate the editor before the next attempt -- same-author bias on Lifecycle blocks is the most common cycle-15 failure mode. | recursive-self-improvement -> nss-lifecycle |
| `github-api` | The only network touchpoint -- pushes the audit log + updated Lifecycle blocks to the repo. | nss-lifecycle -> github-api |

## Verification

For each cycle-15 patch that closes an NSS-lifecycle gap:

1. **The patch adds ONE `## Lifecycle -- cycle 15` section** (or the
   file-type-aware equivalent: `# Lifecycle -- cycle 15` for
   Containerfile / Makefile, `# # Lifecycle -- cycle 15` for Python
   triple-quoted docstring, `# Lifecycle -- cycle 15` for shell `#`
   comments, `<!-- Lifecycle -- cycle 15 -->` HTML comment for `.md`
   if a section is not appropriate, `<!-- Lifecycle (workflow_call
   outputs) -- cycle 15 -->` for GitHub Actions YAML).
2. **The section names at least one concrete field** with stage,
   versioning, introduced_in, last_changed_in, owner, next_review,
   and changelog_category. A placeholder section with zero
   concrete fields counts as a NO verdict.
3. **Stage is from the fixed vocabulary.** experimental / beta /
   stable / deprecated / removed / archived / cancelled / unknown.
   A novel stage label is a NO verdict.
4. **Deprecation record is complete** when stage is `deprecated`:
   deprecated_since + reason + replacement + removal_in_version +
   sunset_at + notice_period.
5. **Removal-in-version is named** when stage is `deprecated` or
   `removed`. "Someday" is not a removal_in_version.
6. **Migration guide is named** when stage is `deprecated`:
   replacement symbol + codemod or upgrade_helper + manual_steps +
   validation. "Update your code" is not a migration guide.
7. **Conventional-commit compatibility is declared.** feat / fix /
   chore / refactor / perf / test / docs / BREAKING CHANGE.
8. **Changelog category is declared** (Added / Changed /
   Deprecated / Removed / Fixed / Security).
9. **Owner + next_review are named.** A Lifecycle block without
   `owner:` and `next_review:` is incomplete.
10. **ADR linkage is named** when the file's lifecycle drives a
    public decision. ADR-NNN + decision_status + supersedes (when
    applicable).
11. **The next NSS sweep on the same file does NOT re-flag
    lifecycle as the top Extend gap.** If it does, the patch did
    not close the gap and the cycle-15 lens is a NO verdict.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-15 deep-research synthesis
  for the NSS Lifecycle axis. Captures the eleven-field lifecycle
  taxonomy (identity, stage, versioning, changelog entry,
  deprecation record, migration guide, removal target, feature flag,
  SBOM evidence, ADR linkage, review cadence), the eight-stage
  state machine (experimental / beta / stable / deprecated /
  removed / archived / cancelled / unknown), and the yubiOS-
  specific patterns for Markdown / SKILL.md / docs/*.md, Containerfile
  / mkosi / systemd units, Shell / Python / Ruby scripts, GitHub
  Actions workflows, refs/*.md, feature flags, and SBOMs. Every
  example and anti-pattern is grounded in the source-driven-
  development deep-research pass on SemVer 2.0.0, Keep a Changelog
  1.1.0, Conventional Commits 1.0.0, Release Drafter, RFC 8594
  (Sunset HTTP header), RFC 9745 (Deprecation HTTP header),
  Google API versioning policy, Square API lifecycle policy,
  Kubernetes deprecation policy, LaunchDarkly flag lifecycle,
  OpenFeature provider lifecycle, Node.js userland migrations,
  Next.js codemods, the 2026 CISA SBOM minimum elements, NTIA SBOM
  consumer playbook, Nygard ADR pattern, and AWS ADR process.
  Cycle-15 ships ~40 lifecycle-aware incremental patches on PR
  #207 branch `feat/rsi-compass-cycle7-nss-research-2026-08-12`,
  one `## Lifecycle -- cycle 15` section per file, file-type-aware
  comment syntax.

## Maintainer

Sauna, wave 2 cycle 15. Built against the deep-research synthesis for
the NSS Lifecycle axis (PR #207 cycle-7 NSS gap-informed context),
`negative-skill-space` SKILL.md, the `nss-inputs`, `nss-outputs`,
`nss-audience`, and `nss-mode` SKILL.md exemplars, and the cycle-7
through cycle-14 lens pool (`lenses.json` at root of
`feat/rsi-compass-cycle7-nss-research-2026-08-12`).
