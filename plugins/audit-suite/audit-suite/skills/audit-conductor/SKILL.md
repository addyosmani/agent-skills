---
name: audit-conductor
description: >-
  Orchestrates a complete security and compliance audit by first profiling the
  organization, application, industry, and data types, then determining exactly
  which frameworks apply and dispatching the security-audit and compliance-audit
  skills in the right order. Use this skill whenever someone wants to audit or
  assess an organization, app, or system but hasn't specified which standards
  apply — e.g. "audit our platform", "are we secure and compliant", "what do we
  need for SOC 2 / FedRAMP / a federal deal / handling card data / a health-tech
  product", "where do we start with our security posture", or any broad
  security/compliance assessment request. Use it even when the person names only
  one side (just security, or just compliance) but the scope clearly implies both.
  This is the front door for the audit suite — prefer it over jumping straight
  into security-audit or compliance-audit when scope or applicable frameworks
  are not yet pinned down.
---

# Audit Conductor

The orchestration layer for the audit suite. The conductor does the *thinking* —
who is this org, what are they actually obligated to, what's under the lens — then
hands execution to two specialists:

- **`security-audit`** — finds technical problems (threat models, vulns, findings
  with severity/locator/remediation).
- **`compliance-audit`** — maps posture to named control frameworks and
  attestations (gap analysis, control matrices, audit-readiness).

Framework knowledge lives in **versioned, toggleable modules** owned by the
specialists; `references/module-registry.yaml` indexes them. The conductor's job
is to resolve *which modules* run, in the *right order*, then consolidate the
output into one decision-ready report. Don't audit anything directly here —
profile, recommend, let the person choose, dispatch, consolidate.

---

## The phases

Phase 0 is a fast path. Otherwise run Phases 1–4 in order — an audit scoped
against the wrong frameworks is wasted work. Phase 5 is optional, offered at the end.

### Phase 0 — Fast path (explicit selections)

If the request already names specific frameworks or modules ("just OWASP",
"SOC 2 + PCI only", "run sec-slsa and comp-fedramp"), skip profiling:

1. Resolve names → module ids via the registry + module frontmatter titles.
2. Confirm in one line: *"Running `sec-owasp-asvs` + `comp-soc2` against <target>
   @ <branch>, standard depth — go?"*
3. **Mandate safety net:** if the named set obviously misses a legal mandate
   visible in scope (PHI in the repo but no HIPAA), say so in one sentence — then
   **honor the selection**. Power users get what they asked for.

Compliance-only selections are legal; warn once that the control mapping will be
assertion-based without security findings, then proceed.

### Phase 1 — Profile the target

Gather what's needed to resolve applicable frameworks. Ask only for what's missing;
infer from context where the answer is already on the table. The dimensions that
matter:

1. **Organization type & sector** — SaaS, healthcare, fintech, federal, defense,
   critical infrastructure, etc.
2. **Scope object** — what's actually under audit: a repo, a web/API app, cloud
   infra/IaC, a CI/CD pipeline, an AI/agentic system, a vendor, or the whole org.
   *For a repo:* fix the boundary now — the active checkout, **main branch by
   default**, sibling worktrees and nested clones out of scope. If a non-trivial
   alternative branch exists (`dev`, a release branch) and the person hasn't named
   one, ask once which branch they want. This boundary goes into the dispatch spec
   so both specialists audit the same surface — scope drift between branches/worktrees
   is the top cause of divergent findings across runs.
3. **Data types handled** — PII, PHI, cardholder data (CHD), CUI/FCI, and the
   residency of that data (EU, California, etc.).
4. **Contractual & market obligations** — "customer wants SOC 2", "selling to a
   federal agency", "DoD subcontract", "entering the EU market".
5. **AI surface** — is there any AI/ML or agentic component? If it has tools, that's
   a first-class attack surface, not a footnote.
6. **Maturity goal** — first-time program, benchmarking, continuous-monitoring
   proof, or reconciling overlapping audits.
