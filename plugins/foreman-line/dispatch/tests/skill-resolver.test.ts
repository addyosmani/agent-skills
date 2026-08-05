/**
 * W2-P5 skill-resolver unit tests.
 *
 * All tests use a fresh tmpDir as repoRoot so no production receipts are
 * touched. The real skill-injection.yaml is copied from the live repo path
 * into each tmpDir fixture for happy-path tests. Error-path tests write
 * missing/malformed/schema-violating YAML directly.
 *
 * Coverage:
 *   - AC2: ui/components/Button.ts → test-coverage + kds-figma
 *   - AC3: plugins/foreman-line/dispatch/src/index.ts → test-coverage only
 *   - AC4 (PAR-2 regression): uix/legacy-widget.ts → test-coverage only (NOT kds-figma)
 *   - AC5: 'ui' exact prefix → test-coverage + kds-figma
 *   - AC6: multiple surfaces, no duplicate skills
 *   - AC7: union across two surface prefixes
 *   - AC8: empty surfaces → universal rule fires → test-coverage
 *   - AC9: receipt fields — all 6 present, role === 'builder', matrixRef correct, timestamp parseable
 *   - AC10: overwrite — second call same workflowId succeeds, receipt has new data
 *   - AC11: MATRIX_UNREADABLE — repoRoot with no skill-injection.yaml
 *   - AC12: MATRIX_INVALID malformed YAML
 *   - AC13: MATRIX_INVALID schema violation (missing required keys)
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveSkills, SkillResolverError } from '../src/skill-resolver/index.js'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const REAL_MATRIX_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skill-injection',
  'skill-injection.yaml',
)

/** Create a fresh tmpDir with the real skill-injection.yaml copied in. */
function makeTempRepoRoot(): string {
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p5-test-'))
  const matrixDir = join(tempRoot, 'plugins', 'foreman-line', 'skill-injection')
  mkdirSync(matrixDir, { recursive: true })
  writeFileSync(join(matrixDir, 'skill-injection.yaml'), readFileSync(REAL_MATRIX_PATH, 'utf8'))
  return tempRoot
}

// ─── AC2: ui child path → test-coverage + kds-figma ─────────────────────────

