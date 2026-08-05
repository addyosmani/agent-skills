---
id: comp-pci-dss
title: PCI DSS 4.0
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - system stores, processes, or transmits cardholder data
  - payment flows in scope
why: Contractually mandatory for any system touching cardholder data — card brands enforce it through acquirers.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# PCI DSS 4.0

## Coverage

Cardholder-data protection across six goals: secure networks, protect cardholder
data (CHD), vulnerability management, strong access control, monitor/test, and
security policy — expressed as 12 requirements. 4.0 adds a **customized
(outcome-based) validation path** alongside the defined approach.

## What to assess

- First fix the **cardholder data environment (CDE)**: where PAN/CVV is stored,
  processed, or transmitted, and what's properly segmented out. Scope reduction
  (tokenization, hosted payment fields, third-party processors) is usually the
  highest-leverage finding.
- Check the non-negotiables against evidence: PAN unreadable wherever stored
  (CVV never stored post-auth), encryption in transit across open networks,
  access to CHD on need-to-know with MFA, logging/monitoring of all CDE access.
- Determine the merchant/service-provider level and the validation route
  (SAQ type vs. ROC) — readiness depends on which applies.
- Statuses cite the requirement (`PCI-DSS:3.5`) and evidence.

## Cross-map anchors

- PCI access/logging requirements ↔ **800-53 AC/AU** ↔ **ISO 27001 A.5/A.8** —
  bridge via CSA CCM (`comp-cloud-supply-chain`).
- ASVS findings on the payment app (`sec-owasp-asvs`) are direct PCI requirement-6
  evidence.

## Coverage limits

Carried at the requirement level, not full sub-requirement/testing-procedure text.
If no CDE exists in scope (fully outsourced payments), say so — the right outcome
may be confirming scope-out evidence rather than a control matrix.
