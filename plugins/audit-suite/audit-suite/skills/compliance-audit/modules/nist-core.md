---
id: comp-nist-core
title: NIST Core (800-37 RMF + 800-53 Rev 5)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: expected
applies_when:
  - building or authorizing a risk program
  - federal or federal-adjacent control mapping
  - a core control library is needed as the mapping spine
why: The de facto control library — most other framework mappings derive from an 800-53 spine, so mapping it once feeds everything downstream.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# NIST Core — SP 800-37 Rev 2 (RMF) + SP 800-53 Rev 5

## Coverage

**NIST SP 800-37 Rev 2 (RMF)** — seven-step risk-management process (Prepare →
Categorize → Select → Implement → Assess → Authorize → Monitor). A method for
*building* a risk program. Rev 2 adds Prepare plus supply-chain/privacy guidance,
aligned to CSF.

**NIST SP 800-53 Rev 5** — catalog of ~1,196 outcome-based security & privacy
controls across 20 families. Rev 5 adds PII-processing and supply-chain families;
technology-neutral. Pair with **SP 800-53B** baselines (Low/Moderate/High).

## What to assess

- Map evidence (security-audit findings, configs, policies) to 800-53 **control
  families** (AC, AU, CM, IA, IR, SC, SI, SR…) at the family-and-control level.
- Select the 800-53B baseline matching the system's categorization; assess against
  that baseline, not the full catalog.
- For program-maturity questions, walk the RMF steps: which exist, which are
  documented, which actually operate (Monitor is the usual gap).
- Statuses cite the control ID (`800-53:AC-2`) and the evidence behind them.

## Cross-map anchors

- **FedRAMP** and **CMMC** both derive from NIST baselines (800-53 / 800-171) —
  a single 800-53 mapping feeds both (`comp-fedramp`, `comp-cmmc`).
- ISO 27001 ↔ 800-53 ↔ CIS — bridge via CSA CCM (`comp-cloud-supply-chain`).

## Coverage limits

Carried at the family/control-name level, not full control prose for 1,196
controls. Map the controls evidence actually supports; flag deeper enhancement-level
mapping as scoped follow-up rather than fabricating enhancement numbers.
