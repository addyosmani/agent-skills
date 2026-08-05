/**
 * Story title provenance (Q3): honesty over convenience, no fabrication. Reads
 * a referenced spec draft's frontmatter `title:` via the frozen `spec-linter`
 * `parseFrontmatter` - narrow reading (Flag 5 ruling): only `parseFrontmatter`
 * is used, not `validateSpecFrontmatter`, to keep the surface touched minimal.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../../spec-linter/src/index.js'
import { assertContainedPath } from './path-guard.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Resolve `specRef` (a repo-relative POSIX path) against `repoRoot`, read the
 * file, parse its frontmatter, and return a non-empty `title`. Refuses (throws,
 * naming `specRef`) when the file is missing, has no parseable frontmatter, or
 * has a missing/empty `title`. Never fabricates or defaults a title.
 */
export function readSpecTitle(repoRoot: string, specRef: string): string {
  const absPath = join(repoRoot, ...specRef.split('/'))
  assertContainedPath(repoRoot, absPath, specRef)
  if (!existsSync(absPath)) {
    throw new Error(`readSpecTitle: referenced spec '${specRef}' does not exist at ${absPath}`)
  }
  const content = readFileSync(absPath, 'utf8')
  const parsed = parseFrontmatter(content)
  if (!isRecord(parsed)) {
    throw new Error(`readSpecTitle: referenced spec '${specRef}' has no parseable frontmatter`)
  }
  const title = parsed.title
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error(
      `readSpecTitle: referenced spec '${specRef}' has a missing or empty 'title:' field`,
    )
  }
  return title
}
