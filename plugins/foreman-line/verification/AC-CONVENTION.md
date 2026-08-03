# Named-Test Acceptance-Criteria Convention

**Status:** living convention (non-frozen). Introduced by W3-P1 (Verification Harness).
**Binds:** W3-P1's own spec/tests, SCAF-P3, and every parcel whose acceptance
criteria the Stage-D harness runs as executable checks.
**Authority note:** this is a convention document, not a frozen contract. It is
edited by PR review. It carries no schema and adds no field to any frozen
contract (`HarnessClaimResult`, `ReceiptDocument`, `VerificationVerdict` are all
untouched). It is the reference the harness implementation and SCAF-P3's ACs
both bind to (charter D-stage, plan-review ruling **F2**).

---

## 1. Why this exists

"Acceptance criteria as executable checks" (FOREMAN-LINE-PLAN §2 Stage D.1) has
no meaning until there is a mechanical rule mapping a prose acceptance criterion
to a pass/fail test result. Plan-review finding **F2** ruled that mapping to be
the **named-test convention** defined here: no NLP, no heuristic matching — a
criterion is proven by a test whose *name* names it.

The frozen `HarnessClaimResult.claim` field is a free string; this convention
governs how the harness populates `claim`, `passed`, and `evidence` from a
parcel spec plus a set of test names. No SPEC-CONVENTION amendment is required
(F2 ruling).

---

## 2. Authoring rule — spec side

A parcel spec's Acceptance Criteria (SPEC-CONVENTION §4.3) MUST label each
criterion with a sequential, 1-based ID in the form:

```
AC-1: <criterion text>
AC-2: <criterion text>
...
AC-N: <criterion text>
```

- IDs are `AC-` immediately followed by one or more decimal digits, then a
  colon (`:`), then the criterion text.
- IDs are sequential from `AC-1` with no gaps.
- One criterion per ID. If a criterion needs sub-points, keep them under the
  same `AC-N` — do not mint `AC-1a`.

## 3. Authoring rule — test side

The parcel's test suite MUST contain **at least one test whose name contains
the AC ID** for every `AC-N` in the spec. A single test may cover multiple ACs
by naming each ID it covers. Example (node:test / `tsx --test`):

```ts
test('AC-1: extracts sequential AC labels from the spec body', () => { ... })
test('AC-9: AC with no matching test is reported as a failed claim', () => { ... })
```

An acceptance criterion with **no** test naming it is not "unverified — assume
pass"; it is a **failed** claim (see §5, and lesson #7 — green checks are not
closure). This is the test-count tripwire made mechanical: a spec cannot gain an
AC without a test moving.

---

## 4. Matching rule (harness side) — token boundary

A test **covers `AC-N`** iff its test name contains the token `AC-N` **bounded
on the right by a non-digit character or end-of-string**.

The right-boundary rule is load-bearing: without it the token `AC-1` would
substring-match a test named `"AC-10 ..."`, silently attributing AC-10's result
to AC-1. The bound makes `AC-1` match `"AC-1:"`, `"AC-1 "`, `"...AC-1"` (EOS) but
**not** `"AC-10"`, `"AC-12"`.

Matching is performed with a **linear-time** scan (char-code / `indexOf` /
`startsWith`), never a backtracking regular expression (lesson #19 — the match
must survive the repo's CodeQL polynomial-redos gate). AC-label extraction from
the spec body is likewise linear-time and does not regex over the whole
document.

---

## 5. Reporting rule — one `HarnessClaimResult` per AC

For each `AC-N` extracted from the spec, the harness emits exactly one
`HarnessClaimResult`:

| Test situation for `AC-N` | `passed` | `evidence` |
|---|---|---|
| ≥1 covering test, **all** covering tests passed | `true` | the covering passing test name(s), comma-joined |
| ≥1 covering test, **any** covering test failed | `false` | the failing covering test name(s) |
| **no** covering test | `false` | `no test references AC-N` |

- `claim` is the full reproduced label: `AC-N: <criterion text>`.
- `evidence` is **never empty when `passed` is `true`** — a passing claim always
  cites the test name(s) that prove it. A pass with empty evidence is a defect.
- "All covering tests passed" (not "any") is deliberate: if an AC is named by
  two tests and one fails, the criterion is not met.

---

## 6. Verifier-side matrix checks

The harness also runs the verifier-side matrix checks from
`skill-injection.yaml`'s `verifier_harness:` section (`test-coverage.check` for
all surfaces; `kds-sweep` for `ui/*`; `tenant-isolation` for `tenancy/*`), all
blocking (plan §2 Stage D.1). Each matrix check that applies to the built
surfaces is reported as its own `HarnessClaimResult`:

- `claim` = `matrix:<check-name>` (e.g. `matrix:test-coverage.check`)
- `passed` / `evidence` from the check result

Matrix-check claims sit alongside AC claims in the harness's returned
`HarnessClaimResult[]`; each gets its own Stage-D claim sub-receipt. Any failed
claim — AC or matrix — blocks (the harness reports `blocked: true`); the
pass/rework verdict itself is assembled downstream (W3-P3), not here.

---

## 7. Receipt trail

Each `HarnessClaimResult` the harness emits is recorded as one
`ReceiptDocument { kind: 'claim', stage: 'D', claimRef: <the claim string>,
subjectKind: 'HarnessClaimResult', subject: <the claim result> }`, chained by
`prevHash` into the receipt chain (see the W3-P1 spec for chain mechanics). The
`claimRef` is the AC label (`AC-N: ...`) or `matrix:<check-name>` — this is what
makes the per-claim evidence trail walkable back to the criterion it proves.
