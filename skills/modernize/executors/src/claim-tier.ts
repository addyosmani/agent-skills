// claim-tier.ts — the Phase V release gate, in code (#4).
//
// Closes failure mode #5: a run may emit receipts and a DEFENSIBILITY.md only at the
// tier its evidence EARNS. Equivalence is bounded by sampling coverage against
// *captured legacy* behavior — recording the target alone proves nothing. The tier is
// a deterministic function of the reconciliation counts + coverage evidence
// (defensibility-and-claims.md §3); it is recomputed here at emission, never trusted
// as a stored field. A green check on a lie is worse than vibes.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type ClaimTier = 'unverified' | 'partial' | 'verified' | 'failed';
export type Stratum = 'happy_path' | 'error_cases' | 'edge_cases' | 'security_flows';
export type GapKind = 'coverage' | 'uncovered_contract' | 'no_legacy_samples' | 'recon_skipped';

/** A run failed to even produce a usable claim (e.g. cannot write/merge the receipt). */
export class ClaimEmitError extends Error {
  constructor(message: string) { super(message); this.name = new.target.name; }
}

// ---- inputs (what the reconciliation harness measured) ----

export interface ReconciliationInput {
  ran: boolean;
  legacy_sample_count: number;
  target_sample_count: number;
  paired_comparison_count: number;
  /** All strict fields within drift tolerance? false => tier `failed` (rule #6). */
  strict_drift_within_tolerance: boolean;
}

export interface StratumInput { stratum: Stratum; target: number; achieved: number; }
export interface ContractSampleInput { contract_id: string; sample_count: number; paired_comparison_count: number; }

export interface ComputeClaimInput {
  reconciliation: ReconciliationInput;
  /** Per-stratum target vs achieved. `met` is DERIVED here (achieved >= target), never trusted as input. */
  strata: StratumInput[];
  contracts: ContractSampleInput[];
  /** A contract is "covered" iff sample_count >= this AND paired_comparison_count >= 1. */
  minSamplesPerContract: number;
  drift_tolerance_ref?: string;
  /** Map of gap key (stratum name OR contract_id) -> TOMBSTONES.md anchor. Waived gaps stay named, never raise the tier. */
  waivers?: Record<string, string>;
}

// ---- the claim block (matches schemas/claim.schema.json) ----

export interface CoverageRow { stratum: Stratum; target: number; achieved: number; met: boolean; }
export interface ClaimEvidence { contracts_total: number; contracts_covered: number; coverage: CoverageRow[]; }
export interface Gap { what: string; kind: GapKind; waived_by_tombstone?: string; }
export interface ClaimReconciliation {
  ran: boolean;
  legacy_sample_count: number;
  target_sample_count: number;
  paired_comparison_count: number;
  strict_drift_within_tolerance?: boolean;
}
export interface ClaimBlock {
  tier: ClaimTier;
  parity_statement: string;
  drift_tolerance_ref?: string;
  reconciliation: ClaimReconciliation;
  evidence: ClaimEvidence;
  gaps?: Gap[];
}

function msg(err: unknown): string { return err instanceof Error ? err.message : String(err); }

const COV_KINDS: ReadonlySet<GapKind> = new Set<GapKind>(['coverage', 'uncovered_contract']);
function countUnwaived(gaps: Gap[]): number {
  return gaps.filter((g) => COV_KINDS.has(g.kind) && !g.waived_by_tombstone).length;
}

/** Tier-scoped human claim. At `unverified` it asserts NO parity (the load-bearing honesty rule). */
function parityStatement(tier: ClaimTier, unwaivedGaps: number, driftRef?: string): string {
  switch (tier) {
    case 'unverified':
      return 'Target behavior recorded; NOT verified against captured legacy behavior. No parity is claimed.';
    case 'partial':
      return `Equivalence proven within drift tolerance for the sampled subset; ${unwaivedGaps} unverified gap(s) named below.`;
    case 'verified':
      return `Equivalence within drift tolerance${driftRef ? ` (${driftRef})` : ''}, bounded by sampling coverage. Strict fields exact; non-strict within tolerance. Not "identical".`;
    case 'failed':
      return 'Reconciliation ran and a strict field drifted beyond tolerance — release blocked (rule #6).';
    default: { const _exhaustive: never = tier; return _exhaustive; }
  }
}

/**
 * Deterministic tier from evidence (defensibility-and-claims.md §3). Order matters:
 * recon-ran -> legacy-samples>0 -> paired>0 -> strict-drift -> coverage/contract gaps.
 * A tombstone-waived gap stays NAMED in gaps[] but never raises the tier.
 */
