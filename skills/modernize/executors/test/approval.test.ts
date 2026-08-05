// approval.test.ts — the approval-gate executor (#3).
// Exercises canonicalization, both hashes, the schema validator, and every one of
// the six gate checks in BOTH its passing and failing form, with a fake GitVerifier
// (no repo / no keys / deterministic). Fail-closed is the property under test:
// anything that isn't a proven pass must drop the decision to `refuse`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { canonicalize } from '../src/canonical-json.js';
import { CanonicalizationError } from '../src/approval-errors.js';
import { manifestHash, contractContentHash } from '../src/approval-hash.js';
import { validateApprovalBlock } from '../src/approval-schema.js';
import { extractManifestHash } from '../src/git-verifier.js';
import type { GitVerifier, GitVerifyResult } from '../src/git-verifier.js';
import { verifyApproval, ApprovalGate } from '../src/approval-gate.js';
import type { VerifyApprovalInput, DiscoveryCoverageResult } from '../src/approval-gate.js';
import type { ApprovalMethod } from '../src/approval-hash.js';

const FP = 'SHA256:abc123def456deadbeefcafebabefeed00';
const OBJ = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

// A scriptable GitVerifier — each field flips one behavior for a focused test.
class FakeGitVerifier implements GitVerifier {
  sigOk = true;
  resolved = OBJ;
  message = '';
  detachedOk = true;
  constructor(init?: Partial<FakeGitVerifier>) { Object.assign(this, init); }
  verifySignature(_m: ApprovalMethod, _r: string): GitVerifyResult {
    return { ok: this.sigOk, output: this.sigOk ? 'Good "git" signature for clinton.morgan' : 'BAD signature' };
  }
  resolveObject(_m: ApprovalMethod, _r: string): string { return this.resolved; }
  signedMessage(_m: ApprovalMethod, _r: string): string { return this.message; }
  verifyDetached(): GitVerifyResult { return { ok: this.detachedOk, output: this.detachedOk ? 'Good' : 'bad' }; }
}

interface Fixture {
  manifest: Record<string, unknown>;
  contractBody: unknown;
  H: string;
  fakeGit: FakeGitVerifier;
}

// Build a self-consistent happy-path fixture: contract hash, manifest hash, and the
// signed-message hash all line up; signer allowlisted; coverage complete.
function makeFixture(method: ApprovalMethod = 'git-signed-tag'): Fixture {
  const contractBody = { contract_id: 'cid-packs-create-001', behavior: { trigger: 'POST /packs', effect: 'persist' } };
  const content_hash = contractContentHash(contractBody);
  const core: Record<string, unknown> = {
    manifest_version: '1.0.0',
    run_id: 'run-01J000000000000000000000',
    target_stack: 'C# Web API .NET 10',
    contracts: [{ contract_id: 'cid-packs-create-001', version: '1.0.0', path: 'contracts/cid-packs-create-001.yaml', content_hash }],
  };
  const H = manifestHash(core);
  const manifest = {
    ...core,
    approval: {
      approver: 'clinton.morgan',
      approved_at: '2026-06-08T15:04:05Z',
      manifest_hash: H,
      method,
      anchor: { ref: 'modernize/approve/run-01/abc1234', object: OBJ, signing_key_fingerprint: FP },
    },
  };
  return { manifest, contractBody, H, fakeGit: new FakeGitVerifier({ message: `modernize approval manifest_hash=${H}` }) };
}

const COMPLETE = (): DiscoveryCoverageResult => ({ complete: true, openCount: 0 });

function baseInput(fx: Fixture, over: Partial<VerifyApprovalInput> = {}): VerifyApprovalInput {
  return {
    runId: 'run-01',
    transition: 'II->III',
    manifest: fx.manifest,
    allowedSigners: [FP],
    git: fx.fakeGit,
    discoveryCoverage: COMPLETE,
    resolveContract: () => fx.contractBody,
    now: () => new Date('2026-06-09T00:00:00Z'),
    ...over,
  };
}

// ---- canonicalization + hashing ----

test('canonicalize: key order independent, compact, deterministic', () => {
  const a = canonicalize({ b: 1, a: 2, nested: { y: [3, 2, 1], x: true } });
  const b = canonicalize({ nested: { x: true, y: [3, 2, 1] }, a: 2, b: 1 });
  assert.equal(a, b);
  assert.equal(a, '{"a":2,"b":1,"nested":{"x":true,"y":[3,2,1]}}');
});

test('canonicalize: rejects non-finite numbers (not valid JSON)', () => {
  assert.throws(() => canonicalize({ x: NaN }), CanonicalizationError);
  assert.throws(() => canonicalize(Infinity), CanonicalizationError);
});

test('manifestHash: ignores the approval block (strip-then-hash)', () => {
  const core = { manifest_version: '1.0.0', contracts: [{ contract_id: 'cid-x', version: '1.0.0', path: 'p', content_hash: 'sha256:' + 'a'.repeat(64) }] };
  const withApproval = { ...core, approval: { approver: 'x', method: 'git-signed-tag' } };
  assert.equal(manifestHash(core), manifestHash(withApproval));
});

test('manifestHash: changes when a contract content_hash changes (transitive binding)', () => {
  const h1 = manifestHash({ manifest_version: '1.0.0', contracts: [{ content_hash: 'sha256:' + 'a'.repeat(64) }] });
  const h2 = manifestHash({ manifest_version: '1.0.0', contracts: [{ content_hash: 'sha256:' + 'b'.repeat(64) }] });
  assert.notEqual(h1, h2);
});

test('contractContentHash: order-independent and prefixed', () => {
  const h1 = contractContentHash({ a: 1, b: 2 });
  const h2 = contractContentHash({ b: 2, a: 1 });
  assert.equal(h1, h2);
  assert.match(h1, /^sha256:[a-f0-9]{64}$/);
});

