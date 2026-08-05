---
name: remediation-plan
description: >-
  Turn security/compliance findings, audit results, or any issue backlog into an
  optimized, phased remediation plan — sequenced by risk reduction per unit
  effort, dependency order, fix batching (shared root causes), and obligation
  deadlines, with effort estimates and the findings each item closes. Use
  whenever someone asks "what should we fix first", wants a remediation plan,
  fix roadmap, or plan of attack from an audit report, pentest results, scanner
  output (SARIF/SAST/DAST), or a list of findings — or when audit-conductor
  reaches its remediation phase. Works standalone on any findings source or as
  the audit suite's planning stage; its JSON sidecar feeds the jira-integration
  skill to file the plan as tickets. This skill SEQUENCES fixes; it does not
  discover problems (security-audit) or map controls (compliance-audit).
---

# Remediation Plan

The planning engine of the audit suite — and a standalone planner for any findings
source. A findings list ordered by severity is a *list*; this skill produces a
*plan*: the execution order that retires the most risk for the least effort,
without rework, while hitting every obligation deadline.

**Boundary:** this skill does not discover vulnerabilities (that's
`security-audit`) and does not assess control gaps (that's `compliance-audit`).
It consumes their output — or any other findings source — and sequences the fixes.

The optimization model lives in `references/optimization-model.md`.

---

## Workflow

### 1. Gather and normalize the input

Accept findings from wherever they exist, in priority order:

1. **Audit-suite artifacts** — the consolidated report plus the `security-audit`
   and `compliance-audit` JSON sidecars (`findings` / `controls` arrays). When the
   conductor dispatches this skill, these paths arrive with the invocation; record
   their provenance envelopes.
2. **Any structured findings file** — SARIF, scanner JSON/CSV, a pentest report,
   an existing issue export.
3. **Unstructured input** — a markdown report or a prose list of problems.

Normalize everything into one working set, one entry per finding:
`{ id, severity, title, locator?, effort?, source }`. Synthesize stable ids
(`F-001`…) when the source has none — the plan must trace every item back to
findings by id. If the input is empty or pure opinion with nothing actionable,
say so instead of inventing work.

Before scoring, ask for the two facts only the person knows (skip what's already
on the table): **deadlines** (audit dates, contract gates, renewal windows) and
**capacity/constraints** (freeze windows, teams, anything off-limits).

### 2. Score and sequence

Apply the four axes from `references/optimization-model.md` — risk reduction per
unit effort, dependency order, fix batching, obligation deadlines. Batch findings
sharing a root cause into single remediation items; sequence so no item precedes
its prerequisite and no quick win pre-empts the structural fix that would absorb it.

### 3. Output

Always produce **two artifacts**:

1. **Markdown plan** — phased (e.g. Quick Wins → Structural → Hardening), each
   item carrying effort estimate, findings closed, dependencies, and the risk or
   obligation it retires. Shape and field meanings in
   `references/optimization-model.md`.
2. **JSON sidecar** — machine-readable, the handoff contract for tooling and the
   `jira-integration` skill:

```json
{
  "provenance": {
    "suite_version": "1.1.0",
    "skill": "remediation-plan",
    "inputs": ["audit/security-audit-2026-06-12.json"],
    "date": "2026-06-12"
  },
  "plan": [
    {
      "id": "REM-001",
      "phase": 1,
      "phase_name": "Quick Wins",
      "title": "Enforce MFA on all authentication surfaces",
      "effort": "S",
      "findings_closed": ["SEC-004"],
      "controls_addressed": ["SOC2:CC6.1"],
      "depends_on": [],
      "retires": "High: credential-stuffing exposure; closes SOC 2 CC6.1 gap"
    }
  ]
}
```

`controls_addressed` appears only when compliance input exists; omit otherwise.
Standalone provenance (no suite artifacts) names the raw source instead of
sidecar paths.

**Writing to disk:** when dispatched by the conductor with output paths, write
both artifacts there. Standalone, offer to write once the plan is delivered —
match any existing audit-artifact naming in the target
(`remediation-plan-<YYYY-MM-DD>.md` + `.json`); offer, then write on confirmation.

### 4. Offer the Jira handoff

Once the plan is delivered, offer once: *"Want this filed in Jira — phases as
epics, items as issues? The `jira-integration` skill handles it."* On yes, invoke
`jira-integration` and hand it the sidecar. Don't create tickets yourself, and
don't push if they decline.

---

## Constraints

- **An order, not a re-sort.** If the output is the input sorted by severity, it
  failed. The value is the dependency + batching + effort reasoning.
- **Tie every item back to findings.** An item that closes no finding id or
  control gap is scope creep, not remediation.
- **Estimates are estimates.** Label effort approximate; never present S/M/L
  guesses as commitments.
- **Don't re-audit.** Take the findings as given; flag suspected false positives
  in one line rather than re-investigating.
- **Provenance always.** The sidecar names its inputs — a plan that can't say what
  findings it was built from can't be trusted or diffed.

## References

- `references/optimization-model.md` — the four optimization axes, phase
  structure, per-item fields, and sequencing principles.
- `../security-audit/SKILL.md` / `../compliance-audit/SKILL.md` — sidecar formats
  this skill consumes (when installed as part of the suite).
- `../jira-integration/SKILL.md` — downstream ticket filing (step 4 handoff).
