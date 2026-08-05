# Audit Suite

**Ask Claude to audit your application — and get back a decision-ready security
and compliance report.**

Point it at a codebase and it profiles what you're building, recommends which
security scans and compliance frameworks actually apply (CMMC L2, SOC 2, HIPAA,
PCI, GDPR, NIS2, and more), lets you pick any combination, runs the assessment,
and delivers one consolidated report: what's wrong, what's at risk, how ready you
are for a real audit, and what to fix first. Then — if you want — it turns the
report into an **optimized remediation plan** and files the work **straight into
Jira** as epics and tasks.

No security or compliance expertise required to use it. The suite recommends; you
choose; it explains why at every step.

---

## Who this is for

| You are… | What you get |
|---|---|
| **An executive or VP** | A consolidated report you can read top-down: posture in plain English, legal/contractual gaps called out first, per-framework readiness calls ("would we pass a SOC 2 audit today?"), and a prioritized roadmap. You don't run the scan — your team does, in minutes, and hands you the report. |
| **An engineering leader** | Audit-readiness assessments aligned to the frameworks your contracts name — CMMC L2 (all 110 NIST 800-171 requirements), SOC 2, FedRAMP, HIPAA, PCI DSS, GDPR/NIS2/DORA — with evidence-backed control matrices and an honest statement of what the scan can and cannot see. Plus a remediation plan your teams can execute as-is — phased, effort-estimated, deadline-aware — delivered as Jira epics and tasks if you want it on the board. |
| **An engineer** | A one-command scan in Claude Code that finds real issues with file:line locators, concrete impact, and specific fixes — no "follow best practices" hand-waving — plus machine-readable JSON output for tooling, and tickets that arrive pre-triaged with priority, dependencies, and the findings they close. |

---

## Quick start (5 minutes)

