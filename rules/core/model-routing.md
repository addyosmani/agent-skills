---
title: Model routing — delegate lookups and implementation away from main Opus
applies-to: ["python", "typescript", "bash"]
last-reviewed: 2026-05-04
enforcement: context-only
# §A.6: verbatim derivation of ~/.claude/CLAUDE.md "Native delegation + post-edit audit";
# reinforced by ADR-0001, ADR-0002, docs/DELEGATION-RULE.md, and direct evidence from
# a multi-bank financial pipeline (2026-05-04) where main Opus executed gh/WebFetch/Edit
# directly, producing high-cost, low-quality results that a Sonnet subagent would have
# handled correctly.
---

# Model routing — delegate lookups and implementation away from main Opus

The main Opus agent's comparative advantage is orchestration, architectural decision-making,
and synthesis — not execution of research queries or mechanical code edits. Every time main
Opus runs a `gh` command, a multi-file search, or a direct `Edit` on client project files,
it consumes budget on work a Sonnet or Haiku subagent does equally well at a fraction of the
cost. This rule makes delegation the default, not an option.

## Inviolable rules

1. Main Opus MUST NOT execute lookup or research operations (`gh repo view`, `gh api`,
   `WebFetch`, multi-file explorations of more than 3 queries, README surveys, catalog scans)
   directly. These MUST be delegated to `Agent(subagent_type="Explore")` or a `general-purpose`
   subagent (Sonnet by default). Exception: a single `gh`/`Read`/`Grep` call of fewer than
   30 lines that feeds the very next tool call in the same turn (where spawning a subagent
   would add more latency than value).

2. Main Opus MUST NOT execute `Edit`, `Write`, or mutating `Bash` commands on client project
   files to implement operator-requested work. Implementation MUST be routed to:
   - `implementer-haiku` (Haiku) when: scope is 3 files or fewer, no new control flow, no
     async, no new error handling, and the change is mechanical (renames, CSS, string updates,
     README/CHANGELOG edits, config flips, fixture-only test additions).
   - `implementer` (Sonnet) when: any control flow, assertions in tests, integrations, async,
     error handling, or multi-module refactor is involved.
   - A specialist created by `agent-architect` when: domain-specific expertise is required
     (regulations, client-specific protocol, framework the base agents do not cover).

3. Main Opus MUST NOT execute the post-edit audit chain steps directly. The chain
   (`test-engineer` → `code-reviewer` → `security-auditor`) runs as sequential Sonnet
   subagents. Main Opus reads their reports and synthesizes — it does not run the tests
   or perform the review itself.

4. Main Opus retains direct execution rights for: orchestration decisions, architectural
   choices, grilling during `intent-capture`, synthesis of subagent reports, and edits to
   plugin meta-work files (plan files, memory entries, `MEMORY.md` index, ADRs, rules, skills).
   These are the kill-switch paths documented in `docs/DELEGATION-RULE.md`.

5. The subagent MUST receive a self-contained input: the confirmed intent JSON (from
   `intent-capture`) plus explicit citations of applicable rules (`rules/no-hardcoded-magic.md`,
   `rules/secrets-and-pii.md`, etc.). Main Opus MUST NOT pass raw conversation history as
   subagent context — dirty context from the main session degrades subagent output quality.

## Allowed patterns

```bash
# Good — research delegated to Explore subagent; main synthesizes the report
# Main Opus orchestration (pseudo-code of tool call):
# Agent(
#   subagent_type="Explore",
#   prompt="""
#     Read the README and list the public API endpoints in <repo>.
#     Return a bullet list of endpoint path, HTTP method, and description.
#     Maximum 400 words.
#   """
# )
# Main then reads the result and answers the operator — never runs gh directly.
```

```python
# Good — small mechanical refactor routed to implementer-haiku
# intent-capture confirmed: "replace 5 hardcoded account codes in pipeline/classify.py"
# Main Opus delegates (pseudo-code):
# Agent(
#   subagent_type="implementer-haiku",
#   prompt=f"""
#     Implement the confirmed intent:
#     {intent_json}
#
#     Rules in scope:
#     - rules/no-hardcoded-magic.md (rule 1, rule 2)
#     - rules/secrets-and-pii.md
#
#     Scope: pipeline/classify.py only (2 files max including config).
#     No new control flow. Extract literals to config/accounts.py constants.
#   """
# )
```

```typescript
// Good — multi-module feature routed to implementer (Sonnet)
// intent-capture confirmed: "add Bancolombia bank to the pipeline"
// scope.includes has 6 files — exceeds haiku threshold
// Main Opus delegates to implementer (Sonnet), not haiku, not itself.
// After implementer returns: audit chain runs (test-engineer → code-reviewer → security-auditor).
```

## Anti-patterns

```bash
# Bad — violates rule 1 (main Opus runs gh directly to explore a repo)
# This burns Opus budget on a lookup that Sonnet handles identically.
gh repo view org/some-repo --json description,defaultBranchRef
```

```python
# Bad — violates rule 2 (main Opus directly edits client project .py files to clean hardcodes)
# Real failure: in a multi-bank financial pipeline, main Opus edited pipeline/classify.py
# directly to replace account codes. The result introduced a new hardcode for the
# "corrected" value and broke the Bold bank flow. A haiku subagent with a clean
# intent + rules/no-hardcoded-magic.md citation would have applied the pattern correctly.
#
# main agent runs Edit(file_path="pipeline/classify.py", old_string=..., new_string=...)
# directly — this is the violation.
```

```python
# Bad — violates rule 2 (main Opus writes tests instead of invoking implementer)
# Even if the test is "simple", writing it directly in main bypasses the haiku/implementer
# routing decision and the subsequent audit chain.
#
# main agent runs Write(file_path="tests/test_classify.py", content=...) directly.
```

```python
# Bad — violates rule 2 (main Opus applies a "quick" bug fix without intent-capture + delegation)
# The operator says "fix the FEB regex to be dynamic." Main edits directly.
# No intent JSON. No subagent. No audit chain. Three gates bypassed in one move.
#
# main agent runs Edit(file_path="pipeline/filter.py", ...) without prior intent confirmation.
```

## Documented exceptions

- **Plugin meta-work**: edits to `docs/plans/`, `docs/sessions/`, `docs/adr/`, `rules/`,
  `skills/`, `agents/`, `MEMORY.md`, `.claude/kb-config.json`, and any file in the
  `batuta-agent-skills` plugin repo itself. These are kill-switch paths where the authoring
  gates (skill/agent/rule) already provide the quality control. Main Opus edits these directly.

- **Operator-explicit override**: if the operator says explicitly "do it yourself, skip
  implementer" for a specific task, main Opus complies for that task only. The override is
  conversational, not persistent — the next task resets to the default delegation routing.

- **Read-only operations**: `Read`, `Glob`, `Grep`, and read-only `Bash` (e.g. `git log`,
  `wc -l`, `ls`) are always permitted in main Opus regardless of this rule. The rule applies
  only to mutating operations and long-running research sequences.
