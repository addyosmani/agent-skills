/**
 * Shared test fixtures and helpers. Not a test file (node --test only runs
 * `*.test.ts`), so it defines no `test()` cases.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** A fresh, isolated temp directory used as a fake repo root. */
export function makeTempRepoRoot(): string {
  return mkdtempSync(join(tmpdir(), 'foreman-projection-'))
}

/**
 * `git diff --stat` for `pathSpec`, scoped from the merge-base with
 * `origin/main` (rework item 2) rather than `HEAD` - a `HEAD`-based diff only
 * sees uncommitted working-tree changes, so a frozen-surface modification
 * already *committed* on this branch would slip past it silently. Diffing
 * from the fork point catches anything committed since divergence too.
 */
export function diffStatSinceMergeBase(monorepoRoot: string, pathSpec: string): string {
  const mergeBase = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], {
    cwd: monorepoRoot,
    encoding: 'utf8',
  }).trim()
  return execFileSync('git', ['diff', mergeBase, '--stat', '--', pathSpec], {
    cwd: monorepoRoot,
    encoding: 'utf8',
  })
}

export const ACTIVE_SPECS_REL = 'plugins/foreman-line/docs/specs/active'

/** Write a bare (pre-projection) ShapingResult artifact beneath `repoRoot`. */
export function writeShapingResultFixture(
  repoRoot: string,
  slug: string,
  parcelSpecRefs: readonly string[],
): string {
  const dir = join(repoRoot, ...ACTIVE_SPECS_REL.split('/'))
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${slug}.shaping-result.json`)
  writeFileSync(path, `${JSON.stringify({ parcelSpecRefs, epics: [] }, null, 2)}\n`, 'utf8')
  return path
}

/** Write a minimal spec draft `.md` file at `relPath` (repo-relative POSIX) with the given frontmatter `title`. */
export function writeSpecDraft(repoRoot: string, relPath: string, title: string): string {
  const absPath = join(repoRoot, ...relPath.split('/'))
  mkdirSync(dirname(absPath), { recursive: true })
  const content = `---
ticket: KONE-TBD
title: ${title}
status: draft
owner: clinton.morgan
created: 2026-07-22
updated: 2026-07-22
supersedes: null
superseded_by: null
risk: standard
surfaces: [docs/example.md]
routing_class: standard-feature
---

# ${title}

## Intent
Example.

## Constraints
Example.

## Acceptance Criteria
1. Example.

## Out of Scope
- Example.

## Context & References
- docs/SPEC-CONVENTION.md
`
  writeFileSync(absPath, content, 'utf8')
  return absPath
}

/** Write a spec draft with no YAML frontmatter at all. */
export function writeSpecDraftNoFrontmatter(repoRoot: string, relPath: string): string {
  const absPath = join(repoRoot, ...relPath.split('/'))
  mkdirSync(dirname(absPath), { recursive: true })
  writeFileSync(absPath, '# Not a spec\n\nNo frontmatter here.\n', 'utf8')
  return absPath
}

/** Write a spec draft whose frontmatter has no `title:` field at all. */
export function writeSpecDraftMissingTitle(repoRoot: string, relPath: string): string {
  const p = writeSpecDraft(repoRoot, relPath, 'placeholder')
  const content = readFileSync(p, 'utf8').replace('title: placeholder\n', '')
  writeFileSync(p, content, 'utf8')
  return p
}

/** Write a spec draft whose frontmatter `title:` is empty/whitespace-only. */
export function writeSpecDraftEmptyTitle(repoRoot: string, relPath: string): string {
  const p = writeSpecDraft(repoRoot, relPath, 'placeholder')
  const content = readFileSync(p, 'utf8').replace('title: placeholder\n', "title: ''\n")
  writeFileSync(p, content, 'utf8')
  return p
}
