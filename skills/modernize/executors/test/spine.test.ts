// spine.test.ts — choreography spine: presence, watcher, coverage-check.
// Zero external services: in-memory presence + in-memory SQLite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskStore } from '../src/task-store.js';
import { InMemoryPresenceStore } from '../src/presence.js';
import { Watcher } from '../src/watcher.js';
import { checkPhase, checkAllPhases, isTreeComplete } from '../src/coverage.js';

function startedChild(): { store: TaskStore; childId: string } {
  const store = new TaskStore({ path: ':memory:' });
  const { root } = store.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  const child = store.spawnChild(root.id, { segment: 'svc', nodeType: 'discovery', phase: 'phase1' });
  store.startNode(child.id);
  return { store, childId: child.id };
}

// ── presence ────────────────────────────────────────────────────────────

test('presence lapses after TTL (advisory, deterministic clock)', async () => {
  let now = 1000;
  const p = new InMemoryPresenceStore(() => now);
  await p.ping('n1', 500); // expires at 1500
  assert.equal(await p.isPresent('n1'), true);
  now = 1499;
  assert.equal(await p.isPresent('n1'), true);
  now = 1500;
  assert.equal(await p.isPresent('n1'), false);
});

test('presence: clear and batch presence', async () => {
  const p = new InMemoryPresenceStore();
  await p.ping('a', 10_000);
  await p.ping('b', 10_000);
  await p.clear('a');
  assert.equal(await p.isPresent('a'), false);
  const present = await p.presentNodeIds(['a', 'b', 'c']);
  assert.deepEqual([...present].sort(), ['b']);
});

// ── watcher ─────────────────────────────────────────────────────────────

test('watcher: started + present → no flag', async () => {
  const { store, childId } = startedChild();
  const p = new InMemoryPresenceStore();
  await p.ping(childId, 10_000);
  const flags = await new Watcher(store, p).tick();
  assert.deepEqual(flags, []);
  store.close();
});

test('watcher: started + presence absent → investigate flag', async () => {
  const { store, childId } = startedChild();
  const p = new InMemoryPresenceStore(); // never pinged → absent
  const flags = await new Watcher(store, p).tick();
  assert.equal(flags.length, 1);
  assert.equal(flags[0]?.node.id, childId);
  assert.equal(flags[0]?.reason, 'presence_absent');
  assert.notEqual(flags[0]?.since, null); // started_at is the operator's cue
  store.close();
});

test('watcher: pending node is never a candidate', async () => {
  const store = new TaskStore({ path: ':memory:' });
  const { root } = store.createRun({ sourceRef: 'x', rootSpawnBudget: 1 });
  store.spawnChild(root.id, { segment: 'svc', nodeType: 'discovery', phase: 'phase1' }); // pending
  const flags = await new Watcher(store, new InMemoryPresenceStore()).tick();
  assert.deepEqual(flags, []);
  store.close();
});

test('watcher: terminal node is not flagged even when presence absent', async () => {
  const { store, childId } = startedChild();
  store.completeNode(childId);
  const flags = await new Watcher(store, new InMemoryPresenceStore()).tick();
  assert.deepEqual(flags, []);
  store.close();
});

// ── coverage-check ──────────────────────────────────────────────────────

test('checkPhase: incomplete lists blockers, complete clears them', async () => {
  const store = new TaskStore({ path: ':memory:' });
  const { run, root } = store.createRun({ sourceRef: 'x', rootSpawnBudget: 2 });
  const a = store.spawnChild(root.id, { segment: 'a', nodeType: 'discovery', phase: 'phase1' });
  const b = store.spawnChild(root.id, { segment: 'b', nodeType: 'discovery', phase: 'phase1' });

  let cov = checkPhase(store, run.run_id, 'phase1');
  assert.equal(cov.total, 2);
  assert.equal(cov.open, 2);
  assert.equal(cov.complete, false);
  assert.equal(cov.openNodes.length, 2);

  store.startNode(a.id);
  store.completeNode(a.id);
  store.startNode(b.id);
  store.failNode(b.id, 'parser blew up'); // failed is terminal too

  cov = checkPhase(store, run.run_id, 'phase1');
  assert.equal(cov.terminal, 2);
  assert.equal(cov.open, 0);
  assert.equal(cov.complete, true);
  assert.equal(cov.openNodes.length, 0);
  store.close();
});

test('checkAllPhases only reports phases that have nodes', async () => {
  const store = new TaskStore({ path: ':memory:' });
  const { run, root } = store.createRun({ sourceRef: 'x', rootSpawnBudget: 1 }); // root in phase0
  store.spawnChild(root.id, { segment: 'a', nodeType: 'discovery', phase: 'phase1' });
  const names = checkAllPhases(store, run.run_id).map((c) => c.phase).sort();
  assert.deepEqual(names, ['phase0', 'phase1']);
  store.close();
});

test('isTreeComplete: false while open, true once every node is terminal', async () => {
  const store = new TaskStore({ path: ':memory:' });
  const { run, root } = store.createRun({ sourceRef: 'x', rootSpawnBudget: 0 });
  assert.equal(isTreeComplete(store, run.run_id), false); // root pending
  store.startNode(root.id);
  assert.equal(isTreeComplete(store, run.run_id), false); // started, not terminal
  store.completeNode(root.id);
  assert.equal(isTreeComplete(store, run.run_id), true);
  store.close();
});
