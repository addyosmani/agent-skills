/**
 * Shared test fixtures/helpers. Not a test file (only `*.test.ts` runs), so it
 * defines no `test()` cases. Provides: a recording fake `JiraTransport` (no
 * network), a temp-repo builder with a local bare `origin` (github url via
 * `pushurl`, so `git push` works offline and the permalink parses), and an
 * approved-fixture builder that writes specs + a hash-matching approval record
 * + a genesis receipt.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ApprovalRecord } from '../../approval/src/index.js'
import {
  computeApprovalSubject,
  generateCorrelationContext,
  mintGenesisReceipt,
} from '../../approval/src/index.js'
import type { CorrelationContext, ShapingResult } from '../../contracts/src/index.js'
import type { IssueCreatePayload, IssueUpdatePayload, JiraTransport } from '../src/types.js'

export const ACTIVE_SPECS_REL = 'plugins/foreman-line/docs/specs/active'
export const GITHUB_URL = 'https://github.com/acme/widgets.git'

/**
 * A recording, in-memory `JiraTransport` - no network, ever. `search` models
 * production JQL `~` LOOSELY (a bare-token substring match, capable of
 * multi-match), so the deterministic idempotency proof does not lean on a
 * stricter-than-production matcher (rework item 2 / R3). Exact `~` word-token
 * semantics are verified at the live probe (L4).
 */
export class FakeAdapter implements JiraTransport {
  readonly createCalls: IssueCreatePayload[] = []
  readonly updateCalls: { key: string; payload: IssueUpdatePayload }[] = []
  readonly linkCalls: { key: string; permalink: string }[] = []
  readonly searchCalls: string[] = []
  readonly #issues = new Map<string, { summary: string }>()
  #counter = 0
  /** Mutable so a test can fail the first run's link write, then let the re-run succeed. */
  failOnLink: boolean

  constructor(opts: { failOnLink?: boolean } = {}) {
    this.failOnLink = opts.failOnLink ?? false
  }

  /** Test-only: inject an existing issue with the given summary; returns its key. */
  seed(summary: string): string {
    this.#counter += 1
    const key = `KONE-${1000 + this.#counter}`
    this.#issues.set(key, { summary })
    return key
  }

  async createIssue(payload: IssueCreatePayload): Promise<string> {
    this.createCalls.push(payload)
    return this.seed(payload.fields.summary)
  }

  async updateIssue(key: string, payload: IssueUpdatePayload): Promise<void> {
    this.updateCalls.push({ key, payload })
  }

  async search(jql: string): Promise<readonly string[]> {
    this.searchCalls.push(jql)
    const marker = 'summary ~ "'
    const start = jql.indexOf(marker)
    if (start === -1) return []
    const from = start + marker.length
    const end = jql.indexOf('"', from)
    const token = jql.slice(from, end === -1 ? undefined : end)
    // Loose ~ model: bare-token substring over the summary (multi-match capable).
    const out: string[] = []
    for (const [key, issue] of this.#issues) {
      if (issue.summary.includes(token)) out.push(key)
    }
    return out
  }

  async addRemoteLink(issueKey: string, permalink: string): Promise<string> {
    if (this.failOnLink) throw new Error('simulated link-write failure')
    this.linkCalls.push({ key: issueKey, permalink })
    return `link-${this.linkCalls.length}`
  }
}

export function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', [...args], { cwd, encoding: 'utf8' })
}

/** Turn the temp repo's committer identity on or off (off => `git commit` fails). */
export function setGitIdentity(repoRoot: string, on: boolean): void {
  if (on) {
    git(repoRoot, ['config', 'user.email', 'builder@example.com'])
    git(repoRoot, ['config', 'user.name', 'W1P4 Builder'])
  } else {
    git(repoRoot, ['config', '--unset', 'user.email'])
    git(repoRoot, ['config', '--unset', 'user.name'])
  }
}

/**
 * Force every subsequent `git commit` to fail (a pre-commit hook that exits 1)
 * - a deterministic post-create failure injection that does not depend on the
 * committer identity (which git can resolve from global config).
 */
export function blockCommits(repoRoot: string): void {
  const hook = join(repoRoot, '.git', 'hooks', 'pre-commit')
  mkdirSync(dirname(hook), { recursive: true })
  writeFileSync(hook, '#!/bin/sh\nexit 1\n', { encoding: 'utf8', mode: 0o755 })
}

