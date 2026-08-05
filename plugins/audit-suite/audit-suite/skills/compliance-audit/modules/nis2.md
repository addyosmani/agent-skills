---
id: comp-nis2
title: NIS2 (EU Directive 2022/2555)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - essential or important entity operating in the EU
  - managed service provider / managed security service provider serving EU customers
  - EU market entry for in-scope sectors (energy, transport, health, digital infrastructure, ICT service management...)
why: The EU's baseline cybersecurity law — MSPs and MSSPs are explicitly in scope, with management personally accountable and 24h/72h incident reporting.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# NIS2 — Directive (EU) 2022/2555

## Coverage

The EU's network-and-information-security baseline, applicable via national
transposition since October 2024. Classifies organizations as **essential** or
**important entities** by sector and size; **ICT service management (B2B) —
managed service providers and managed security service providers — is explicitly
an in-scope sector.** Key obligations: management accountability (Art. 20),
ten minimum cybersecurity risk-management measures (Art. 21), and staged incident
reporting (Art. 23). Penalties reach €10M / 2% of global turnover for essential
entities (€7M / 1.4% for important), with personal liability for management bodies.

## What to assess

- **Scope determination first**: which entity class (essential vs important),
  which member state(s), and which national transposition applies — obligations
  and supervision differ by class and country.
- **Art. 20 governance**: does management approve and oversee the risk measures,
  and receive cybersecurity training? Board-level evidence required.
- **Art. 21 measures** — map evidence against all ten: (a) risk analysis &
  security policies; (b) incident handling; (c) business continuity — backups,
  DR, crisis management; (d) **supply-chain security**; (e) security in
  acquisition/development/maintenance incl. vulnerability handling & disclosure;
  (f) effectiveness-assessment policies; (g) cyber hygiene & training;
  (h) cryptography/encryption policies; (i) HR security, access control, asset
  management; (j) MFA/continuous authentication and secured communications.
- **Art. 23 reporting readiness**: can the org deliver an early warning within
  **24 hours**, an incident notification within **72 hours**, and a final report
  within **one month** of a significant incident? Test the path, not the policy.
- Statuses cite the article/measure (`NIS2:Art.21(d)`) and evidence.

## Cross-map anchors

- Art. 21 measures overlap heavily with **ISO 27001 Annex A**
  (`comp-iso-27001-family`) — an operating ISMS pre-answers most of the technical
  half; map once and credit.
- Supply-chain measure (21(d)) pairs with `comp-cloud-supply-chain` (800-161) and
  technical `sec-slsa` findings.
- Incident-reporting readiness draws on `sec-ir-continuity` evidence; GDPR breach
  notification (`comp-privacy`) is a parallel but distinct clock.

## Coverage limits

Carried at the directive/article level. **National transpositions diverge**
(registration duties, sector nuances, enforcement practice) — flag member-state
specifics for local counsel rather than ruling on them, and say which member
state's regime the readiness call assumes.
