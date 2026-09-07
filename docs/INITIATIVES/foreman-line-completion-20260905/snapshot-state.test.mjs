import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { importSnapshot, inspectState, validateQueue } from './snapshot-state.mjs';

const raw = readFileSync(new URL('./queue.json', import.meta.url), 'utf8');
const fresh = () => JSON.parse(raw);

test('complete board preserves 15 exact goals and 28 evidence-gated work items', () => {
  const rows = validateQueue(fresh());
  assert.equal(rows.tracks.length, 17);
  assert.equal(rows.work_items.length, 28);
  assert.equal(rows.integration_surfaces.length, 7);
  assert.equal(rows.integration_scenarios.length, 14);
  assert.equal(rows.work_item_dependencies.length, 5);
});

test('invalid shapes, evidence, IDs, references and dependencies fail before persistence', () => {
  const cases = [
    (q) => { q.work_items[0].required_evidence = []; },
    (q) => { q.work_items[0].next_safe_action = ''; },
    (q) => { q.work_items[0].blocker = null; },
    (q) => { q.work_items[0].source_refs = []; },
    (q) => { q.work_items.push({ ...q.work_items[0] }); },
    (q) => { q.work_items[0].track_id = 'missing'; },
    (q) => { q.work_items[0].depends_on = ['missing']; },
    (q) => { q.work_items[0].depends_on = [q.work_items[0].id]; },
    (q) => { q.work_items[0].depends_on = [q.work_items[1].id]; q.work_items[1].depends_on = [q.work_items[0].id]; },
    (q) => { q.work_items[0].depends_on = [q.work_items[1].id, q.work_items[1].id]; },
    (q) => { q.integration_scenarios[0].surface_id = 'missing'; },
    (q) => { q.integration_surfaces[0].contract_id = 'missing'; },
    (q) => { q.integration_scenarios[0].environment_required = ''; },
    (q) => { q.artifacts[0].related_work_item_id = 'missing'; },
    (q) => { q.tracks = q.tracks.filter((row) => row.goal_dir !== 'ledgerline-v1'); },
    (q) => { q.tracks[0].classification = 'incomplete'; },
    (q) => { q.work_items[0].status = 'complete'; },
    (q) => { q.work_items.find((row) => row.id === 'FL-R1').id = 'FL-R100'; q.work_items.find((row) => row.id === 'FL-R6').depends_on = ['FL-R100', 'FL-R3', 'FL-R4']; },
  ];
  for (const [index, mutate] of cases.entries()) {
    const queue = fresh();
    mutate(queue);
    assert.throws(() => validateQueue(queue), undefined, `Invalid case ${index} accepted`);
  }
});

test('baseline rejects authority widening, false execution, passing gates and product proof', () => {
  const cases = [
    (q) => { q.authority.write_root = 'D:/Repos/agent-skills/'; },
    (q) => { q.authority.goal_ownership_transferred = true; },
    (q) => { q.authority.external_effects_authorized = true; },
    (q) => { q.authority.new_remediations_completed = 1; },
    (q) => { q.routing.per_model_control = true; },
    (q) => { q.routing.workers_dispatched = 1; },
    (q) => { q.work_items[0].status = 'merged'; },
    (q) => { q.work_items[0].assigned_agent = 'invented worker'; },
    (q) => { q.release_gates[0].status = 'passing'; },
    (q) => { q.security_gates[0].status = 'waived'; },
    (q) => { q.integration_scenarios[0].status = 'passing'; },
    (q) => { q.initiative.status = 'ready'; },
    (q) => { q.verification_runs.push({ id: 'fake' }); },
  ];
  for (const mutate of cases) {
    const queue = fresh();
    mutate(queue);
    assert.throws(() => validateQueue(queue));
  }
});

test('transactional in-memory import twice is an exact no-op with FK/integrity and all rows', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const first = importSnapshot(db, raw);
    const changes = db.prepare('SELECT total_changes() AS changes').get().changes;
    const second = importSnapshot(db, raw);
    assert.equal(first.outcome, 'imported');
    assert.equal(second.outcome, 'no-op');
    assert.equal(first.sha256, second.sha256);
    assert.equal(first.imported_at_utc, second.imported_at_utc);
    assert.deepEqual(first.counts, second.counts);
    assert.equal(db.prepare('SELECT total_changes() AS changes').get().changes, changes);
    assert.equal(second.integrity, 'ok');
    assert.equal(second.foreign_key_violations, 0);
    assert.equal(second.counts.verification_runs, 0);
    assert.throws(() => db.prepare("INSERT INTO work_item_dependencies VALUES ('missing', 'FL-R1', '{}')").run(), /FOREIGN KEY/);
  } finally {
    db.close();
  }
});

test('different valid snapshot is refused without overwriting or status promotion', () => {
  const db = new DatabaseSync(':memory:');
  try {
    importSnapshot(db, raw);
    const queue = fresh();
    queue.work_items.find((row) => row.id === 'FL-R1').status = 'ready';
    assert.throws(() => importSnapshot(db, JSON.stringify(queue)), /Snapshot differs/);
    assert.equal(db.prepare("SELECT status FROM work_items WHERE id = 'FL-R1'").get().status, 'proposed');
    assert.equal(importSnapshot(db, raw).outcome, 'no-op');
  } finally {
    db.close();
  }
});

test('persisted state tampering is detected and is never silently repaired', () => {
  const db = new DatabaseSync(':memory:');
  try {
    importSnapshot(db, raw);
    db.prepare("UPDATE work_items SET status = 'merged' WHERE id = 'FL-R1'").run();
    assert.throws(() => importSnapshot(db, raw), /persisted state differs/);
    assert.equal(db.prepare("SELECT status FROM work_items WHERE id = 'FL-R1'").get().status, 'merged');
    assert.throws(() => inspectState(db, validateQueue(fresh())), /persisted state differs/);
  } finally {
    db.close();
  }
});

test('failed seed rolls back created IC tables and unknown existing DB is preserved', () => {
  const db = new DatabaseSync(':memory:');
  const exec = db.exec.bind(db);
  db.exec = (sql) => {
    if (sql.startsWith('CREATE TABLE work_items')) throw new Error('Injected seed interruption');
    return exec(sql);
  };
  try {
    assert.throws(() => importSnapshot(db, raw), /Injected seed interruption/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n, 0);
    db.exec = exec;
    db.exec('CREATE TABLE unrelated (id INTEGER)');
    assert.throws(() => importSnapshot(db, raw), /Unknown\/incomplete database schema/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'unrelated'").get().n, 1);
  } finally {
    db.close();
  }
});
