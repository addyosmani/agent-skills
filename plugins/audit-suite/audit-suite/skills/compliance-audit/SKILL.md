---
name: compliance-audit
description: >-
  Map an organization or system's posture to named compliance frameworks and
  attestations — SOC 2, FedRAMP, CMMC, HIPAA/HITRUST, PCI DSS, ISO 27001/27701,
  NIST 800-53/171, GDPR/CCPA, CSA CCM, ISO 42001 — producing per-framework gap
  analysis, control matrices, and audit-readiness assessments. Use whenever
  someone asks about compliance, control mapping, audit readiness, attestation, or
  certification — "are we SOC 2 ready", "what 800-53 controls do we satisfy",
  "map us to HIPAA", "what's our FedRAMP gap", "prep for our ISO 27001 audit", or
  any control-framework or regulatory-mapping request. This skill MAPS CONTROLS and
  assesses readiness; it does NOT perform technical vulnerability discovery — that's
  the security-audit skill. Run security-audit first so this skill has real findings
  to map as evidence; or let audit-conductor sequence them.
---

# Compliance Audit

The control and attestation engine. This skill takes a scope (and ideally a set of
technical findings from `security-audit`) and produces **posture against named
frameworks** — what's satisfied, what's gapped, and how ready the org is for a real
assessment.

**Boundary:** if the request is "find the vulnerabilities" or "is this code
secure", that's `security-audit`. This skill answers "do we meet SOC 2 / HIPAA /
FedRAMP, and where are the gaps." It maps; it doesn't discover.

Framework knowledge is **modular**: always-on mapping rules live in
`references/baseline-mapping.md`; each framework is a selectable, versioned module
in `modules/` (one file each, with `version`/`status`/`tier`/`applies_when`
frontmatter).

---

## Workflow

### 1. Resolve the framework module set

**Never load module bodies you won't use:**

1. **Dispatched by the conductor?** The spec's `modules` field is the selection —
   pinned ids and versions (format: audit-conductor's
   `references/dispatch-spec.md`). Don't re-derive it.
2. **Invoked directly?** Resolve the catalog: read
   `../audit-conductor/references/module-registry.yaml` if it exists; otherwise
   glob this skill's own `modules/*.md` (standalone-install fallback).
3. **Filter by frontmatter first.** Read only each module's frontmatter block
   (the first ~15 lines), then keep modules that are `status: enabled` AND match
   the request (named framework, or an `applies_when` trigger fires). Never read
   the body of a disabled or unselected module.
4. **Disabled modules are inert.** If the person explicitly names a disabled
   module, say it's disabled in this install and ask whether to proceed without
   it — never silently enable it.
5. **Order the set** mandatory → expected → recommended (the `tier` field):
   - **Mandatory** — legal/contractual (HIPAA, PCI, FedRAMP, CMMC, GDPR).
   - **Expected** — procurement gates (SOC 2, ISO 27001).
   - **Recommended** — posture (CSA CCM, supply-chain, COBIT).
6. **Surface implied mandates.** When the scope implies an obvious mandate the
   person didn't name (PHI → `comp-hipaa-hitrust`, cards → `comp-pci-dss`),
   surface it — don't audit a health system against SOC 2 alone and call it done.
7. **Record provenance.** Note each loaded module's `id` and `version` for the
   report and sidecar. If a dispatch pin doesn't match the installed version,
   proceed with the installed version and record both, flagging the mismatch.

### 2. Ingest evidence

The strongest compliance audit is built on real findings, not self-attestation.
Pull in:

- **security-audit JSON sidecar** if present — each technical finding is evidence
  for or against specific controls (a missing-MFA finding maps directly to access-
  control families across 800-53, SOC 2 CC6, ISO 27001 A.5). The sidecar is a
  provenance envelope — read the `findings` array.
- **review-tenant-isolation output** if that lens ran (multi-tenant systems) —
  isolation findings are direct evidence for SOC 2 CC6, ISO 27001 A.5/A.8, and
  GDPR Art. 32.
- Existing documentation, prior audits, architecture, policies.

If no findings exist yet, say so and recommend running security-audit first — a
control matrix built on assertion alone is weak evidence.

### 3. Map controls

For each in-scope framework module, assess each relevant control/criterion:

- **Status** — Met / Partially Met / Not Met / Not Applicable.
- **Evidence** — what supports the status (a security finding, a config, a policy,
  a documented process). "Not Met" needs evidence too — what's missing.
- **Gap** — for anything less than Met, the specific deficiency.
- **Cross-map** — note where one control satisfies several frameworks, via the
  anchors in `references/baseline-mapping.md` and each module's "Cross-map
  anchors" section (CSA CCM bridges ISO 27001 ↔ 800-53 ↔ CIS; FedRAMP and CMMC
  both derive from NIST baselines). Map once, credit everywhere — don't re-audit
  the same control per framework.
