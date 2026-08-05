---
id: comp-cobit
title: COBIT 2019 (IT governance)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: recommended
applies_when:
  - board or executive governance review
  - IT-to-business alignment assessment
why: The enterprise IT-governance lens — for when the question is whether leadership governs technology, not whether controls exist.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# COBIT 2019

## Coverage

Enterprise IT governance complementing TOGAF: **40 objectives across five domains**
(EDM — Evaluate, Direct, Monitor; plus APO, BAI, DSS, MEA management domains).
**Separates governance from management**; tailorable end-to-end via design factors.

## What to assess

- Is there a governance layer at all — does leadership Evaluate/Direct/Monitor
  technology decisions, or does IT self-govern by default?
- Walk the domains relevant to the engagement (security reviews usually touch
  APO13 security management, DSS05 security services, MEA monitoring objectives).
- Use design factors to tailor: a 50-person SaaS doesn't need all 40 objectives
  formalized — the finding is mismatch between governance weight and org risk,
  in either direction.
- Statuses cite the objective (`COBIT:DSS05`) and evidence.

## Cross-map anchors

- COBIT governance objectives frame where **ISO 27001 management clauses** and
  **800-53 program-management (PM) controls** report into
  (`comp-iso-27001-family`, `comp-nist-core`).
- Board-level AI accountability questions hand off to `comp-ai-governance`.

## Coverage limits

Carried at the objective level, not full practice/activity detail. Governance
assessment needs organizational evidence (charters, review cadences, decision
records) — without it, scope this module out rather than inferring governance
from technical artifacts.
