# Agent-First CLI Support Criteria

Use this reference when a skill recommends a command-line tool or changes the flags used to call one. The goal is reliable automation, not a preferred terminal aesthetic.

Last reviewed: 2026-09-05

## Support Decision

A CLI can be a documented default only when all of these are true:

1. **Non-interactive:** It can complete without prompts, a TTY, a pager, or user input.
2. **Parseable:** It has a documented structured or stable machine-readable format. Color, progress bars, and decorative output can be disabled.
3. **Explicit exit semantics:** Success, an empty result, and an execution error can be distinguished without parsing prose.
4. **Deterministic:** The same inputs produce stable ordering and fields, or the caller can request or apply a stable sort.
5. **Safe to probe:** Read-only, dry-run, or idempotent use is available for discovery before mutation.
6. **Maintained and compatible:** The upstream project is active, its license is acceptable, and the documented flags work on the minimum version the skill supports.

If one of these is missing, treat the tool as an optional enhancement. Check for it first, provide a portable fallback, and do not make the workflow depend on it.

## Required Documentation for a CLI Recommendation

Record these facts next to the recommendation or in the contributing PR:

- upstream documentation URL and review date;
- minimum tested version, when a flag is version-dependent;
- exact non-interactive and machine-readable flags;
- exit-code meanings, including the code for an empty result;
- read-only or dry-run mode, permissions required, and fallback command.

Do not add a dependency only to make output prettier. Prefer the repository's installed tools, the standard library, and native platform commands first.

## Patterns for Current Skills

### Search and context collection

- Use `rg --json` when a script will parse match events. For direct agent reading, concise `rg -n` output can cost less context than the JSON event stream.
- Treat an empty search as data, not a crash. `rg` uses exit code 1 when no lines match and 2 for an error.
- Use `--glob` or an explicit path to bound searches. Do not scan generated output or dependency trees unless the task requires it.

See ripgrep's [`--json` flag documentation](https://github.com/BurntSushi/ripgrep/blob/master/crates/core/flags/defs.rs) and [exit status documentation](https://github.com/BurntSushi/ripgrep/blob/master/crates/core/flags/doc/template.rg.1).

### Git inspection

- Use stable formats when another command consumes the result: `git status --porcelain=v1`, `git diff --numstat`, or `git log --format=...`.
- Disable presentation layers in captured output with `--no-pager` and `--no-color` where applicable.
- Prefer read-only inspection before a mutation. A parseable status does not authorize `add`, `commit`, `push`, or history rewriting.

See Git's [porcelain format guarantee](https://git-scm.com/docs/git-status#_porcelain_format_version_1) and [`git diff` output options](https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---numstat).

### GitHub operations

- Request only needed fields with `gh ... --json <fields>` and filter locally with `--jq` or `--template`.
- Run `gh auth status` before workflows that require authentication.
- Use explicit repository and branch arguments in automation; do not depend on an interactive repository picker.

See the GitHub CLI [JSON formatting reference](https://cli.github.com/manual/gh_help_formatting).

### Static analysis and CI

- Use the analyzer already configured by the repository. Prefer its documented JSON, JSON Lines, or SARIF mode when results feed another tool.
- Preserve the analyzer's exit code and stderr. Do not convert a failed analysis into an empty findings list.
- If no structured mode exists, keep the native text output and document its limits instead of adding a parser for unstable prose.

## Preflight Pattern

Before an optional CLI is used, verify that it is installed and can run:

```bash
if command -v tool-name >/dev/null 2>&1 && tool-name --version >/dev/null 2>&1; then
  tool-name --machine-readable ...
else
  portable-fallback ...
fi
```

Replace the placeholders with commands verified in that skill. Never invent a binary name, flag, or fallback from this generic pattern.

## Review Checklist

- [ ] The command is non-interactive in the environment where the skill runs.
- [ ] Structured output and exit codes come from upstream documentation.
- [ ] Empty results remain distinguishable from execution failures.
- [ ] Mutating commands have an explicit authorization or confirmation boundary.
- [ ] Optional tools have a preflight and a documented fallback.
- [ ] The recommendation records the version and date that were verified.
