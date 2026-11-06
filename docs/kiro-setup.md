# Kiro Setup

This guide explains how to run the Agent Skills framework under **Kiro CLI**
with the same mechanical enforcement the Claude Code integration gets from
[Probity](https://github.com/nizos/probity): spec-first acceptance tests,
no fixed sleeps, TDD on production writes, and a commit gate that blocks an
unverified tree.

Kiro already supports skills (`.kiro/skills/`) and `AGENTS.md`. What it does
*not* get out of the box is the Probity guardrail, because Probity ships
vendor adapters for `claude-code`, `codex`, and `github-copilot` — but not
Kiro. This integration closes that gap with a thin translation shim, so one
`probity.config.ts` enforces both agents.

Assets live in [`hooks/probity/kiro/`](../hooks/probity/kiro/):

| File | Role |
|------|------|
| `probity-kiro.sh` | preToolUse shim: translates a Kiro tool event to Probity's claude-code contract and back |
| `probity-kiro-translate.py` | `event` (Kiro event → claude payload) and `reason` (deny → reason) helpers |
| `kiro-transcript-to-claude.py` | transduces Kiro's session JSONL to the Anthropic shape Probity's history rules read |
| `skill-activation-forced-eval.sh` | userPromptSubmit hook that forces explicit skill evaluation each turn |
| `kiro-agent.template.json` | agent config template wiring the skills + both hooks |

---

## How it works (and why a shim)

The two agents disagree on the hook contract in three ways the shim reconciles:

1. **No Kiro vendor in Probity.** Rather than fork Probity, the shim maps
   Kiro's tool events onto the `claude-code` payload Probity already
   understands. Non-mutating tools (reads) are allowed immediately without
   paying Node startup.
   - **kiro-cli 3.x** (V3 engine, from 0.4.62; #176):
     - `fs_write` {path, text} → `Write`.
     - `str_replace` → `Edit`.
     - `fs_append` → `Write` of the file on disk plus the text, with the
       newline Kiro adds.
     - `delete_file` → `Bash` `rm -- <file>`.
     - `execute_bash`, `execute_pwsh`, `run_command`, and a
       `control_*_process` `start` → `Bash`, judged in the call's own `cwd`.
     - Any other tool Kiro files as a write (`edit_code`, `semantic_rename`,
       `smart_relocate`, `create_hook`) is **blocked**, since the shim can't
       express it to Probity. A translator failure is blocked too.
   - **kiro-cli 2.x:**
     - `fs_write` (create / strReplace / insert) → `Write` / `Edit`.
     - `shell` → `Bash`.

2. **Block signalling is inverted.** Probity's `claude-code` path signals a
   block by printing a deny JSON to stdout and exiting **0**. Kiro blocks a
   tool when the hook exits **2**, returning stderr to the model. The shim
   converts the former into the latter.

3. **History lives in a different place.** Probity's stateful rules (the
   commit green-gate, the TDD RED-before-GREEN judge) reconstruct
   conversation history from a transcript. Claude Code passes a
   `transcript_path`; Kiro persists a differently-shaped JSONL of its own:
   - **kiro-cli 3.x:** `~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl`,
     found from the hook event's `session_id`.
   - **kiro-cli 2.x:** `~/.kiro/sessions/cli/<id>.jsonl`, found from
     `KIRO_SESSION_ID`.

   The transducer rewrites either into the Anthropic message shape Probity's
   reader expects, and the shim passes it as `transcript_path`. It maps
   shell calls to `Bash`, so the green-gate can see `xcodebuild … test`
   output. It also rewrites a 3.x shell result ("…\n\nExit Code: N") into
   2.x's exit-status envelope.

**Fail-safe posture:** a genuine rule violation blocks (exit 2). An
unparseable event warns on stderr and *allows* (exit 0), so a tooling bug never
wedges a session — the commit green-gate remains the correctness backstop.
A missing Probity install does not allow: in a worktree without
`node_modules` the shim uses the main worktree's install, and when Probity is
installed nowhere it blocks every call except the `npm ci` that fixes it
(from 0.4.22).

**Alternative considered — a native Kiro vendor in Probity.** Cleaner
long-term, but it lives in a third-party package (`@nizos/probity`) and would
need upstreaming. The shim keeps the integration in this framework, which is
also where the `probity.config.*.ts` presets and rules already live, so a fix
made here when the dev cycle exposes a gap stays in one place.

---

## Prerequisites

- Kiro CLI installed.
- The project already uses this framework's Probity setup for Claude Code:
  `@nizos/probity` and `@jjchill/probity-rules` installed (`npm install`), and
  a `probity.config.ts` created from one of the package's preset templates.
  The Kiro shim reuses that exact config — it does not add a second rule set.
- `python3` on PATH (used by the shim and transducer).

---

## Installation

Run from the project root.

### 1. Make the skills discoverable

Kiro loads skills from `.kiro/skills/`. Symlink this framework's `skills/`
directory in (a symlink keeps one source of truth; adjust the path to your
checkout):

```bash
mkdir -p .kiro
ln -sfn /path/to/agent-skills/skills .kiro/skills
```

If the symlink points outside the repo, ignore it so it isn't committed:

```bash
printf 'skills\n' > .kiro/.gitignore
```

### 2. Install the hooks

Copy the shim files from the installed `@jjchill/probity-rules` package's `kiro/` directory:

```bash
mkdir -p .kiro/hooks
cp node_modules/@jjchill/probity-rules/kiro/probity-kiro.sh            .kiro/hooks/
cp node_modules/@jjchill/probity-rules/kiro/probity-kiro-translate.py  .kiro/hooks/
cp node_modules/@jjchill/probity-rules/kiro/kiro-transcript-to-claude.py .kiro/hooks/
cp node_modules/@jjchill/probity-rules/kiro/skill-activation-forced-eval.sh .kiro/hooks/
chmod +x .kiro/hooks/*.sh .kiro/hooks/*.py
```

The shim resolves the repo root from its own location (`.kiro/hooks/../..`)
and runs `node_modules/.bin/probity-claude` (or `node_modules/.bin/probity` on an
install without it), so no path edits are needed.
Once these are installed, `/probity-update` refreshes them automatically whenever
the package ships changes — you don't need to repeat this step by hand.

### 3. Add the agent

Copy the template and fill in the placeholders:

```bash
mkdir -p .kiro/agents
cp node_modules/@jjchill/probity-rules/kiro/kiro-agent.template.json \
   .kiro/agents/<agent-name>.json
```

Then edit `.kiro/agents/<agent-name>.json`:

- **`name`** — replace `REPLACE_WITH_AGENT_NAME`. To *override* a global
  default agent, use the **same name** as the global one (a local
  `.kiro/agents/<name>.json` takes precedence over `~/.kiro/agents/<name>.json`).
  Otherwise pick any name and select it with `/agent`.
- **`description`** — replace the `REPLACE:` text.
- **`resources`** — `docs/GLOSSARY.md` is optional; remove it if the project
  has none. Keep `file://AGENTS.md` and `skill://.kiro/skills/**/SKILL.md`.
- **`prompt`** — optionally name the specific skills that govern the project's
  workflow, so the per-turn evaluation has a strong prior.

Nothing else needs changing: the `userPromptSubmit` and `preToolUse` hook
commands already point at the scripts you copied in step 2.

---

## Verification

1. Start Kiro in the project and run `/hooks`. You should see one
   `userPromptSubmit` entry and two `preToolUse` entries, with matchers
   `write` and `shell`. These work on both versions:
   - **kiro-cli 3.x** matches a hook by a tool's capability tag. `write`
     covers every write tool (`fs_write`, `str_replace`, `fs_append`,
     `delete_file`, …) and `shell` covers every shell tool.
   - **Don't add per-tool matchers next to these.** A 3.x write would
     match both entries and be judged twice.
   - **kiro-cli 3.x ignores `timeout_ms`** in an agent file. A hook gets
     60 s, and one that runs longer **lets the call through**. On a 3.x
     event the shim gives Probity 55 s (`PROBITY_KIRO_TIMEOUT_S`, keep it
     below 60) and blocks a call it hasn't judged by then. A judge that
     often takes longer, such as Opus at high effort on big prompts,
     shows up as those blocks.
2. Confirm the deterministic wall blocks. Feed a synthetic event straight to
   the shim (this needs no model call):

   ```bash
   ROOT="$PWD"
   printf '%s' "{\"hook_event_name\":\"preToolUse\",\"cwd\":\"$ROOT\",\"tool_name\":\"fs_write\",\"tool_input\":{\"command\":\"create\",\"path\":\"$ROOT/<your-acceptance-dir>/Probe.swift\",\"content\":\"Thread.sleep(forTimeInterval: 1)\"}}" \
     | bash .kiro/hooks/probity-kiro.sh; echo "exit=$?"
   ```

   Expect `exit=2` and the fixed-waits reason on stderr. A read event, or a
   write no rule matches, should print nothing and `exit=0`.
3. Confirm the transducer emits valid JSONL against a real session:

   ```bash
   python3 .kiro/hooks/kiro-transcript-to-claude.py \
     ~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl | head   # 3.x
   python3 .kiro/hooks/kiro-transcript-to-claude.py \
     ~/.kiro/sessions/cli/<some-session-id>.jsonl | head           # 2.x
   ```

---

## Limitations

- **History rules need a session transcript.** When the shim finds no session
  file (no `session_id` in the event or `KIRO_SESSION_ID`, or the file is
  missing), it omits `transcript_path`, and Probity's
  history-based rules (green-gate, TDD) fail *open* — exactly as Probity does
  for Claude Code without a transcript. The deterministic rules (sleeps,
  UI-mechanics location, spec-backed test, glossary/parity gates) are
  unaffected.
- **Tool-name coverage is scoped to the mutating tools.** The `write` and
  `shell` matchers gate every write and shell tool on both versions. MCP
  tools and other built-ins are allowed. Widen the matchers if
  a project needs more.
- **Parity, not replacement.** Keep the Claude Code `.claude/settings.json`
  hook if you use both agents; they share the one `probity.config.ts`.
