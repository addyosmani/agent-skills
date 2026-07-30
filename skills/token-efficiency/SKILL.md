---
name: token-efficiency
description: "Always read first, before any file exploration, API call sequence, or long-running task: minimize tokens spent per unit of useful signal. Grep or glob before reading whole files; read targeted line ranges instead of entire large files; batch independent tool calls together instead of serial round-trips; never re-read or re-paste content already in context; push bulk data transforms into a script instead of streaming raw output through the model; summarize large API responses instead of dumping them; match the model/tool tier to the size of the task. Triggers on: token budget, efficient tool use, large file, big output, expensive context, batch calls, minimize tokens, don't reprint, targeted read, context window cost."
---

# Token Efficiency

## Overview

Tokens are the scarce resource in every session — they're latency, cost, and attention, all three at once. A token spent restating something already visible, or dumping raw data nobody needed in full, doesn't just waste money — it dilutes attention on the tokens that actually mattered (see `context-isolation` for the reasoning-quality side of that). Token efficiency is about spending tokens only where they buy signal.

## Core practices

1. **Search before you read.** Use grep/glob to find the right file and the right line before reading anything. Reading a whole file to find one function wastes every line that isn't that function.
2. **Read narrow.** For large files, read a targeted offset/limit range instead of the whole thing. Re-read a different range later if needed — that's still cheaper than one giant read most of which goes unused.
3. **Batch independent work.** When two or more tool calls don't depend on each other's output, issue them together instead of serially. Each round trip carries fixed overhead beyond the actual payload.
4. **Don't restate what's already visible.** Content already surfaced to the user, or already sitting earlier in context, doesn't need to be echoed back before adding to it. Reference it; don't reproduce it.
5. **Offload bulk transforms to scripts.** Filtering, reformatting, or computing over a large dataset belongs in a script (bash/run_script) that returns the filtered or summarized result — not a raw dump streamed through the model to be manually filtered in the response.
6. **Summarize, don't paste.** When reporting on a large fetched blob — logs, API responses, file contents — extract the fields that matter and summarize. Paste verbatim only the specific lines that need to be quoted exactly.
7. **Cache and reuse within a session.** If something was already fetched or computed earlier in this session, reuse it instead of re-fetching or recomputing from scratch.
8. **Match tool and model tier to task size.** A one-line fact lookup doesn't need deep research effort. A menial, well-defined subagent task doesn't need the smartest available model tier. Reserve the expensive tools and tiers for tasks that actually need the extra capability.


## Load-order protocol

Before any external API call (Linear GraphQL, GitHub REST/Contents/Git Data API, MCP servers, browser sessions), apply this load order:

1. `using-agent-skills` — if not already in context, read once to know what's available.
2. `token-efficiency` (this skill) + `context-isolation` — always-on pair.
3. The relevant domain skill — `linear` for Linear queries, `github-api` for GitHub REST/Git Data, `github-actions` for workflow YAML, etc.

Why: external APIs have type-shape surprises (ID! vs String!, blob/tree/commit/ref ordering, MCP tool namespaces) that the skill's SKILL.md already documents. Reading the skill once saves the ~5 tool turns of debugging a query with the wrong shape.

Cost of skipping: 2-3 wasted tool turns on GraphQL validation errors, MCP "tool not found" errors, or GitHub Contents API DELETE-body-drop bugs (see PROJECT_RULES.md "GitHub Contents API DELETE is broken through the proxy").

**Anti-pattern:** retrying a failed query with the same payload. Read the schema first.
## Anti-patterns

- Reading an entire multi-thousand-line file to find one function or config value.
- Printing a full raw JSON API response in the response or into context when only two or three fields are relevant.
- Re-fetching data that was already retrieved earlier in the same session.
- Running a heavy multi-source research pass for a question with a single, already-known answer.
- Serializing several independent, unrelated tool calls one at a time when they could run together.
- Copy-pasting a large file's contents into a message instead of referencing its path.


## Red Flags

