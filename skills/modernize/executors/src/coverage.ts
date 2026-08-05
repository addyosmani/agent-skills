// coverage.ts — Coverage-check executor: "is this phase / tree complete?"
//
// Loud-vs-quiet failure (SKILL.md): async trades a loud deadlock for silent
// incompleteness. The coverage check is the antidote — a phase or baseline is
// complete ONLY when every discovered node in it reached a terminal state
// (done|failed). A tree with dangling pending/started nodes is NOT complete.
// This wraps the store's views and adds the blockers themselves for diagnostics.

import type { TaskStore } from './task-store.js';
import type { OpenNodeRow, Phase } from './types.js';

export interface PhaseCoverage {
  runId: string;
  phase: Phase;
  total: number;
  terminal: number;
  open: number;
  hasNodes: boolean;
  /** Coverage half of a phase-transition gate: no node still pending/started. */
  complete: boolean;
  /** The dangling nodes blocking completion (empty when complete). */
  openNodes: OpenNodeRow[];
}

const PHASES: readonly Phase[] = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'phase5'];

/** Coverage check for a single phase. complete === (open === 0). */
export function checkPhase(store: TaskStore, runId: string, phase: Phase): PhaseCoverage {
  const cov = store.coverage(runId, phase);
  const total = cov?.total ?? 0;
  const terminal = cov?.terminal ?? 0;
  const open = cov?.open ?? 0;
  return {
    runId,
    phase,
    total,
    terminal,
    open,
    hasNodes: total > 0,
    complete: open === 0,
    openNodes: open > 0 ? store.openNodes(runId, phase) : [],
  };
}

/** Coverage for every phase that actually has nodes in this run. */
export function checkAllPhases(store: TaskStore, runId: string): PhaseCoverage[] {
  return PHASES.map((p) => checkPhase(store, runId, p)).filter((c) => c.hasNodes);
}

/**
 * Whole-tree completeness: there is at least one discovered node and none remain
 * open. This is the baseline-complete signal for declaring discovery done.
 */
export function isTreeComplete(store: TaskStore, runId: string): boolean {
  const all = store.listNodes(runId);
  if (all.length === 0) return false;
  return store.openNodes(runId).length === 0;
}
