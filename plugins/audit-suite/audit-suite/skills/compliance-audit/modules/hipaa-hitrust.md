---
id: comp-hipaa-hitrust
title: HIPAA + HITRUST CSF
owner: compliance-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - creates, receives, maintains, or transmits PHI
  - covered entity or business associate
  - health-tech selling into hospital systems or payers (HITRUST)
why: HIPAA is a U.S. legal mandate for any entity touching PHI; HITRUST is the procurement gate that proves it to payers and providers.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# HIPAA (Security & Privacy Rules) + HITRUST CSF

## Coverage

**HIPAA** — U.S. mandate for protected health information (PHI). **Security Rule**
= administrative/physical/technical safeguards for ePHI; **Privacy Rule** =
use/disclosure limits and patient rights; **Breach Notification Rule** = disclosure
duties. Enforced by HHS OCR. Applies to covered entities **and business
associates** (BAAs flow obligations down).

**HITRUST CSF** — certifiable framework harmonizing HIPAA, ISO 27001, NIST, and
PCI into one assessable control set. De facto procurement gate for payer/provider
relationships; consolidates multiple mandates into one audit.

## What to assess

- Fix where **ePHI** lives and flows; confirm BAA posture for every third party
  touching it.
- Map technical evidence to **Security Rule safeguard categories**:
  administrative (risk analysis, workforce, contingency), physical, technical
  (access control, audit controls, integrity, transmission security). The
  required-vs-addressable distinction matters — "addressable" still demands a
  documented decision.
- Privacy Rule and Breach Notification posture are largely documentary (notices,
  procedures, minimum-necessary) — assess from policies, not code.
- Statuses cite the safeguard category (`HIPAA:164.312(a)`) and evidence.
- HITRUST: position the org's gap to a validated assessment at the framework
  level (which mandates it consolidates), and note that certification scoping is
  its own engagement.

## Cross-map anchors

- HITRUST harmonizes HIPAA ↔ ISO 27001 ↔ NIST ↔ PCI — an 800-53/ISO mapping
  (`comp-nist-core`, `comp-iso-27001-family`) pre-feeds most of it.
- Access/audit findings from security-audit land in the technical-safeguards
  column directly.

## Coverage limits

Safeguard-level HIPAA control text and the full HITRUST catalog aren't bundled
here. Map at the rule/safeguard-category level and scope deep control-by-control
mapping as follow-up — **don't fabricate safeguard specifics.**
