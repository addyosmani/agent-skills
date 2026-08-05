/**
 * W2-P3 routing-eval unit tests.
 *
 * All tests use a fresh tmpDir as repoRoot so no production receipts are
 * touched. The frozen routing-policy.yaml is copied from the real repo path
 * into each tmpDir fixture.
 *
 * Coverage:
 *   - AC2: standard-feature/internal → claude-sonnet-5/standard (spec workflowId)
 *   - AC3: architecture/risk/public  → claude-opus-4-8/frontier  (spec workflowId)
 *   - AC4: boilerplate/public        → claude-haiku-4-5/economy  (spec workflowId)
 *   - AC5: implementation/standard/restricted → claude-sonnet-5/standard
 *   - AC6: all 12 class × data_classification combinations (eval matrix)
 *   - AC7/PAR-2: routing_class 'standard' (old wrong label) → UNKNOWN_CLASS
 *   - AC8: unrecognised data_classification → UNKNOWN_DATA_CLASSIFICATION
 *   - AC9: receipt contains all 7 required fields; policyRef and timestamp valid
 *   - AC10: second call with same workflowId overwrites receipt cleanly
 *   - AC11b: POLICY_UNREADABLE thrown when policy YAML is absent
 *   - F-01: malformed YAML throws RoutingError POLICY_INVALID (not a bare YAMLParseError)
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { evaluateRouting, RoutingError } from '../src/routing-eval/index.js'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const REAL_POLICY_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'routing-policy',
  'routing-policy.yaml',
)

/** Create a fresh tmpDir with the routing-policy.yaml copied in. */
function makeTempRepoRoot(): string {
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p3-test-'))
  const policyDir = join(tempRoot, 'plugins', 'foreman-line', 'routing-policy')
  mkdirSync(policyDir, { recursive: true })
  writeFileSync(join(policyDir, 'routing-policy.yaml'), readFileSync(REAL_POLICY_PATH, 'utf8'))
  return tempRoot
}

// ─── AC2–AC5: named spec assertions ──────────────────────────────────────────

test('AC2: standard-feature/internal resolves to claude-sonnet-5/standard', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = evaluateRouting(
      {
        routing_class: 'standard-feature',
        data_classification: 'internal',
        workflowId: 'test-wf-001',
      },
      { repoRoot },
    )
    assert.equal(result.resolvedModelId, 'claude-sonnet-5')
    assert.equal(result.resolvedTier, 'standard')
    assert.equal(result.routingDecisionRef, 'docs/receipts/test-wf-001/routing-decision.json')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC3: architecture/risk/public resolves to claude-opus-4-8/frontier', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = evaluateRouting(
      {
        routing_class: 'architecture/risk',
        data_classification: 'public',
        workflowId: 'test-wf-002',
      },
      { repoRoot },
    )
    assert.equal(result.resolvedModelId, 'claude-opus-4-8')
    assert.equal(result.resolvedTier, 'frontier')
    assert.equal(result.routingDecisionRef, 'docs/receipts/test-wf-002/routing-decision.json')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC4: boilerplate/public resolves to claude-haiku-4-5/economy', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = evaluateRouting(
      { routing_class: 'boilerplate', data_classification: 'public', workflowId: 'test-wf-003' },
      { repoRoot },
    )
    assert.equal(result.resolvedModelId, 'claude-haiku-4-5')
    assert.equal(result.resolvedTier, 'economy')
    assert.equal(result.routingDecisionRef, 'docs/receipts/test-wf-003/routing-decision.json')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC5: implementation/standard/restricted resolves to claude-sonnet-5/standard', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const result = evaluateRouting(
      {
        routing_class: 'implementation/standard',
        data_classification: 'restricted',
        workflowId: 'test-wf-004',
      },
      { repoRoot },
    )
    assert.equal(result.resolvedModelId, 'claude-sonnet-5')
    assert.equal(result.resolvedTier, 'standard')
    assert.equal(result.routingDecisionRef, 'docs/receipts/test-wf-004/routing-decision.json')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: all 12 class × data_classification combinations ────────────────────

interface EvalCase {
  routing_class: string
  data_classification: string
  expectedModel: string
  expectedTier: string
}

