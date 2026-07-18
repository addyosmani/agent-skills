---
name: open-code-review-delegate
description: Performs code review on large changesets using OCR delegation mode for deterministic file selection and rule resolution while the agent drives the actual review. Use when reviewing PRs or branches with 10+ changed files. Use when prompt-only review risks skipping files or drifting on line positions. Requires the ocr CLI installed.
---

# Open Code Review — Delegation Mode

## Overview

Delegation mode splits code review into two concerns: OCR handles deterministic engineering (which files to review, which rules apply) and the agent handles the dynamic judgment (reading diffs, finding issues, proposing fixes). This eliminates the failure mode where prompt-only agents silently skip files in large changesets or lose track of line positions.

## When to Use

- Reviewing PRs or branches with 10+ changed files
- Large diffs where a single-pass prompt risks skipping files
- Projects with custom review rules (`.opencodereview/rule.json`) that should be enforced consistently
- When you need reliable file-level coverage guarantees across a changeset

**When NOT to use:**

- Small changes (< 10 files) — use the `code-review-and-quality` skill directly
- When `ocr` is not installed and cannot be installed
- When reviewing a single commit with minimal changes

## Prerequisites

```bash
which ocr || echo "NOT INSTALLED"
```

If `ocr` is not installed:

```bash
npm install -g @alibaba-group/open-code-review
```

No LLM configuration is needed — delegation mode never calls an LLM on the OCR side.

## Workflow

### Step 1: Preview — Determine What to Review

```bash
ocr delegate preview [--from <ref> --to <ref>] [--commit <hash>] [--exclude <patterns>]
```

This outputs:
- **mode** (workspace / range / commit)
- **from / to / commit / merge_base** — ref metadata for constructing git commands
- **Reviewable file list** — paths, status, insertions/deletions
- **Excluded files** — with exclusion reason

Common invocations:

| Scenario | Command |
|----------|---------|
| Workspace changes | `ocr delegate preview` |
| Branch comparison | `ocr delegate preview --from main --to feature` |
| Single commit | `ocr delegate preview -c abc123` |

### Step 2: Get Rules for Files

```bash
ocr delegate rule <path1> <path2> ...
```

Pass the reviewable file paths from Step 1. Output is grouped by rule content — files sharing the same rule appear under one group, avoiding repetition.

### Step 3: Get Diffs

Use git directly based on the mode/ref info from Step 1:

**Range mode** (merge_base provided in preview output):
```bash
git diff <merge_base>..<to> -- <path>
```

**Commit mode**:
```bash
git show <commit> -- <path>
```

**Workspace mode**:
```bash
git diff HEAD -- <path>
# For new untracked files — read directly
cat <path>
```

### Step 4: Review Each File

For each reviewable file:

1. Get its diff (Step 3)
2. Consult its Rule Group (from Step 2) for the review checklist
3. Conduct a thorough review following the five axes from `code-review-and-quality`: correctness, readability, architecture, security, performance

### Step 5: Format Output

Each finding must include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | yes | Relative file path |
| content | string | yes | Review comment describing the issue |
| start_line | integer | no | Start line in the new file |
| end_line | integer | no | End line in the new file |
| category | enum | no | bug, security, performance, maintainability, test, style, documentation, other |
| severity | enum | no | critical, high, medium, low |

### Step 6: Classify and Report

Group findings by severity:

- **Critical/High**: Bugs, security issues, data loss risks — always report
- **Medium**: Performance concerns, error handling gaps, maintainability issues — report with context
- **Low**: Style nits, minor suggestions — report only if clearly valuable

Discard likely false positives silently.

### Step 7: Fix (Optional)

If the user requested "review and fix":
- Apply Critical/High fixes directly
- Describe Medium fixes that require manual intervention
- Skip Low-priority items unless trivial

## Sub-commands Reference

| Command | Purpose |
|---------|---------|
| `ocr delegate preview` | Which files to review + mode/ref metadata |
| `ocr delegate rule <path...>` | Review rules grouped by content |

## Shared Flags

| Flag | Description |
|------|-------------|
| `--from <ref>` | Source ref for range mode |
| `--to <ref>` | Target ref for range mode |
| `-c, --commit <hash>` | Single commit mode |
| `--repo <path>` | Repository root (default: cwd) |
| `--rule <path>` | Custom rule.json path |
| `--exclude <patterns>` | Comma-separated exclude patterns |
| `-b, --background <text>` | Business context for review |
| `-B, --background-file <path>` | Business context from Markdown file |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can review all files in one prompt" | Beyond ~10 files, agents silently drop coverage. The preview step proves exactly which files are in scope — no guessing. |
| "I don't need rules, I know what to look for" | Project-specific rules encode institutional knowledge (security patterns, null-check conventions). Skipping them means rediscovering issues the team already solved. |
| "Setting up ocr is overhead for one review" | Installation is a single `npm install`. The real overhead is re-reviewing when you discover missed files after merge. |
| "The diff is small, delegation is overkill" | If the diff is truly small, the preview step takes < 1 second and confirms you're right. If it's not, you just caught a blind spot. |

## Red Flags

- Reviewing a 20+ file PR without running `ocr delegate preview` first
- Skipping the rule step and relying solely on generic review heuristics
- Reporting "no issues found" on a large changeset without evidence of per-file coverage
- Ignoring excluded files without checking the exclusion reasons

## Verification

After completing the review:

- [ ] `ocr delegate preview` was run and all reviewable files are accounted for
- [ ] Rules were fetched for all reviewable paths
- [ ] Every reviewable file has a corresponding review (even if "no issues")
- [ ] Findings include file path, line range, and severity
- [ ] Critical/High issues are reported with actionable fix suggestions
- [ ] No files were silently skipped — excluded files have documented reasons
