---
id: comp-dora
title: DORA (EU Regulation 2022/2554)
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - EU financial entity (bank, insurer, investment firm, payment/crypto provider...)
  - ICT third-party provider serving EU financial entities (contractual flow-down)
  - designated critical ICT third-party provider (CTPP)
why: Directly applicable EU law for financial-sector operational resilience — and its Art. 30 contract clauses flow down to every ICT vendor selling into that sector.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# DORA — Digital Operational Resilience Act (EU 2022/2554)

## Coverage

Directly applicable EU regulation (no national transposition), in force for
financial entities since **17 January 2025**. Covers banks, insurers, investment
firms, payment and crypto-asset providers, and more — **and reaches ICT
third-party providers two ways**: designated **critical ICT third-party
providers (CTPPs)** fall under direct ESA oversight, and *every* ICT vendor
serving a financial entity inherits the **Art. 30 mandatory contractual
provisions** through its customers. Five pillars: ICT risk management, incident
reporting, resilience testing, ICT third-party risk, and information sharing.

## What to assess

- **Posture determination first**: is the org a financial entity (full
  obligations), a CTPP (direct oversight), or an ICT vendor to financial
  entities (contractual flow-down)? The assessment differs materially.
- **For financial entities** — walk the five pillars:
  1. **ICT risk management** (Art. 5–16): management-body responsibility,
     identification/protection/detection/response/recovery functions.
  2. **Incident management & reporting** (Art. 17–23): classification
     methodology, major-incident reporting to the competent authority.
  3. **Resilience testing** (Art. 24–27): testing program; **threat-led
     penetration testing (TLPT)** every 3 years for significant entities.
  4. **ICT third-party risk** (Art. 28–30): register of information, criticality
     assessment, exit strategies, concentration risk, Art. 30 contract terms.
  5. **Information sharing** (Art. 45): participation arrangements.
- **For ICT vendors (the common Kaseya-side engagement)** — assess readiness to
  *accept* Art. 30 clauses: audit/access rights for the customer and regulators,
  incident notification supporting the customer's reporting clocks, defined
  service levels, subcontracting transparency, exit/termination assistance, and
  data location/processing disclosure. Gaps here are deal blockers in
  financial-sector procurement.
- Statuses cite the article (`DORA:Art.30(2)(e)`) and evidence.

## Cross-map anchors

- Pillar 1 maps onto **ISO 27001** and **800-53** spines
  (`comp-iso-27001-family`, `comp-nist-core`) — credit existing mappings.
- Pillar 4 pairs with `comp-cloud-supply-chain`; vendor-register evidence and
  `sec-slsa` findings feed it.
- Incident pillar draws on `sec-ir-continuity`; **NIS2** (`comp-nis2`) is the
  cross-sector sibling — financial entities generally follow DORA as lex
  specialis where the two overlap.

## Coverage limits

Carried at the pillar/article level; the underlying RTS/ITS technical standards
(incident classification thresholds, TLPT methodology, register format) are not
bundled — flag RTS-level detail as follow-up against the ESA publications.
CTPP designation analysis is a legal question; surface it, don't decide it.