test('extractManifestHash: pulls embedded hash, null when absent', () => {
  const h = 'sha256:' + 'c'.repeat(64);
  assert.equal(extractManifestHash(`modernize approval manifest_hash=${h}\n`), h);
  assert.equal(extractManifestHash('no hash here'), null);
});

// ---- schema validator (check #2) ----

test('validateApprovalBlock: a well-formed block is valid', () => {
  const { manifest } = makeFixture();
  assert.equal(validateApprovalBlock((manifest as any).approval).valid, true);
});

test('validateApprovalBlock: catches missing field, bad method, bad hash, extra prop', () => {
  const { manifest } = makeFixture();
  const good = (manifest as any).approval;
  assert.equal(validateApprovalBlock({ ...good, method: 'pinky-promise' }).valid, false);
  assert.equal(validateApprovalBlock({ ...good, manifest_hash: 'nope' }).valid, false);
  assert.equal(validateApprovalBlock({ ...good, surprise: 1 }).valid, false);
  const { approver: _drop, ...missing } = good;
  void _drop;
  assert.equal(validateApprovalBlock(missing).valid, false);
});

// ---- the gate: happy path ----

test('gate: git-signed-tag happy path passes all six checks', () => {
  const fx = makeFixture();
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'pass');
  assert.deepEqual(v.failures, []);
  for (const c of Object.values(v.checks)) assert.equal(c.status, 'pass');
  assert.equal(v.manifest_hash, fx.H);
  assert.equal(v.approver, 'clinton.morgan');
});

// ---- the gate: each check fails in isolation -> refuse ----

test('gate: incomplete discovery coverage -> refuse (only phase_coverage)', () => {
  const fx = makeFixture();
  const v = verifyApproval(baseInput(fx, { discoveryCoverage: () => ({ complete: false, openCount: 3 }) }));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.phase_coverage.status, 'fail');
  assert.deepEqual(v.failures, ['phase_coverage']);
});

test('gate: invalid approval block -> refuse (schema + sig checks fail closed)', () => {
  const fx = makeFixture();
  (fx.manifest as any).approval.method = 'pinky-promise';
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.schema.status, 'fail');
  assert.equal(v.checks.signature.status, 'fail'); // not evaluated == fail-closed
});

test('gate: bad signature -> refuse (signature)', () => {
  const fx = makeFixture();
  fx.fakeGit.sigOk = false;
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.signature.status, 'fail');
});

test('gate: signer not on allowlist -> refuse (signature)', () => {
  const fx = makeFixture();
  const v = verifyApproval(baseInput(fx, { allowedSigners: [] }));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.signature.status, 'fail');
  assert.match(v.checks.signature.detail, /allowlist/);
});

test('gate: ref repointed after approval -> refuse (ref_integrity)', () => {
  const fx = makeFixture();
  fx.fakeGit.resolved = 'f'.repeat(40); // resolves to a different object than anchor.object
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.ref_integrity.status, 'fail');
});

test('gate: signed message binds a different hash -> refuse (signed_hash)', () => {
  const fx = makeFixture();
  fx.fakeGit.message = 'modernize approval manifest_hash=sha256:' + 'd'.repeat(64);
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.signed_hash.status, 'fail');
});

test('gate: manifest tampered after approval -> refuse (live_hash), signed_hash still passes', () => {
  const fx = makeFixture();
  (fx.manifest as any).target_stack = 'tampered after signing';
  const v = verifyApproval(baseInput(fx));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.live_hash.status, 'fail');
  assert.equal(v.checks.signed_hash.status, 'pass');
});

test('gate: contract body swapped on disk -> refuse (live_hash, content drift)', () => {
  const fx = makeFixture();
  const v = verifyApproval(baseInput(fx, { resolveContract: () => ({ contract_id: 'cid-packs-create-001', behavior: 'SWAPPED' }) }));
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.live_hash.status, 'fail');
  assert.match(v.checks.live_hash.detail, /content drift/);
});

// ---- detached-signature fallback (§7) ----

test('gate: detached-signature happy path passes', () => {
  const fx = makeFixture('detached-signature');
  const v = verifyApproval(baseInput(fx, { detached: { allowedSignersFile: '.modernize/allowed_signers', principal: 'clinton.morgan', namespace: 'modernize' } }));
  assert.equal(v.decision, 'pass');
});

test('gate: detached method without detached config -> refuse', () => {
  const fx = makeFixture('detached-signature');
  const v = verifyApproval(baseInput(fx)); // no detached config
  assert.equal(v.decision, 'refuse');
  assert.equal(v.checks.signature.status, 'fail');
});

// ---- receipt (§6) ----

test('ApprovalGate.verifyAndWriteReceipt writes a replayable record', () => {
  const dir = mkdtempSync(join(tmpdir(), 'approval-receipt-'));
  try {
    const fx = makeFixture();
    const gate = new ApprovalGate({ git: fx.fakeGit, allowedSigners: [FP], now: () => new Date('2026-06-09T00:00:00Z') });
    const receiptPath = join(dir, 'receipts', 'approval_verification.json');
    const v = gate.verifyAndWriteReceipt({ runId: 'run-01', transition: 'II->III', manifest: fx.manifest, discoveryCoverage: COMPLETE, resolveContract: () => fx.contractBody }, receiptPath);
    assert.equal(v.decision, 'pass');
    const onDisk = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(onDisk.decision, 'pass');
    assert.equal(onDisk.transition, 'II->III');
    assert.equal(onDisk.checks.signature, 'pass');
    assert.equal(onDisk.manifest_hash, fx.H);
    assert.equal(onDisk.signing_key_fingerprint, FP);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
