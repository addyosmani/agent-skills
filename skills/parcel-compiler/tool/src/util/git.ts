import { execFileSync } from 'node:child_process'

/**
 * Resolve the merge-base SHA between HEAD and `ref`.
 * Returns the 40-char hex SHA, or null when the ref does not resolve or git
 * fails. Callers decide whether null is fatal.
 */
export function mergeBase(cwd: string, ref: string): string | null {
  try {
    const out = execFileSync('git', ['merge-base', 'HEAD', ref], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const sha = out.trim()
    return /^[0-9a-f]{40}$/.test(sha) ? sha : null
  } catch {
    return null
  }
}
