// task-store.ts — Durable choreography node tree for the modernize skill.
//
// Honors schemas/task_store.sql exactly. The STORE enforces the lifecycle
// (terminal immutable, started-once, loud-failure) via SQL triggers; this layer
// adds the three invariants SQL can't express alone and surfaces the views:
//   * concurrency ceiling  (runs.max_concurrency, app-checked before start)
//   * depth fuse           (runs.max_depth, app-checked before spawn)
//   * atomic budget spend  (parent.spawn_budget_used++ co-committed with child insert)
//
// DOCTRINE: this is a SUPERVISED TREE, not a queue. There is NO reap/requeue and
// no API to mutate another node's terminal state. A node leaves 'started' only by
// writing its OWN terminal row (completeNode/failNode called by that process).
// The watcher composes investigateCandidates() with Redis presence elsewhere (#2).

import { DatabaseSync } from 'node:sqlite';
import { loadDdl } from './ddl.js';
import { newId } from './ids.js';
import {
  BudgetExhaustedError,
  ConcurrencyCeilingError,
  DepthFuseError,
  DuplicatePathError,
  IllegalTransitionError,
  LoudFailureError,
  NodeNotFoundError,
  RunNotFoundError,
} from './errors.js';
import type {
  CoverageRow,
  CreateRunInput,
  InvestigateRow,
  NodeRow,
  OpenNodeRow,
  Run,
  RunPhase,
  SpawnInput,
} from './types.js';

type DB = DatabaseSync;
type Stmt = ReturnType<DatabaseSync['prepare']>;

export interface TaskStoreOptions {
  path: string;
  /** Override the DDL (tests use an in-memory db with the same source). */
  ddl?: string;
  /** Open read-only — for the watcher running alongside writers (WAL allows it). */
  readonly?: boolean;
}

function isUniqueViolation(err: unknown): boolean {
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : '';
  // SQLite reports both UNIQUE(run_id,path) and PRIMARY KEY conflicts this way.
  return /UNIQUE constraint failed/i.test(msg);
}

export class TaskStore {
  readonly #db: DB;
  readonly #s: Record<string, Stmt>;
  #txDepth = 0;
  #spSeq = 0;

