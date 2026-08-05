// claim-tier.test.ts — the claim-tier executor (#4).
// The property under test is honesty: the tier is exactly what the evidence earns,
// recomputed from counts (never trusted), and at `unverified` the claim asserts no
// parity. Plus: waiver semantics, schema round-trip, DEFENSIBILITY render, receipt merge.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeClaim, releaseBlocked, writeClaimReceipt, ClaimEmitError } from '../src/claim-tier.js';
import type { ComputeClaimInput, ClaimBlock } from '../src/claim-tier.js';
import { validateClaim } from '../src/claim-schema.js';
import { renderDefensibility, writeDefensibility } from '../src/defensibility.js';

// Happy `verified` defaults: recon ran with real legacy+paired evidence, all strata met,
// all contracts covered, strict drift within tolerance.
function baseInput(over: Partial<ComputeClaimInput> = {}): ComputeClaimInput {
  return {
    reconciliation: { ran: true, legacy_sample_count: 10, target_sample_count: 10, paired_comparison_count: 10, strict_drift_within_tolerance: true },
    strata: [
      { stratum: 'happy_path', target: 0.8, achieved: 0.95 },
      { stratum: 'error_cases', target: 0.5, achieved: 0.7 },
      { stratum: 'edge_cases', target: 0.3, achieved: 0.4 },
      { stratum: 'security_flows', target: 0.05, achieved: 0.2 },
    ],
    contracts: [
      { contract_id: 'cid-a', sample_count: 5, paired_comparison_count: 3 },
      { contract_id: 'cid-b', sample_count: 4, paired_comparison_count: 2 },
    ],
    minSamplesPerContract: 3,
    drift_tolerance_ref: 'config.drift.weighted',
    ...over,
  };
}

// ---- the tier ladder ----

test('tier: reconciliation did not run -> unverified (recon_skipped), no parity asserted', () => {
  const c = computeClaim(baseInput({ reconciliation: { ran: false, legacy_sample_count: 0, target_sample_count: 0, paired_comparison_count: 0, strict_drift_within_tolerance: true } }));
  assert.equal(c.tier, 'unverified');
  assert.ok(c.gaps?.some((g) => g.kind === 'recon_skipped'));
  assert.match(c.parity_statement, /No parity is claimed/);
  assert.doesNotMatch(c.parity_statement, /Equivalence/);
});

test('tier: ran but 0 legacy samples -> unverified (no_legacy_samples)', () => {
  const c = computeClaim(baseInput({ reconciliation: { ran: true, legacy_sample_count: 0, target_sample_count: 50, paired_comparison_count: 0, strict_drift_within_tolerance: true } }));
  assert.equal(c.tier, 'unverified');
  assert.ok(c.gaps?.some((g) => g.kind === 'no_legacy_samples'));
});

test('tier: ran, legacy>0 but 0 paired comparisons -> unverified (target-only)', () => {
  const c = computeClaim(baseInput({ reconciliation: { ran: true, legacy_sample_count: 20, target_sample_count: 20, paired_comparison_count: 0, strict_drift_within_tolerance: true } }));
  assert.equal(c.tier, 'unverified');
  assert.ok(c.gaps?.some((g) => g.kind === 'no_legacy_samples'));
});

test('tier: strict drift beyond tolerance -> failed, release blocked', () => {
  const c = computeClaim(baseInput({ reconciliation: { ran: true, legacy_sample_count: 10, target_sample_count: 10, paired_comparison_count: 10, strict_drift_within_tolerance: false } }));
  assert.equal(c.tier, 'failed');
  assert.equal(releaseBlocked(c), true);
  assert.match(c.parity_statement, /release blocked/);
});

test('tier: all targets met, all contracts covered, strict ok -> verified, not blocked', () => {
  const c = computeClaim(baseInput());
  assert.equal(c.tier, 'verified');
  assert.equal(releaseBlocked(c), false);
  assert.equal(c.gaps?.length, 0);
  assert.match(c.parity_statement, /within drift tolerance/);
});

test('tier: an unmet stratum (unwaived) -> partial, gap named', () => {
  const c = computeClaim(baseInput({ strata: [{ stratum: 'security_flows', target: 0.05, achieved: 0.01 }] }));
  assert.equal(c.tier, 'partial');
  assert.ok(c.gaps?.some((g) => g.kind === 'coverage' && /security_flows/.test(g.what)));
});

test('tier: an uncovered contract (unwaived) -> partial', () => {
  const c = computeClaim(baseInput({ contracts: [{ contract_id: 'cid-x', sample_count: 1, paired_comparison_count: 0 }] }));
  assert.equal(c.tier, 'partial');
  assert.ok(c.gaps?.some((g) => g.kind === 'uncovered_contract' && /cid-x/.test(g.what)));
});

test('waiver: a tombstone-waived gap stays named but does NOT lower the tier', () => {
  const c = computeClaim(baseInput({
    strata: [{ stratum: 'security_flows', target: 0.05, achieved: 0.0 }],
    waivers: { security_flows: 'sec-flows-need-prod-creds' },
  }));
  assert.equal(c.tier, 'verified'); // waived -> not counted as unwaived
  const g = c.gaps?.find((x) => x.kind === 'coverage');
  assert.ok(g, 'waived gap is still listed');
  assert.equal(g?.waived_by_tombstone, 'sec-flows-need-prod-creds');
});

