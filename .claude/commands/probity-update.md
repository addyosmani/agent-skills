---
description: Update the Probity enforcement layer in this project — package upgrade, config migration, Kiro shim refresh, scope verification
---

`/probity-update` runs in the **project you are building**, not in this skills repo. [Probity](https://github.com/nizos/probity) is the PreToolUse rule engine that blocks tool calls violating the project's engineering rules; `@jjchill/probity-rules` is the npm package of rule presets that ships with this pack. This command upgrades an *existing* install — it does not perform the first install. If Probity has never been set up here, stop and point the user at the README's Quick Start Part 2 instead of improvising an install.

## 0. Preconditions

Confirm `probity.config.ts` exists at the project root and `package.json` lists `@nizos/probity`. If either is missing, STOP and tell the user to complete README Quick Start Part 2 first.

## 1. Detect the layout

Read `probity.config.ts` and check which of two layouts the project is on:

- **Package layout** — the config imports a preset from `@jjchill/probity-rules` (e.g. `import { jsRuleEntries } from '@jjchill/probity-rules/presets/js'`). Continue at step 2.
- **Legacy copied layout** — the config imports `./rules/*.js` and a `rules/` directory sits next to it (this was the pre-package install: rule files were copied wholesale into the project). Offer to migrate:
  1. Rewrite each `./rules/<x>.js` import to `@jjchill/probity-rules/rules/<x>`.
  2. Install the package (`npm install -D @jjchill/probity-rules`).
  3. Confirm the rewritten config loads (run the scope-report check from step 6).
  4. Only after the user approves, delete the vendored `rules/` and `scripts/` directories — but only if `git status`/`git diff` shows them unmodified from what the templates originally shipped. If the user has edited any rule file, keep it and tell the user which files you left in place and why.

## 2. Record versions before

```bash
npm ls @jjchill/probity-rules @nizos/probity --depth=0 --json
npm view @jjchill/probity-rules version
```

If `@jjchill/probity-rules` is installed from a local path or clone rather than the registry (check the `resolved` field), say so explicitly and refresh from that same path instead of the registry in step 3.

## 3. Update the package

```bash
npm update @jjchill/probity-rules
```

Then compare the installed `@nizos/probity` version against `@jjchill/probity-rules`'s `peerDependencies` range (`node_modules/@jjchill/probity-rules/package.json`). If the installed engine falls outside that range, tell the user and do not force an update to `@nizos/probity` yourself.

## 4. Migrate the config

Read `node_modules/@jjchill/probity-rules/CHANGELOG.md` for the entries between the old and new version. Identify which preset the project's config uses (which `@jjchill/probity-rules/presets/*` it imports), then diff the project's `probity.config.ts` against the shipped template for that preset (`node_modules/@jjchill/probity-rules/probity.config.<preset>.ts`) to find options or rules the template now wires that the project's config doesn't.

Propose the concrete edits to the user. Apply them **only with explicit approval**. Never overwrite or regenerate `probity.config.ts` wholesale — it holds this project's real globs, test commands, and layout, which the template cannot know.

Apply each edit so the config still loads after it: add an import in the same edit as its first use, or before it, or rewrite the file in one Write. Probity loads the config on every tool call and blocks everything when the load throws, the edit that would fix it included. From 0.4.19, `probity-claude` blocks a config edit that would leave it unloadable, and lets edits to an already-broken config through; the bare `probity` bin does neither.

From 0.4.21, every preset denies a shell command that writes a file one of its blocks covers (`shellWriteScreen`, hooks/PROBITY.md). It needs no config edit. If the project's config adds its own `{ files, rules }` blocks next to the preset's entries, propose wrapping the whole list in `withShellWriteScreen` with the preset's own screen switched off (`shellWriteScreen: false`), so those blocks are screened as well.

From 0.4.24, the KMP and Kotlin presets take `harnessGlobs`: if the project has a device or app harness whose checks can only run in a signed app (hooks/PROBITY.md, "Adapters only an app can exercise"), propose adding its paths, e.g. `harnessGlobs: ['harness/**']`.

From 0.4.49, `claudeJudge()` runs the Claude Code installed on the machine instead of the copy bundled with Probity's Agent SDK, and the templates set `ai: claudeJudge()`. If the project's config sets no `ai`, its verdicts still run on the bundled copy: propose adding `ai: claudeJudge()` (imported from `@jjchill/probity-rules`). A config that already uses `claudeJudge()`, alone or in a `judgeChain`, needs no edit.

From 0.4.51, the templates export `probityConfig({...})` (from `@jjchill/probity-rules`) in place of Probity's `defineConfig({...})`. It is the same config with every rule labelled by judging task, so `probity-shadow-report` can split verdicts by rule, the project's own rules included. If the config uses `defineConfig`, propose the switch: change the call and the import in one edit, so the config still loads.

From 0.4.63, `probity-scope-report --strict` exits 1 on a plain `!` negation in `tddGlobs` that declares no review obligation. For each one, propose the object form `{ glob, id, reviewWith, check, reason }` (hooks/PROBITY.md, "Review obligations"). If no rule should check those files at all, propose moving the glob to `excludeGlobs` instead.

Also check the Claude Code hook command in `.claude/settings.json`. From 0.4.2, it should run `./node_modules/.bin/probity-claude` instead of `./node_modules/.bin/probity --agent claude-code`, so work done inside sub-agents is judged against the sub-agent's own transcript. Propose that edit with the config edits.

## 5. Refresh the Kiro shim

If `.kiro/hooks/probity-kiro.sh` exists, this project also runs Kiro. Compare each file in `node_modules/@jjchill/probity-rules/kiro/` against its copy in `.kiro/hooks/` (sha256 both sides). Re-copy any that changed — these are vendored files nobody hand-edits — and `chmod +x` the scripts. Skip this step entirely if there's no `.kiro/hooks/` directory.

## 6. Verify

```bash
npx probity-scope-report --config probity.config.ts
```

The config must load with no `DEAD SCOPE` or mis-claim warnings; fix or report any that appear. Then run the project's own test command once to confirm the update didn't break anything else.

## 7. Report

Tell the user:

- Versions before and after (`@jjchill/probity-rules`, `@nizos/probity`)
- Changelog highlights between those versions
- Config edits made, or proposed and declined (with reasons)
- Which Kiro files were refreshed, if any
- The scope-report result

Recommend committing `package.json`, the lockfile, `probity.config.ts`, and any `.kiro/hooks/` changes together — enforcement that isn't committed isn't shared with the team.

## Rationalizations

| Rationalization | Reality |
|---|---|
| "The config diff is noisy, skip step 4" | New rules and options are the entire point of updating — a skipped diff means the project silently keeps enforcing last version's rule set forever. |
| "The scope report was clean last time, skip step 6" | A new preset version can rename or add scope blocks; only a fresh run confirms the project's globs still match. |
| "Just regenerate probity.config.ts from the template" | The template doesn't know this project's real core/adapter globs, test command, or spec layout — overwriting it silently reverts hand-tuned scoping. |
| "Legacy rules/ still works, don't bother migrating" | Rule fixes in the package never reach a project still importing its own copied `rules/` — that's the exact problem this package replaces. |
| "Kiro files look the same, skip the hash check" | A shim change can be a single line (e.g. a new tool-event mapping); eyeballing it is unreliable, sha256 is free. |

## Verification

- [ ] `npm ls @jjchill/probity-rules @nizos/probity --depth=0` shows the expected before/after versions
- [ ] `npx probity-scope-report --config probity.config.ts` is clean (or its remaining warnings are called out explicitly)
- [ ] The project's own test command was run once after the update
- [ ] Every config edit was either applied with explicit approval or listed as proposed-and-declined
- [ ] `.kiro/hooks/` files (if present) match the package's `kiro/` copies by hash
- [ ] The report to the user covers all of: versions, changelog highlights, config edits, Kiro refresh, scope-report result
