# `/ship` Output Example

This document shows what the `/ship` command produces for a realistic change. It covers:

1. The three parallel specialist reports (Phase A)
2. The merged GO decision (Phase B + C)
3. A NO-GO example showing how a blocker changes the verdict

---

## Context: the change being reviewed

**Change:** Add a tagging feature to a task manager. Three commits, ~180 lines across `src/models/tag.ts`, `src/api/tags.ts`, `src/components/TagInput.tsx`, and `src/components/TagInput.test.tsx`.

---

## Phase A — Specialist reports (returned in parallel)

### code-reviewer report

```
## Code Review — tagging feature

### Correctness
- src/api/tags.ts:34 — tag name is not trimmed before insert; "  work  " and "work" will 
  create two distinct tags. Severity: Important.
- src/models/tag.ts:12 — unique index on (userId, name) exists but the error thrown on 
  duplicate insert is a raw DB error, not a domain error. Severity: Important.

### Readability
- src/components/TagInput.tsx:67 — local `handleKeyDown` closure captures `tags` from 
  outer scope; easy to stale-close. Consider useCallback or move outside component.
- Variable name `t` used as both a tag object and a loop iterator in two adjacent 
  functions (lines 41, 89). Rename for clarity.

### Architecture
- Tag creation is inlined in the API route handler. If reuse is needed across routes 
  (e.g. bulk import), there is no service layer to call. Not a blocker today, but worth 
  noting in an ADR.

### Security
- No issues found beyond what security-auditor will cover.

### Performance
- Tag list endpoint returns all tags for the user on every keystroke via useEffect. 
  Debounce or cache client-side. Severity: Important (no blocker, but will cause 
  noticeable lag at >50 tags).
```

---

### security-auditor report

```
## Security Audit — tagging feature

### Input validation
- src/api/tags.ts:19 — tag name max length is validated client-side only (TagInput.tsx:23). 
  The API route has no length check. A crafted request can insert a 10 000-character tag 
  name. Severity: Critical — server-side validation is mandatory.

### Authentication / Authorization
- src/api/tags.ts:8 — userId is read from req.session.userId. Session middleware is in 
  place; no bypass path found. Clean.

### Secrets handling
- No secrets introduced in this diff.

### Dependencies
- No new dependencies introduced.

### OWASP Top 10
- A03 Injection: tag name passes through parameterized query. Clean.
- A01 Broken Access Control: tag routes are behind authMiddleware. Clean.
```

---

### test-engineer report

```
## Test Coverage Analysis — tagging feature

### Happy path
- Create tag: covered (TagInput.test.tsx:14)
- Assign tag to task: NOT covered — no test for the TaskCard + tag relationship.
- Filter by tag: NOT covered — no test for the tag filter query or UI.

### Edge cases
- Duplicate tag name: covered (TagInput.test.tsx:31)
- Empty tag name: NOT covered.
- Tag name with only whitespace: NOT covered (also a server-side validation gap per 
  security-auditor).

### Error paths
- API error on tag create (network failure): NOT covered.

### Concurrency
- No concurrency scenarios identified for this feature.

### Summary
Happy path partially covered. Two of three user behaviors (assign, filter) have no tests. 
Three edge cases uncovered. Recommend adding tests before ship; the assign and filter 
paths carry enough risk to be a soft blocker.
```

---

## Phase B + C — Merged decision: GO with required pre-ship fixes

```markdown
## Ship Decision: NO-GO

### Blockers (must fix before ship)

- **security-auditor:** Server-side tag name length validation missing — 
  src/api/tags.ts:19. A crafted request can insert arbitrarily long strings. 
  Add `maxLength` check in route handler before any DB call. (Critical)

### Recommended fixes (should fix before ship)

- **code-reviewer:** Trim tag name before insert to prevent whitespace duplicates — 
  src/api/tags.ts:34. (Important)

- **code-reviewer:** Throw a domain error on duplicate tag insert instead of 
  surfacing a raw DB error — src/models/tag.ts:12. (Important)

- **test-engineer:** Add tests for assign-tag-to-task and filter-by-tag behaviors. 
  These are two of the three user-visible outcomes of this feature and have no 
  coverage. (Important)

- **code-reviewer:** Debounce the tag list fetch in TagInput — currently fires on 
  every keystroke. (Important)

### Acknowledged risks (shipping anyway)

- Tag creation is inlined in the API handler with no service layer. Acceptable for 
  now. Document in CONTEXT.md if reuse becomes a requirement.

### Rollback plan

- **Trigger conditions:** Error rate on /api/tags endpoints exceeds 1% over a 
  5-minute window, or any report of data corruption in tag records.
- **Rollback procedure:**
  1. Revert the three commits: `git revert HEAD~3..HEAD`
  2. Run `npm run migrate:down` to remove the tags table
  3. Deploy the reverted build
  4. Verify /api/tasks returns without tag data in response
- **Recovery time objective:** < 15 minutes

### Specialist reports (full)

[code-reviewer, security-auditor, and test-engineer reports above]
```

---

## What a GO looks like

After fixing the blocker (server-side length validation) and the important findings:

```markdown
## Ship Decision: GO

### Blockers
None.

### Recommended fixes
None outstanding.

### Acknowledged risks
- Tag creation has no service layer. Acceptable for the current scope.

### Rollback plan
- **Trigger conditions:** Error rate on /api/tags > 1% over 5 minutes, or data 
  corruption reports.
- **Rollback procedure:**
  1. `git revert HEAD~3..HEAD`
  2. `npm run migrate:down`
  3. Deploy reverted build
- **Recovery time objective:** < 15 minutes
```

---

## Rules that shaped this example

- Any **Critical** finding from any persona → automatic NO-GO until fixed or explicitly accepted by the user.
- The rollback plan is **mandatory** before a GO. A GO without a rollback plan is not valid output.
- The three personas run **in parallel** — their reports are independent inputs to the main agent's merge step.
- Personas do not read each other's reports. Deduplication happens in Phase B (note: both `security-auditor` and `test-engineer` independently flagged the whitespace/length gap from different angles; both entries are kept).