test('AC2: ui/components/Button.ts resolves to [test-coverage, kds-figma]', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills(
      { surfaces: ['ui/components/Button.ts'], workflowId: 'ac2-test' },
      { repoRoot },
    )
    assert.deepEqual([...result.injectedSkills].sort(), ['kds-figma', 'test-coverage'])
    assert.equal(result.injectionReceiptRef, 'docs/receipts/ac2-test/skill-injection.json')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC3: non-ui path → test-coverage only ───────────────────────────────────

test('AC3: plugins/foreman-line/dispatch/src/index.ts resolves to [test-coverage] only', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills(
      { surfaces: ['plugins/foreman-line/dispatch/src/index.ts'], workflowId: 'ac3-test' },
      { repoRoot },
    )
    assert.deepEqual([...result.injectedSkills], ['test-coverage'])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC4 (PAR-2 regression): 'uix' prefix must NOT match 'ui/*' ─────────────

test('PAR-2 regression: uix/legacy-widget.ts resolves to [test-coverage] NOT kds-figma', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills(
      { surfaces: ['uix/legacy-widget.ts'], workflowId: 'ac4-par2-test' },
      { repoRoot },
    )
    assert.deepEqual([...result.injectedSkills], ['test-coverage'])
    assert.ok(
      !result.injectedSkills.includes('kds-figma'),
      'kds-figma must NOT be injected for uix/ surface',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC5: exact prefix match ('ui' without trailing slash) ───────────────────

test('AC5: surface "ui" (exact prefix) resolves to [test-coverage, kds-figma]', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills({ surfaces: ['ui'], workflowId: 'ac5-test' }, { repoRoot })
    assert.deepEqual([...result.injectedSkills].sort(), ['kds-figma', 'test-coverage'])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: multiple ui surfaces — no duplicate skills ─────────────────────────

test('AC6: [ui/foo.ts, ui/bar.ts] resolves to [test-coverage, kds-figma] without duplicates', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills(
      { surfaces: ['ui/foo.ts', 'ui/bar.ts'], workflowId: 'ac6-test' },
      { repoRoot },
    )
    const skills = [...result.injectedSkills].sort()
    assert.deepEqual(skills, ['kds-figma', 'test-coverage'])
    // Verify no duplicates: Set size equals array length
    assert.equal(new Set(result.injectedSkills).size, result.injectedSkills.length)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC7: union across two different surface prefixes ────────────────────────

test('AC7: [ui/foo.ts, backend/service.ts] resolves to [test-coverage, kds-figma] (union)', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = resolveSkills(
      { surfaces: ['ui/foo.ts', 'backend/service.ts'], workflowId: 'ac7-test' },
      { repoRoot },
    )
    assert.deepEqual([...result.injectedSkills].sort(), ['kds-figma', 'test-coverage'])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC8: empty surfaces — universal rule fires ───────────────────────────────

test('AC8: empty surfaces resolves to [test-coverage] (universal rule fires)', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = 'ac8-test'
  try {
    const result = resolveSkills({ surfaces: [], workflowId }, { repoRoot })
    assert.deepEqual([...result.injectedSkills], ['test-coverage'])
    // S1 (adversarial Q5): verify receipt records surfaces: [] and injectedSkills correctly
    const receiptPath = join(repoRoot, 'docs', 'receipts', workflowId, 'skill-injection.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>
    assert.deepEqual(receipt.surfaces, [], 'receipt must record empty surfaces array')
    assert.deepEqual(
      receipt.injectedSkills,
      ['test-coverage'],
      'receipt must record resolved skills',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC9: receipt fields validation ──────────────────────────────────────────

test('AC9: receipt JSON contains all 6 required fields with correct values', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = 'ac9-receipt-test'
  try {
    resolveSkills({ surfaces: ['ui/Button.ts'], workflowId }, { repoRoot })

    const receiptPath = join(repoRoot, 'docs', 'receipts', workflowId, 'skill-injection.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>

    // All 6 fields must be present
    assert.equal(receipt.workflowId, workflowId)
    assert.equal(receipt.role, 'builder')
    assert.deepEqual(receipt.surfaces, ['ui/Button.ts'])
    assert.ok(Array.isArray(receipt.injectedSkills), 'injectedSkills must be an array')
    assert.equal(
      receipt.matrixRef,
      'plugins/foreman-line/skill-injection/skill-injection.yaml',
      'matrixRef must be the literal string constant',
    )
    assert.ok(typeof receipt.timestamp === 'string', 'timestamp must be a string')
    assert.ok(
      !Number.isNaN(Date.parse(receipt.timestamp as string)),
      'timestamp must parse as a valid ISO 8601 date',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC10: overwrite — second call same workflowId, no error ─────────────────

test('AC10: second call with same workflowId overwrites receipt without error', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = 'ac10-overwrite-test'
  try {
    // First call — ui surface
    resolveSkills({ surfaces: ['ui/first.ts'], workflowId }, { repoRoot })

    // Second call — backend surface (different result)
    resolveSkills({ surfaces: ['backend/service.ts'], workflowId }, { repoRoot })

    const receiptPath = join(repoRoot, 'docs', 'receipts', workflowId, 'skill-injection.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>

    // Must reflect the second call's surfaces
    assert.deepEqual(receipt.surfaces, ['backend/service.ts'])
    // Only test-coverage (no kds-figma for backend/)
    assert.deepEqual((receipt.injectedSkills as string[]).sort(), ['test-coverage'])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC11: MATRIX_UNREADABLE — no skill-injection.yaml in repoRoot ───────────

test('AC11: missing skill-injection.yaml throws SkillResolverError MATRIX_UNREADABLE', () => {
  const emptyRoot = mkdtempSync(join(tmpdir(), 'w2p5-empty-'))
  try {
    assert.throws(
      () =>
        resolveSkills(
          { surfaces: ['ui/foo.ts'], workflowId: 'ac11-test' },
          { repoRoot: emptyRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof SkillResolverError, 'must be a SkillResolverError')
        assert.equal(err.code, 'MATRIX_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(emptyRoot, { recursive: true, force: true })
  }
})

// ─── AC12: MATRIX_INVALID — malformed YAML ───────────────────────────────────

test('AC12: malformed YAML throws SkillResolverError MATRIX_INVALID', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'w2p5-malformed-'))
  try {
    const matrixDir = join(repoRoot, 'plugins', 'foreman-line', 'skill-injection')
    mkdirSync(matrixDir, { recursive: true })
    writeFileSync(join(matrixDir, 'skill-injection.yaml'), 'builder: {invalid: [unclosed')
    assert.throws(
      () => resolveSkills({ surfaces: ['ui/foo.ts'], workflowId: 'ac12-test' }, { repoRoot }),
      (err: unknown) => {
        assert.ok(err instanceof SkillResolverError, 'must be a SkillResolverError')
        assert.equal(err.code, 'MATRIX_INVALID')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC13: MATRIX_INVALID — schema violation (missing required keys) ──────────

test('AC13: valid YAML with missing required keys throws SkillResolverError MATRIX_INVALID', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'w2p5-schema-'))
  try {
    const matrixDir = join(repoRoot, 'plugins', 'foreman-line', 'skill-injection')
    mkdirSync(matrixDir, { recursive: true })
    // Valid YAML but missing required top-level keys (builder, verifier_harness, etc.)
    writeFileSync(join(matrixDir, 'skill-injection.yaml'), 'notBuilder: {}')
    assert.throws(
      () => resolveSkills({ surfaces: ['ui/foo.ts'], workflowId: 'ac13-test' }, { repoRoot }),
      (err: unknown) => {
        assert.ok(err instanceof SkillResolverError, 'must be a SkillResolverError')
        assert.equal(err.code, 'MATRIX_INVALID')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