- **Owner** — populate from the conductor's `default_owner` in the dispatch spec
  when present; override where a specific team owns the control domain (e.g.,
  infrastructure for SC-family controls, HR for AT-family controls). If unknown,
  set `null` — the conductor's Phase 4.5 will surface unowned gaps.

### 4. Assess readiness

Per framework, give a candid readiness call: would this pass a real assessment
today? What's the gap to certification/attestation, and roughly what effort closes
it? Honesty over optimism — a green dashboard that fails the actual audit helps no
one.

### 5. Output

Two artifacts:

1. **Markdown report**:

```
# Compliance Audit — [target]
## Notice              (⚠ point-in-time snapshot — reflects [target] @ [branch/commit] as of [date];
                        formal auditors verify 6–12 months of evidence that this tool cannot assess;
                        control status reflects current code and config, not sustained enforcement;
                        see ../audit-conductor/references/tool-transparency.md for full scope and limitations)
## Summary             (per-framework readiness at a glance)
## Scope & Frameworks  (what was assessed, against what — modules as id@version, mandatory-first)
## Control Matrices    (per framework: control / status / evidence / gap)
## Gap Analysis        (consolidated, prioritized: mandatory gaps first)
## Readiness           (per-framework: pass today? gap to certification?)
## Coverage Notes      (frameworks/controls scoped as follow-up, not fabricated)
```

2. **JSON sidecar** — machine-readable control statuses for the conductor to
   consolidate. A provenance envelope wrapping one object per control assessed:

```json
{
  "provenance": {
    "suite_version": "1.0.0",
    "skill": "compliance-audit",
    "modules": [{ "id": "comp-soc2", "version": "1.0.0" }],
    "date": "2026-06-12",
    "inputs": ["audit/security-audit-2026-06-12.json"]
  },
  "controls": [
    {
      "framework": "SOC2",
      "module": "comp-soc2",
      "control": "CC6.1",
      "status": "Partially Met",
      "evidence": "MFA on admin paths (SEC-004) but not on all user auth",
      "gap": "Extend MFA to all authentication surfaces",
      "cross_map": ["NIST-800-53:AC-2", "ISO-27001:A.5.15"],
      "owner": null,
      "risk_acceptance": null
    }
  ]
}
```

`owner` is populated from the dispatch spec's `default_owner` or overridden per
control domain (e.g., infrastructure for SC-family, HR for AT-family).
`risk_acceptance` remains `null` until the conductor's Phase 4.5 sign-off — never
set it unilaterally. The sidecar is consumed by the conductor and by
`remediation-plan`; don't skip it.

**Writing artifacts to disk — both modes.** In **headless** mode, write the report
and JSON sidecar to the output paths in the dispatch spec. In **interactive** mode,
offer to write them once the report is delivered; if the target already holds audit
artifacts, match their naming convention (e.g. `compliance-audit-<YYYY-MM-DD>.md` +
`.json`) rather than inventing one. Don't write into the user's tree unprompted —
offer, then write on confirmation.

**Standalone runs only:** once the report is delivered, offer the in-suite
`remediation-plan` skill in one line — it sequences the gaps into a phased
execution plan (and can file it in Jira via `jira-integration`). When the
conductor invoked this run, skip the offer; the conductor owns that phase.

---

## Constraints

- **Scope is the active checkout, one branch.** Same boundary as security-audit:
  ignore sibling worktrees and nested clones; honor the branch in the dispatch spec.
- **Map, don't discover.** Technical vulnerability hunting is security-audit's job.
  Consume its findings as evidence; don't duplicate its work.
- **Load only selected, enabled modules.** Frontmatter first, bodies only for
  frameworks actually being mapped. Disabled means inert.
- **Mandatory before recommended**, in every list and matrix. A legal gap never
  sits below a nice-to-have.
- **Never fabricate control coverage.** If the loaded modules don't document a
  framework at the depth asked (deep HIPAA safeguards, full HITRUST catalog, NERC
  CIP, GLBA), map at the level you can and flag the rest as scoped follow-up. A
  confident fake control map is the worst possible output — it fails silently at the
  real audit.
- **Evidence-based status.** Every Met/Not-Met needs a reason. "Met" without
  evidence is an assertion, not an audit.

## References

- `references/baseline-mapping.md` — always-on mapping rules: cross-map anchors,
  maturity gauging, evidence strength, continuous monitoring.
- `modules/*.md` — selectable, versioned framework modules (NIST core, SOC 2,
  ISO 27001 family, FedRAMP, CMMC/800-171, PCI DSS, HIPAA/HITRUST, privacy,
  AI governance, NIS2, DORA, cloud/supply-chain, COBIT), loaded per step 1.
- `../audit-conductor/references/module-registry.yaml` — the suite-wide module
  index (when installed alongside the conductor).
- `../audit-conductor/references/tool-transparency.md` — access scope, adversarial-
  input defenses, and report caveats; linked from the Notice section of every report.
