---
id: sec-owasp-asvs
title: OWASP ASVS + SAMM (web/API verification)
owner: security-audit
version: 1.0.0
status: enabled
tier: expected
applies_when:
  - web or API application in scope
  - source repo with a web-facing surface
  - procurement spec or test metric needed for app security
why: The baseline technical verification standard for web/API apps; SAMM gauges whether the process behind it actually operates.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# OWASP ASVS + SAMM

## Coverage

**OWASP ASVS** — detailed technical security requirements and verification levels
for web applications. Complements SAMM (process maturity) by covering the
*verification* phase; usable as a test metric or procurement spec.

**OWASP SAMM** — software-assurance maturity model: process/activity coverage
across the SDLC.

They ship as one module because they only work as a pair: **SAMM measures
*process* maturity; ASVS lists the *technical* controls to verify.** SAMM tells
you whether the practice exists, ASVS tells you whether the implementation holds up.

## What to assess

- Work the in-scope web/API surface against ASVS requirement chapters relevant to
  what's present (authn/session, access control, validation/encoding, crypto,
  error/logging, data protection, API-specific requirements).
- Pick the ASVS verification level by exposure: L1 for low-risk, L2 default for
  apps handling sensitive data, L3 for high-value targets.
- Use SAMM to gauge whether each practice *operates well*, not merely *exists* —
  a passing ASVS check with no process behind it decays by next quarter.
- Tag findings `ASVS:<chapter.req>` (e.g. `ASVS:V3.2`) so compliance-audit can map them.

## Cross-map anchors

- ASVS requirements ↔ **NIST SSDF** practices ↔ **SAMM** activities — one finding,
  three lenses; tag once, credit everywhere.
- Access-control and session findings feed SOC 2 CC6 / ISO 27001 A.5 / 800-53 AC
  on the compliance side.

## Coverage limits

This module carries ASVS at the chapter/requirement-family level, not the full
per-requirement catalog text. Cite requirement IDs you can verify against the code
in front of you; don't fabricate requirement numbers from memory at deeper
granularity than you can support.