7. **Primary finding owner** — who is accountable for remediation? Collect a name,
   email, or team handle. Stored as `default_owner` in the dispatch spec and
   inherited by every finding and control gap; individual items can be overridden at
   the risk-acceptance step. Skip the question when the answer is obvious from
   context (a solo founder, a named CISO already mentioned). If no one is named, set
   `default_owner: null` — Phase 4.5 will surface unowned items.

Use the elicitation UI for these when interactive — tappable options beat prose
questions. Keep it to the few dimensions you actually can't infer.

### Phase 2 — Build the catalog and recommend

1. Read `references/module-registry.yaml`, then read **only the frontmatter**
   (first ~15 lines) of every listed module in one scripted pass — that yields
   the catalog: id, title, version, status, tier, triggers, one-line why.
2. **Drift tripwire:** glob `../*/modules/*.md` and compare against the registry.
   Flag any module file without a registry row (or row without a file) in the
   run output; don't silently ignore either.
3. Evaluate each enabled module's `applies_when` against the profile, using
   `references/industry-mandate-matrix.md` to assign tiers — **Mandatory**
   (legal/contractual), **Expected** (procurement gates), **Recommended**
   (posture). The matrix resolves to module ids.
4. Dedupe through the cross-map anchors (one NIST mapping feeds FedRAMP and CMMC;
   CCM bridges ISO ↔ 800-53 ↔ CIS) so the same control isn't audited five times.

> **Honesty gate:** if the profile needs a framework no module documents (NERC
> CIP, GLBA, IEC 62443, deep HIPAA control detail), name it as a coverage gap and
> scope it as follow-up. A fabricated control map is worse than a flagged gap.
> This is non-negotiable.

### Phase 2b — Selection menu (recommend, then let them choose)

Render the catalog as a checklist and let the person pick **any combination** —
mechanics in `references/module-selection.md`. In short:

1. Show every **enabled** module, grouped Security / Compliance, with `[x]`/`[ ]`
   pre-reflecting the Phase 2 recommendation, its tier badge, and a one-line
   why — profile-specific where a trigger fired (*"PHI in scope → mandatory"*).
   Disabled modules appear only as a one-line footnote.
