// task-store.test.ts — invariant proofs for the choreography store.
// Run: npm install && npm test   (uses an in-memory SQLite db per test)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskStore } from '../src/task-store.js';
import {
  BudgetExhaustedError,
  ConcurrencyCeilingError,
  DepthFuseError,
  DuplicatePathError,
  IllegalTransitionError,
  LoudFailureError,
} from '../src/errors.js';

function fresh(): TaskStore {
  return new TaskStore({ path: ':memory:' });
}

test('createRun seeds run + pending root at depth 0', () => {
  const s = fresh();
  const { run, root } = s.createRun({ sourceRef: 'D:/Repos/old', targetStack: 'C# .NET 10' });
  assert.equal(run.current_phase, 'phase0');
  assert.equal(run.max_depth, 5);
  assert.equal(run.max_concurrency, 8);
  assert.equal(root.status, 'pending');
  assert.equal(root.depth, 0);
  assert.equal(root.path, 'root');
  assert.equal(root.parent_id, null);
  s.close();
});

test('happy path: spawn -> start -> complete, with timestamps + coverage', () => {
  const s = fresh();
  const { run, root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const child = s.spawnChild(root.id, { segment: 'billing', nodeType: 'discovery', phase: 'phase1' });
  assert.equal(child.path, 'root/billing');
  assert.equal(child.depth, 1);

  const started = s.startNode(child.id);
  assert.equal(started.status, 'started');
  assert.notEqual(started.started_at, null);

  const done = s.completeNode(child.id, 'contracts/billing.yaml');
  assert.equal(done.status, 'done');
  assert.equal(done.result_ref, 'contracts/billing.yaml');
  assert.notEqual(done.terminal_at, null);

  const cov = s.coverage(run.run_id, 'phase1');
  assert.deepEqual([cov?.total, cov?.terminal, cov?.open], [1, 1, 0]);
  assert.equal(s.isPhaseClear(run.run_id, 'phase1'), true);
  s.close();
});

test('loud failure: failNode demands a reason, then records it', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const c = s.spawnChild(root.id, { segment: 'jobs', nodeType: 'discovery', phase: 'phase1' });
  assert.throws(() => s.failNode(c.id, '   '), LoudFailureError);
  const failed = s.failNode(c.id, 'parser threw on malformed config');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.failure_reason, 'parser threw on malformed config');
  assert.notEqual(failed.terminal_at, null);
  s.close();
});

test('terminal is immutable; started-once', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const c = s.spawnChild(root.id, { segment: 'a', nodeType: 'discovery', phase: 'phase1' });
  assert.throws(() => s.completeNode(c.id), IllegalTransitionError); // pending -> done illegal
  s.startNode(c.id);
  assert.throws(() => s.startNode(c.id), IllegalTransitionError); // started twice
  s.completeNode(c.id);
  assert.throws(() => s.completeNode(c.id), IllegalTransitionError);
  assert.throws(() => s.failNode(c.id, 'nope'), IllegalTransitionError);
  s.close();
});

test('spawn budget is spent down and then exhausted', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  s.spawnChild(root.id, { segment: 'one', nodeType: 'module', phase: 'phase1' });
  assert.throws(
    () => s.spawnChild(root.id, { segment: 'two', nodeType: 'module', phase: 'phase1' }),
    BudgetExhaustedError,
  );
  s.close();
});

test('child budget is an independent fresh grant', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const child = s.spawnChild(root.id, {
    segment: 'sub', nodeType: 'subsystem', phase: 'phase1', childSpawnBudget: 2,
  });
  s.spawnChild(child.id, { segment: 'm1', nodeType: 'module', phase: 'phase1' });
  s.spawnChild(child.id, { segment: 'm2', nodeType: 'module', phase: 'phase1' });
  assert.throws(
    () => s.spawnChild(child.id, { segment: 'm3', nodeType: 'module', phase: 'phase1' }),
    BudgetExhaustedError,
  );
  s.close();
});

test('depth fuse blocks spawning past max_depth', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', maxDepth: 1, rootSpawnBudget: 1 });
  const d1 = s.spawnChild(root.id, {
    segment: 'd1', nodeType: 'module', phase: 'phase1', childSpawnBudget: 1,
  });
  assert.throws(
    () => s.spawnChild(d1.id, { segment: 'd2', nodeType: 'component', phase: 'phase1' }),
    DepthFuseError,
  );
  s.close();
});

test('concurrency ceiling caps simultaneously-started nodes', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', maxConcurrency: 1, rootSpawnBudget: 2 });
  const c1 = s.spawnChild(root.id, { segment: 'c1', nodeType: 'discovery', phase: 'phase1' });
  const c2 = s.spawnChild(root.id, { segment: 'c2', nodeType: 'discovery', phase: 'phase1' });
  s.startNode(c1.id);
  assert.throws(() => s.startNode(c2.id), ConcurrencyCeilingError);
  s.completeNode(c1.id);
  assert.equal(s.startNode(c2.id).status, 'started'); // slot freed
  s.close();
});

test('duplicate sibling path is rejected', () => {
  const s = fresh();
  const { root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 2 });
  s.spawnChild(root.id, { segment: 'billing', nodeType: 'module', phase: 'phase1' });
  assert.throws(
    () => s.spawnChild(root.id, { segment: 'billing', nodeType: 'module', phase: 'phase1' }),
    DuplicatePathError,
  );
  s.close();
});

test('investigate candidates surface started-but-not-terminal nodes', () => {
  const s = fresh();
  const { run, root } = s.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const c = s.spawnChild(root.id, { segment: 'svc', nodeType: 'discovery', phase: 'phase1' });
  assert.equal(s.investigateCandidates(run.run_id).length, 0); // pending, not started
  s.startNode(c.id);
  const inv = s.investigateCandidates(run.run_id);
  assert.equal(inv.length, 1);
  assert.equal(inv[0]?.path, 'root/svc');
  s.completeNode(c.id);
  assert.equal(s.investigateCandidates(run.run_id).length, 0); // terminal clears it
  s.close();
});
