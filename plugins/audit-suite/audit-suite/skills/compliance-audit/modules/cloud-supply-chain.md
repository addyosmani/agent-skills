---
id: comp-cloud-supply-chain
title: Cloud & Supply Chain (CSA CCM, 800-161, SOC for Supply Chain)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: recommended
applies_when:
  - cloud provider or consumer assessment
  - multi-framework reconciliation needed (CCM as cross-map hub)
  - non-trivial dependency or vendor footprint
why: CCM is the cross-map hub that lets one control mapping credit five frameworks; 800-161 covers the vendor/dependency risk every modern stack carries.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# Cloud & Supply-Chain Control Mapping

## Coverage

**CSA Cloud Controls Matrix (CCM) + STAR** — 16 control domains cross-mapped to
ISO 27001/27017/27018, NIST 800-53, and PCI DSS. Underpins CSA STAR certification;
**the primary tool for cross-framework reconciliation**.

**NIST SP 800-161 (C-SCRM)** — cyber supply-chain risk management: identify,
assess, mitigate supplier and third-party dependency risk; integrates SCRM into
org-wide risk activities.

**SOC for Supply Chain (AICPA)** — reporting framework to communicate
cybersecurity posture across the supply chain.

## What to assess

- **As cross-map hub**: when multiple frameworks are in scope, reconcile through
  CCM domains rather than re-auditing the same control per framework — map once,
  credit everywhere. This is the module's most common job.
- **Cloud assessments**: walk the 16 CCM domains against the cloud estate;
  STAR level (self-assessment vs. certification) frames the readiness call.
- **Supply chain (800-161)**: third-party/vendor inventory, dependency risk
  (pairs with the technical `sec-slsa` findings), flow-down of security
  requirements to suppliers, concentration risk.
- Statuses cite the domain/control (`CCM:IAM-04`, `800-161:SR-3`) and evidence.

## Cross-map anchors

- This module *is* the anchor: ISO 27001 ↔ 800-53 ↔ CIS ↔ PCI reconcile via CCM
  (`comp-iso-27001-family`, `comp-nist-core`, `comp-pci-dss`).
- SLSA/pipeline findings (`sec-slsa`) are direct C-SCRM evidence.

## Coverage limits

CCM carried at the domain level, not all individual control specs. SOC for Supply
Chain is a reporting framework — flag report preparation as its own engagement.