2. Offer four choices: **run recommended set** / **mandatory tier only** /
   **everything enabled** / **adjust** (free-text add/remove, e.g. "add sec-slsa,
   drop comp-cobit" — re-render once, confirm).
3. Any mix across both specialists is legal, including compliance-only (state the
   assertion-based-evidence caveat once) or security-only.
4. If more than ~8 modules land on one specialist, suggest headless dispatch —
   that many module bodies in one interactive pass dilutes attention.

The selected set — module ids with their **pinned versions** — is frozen here and
passed downstream. Specialists never re-derive selection.

### Phase 3 — Dispatch the specialists

Default sequence: **security-audit first, compliance-audit second.** Find the
problems, *then* map them to controls — a compliance matrix built on unexamined
code is theater.

Two execution modes:

- **Interactive** — invoke each specialist skill directly (`security-audit`, then
  `compliance-audit`), stating its selected modules (id@version) explicitly, and
  surface findings as you go. Best for a single app or focused scope.
- **Headless / dispatch** — write one YAML dispatch spec per specialist (scope,
  `modules` with pinned versions, depth, output paths) per
  `references/dispatch-spec.md`, then hand each spec to a downstream Claude Code
  agent (typically on a worktree) to execute. Best for large or parallelizable
  scope. Write the specs to disk and verify them against the real target before
  trusting any scope narrative.

**Pass `default_owner` in the dispatch spec.** Include the `default_owner` from
Phase 1 (dimension 7) in every specialist dispatch spec so both specialists populate
the `owner` field on every finding and control gap without re-asking. If
`default_owner` is `null`, specialists leave the field `null` — don't invent one.

**Conditional lens — multi-tenant systems.** When the profile is a multi-tenant
system (and especially a .NET/KaseyaOne codebase), dispatch the
`review-tenant-isolation` skill (an **external lens** — see the registry's
`external_lenses` block) between security-audit and compliance-audit. Its isolation
findings feed compliance-audit as evidence for SOC 2 CC6, ISO 27001 A.5/A.8, and
GDPR Art. 32. If the skill isn't installed, note the gap in the consolidated
report and continue.

### Phase 4 — Consolidate

Merge both specialists' output into one report. Structure:

```
# Audit Report — [target]
## Notice               (⚠ Point-in-Time Snapshot — [date]. This report reflects the scoped codebase at
                          the moment the audit ran — not sustained enforcement. Controls present cannot be
                          confirmed as consistently applied over time; formal auditors require 6–12 months
                          of evidence. See audit-conductor/references/tool-transparency.md for full access
                          scope, adversarial-input defenses, and what these reports are and are not.)
## Executive Summary    (posture in 3–5 sentences; mandatory gaps called out first)
## Scope & Frameworks   (what was audited, against what, and why; default_owner named here)
## Security Findings    (from security-audit: severity-ranked; each finding includes owner and remediation)
## Compliance Posture   (from compliance-audit: per-framework gap analysis; each gap includes owner)
## Gap Roadmap          (prioritized: mandatory → expected → recommended)
## Accepted Risks       (findings and controls marked accepted in Phase 4.5: owner | item | justification | date | review-by)
## Coverage Notes       (anything flagged as out-of-scope, undocumented, or registry drift)
## Provenance           (suite version; every module id@version used; external lenses run or skipped)
```

The roadmap is the payload — order it so a mandatory legal gap never sits below a
recommended polish item. The specialists' sidecars are provenance envelopes; read
their `findings` / `controls` arrays, including the `owner` and `accepted_risk` /
`risk_acceptance` fields populated by the specialists and confirmed in Phase 4.5.

**Persist the artifacts — both modes.** The consolidated report and the specialist
sidecars should land on disk: written automatically to the spec'd output paths in
**headless** mode, and **offered** to the person in **interactive** mode (then
written on confirmation). Match any existing audit-artifact naming convention in the
target rather than inventing one — the specialists carry the same rule.

**Then run Phase 4.5** before offering the remediation plan.

### Phase 4.5 — Risk acceptance sign-off

Before offering the remediation plan, surface any Critical or High security findings
— and any Mandatory compliance gaps — that are not yet assigned a fix timeline. For
each, ask the named owner to choose:

1. **Remediate** — add to the roadmap; no further action here.
2. **Accept** — record: who accepted, the justification, and a review-by date (no
   longer than 12 months for Critical/High; 6 months for Mandatory Non-Compliant).
3. **Defer** — acknowledged but undecided; set a check-back date.

Write accepted and deferred decisions into:
- The `## Accepted Risks` table in the consolidated report — owner | finding or control | justification | date accepted | review-by.
- The `accepted_risk` field on each finding in the security-audit sidecar; the
  `risk_acceptance` field on each control in the compliance-audit sidecar.
- A standalone `risk-acceptance-log.md` alongside the audit artifacts, if writing to disk.

**Gate rule:** never record an acceptance without explicit owner confirmation. If the
owner is unavailable, leave the field `null` and flag the item for follow-up. A
finding that is neither remediated nor accepted is an open gap — not a resolution.

Once sign-off is complete (or the person passes on this step), offer the remediation
plan in one line: *"Want me to turn the open items into an optimized remediation plan
— sequenced by dependency, effort, and risk reduction?"*

### Phase 5 — Remediation plan and Jira filing (optional, on request)

The gap roadmap says *what's* wrong, ordered by obligation. A remediation plan says
*how to fix it in the smartest order*. On request, dispatch the **`remediation-plan`**
skill (in-suite) against the consolidated artifacts — pass it the report path and
both specialists' sidecars (including the `accepted_risk` / `risk_acceptance`
decisions from Phase 4.5, so the skill can exclude accepted risks from sequencing and
attribute each item to its `owner`). It owns the optimization model (risk reduction
per unit effort, dependency order, fix batching, obligation deadlines) and produces a
phased plan plus its own JSON sidecar; don't replicate that reasoning here.

