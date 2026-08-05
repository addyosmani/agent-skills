---
id: comp-iso-27001-family
title: ISO/IEC 27001 family (+27017/27018)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: expected
applies_when:
  - pursuing or holding ISMS certification
  - selling into ISO-aligned (esp. international) markets
  - cloud workloads handling sensitive or personal data (27017/27018)
why: The international ISMS certification — the global counterpart to SOC 2 as a procurement gate, with cloud extensions.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# ISO/IEC 27001 (2022) + 27017 / 27018

## Coverage

**ISO/IEC 27001 (2022)** — ISMS standard: risk identification, control
implementation, continual improvement. The 2022 amendment requires climate-change
consideration. Certification signals an audited, operating program — not just
controls on paper.

**ISO/IEC 27017** — cloud-specific security controls. **ISO/IEC 27018** — PII
protection in the cloud. Both align with 27001; cross-map via CSA CCM.

## What to assess

- Assess both halves of 27001: the **management system** (risk assessment,
  Statement of Applicability, internal audit, management review, continual
  improvement) and the **Annex A controls** (2022 structure: A.5 organizational,
  A.6 people, A.7 physical, A.8 technological).
- Security-audit findings map mostly into **A.5 (policies/access) and A.8
  (technological controls)**; the management-system half needs documentary
  evidence — it cannot be inferred from code.
- Pull 27017/27018 only when cloud workloads are in scope; their deltas extend
  Annex A rather than replacing it.
- Statuses cite the control (`ISO-27001:A.8.24`) and evidence.

## Cross-map anchors

- ISO 27001 ↔ 800-53 ↔ CIS — bridge via **CSA CCM** (`comp-cloud-supply-chain`).
- An operating ISMS substantially pre-answers **SOC 2 Security** (`comp-soc2`) and
  is the base **ISO 27701** extends for privacy (`comp-privacy`).

## Coverage limits

Annex A carried at control-title level. The management-system clauses (4–10) can
only be assessed from actual documentation (SoA, risk register, audit records);
absent those, readiness is capped and says so — an ISMS is not inferable from a
codebase.
