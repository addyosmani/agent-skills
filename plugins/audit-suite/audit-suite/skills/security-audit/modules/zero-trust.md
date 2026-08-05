---
id: sec-zero-trust
title: Zero Trust (NIST 800-207 + CISA ZTMM 2.0)
owner: security-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - any cloud or hybrid design review
  - cloud infrastructure / IaC in scope
  - zero-trust posture or maturity scoring requested
  - network segmentation or implicit-trust architecture under review
why: Mandatory lens for any cloud or hybrid design review — the architecture reference and maturity model for "never trust, always verify."
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# Zero Trust — NIST SP 800-207 + CISA ZTMM 2.0

## Coverage

**NIST SP 800-207** — the zero-trust architecture reference: policy engine /
policy administrator / enforcement points, identity-centric access, no implicit
trust by network location.

**CISA Zero-Trust Maturity Model 2.0** — operationalizes 800-207 across five
pillars (**Identity, Devices, Networks, Applications & Workloads, Data**) with
cross-cutting Visibility/Analytics, Automation/Orchestration, and Governance.
Aligns to EO 14028. Four maturity stages: Traditional → Initial → Advanced → Optimal.

## What to assess

- Where does **implicit trust** survive — flat networks, IP-allowlist-as-auth,
  long-lived credentials, service-to-service calls without identity?
- Score each ZTMM pillar at its maturity stage; the deltas between pillars are
  findings (Optimal identity + Traditional network = a bypass path).
- Per-request access decisions: is authorization continuous and contextual, or a
  perimeter checkpoint?
- IaC review: security groups, peering, service identities, and secret-distribution
  patterns against least-privilege.
- Tag findings `ZTMM:<pillar>` or `800-207:<tenet>`.

## Cross-map anchors

- ZTMM governance and visibility findings feed **800-53** AC/AU/SC families and
  **ISO 27001** A.5/A.8 on the compliance side.
- Identity findings pair with ASVS authn/session chapters when a web surface is
  also in scope — one finding, both tags.

## Coverage limits

Maturity scoring is evidence-based: score a pillar only from artifacts actually
examined (configs, IaC, auth flows). Pillars without evidence are "not assessed",
not "Traditional".
