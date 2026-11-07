import { execFileSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

import { COMMAND_PREFIXES, parseShell, substitutionsIn, type SimpleCommand } from './shell-writes.js'

/**
 * Which git working tree a `git commit` command records into, so commit
 * gates check that tree rather than the hook's own checkout. Claude Code
 * creates `isolation: "worktree"` sub-agent trees inside the project at
 * .claude/worktrees/<name>/, and a commit there must be judged by that
 * tree's files (issues #39, #57).
 */

// `git commit`, including global options before the subcommand
// (`git -C <dir> commit`, `git -c key=value commit`, `git --no-pager
// commit`), but not plumbing that merely starts with the word
// (`git commit-tree`, `git commit-graph`).
export const GIT_COMMIT =
  /\bgit(?:\s+(?:-[Cc]\s+(?:"[^"]*"|'[^']*'|\S+)|--?[\w-]+(?:=\S+)?))*\s+commit(?![\w-])/

// Commands that treat their arguments and stdin as data, never as code:
// `git commit` in an issue body, an echo or a heredoc written to a file
// is not a commit (issue #121). Every other command might run the text
// (a shell, `eval`, `xargs`, `find -exec`, an interpreter), so for those
// the words still count wherever they appear.
const DATA_COMMANDS = new Set([
  'cat', 'echo', 'printf', 'tee', 'gh', 'glab', 'grep', 'egrep', 'fgrep', 'rg', 'head', 'tail',
  'wc', 'jq', 'yq', 'ls', 'mkdir', 'touch', 'cd', 'pushd', 'popd', 'test', '[', 'true', 'false',
  'sort', 'uniq', 'cut', 'tr', 'diff', 'column', 'base64', 'pbcopy',
])
// git's global options that take a separate value (`git -C <dir> commit`).
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix'])
export function gitSubcommand(args: string[]): string | undefined {
  for (let k = 0; k < args.length; k++) {
    const arg = args[k]!
    if (GIT_VALUE_OPTIONS.has(arg)) k++
    else if (!arg.startsWith('-')) return arg
  }
  return undefined
}

function runsGitCommit(command: SimpleCommand): boolean {
  // `$(…)` and backticks run wherever the shell expands them, so judge
  // the command inside: `$(cat <<'EOF' … EOF)` only prints its text.
  const inner = [...command.substitutions, ...command.expandingStdin.flatMap(substitutionsIn)]
  if (inner.some(isGitCommit)) return true
  let k = 0
  while (k < command.words.length && (/^[A-Za-z_]\w*=/.test(command.words[k]!) || COMMAND_PREFIXES.has(command.words[k]!))) k++
  const name = basename(command.words[k] ?? '')
  if (name === 'git') return gitSubcommand(command.words.slice(k + 1)) === 'commit'
  if (name === '' || DATA_COMMANDS.has(name)) return false
  // A command that may execute text: its words, its stdin, and whatever a
  // pipeline feeds it.
  const texts = [...command.words, ...command.stdin]
  for (let from = command.pipedFrom; from; from = from.pipedFrom) texts.push(...from.words, ...from.stdin)
  return GIT_COMMIT.test(texts.join('\n'))
}

/**
 * Whether a shell command runs `git commit` (issue #121): `git` with
 * `commit` as its subcommand, or the words reaching a command that might
 * execute them. Text that is only data (a heredoc written to a file with
 * `cat`, an `echo`, a `gh` issue body) does not count. When in doubt it
 * counts, so the commit gates fail closed.
 */
export function isGitCommit(command: string): boolean {
  if (!GIT_COMMIT.test(command)) return false
  return parseShell(command).some(runsGitCommit)
}

export function canonical(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

// The directory a `git commit` command acts in: `git -C <dir>`, else a
// leading `cd <dir> &&`, else the hook's own working directory.
export function commitDirectory(command: string): string {
  const unquote = (value: string) => value.replace(/^(['"])(.*)\1$/, '$2')
  const gitDashC = command.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)[^;&|]*\bcommit\b/)
  const cd = command.match(/(?:^|&&|;)\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|]+)\s*(?:&&|;)[^]*\bgit\b[^;&|]*\bcommit\b/)
  const target = gitDashC?.[1] ?? cd?.[1]
  if (!target) return process.cwd()
  const dir = unquote(target)
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir)
}

export function gitToplevel(dir: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

/** True when `child` is `parent` itself or lies below it. */
export function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}

/**
 * The toplevel of the git working tree `command` commits into, when that
 * tree is nested strictly inside `base` (a linked worktree or submodule
 * below the project); otherwise null, meaning "check `base` as usual".
 */
export function nestedCommitTree(command: string, base: string): string | null {
  const dir = commitDirectory(command)
  const top = existsSync(dir) ? gitToplevel(dir) : null
  if (!top) return null
  const [outer, inner] = [canonical(base), canonical(top)]
  return outer !== inner && isWithin(outer, inner) ? inner : null
}
