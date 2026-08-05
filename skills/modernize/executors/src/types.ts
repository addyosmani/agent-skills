// types.ts — Public types for the modernize choreography store.
//
// ROW types mirror `schemas/task_store.sql` columns 1:1 (snake_case, on purpose):
// the row IS the schema, so there is no mapping layer to drift out of sync.
// INPUT types are camelCase for ergonomics (they are not 1:1 with columns).

/** Discovery/implementation phases a node can belong to (see SKILL.md Phase Workflow). */
export type Phase = 'phase0' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5';

/** A run's current phase: the node phases plus the terminal 'released'. */
export type RunPhase = Phase | 'released';

/** Node lifecycle. Terminal (done|failed) is immutable; enforced in-store by triggers. */
export type NodeStatus = 'pending' | 'started' | 'done' | 'failed';

/** Scope tiers — convention for node_type (open vocabulary, not a hard enum). */
export type ScopeTier = 'root' | 'subsystem' | 'project' | 'module' | 'component';

/** Process kinds — convention for node_type (open vocabulary). */
export type ProcessKind = 'discovery' | 'implementation' | 'reconcile' | 'coverage_check';

/** node_type is an OPEN vocabulary; these are the documented conventions. */
export type NodeType = ScopeTier | ProcessKind | (string & {});

/** What fires a node. Convention, not enforced. */
export type Trigger = 'root' | 'spawn' | 'schedule' | 'event' | 'manual' | (string & {});

/** A modernization run: scopes a node tree, tracks active phase, holds governance ceilings. */
export interface Run {
  run_id: string;
  source_ref: string;
  target_stack: string | null;
  current_phase: RunPhase;
  max_depth: number;
  max_concurrency: number;
  created_at: string;
  updated_at: string;
}

/** One process-skill invocation in the supervised tree. Mirrors `nodes`. */
export interface NodeRow {
  id: string;
  run_id: string;
  parent_id: string | null;
  path: string;
  depth: number;
  node_type: NodeType;
  phase: Phase;
  status: NodeStatus;
  trigger: string | null;
  spawn_reason: string | null;
  result_ref: string | null;
  failure_reason: string | null;
  spawn_budget_total: number;
  spawn_budget_used: number;
  started_at: string | null;
  terminal_at: string | null;
  created_at: string;
}

/** Per-run, per-phase coverage (view v_phase_coverage). Gate opens only when open === 0. */
export interface CoverageRow {
  run_id: string;
  phase: Phase;
  total: number;
  terminal: number;
  open: number;
}

/** A non-terminal node (view v_open_nodes). */
export interface OpenNodeRow {
  run_id: string;
  phase: Phase;
  id: string;
  path: string;
  node_type: NodeType;
  status: Extract<NodeStatus, 'pending' | 'started'>;
  started_at: string | null;
}

/** Durable half of the investigate signal (view v_investigate_candidates): status='started'. */
export interface InvestigateRow {
  run_id: string;
  id: string;
  path: string;
  node_type: NodeType;
  phase: Phase;
  started_at: string | null;
}

/** Input to createRun. ids/paths/budgets default sensibly when omitted. */
export interface CreateRunInput {
  sourceRef: string;
  targetStack?: string;
  runId?: string;
  maxDepth?: number;
  maxConcurrency?: number;
  /** root node */
  rootNodeId?: string;
  rootPath?: string;
  rootNodeType?: NodeType;
  rootPhase?: Phase;
  rootSpawnBudget?: number;
}

/** Input to spawnChild. The child's path is `${parent.path}/${segment}`. */
export interface SpawnInput {
  segment: string;
  nodeType: NodeType;
  phase: Phase;
  id?: string;
  trigger?: Trigger;
  spawnReason?: string;
  /** Fresh child-spawn allotment granted to this child (caps ITS direct children). */
  childSpawnBudget?: number;
}
