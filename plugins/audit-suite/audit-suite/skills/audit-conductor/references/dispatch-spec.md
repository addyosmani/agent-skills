# Dispatch Spec — the headless handoff contract

When the conductor runs in **headless / dispatch** mode (Phase 3), it doesn't run
the specialists inline — it writes one spec file per specialist and hands each to a
downstream Claude Code agent. The spec is the entire contract: a specialist that
receives one honors its scope, modules, depth, and output paths without
re-deriving any of them. That's what keeps parallel runs from drifting apart.

In **interactive** mode no spec file is needed — the conductor invokes each
specialist skill directly (`security-audit`, then `compliance-audit`) and passes the
same information conversationally, including the selected modules as id@version.

---

## Format and location

One YAML file per specialist, written to disk **before** any dispatch:

```
<output-dir>/dispatch/<specialist>-spec.yaml
```

`<output-dir>` is wherever the run's artifacts will land — default to an `audit/`
folder and **confirm it with the person first**. Never write into the target's tree
unprompted; the "offer, then write" rule applies to specs the same as to reports.

After writing, verify the spec against the real target (does the repo path exist?
does the branch resolve? do the module ids exist in the registry?) before
dispatching — never trust a scope narrative that hasn't touched disk.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `spec_version` | yes | `1` |
| `specialist` | yes | `security-audit`, `compliance-audit`, or `review-tenant-isolation` |
| `target` | yes | Repo path, app, or system identifier under audit |
| `branch` | repos | Resolved branch (Phase 1 boundary rule; main by default) |
| `scope` | yes | `include`: in-scope surfaces. `exclude`: explicit exclusions (sibling worktrees, nested clones, `vendor/`, `node_modules/`) |
| `modules` | yes | **The operative selection** — the Phase 2b set for this specialist, as `id` + `version` pairs pinned at dispatch time |
| `frameworks` | no | Human-readable tier summary (`mandatory`/`expected`/`recommended` names). Deprecated for machine use — `modules` governs |
| `depth` | yes | `triage`, `standard`, or `deep` |
| `output` | yes | `report`: markdown path. `sidecar`: JSON path |
| `inputs` | when chained | Upstream artifacts to consume — for compliance-audit, the security-audit JSON sidecar (and the tenant-isolation report when that lens ran) |
| `profile_notes` | no | Free-text Phase 1 context: data types, residency, AI surface, obligations, maturity goal |

Field names are stable — downstream agents and tooling key off them. Add context in
`profile_notes`, not new fields.

**Pin semantics.** The `version` pin records what the conductor *expected* when it
resolved the plan. If the installed module version differs at execution time (the
suite updated between dispatch and run), the specialist proceeds with the
**installed** version, records **both** versions in its provenance block, and flags
the mismatch — it cannot time-travel to an older module.

## Worked example

A SaaS repo handling US + EU PII, customer requiring SOC 2. Two specs, sequenced
security-first; compliance-audit's `inputs` points at security-audit's sidecar.

`audit/dispatch/security-audit-spec.yaml`:

```yaml
spec_version: 1
specialist: security-audit
target: c:/repos/acme-api
branch: main
scope:
  include: [app code, IaC (terraform/), CI/CD (.github/workflows/), dependency manifests, auth/session code]
  exclude: [sibling worktrees, nested clones, vendor/, node_modules/]
modules:
  - { id: sec-owasp-asvs, version: 1.0.0 }
  - { id: sec-cis-controls, version: 1.0.0 }
  - { id: sec-slsa, version: 1.0.0 }
frameworks:   # human-readable summary only — `modules` governs
  expected: [OWASP ASVS + SAMM]
  recommended: [CIS (IaC), SLSA (pipeline)]
depth: standard
output:
  report: audit/security-audit-2026-06-12.md
  sidecar: audit/security-audit-2026-06-12.json
profile_notes: >-
  SaaS, multi-tenant TypeScript API. PII (US + EU residency). Customer-driven
  SOC 2 obligation. No AI/agentic surface. First-time audit program.
```

`audit/dispatch/compliance-audit-spec.yaml`:

```yaml
spec_version: 1
specialist: compliance-audit
target: c:/repos/acme-api
branch: main
scope:
  include: [same boundary as security-audit]
  exclude: [sibling worktrees, nested clones, vendor/, node_modules/]
modules:
  - { id: comp-privacy, version: 1.0.0 }
  - { id: comp-soc2, version: 1.0.0 }
  - { id: comp-iso-27001-family, version: 1.0.0 }
  - { id: comp-cloud-supply-chain, version: 1.0.0 }
frameworks:   # human-readable summary only — `modules` governs
  mandatory: [GDPR]
  expected: [SOC 2, ISO 27001]
  recommended: [CSA CCM]
depth: standard
inputs:
  security_findings: audit/security-audit-2026-06-12.json
output:
  report: audit/compliance-audit-2026-06-12.md
  sidecar: audit/compliance-audit-2026-06-12.json
profile_notes: >-
  EU PII triggers comp-privacy as mandatory. SOC 2 is the contractual driver;
  ISO 27001 rides along via cross-map. Evidence basis is the security-audit
  sidecar — do not self-attest controls it contradicts.
```

## Consumption

To dispatch, point a downstream Claude Code agent (typically on a worktree) at the
spec file with an instruction of the shape:

> Read `audit/dispatch/security-audit-spec.yaml` and execute the `security-audit`
> skill exactly per that spec — its scope, branch, modules, depth, and output
> paths are already resolved; don't re-derive them. Load only the module bodies
> the spec selects. Write both artifacts to the spec'd paths.

Sequencing still matters in headless mode: dispatch security-audit (and
review-tenant-isolation, when that lens applies) first, wait for their sidecars to
land at the spec'd paths, then dispatch compliance-audit. The conductor consolidates
(Phase 4) only after every spec'd sidecar exists on disk — and checks each sidecar's
provenance block against the spec's pins, surfacing any version mismatch in the
consolidated report.
