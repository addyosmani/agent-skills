/**
 * W4-P2 — hermetic unit tests for `runDocSpineHook` covering all 18 ACs.
 *
 * All tests inject a mock `runVerifyFn` — no import from C:\Repos\docspine
 * or any live DocSpine path. No network, no real git. (AC16)
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { DocSpineAuditReport, DocSpineHookSeams } from '../src/docspine-hook.js'
import { runDocSpineHook } from '../src/docspine-hook.js'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeEmptyReport(): DocSpineAuditReport {
  return {
    generatedAtSha: 'abc1234',
    toolVersion: '0.1.0',
    analysisDepth: 'path-only-spike',
    docFindings: [],
    gaps: [],
    contradictions: [],
  }
}

function mockSeams(report: DocSpineAuditReport): DocSpineHookSeams {
  return {
    runVerifyFn: async () => report,
    getRepoRoot: () => '/repo',
  }
}

// ─── AC2, AC6, AC7: empty report ─────────────────────────────────────────────

test('AC2, AC6, AC7: empty report → exactly 1 summary annotation, exitCode 0', async () => {
  const report = makeEmptyReport()
  const result = await runDocSpineHook(mockSeams(report))

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 1)
  const summary = result.annotations[0]
  assert.ok(summary !== undefined)
  assert.ok(summary.startsWith('::notice::docspine-hook:'), 'summary must be a notice')
  assert.ok(summary.includes('totalDocs=0'))
  assert.ok(summary.includes('brokenDocs=0'))
  assert.ok(summary.includes('brokenClaims=0'))
  assert.ok(summary.includes('unverifiableClaims=0'))
  assert.ok(summary.includes('totalGaps=0'))
  assert.ok(summary.includes('totalContradictions=0'))
  assert.ok(summary.includes('analysisDepth=path-only-spike'))
  assert.ok(summary.includes('sha=abc1234'))
})

// ─── AC5, AC6: all-ok findings → only summary annotation ─────────────────────

test('AC5, AC6: all-ok findings → only 1 summary annotation, no claim annotations', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/spec.md',
    claimFindings: [
      {
        claim: { docId: 'doc/spec.md', line: 5, kind: 'ref', value: 'AC1' },
        status: 'ok',
      },
      {
        claim: { docId: 'doc/spec.md', line: 10, kind: 'ref', value: 'AC2' },
        status: 'ok',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 1)
  const summary = result.annotations[0]
  assert.ok(summary !== undefined)
  assert.ok(summary.includes('totalDocs=1'))
  assert.ok(summary.includes('brokenDocs=0'))
  assert.ok(summary.includes('brokenClaims=0'))
})

// ─── AC3, AC6: one broken claim ───────────────────────────────────────────────

test('AC3, AC6: one broken claim → summary + 1 warning annotation', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/feature.md',
    claimFindings: [
      {
        claim: { docId: 'doc/feature.md', line: 42, kind: 'section', value: '## Goals' },
        status: 'broken',
        detail: 'section heading not found',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 2)

  const summary = result.annotations[0]
  assert.ok(summary !== undefined)
  assert.ok(summary.includes('brokenDocs=1'))
  assert.ok(summary.includes('brokenClaims=1'))
  assert.ok(summary.includes('totalDocs=1'))

  const warning = result.annotations[1]
  assert.ok(warning !== undefined)
  assert.ok(warning.startsWith('::warning::'), 'broken claim must be a warning')
  assert.ok(warning.includes('doc/feature.md:42'))
  assert.ok(warning.includes('kind=section'))
  assert.ok(warning.includes('value=## Goals'))
  assert.ok(warning.includes('status=broken'))
  assert.ok(warning.includes('detail=section heading not found'))
})

// ─── AC3: one moved claim ─────────────────────────────────────────────────────

test('AC3: one moved claim → summary + 1 warning annotation with status=moved', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/old.md',
    claimFindings: [
      {
        claim: { docId: 'doc/old.md', line: 7, kind: 'ref', value: 'ticket-123' },
        status: 'moved',
        movedTo: 'doc/new.md',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 2)

  const warning = result.annotations[1]
  assert.ok(warning !== undefined)
  assert.ok(warning.startsWith('::warning::'), 'moved claim must be a warning')
  assert.ok(warning.includes('status=moved'))
  assert.ok(warning.includes('doc/old.md:7'))
})

// ─── AC4: one unverifiable claim ──────────────────────────────────────────────

test('AC4: one unverifiable claim → summary + 1 notice annotation (not warning)', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/api.md',
    claimFindings: [
      {
        claim: { docId: 'doc/api.md', line: 99, kind: 'link', value: 'https://example.com' },
        status: 'unverifiable',
        detail: 'external URL — skipped',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 2)

  const summary = result.annotations[0]
  assert.ok(summary !== undefined)
  assert.ok(summary.includes('unverifiableClaims=1'))
  assert.ok(summary.includes('brokenClaims=0'))

  const notice = result.annotations[1]
  assert.ok(notice !== undefined)
  assert.ok(notice.startsWith('::notice::'), 'unverifiable claim must be notice, not warning')
  assert.ok(notice.includes('status=unverifiable'))
  assert.ok(notice.includes('doc/api.md:99'))
  assert.ok(notice.includes('detail=external URL — skipped'))
})

// ─── AC6: mixed findings → correct counts in summary ──────────────────────────

test('AC6: mixed findings (broken + moved + unverifiable + ok) → correct summary counts', async () => {
  const report = makeEmptyReport()
  report.docFindings.push(
    {
      docId: 'doc/a.md',
      claimFindings: [
        {
          claim: { docId: 'doc/a.md', line: 1, kind: 'ref', value: 'x' },
          status: 'broken',
        },
        {
          claim: { docId: 'doc/a.md', line: 2, kind: 'ref', value: 'y' },
          status: 'ok',
        },
      ],
    },
    {
      docId: 'doc/b.md',
      claimFindings: [
        {
          claim: { docId: 'doc/b.md', line: 5, kind: 'ref', value: 'z' },
          status: 'moved',
        },
        {
          claim: { docId: 'doc/b.md', line: 6, kind: 'link', value: 'https://...' },
          status: 'unverifiable',
        },
      ],
    },
    {
      docId: 'doc/c.md',
      claimFindings: [
        {
          claim: { docId: 'doc/c.md', line: 3, kind: 'ref', value: 'ok1' },
          status: 'ok',
        },
      ],
    },
  )

  const result = await runDocSpineHook(mockSeams(report))
  assert.equal(result.exitCode, 0)

  const summary = result.annotations[0]
  assert.ok(summary !== undefined)
  // 3 docs total
  assert.ok(summary.includes('totalDocs=3'))
  // brokenDocs: doc/a.md (broken) + doc/b.md (moved) = 2
  assert.ok(summary.includes('brokenDocs=2'))
  // brokenClaims: 1 broken + 1 moved = 2
  assert.ok(summary.includes('brokenClaims=2'))
  // unverifiableClaims: 1
  assert.ok(summary.includes('unverifiableClaims=1'))

  // Should have: 1 summary + 3 claim annotations (broken, moved, unverifiable) = 4
  assert.equal(result.annotations.length, 4)
})

// ─── AC10: gaps annotation ────────────────────────────────────────────────────

test('AC10: gaps.length > 0 → extra notice annotation after summary', async () => {
  const report = makeEmptyReport()
  report.gaps.push({ target: 'src/foo.ts' }, { target: 'src/bar.ts' })

  const result = await runDocSpineHook(mockSeams(report))
  assert.equal(result.exitCode, 0)

  const gapAnnotation = result.annotations.find((a) => a.includes('coverage gaps found'))
  assert.ok(gapAnnotation !== undefined, 'gaps annotation must be present')
  assert.ok(gapAnnotation.startsWith('::notice::'))
  assert.ok(gapAnnotation.includes('2 coverage gaps found'))
})

test('AC10: gaps.length === 0 → no gaps annotation (count is in summary)', async () => {
  const report = makeEmptyReport()
  // gaps is already []
  const result = await runDocSpineHook(mockSeams(report))
  const gapAnnotation = result.annotations.find((a) => a.includes('coverage gaps found'))
  assert.equal(gapAnnotation, undefined, 'no gaps annotation when gaps=0')
  assert.ok(result.annotations[0]?.includes('totalGaps=0'))
})

// ─── AC11: contradictions annotation ─────────────────────────────────────────

test('AC11: contradictions.length > 0 → extra notice annotation', async () => {
  const report = makeEmptyReport()
  report.contradictions.push(
    { docIds: ['doc/a.md', 'doc/b.md'] },
    { docIds: ['doc/c.md', 'doc/d.md'] },
    { docIds: ['doc/e.md', 'doc/f.md'] },
  )

  const result = await runDocSpineHook(mockSeams(report))
  assert.equal(result.exitCode, 0)

  const contAnnotation = result.annotations.find((a) =>
    a.includes('contradiction candidates found'),
  )
  assert.ok(contAnnotation !== undefined, 'contradictions annotation must be present')
  assert.ok(contAnnotation.startsWith('::notice::'))
  assert.ok(contAnnotation.includes('3 contradiction candidates found'))
  assert.ok(contAnnotation.includes('advisory — human review'))
})

test('AC11: contradictions.length === 0 → no contradictions annotation', async () => {
  const report = makeEmptyReport()
  const result = await runDocSpineHook(mockSeams(report))
  const contAnnotation = result.annotations.find((a) =>
    a.includes('contradiction candidates found'),
  )
  assert.equal(contAnnotation, undefined)
  assert.ok(result.annotations[0]?.includes('totalContradictions=0'))
})

// ─── AC9: error resilience — throws ──────────────────────────────────────────

test('AC9: runVerifyFn throws synchronously → 1 warning annotation, exitCode 0', async () => {
  const seams: DocSpineHookSeams = {
    runVerifyFn: () => {
      throw new Error('runVerify exploded')
    },
    getRepoRoot: () => '/repo',
  }

  const result = await runDocSpineHook(seams)

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 1)
  const warning = result.annotations[0]
  assert.ok(warning !== undefined)
  assert.ok(warning.startsWith('::warning::'))
  assert.ok(warning.includes('docspine-hook: skipped — runVerify threw:'))
  assert.ok(warning.includes('runVerify exploded'))
})

test('AC9: runVerifyFn rejects (async) → 1 warning annotation, exitCode 0', async () => {
  const seams: DocSpineHookSeams = {
    runVerifyFn: () => Promise.reject(new Error('async rejection')),
    getRepoRoot: () => '/repo',
  }

  const result = await runDocSpineHook(seams)

  assert.equal(result.exitCode, 0)
  assert.equal(result.annotations.length, 1)
  const warning = result.annotations[0]
  assert.ok(warning !== undefined)
  assert.ok(warning.startsWith('::warning::'))
  assert.ok(warning.includes('async rejection'))
})

// ─── AC3, AC4: detail present vs absent ──────────────────────────────────────

test('AC3: detail present → appears in broken annotation', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/x.md',
    claimFindings: [
      {
        claim: { docId: 'doc/x.md', line: 1, kind: 'ref', value: 'v' },
        status: 'broken',
        detail: 'the exact detail text',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))
  const ann = result.annotations[1]
  assert.ok(ann !== undefined)
  assert.ok(ann.includes('detail=the exact detail text'))
})

test('AC3: detail absent → annotation omits detail= entirely', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/x.md',
    claimFindings: [
      {
        claim: { docId: 'doc/x.md', line: 1, kind: 'ref', value: 'v' },
        status: 'broken',
        // no detail property
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))
  const ann = result.annotations[1]
  assert.ok(ann !== undefined)
  assert.equal(ann.includes('detail='), false, 'detail= must be absent when detail is undefined')
})

test('AC4: detail present → appears in unverifiable annotation', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/y.md',
    claimFindings: [
      {
        claim: { docId: 'doc/y.md', line: 5, kind: 'link', value: 'https://...' },
        status: 'unverifiable',
        detail: 'unverifiable detail',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))
  const ann = result.annotations[1]
  assert.ok(ann !== undefined)
  assert.ok(ann.includes('detail=unverifiable detail'))
})

// ─── AC6: annotation order is [summary, ...per-claim, gaps?, contradictions?] ─

test('AC6: annotation order — summary first, then claims, then gaps, then contradictions', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/z.md',
    claimFindings: [
      {
        claim: { docId: 'doc/z.md', line: 1, kind: 'ref', value: 'v' },
        status: 'broken',
      },
    ],
  })
  report.gaps.push({ target: 'src/foo.ts' })
  report.contradictions.push({ docIds: ['doc/a.md', 'doc/b.md'] })

  const result = await runDocSpineHook(mockSeams(report))
  assert.equal(result.annotations.length, 4)

  assert.ok(result.annotations[0]?.startsWith('::notice::docspine-hook: totalDocs'))
  assert.ok(result.annotations[1]?.startsWith('::warning::docspine-hook'))
  assert.ok(result.annotations[2]?.includes('coverage gaps found'))
  assert.ok(result.annotations[3]?.includes('contradiction candidates found'))
})

// ─── RW1: annotation field sanitization (newlines replaced with spaces) ──────

test('RW1: claim value containing \\n is sanitized — newline becomes a space in annotation', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/evil.md',
    claimFindings: [
      {
        claim: { docId: 'doc/evil.md', line: 1, kind: 'ref', value: 'AC1\n::error::injected' },
        status: 'broken',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))
  const ann = result.annotations[1]
  assert.ok(ann !== undefined)
  // The raw newline must not appear in the annotation string — that is the injection vector
  assert.equal(ann.includes('\n'), false, 'annotation must not contain a literal newline')
  // The annotation must remain a single string (no line-splitting into a spurious command)
  // Newline replaced with space so value reads "AC1 ::error::injected" — still one line
  assert.ok(
    ann.includes('value=AC1 ::error::injected'),
    'newline replaced with space in value field',
  )
})

test('RW1: claim detail containing \\r\\n is sanitized in annotation', async () => {
  const report = makeEmptyReport()
  report.docFindings.push({
    docId: 'doc/crlf.md',
    claimFindings: [
      {
        claim: { docId: 'doc/crlf.md', line: 2, kind: 'ref', value: 'ok' },
        status: 'broken',
        detail: 'line one\r\nline two',
      },
    ],
  })

  const result = await runDocSpineHook(mockSeams(report))
  const ann = result.annotations[1]
  assert.ok(ann !== undefined)
  assert.equal(ann.includes('\r'), false, 'annotation must not contain \\r')
  assert.equal(ann.includes('\n'), false, 'annotation must not contain \\n')
  assert.ok(ann.includes('detail=line one line two'), 'CRLF collapsed to space in detail field')
})

// ─── AC16: no DocSpine import in this test file (assertion by absence) ────────

test('AC16: test file imports no live DocSpine package (hermetic)', () => {
  const TESTS_DIR = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(TESTS_DIR, 'docspine-hook.test.ts'), 'utf8')

  // Extract only import-statement lines so path mentions in comments/assertions
  // do not trigger false positives.
  const importLines = src
    .split('\n')
    .filter((line) => /^\s*(import|export)\s/.test(line))
    .join('\n')

  // No import line may reference the docspine package or local clone.
  assert.equal(
    /from ['"]docspine/.test(importLines),
    false,
    'test must not import from docspine package',
  )
})