  constructor(opts: TaskStoreOptions) {
    this.#db = new DatabaseSync(opts.path, {
      readOnly: !!opts.readonly,
      // foreign_keys is per-connection in SQLite — the schema doctrine REQUIRES it
      // on every connection. node:sqlite sets it via this option; we also assert it
      // via PRAGMA below (belt-and-suspenders).
      enableForeignKeyConstraints: true,
    });
    this.#db.exec('PRAGMA foreign_keys = ON');
    if (opts.readonly) {
      this.#db.exec('PRAGMA query_only = ON');
    } else {
      this.#db.exec('PRAGMA journal_mode = WAL');
      this.#db.exec(opts.ddl ?? loadDdl());
    }
    this.#s = this.#prepare();
  }

  #prepare(): Record<string, Stmt> {
    const db = this.#db;
    return {
      insertRun: db.prepare(
        `INSERT INTO runs (run_id, source_ref, target_stack, max_depth, max_concurrency)
         VALUES (@run_id, @source_ref, @target_stack, @max_depth, @max_concurrency)`,
      ),
      insertNode: db.prepare(
        `INSERT INTO nodes
           (id, run_id, parent_id, path, depth, node_type, phase, status, "trigger",
            spawn_reason, result_ref, failure_reason, spawn_budget_total, spawn_budget_used)
         VALUES
           (@id, @run_id, @parent_id, @path, @depth, @node_type, @phase, @status, @trigger,
            @spawn_reason, @result_ref, @failure_reason, @spawn_budget_total, @spawn_budget_used)`,
      ),
      selRun: db.prepare(`SELECT * FROM runs WHERE run_id = @run_id`),
      selNode: db.prepare(`SELECT * FROM nodes WHERE id = @id`),
      selNodeByPath: db.prepare(`SELECT * FROM nodes WHERE run_id = @run_id AND path = @path`),
      selChildren: db.prepare(`SELECT * FROM nodes WHERE parent_id = @parent_id ORDER BY path`),
      selNodesByRun: db.prepare(`SELECT * FROM nodes WHERE run_id = @run_id ORDER BY path`),
      updPhase: db.prepare(
        `UPDATE runs SET current_phase = @phase,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE run_id = @run_id`,
      ),
      updStarted: db.prepare(`UPDATE nodes SET status = 'started' WHERE id = @id`),
      updDone: db.prepare(
        `UPDATE nodes SET status = 'done', result_ref = @result_ref WHERE id = @id`,
      ),
      updFailed: db.prepare(
        `UPDATE nodes SET status = 'failed', failure_reason = @failure_reason WHERE id = @id`,
      ),
      bumpBudget: db.prepare(
        `UPDATE nodes SET spawn_budget_used = spawn_budget_used + 1 WHERE id = @id`,
      ),
      countStarted: db.prepare(
        `SELECT COUNT(*) AS n FROM nodes WHERE run_id = @run_id AND status = 'started'`,
      ),
      selOpen: db.prepare(
        `SELECT run_id, phase, id, path, node_type, status, started_at FROM v_open_nodes
         WHERE (@run_id IS NULL OR run_id = @run_id)
           AND (@phase  IS NULL OR phase  = @phase)
         ORDER BY path`,
      ),
      selCoverage: db.prepare(
        `SELECT run_id, phase, total, terminal, open FROM v_phase_coverage
         WHERE run_id = @run_id AND phase = @phase`,
      ),
      selCoverageByRun: db.prepare(
        `SELECT run_id, phase, total, terminal, open FROM v_phase_coverage
         WHERE run_id = @run_id ORDER BY phase`,
      ),
      selInvestigate: db.prepare(
        `SELECT run_id, id, path, node_type, phase, started_at FROM v_investigate_candidates
         WHERE (@run_id IS NULL OR run_id = @run_id)
         ORDER BY started_at`,
      ),
    };
  }

  // ── Runs ──────────────────────────────────────────────────────────────

  /** Create a run and its root node (pending) atomically. */
  createRun(input: CreateRunInput): { run: Run; root: NodeRow } {
    const run_id = input.runId ?? newId();
    const rootId = input.rootNodeId ?? newId();
    const rootPath = input.rootPath ?? 'root';
    this.withTransaction(() => {
      this.#s.insertRun!.run({
        run_id,
        source_ref: input.sourceRef,
        target_stack: input.targetStack ?? null,
        max_depth: input.maxDepth ?? 5,
        max_concurrency: input.maxConcurrency ?? 8,
      });
      this.#s.insertNode!.run({
        id: rootId,
        run_id,
        parent_id: null,
        path: rootPath,
        depth: 0,
        node_type: input.rootNodeType ?? 'root',
        phase: input.rootPhase ?? 'phase0',
        status: 'pending',
        trigger: 'root',
        spawn_reason: null,
        result_ref: null,
        failure_reason: null,
        spawn_budget_total: input.rootSpawnBudget ?? 0,
        spawn_budget_used: 0,
      });
    });
    return { run: this.getRun(run_id)!, root: this.getNode(rootId)! };
  }

  getRun(runId: string): Run | undefined {
    return this.#s.selRun!.get({ run_id: runId }) as Run | undefined;
  }

  /** Raw phase set. Gate POLICY (coverage clear + approval verified) lives above this. */
  setRunPhase(runId: string, phase: RunPhase): void {
    const r = this.#s.updPhase!.run({ run_id: runId, phase });
    if (Number(r.changes) === 0) throw new RunNotFoundError(runId);
  }

  // ── Nodes ─────────────────────────────────────────────────────────────

  getNode(id: string): NodeRow | undefined {
    return this.#s.selNode!.get({ id }) as NodeRow | undefined;
  }

  getNodeByPath(runId: string, path: string): NodeRow | undefined {
    return this.#s.selNodeByPath!.get({ run_id: runId, path }) as NodeRow | undefined;
  }

  listChildren(parentId: string): NodeRow[] {
    return this.#s.selChildren!.all({ parent_id: parentId }) as unknown as NodeRow[];
  }

  listNodes(runId: string): NodeRow[] {
    return this.#s.selNodesByRun!.all({ run_id: runId }) as unknown as NodeRow[];
  }

  /**
   * Spawn a child of `parentId`. Atomic: budget check + depth fuse + insert +
   * parent budget increment all co-commit. Path = `${parent.path}/${segment}`.
   */
  spawnChild(parentId: string, input: SpawnInput): NodeRow {
    return this.withTransaction((): NodeRow => {
      const parent = this.getNode(parentId);
      if (!parent) throw new NodeNotFoundError(parentId);
      const run = this.getRun(parent.run_id);
      if (!run) throw new RunNotFoundError(parent.run_id);

      if (parent.spawn_budget_used + 1 > parent.spawn_budget_total) {
        throw new BudgetExhaustedError(
          `node ${parentId} spawn budget exhausted (${parent.spawn_budget_used}/${parent.spawn_budget_total})`,
        );
      }
      const depth = parent.depth + 1;
      if (depth > run.max_depth) {
        throw new DepthFuseError(`child depth ${depth} exceeds max_depth ${run.max_depth}`);
      }

      const childId = input.id ?? newId();
      const childPath = `${parent.path}/${input.segment}`;
      try {
        this.#s.insertNode!.run({
          id: childId,
          run_id: parent.run_id,
          parent_id: parentId,
          path: childPath,
          depth,
          node_type: input.nodeType,
          phase: input.phase,
          status: 'pending',
          trigger: input.trigger ?? 'spawn',
          spawn_reason: input.spawnReason ?? null,
          result_ref: null,
          failure_reason: null,
          spawn_budget_total: input.childSpawnBudget ?? 0,
          spawn_budget_used: 0,
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new DuplicatePathError(
            `path '${childPath}' already exists in run ${parent.run_id}`,
          );
        }
        throw err;
      }
      this.#s.bumpBudget!.run({ id: parentId });
      return this.getNode(childId)!;
    });
  }

  /** pending -> started. Enforces the run's concurrency ceiling atomically. */
  startNode(id: string): NodeRow {
    return this.withTransaction((): NodeRow => {
      const node = this.getNode(id);
      if (!node) throw new NodeNotFoundError(id);
      if (node.status !== 'pending') {
        throw new IllegalTransitionError(
          `startNode requires 'pending'; node ${id} is '${node.status}'`,
        );
      }
      const run = this.getRun(node.run_id)!;
      const { n } = this.#s.countStarted!.get({ run_id: node.run_id }) as { n: number };
      if (n >= run.max_concurrency) {
        throw new ConcurrencyCeilingError(
          `run ${node.run_id} at concurrency ceiling ${run.max_concurrency}`,
        );
      }
      this.#s.updStarted!.run({ id });
      return this.getNode(id)!;
    });
  }

  /** started -> done. Optionally records a pointer to the durable output artifact. */
  completeNode(id: string, resultRef?: string): NodeRow {
    const node = this.getNode(id);
    if (!node) throw new NodeNotFoundError(id);
    if (node.status !== 'started') {
      throw new IllegalTransitionError(
        `completeNode requires 'started'; node ${id} is '${node.status}'`,
      );
    }
    this.#s.updDone!.run({ id, result_ref: resultRef ?? null });
    return this.getNode(id)!;
  }

  /** pending|started -> failed. Loud failure: a non-empty reason is mandatory. */
  failNode(id: string, failureReason: string): NodeRow {
    if (!failureReason || failureReason.trim().length === 0) {
      throw new LoudFailureError('failNode requires a non-empty failure_reason (never quiet)');
    }
    const node = this.getNode(id);
    if (!node) throw new NodeNotFoundError(id);
    if (node.status === 'done' || node.status === 'failed') {
      throw new IllegalTransitionError(
        `failNode cannot leave terminal state; node ${id} is '${node.status}'`,
      );
    }
    this.#s.updFailed!.run({ id, failure_reason: failureReason });
    return this.getNode(id)!;
  }

  // ── Watcher / coverage reads (the gate's evidence) ──────────────────────

  /** Non-terminal nodes (pending|started), optionally scoped to run and/or phase. */
  openNodes(runId?: string, phase?: string): OpenNodeRow[] {
    return this.#s.selOpen!.all({
      run_id: runId ?? null,
      phase: phase ?? null,
    }) as unknown as OpenNodeRow[];
  }

  coverage(runId: string, phase: string): CoverageRow | undefined {
    return this.#s.selCoverage!.get({ run_id: runId, phase }) as CoverageRow | undefined;
  }

  coverageByRun(runId: string): CoverageRow[] {
    return this.#s.selCoverageByRun!.all({ run_id: runId }) as unknown as CoverageRow[];
  }

  /**
   * Coverage half of a phase-transition gate: true when no node in `phase` is still
   * open. Vacuously true if the phase has no nodes — callers decide if total>0 matters.
   */
  isPhaseClear(runId: string, phase: string): boolean {
    const c = this.coverage(runId, phase);
    return c ? c.open === 0 : true;
  }

  /**
   * Durable half of the investigate signal: nodes still 'started'. The watcher (#2)
   * intersects this with absent Redis presence to raise a flag — never auto-resolved.
   */
  investigateCandidates(runId?: string): InvestigateRow[] {
    return this.#s.selInvestigate!.all({ run_id: runId ?? null }) as unknown as InvestigateRow[];
  }

  // ── Composition / lifecycle ─────────────────────────────────────────────

  /** Run `fn` inside an IMMEDIATE transaction; nested calls use SAVEPOINTs. */
  withTransaction<T>(fn: () => T): T {
    const top = this.#txDepth === 0;
    const sp = `sp_${this.#spSeq++}`;
    this.#db.exec(top ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
    this.#txDepth++;
    try {
      const result = fn();
      this.#db.exec(top ? 'COMMIT' : `RELEASE ${sp}`);
      this.#txDepth--;
      return result;
    } catch (err) {
      if (top) {
        this.#db.exec('ROLLBACK');
      } else {
        this.#db.exec(`ROLLBACK TO ${sp}`);
        this.#db.exec(`RELEASE ${sp}`);
      }
      this.#txDepth--;
      throw err;
    }
  }

  close(): void {
    this.#db.close();
  }
}
