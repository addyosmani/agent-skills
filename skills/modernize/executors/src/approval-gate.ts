// approval-gate.ts — the Phase II -> III/IV wall, in code.
//
// Runs the six-check refuse algorithm from approval-verification.md §5 on EVERY
// transition attempt. Trusts no stored boolean (there is none in the schema): it
// re-derives every fact live. Fail-closed — a check is `pass` ONLY when proven; a
// thrown tool error, a missing prerequisite, or any mismatch is `fail`. The decision
// is `pass` iff all six checks pass; otherwise `refuse` and the run stays in Phase II.
//
// The gate is decoupled from the store and from YAML: it takes the already-parsed
// manifest object, a live discovery-coverage thunk (wrap checkPhase(store,id,'phase1')),
// and a contract resolver (parsed contract body for an entry). Wiring those edges is
// the orchestrator's job; the security logic lives here and is exhaustively testable.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { manifestHash, contractContentHash } from './approval-hash.js';
import type { ApprovalBlock, ApprovalMethod, ContractEntry } from './approval-hash.js';
import { validateApprovalBlock } from './approval-schema.js';
import { extractManifestHash } from './git-verifier.js';
import type { GitVerifier, GitVerifyResult } from './git-verifier.js';

export type CheckStatus = 'pass' | 'fail';
export interface CheckResult { status: CheckStatus; detail: string; }

export interface ApprovalChecks {
  phase_coverage: CheckResult;
  schema: CheckResult;
  signature: CheckResult;
  ref_integrity: CheckResult;
  signed_hash: CheckResult;
  live_hash: CheckResult;
}

export interface ApprovalVerification {
  runId: string;
  transition: string;
  decision: 'pass' | 'refuse';
  checks: ApprovalChecks;
  /** Names of the checks that did not pass (empty iff decision === 'pass'). */
  failures: string[];
  approver?: string;
  signing_key_fingerprint?: string;
  anchor?: { ref: string; object: string };
  manifest_hash?: string;
  verifier_output?: string;
  verified_at: string;
}

export interface DiscoveryCoverageResult { complete: boolean; openCount: number; }

export interface DetachedVerifyConfig {
  allowedSignersFile: string;
  principal: string;
  namespace: string;
}

export interface VerifyApprovalInput {
  runId: string;
  transition: string;
  /** Full manifest object including the `approval` block (as parsed from MANIFEST.yaml). */
  manifest: Record<string, unknown>;
  /** Allowlisted signing-key fingerprints (approval.allowed_signers). */
  allowedSigners: readonly string[];
  git: GitVerifier;
  /** Live discovery-phase coverage — evaluated at verify time, never cached. */
  discoveryCoverage: () => DiscoveryCoverageResult;
  /** Parsed contract body for a manifest entry (for check #6 content-hash re-derivation). */
  resolveContract: (entry: ContractEntry) => unknown;
  now?: () => Date;
  /** Required only when approval.method === 'detached-signature'. */
  detached?: DetachedVerifyConfig;
}

const HASH_RE = /^sha256:[a-f0-9]{64}$/;
function errMsg(err: unknown): string { return err instanceof Error ? err.message : String(err); }
function short(sha: string): string { return sha.length > 12 ? sha.slice(0, 12) : sha; }

/** The gate. Run on every Phase II -> III/IV transition attempt. */
export function verifyApproval(input: VerifyApprovalInput): ApprovalVerification {
  const verifiedAt = (input.now ? input.now() : new Date()).toISOString();
  const approval = (input.manifest as { approval?: unknown }).approval;

  // CHECK 1 — phase coverage (independent of everything else).
  const cov = input.discoveryCoverage();
  const phase_coverage: CheckResult = cov.complete
    ? { status: 'pass', detail: 'discovery phase coverage complete (no open nodes)' }
    : { status: 'fail', detail: `discovery phase incomplete: ${cov.openCount} open node(s)` };

  // CHECK 2 — approval block schema.
  const schemaRes = validateApprovalBlock(approval);
  const schema: CheckResult = schemaRes.valid
    ? { status: 'pass', detail: 'approval block valid against approval.schema.json' }
    : { status: 'fail', detail: `approval block invalid: ${schemaRes.errors.join('; ')}` };

  // CHECK 6 — live hash (recompute + contract content hashes). Independent of git.
  const live_hash = checkLiveHash(input, approval);

  // CHECKS 3/4/5 — signature, ref integrity, signed hash. Need a schema-valid approval.
  let signature: CheckResult;
  let ref_integrity: CheckResult;
  let signed_hash: CheckResult;
  if (schema.status !== 'pass') {
    const reason = 'not evaluated: approval block failed schema check';
    signature = { status: 'fail', detail: reason };
    ref_integrity = { status: 'fail', detail: reason };
    signed_hash = { status: 'fail', detail: reason };
  } else {
    const block = approval as ApprovalBlock;
    const sig = block.method === 'detached-signature'
      ? verifyDetachedPath(input, block)
      : verifyGitPath(input, block);
    signature = sig.signature;
    ref_integrity = sig.ref_integrity;
    signed_hash = sig.signed_hash;
  }

  const checks: ApprovalChecks = { phase_coverage, schema, signature, ref_integrity, signed_hash, live_hash };
  const failures = (Object.keys(checks) as (keyof ApprovalChecks)[]).filter((k) => checks[k].status !== 'pass');
  const block = schema.status === 'pass' ? (approval as ApprovalBlock) : undefined;

  return {
    runId: input.runId,
    transition: input.transition,
    decision: failures.length === 0 ? 'pass' : 'refuse',
    checks,
    failures,
    approver: block?.approver,
    signing_key_fingerprint: block?.anchor.signing_key_fingerprint,
    anchor: block ? { ref: block.anchor.ref, object: block.anchor.object } : undefined,
    manifest_hash: block?.manifest_hash,
    verifier_output: signature.detail,
    verified_at: verifiedAt,
  };
}

