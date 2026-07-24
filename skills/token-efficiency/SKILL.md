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

## Anti-patterns

- Reading an entire multi-thousand-line file to find one function or config value.
- Printing a full raw JSON API response in the response or into context when only two or three fields are relevant.
- Re-fetching data that was already retrieved earlier in the same session.
- Running a heavy multi-source research pass for a question with a single, already-known answer.
- Serializing several independent, unrelated tool calls one at a time when they could run together.
- Copy-pasting a large file's contents into a message instead of referencing its path.
