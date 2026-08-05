---
id: comp-ai-governance
title: AI Governance (ISO 42001 + EU AI Act)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: expected
applies_when:
  - any AI/ML system in scope and governance posture is in question
  - seeking AI governance certification
  - EU-facing AI (elevates to mandatory — EU AI Act conformity)
why: The governance counterpart to the AI threat lens — ISO 42001 is the certifiable AI management system, and the EU AI Act makes conformity legally mandatory for EU-facing AI.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# AI Governance — ISO/IEC 42001 (AIMS) + EU AI Act

## Coverage

**ISO/IEC 42001 (AIMS)** — first management-system standard for AI (published late
2023). Governs how AI systems are designed, deployed, monitored, maintained.
Sector-agnostic, risk-based; demands impact assessments and explicit handling of
bias, accountability, and oversight gaps. Three-year certification cycle; scopable
to the EU AI Act.

**EU AI Act** — risk-based regulation: prohibited / high-risk / limited-risk
classes with conformity assessment for high-risk systems. **Mandatory for
EU-facing AI.**

## What to assess

- **Inventory and classification**: what AI systems exist, and where would each
  land under the EU AI Act risk classes? Classification drives everything else.
- **AIMS posture** (ISO 42001): AI policy, assigned accountability, impact
  assessments performed, bias/oversight handling, monitoring and incident paths
  for AI behavior.
- **Human oversight**: are there defined humans-in-the-loop for consequential AI
  decisions, and do they have real veto power?
- **NIST AI RMF Govern** function maps here (its Measure/Manage functions drive
  the technical review — see `sec-ai-security`).
- Statuses cite the clause/article (`ISO-42001:6.1`, `EU-AI-Act:Art.9`) and
  evidence.

## Cross-map anchors

- Technical counterpart: `sec-ai-security` (AI RMF Measure/Manage, agentic threat
  vectors) — its findings are the evidence base for governance claims here.
- ISO 42001 is a management system in the 27001 mold — an existing ISMS
  (`comp-iso-27001-family`) accelerates AIMS adoption.

## Coverage limits

EU AI Act obligations are carried at the risk-class/article level and the act's
implementation timeline is still maturing — flag classification edge cases and
conformity-assessment specifics for legal follow-up rather than ruling on them.
