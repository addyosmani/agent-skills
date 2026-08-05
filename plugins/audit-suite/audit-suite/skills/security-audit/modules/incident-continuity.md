---
id: sec-ir-continuity
title: Incident Response & Continuity (800-61, ISO 22301, 800-137)
owner: security-audit
version: 1.0.0
status: enabled
tier: recommended
applies_when:
  - incident-response process or tooling under review
  - business-continuity / resilience scope
  - program claims ongoing assurance rather than point-in-time
why: Findings decay — this lens checks whether the org can detect, respond, recover, and keep its posture current.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# Incident Response, Continuity & Continuous Monitoring

## Coverage

**NIST SP 800-61** — computer-security incident-handling lifecycle (preparation →
detection/analysis → containment/eradication/recovery → post-incident).

**ISO 22301** — business continuity management system.

**NIST SP 800-137 (ISCM)** — Information Security Continuous Monitoring: keeps
posture effective over time. A point-in-time pass decays — 800-137 keeps findings
honest.

## What to assess

- **Detection readiness** — logging coverage on the surfaces audited: would the
  attacks modeled in this run actually be seen? Alert paths, retention, tamper
  resistance of logs.
- **Response capability** — runbooks/IR plan existence and currency, on-call and
  escalation reality, containment levers (credential revocation, kill switches,
  isolation).
- **Recovery & continuity** — backup existence, restore testing (a backup never
  restored is a hope), RTO/RPO claims vs. evidence, dependency on single regions
  or people.
- **Continuous monitoring** — is anything re-checking posture between audits
  (dependency scanning, config drift detection, cert/secret expiry), or does
  assurance end when this report lands?
- Tag findings `800-61:<phase>`, `ISO-22301`, or `ISCM`.

## Cross-map anchors

- IR and monitoring findings feed **800-53** IR/AU/CP families, **SOC 2**
  availability criteria, and **ISO 27001** A.5/A.8 on the compliance side.
- 800-137 evidence feeds FedRAMP continuous-monitoring expectations
  (`comp-fedramp`).

## Coverage limits

Process maturity can only be assessed from artifacts in scope (runbooks, configs,
pipeline checks). If the scope is a repo with no operational artifacts, say the
lens ran shallow rather than inferring an IR program from silence.
