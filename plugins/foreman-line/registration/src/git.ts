/**
 * Git operations via `node:child_process` (built-in - no dependency). All
 * commands take an explicit `cwd` (the repo root) and pass args as an array to
 * `execFileSync` (never a shell string), so nothing is shell-interpolated.
 * Output is captured in full before any exit code is trusted (lesson #11/#17).
 */
import { execFileSync } from 'node:child_process'

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', [...args], { cwd, encoding: 'utf8' })
}

/** `git config --get remote.origin.url` - the source of the permalink owner/repo. */
export function remoteOriginUrl(cwd: string): string {
  return git(cwd, ['config', '--get', 'remote.origin.url']).trim()
}

/** Current branch name (`git rev-parse --abbrev-ref HEAD`). */
export function currentBranch(cwd: string): string {
  return git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
}

/** The SHA at HEAD (`git rev-parse HEAD`). */
export function revParseHead(cwd: string): string {
  return git(cwd, ['rev-parse', 'HEAD']).trim()
}

/** The SHA of the most recent commit touching `posixPath` (reconcile-mode permalink source). */
export function lastCommitTouching(cwd: string, posixPath: string): string {
  return git(cwd, ['log', '-1', '--format=%H', '--', posixPath]).trim()
}

/** Stage `paths` and commit with `message` (optionally attributing `author`). */
export function addAndCommit(
  cwd: string,
  paths: readonly string[],
  message: string,
  author?: string,
): void {
  git(cwd, ['add', ...paths])
  const args = ['commit', '-m', message]
  if (author !== undefined) args.push(`--author=${author}`)
  git(cwd, args)
}

/** Push the given branch to origin. */
export function push(cwd: string, branch: string): void {
  git(cwd, ['push', 'origin', branch])
}
