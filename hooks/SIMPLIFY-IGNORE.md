# simplify-ignore hook

Block-level protection for `/code-simplify`. Mark code that should never be simplified — the model won't see it.

## Setup

1. Annotate blocks you want to protect:

```js
/* simplify-ignore-start: perf-critical */
// manually unrolled XOR — 3x faster than a loop
result[0] = buf[0] ^ key[0];
result[1] = buf[1] ^ key[1];
result[2] = buf[2] ^ key[2];
result[3] = buf[3] ^ key[3];
/* simplify-ignore-end */
```

2. Add hooks to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "bash ${CLAUDE_PROJECT_DIR}/hooks/simplify-ignore.sh" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "bash ${CLAUDE_PROJECT_DIR}/hooks/simplify-ignore.sh" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "bash ${CLAUDE_PROJECT_DIR}/hooks/simplify-ignore.sh" }]
      }
    ]
  }
}
```

3. Run `/code-simplify` — protected blocks become `/* BLOCK_de115a1d: perf-critical */` placeholders. The model reasons about surrounding code without seeing the protected implementation.

> **Note:** The hook stores temporary backups in `.claude/.simplify-ignore-cache/`. Make sure this path is in your `.gitignore`.

## How it works

One script, three hook events:

| Event | Action |
|---|---|
| `PreToolUse Read` | Backs up file, replaces blocks with `BLOCK_<hash>` placeholders in-place |
| `PostToolUse Edit\|Write` | Expands placeholders back to real code, saves model's changes, re-filters |
| `Stop` | Restores all files from backup when session ends |

Each block is content-hashed (8 hex chars via `shasum`/`sha1sum`) so the round-trip is unambiguous even if the model duplicates or reorders placeholders. Cache is project-scoped to prevent cross-session interference.

## Annotation syntax

```js
/* simplify-ignore-start */           // basic — hides the block
/* simplify-ignore-start: reason */   // with reason — appears in placeholder
/* simplify-ignore-end */
```

Any comment style works (`//`, `/*`, `#`, `<!--`). Multiple blocks per file and single-line blocks supported. Placeholders preserve the original comment syntax (e.g. `# BLOCK_xxx` for Python, `<!-- BLOCK_xxx -->` for HTML).

## Crash recovery

If Claude Code crashes without triggering the Stop hook, files on disk may still have `BLOCK_<hash>` placeholders. To restore manually:

```bash
echo '{}' | bash hooks/simplify-ignore.sh
```

Backups are stored in `.claude/.simplify-ignore-cache/` within your project directory.

## Known limitations

- **Single-line blocks hide the entire line.** If `simplify-ignore-start` and `simplify-ignore-end` appear on the same line as other code, the whole line is hidden from the model, not just the annotated portion. Use dedicated lines for annotations.
- **Comment suffix detection covers `*/` and `-->` only.** Template engines with non-standard comment closers (ERB `%>`, Blade `--}}`) may produce unbalanced placeholders. Use `#` or `//` style comments instead.
- **Fallback expansion is progressive, not exact.** If the model alters a placeholder's formatting (e.g. changes the reason text), the hook tries progressively simpler matches: full placeholder → prefix+hash+suffix → hash-only. The hash-only fallback may leave cosmetic debris (e.g. stray `:` or reason text). A warning is printed to stderr when this happens.
- **File renaming leaves placeholders.** If the model renames or moves a file via a shell command, the new file will retain `BLOCK_<hash>` placeholders. The original code is saved as `<old-filename>.recovered` when the session stops. You must manually restore the recovered code into the new file.

## Requirements

- `jq`, `shasum` or `sha1sum` (auto-detected), Bash 3.2+
