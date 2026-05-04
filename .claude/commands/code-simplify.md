---
description: Simplify code for clarity and maintainability — reduce complexity without changing behavior
---

Invoke the agent-skills:code-simplification skill against an explicit scope. The skill itself enforces preservation of behavior and convention adherence; this command's job is to ensure the entry point isn't blind — bad simplifications come from acting without scope, without a test baseline, and without reading project conventions first.

`$ARGUMENTS` may contain (in any order):

- A file or directory path: scope is that file or all files under that directory.
- A git ref range (e.g. `main..HEAD`, `HEAD~3..HEAD`): scope is the diff of files between those refs.
- Empty: scope defaults to `git diff --name-only HEAD~1..HEAD` (last commit's files).

## Steps

### Step 0 — Determine explicit scope

Parse `$ARGUMENTS`:

- If empty: run `git diff --name-only HEAD~1..HEAD` and use the resulting file list as the scope.
- If a single path is given and it exists: use that path (file or directory).
- If a git ref range is given (contains `..`): run `git diff --name-only <range>` and use the resulting file list.
- Otherwise: stop and ask the operator to clarify scope.

Echo the resolved scope to the operator before proceeding: `Scope: <list-of-files>` (or `Scope: <directory>`).

If the resolved scope is empty (no files changed in the last commit; no files in the directory), stop with: "Nothing in scope. Pass an explicit path or ref range."

### Step 0.5 — Verify the project is in a simplifiable state

Read the project's `CLAUDE.md` `## Commands` section to find the test command. If a test command is declared:

```bash
<test-command>
```

If tests fail before any simplification: STOP. Report the failures to the operator and refuse to proceed — you cannot simplify code that is already broken. The operator must fix the failures (or skip explicitly with confirmation that the failures are unrelated and pre-existing) before re-invoking.

If `CLAUDE.md` does not declare a test command, note this to the operator and ask whether to proceed without a test baseline. Default: refuse and escalate.

### Step 1 — Read CLAUDE.md and study project conventions

Read `CLAUDE.md` (project root and any feature-scoped `CLAUDE.md` whose path is a prefix of files in scope). Identify:

- Style conventions (naming, indentation, line length).
- Import ordering, module boundaries.
- Error-handling and logging patterns.
- Test layout and naming.

You will match these in every simplification. Do NOT impose external conventions ("standard JavaScript style", "PEP 8 strict") if they conflict with what `CLAUDE.md` declares.

### Step 2 — Identify simplification targets within scope

Within the resolved scope, scan for:

- Deep nesting → guard clauses or extracted helpers
- Long functions → split by responsibility
- Nested ternaries → if/else or switch
- Generic names → descriptive names
- Duplicated logic → shared functions
- Dead code → remove after confirming with `Grep` for callers

### Step 3 — Apply each simplification incrementally

After each change: run the test command. If tests fail, revert that change and reconsider.

### Step 4 — Final verification

- All tests pass.
- The build succeeds (if there's a build step).
- The diff is clean (no unrelated changes, no formatting churn).

### Step 5 — Hand off to review

Use `code-review-and-quality` to review the resulting diff. Do not ship without that review.

## Constraints

- **Never** simplify code outside the resolved scope. If you find issues in adjacent code, note them in the report — do not touch them. Out-of-scope edits are how simplifications grow into refactors and how regressions sneak in.
- **Never** change behavior. A simplification that alters observable output, even subtly, is a refactor — escalate to a different workflow.
- **Always** match project conventions over personal preference or external style guides.