test('waiver: one waived stratum + one unwaived contract -> partial (unwaived dominates)', () => {
  const c = computeClaim(baseInput({
    strata: [{ stratum: 'security_flows', target: 0.05, achieved: 0.0 }],
    contracts: [{ contract_id: 'cid-y', sample_count: 0, paired_comparison_count: 0 }],
    waivers: { security_flows: 'sec-waiver' },
  }));
  assert.equal(c.tier, 'partial');
  assert.ok(c.gaps?.some((g) => g.waived_by_tombstone === 'sec-waiver'));
  assert.ok(c.gaps?.some((g) => g.kind === 'uncovered_contract' && !g.waived_by_tombstone));
});

// ---- derivations: never trust input, recompute ----

test('coverage.met is derived (achieved >= target), not taken on faith', () => {
  const c = computeClaim(baseInput({ strata: [
    { stratum: 'happy_path', target: 0.8, achieved: 0.8 }, // exactly meets -> met
    { stratum: 'error_cases', target: 0.5, achieved: 0.49 }, // just under -> not met
  ], contracts: [] }));
  const happy = c.evidence.coverage.find((r) => r.stratum === 'happy_path');
  const error = c.evidence.coverage.find((r) => r.stratum === 'error_cases');
  assert.equal(happy?.met, true);
  assert.equal(error?.met, false);
});

test('contracts_covered counts only (samples >= min AND paired >= 1)', () => {
  const c = computeClaim(baseInput({ contracts: [
    { contract_id: 'cid-ok', sample_count: 5, paired_comparison_count: 2 },  // covered
    { contract_id: 'cid-thin', sample_count: 1, paired_comparison_count: 2 }, // under min
    { contract_id: 'cid-nopair', sample_count: 5, paired_comparison_count: 0 }, // no paired
  ], minSamplesPerContract: 3 }));
  assert.equal(c.evidence.contracts_total, 3);
  assert.equal(c.evidence.contracts_covered, 1);
});

// ---- schema round-trip + catches ----

test('every computed tier validates against claim.schema.json', () => {
  const cases: ComputeClaimInput[] = [
    baseInput(), // verified
    baseInput({ reconciliation: { ran: false, legacy_sample_count: 0, target_sample_count: 0, paired_comparison_count: 0, strict_drift_within_tolerance: true } }), // unverified
    baseInput({ reconciliation: { ran: true, legacy_sample_count: 5, target_sample_count: 5, paired_comparison_count: 5, strict_drift_within_tolerance: false } }), // failed
    baseInput({ strata: [{ stratum: 'edge_cases', target: 0.9, achieved: 0.1 }] }), // partial
  ];
  for (const input of cases) {
    const res = validateClaim(computeClaim(input));
    assert.equal(res.valid, true, res.errors.join('; '));
  }
});

test('validateClaim catches bad tier, missing recon field, and extra prop', () => {
  const good = computeClaim(baseInput()) as unknown as Record<string, unknown>;
  assert.equal(validateClaim({ ...good, tier: 'definitely-fine' }).valid, false);
  assert.equal(validateClaim({ ...good, surprise: true }).valid, false);
  const recon = { ...(good.reconciliation as object) } as Record<string, unknown>;
  delete recon.paired_comparison_count;
  assert.equal(validateClaim({ ...good, reconciliation: recon }).valid, false);
});

// ---- DEFENSIBILITY.md render ----

test('DEFENSIBILITY headline is the tier; counts + waived gap are rendered', () => {
  const c = computeClaim(baseInput({
    strata: [{ stratum: 'security_flows', target: 0.05, achieved: 0.0 }],
    waivers: { security_flows: 'sec-waiver' },
  }));
  const md = renderDefensibility(c);
  assert.match(md, /# ✅ PARITY WITHIN DRIFT TOLERANCE/);
  assert.match(md, /legacy samples: 10/);
  assert.match(md, /accepted via TOMBSTONES\.md#sec-waiver/);
});

test('DEFENSIBILITY for unverified leads with the NOT-A-PROOF headline', () => {
  const c = computeClaim(baseInput({ reconciliation: { ran: false, legacy_sample_count: 0, target_sample_count: 0, paired_comparison_count: 0, strict_drift_within_tolerance: true } }));
  assert.match(renderDefensibility(c), /# ⛔ NOT A PARITY PROOF/);
});

test('writeDefensibility writes the file to disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'defensibility-'));
  try {
    const path = join(dir, 'DEFENSIBILITY.md');
    writeDefensibility(computeClaim(baseInput()), path);
    assert.match(readFileSync(path, 'utf8'), /PARITY WITHIN DRIFT TOLERANCE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- receipt merge ----

test('writeClaimReceipt merges claim into receipts/manifest.json, preserving siblings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claim-receipt-'));
  try {
    const path = join(dir, 'receipts', 'manifest.json');
    mkdirSync(join(dir, 'receipts'), { recursive: true });
    writeFileSync(path, JSON.stringify({ manifest_version: '1.0.0', existing: 'keep-me' }) + '\n', 'utf8');
    const claim = computeClaim(baseInput());
    writeClaimReceipt(claim, path);
    const onDisk = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(onDisk.existing, 'keep-me'); // sibling preserved
    assert.equal(onDisk.claim.tier, 'verified');
    assert.equal(onDisk.claim.evidence.contracts_covered, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeClaimReceipt creates the file fresh when none exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claim-receipt-fresh-'));
  try {
    const path = join(dir, 'receipts', 'manifest.json');
    writeClaimReceipt(computeClaim(baseInput()), path);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).claim.tier, 'verified');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeClaimReceipt refuses to clobber a non-object receipt file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claim-receipt-bad-'));
  try {
    const path = join(dir, 'manifest.json');
    writeFileSync(path, '["not", "an", "object"]', 'utf8');
    assert.throws(() => writeClaimReceipt(computeClaim(baseInput()), path), ClaimEmitError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
