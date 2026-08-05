// claim-schema.ts — focused validator for the parity `claim` block (claim.schema.json).
// Same posture as approval-schema.ts: a hand-mirror of one small fixed schema is more
// auditable and impossible-to-silently-weaken than a general engine for a single object.
// Mirrors claim.schema.json EXACTLY, including additionalProperties:false at every level.

import type { ClaimBlock } from './claim-tier.js';

const TIERS = ['unverified', 'partial', 'verified', 'failed'] as const;
const STRATA = ['happy_path', 'error_cases', 'edge_cases', 'security_flows'] as const;
const GAP_KINDS = ['coverage', 'uncovered_contract', 'no_legacy_samples', 'recon_skipped'] as const;

const CLAIM_KEYS = new Set(['tier', 'parity_statement', 'drift_tolerance_ref', 'reconciliation', 'evidence', 'gaps']);
const RECON_KEYS = new Set(['ran', 'legacy_sample_count', 'target_sample_count', 'paired_comparison_count', 'strict_drift_within_tolerance']);
const EVID_KEYS = new Set(['contracts_total', 'contracts_covered', 'coverage']);
const COV_KEYS = new Set(['stratum', 'target', 'achieved', 'met']);
const GAP_KEYS = new Set(['what', 'kind', 'waived_by_tombstone']);

export interface ClaimSchemaResult { valid: boolean; errors: string[]; }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isNonNegInt(v: unknown): boolean { return typeof v === 'number' && Number.isInteger(v) && v >= 0; }
function isNonNegNum(v: unknown): boolean { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }

/** Validate a claim block against claim.schema.json. Pure; never throws. */
export function validateClaim(claim: unknown): ClaimSchemaResult {
  const e: string[] = [];
  if (!isRecord(claim)) return { valid: false, errors: ['claim: must be an object'] };

  if (typeof claim.tier !== 'string' || !(TIERS as readonly string[]).includes(claim.tier)) {
    e.push(`tier: required, one of ${TIERS.join(' | ')}`);
  }
  if (typeof claim.parity_statement !== 'string' || claim.parity_statement.length < 1) {
    e.push('parity_statement: required non-empty string');
  }
  if ('drift_tolerance_ref' in claim && typeof claim.drift_tolerance_ref !== 'string') {
    e.push('drift_tolerance_ref: must be a string when present');
  }

  const recon = claim.reconciliation;
  if (!isRecord(recon)) {
    e.push('reconciliation: required object');
  } else {
    if (typeof recon.ran !== 'boolean') e.push('reconciliation.ran: required boolean');
    if (!isNonNegInt(recon.legacy_sample_count)) e.push('reconciliation.legacy_sample_count: required integer >= 0');
    if (!isNonNegInt(recon.target_sample_count)) e.push('reconciliation.target_sample_count: required integer >= 0');
    if (!isNonNegInt(recon.paired_comparison_count)) e.push('reconciliation.paired_comparison_count: required integer >= 0');
    if ('strict_drift_within_tolerance' in recon && typeof recon.strict_drift_within_tolerance !== 'boolean') {
      e.push('reconciliation.strict_drift_within_tolerance: must be boolean when present');
    }
    for (const k of Object.keys(recon)) if (!RECON_KEYS.has(k)) e.push(`reconciliation: unexpected property '${k}'`);
  }

  const evid = claim.evidence;
  if (!isRecord(evid)) {
    e.push('evidence: required object');
  } else {
    if (!isNonNegInt(evid.contracts_total)) e.push('evidence.contracts_total: required integer >= 0');
    if (!isNonNegInt(evid.contracts_covered)) e.push('evidence.contracts_covered: required integer >= 0');
    if (!Array.isArray(evid.coverage)) {
      e.push('evidence.coverage: required array');
    } else {
      evid.coverage.forEach((row, i) => {
        if (!isRecord(row)) { e.push(`evidence.coverage[${i}]: must be an object`); return; }
        if (typeof row.stratum !== 'string' || !(STRATA as readonly string[]).includes(row.stratum)) e.push(`evidence.coverage[${i}].stratum: one of ${STRATA.join(' | ')}`);
        if (!isNonNegNum(row.target)) e.push(`evidence.coverage[${i}].target: number >= 0`);
        if (!isNonNegNum(row.achieved)) e.push(`evidence.coverage[${i}].achieved: number >= 0`);
        if (typeof row.met !== 'boolean') e.push(`evidence.coverage[${i}].met: boolean`);
        for (const k of Object.keys(row)) if (!COV_KEYS.has(k)) e.push(`evidence.coverage[${i}]: unexpected property '${k}'`);
      });
    }
    for (const k of Object.keys(evid)) if (!EVID_KEYS.has(k)) e.push(`evidence: unexpected property '${k}'`);
  }

  if ('gaps' in claim) {
    if (!Array.isArray(claim.gaps)) {
      e.push('gaps: must be an array when present');
    } else {
      claim.gaps.forEach((g, i) => {
        if (!isRecord(g)) { e.push(`gaps[${i}]: must be an object`); return; }
        if (typeof g.what !== 'string' || g.what.length < 1) e.push(`gaps[${i}].what: required non-empty string`);
        if (typeof g.kind !== 'string' || !(GAP_KINDS as readonly string[]).includes(g.kind)) e.push(`gaps[${i}].kind: one of ${GAP_KINDS.join(' | ')}`);
        if ('waived_by_tombstone' in g && typeof g.waived_by_tombstone !== 'string') e.push(`gaps[${i}].waived_by_tombstone: must be a string when present`);
        for (const k of Object.keys(g)) if (!GAP_KEYS.has(k)) e.push(`gaps[${i}]: unexpected property '${k}'`);
      });
    }
  }

  for (const k of Object.keys(claim)) if (!CLAIM_KEYS.has(k)) e.push(`claim: unexpected property '${k}'`);
  return { valid: e.length === 0, errors: e };
}

/** Narrow to ClaimBlock once validated. */
export function asClaimBlock(claim: unknown): ClaimBlock {
  return claim as ClaimBlock;
}
