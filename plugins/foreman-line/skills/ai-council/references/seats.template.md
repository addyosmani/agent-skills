# Seat Invocations — TEMPLATE

Copy this file to `seats.md` in the same directory and fill in the invocations that
work on YOUR machine. `seats.md` is machine-local state and is git-ignored — it never
ships with the plugin. Treat it as maintained state, not gospel: when a command fails
twice, diagnose, fix, and update it so the next run inherits the fix.

All commands assume cwd = the directory containing the brief file. Launch seats
concurrently where your environment allows, but remember the SKILL.md rule: the
orchestrator must outlive the seats.

## Grok (xAI)
```
grok --always-approve -p "<role>. Read <brief>.md in the current directory and complete the task in its 'Your task' section. Judge <lens> hardest. Write your final answer to grok-out.txt in this directory."
```
- `-p/--single` = headless. `--always-approve` lets its file tools run unattended.
- Record your observed runtime here after the first run.

## Codex (OpenAI)
```
codex exec --skip-git-repo-check "<role>. Read <brief>.md in the current directory and complete the task in its 'Your task' section. Judge <lens> hardest. Write your final answer to codex-out.txt in this directory."
```
- Usually the slowest seat — launch it first.

## Claude (Anthropic)
```
claude -p "<role>. Read <brief>.md in the current directory and complete the task in its 'Your task' section. Judge <lens> hardest. Write your final answer to claude-out.txt in this directory." --allowedTools Read,Write
```
- On Windows cmd, append `< NUL` to skip the stdin wait. Pin `--model` if defaults error.
- Verify no stale ANTHROPIC_BASE_URL override points at a dead local proxy.

## Gemini (Google)
```
gemini -p "<role>. Read the file <brief>.md in the current directory and complete the task in its 'Your task' section. Judge <lens> hardest. Output ONLY the answer in the exact format the brief demands, no preamble." > gemini-out.txt 2> gemini-err.txt
```
- Capture STDOUT rather than asking it to write files (its write tool prompts for approval).
- Auth via GEMINI_API_KEY in ~/.gemini/.env; strip surrounding quotes from pasted keys.
- May hang after flushing output when MCP servers/extensions are configured — use
  `-e none` and/or kill once the output file is complete; the output is valid.

## Orchestration notes
- Record per-seat timings, auth quirks, and platform gotchas here as you learn them.
- Seat down after 2 attempts: drop it, note it in the directive, continue with quorum
  (2 seats + orchestrator minimum).
