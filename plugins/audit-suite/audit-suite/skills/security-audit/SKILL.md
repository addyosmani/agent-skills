---
name: security-audit
description: >-
  Perform a technical security audit of code, configs, containers, IaC, CI/CD
  pipelines, live services, or agentic AI systems, producing severity-ranked
  findings with locators, remediation, and framework mappings. Use whenever
  someone asks to review, audit, check, harden, or assess the security of
  anything technical — a repo, a Dockerfile, a Pulumi/Terraform stack, a GitHub
  Actions workflow, a running API, a multi-agent system, or an architecture.
  Also use when they mention OWASP, CVEs, vulnerabilities, prompt injection,
  tool/permission abuse, supply-chain risk, or ask "is this secure?" This skill
  FINDS technical problems. It does NOT map controls to compliance frameworks
  (SOC 2, FedRAMP, CMMC, NIST 800-53/171, ISO 27001) — that's the compliance-audit
  skill. If both are needed, run this first, then compliance-audit; or let
  audit-conductor sequence them.
---

# Security Audit

The technical findings engine. This skill produces **problems with evidence** —
severity-ranked findings, each with a locator, an impact, a concrete remediation,
and a framework tag. It does not produce compliance attestations; it produces the
raw material that a compliance audit later maps to controls.

**Boundary:** if the request is "map us to SOC 2 / which 800-53 controls do we
satisfy", that's `compliance-audit`. This skill answers "what's wrong and how bad."

Framework knowledge is **modular**: always-on methodology lives in
`references/baseline-lenses.md`; selectable, versioned framework modules live in
`modules/` (one file each, with `version`/`status`/`tier`/`applies_when`
frontmatter).

---

## Workflow

### 0. Pin the scope boundary (do this first)

Before reading a single file, fix what's in scope. Repo audits drift when this is
left implicit — and scope drift is the main reason two runs of this audit disagree.

- **Audit the active checkout only.** The base repository at its current working
  tree. Treat it as the whole world.
- **Ignore sibling worktrees.** Git worktrees, nested clones, `vendor/`,
  `node_modules/`, and any checkout that isn't the active tree are **out of scope** —
  do not descend into them, do not flag their contents, do not hesitate over them.
  If you encounter one, note its existence in one line and move on.
- **Default to the main branch.** Audit whatever the main/default branch resolves to
  unless told otherwise.
- **Ask before auditing a different branch.** If the person hasn't specified a
  branch and a non-trivial alternative exists (e.g. `dev`, `develop`, a release
  branch), ask once whether they want that branch instead of main — then proceed
  with their answer. Don't audit several branches "to be safe"; one branch per run.

