# Baseline Lenses — always-on methodology

These lenses apply on **every** security-audit run, regardless of which modules are
selected. They are methodology, not selectable scans — there is no profile where
skipping them makes sense. Selectable, versioned framework modules live in
`../modules/` (one file each, loaded per the module-loading protocol in SKILL.md).

| Lens | Role |
|---|---|
| **NIST CSF 2.0** | Top-level outcome taxonomy (Govern, Identify, Protect, Detect, Respond, Recover) — frames every finding's place in the program. |
| **STRIDE** | Per-component threat-modeling taxonomy. |
| **MITRE ATT&CK** | Knowledge base of adversary TTPs across OS, cloud, mobile, ICS. Common language for threat-informed defense and detection. |
| **NIST SP 800-218 (SSDF)** | High-level secure-development practices for any SDLC: reduce vuln count, limit exploit impact, address root causes. |
| **SABSA / TOGAF** | Enterprise security & solution architecture method — for architecture-level reviews. |

## Using the baseline

- **ATT&CK grounds STRIDE** — every STRIDE category should resolve to concrete
  TTPs, not abstractions.
- **SSDF frames code/pipeline findings** — map them to the practice that would
  have prevented them; SSDF practices ↔ ASVS requirements ↔ SAMM activities are
  one finding seen through three lenses (see `sec-owasp-asvs`).
- **CSF 2.0 organizes the report** — when summarizing posture, the six functions
  are the spine.
- **Gauge maturity, not just presence.** A control that exists but doesn't operate
  is a finding.

## Boundary

Control/attestation mapping (NIST 800-53/171, SOC 2, FedRAMP, CMMC, ISO 27001,
HIPAA, PCI…) is **compliance-audit's** lane — tag findings technically and hand
governance concerns off in the report's Handoff Notes.
