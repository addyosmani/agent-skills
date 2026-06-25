---
name: open-code-review
description: >
  Runs AI-powered code review via the `ocr` CLI (alibaba/open-code-review),
  a tool-augmented reviewer that combines deterministic engineering with an
  agent to produce line-level comments with high precision at ~1/9 the token
  cost of general-purpose agents. Use when reviewing code changes, pull
  requests, commits, or branch diffs. Use when you need high-precision,
  low-noise reviews on large changesets. Use when you want structured,
  line-level review output with optional auto-fix.
---

# Open Code Review

## Overview

CLI-driven code review using [Open Code Review](https://github.com/alibaba/open-code-review) (`ocr`) — an open-source tool from Alibaba that combines **deterministic engineering** with an **LLM agent** to produce structured, line-level review comments.

Unlike purely prompt-driven review, OCR uses engineering logic to guarantee precise file selection, smart file bundling, fine-grained rule matching, and external positioning modules — the LLM handles only dynamic decisions and context retrieval. This hybrid architecture achieves significantly higher precision and F1 than general-purpose agents while consuming ~1/9 of the tokens.

**This skill complements `code-review-and-quality`.** Use `code-review-and-quality` for prompt-driven multi-axis review when no external tooling is available. Use this skill when `ocr` is installed and you want tool-augmented review with higher precision and lower token cost.

## When to Use

- Reviewing staged, unstaged, or untracked changes before commit
- Reviewing a pull request or branch diff (`--from main --to feature`)
- Reviewing a specific commit (`--commit abc123`)
- Large changesets where general-purpose agents tend to skip files or drift on line positions
- CI/CD pipelines needing structured, machine-readable review output
- Auditing unfamiliar codebases or directories via full-file scan (`ocr scan`)

**Not for:**

- Architectural design review (use `code-review-and-quality` axis 3)
- Performance profiling (use `performance-optimization`)
- Security-focused auditing (use `security-and-hardening`, though OCR catches security issues as part of its review)

## Process

### Step 0: Verify Prerequisites

```bash
which ocr || echo "NOT INSTALLED"
ocr llm test
```

If `ocr` is not found, install it:

```bash
npm install -g @alibaba-group/open-code-review
```

If `ocr llm test` fails, the user must configure an LLM provider:

```bash
ocr config provider    # Interactive: select provider, enter API key, pick model
ocr config model       # Pick a model for the active provider
```

Or via environment variables for CI:

```bash
export OCR_LLM_URL=https://api.anthropic.com/v1/messages
export OCR_LLM_TOKEN=<api-key>
export OCR_LLM_MODEL=claude-sonnet-4-6
export OCR_USE_ANTHROPIC=true
```

Stop and ask the user to provide credentials — never invent or hardcode API keys.

### Step 1: Gather Business Context

Before running the review, analyze the review target to extract concise business context. This context is passed via `--background` and significantly improves review quality by helping the reviewer understand intent, not just syntax.

### Step 2: Run the Review

Always use `--audience agent` to suppress progress UI and emit structured output:

```bash
ocr review --audience agent --background "context here" [user-args]
```

| User says | Command |
|-----------|---------|
| "review my changes" | `ocr review --audience agent -b "context"` |
| "review this PR" | `ocr review --audience agent -b "context" --from main --to <branch>` |
| "review commit abc123" | `ocr review --audience agent -b "context" --commit abc123` |
| "what would be reviewed?" | `ocr review --preview` |
| "scan the whole repo" | `ocr scan` |

Set a 10-minute timeout per file. Reduce `--concurrency` if rate limits are hit.

### Step 3: Classify and Report

For each comment, classify by confidence:

- **High**: Obvious bugs, security issues, clear mistakes, well-founded suggestions with precise fixes
- **Medium**: Reasonable but context-dependent concerns, style/performance suggestions
- **Low**: Likely false positives, nitpicks, or comments lacking context — discard silently

Present results grouped by priority:

```
## Code Review Results

**Files reviewed**: N
**Issues found**: X high / Y medium

### High Priority

- **`path/to/file.java:42`** — Brief description
  > Recommendation: how to fix

### Medium Priority

- **`path/to/file.ts:88`** — Brief description
  > Recommendation: how to fix (if applicable)
```

If the review found no issues after filtering: "Review complete — no issues found in N files."

### Step 4: Fix (When Requested)

- If the user explicitly requested "review and fix": apply high and medium fixes automatically
- If the user only said "review": ask permission before applying changes
- For complex fixes requiring manual intervention, describe what needs to be done
- Verify fixes compile and pass tests before considering them done

## Custom Review Rules

OCR supports project-specific rules, resolved in priority order:

1. `--rule <path>` flag (highest)
2. `<repo>/.opencodereview/rule.json`
3. `~/.opencodereview/rule.json`
4. Built-in defaults (lowest)

Example rule file:

```json
{
  "rules": [
    {
      "path": "**/*.java",
      "rule": "All new methods must validate required parameters for null",
      "merge_system_rule": true
    }
  ]
}
```

Preview which rule applies: `ocr rules check src/main/java/Foo.java`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just read the diff myself — the model can review inline." | General-purpose agents skip files on large changesets and drift on line positions. OCR's deterministic file selection and positioning modules prevent both failure modes. |
| "Installing another CLI is overhead." | One `npm install -g` command. The precision gain and 9× token savings pay for themselves on the first large review. |
| "The built-in code-review skill is good enough." | It works well for small changes. On 10+ file changesets, tool-augmented review catches issues that prompt-only review misses because it bundles related files and enforces exhaustive coverage. |
| "I'll skip `--background` — the diff speaks for itself." | Business context helps the reviewer distinguish intentional behavior changes from bugs. Without it, the model flags deliberate changes as defects. |
| "I'll review only high-priority findings." | Medium-priority items often reveal design issues that compound. Reporting them lets the author decide, rather than hiding information. |

## Red Flags

- Running `ocr review` without `--audience agent` (progress UI pollutes agent output)
- Skipping `ocr llm test` before first review (will fail with cryptic errors)
- Reviewing without `--background` context (lower quality, more false positives)
- Ignoring exit code (non-zero means some files failed to review)
- Running bare `ocr review` when only staged changes should be reviewed (workspace mode includes untracked files)

## Verification

After completing the review workflow, confirm:

- [ ] `ocr` CLI was installed and `ocr llm test` passed
- [ ] The review command exited with code 0
- [ ] All relevant files were reviewed (check file count in output)
- [ ] Comments were classified by priority and presented clearly
- [ ] Low-confidence comments were filtered out, not shown to the user
- [ ] Fixes (if applied) compile and pass existing tests
- [ ] No API keys or credentials were hardcoded or logged

## References

- Repository: https://github.com/alibaba/open-code-review
- NPM: https://www.npmjs.com/package/@alibaba-group/open-code-review
- Benchmark: real-world benchmark across 50 OSS repos, 200 PRs, 10 languages, 1505 annotated issues