interface SigChecks { signature: CheckResult; ref_integrity: CheckResult; signed_hash: CheckResult; }

/** CHECKS 3/4/5 for git-signed-tag / git-signed-commit. */
function verifyGitPath(input: VerifyApprovalInput, block: ApprovalBlock): SigChecks {
  const method = block.method as Exclude<ApprovalMethod, 'detached-signature'>;
  const anchor = block.anchor;

  // 3 — signature verifies AND signer is allowlisted.
  let signature: CheckResult;
  const fpAllowed = input.allowedSigners.includes(anchor.signing_key_fingerprint);
  let sig: GitVerifyResult;
  try { sig = input.git.verifySignature(method, anchor.ref); }
  catch (err) { sig = { ok: false, output: `verifier error: ${errMsg(err)}` }; }
  if (sig.ok && fpAllowed) {
    signature = { status: 'pass', detail: `good signature; signer allowlisted (${anchor.signing_key_fingerprint})` };
  } else if (!sig.ok) {
    signature = { status: 'fail', detail: `signature did not verify: ${sig.output}` };
  } else {
    signature = { status: 'fail', detail: `signature ok but signer not on allowlist: ${anchor.signing_key_fingerprint}` };
  }

  // 4 — ref still resolves to the recorded immutable object (no post-approval repoint).
  let ref_integrity: CheckResult;
  try {
    const resolved = input.git.resolveObject(method, anchor.ref);
    ref_integrity = resolved === anchor.object
      ? { status: 'pass', detail: `ref resolves to recorded object ${short(anchor.object)}` }
      : { status: 'fail', detail: `ref repointed: resolves to ${short(resolved)}, recorded ${short(anchor.object)}` };
  } catch (err) {
    ref_integrity = { status: 'fail', detail: `ref resolve failed: ${errMsg(err)}` };
  }

  // 5 — manifest_hash embedded in the signed message == approval.manifest_hash.
  let signed_hash: CheckResult;
  try {
    const embedded = extractManifestHash(input.git.signedMessage(method, anchor.ref));
    if (!embedded) signed_hash = { status: 'fail', detail: 'no manifest_hash=… found in signed message' };
    else if (embedded !== block.manifest_hash) signed_hash = { status: 'fail', detail: `signed hash ${embedded} != approval.manifest_hash ${block.manifest_hash}` };
    else signed_hash = { status: 'pass', detail: `signed message binds ${embedded}` };
  } catch (err) {
    signed_hash = { status: 'fail', detail: `signed message read failed: ${errMsg(err)}` };
  }

  return { signature, ref_integrity, signed_hash };
}

/** CHECKS 3/4/5 collapse for the detached-signature fallback (§7): one verify over the hash. */
function verifyDetachedPath(input: VerifyApprovalInput, block: ApprovalBlock): SigChecks {
  const anchor = block.anchor;
  if (!input.detached) {
    const d = 'detached-signature method requires detached verify config (allowedSignersFile/principal/namespace)';
    return { signature: { status: 'fail', detail: d }, ref_integrity: { status: 'fail', detail: d }, signed_hash: { status: 'fail', detail: d } };
  }
  const fpAllowed = input.allowedSigners.includes(anchor.signing_key_fingerprint);
  let res: GitVerifyResult;
  try {
    res = input.git.verifyDetached(anchor.ref, block.manifest_hash, input.detached.allowedSignersFile, input.detached.principal, input.detached.namespace);
  } catch (err) {
    res = { ok: false, output: `detached verify error: ${errMsg(err)}` };
  }
  const ok = res.ok && fpAllowed;
  const detail = ok
    ? `detached signature over manifest_hash verified; signer allowlisted (${anchor.signing_key_fingerprint})`
    : !res.ok ? `detached signature did not verify: ${res.output}` : `signature ok but signer not on allowlist: ${anchor.signing_key_fingerprint}`;
  const fail = (d: string): CheckResult => ({ status: 'fail', detail: d });
  return ok
    ? {
        signature: { status: 'pass', detail },
        ref_integrity: { status: 'pass', detail: 'detached: artifact verified (ref/object integrity folded into signature)' },
        signed_hash: { status: 'pass', detail: `detached: signature is over approval.manifest_hash (${block.manifest_hash})` },
      }
    : { signature: fail(detail), ref_integrity: fail('detached: not verified'), signed_hash: fail('detached: not verified') };
}

