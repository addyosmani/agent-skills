---
description: Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision
---

Invoke the `shipping-and-launch` skill.

`/ship` is a **fan-out orchestrator**. It runs three specialist agents in parallel against the current change, then merges their reports into a single go/no-go decision with a rollback plan. The agents operate independently — no shared state, no ordering — which is what makes parallel execution safe and useful here.

## Phase A — Parallel fan-out

Dispatch all three agents in **one `task` call** with three `tasks[]` items. One call is one wave: sequential calls defeat the purpose of this command.

```json
{
  "context": "# Goal\nPre-launch verification of the current change. Report only findings in your own lane; do not delegate to another agent.",
  "tasks": [
    { "name": "CodeReview", "agent": "code-reviewer", "task": "Five-axis review (correctness, readability, architecture, security, performance) of the staged changes or recent commits. Output the standard review template.", "solutionSpace": "Review verdicts and severity are open; no known defect." },
    { "name": "SecurityAudit", "agent": "security-auditor", "task": "Vulnerability and threat-model pass. Check OWASP Top 10, secrets handling, auth/authz, dependency CVEs. Output the standard audit report.", "solutionSpace": "Threat model is open; no known vulnerability." },
    { "name": "Coverage", "agent": "test-engineer", "task": "Test coverage analysis for the change. Identify gaps in happy path, edge cases, error paths, and concurrency scenarios. Output the standard coverage analysis.", "solutionSpace": "Coverage gaps are open; no known missing test." }
  ]
}
```

If a persona is unavailable in this harness, run its system prompt from `agents/<role>.md` sequentially in the main context and treat the output as if returned in parallel — the merge phase still works.

Constraints:
- Each agent gets its own context and returns only its report to this main session.
- Do not let one persona delegate to another — keep the fan-out flat.
- For richer multi-agent collaboration where teammates talk to each other instead of just reporting back, see `references/orchestration-patterns.md`.

**Persona resolution.** If you have your own `code-reviewer`, `security-auditor`, or `test-engineer` agent definition in `.omp/agents/` or your user agent directory, those take precedence over this plugin's versions — `/ship` picks up your customizations automatically, because agent discovery resolves your definitions before plugin ones.

## Phase B — Merge in main context

Once all three reports are back, the main agent (not a sub-persona) synthesizes them:

1. **Code Quality** — Aggregate Critical/Required findings from `code-reviewer` and any failing tests, lint, or build output. Resolve duplicates between reviewers.
2. **Security** — Promote any Critical/High `security-auditor` findings to launch blockers. Cross-reference with `code-reviewer`'s security axis.
3. **Performance** — Pull from `code-reviewer`'s performance axis; cross-check Core Web Vitals if applicable.
4. **Accessibility** — Verify keyboard nav, screen reader support, contrast (not covered by the three agents — handle directly here, or invoke the accessibility checklist).
5. **Infrastructure** — Env vars, migrations, monitoring, feature flags. Verify directly.
6. **Documentation** — README, ADRs, changelog. Verify directly.

## Phase C — Decision and rollback

Produce a single output:

```markdown
## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source persona: Critical finding + file:line]

### Recommended fixes (should fix before ship)
- [Source persona: Important finding + file:line]

### Acknowledged risks (shipping anyway)
- [Risk + mitigation]

### Rollback plan
- Trigger conditions: [what signals would prompt rollback]
- Rollback procedure: [exact steps]
- Recovery time objective: [target]

### Specialist reports (full)
- [code-reviewer report]
- [security-auditor report]
- [test-engineer report]
```

## Rules

1. The three Phase A agents run in parallel — never sequentially.
2. Personas do not call each other. The main agent merges in Phase B.
3. The rollback plan is mandatory before any GO decision.
4. If any persona returns a Critical finding, the default verdict is NO-GO unless the user explicitly accepts the risk.
5. **Skip the fan-out only if all of the following are true:** the change touches 2 files or fewer, the diff is under 50 lines, and it does not touch auth, payments, data access, or config/env. Otherwise, default to fan-out. `/ship` is designed for production-bound changes — when the blast radius is non-trivial, run the parallel review even if the diff looks small.