**Prerequisites:** [Claude Code](https://claude.com/claude-code) installed, and a
checkout of the repository you want to assess. That's it.

**1. Install the plugin** (once). Run these in any terminal — you don't need to
download or copy anything first; the first command fetches the
`KaseyaOne/kaseya-one-productivity-tools` repository from GitHub and registers it as a
plugin marketplace, and the second installs the suite from it. Claude Code
manages where it lives.

```bash
claude plugin marketplace add KaseyaOne/kaseya-one-productivity-tools
claude plugin install audit-suite@kaseya-one
```

(The CLI above works everywhere. The interactive `/plugin` command does the same
thing but only inside a terminal session — see the FAQ if it reports it "isn't
available in this environment". No GitHub access? Clone the repo anywhere and
point the first command at the local path, e.g.
`claude plugin marketplace add C:\path\to\kaseya-one-productivity-tools`.)

**2. Open a Claude Code session in the repo and say:**

```
Audit this repo.
```

**3. Answer a few plain-English questions** — what sector you're in, what data
the app handles, any contract requirements (e.g. "customer wants SOC 2"),
whether there's an AI component. "Not sure" is a valid answer.

**4. Pick your scans from the menu.** Claude shows every available scan with its
recommendations pre-selected and a one-line reason for each. Accept with one
tap, or adjust freely.

**5. Read the report.** Findings, compliance posture, and gap roadmap — written
to disk alongside machine-readable JSON. Then, if you want them: an optimized
remediation plan, and Jira tickets created straight from it (see below).

**Already know what you need?** Skip the questions entirely:

```
Audit this repo — just OWASP and SOC 2.
```
```
Run a CMMC L2 readiness assessment on this repo.
```

---

## What the report looks like

One consolidated document, ordered so the most consequential items come first:

```
# Audit Report — payments-api
## Executive Summary     Posture in 3–5 sentences. Mandatory legal/contractual gaps first.
## Scope & Frameworks    What was audited, against which frameworks, and why.
## Security Findings     Severity-ranked. Each: file:line locator, impact, specific fix.
## Compliance Posture    Per-framework control matrices: Met / Partially Met / Not Met, with evidence.
## Gap Roadmap           Prioritized: legal mandates → procurement gates → posture improvements.
## Coverage Notes        What was scoped out or couldn't be assessed — named, never papered over.
## Provenance            Exact suite + framework-module versions that produced this report.
```

Illustrative excerpt (fictional):

> **Executive Summary.** The service is broadly well-engineered but is **not
> CMMC L2 ready today**: 81 of 110 requirements are Met, 12 Partially Met, 9 Not
> Met, 8 Not Applicable. The Not-Met set clusters in audit logging (3.3.x) and
> FIPS-validated cryptography (3.13.11). No SSP or POA&M exists — these
> documents gate the assessment regardless of technical posture. Estimated
> effort to assessment-ready: one focused quarter.

Every claim in a report traces to evidence — a finding at a file:line, a config,
or a document. Where evidence doesn't exist, the report says "not assessed"
rather than guessing. That honesty is deliberate (see FAQ).

---

## From report to fixes

Two follow-on skills turn the report into tracked work — each works on its own,
too:

- **`remediation-plan`** — sequences the findings into a phased execution plan
  (Quick Wins → Structural → Hardening), optimized for risk retired per unit of
  effort, dependency order, batched root-cause fixes, and your audit/contract
  deadlines. Each item says what it costs, what findings it closes, and what it
  unblocks. Also works standalone on any findings source — a pentest report,
  scanner output, an issue list.
- **`jira-integration`** — files the plan in Jira: phases become epics, items
  become tasks with priority, labels, and dependency links. You always see a full
  preview before a single ticket is created, and re-running never duplicates
  issues — existing tickets get updated instead. Works standalone on any
  work-item list, via Atlassian MCP, the acli CLI, or the Jira REST API (no Jira
  access at all? You get a CSV you can import).

```
Audit this repo. … Now make a remediation plan and file it in Jira under SEC.
```

Illustrative plan excerpt (fictional):

> **Phase 1 — Quick Wins** *(~3 dev-days total)*
> | # | Item | Effort | Closes | Retires |
> |---|---|---|---|---|
> | REM-001 | Enforce MFA on all authentication surfaces | S | SEC-004 | High: credential stuffing; SOC 2 CC6.1 gap |
> | REM-002 | Pin base images + enable Dependabot | S | SEC-009, SEC-011 | Two supply-chain Highs in one change |
>
> **Phase 2 — Structural** — REM-005 *Centralize input validation middleware*
> (M, closes SEC-002/003/007/012 — four findings, one root cause; unblocks REM-008…)

Every plan item traces back to specific finding IDs from the report, and effort
labels are estimates, not commitments. When it lands in Jira, each ticket carries
that same traceability — the findings it closes, what blocks it, and the exact
suite version that produced it.

---

## Framework coverage

19 framework modules, each independently versioned and individually
enable/disable-able:

| Area | Modules |
|---|---|
| **Application & supply-chain security** | OWASP ASVS + SAMM · CIS Controls v8.1 · SLSA (build/supply-chain) · Zero Trust (NIST 800-207 + CISA ZTMM) · Incident Response & Continuity |
| **AI systems** | AI & Agentic Security (NIST AI RMF, prompt injection, tool abuse…) · AI Governance (ISO 42001, EU AI Act) |
| **U.S. federal & defense** | NIST 800-37/800-53 · FedRAMP · **CMMC 2.0 / NIST 800-171 — full 110-requirement Level 2 catalog** |
| **Attestations & sector mandates** | SOC 2 · ISO 27001/27017/27018 · PCI DSS 4.0 · HIPAA + HITRUST |
| **Privacy & EU regulation** | GDPR/CCPA + ISO 27701 · **NIS2** (MSPs explicitly in scope) · **DORA** (EU financial sector, incl. vendor flow-down) |
| **Governance & cloud** | CSA CCM/STAR + NIST 800-161 supply chain · COBIT 2019 |

Always-on methodology (STRIDE threat modeling, MITRE ATT&CK, NIST CSF 2.0, SSDF)
underpins every run and isn't something you need to select.

---

## FAQ

**Is this a real audit or certification?**
No. It's an **audit-readiness assessment**. It tells you — honestly — whether
you'd pass a real SOC 2 / CMMC / ISO assessment and what closes the gap.
Certifications still require accredited assessors (auditors, C3PAOs). The suite's
value is arriving at that engagement prepared instead of surprised.

**Does our code leave our machines?**
The scan runs inside your Claude Code session and is governed by the same data
handling as the rest of your organization's Claude usage. Reports are written to
your local disk; nothing is published anywhere by the suite.

**Do I need to know these frameworks?**
No. Describe your business in plain English ("we're a SaaS handling health data,
one federal contract") and the suite derives what applies — including mandates
you didn't know to ask about. Naming frameworks is a shortcut, never a requirement.

**How long does a scan take?**
A focused repo at standard depth typically runs in one session — minutes, not
days. Large scopes can be dispatched to parallel background agents ("run it
headless").

**What can't it see?**
Anything not on disk: personnel screening, physical security, whether a policy
is actually followed. Reports cap their readiness claims accordingly and say
which evidence is missing — a green dashboard that fails the real audit helps
no one. Legal interpretation (e.g., GDPR lawful-basis calls) is flagged for
counsel, not decided.

**What if a framework we need isn't covered?**
The suite **names the gap** in the report rather than improvising — and adding a
framework is one module file plus one registry line. Request it; coverage grows
from real demand.

**Can it create the Jira tickets for us?**
Yes. After (or without) a remediation plan, the suite can file the work in Jira —
epics per phase, tasks per item, priorities and dependency links set. It shows
you the full batch first and creates nothing until you approve; re-running
updates existing tickets instead of duplicating them. Needs Jira access in your
session (Atlassian MCP, the acli CLI, or a Jira API token); without it, you get
a CSV you can import.

**Can I run just one scan? Can I skip compliance and just check security?**
Yes. Any combination of the 19 modules is valid — one framework, security-only,
compliance-only, or everything.

**Something's wrong with one framework — can we switch it off without breaking the rest?**
Yes: set `status: disabled` in that module's file. It vanishes from menus and
scans; everything else is untouched. Re-enable by flipping it back.

**How do updates and rollback work?**
The suite is a versioned plugin. Update with
`claude plugin marketplace update kaseya-one`; roll back by installing a prior
version. Every report records the exact suite and module versions that produced
it ([CHANGELOG](CHANGELOG.md) has the history), so results are reproducible and
comparable across time.

**`/plugin` says it "isn't available in this environment" — now what?**
The `/plugin` slash command opens an interactive dialog that only exists in
interactive terminal sessions; the desktop app and other non-interactive
environments don't have it. Use the CLI from any terminal instead —
`claude plugin marketplace add KaseyaOne/kaseya-one-productivity-tools` then
`claude plugin install audit-suite@kaseya-one` — same result, works everywhere.

**How do I roll this out to a whole team?**
Pin it in a repo's `.claude/settings.json` and Claude Code auto-discovers it on
startup for everyone who opens that repo — no install commands, no dialogs:

```json
{
  "extraKnownMarketplaces": {
    "kaseya-one": {
      "source": { "source": "github", "repo": "KaseyaOne/kaseya-one-productivity-tools" }
    }
  },
  "enabledPlugins": { "audit-suite@kaseya-one": true }
}
```

**Who do I contact?**
The repository owners — open an issue on
[kaseya-one-productivity-tools](https://github.com/KaseyaOne/kaseya-one-productivity-tools)
or reach the platform team directly.

---

## Operating the suite (admins & contributors)

Every framework lives in its own module file with self-describing frontmatter:

```yaml
---
id: comp-soc2
title: SOC 2 (Trust Services Criteria)
version: 1.0.0
status: enabled        # ← flip to `disabled` to switch it off
tier: expected         # mandatory | expected | recommended (when triggered)
applies_when: [service provider handling customer data, ...]
why: De facto B2B procurement gate; ...
---
```

| Task | How |
|---|---|
| **Update one framework** (e.g. a new OWASP release) | Edit its module file, bump its `version`, add a changelog line — nothing else changes |
| **Disable a framework** | `status: disabled` in its frontmatter — out of menus and dispatches instantly |
| **Add a framework** | New module file in the owning skill's `modules/` + one row in `skills/audit-conductor/references/module-registry.yaml` |
| **Audit the audit** | Every report's Provenance section names the module versions used; the CHANGELOG maps versions to content changes |

**Architecture in one paragraph:** `audit-conductor` profiles the target,
recommends modules via its mandate matrix, renders the selection menu, and
dispatches the two specialists in sequence — `security-audit` finds technical
problems (it never self-attests compliance), then `compliance-audit` maps those
findings to framework controls as evidence (it never invents vulnerabilities).
They compose through JSON sidecars with provenance envelopes. Multi-tenant
targets get a third lens (`review-tenant-isolation`) between the two. Two
follow-on skills consume the consolidated output: `remediation-plan` (optimized
fix sequencing, with its own sidecar) and `jira-integration` (sidecar → epics and
tasks, preview-gated and idempotent). Every skill also works standalone —
specialists fall back to globbing their own `modules/`, and the follow-on pair
accepts any findings or work-item source, not just suite artifacts.