/** CHECK 6 — recompute manifest_hash live AND re-derive every contract content hash. */
function checkLiveHash(input: VerifyApprovalInput, approval: unknown): CheckResult {
  const claimed = (approval as { manifest_hash?: unknown } | undefined)?.manifest_hash;
  if (typeof claimed !== 'string' || !HASH_RE.test(claimed)) {
    return { status: 'fail', detail: 'no valid approval.manifest_hash to compare against' };
  }
  let recomputed: string;
  try { recomputed = manifestHash(input.manifest); }
  catch (err) { return { status: 'fail', detail: `manifest canonicalization failed: ${errMsg(err)}` }; }
  if (recomputed !== claimed) {
    return { status: 'fail', detail: `live manifest_hash ${recomputed} != approval.manifest_hash ${claimed}` };
  }
  const contracts = Array.isArray(input.manifest.contracts) ? (input.manifest.contracts as ContractEntry[]) : [];
  for (const entry of contracts) {
    let body: unknown;
    try { body = input.resolveContract(entry); }
    catch (err) { return { status: 'fail', detail: `contract ${entry.contract_id}: cannot resolve body (${errMsg(err)})` }; }
    let h: string;
    try { h = contractContentHash(body); }
    catch (err) { return { status: 'fail', detail: `contract ${entry.contract_id}: canonicalization failed (${errMsg(err)})` }; }
    if (h !== entry.content_hash) {
      return { status: 'fail', detail: `contract ${entry.contract_id} content drift: ${h} != recorded ${entry.content_hash}` };
    }
  }
  return { status: 'pass', detail: `manifest_hash matches; ${contracts.length} contract content hash(es) re-derived clean` };
}

/** Write the replayable decision record (approval-verification.md §6). Evidence, not authority. */
export function writeApprovalReceipt(v: ApprovalVerification, receiptPath: string): void {
  const receipt = {
    run_id: v.runId,
    transition: v.transition,
    decision: v.decision,
    checks: {
      phase_coverage: v.checks.phase_coverage.status,
      schema: v.checks.schema.status,
      signature: v.checks.signature.status,
      ref_integrity: v.checks.ref_integrity.status,
      signed_hash: v.checks.signed_hash.status,
      live_hash: v.checks.live_hash.status,
    },
    failures: v.failures,
    check_details: {
      phase_coverage: v.checks.phase_coverage.detail,
      schema: v.checks.schema.detail,
      signature: v.checks.signature.detail,
      ref_integrity: v.checks.ref_integrity.detail,
      signed_hash: v.checks.signed_hash.detail,
      live_hash: v.checks.live_hash.detail,
    },
    approver: v.approver,
    signing_key_fingerprint: v.signing_key_fingerprint,
    anchor: v.anchor,
    manifest_hash: v.manifest_hash,
    verifier_output: v.verifier_output,
    verified_at: v.verified_at,
  };
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
}

export interface ApprovalGateConfig {
  git: GitVerifier;
  allowedSigners: readonly string[];
  now?: () => Date;
  detached?: DetachedVerifyConfig;
}

export interface GateVerifyArgs {
  runId: string;
  transition: string;
  manifest: Record<string, unknown>;
  discoveryCoverage: () => DiscoveryCoverageResult;
  resolveContract: (entry: ContractEntry) => unknown;
}

/** Ergonomic wrapper: hold the static config (git/allowlist/clock), verify per transition. */
export class ApprovalGate {
  constructor(private readonly cfg: ApprovalGateConfig) {}

  verify(args: GateVerifyArgs): ApprovalVerification {
    return verifyApproval({
      ...args,
      git: this.cfg.git,
      allowedSigners: this.cfg.allowedSigners,
      now: this.cfg.now,
      detached: this.cfg.detached,
    });
  }

  verifyAndWriteReceipt(args: GateVerifyArgs, receiptPath: string): ApprovalVerification {
    const v = this.verify(args);
    writeApprovalReceipt(v, receiptPath);
    return v;
  }
}
