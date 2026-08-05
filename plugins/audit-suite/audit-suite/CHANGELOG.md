# Changelog — audit-suite

All notable changes to the audit-suite plugin are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); the suite versions with
[semver](https://semver.org/).

## Versioning policy

- **Suite version** = `plugin.json` version. It is the install/update/rollback unit.
  - **Patch** — framework-module content fixes or wording changes.
  - **Minor** — new module, new menu/selection capability, non-breaking dispatch-spec or sidecar additions.
  - **Major** — breaking changes to the module schema, registry schema, dispatch spec, or sidecar format.
- **Module versions** are independent semver, declared in each module's frontmatter
  (`skills/*/modules/*.md`). Any module bump entails at least a suite **patch** bump,
  with a line here naming the module, e.g.
  `- security-audit/owasp-asvs 1.0.0 → 1.1.0: added ASVS 5.0 deltas`.
- **Disabling a module** (`status: disabled` in its frontmatter) is a local install
  decision, not a release event — it needs no version bump.
- **Rollback** = install a prior plugin version from the marketplace.

## [1.2.0] - 2026-06-15

Three accountability capabilities — all wired into the active audit workflow.

- **Owner assignment** — every finding and control gap now carries a populated `owner`
  field. The conductor collects a `default_owner` in Phase 1 (new dimension 7) and
  passes it via the dispatch spec; both specialists inherit it for every finding and
  control gap, with per-domain override guidance. Critical / High findings in
  standalone runs prompt for an owner before finalising. Unowned items surface in
  Phase 4.5 for resolution.
- **Risk acceptance sign-off (new Phase 4.5)** — new conductor phase gates Critical /
  High security findings and Mandatory compliance gaps through an explicit
  accept / remediate / defer decision before the remediation plan is offered. Accepted
  risks are written to the consolidated report's `## Accepted Risks` table, to sidecar
  JSON (`accepted_risk` / `risk_acceptance` fields), and to a standalone
  `risk-acceptance-log.md`. Phase 5 receives the decisions so `remediation-plan` can
  exclude accepted risks from sequencing and attribute items to their owners. A finding
  that is neither remediated nor accepted remains an open gap — risks are never
  silently dropped.
- **Tool transparency surfaced** — `audit-conductor/references/tool-transparency.md`
  (access scope, adversarial-input defenses, point-in-time limitations) is now linked
  from a `## Notice` block at the top of every consolidated and specialist report.
  Previously only discoverable as a reference document; now shown to every reader on
  every run. The doc itself graduated owner assignment and risk acceptance from
  "Planned capabilities" to "Active capabilities".
- **Consolidated report restructured** — template gains `## Notice` (point-in-time
  snapshot warning with link to tool-transparency), `## Accepted Risks`, and owner
  attribution on every finding and gap row. Two new routing table entries and a new
  principle ("Name every risk; accept none silently") added to the conductor.
- **Sidecar JSON** — `owner` and `accepted_risk` / `risk_acceptance` fields were
  reserved as `null` since 1.0.0 for forward compatibility; they are now actively
  populated by the workflow. No schema changes required.

## [1.1.0] - 2026-06-12

Two new composable skills — both usable standalone or by other skills/plugins.

- **`remediation-plan`** (new skill): turns audit findings — suite sidecars, SARIF,
  pentest reports, or any findings list — into an optimized, phased execution plan
  sequenced by risk reduction per unit effort, dependency order, fix batching, and
  obligation deadlines. Emits a JSON sidecar (`plan` items with stable `REM-…` ids,
  findings closed, dependencies) for downstream tooling. The conductor's Phase 5
  now dispatches this skill; the optimization model moved here from
  `audit-conductor/references/remediation-planning.md`.
- **`jira-integration`** (new skill): files structured work items as Jira issues —
  remediation-plan phases become epics, items become tasks with priority, labels,
  and `Blocks` links. Mandatory dry-run preview before any ticket is created;
  idempotent re-runs via stable-id summary prefixes; supports Atlassian MCP, acli,
  the REST API, or a CSV-import fallback. Optionally writes issue keys back into
  the consumed sidecar for traceability.
- **Conductor**: Phase 5 renamed "Remediation plan and Jira filing" — delegates to
  the new skills; routing table rows added for "what should we fix first" and
  "file these in Jira".
- **Specialists**: standalone runs now offer the `remediation-plan` handoff after
  delivering their report (suppressed when the conductor orchestrates).

## [1.0.0] - 2026-06-12

Initial release.

- **Three skills**: `audit-conductor` (profiles the target, recommends scan
  modules, renders the selection menu, sequences the specialists, consolidates),
  `security-audit` (technical findings with severity, locator, impact,
  remediation), and `compliance-audit` (framework control mapping and
  audit-readiness assessment).
- **19 framework modules**, each independently versioned and toggleable via
  frontmatter (`version`, `status`, `tier`, `applies_when`):
  - *security-audit*: OWASP ASVS+SAMM, CIS Controls v8.1, SLSA, Zero Trust
    (800-207 + CISA ZTMM — mandatory for cloud/hybrid scope), AI & Agentic
    Security (NIST AI RMF / AI 600-1 / agentic threat vectors), IR & Continuity.
  - *compliance-audit*: NIST core (800-37/800-53), SOC 2, ISO 27001 family,
    FedRAMP, CMMC/800-171 (with the full 110-requirement Level 2 catalog),
    PCI DSS 4.0, HIPAA/HITRUST, Privacy (GDPR/CCPA/ISO 27701), AI Governance
    (ISO 42001 / EU AI Act), NIS2, DORA, Cloud & Supply Chain (CSA CCM/800-161),
    COBIT 2019.
- **Module registry** (`audit-conductor/references/module-registry.yaml`) —
  identity + routing index; all other metadata lives in module frontmatter.
  `review-tenant-isolation` registered as an external lens for multi-tenant targets.
- **Recommend-then-choose selection**: profile-driven recommendations
  pre-selected in a checklist menu; any combination of modules can run.
  Power-user fast path skips profiling when frameworks are named.
- **Headless dispatch** (`dispatch-spec.md`): YAML specs with pinned module
  id@version selections for parallel/worktree execution.
- **Audit provenance**: reports and JSON sidecars record the suite version and
  every module version that produced them, so results are reproducible and
  comparable across time.