export function computeClaim(input: ComputeClaimInput): ClaimBlock {
  const r = input.reconciliation;
  const coverage: CoverageRow[] = input.strata.map((s) => ({
    stratum: s.stratum, target: s.target, achieved: s.achieved, met: s.achieved >= s.target,
  }));
  const isCovered = (c: ContractSampleInput): boolean =>
    c.sample_count >= input.minSamplesPerContract && c.paired_comparison_count >= 1;
  const evidence: ClaimEvidence = {
    contracts_total: input.contracts.length,
    contracts_covered: input.contracts.filter(isCovered).length,
    coverage,
  };
  const waivers = input.waivers ?? {};
  const gaps: Gap[] = [];
  let tier: ClaimTier;

  if (!r.ran) {
    gaps.push({ what: 'reconciliation harness did not run', kind: 'recon_skipped' });
    tier = 'unverified';
  } else if (r.legacy_sample_count === 0) {
    gaps.push({ what: '0 captured legacy samples (recording the target proves nothing)', kind: 'no_legacy_samples' });
    tier = 'unverified';
  } else if (r.paired_comparison_count === 0) {
    gaps.push({ what: '0 paired legacy<->target comparisons (target-only)', kind: 'no_legacy_samples' });
    tier = 'unverified';
  } else {
    // Recon ran with real legacy + paired evidence: enumerate descriptive gaps.
    for (const row of coverage) {
      if (!row.met) {
        const g: Gap = { what: `${row.stratum} coverage ${row.achieved} < target ${row.target}`, kind: 'coverage' };
        if (waivers[row.stratum]) g.waived_by_tombstone = waivers[row.stratum];
        gaps.push(g);
      }
    }
    for (const c of input.contracts) {
      if (!isCovered(c)) {
        const g: Gap = {
          what: `${c.contract_id} uncovered (${c.sample_count} samples vs min ${input.minSamplesPerContract}; ${c.paired_comparison_count} paired)`,
          kind: 'uncovered_contract',
        };
        if (waivers[c.contract_id]) g.waived_by_tombstone = waivers[c.contract_id];
        gaps.push(g);
      }
    }
    if (!r.strict_drift_within_tolerance) tier = 'failed';
    else tier = countUnwaived(gaps) > 0 ? 'partial' : 'verified';
  }

  const claim: ClaimBlock = {
    tier,
    parity_statement: parityStatement(tier, countUnwaived(gaps), input.drift_tolerance_ref),
    reconciliation: {
      ran: r.ran,
      legacy_sample_count: r.legacy_sample_count,
      target_sample_count: r.target_sample_count,
      paired_comparison_count: r.paired_comparison_count,
      strict_drift_within_tolerance: r.strict_drift_within_tolerance,
    },
    evidence,
    gaps,
  };
  if (input.drift_tolerance_ref !== undefined) claim.drift_tolerance_ref = input.drift_tolerance_ref;
  return claim;
}

/** Rule #6: only a `failed` tier blocks release. `unverified` claims nothing but does not itself block. */
export function releaseBlocked(claim: ClaimBlock): boolean {
  return claim.tier === 'failed';
}

/**
 * Merge the claim into receipts/manifest.json under the `claim` key (claim.schema.json:
 * "Emitted into receipts/manifest.json"). Preserves any sibling receipt content; refuses
 * to clobber a file that exists but is not a JSON object.
 */
export function writeClaimReceipt(claim: ClaimBlock, receiptsManifestPath: string): void {
  let base: Record<string, unknown> = {};
  if (existsSync(receiptsManifestPath)) {
    let raw: string;
    try { raw = readFileSync(receiptsManifestPath, 'utf8'); }
    catch (err) { throw new ClaimEmitError(`cannot read ${receiptsManifestPath}: ${msg(err)}`); }
    if (raw.trim().length > 0) {
      let parsed: unknown;
      try { parsed = JSON.parse(raw); }
      catch (err) { throw new ClaimEmitError(`${receiptsManifestPath} is not valid JSON; refusing to clobber: ${msg(err)}`); }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new ClaimEmitError(`${receiptsManifestPath} is not a JSON object; refusing to clobber`);
      }
      base = parsed as Record<string, unknown>;
    }
  }
  base.claim = claim;
  mkdirSync(dirname(receiptsManifestPath), { recursive: true });
  writeFileSync(receiptsManifestPath, JSON.stringify(base, null, 2) + '\n', 'utf8');
}
