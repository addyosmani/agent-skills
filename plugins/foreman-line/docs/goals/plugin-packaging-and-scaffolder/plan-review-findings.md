# Plan-Level Adversarial Review — Findings and Coordinator Triage

**Goal:** plugin-packaging-and-scaffolder
**Charter reviewed:** `charter.md` @ `c14d525` (Gate 1 ratified 2026-07-29)
**Review directive:** `../../kickstarters/plan-review-packaging-scaffolder.md` @ `b882002`
**Reviewer:** fresh frontier session, no coordinator context
**Triaged:** 2026-07-29

Review quality: high. Every code-grounded claim was independently verified against this checkout
before triage (COORDINATOR-PATTERN: reviews rank, owners decide; reproduce before ruling). One
finding (N1) was rejected because its premise is absent from the charter. The reviewer correctly
declined to manufacture findings and correctly assessed that no parcel is missing.

---

## Coordinator verification of code-grounded claims

| Claim | Method | Result |
|---|---|---|
| `assertJqlSafeToken` charset is `[A-Za-z0-9._-]` and rejects `@` | read `registration/src/jql.ts:19-33` | **Confirmed.** `@` is char 64; the allowlist admits 48-57, 65-90, 97-122, 45, 46, 95 only |
| The assignee literal is fixed *because* the guard would reject it | read `dispatch/src/query/index.ts:78-83` | **Confirmed verbatim:** "it contains `@` which assertJqlSafeToken rejects, so it is not interpolated through the guard" |
| Charter says "Config becomes the single authority" (S1) | grep | **Confirmed** at `charter.md:48` |
| Charter says "green chain" in D12 (N1) | grep for `green chain`, `sealed chain`, `chain` | **Refuted.** Zero occurrences of any. The phrase was never in the ratified text |
| P3 and P4 share the skill-injection surface (S2) | grep | **Confirmed.** `charter.md:195` lists `foreman/skill-injection.yaml` as a generated artifact (P3); `:244` renames `integration.jira` (P4) |

**Material nuance the reviewer surfaced without drawing the conclusion:** `jql.ts:2-5` states the
charset's purpose is to "reject any token carrying a character that could break out of the quoted
JQL literal," and both builders interpolate into *already-quoted* positions
(`summary ~ "${stableId}"`, `assignee = "..."`). `@` is not a breakout character — it is merely
outside a charset deliberately over-narrowed for spec-filename stems and project keys. This is what
makes B2 resolvable without weakening the control, and it directly determines the ruling below.

---

## Triage

| # | Rank | Finding | Disposition | Action |
|---|---|---|---|---|
| B1 | blocking | D9a's gap-driven detection cannot distinguish *absent* from *present under a divergent convention*; on an F9-shaped repo the generator creates `docs/specs/` beside an existing `docs/PARCELS/` and manufactures the drift the goal exists to remove | **fix** — coordinator-flagged pre-review; reviewer confirmed and proposed the detection-side remedy | Amend D9a with an equivalent-layout pre-check that refuses. **Re-opens Gate 1 for D9a only** |
| B2 | blocking | P4 is internally contradictory: D10 moves the dispatch queue identity to config, P4 routes every config value through `assertJqlSafeToken`, and that guard rejects `@` — so an email assignee cannot satisfy both | **fix** — coordinator ruling below; no locked decision changes | Rewrite P4's mechanism clause. D10 unchanged |
| S1 | should-fix | D12's "Config becomes the single authority" conflates bypass-prevention with merge-prevention. `bypass_actors: []` closes the bypass path (structural); an agent executing `gh pr merge` after a human approval is not a bypass and is prevented only by the coordinator stopping (behavioral) | **fix** — clarification; D12's rule is unchanged, so no Gate 1 re-open | Strike the "single authority" framing; name both controls distinctly |
| S2 | should-fix | The P3/P4 independence claim is false — they share the skill-injection key surface, and the outcome depends on order | **fix** | Sequence P4 → P3. Wave 2 becomes sequential |
| S3 | should-fix | All five exit criteria can pass while the objective is unmet; none proves `/goal` can actually operate against the generated files | **fix** | Add criterion 6 (dry-run preflight against a fixture spec) |
| S4 | should-fix | D14's optionality claim lacks the test that would prove it: declared capability with no map entry must be a no-op | **fix** | Add verification item 8 |
| S5 | should-fix | P6's `routing_class: standard-feature` understates the integration seam between two new subsystems, where a defect is silently invisible on every future `/goal` | **fix** | P6 → `architecture/risk` |
| S6 | should-fix | "Foreman-internal paths" in exit criterion 4 is unenumerated, so the grep is not reproducible | **fix** | Enumerate the exact pattern list |
| N1 | nit | "green chain" in D12 implies verification the system lacks; replace with "sealed chain" | **reject** — premise absent. `chain` occurs 0 times in the charter; the phrase was never ratified text. The underlying observation is already captured as F3 and correctly scoped out in §1 | none |
| N2 | nit | The linter's vocabulary resolution order (baked-in base + `foreman/config.yaml` extensions) is implied, not stated | **fix** | Specify in §4.4 |
| N3 | nit | SPEC-CONVENTION §11 requires a standalone coordinator-ratified amendment commit before the `involves:` schema change is implemented; this dependency is implicit in P4 | **fix** | Make explicit in P4 |

