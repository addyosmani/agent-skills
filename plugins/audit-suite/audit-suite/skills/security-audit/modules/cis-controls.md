---
id: sec-cis-controls
title: CIS Critical Security Controls v8.1
owner: security-audit
version: 1.0.0
status: enabled
tier: recommended
applies_when:
  - pragmatic, prioritized control checklist wanted
  - hybrid or cloud estate under review
  - maturity benchmarking via Implementation Groups
why: 18 prioritized, task-based controls tuned for hybrid/cloud — the fastest defensible checklist when no single mandate dominates.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# CIS Critical Security Controls v8.1

## Coverage

18 prioritized, task-based controls (asset management, vulnerability monitoring,
incident response, access control, data protection, etc.) aligned to NIST, GDPR,
and ISO 27001; tuned for hybrid/cloud environments. **Implementation Groups**
(IG1–IG3) scale the control set to org size and risk profile.

## What to assess

- Walk the in-scope surface against the 18 control families, prioritized in CIS
  order — the ordering *is* the value; don't flatten it.
- Pick the Implementation Group honestly: IG1 for small/basic, IG2 default for
  orgs handling sensitive data, IG3 for high-risk/mature targets. Findings cite
  the IG so remediation isn't over-scoped.
- Use Implementation Groups to gauge whether a control *operates well*, not merely
  *exists* — presence without operation is a finding.
- Tag findings `CIS:<control.safeguard>` (e.g. `CIS:5.2`).

## Cross-map anchors

- CIS ↔ ISO 27001 ↔ NIST 800-53 — bridge via **CSA CCM** on the compliance side;
  one CIS finding should credit all three without re-auditing.
- CIS asset/vuln/IR controls pair naturally with ATT&CK techniques — ground each
  control gap in the TTP it would have blocked.

## Coverage limits

Carried at the control/safeguard-title level, not full safeguard prose. Cite
safeguard numbers you can defend from the evidence in scope.
