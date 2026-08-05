# Baseline Mapping Method — always-on rules

These rules apply on **every** compliance-audit run, regardless of which framework
modules are selected. Selectable, versioned framework modules live in `../modules/`
(one file each, loaded per the module-loading protocol in SKILL.md).

## Map, don't duplicate

Controls overlap heavily — reconcile through anchors rather than re-auditing the
same control five times:

- **ISO 27001 ↔ NIST 800-53 ↔ CIS Controls** — bridge via **CSA CCM**
  (`comp-cloud-supply-chain`). *(CIS technical detail lives in security-audit's
  `sec-cis-controls`.)*
- **FedRAMP** and **CMMC** both derive from NIST baselines (800-53 / 800-171) —
  a single NIST mapping (`comp-nist-core`) feeds both.
- Record the credit in each control's `cross_map` field — map once, credit
  everywhere.

## Gauge maturity, not just presence

CMMC levels, SAMM, and CIS Implementation Groups assess whether controls *operate
well*, not merely *exist*. A control that exists on paper but has no operating
evidence is **Partially Met** at best — and for Type II-style attestations,
operating history is the whole question.

## Evidence rules

- Every Met/Not-Met needs a reason; "Met" without evidence is an assertion, not an
  audit. "Not Met" needs evidence too — what's missing.
- The strongest evidence is a technical finding (security-audit sidecar,
  tenant-isolation report); documentation is weaker; assertion is weakest. Say
  which kind backs each status.
- Never fabricate control coverage: map at the depth the loaded modules document,
  flag the rest as scoped follow-up.

## Stay ahead of regulation

The EU AI Act (risk-based management + conformity assessment) and expanding U.S.
state privacy laws are moving targets. ISO 42001 and the NIST AI RMF are the
on-ramps to readiness (`comp-ai-governance`).

## Continuous monitoring

NIST SP 800-137 and FedRAMP-style conmon keep attestations from going stale
between audits — a readiness call should say whether anything re-checks posture
after this report lands.
