---
id: comp-fedramp
title: FedRAMP
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - cloud service sold to a U.S. federal agency
  - pursuing a federal ATO / authorization path
why: Mandatory for cloud services sold to U.S. federal agencies — no authorization, no deal.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# FedRAMP

## Coverage

Standardized cloud assessment / authorization / continuous-monitoring program for
U.S. federal agencies. Uses **NIST 800-53 baselines** (Low / Moderate / High
impact); a single ATO is reusable across agencies. The Rev 5 update aligns privacy
and supply-chain controls.

## What to assess

- Determine the target **impact baseline** (Moderate is the common SaaS target);
  assess against that 800-53 baseline — which is why `comp-nist-core` should run
  alongside this module (one 800-53 mapping feeds both).
- FedRAMP-specific deltas beyond raw 800-53: authorization-boundary definition,
  U.S. data residency / federal data handling, FIPS-validated cryptography,
  vulnerability-scanning cadence, and **continuous monitoring** (conmon) evidence.
- Readiness is a path call: is the org at "gap analysis", "ready to engage a
  3PAO", or "conmon-sustainable"? Name the stage, not a percentage.
- Statuses cite the 800-53 control with the FedRAMP baseline noted
  (`FedRAMP-Mod:AC-2`).

## Cross-map anchors

- Derives from NIST baselines — **one 800-53 mapping feeds both FedRAMP and CMMC**
  (`comp-nist-core`, `comp-cmmc`); never audit the shared controls twice.
- 800-137/ISCM evidence from the security side (`sec-ir-continuity`) is the conmon
  story.

## Coverage limits

Carried at the program/baseline level, not the full FedRAMP template set (SSP,
POA&M formats). Producing authorization-package documents is scoped follow-up;
this module assesses control posture and the gap to engaging a 3PAO.
