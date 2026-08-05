# Industry & Profile → Module Mandate Matrix

The conductor's decision brain. Given an organization profile, this resolves which
**modules** (see `module-registry.yaml`) are **mandatory** (legally/contractually
required), **expected** (de facto procurement gates), and **recommended**
(strengthen posture). The resolved set feeds the Phase 2b selection menu, where the
person can adjust it.

Frameworks marked *(baseline)* are always-on methodology inside the specialists
(security-audit's `baseline-lenses.md`, compliance-audit's `baseline-mapping.md`) —
they don't need selecting.

**Resolution order:** data types → sector mandates → contractual obligations →
deployment → AI surface → maturity goals. A profile usually triggers several rows;
union them, then dedupe via the cross-mapping anchors (a single NIST 800-53 mapping
feeds both FedRAMP and CMMC).

---

## 1. Trigger by data type handled

| If the org handles… | Mandatory | Expected / Recommended |
|---|---|---|
| **Cardholder data** (PAN, CVV) | PCI DSS 4.0 `comp-pci-dss` | ASVS for the payment app `sec-owasp-asvs` |
| **Protected health info (PHI)** | HIPAA `comp-hipaa-hitrust` | HITRUST (same module — payer/provider procurement gate), SOC 2 `comp-soc2` |
| **Controlled Unclassified Info (CUI)** | NIST 800-171; CMMC 2.0 L2+ if DoD `comp-cmmc` | 800-172 / CMMC L3 (same module) |
| **Federal Contract Info (FCI)** | CMMC 2.0 L1 `comp-cmmc` | — |
| **EU resident personal data** | GDPR `comp-privacy` | ISO 27701 (same module) |
| **California resident personal data** | CCPA/CPRA `comp-privacy` | ISO 27701 (same module) |
| **PII generally (at scale)** | Applicable regional privacy law `comp-privacy` | ISO 27018 `comp-iso-27001-family`, SOC 2 Privacy criterion `comp-soc2` |

---

## 2. Trigger by sector

| Sector | Mandatory / Expected | Recommended |
|---|---|---|
| **Healthcare (provider/payer/health-tech)** | `comp-hipaa-hitrust` | `comp-iso-27001-family`, `comp-soc2` |
| **Financial services / fintech** | `comp-pci-dss` (if cards); `comp-dora` (EU financial entity); `comp-soc2` | `comp-iso-27001-family`, CSF *(baseline)*, regional regs (GLBA, etc. — coverage gap) |
| **Managed service provider (MSP/MSSP)** | `comp-nis2` (EU customers — explicitly in-scope sector); `comp-soc2` | `comp-dora` (financial-sector customers flow down Art. 30), `comp-cloud-supply-chain`, `sec-slsa` |
| **U.S. federal / public sector** | `comp-fedramp` (cloud); `comp-nist-core` baselines | `comp-nist-core` (RMF), `sec-ir-continuity` (conmon) |
| **U.S. defense industrial base** | `comp-cmmc` | `comp-cloud-supply-chain` (800-161) |
| **SaaS / B2B technology** | `comp-soc2` (procurement gate) | `comp-iso-27001-family`, `sec-owasp-asvs`, `sec-cis-controls` |
| **Critical infrastructure / ICS** | Sector regs (NERC CIP, etc. — **coverage gap, flag it**) | ATT&CK for ICS *(baseline)*, CSF *(baseline)*, IEC 62443 (coverage gap) |
| **AI/ML product company** | EU AI Act if EU-facing `comp-ai-governance` | `comp-ai-governance` (ISO 42001), `sec-ai-security` |

> If a sector regulation here has no module (NERC CIP, GLBA, IEC 62443), flag it
> as a coverage gap rather than silently skipping it. Don't fabricate control
> detail you don't have.

---

## 3. Trigger by contractual / market obligation

| Obligation | Pull |
|---|---|
| "Customer requires a SOC 2 Type II" | `comp-soc2` |
| "Selling to U.S. federal agency" | `comp-fedramp` (+ `comp-nist-core`) |
| "DoD prime/subcontract" | `comp-cmmc` at the level the contract specifies |
| "EU market entry" | `comp-privacy`; `comp-nis2` if an in-scope sector (incl. MSP/MSSP); `comp-ai-governance` if AI-enabled |
| "Selling to EU banks / insurers / financial entities" | `comp-dora` (Art. 30 contractual flow-down) |
| "Enterprise procurement / RFP security questionnaire" | `comp-iso-27001-family`, `comp-soc2`, `sec-cis-controls` as evidence base |
| "Cloud vendor due diligence" | `comp-cloud-supply-chain` (CCM + STAR) |

