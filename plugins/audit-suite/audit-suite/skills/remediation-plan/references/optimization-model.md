# Remediation Optimization Model

A findings list orders problems by *severity or obligation*. A remediation plan
re-optimizes for *execution* — the order that retires the most risk for the least
effort without rework. This is the difference between a list and a plan.

---

## The four optimization axes

Score and sequence every finding against all four — not severity alone:

1. **Risk reduction per unit effort.** The real prioritization signal. A
   five-minute config change that closes a Critical beats a two-week refactor that
   closes a Medium. Estimate effort (S/M/L or hours/days) and weigh it against
   the severity and blast radius the fix retires.

2. **Dependency order.** Some fixes unblock or prerequisite others. Sequence so you
   never:
   - fix something a later structural change will tear out (wasted work), or
   - schedule a fix whose prerequisite isn't done yet (blocked work).
   Centralizing auth, for instance, comes before hardening each endpoint's auth
   check — do it in the wrong order and you redo the endpoints.

3. **Fix batching.** Group findings that share a root cause, a file, or a system
   touchpoint into one remediation. Five findings that all trace to "no input
   validation layer" are one fix, not five. Batching cuts effort and stops the same
   code being reopened repeatedly.

4. **Obligation deadlines.** Anything gating a mandatory framework or a contractual
   date gets pulled forward enough to hit that date, even if its risk/effort score
   alone wouldn't rank it first. A SOC 2 audit in three weeks reorders the plan.

---

## Output shape

A phased plan someone can execute top-to-bottom. Suggested phases (adapt to the
findings):

- **Phase 1 — Quick Wins:** high risk-reduction, low effort, no dependencies. The
  fixes that make the next audit visibly better by Friday.
- **Phase 2 — Structural:** root-cause fixes that close batches of findings and
  unblock later work (the centralized auth layer, the validation middleware, the
  secrets-management migration).
- **Phase 3 — Hardening:** lower-severity, defense-in-depth, and polish items that
  depend on the structural work being done first.

For **each item** in the plan, state:

| Field | Why |
|---|---|
| **Effort estimate** | So it can be slotted into real capacity. |
| **Findings closed** | The finding IDs this item retires (from the normalized set). |
| **Dependencies** | What must be done first / what this unblocks. |
| **Risk or obligation retired** | The severity or framework gap this closes. |

The markdown plan and the JSON sidecar carry the same items — the sidecar adds
`phase`/`phase_name` and machine-stable ids (`REM-001`…) so downstream tooling
(`jira-integration`, dashboards, diffs against the next run) can key off them.

---

## Principles

- **An order, not a re-sort.** If the output is the gap list sorted by severity, it
  failed. The value is the dependency + batching + effort reasoning that produces a
  *sequence*.
- **Quick wins are real, but don't let them bury structural work.** Surfacing easy
  fixes first builds momentum; just don't let a pile of Low-severity quick wins
  delay the root-cause fix that closes twelve findings at once.
- **Honor deadlines without distorting everything.** Pull obligation-gated items
  forward enough to hit the date — not so far that the whole plan becomes
  deadline-driven theater.
- **Tie every item back to findings.** No remediation item should exist that doesn't
  close a specific finding or control gap. If it does, it's scope creep, not
  remediation.
- **Estimates are estimates.** Label effort as approximate; don't present
  S/M/L guesses as commitments.