`remediation-plan` then offers to file the plan in Jira via the **`jira-integration`**
skill (phases → epics, items → issues, idempotent on re-run) — let it make that
offer; don't duplicate it. If the person asks for Jira tickets *without* wanting a
plan first ("just file the findings"), dispatch `jira-integration` directly with the
security-audit sidecar — it previews the full batch and gets confirmation before any
ticket is created.

---

## Routing quick-reference

| The person says… | Conductor does |
|---|---|
| "Audit our platform" | Phases 1–4, both specialists |
| "Just OWASP / only SOC 2 and PCI" | Phase 0 fast path — resolve, confirm, dispatch |
| "Are we compliant?" | Profile → recommend → menu → compliance-audit leads, security-audit feeds evidence |
| "Is our app secure?" | Profile (light) → security modules lead; flag compliance if obligations surface |
| "What do we need for SOC 2 / FedRAMP / a federal deal?" | Profile → mandatory set → menu → dispatch |
| "We handle [PHI/cards/CUI]…" | Matrix rows 1–2 → surface mandatory modules → confirm → dispatch |
| "Audit our AI agent" | Profile → `sec-ai-security` (mandatory) + `comp-ai-governance`, both specialists |
| "What should we fix first?" / "make a remediation plan" | Phase 5 — dispatch `remediation-plan` on the latest consolidated artifacts |
| "File these in Jira / create tickets" | Dispatch `jira-integration` (preview + confirm before any ticket is created) |
| "Disable / skip [framework] this run" | Deselect in the menu; permanent disable = `status: disabled` in the module's frontmatter |
| "Who owns this?" / "assign this finding" | Phase 1 dimension 7 — collect `default_owner`; Phase 4.5 — surface unowned Critical/High/Mandatory items for assignment |
| "We accept this risk" / "mark as accepted" | Phase 4.5 — record owner, justification, and review-by date; write to the Accepted Risks log and sidecars |

---

## Principles

- **Profile before you audit.** The wrong framework set produces confident, useless
  findings.
- **Recommend, then let them choose.** The person can run any module combination;
  the conductor's job is to make the default set the *right* set.
- **Mandatory before recommended**, everywhere — in the menu, the dispatch, the
  roadmap.
- **Security finds, compliance maps.** Keep the lanes clean; the specialists enforce
  their own boundaries, the conductor enforces the sequence.
- **Name gaps, never fake coverage.** A flagged unknown beats a fabricated control
  map every time.
- **Provenance or it didn't happen.** Every report names the suite version and the
  module versions that produced it.
- **Verify scope against ground truth.** In headless mode especially, confirm the
  target on disk before trusting any status narrative.
- **Name every risk; accept none silently.** A finding without an owner is unrouted
  work. An unreviewed risk is not an accepted risk — it is an open gap. Phase 4.5 is
  the gate between the consolidated report and the remediation plan; don't skip it.

## References

- `references/module-registry.yaml` — the suite module index (identity + routing;
  all other metadata lives in module frontmatter).
- `references/module-selection.md` — menu mechanics, fast-path resolution,
  disabled-module behavior (Phases 0, 2b).
- `references/industry-mandate-matrix.md` — profile → module-id resolution with
  tiers (Phase 2).
- `references/dispatch-spec.md` — the headless handoff contract, with pinned
  module selections (Phase 3).
- `../remediation-plan/SKILL.md` and `../jira-integration/SKILL.md` — the in-suite
  skills Phase 5 dispatches; they also run standalone.
- `references/tool-transparency.md` — what the suite can and cannot see, adversarial-
  input defenses, and report caveats. Linked from every consolidated report's Notice
  section; read this to calibrate trust in audit output.
