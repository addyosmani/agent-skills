---
id: comp-soc2
title: SOC 2 (Trust Services Criteria)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: expected
applies_when:
  - service provider handling customer data
  - customer or contract names SOC 2
  - B2B procurement / RFP security questionnaire
why: The de facto B2B procurement gate; the Security TSC is mandatory in any SOC 2 report.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# SOC 2 — Trust Services Criteria

## Coverage

Service-organization audit over five Trust Services Criteria: **Security
(mandatory in every report), Availability, Processing Integrity, Confidentiality,
Privacy**. Type I attests design at a point in time; Type II attests operating
effectiveness over a period — procurement almost always means Type II.

## What to assess

- Confirm which TSC are in scope (Security always; the others by what the service
  promises customers — uptime SLAs pull Availability, PII pulls Privacy).
- Map evidence to the Common Criteria (CC1–CC9), with the heaviest technical
  weight on **CC6 (logical & physical access)**, CC7 (system operations /
  monitoring), and CC8 (change management) — these are where security-audit and
  tenant-isolation findings land.
- Distinguish **design** gaps (control doesn't exist) from **operating** gaps
  (exists but no evidence it runs consistently) — Type II fails on the latter.
- Statuses cite the criterion (`SOC2:CC6.1`) and the finding/config/policy behind
  them.

## Cross-map anchors

- CC6 access findings ↔ **800-53 AC** ↔ **ISO 27001 A.5** — map once via the CCM
  bridge (`comp-cloud-supply-chain`), credit everywhere.
- Multi-tenant isolation findings (review-tenant-isolation lens) are direct CC6
  evidence.
- An ISO 27001 ISMS substantially pre-answers SOC 2 Security — note the overlap
  rather than double-auditing (`comp-iso-27001-family`).

## Coverage limits

Carried at the criterion level (CC-series and TSC names), not the full
points-of-focus catalog. Readiness calls distinguish "would pass Type I" from
"has the operating history for Type II" — don't conflate them.