If invoked by the conductor, the scope boundary (repo path + branch) arrives in the
dispatch spec (format: audit-conductor's `references/dispatch-spec.md`) — honor it,
don't second-guess it. State the resolved boundary in one
line at the top of the run so it's auditable: *"Scope: <repo> @ <branch>, active
checkout only."*

### 1. Identify the target class

The always-on baseline (`references/baseline-lenses.md`: CSF 2.0, STRIDE, ATT&CK,
SSDF) applies to every class; each class also has primary selectable modules:

| Target | Primary modules |
|---|---|
| Source code / repo | baseline lenses; `sec-owasp-asvs` if web-facing |
| Web / API application | `sec-owasp-asvs` |
| Container / image | `sec-cis-controls`, image provenance (`sec-slsa`) |
| IaC (Pulumi/Terraform/CFN) | `sec-cis-controls`, `sec-zero-trust`, least-privilege review |
| CI/CD pipeline | `sec-slsa` (+ baseline SSDF) |
| Live service / running API | baseline (STRIDE + ATT&CK), runtime exposure |
| **AI / agentic system** | `sec-ai-security` — **mandatory, see step 2** |

A real target is often several of these at once (a repo *with* IaC *and* a
pipeline). Audit each surface with its lens; don't force one lens across all.

**Enumerate before you audit, so runs are repeatable.** First walk the in-scope tree
and list every surface present — app code, IaC, containers, CI/CD config, secrets
handling, dependency manifests, auth/session code, AI/agentic components. Write that
inventory down as the run's coverage list *before* diving into any one surface. Then
audit each item and mark it covered. This is what stops two runs from diverging:
findings can vary with depth, but the set of surfaces examined should not. If a
surface is present but you consciously skip it (out of depth, out of scope), say so
explicitly in the Scope section rather than silently omitting it.

### 2. Load framework modules

Resolve which modules drive this run — **never load module bodies you won't use**:

1. **Dispatched by the conductor?** The spec's `modules` field is the selection —
   pinned ids and versions. Don't re-derive it.
2. **Invoked directly?** Resolve the catalog: read
   `../audit-conductor/references/module-registry.yaml` if it exists; otherwise
   glob this skill's own `modules/*.md` (standalone-install fallback).
3. **Filter by frontmatter first.** Read only each module's frontmatter block
   (the first ~15 lines), then keep modules that are `status: enabled` AND match
   the target (an `applies_when` trigger fires, or the person named the framework).
   Never read the body of a disabled or unselected module.
4. **Disabled modules are inert.** If the person explicitly names a disabled
   module, say it's disabled in this install and ask whether to proceed without
   it — never silently enable it.
5. **AI surface ⇒ `sec-ai-security` is mandatory.** Any AI/ML or agentic component
   in scope loads that module — this is not optional and not subject to selection.
6. **Record provenance.** Note each loaded module's `id` and `version`; they go in
   the report and sidecar. If a dispatch pin doesn't match the installed version,
   proceed with the installed version and record both, flagging the mismatch.

### 3. Set depth

- **Triage** — fast pass, high-severity and obvious issues only.
- **Standard** — full STRIDE/ASVS sweep of the in-scope surface.
- **Deep** — standard plus data-flow tracing, threat modeling, and adversarial
  reasoning (what would an attacker chain?).

If invoked by the conductor, depth and module selection arrive in the dispatch
spec — don't re-derive them. If invoked directly, default to Standard and confirm.

### 4. Run the audit

Work each surface against the baseline lenses plus its loaded modules. For every
issue, capture:

- **Severity** — Critical / High / Medium / Low / Info, by realistic impact × ease
  of exploitation. Don't inflate; a wall of Criticals trains the reader to ignore
  them.
- **Locator** — file:line, resource name, endpoint, or component. Findings without
  locators aren't actionable.
- **Impact** — what an attacker gains. Concrete, not "could be dangerous".
- **Remediation** — the specific fix, not "follow best practices".
- **Framework tag** — which lens flagged it (STRIDE category, ASVS requirement,
  ATT&CK technique, AI threat vector), plus the module id where one applies.
- **Owner** — populate from the conductor's `default_owner` in the dispatch spec
  when present. For Critical / High findings in a standalone interactive run, prompt
  for an owner before finalizing. If genuinely unknown, set `null` — the conductor's
  Phase 4.5 will surface unowned items.

### 5. Output

Always produce **two artifacts**:

1. **Markdown report** — human-readable, this structure:

```
# Security Audit — [target]
## Notice             (⚠ point-in-time snapshot — reflects [target] @ [branch/commit] as of [date];
                       does not assess whether controls have been consistently applied over time;
                       see ../audit-conductor/references/tool-transparency.md for access scope and adversarial-input handling)
## Summary            (posture + finding counts by severity)
## Scope              (boundary: repo @ branch, active checkout; depth; modules loaded as id@version)
## Coverage           (surfaces enumerated; each marked covered or explicitly skipped)
## Findings           (severity-ranked; each: locator, impact, remediation, framework tag)
## Threat Model       (Deep audits / AI systems: attack paths considered)
## Recommendations    (prioritized remediation order)
## Handoff Notes      (anything for compliance-audit: governance gaps, control-relevant findings)
```

2. **JSON sidecar** — machine-readable findings for the conductor to consolidate
   and for compliance-audit to map. A provenance envelope wrapping one object per
   finding:

```json
{
  "provenance": {
    "suite_version": "1.0.0",
    "skill": "security-audit",
    "modules": [{ "id": "sec-owasp-asvs", "version": "1.0.0" }],
    "date": "2026-06-12"
  },
  "findings": [
    {
      "id": "SEC-001",
      "severity": "High",
      "title": "...",
      "locator": "src/auth/session.ts:42",
      "impact": "...",
      "remediation": "...",
      "framework_tags": ["STRIDE:Spoofing", "ASVS:V3.2"],
      "module": "sec-owasp-asvs",
      "owner": null,
      "accepted_risk": null
    }
  ]
}
```

`module` names the module that flagged the finding; omit it for baseline-lens
findings. `owner` is populated from the dispatch spec's `default_owner` or from the
per-finding prompt (Critical / High, standalone run). `accepted_risk` remains `null`
until the conductor's Phase 4.5 sign-off — never set it unilaterally. The sidecar is
what makes the suite compose — compliance-audit consumes these findings as evidence;
don't skip it.

**Writing artifacts to disk — both modes.** In **headless** mode, write the report
and JSON sidecar to the output paths in the dispatch spec. In **interactive** mode,
offer to write them once the report is delivered; if the target already holds audit
artifacts, match their naming convention (e.g. `security-audit-<YYYY-MM-DD>.md` +
`.json`) rather than inventing one. Don't write into the user's tree unprompted —
offer, then write on confirmation.

**Standalone runs only:** once the report is delivered, offer the in-suite
`remediation-plan` skill in one line — it sequences the findings into a phased
execution plan (and can file it in Jira via `jira-integration`). When the
conductor invoked this run, skip the offer; the conductor owns that phase.

---

## Constraints

- **Scope is the active checkout, one branch.** Ignore sibling worktrees and nested
  clones entirely. Don't wander; don't audit multiple branches in one run.
- **Enumerate surfaces before auditing.** A consistent coverage list is what makes
  runs repeatable — skipped surfaces are stated, never silent.
- **Load only selected, enabled modules.** Frontmatter first, bodies only for
  modules that will actually drive findings. Disabled means inert.
- **Audit, don't exploit.** Identify and explain vulnerabilities; never produce
  working exploit code, malware, or anything that operationalizes an attack beyond
  what's needed to demonstrate the finding.
- **Severity honesty.** Calibrate to real impact. Over-flagging is as useless as
  under-flagging.
- **Locators or it didn't happen.** A finding without a locator is an opinion.
- **Stay in lane.** Control/attestation mapping is compliance-audit's job. Tag
  findings to technical frameworks; hand governance concerns off, don't absorb them.

## References

- `references/baseline-lenses.md` — always-on methodology (CSF 2.0, STRIDE,
  ATT&CK, SSDF, SABSA/TOGAF) applied on every run.
- `modules/*.md` — selectable, versioned framework modules (ASVS+SAMM, CIS, SLSA,
  zero trust, AI security, IR/continuity), loaded per step 2.
- `../audit-conductor/references/module-registry.yaml` — the suite-wide module
  index (when installed alongside the conductor).
- `../audit-conductor/references/tool-transparency.md` — access scope, adversarial-
  input defenses, and report caveats; linked from the Notice section of every report.
