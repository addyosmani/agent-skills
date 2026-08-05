---
id: comp-privacy
title: Privacy (GDPR / CCPA + ISO 27701)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - processes EU resident personal data (GDPR)
  - processes California resident personal data (CCPA/CPRA)
  - PII at scale or seeking privacy certification (ISO 27701)
why: Regional privacy law is legally mandatory wherever regulated residents' data flows; ISO 27701 is the management-system on-ramp to proving it.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# Privacy — GDPR / CCPA (and regional laws) + ISO/IEC 27701

## Coverage

**GDPR / CCPA (and regional laws)** — lawful processing, consent, breach
notification, data-subject rights. Triggered by the **residency of the data
subjects**, not where the org sits.

**ISO/IEC 27701 (PIMS)** — privacy extension to ISO 27001 for a PII management
system; eases mapping to privacy regulations and supports privacy certification.

## What to assess

- Establish the **data map**: what personal data is collected, lawful basis,
  where it's stored (residency), how long it's kept, who it's shared with —
  most privacy gaps are inventory gaps.
- **Data-subject rights mechanics**: can the system actually execute access,
  deletion, portability, and opt-out requests within statutory windows? An
  unanswerable deletion request is a finding, not a footnote.
- **Technical measures (GDPR Art. 32)**: encryption, access control, isolation —
  this is where security-audit and tenant-isolation findings land as evidence.
- **Breach notification readiness**: detection-to-notification path inside 72
  hours (GDPR); processor/sub-processor contracts (DPAs) in place.
- ISO 27701 only when an ISMS exists or is planned — it extends 27001, it doesn't
  stand alone.
- Statuses cite the article/section (`GDPR:Art.32`, `CCPA:1798.105`) and evidence.

## Cross-map anchors

- Art. 32 technical measures ↔ **ISO 27001 A.5/A.8** ↔ **800-53 AC/SC** — map
  once (`comp-iso-27001-family`, `comp-nist-core`).
- Multi-tenant isolation findings (review-tenant-isolation lens) are direct
  Art. 32 evidence.
- SOC 2 Privacy criterion overlaps heavily — credit it from this mapping
  (`comp-soc2`).

## Coverage limits

Carried at the article/right/principle level for GDPR/CCPA, not full regulatory
text or member-state derogations. Legal interpretation (lawful-basis judgment
calls, international transfer mechanisms) is flagged for counsel, not decided here.
