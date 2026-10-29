# Requirement Traceability

Opt-in. Use only when the user asks for traceability or a requirement coverage check, or the spec already carries IDs. Each success criterion gets an ID, each task lists the IDs it makes testable, each test name starts with its ID, and a script reports every ID with no test. "Every requirement has a test" becomes a check, not a judgement call.

**The project carries the convention, not other skills.** No build, test or review skill knows about IDs. Annotating writes everything later phases need into places they already follow: the spec's **Commands** and **Testing Strategy**, each task's **Verify** line, the checker copied into the repo, and CI when the project has it. Leave any of these out and the convention stops at the spec.

Tell whether a spec carries IDs with one grep:

```bash
grep -qE '^[[:space:]]*[0-9]+\.[[:space:]]+[A-Z]{2,5}-[0-9]+:' SPEC.md
```

Never add IDs the user did not ask for. A spec without IDs needs nothing from this file.

## Annotate a Spec and Its Tasks

Run once, after the spec and its tasks exist, before building.

1. Choose the KEY (below) and add a `Requirement key:` line above the spec's **Success Criteria**.
2. Put an ID on each criterion. Split compound ones: one behaviour per ID.
3. In **Testing Strategy**, add the [seam table](#seam-table) and this line: `Test names start with their requirement ID and a colon: CPN-3: rejects expired coupons.` Report any ID in no row: that is a gap, visible before any code.
4. Copy [scripts/check-requirements.mjs](../scripts/check-requirements.mjs) from this skill into the project as `scripts/check-requirements.mjs`, so it runs wherever the skill is not installed. Add it to the spec's **Commands**: `Requirement coverage: node scripts/check-requirements.mjs SPEC.md`.
5. Give each task a `Covers:` line (the [task line](#task-line)) and put the narrowed check in its **Verify** line: `node scripts/check-requirements.mjs SPEC.md CPN-1 CPN-4`. The last task in dependency order verifies with the unnarrowed check. Run the [structural check](#structural-check) and fix what it reports yourself. Ask the user only about an ID that fits no task at all: that is a slicing gap. With no task list (a one-session build), skip this step.
6. If the project has CI, offer to add the unnarrowed check as a step. Add it only on a yes.

Write the changes back where the spec and tasks live: `SPEC.md` and `tasks/todo.md`, or the tracker the plan designates. Then show the user, verbatim, each annotated criterion and each task's `Covers:` and **Verify** lines. This is a report, not a question.

## Requirement ID

Format `<KEY>-<n>`, like `CPN-3`. `KEY` is 2 to 5 uppercase letters chosen per spec. A bare `R3` would collide across specs and count another spec's test as coverage.

**The ID is always followed by a colon, and every match anchors on the colon.** `CPN-1` is a prefix of `CPN-10`, so a match without the colon reports an untested `CPN-1` as covered the moment `CPN-10` gets a test. Grep `"CPN-3:"`, never `"CPN-3"`. Quote the colon in runner filters: `-t "CPN-3:"`.

```markdown
Requirement key: CPN

1. CPN-1: A shopper can apply a coupon at checkout and pays the discounted total.
2. CPN-2: An expired coupon is rejected with a reason.
```

Never renumber or reuse an ID. A withdrawn one stays and is marked `(dropped)` right after the colon: `3. CPN-3: (dropped) ...`.

**Choose the KEY before writing.** Grep for KEYs already in use:

```bash
grep -rhoE '\b[A-Z]{2,5}-[0-9]+:' --exclude-dir={node_modules,.git} \
  --include='*.md' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.py' . \
  | sed -E 's/-[0-9]+:$//' | sort -u
```

This sees KEYs in tests and specs committed to the repo, not in a tracker, so it is best-effort.

## Seam Table

In **Testing Strategy**, map each seam to the IDs it covers:

```markdown
| Seam | Requirement IDs |
| --- | --- |
| POST /checkout | CPN-1, CPN-2 |
| waived: needs a real payment provider | CPN-4 |
```

An ID that will not be tested gets a `waived: <reason>` row. A requirement is waived explicitly, never dropped silently.

## Test Tag

The test name starts with its ID and a colon: `CPN-3: rejects expired coupons`. Where the language cannot put it in the name (a Python function), make it the first line of the test's docstring. Tag every test of a requirement (main case, edge cases, errors) with the same ID; the check needs at least one.

## Task Line

Each task carries `Covers: CPN-1, CPN-4` (or `**Covers:** CPN-1, CPN-4`, matching the plan's bold fields), and every ID lands on exactly one task's `Covers:` line.

`Covers:` means **the IDs this task makes fully testable**, not the IDs it touches. A requirement built across two tasks goes on the last one in dependency order only, so the earlier task's check passes honestly.

### Structural Check

Every defined ID on exactly one task, and no task naming an ID the spec does not define. Waived IDs still land on a task; dropped ones on none. With tasks in a tracker, save them to a file first:

```bash
SPEC=SPEC.md
TASKS=tasks/todo.md
T=$(mktemp -d)
grep -v '(dropped)' "$SPEC" | sed -nE 's/^[[:space:]]*[0-9]+\.[[:space:]]+([A-Z]{2,5}-[0-9]+:).*/\1/p' | sort -u > $T/defined
grep -hE '^(\*\*)?Covers:' "$TASKS" | grep -oE '[A-Z]{2,5}-[0-9]+' | sed 's/$/:/' | sort | uniq -c > $T/counts
awk '{print $2}' $T/counts > $T/covered

echo "ON NO TASK:";     comm -23 $T/defined $T/covered
echo "ON SEVERAL:";     awk '$1 > 1 {print $2}' $T/counts
echo "UNDEFINED ID:";   comm -13 $T/defined $T/covered
```

Re-run until all three are empty. **On several**: keep it on the last of those tasks in dependency order. **Undefined ID**: a typo or a dropped ID; correct or remove it. **On no task**: add it to the task that completes it.

## Coverage Check

`node scripts/check-requirements.mjs SPEC.md [ID...]` from the repo root (`-` reads the spec from stdin). It exits 1 when any ID is untested, and 2 on bad input (no spec, a missing spec file, an ID the spec does not define or has dropped) or outside a git repository. Otherwise it prints three classes:

- **Untested**: a defined, non-waived ID with no live tagged test. This fails the check.
- **Undefined ID**: a test tagged with the spec's KEY whose ID the spec does not define (or has dropped). Warn: a typo or a stale test. Other specs' KEYs are ignored.
- **No ID**: an untagged test in a file that holds this spec's tagged tests, as `file:line:text`. Warn: possible scope creep.

A quoted ID counts only where a test name sits: the first argument of `it(`, `test(` or Go's `t.Run(`, or the first line of a `def test_` docstring. An ID in an assertion, a `describe(`, a commented-out test or a skipped one (`.skip(`, `xit(`, `{ skip: true }`, `@pytest.mark.skip`) is not coverage. In other languages any quoted string that starts with an ID counts.

The unnarrowed check on the last task catches what per-task checks cannot: a `Covers:` line on a task that never wrote its test, or a test a later task removed. It confirms presence only; whether a tagged test asserts what its requirement says stays with review.

## Red Flags

- IDs added to a spec the user did not ask to annotate
- An ID matched without its colon in a grep or runner filter
- A spec with IDs but no `Requirement coverage:` command, or tasks with `Covers:` but no check in **Verify**
- A `Covers:` line listing IDs the task only touches
- A requirement dropped from the spec instead of marked `(dropped)` or waived

## Verification

- [ ] The spec has a `Requirement key:` line and every criterion has an ID
- [ ] Every ID is in a seam-table row, or a `waived:` row with a reason
- [ ] `scripts/check-requirements.mjs` is in the project and named in the spec's **Commands**
- [ ] Every task's **Verify** line runs the check for its `Covers:` IDs; the last task runs it unnarrowed
- [ ] The structural check prints nothing under all three headings