const EVAL_MATRIX: EvalCase[] = [
  // boilerplate → economy → claude-haiku-4-5 (all three data tiers)
  {
    routing_class: 'boilerplate',
    data_classification: 'public',
    expectedModel: 'claude-haiku-4-5',
    expectedTier: 'economy',
  },
  {
    routing_class: 'boilerplate',
    data_classification: 'internal',
    expectedModel: 'claude-haiku-4-5',
    expectedTier: 'economy',
  },
  {
    routing_class: 'boilerplate',
    data_classification: 'restricted',
    expectedModel: 'claude-haiku-4-5',
    expectedTier: 'economy',
  },
  // standard-feature → standard → claude-sonnet-5 (all three data tiers)
  {
    routing_class: 'standard-feature',
    data_classification: 'public',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
  {
    routing_class: 'standard-feature',
    data_classification: 'internal',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
  {
    routing_class: 'standard-feature',
    data_classification: 'restricted',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
  // architecture/risk → frontier → claude-opus-4-8 (all three data tiers)
  {
    routing_class: 'architecture/risk',
    data_classification: 'public',
    expectedModel: 'claude-opus-4-8',
    expectedTier: 'frontier',
  },
  {
    routing_class: 'architecture/risk',
    data_classification: 'internal',
    expectedModel: 'claude-opus-4-8',
    expectedTier: 'frontier',
  },
  {
    routing_class: 'architecture/risk',
    data_classification: 'restricted',
    expectedModel: 'claude-opus-4-8',
    expectedTier: 'frontier',
  },
  // implementation/standard → standard → claude-sonnet-5 (all three data tiers)
  {
    routing_class: 'implementation/standard',
    data_classification: 'public',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
  {
    routing_class: 'implementation/standard',
    data_classification: 'internal',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
  {
    routing_class: 'implementation/standard',
    data_classification: 'restricted',
    expectedModel: 'claude-sonnet-5',
    expectedTier: 'standard',
  },
]

for (const { routing_class, data_classification, expectedModel, expectedTier } of EVAL_MATRIX) {
  test(`AC6: ${routing_class}/${data_classification} → ${expectedModel} (${expectedTier})`, () => {
    const repoRoot = makeTempRepoRoot()
    try {
      const wfId = `matrix-${routing_class.replace('/', '-')}-${data_classification}`
      const result = evaluateRouting(
        { routing_class, data_classification, workflowId: wfId },
        { repoRoot },
      )
      assert.equal(result.resolvedModelId, expectedModel)
      assert.equal(result.resolvedTier, expectedTier)
      assert.equal(result.routingDecisionRef, `docs/receipts/${wfId}/routing-decision.json`)
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  })
}

// ─── AC7 / PAR-2 regression: 'standard' is NOT a valid ClassName ─────────────

test('PAR-2: routing_class "standard" (old wrong label) throws RoutingError UNKNOWN_CLASS', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    assert.throws(
      () =>
        evaluateRouting(
          { routing_class: 'standard', data_classification: 'internal', workflowId: 'par2-test' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof RoutingError, 'must be a RoutingError')
        assert.equal(err.code, 'UNKNOWN_CLASS')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC8: unknown data_classification ────────────────────────────────────────

test('AC8: unrecognised data_classification throws RoutingError UNKNOWN_DATA_CLASSIFICATION', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    assert.throws(
      () =>
        evaluateRouting(
          {
            routing_class: 'standard-feature',
            data_classification: 'top-secret',
            workflowId: 'ac8-test',
          },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof RoutingError, 'must be a RoutingError')
        assert.equal(err.code, 'UNKNOWN_DATA_CLASSIFICATION')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC9: receipt contains all 7 required fields ─────────────────────────────

test('AC9: receipt JSON contains all 7 required fields with correct values', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = 'ac9-receipt-test'
  try {
    evaluateRouting(
      { routing_class: 'standard-feature', data_classification: 'internal', workflowId },
      { repoRoot },
    )

    const receiptPath = join(repoRoot, 'docs', 'receipts', workflowId, 'routing-decision.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>

    assert.equal(receipt.workflowId, workflowId)
    assert.equal(receipt.routing_class, 'standard-feature')
    assert.equal(receipt.data_classification, 'internal')
    assert.equal(receipt.resolvedTier, 'standard')
    assert.equal(receipt.resolvedModelId, 'claude-sonnet-5')
    assert.equal(receipt.policyRef, 'plugins/foreman-line/routing-policy/routing-policy.yaml')
    // timestamp must be parseable as ISO 8601
    assert.ok(typeof receipt.timestamp === 'string', 'timestamp must be a string')
    assert.ok(
      !Number.isNaN(Date.parse(receipt.timestamp as string)),
      'timestamp must parse as a valid ISO 8601 date',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC10: second call overwrites receipt cleanly ────────────────────────────

test('AC10: second call with same workflowId overwrites receipt without error', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = 'ac10-overwrite-test'
  try {
    // First call
    evaluateRouting(
      { routing_class: 'standard-feature', data_classification: 'public', workflowId },
      { repoRoot },
    )

    // Second call — same workflowId, different data_classification
    evaluateRouting(
      { routing_class: 'boilerplate', data_classification: 'internal', workflowId },
      { repoRoot },
    )

    const receiptPath = join(repoRoot, 'docs', 'receipts', workflowId, 'routing-decision.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>

    // Must reflect the second call's values
    assert.equal(receipt.routing_class, 'boilerplate')
    assert.equal(receipt.resolvedModelId, 'claude-haiku-4-5')
    assert.equal(receipt.resolvedTier, 'economy')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC11b: POLICY_UNREADABLE when policy YAML is absent ─────────────────────

test('AC11b: missing policy YAML throws RoutingError POLICY_UNREADABLE', () => {
  // Use a bare tmpDir with no policy file
  const emptyRoot = mkdtempSync(join(tmpdir(), 'w2p3-empty-'))
  try {
    assert.throws(
      () =>
        evaluateRouting(
          { routing_class: 'standard-feature', data_classification: 'internal', workflowId: 'x' },
          { repoRoot: emptyRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof RoutingError, 'must be a RoutingError')
        assert.equal(err.code, 'POLICY_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(emptyRoot, { recursive: true, force: true })
  }
})

// ─── F-01: malformed YAML surfaces as POLICY_INVALID, not a bare YAMLParseError

test('F-01: malformed routing-policy.yaml throws RoutingError POLICY_INVALID', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'w2p3-malformed-'))
  try {
    const policyDir = join(repoRoot, 'plugins', 'foreman-line', 'routing-policy')
    mkdirSync(policyDir, { recursive: true })
    // Write syntactically invalid YAML (unmatched bracket is a parse error)
    writeFileSync(join(policyDir, 'routing-policy.yaml'), 'classes: {invalid: [unclosed')
    assert.throws(
      () =>
        evaluateRouting(
          { routing_class: 'standard-feature', data_classification: 'internal', workflowId: 'f01' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof RoutingError, 'must be a RoutingError, not a bare YAMLParseError')
        assert.equal(err.code, 'POLICY_INVALID')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
