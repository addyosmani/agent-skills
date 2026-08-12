---
name: parallel-deep-research
description: "When user asks for 'deep research X' or 'research X with parallel agents' — dispatch 3-N parallel subagents covering independent angles (deep-dive, prior-art, comparative analysis), synthesize findings, then push to `yubi-OS/yubiOS/refs/<topic-slug>-YYYY-MM-DD.md`. Always verify 'borrow' intent against actual repo state before proposing code changes (workspace skills may be stale relative to main)."
requiredApps: [github]
---

# Parallel Deep Research

When Jenny asks for "deep research X" with parallel agents (or just "deep research X" without specifying — that's the established default):

## Workflow

1. **Read skills first** (in order): using-agent-skills, token-efficiency, context-isolation, then the domain skill that fits the topic (prior-art-search, github-api, mkosi-image-builder, etc.).

2. **Design parallel streams** (3-5 is the sweet spot):
   - Stream 1: Subject deep-dive — what it is, architecture, recent activity, adoption signals
   - Stream 2: Prior art / alternatives — using prior-art-search skill workflow (4 angles: competitors, failed attempts, academic, adjacent)
   - Stream 3: Relevance to yubiOS / comparative analysis — using the domain skill + repo inspection

3. **Each subagent prompt MUST**:
   - Start with skill-load directive: "Read these skills first, in this order: 1) using-agent-skills 2) token-efficiency 3) context-isolation 4) <domain skill>"
   - Be self-contained (subagents have no chat memory — provide IDs, paths, constraints, the question)
   - Specify what to return (structured markdown report with citations, length budget ~1500-2500 words)
   - Use `type: "general"`, `model_preset: "fast"` (per token-efficiency: bounded research doesn't need the smartest model)
   - Pass connection IDs explicitly if it needs API access (e.g. `conn_3h7rj41VF6hs` for GitHub)

4. **After subagents return, synthesize**:
   - Resolve conflicts by inspecting ground truth (don't trust any single stream blindly)
   - Consolidate into one structured report with TL;DR + stream sections + "what this means" + sources
   - Save to `session/<topic-slug>-YYYY-MM-DD.md` first

5. **Push to canonical location**:
   - Target: `refs/<topic-slug>-YYYY-MM-DD.md` on `yubi-OS/yubiOS` main
   - Use GitHub Contents API PUT with `X-Sauna-Connection-Id: conn_3h7rj41VF6hs` header
   - **Watch for JSON shell-quoting issues** — apostrophes in commit messages break single-quoted bodies. Use a temp file for the JSON body, or a Python heredoc

6. **Verify before code change** (critical lesson):
   - If the research surfaces "borrow" intent (e.g. "X does Y, yubiOS should adopt it"), **inspect the actual repo state** before proposing code changes
   - Workspace skills may be stale relative to `yubi-OS/yubiOS` main. Example: the `mkosi-image-builder` skill claims yubiOS doesn't have `SOURCE_DATE_EPOCH` pinned, but `scripts/lib/reproducible-build.sh` derives it from commit timestamp (better than the "borrow" recommendation)
   - When "borrow" turns out to be "already implemented better", redirect to documenting the discovery as a refs/ note rather than adding redundant code

## Length budgets

- Per subagent: ~1500-2500 words
- Synthesis: ~2000-3000 words (consolidated; can be longer if multi-stream)
- Refs/ note (for discovery findings): ~500-1500 words
