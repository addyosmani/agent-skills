// defensibility.ts — renders DEFENSIBILITY.md from a ClaimBlock (defensibility-and-claims.md §5).
//
// The headline IS the tier, stated plainly — no upgrading the language past the earned
// tier. Coverage numbers are real; everything not verified is named (waived gaps stay,
// marked as accepted). This file only formats a claim it is given; it never decides the
// tier (that is computeClaim's job, recomputed from evidence).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ClaimBlock, ClaimTier, Gap } from './claim-tier.js';

const HEADLINE: Record<ClaimTier, string> = {
  unverified: '# ⛔ NOT A PARITY PROOF',
  partial: '# ◑ BOUNDED PARITY',
  verified: '# ✅ PARITY WITHIN DRIFT TOLERANCE, BOUNDED BY COVERAGE',
  failed: '# ✗ RECONCILIATION FAILED',
};

export interface DefensibilityOptions {
  /** Optional override for the "What drift means here" prose; defaults to a generic, honest line. */
  driftMeaning?: string;
  /** Optional replay pointers; default to the stock receipt paths from the template. */
  replay?: { posix?: string; pwsh?: string; hashes?: string };
}

function gapLine(g: Gap): string {
  const waived = g.waived_by_tombstone ? ` (accepted via TOMBSTONES.md#${g.waived_by_tombstone})` : '';
  return `- ${g.what}${waived}`;
}

/** Build the full DEFENSIBILITY.md body for a claim. */
export function renderDefensibility(claim: ClaimBlock, opts: DefensibilityOptions = {}): string {
  const r = claim.reconciliation;
  const drift = claim.drift_tolerance_ref ?? '(none specified)';
  const replayPosix = opts.replay?.posix ?? 'receipts/replay.sh';
  const replayPwsh = opts.replay?.pwsh ?? 'receipts/replay.ps1';
  const hashes = opts.replay?.hashes ?? 'receipts/hashes.sha256';

  const covRows = claim.evidence.coverage.length > 0
    ? claim.evidence.coverage.map((c) => `| ${c.stratum} | ${c.target} | ${c.achieved} | ${c.met ? '✓' : '✗'} |`).join('\n')
    : '| (no strata recorded) | — | — | — |';

  const gaps = claim.gaps ?? [];
  const notVerified = gaps.length > 0
    ? gaps.map(gapLine).join('\n')
    : '- (nothing — all sampled strata and contracts met their targets)';

  const driftMeaning = opts.driftMeaning
    ?? `Strict fields must match exactly; non-strict fields are compared under the drift rules at ${drift}. A future diff outside tolerance on a strict field would invalidate this claim and must re-run reconciliation.`;

  return `${HEADLINE[claim.tier]}

**Claim:** ${claim.parity_statement}
**Drift rules:** ${drift}

## What was proven
- legacy samples: ${r.legacy_sample_count}   target samples: ${r.target_sample_count}   paired comparisons: ${r.paired_comparison_count}
- contracts covered: ${claim.evidence.contracts_covered}/${claim.evidence.contracts_total}

## Coverage achieved (vs target)
| stratum | target | achieved | met |
|-|-|-|-|
${covRows}

## What was NOT verified
${notVerified}

## How to replay
- \`${replayPosix}\` / \`${replayPwsh}\`; hashes in \`${hashes}\`.

## What drift means here
- ${driftMeaning}
`;
}

/** Render and write DEFENSIBILITY.md to disk. */
export function writeDefensibility(claim: ClaimBlock, path: string, opts: DefensibilityOptions = {}): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderDefensibility(claim, opts), 'utf8');
}