---

## 4. Trigger by what's under audit (scope object)

| Scope object | Lead skill | Primary modules |
|---|---|---|
| **Source code / repo** | security-audit | baseline lenses; `sec-owasp-asvs` if web-facing |
| **Web / API application** | security-audit | `sec-owasp-asvs` |
| **Cloud infra / IaC** | security-audit → compliance-audit | `sec-cis-controls`, `sec-zero-trust`, `comp-cloud-supply-chain`, `comp-nist-core` |
| **CI/CD pipeline** | security-audit | `sec-slsa`, `comp-cloud-supply-chain` (800-161) |
| **AI / agentic system** | security-audit (threat) + compliance-audit (gov) | `sec-ai-security`, `comp-ai-governance` |
| **Whole organization** | both, sequenced | `comp-nist-core` as the spine; layer by rows 1–3 |
| **Vendor / third party** | compliance-audit | `comp-cloud-supply-chain` |
| **Multi-tenant system** | external lens between specialists | `review-tenant-isolation` (registry `external_lenses`) |

---

## 5. Trigger by AI surface (always check)

Any AI/ML or agentic component in scope engages the AI lens — this is not optional
for an AI-inclusive platform.

| Condition | Pull |
|---|---|
| Any AI/ML system | `sec-ai-security` (AI RMF Measure/Manage) — **mandatory** |
| Generative / LLM component | `sec-ai-security` (AI 600-1 profile) |
| **Agentic system with tools** | `sec-ai-security` (agentic threat vectors) |
| Seeking AI governance certification | `comp-ai-governance` (ISO 42001) |
| EU-facing AI | `comp-ai-governance` (EU AI Act) — **mandatory** |

---

## 6. Trigger by maturity goal

| Goal | Pull |
|---|---|
| "Stand up a risk program from scratch" | `comp-nist-core` (RMF as the lifecycle spine) |
| "Benchmark our maturity" | `sec-owasp-asvs` (SAMM), `sec-cis-controls` (Implementation Groups), `comp-cmmc` (levels) |
| "Prove continuous posture, not point-in-time" | `sec-ir-continuity` (800-137), `comp-fedramp` (conmon) |
| "Reconcile overlapping audits" | `comp-cloud-supply-chain` (CCM as the cross-map hub) |
| "Board / governance review" | `comp-cobit` |

---

## Resolution example

> *"We're a health-tech SaaS, store PHI, sell to hospital systems and one VA
> contract, and we're shipping an LLM triage assistant."*

Union of triggers:
- PHI → `comp-hipaa-hitrust` (**mandatory**)
- SaaS/B2B → `comp-soc2` (expected) + `comp-iso-27001-family` (expected)
- VA contract (federal cloud) → `comp-fedramp` (**mandatory**) + `comp-nist-core` (expected)
- LLM agentic assistant → `sec-ai-security` (**mandatory**) + `comp-ai-governance`
  (expected; mandatory if EU-facing)
- Web app surface → `sec-owasp-asvs` (expected)

Phase 2b menu pre-selects that set (mandatory-first); the person adjusts or
accepts. Sequence: **security-audit** (`sec-owasp-asvs`, `sec-ai-security`) →
**compliance-audit** (`comp-hipaa-hitrust`, `comp-fedramp`, `comp-nist-core`,
`comp-soc2`, `comp-iso-27001-family`, `comp-ai-governance`). Consolidate with a
gap roadmap ordered mandatory-first.

---

## Guardrails

- **Mandatory before recommended.** Never bury a legal requirement under a
  nice-to-have. Order every output mandatory → expected → recommended.
- **Don't invent coverage.** If a profile needs a framework no module documents
  (HIPAA control detail, NERC CIP, IEC 62443, GLBA), say so explicitly and scope
  it as a follow-up. A confident-sounding fabricated control map is worse than a
  named gap.
- **Union, then dedupe.** Most profiles hit multiple rows. Combine, then collapse
  overlaps through the cross-map anchors so the same control isn't audited five
  times.
- **The matrix recommends; the person decides.** The resolved set is the menu's
  pre-selection, not a verdict — Phase 2b lets them run any combination.