**Totals:** 10 fix, 1 reject. Gate 1 re-opens for **D9a only**.

---

## Coordinator rulings

### Ruling 1 — B2: how P4 parameterizes the dispatch queue identity

P4's blanket "every config value goes through `assertJqlSafeToken`" is withdrawn as
over-general — it is correct for token-shaped values and impossible for address-shaped ones. Replaced
by a two-path rule, in preference order:

**Preferred — avoid the charset problem entirely.** Where the tracker supports identity by account
id rather than email (Jira Cloud does: `assignee = <accountId>`), the config holds the account id,
which is token-shaped and passes the existing `assertJqlSafeToken` unmodified. No new assertion, no
widened charset, strongest control retained.

**Fallback — a separate, narrower assertion for quoted-literal positions.** Where an address is
unavoidable, add `assertJqlSafeQuotedLiteral`, distinct from `assertJqlSafeToken` and never a
replacement for it. It permits `@` and admits only an explicit allowlist otherwise, and it must
reject — with an independent refusal test per axis (STANDING-CONSTRAINTS #3: default-deny gates test
every structural invariant independently) — the double quote, the backslash, control characters
including newline and tab, and any character outside the declared set. Justification, and the reason
this is not a weakening: the charset's stated purpose is preventing breakout from a *quoted* literal,
and both call sites already interpolate into quoted positions; `@` cannot terminate a quoted JQL
string.

**Prohibited:** widening `assertJqlSafeToken` itself, or interpolating a config-sourced address into
an unquoted position. Either converts a hardcoded identity into an injection vector while calling it
portability. If neither path is implementable for a given tracker, §9's P4 stop condition fires.

### Ruling 2 — S1: what enforces Gate 3

Accepted in full. Two controls, not one:

- **Structural, config-enforced:** `bypass_actors: []` on `tools protector` means no actor satisfies D12's delegation condition, so the condition evaluates false.
- **Behavioral, coordinator-enforced:** the coordinator stops before any merge call and reports. Nothing in configuration prevents an authenticated session from executing `gh pr merge` once a human approval has satisfied the required-review count — that path is legitimate, not a bypass.

The risk the reviewer identified is real and is the reason this correction matters: an implementer
reading "config is the single authority" would omit the behavioral half, trusting config to enforce
what only behavior can.

### Ruling 3 — N1 rejected

No charter text changes. Recorded so a future reader does not re-derive a fix for a phrase that was
never present. The substantive point — Stage F seals an asserted, not authenticated, merge — stands
as F3 and remains deliberately out of scope per §1.

---

## Amendments to apply

All are charter edits. Those marked ⚠ require Gate 1 ratification before they land.

1. ⚠ **D9a** — add the equivalent-layout pre-check (B1). Proposed text presented for ratification.
2. **§5 P4** — replace the mechanism clause per Ruling 1; add the §11 amendment-commit prerequisite (N3).
3. **D12 / line 48** — strike "Config becomes the single authority"; state both controls (Ruling 2).
4. **§5 Wave 2** — P3 depends on P4; wave is sequential (S2).
5. **§7** — add criterion 6: after scaffolding, `/goal` completes its dry-run preflight in the scaffolded repo against a minimal fixture spec with no errors and no missing-config warnings (S3).
6. **§7 criterion 4** — enumerate the grep patterns: `KONE`, `kaseya`, `clinton.morgan`, `atlassian.net`, `plugins/foreman-line/`, `skills/goal/`, `skills/foreman-shaping/`, `docs/foreman-line/` (S6).
7. **§6** — add item 8: spec declares `involves: [ticketing]` with no map entry in `foreman/config.yaml` → linter passes, dispatch proceeds, no blocking output (S4).
8. **§5 P6** — `routing_class: architecture/risk` (S5).
9. **§4.4** — state linter vocabulary resolution order: baked-in base set from the linter's own version, plus project extensions from `foreman/config.yaml`; project-declared entries are known (no advisory), all others advisory (N2).

---

## Status

**CLOSED 2026-07-29.** D9a ratified as amended (Gate 1 re-opened and cleared for that decision
only). All nine amendments applied to the charter in a single pass. Two consistency edits made while
applying: reviewer focus question 3 was rewritten to drop "validated-passthrough" (withdrawn
terminology from Ruling 1), and verification item 9 was added to cover the amended D9a's refusal path
— B1 changed a decision, so it needed a test, which the review's own remedy did not specify.

Every finding is dispositioned. N1 is the only rejection and its rejection is recorded with the
grep that refutes it, so it cannot be silently re-raised.

**Next:** shape P1 (Wave 1, `architecture/risk`). No parcel has been shaped and no implementation
work has begun.