- **Optimizing a response the user explicitly requested verbatim.** "Summarize don't paste" applies when the user wants signal, not when they asked for the full log / raw API response / audit dump for debugging. Detecting the override requires reading the prompt — defaulting to optimize-then-ask burns a turn.
- **Spending more tokens finding a savings than the savings themselves buy.** A grep that returns 200 lines costs less than reading the whole file only when the grep's pattern is well-scoped. Three serial greps with overlapping results is the same waste as one full read.
- **Batch-calling dependent tools.** Two reads where the second depends on the first's output are sequential, not batchable. Confusing "independent" with "later in the plan" serializes work that the round trip can't actually parallelize.
- **"Minimize tokens" used as a license to lose correctness.** Aggressive summarization that drops fields needed for the user's downstream task is over-efficiency. Verification skills catch this downstream; the red flag is treating the skill as a permission to drop signal.
- **Re-fetching a value already in the context.** The "Cache and reuse within a session" practice is asymmetric: it's easy to violate (a fresh search "to be safe") and silent (the duplicate answer looks correct). If the same fact appears twice in context, suspect re-fetch.
- **Adding a structural endpoint that duplicates a sibling skill's body.** Token-efficiency pairs with `context-isolation`; if a body section starts describing context-isolation territory, defer to that skill instead of duplicating it.


## Verification

Before declaring a session efficient, confirm each item holds:

- [ ] Reads were preceded by `@tool/grep` / `@tool/glob` with a specific pattern, not a full-file read.
- [ ] Each `@tool/read` on a file over ~200 lines used `offset` / `limit` to target a range, not the whole file.
- [ ] Independent `@tool/read`, `@tool/glob`, `@tool/grep` calls were issued in a single block, not serially.
- [ ] No tool result already visible in this thread was re-fetched from its source.
- [ ] Bulk transforms (filter, sort, aggregate over ~100 rows) went through `@tool/run_script` or `bash`, not streamed through the model.
- [ ] Large API responses were summarized; only the specific lines or fields that needed verbatim quote were pasted.
- [ ] File references use `[label](file://./path)` rather than re-pasting the file body.
- [ ] The tool tier or model tier matched the size of the task — a fact lookup didn't trigger a deep-research pass; a menial subagent task didn't take the smartest tier.

If any item is unchecked, the loop hasn't closed — apply the missed practice before responding.
## Changelog

- 2026-07-29 cycle 1: Hypothesis "Adding a `## Verification` checklist closes the calibration gap (L4×S3=12 — agents have no signal that they applied token efficiency well) and begins closing the structural-parity gap (L4×S3=12 — sibling skills have `## Verification` at the bottom)." Edit: appended `## Verification` section with 8-item self-check (lines 47-60); created `## Changelog`. Result: re-map shows gap #1 (calibration) CLOSED (12 → ~4, falls out of real-gap filter); gap #2 (structural parity) REDUCED (12 → ~6, Verification endpoint present but Changelog + Red Flags still missing); no new substantive gaps ≥ L×S 6 introduced; no new anti-patterns (frontmatter parsed cleanly via js-yaml: name regex pass, description 726 chars, no angle brackets, structural lines intact); fixpoint NOT REACHED — gaps #3 (override cases, L3×S3=9), #4 (recovery move, L3×S3=9), #8 (context-isolation defer boundary, L3×S3=9) remain Extend candidates; continue to cycle 2.
- 2026-07-29 cycle 2: Hypothesis "Adding `## Red Flags` closes residual of gap #2 (structural parity) and reduces gap #3 (override cases)." Edit: added `## Red Flags` section (6 bullets covering override cases, over-searching, misapplied batching, over-efficiency, re-fetch, and duplication) before `## Verification`; appended this changelog entry. Result: re-map shows gap #2 residual CLOSED (12 → ~3 — all three sibling endpoints now present), gap #3 (override cases) REDUCED (9 → ~4 via Red Flag bullet); no new substantive gaps ≥ L×S 6; no new anti-patterns; fixpoint reached.