/** Remove the commit-blocking hook so commits succeed again. */
export function unblockCommits(repoRoot: string): void {
  const hook = join(repoRoot, '.git', 'hooks', 'pre-commit')
  if (existsSync(hook)) rmSync(hook)
}

/** Build a git repo (branch `main`) with a local bare `origin` reachable via `pushurl`. */
export function makeGitRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'foreman-reg-'))
  const bare = mkdtempSync(join(tmpdir(), 'foreman-reg-origin-'))
  git(bare, ['init', '--bare', '-b', 'main'])
  git(repoRoot, ['init', '-b', 'main'])
  setGitIdentity(repoRoot, true)
  git(repoRoot, ['remote', 'add', 'origin', GITHUB_URL])
  git(repoRoot, ['config', 'remote.origin.pushurl', bare])
  return repoRoot
}

export interface SpecSpec {
  readonly stem: string
  readonly title: string
}

export interface Fixture {
  readonly repoRoot: string
  readonly slug: string
  readonly record: ApprovalRecord
  readonly correlation: CorrelationContext
  readonly projectedResult: ShapingResult
  readonly specRefs: readonly string[]
}

function specBody(title: string): string {
  return `---
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
Example intent for ${title}.

## Constraints
Example.

## Acceptance Criteria
1. Example.

## Out of Scope
- Example.

## Context & References
- docs/SPEC-CONVENTION.md
`
}

/**
 * Write specs + a hash-matching approval record + a genesis receipt into an
 * initialized git repo, and make an initial commit (specs already tracked, so
 * back-fill produces a diff). Returns the fixture handles.
 */
export function buildApprovedFixture(
  repoRoot: string,
  slug: string,
  specs: readonly SpecSpec[],
): Fixture {
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_REL.split('/'))
  mkdirSync(activeDir, { recursive: true })

  const specRefs = specs.map((s) => `${ACTIVE_SPECS_REL}/${s.stem}.md`)
  specs.forEach((s, i) => {
    const ref = specRefs[i] as string
    writeFileSync(join(repoRoot, ...ref.split('/')), specBody(s.title), 'utf8')
  })

  const projectedResult: ShapingResult = {
    parcelSpecRefs: specRefs,
    epics: [
      {
        key: `epic-${slug}`,
        title: `Epic for ${slug}`,
        stories: specs.map((s) => ({ key: s.stem, title: s.title })),
      },
    ],
  }

  const { subject, approvedHash } = computeApprovalSubject(projectedResult, repoRoot)
  const correlation = generateCorrelationContext()
  const timestamp = '2026-07-22T12:00:00Z'
  const genesis = mintGenesisReceipt(correlation, subject, timestamp)

  const genesisAbs = join(repoRoot, ...genesis.ref.locator.split('/'))
  mkdirSync(dirname(genesisAbs), { recursive: true })
  writeFileSync(genesisAbs, `${JSON.stringify(genesis.document, null, 2)}\n`, 'utf8')

  const record: ApprovalRecord = {
    approvedHash,
    artifactRef: `${ACTIVE_SPECS_REL}/${slug}.projected.shaping-result.json`,
    subject,
    decision: 'approved',
    timestamp,
    approver: 'clinton.morgan',
    correlation,
    receipt: genesis.ref,
  }
  const recordAbs = join(activeDir, `${slug}.approval.json`)
  writeFileSync(recordAbs, `${JSON.stringify(record, null, 2)}\n`, 'utf8')

  git(repoRoot, ['add', '-A'])
  git(repoRoot, ['commit', '-m', 'chore: fixture initial commit'])
  git(repoRoot, ['push', 'origin', 'main'])

  return { repoRoot, slug, record, correlation, projectedResult, specRefs }
}

/** Convenience: a fresh repo + single-story approved fixture. */
export function singleStoryFixture(): Fixture {
  const repoRoot = makeGitRepo()
  return buildApprovedFixture(repoRoot, 'demo-idea', [{ stem: 'demo-story', title: 'Demo Story' }])
}

/** `git diff --stat` for `pathSpec`, scoped from the merge-base with `origin/main`. */
export function diffStatSinceMergeBase(monorepoRoot: string, pathSpec: string): string {
  const mergeBase = git(monorepoRoot, ['merge-base', 'HEAD', 'origin/main']).trim()
  return git(monorepoRoot, ['diff', mergeBase, '--stat', '--', pathSpec])
}
