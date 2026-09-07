import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { importSnapshot, openDatabaseFile } from './snapshot-state.mjs';
import { appendEvents, renderStatus, replayEvents, runOperationalCommand } from './operational-state.mjs';

const raw = readFileSync(new URL('./queue.json', import.meta.url), 'utf8');
const parentEvents = JSON.parse(readFileSync(new URL('./events-parent-20260905.json', import.meta.url), 'utf8'));
const event = (id, from, to, evidence_refs = []) => ({
  ...structuredClone(parentEvents[3]), id, from, to, evidence_refs,
  actor: 'Test fixture only', summary: 'Synthetic test transition, not actual candidate work', context: {},
});
const note = (id) => ({ ...structuredClone(parentEvents[0]), id, actor: 'Test fixture only' });
function memory(run) {
  const db = new DatabaseSync(':memory:');
  try { importSnapshot(db, raw); run(db); } finally { db.close(); }
}
function originalRows(db) {
  return JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'operational_events' ORDER BY name").all()
    .map(({ name }) => [name, db.prepare(`SELECT * FROM ${name}`).all()]));
}

test('nine parent events replay three Step 0 dispatches without rewriting any baseline row or receipt', () => memory((db) => {
  const before = originalRows(db);
  const result = appendEvents(db, raw, parentEvents);
  assert.equal(result.inserted.length, 9);
  assert.equal(result.state.events.length, 9);
  for (const id of ['FL-R1', 'FL-R2', 'FL-R3']) {
    assert.equal(result.state.items.get(id).status, 'dispatched');
    assert.match(result.state.items.get(id).context.phase, /not built/);
    assert.equal(db.prepare('SELECT status FROM work_items WHERE id = ?').get(id).status, 'proposed');
  }
  assert.equal(result.state.items.get('FL-R4').context.runtime_version, 'v24.19.0');
  assert.equal(result.state.items.get('FL-R4').status, 'proposed');
  assert.equal(originalRows(db), before);
  assert.equal(importSnapshot(db, raw).outcome, 'no-op');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
}));

test('duplicate ID with identical semantic payload is idempotent after replay, including reordered JSON keys', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  const before = db.prepare('SELECT total_changes() AS n').get().n;
  const reordered = parentEvents.map((entry) => Object.fromEntries(Object.entries(entry).reverse()));
  const again = appendEvents(db, raw, reordered);
  assert.equal(again.inserted.length, 0);
  assert.equal(again.duplicates.length, 9);
  assert.equal(db.prepare('SELECT total_changes() AS n').get().n, before);
  assert.equal(again.state.events.length, 9);
}));

test('conflicting event ID rejects entire batch and preserves original payload and sequence', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  const conflict = { ...structuredClone(parentEvents[0]), summary: 'Conflicting payload' };
  assert.throws(() => appendEvents(db, raw, [note('TEST-NEW-BEFORE-CONFLICT'), conflict]), /Conflicting event ID/);
  assert.equal(replayEvents(db, raw).events.length, 9);
  assert.equal(db.prepare("SELECT id FROM operational_events WHERE id = 'TEST-NEW-BEFORE-CONFLICT'").get(), undefined);
  assert.equal(appendEvents(db, raw, [note('TEST-AFTER-ROLLBACK')]).state.events.at(-1).sequence, 10);
}));

test('bad event baseline hash or changed baseline bytes is refused without seed/journal writes', () => memory((db) => {
  const before = originalRows(db);
  assert.throws(() => appendEvents(db, raw, [{ ...note('TEST-BAD-HASH'), baseline_sha256: '0'.repeat(64) }]), /Bad baseline hash/);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'operational_events'").get(), undefined);
  assert.throws(() => appendEvents(db, `${raw}\n`, [note('TEST-CHANGED-BASELINE')]), /Snapshot differs/);
  assert.equal(originalRows(db), before);
}));

test('unknown item, skipped transition, stale from-state and invalid event shape fail closed', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  const invalid = [
    { ...note('TEST-UNKNOWN'), work_item_id: 'FL-NOT-REAL' },
    event('TEST-SKIP', 'dispatched', 'accepted', ['synthetic-test-evidence']),
    event('TEST-STALE', 'proposed', 'ready'),
    { ...note('TEST-SOURCE'), source_refs: [] },
    { ...note('TEST-DATE'), recorded_on: '2026-02-30' },
    { ...note('TEST-FIELD'), gate_waived: true },
    { ...note('TEST-CONTEXT'), context: { accepted: true } },
    { ...note('TEST-NOTE-STATE'), from: 'dispatched', to: 'in-progress' },
  ];
  for (const candidate of invalid) assert.throws(() => appendEvents(db, raw, [candidate]));
  assert.equal(replayEvents(db, raw).events.length, 9);
}));

test('merged, shipped, completed, gate waiver and direct human-gate targets are never transitions', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  for (const state of ['merged', 'shipped', 'completed', 'waived', 'passing', 'release-ready']) {
    assert.throws(() => appendEvents(db, raw, [event(`TEST-FORBIDDEN-${state}`, 'dispatched', state, ['synthetic evidence'])]), /Forbidden terminal/);
  }
  assert.throws(() => appendEvents(db, raw, [{ ...event('TEST-HUMAN-GATE', 'blocked', 'ready'), work_item_id: 'REL-HUMAN' }]), /Unknown work item/);
  assert.throws(() => appendEvents(db, raw, [{ ...note('TEST-GATE-KIND'), kind: 'gate-waiver' }]), /Unsupported event kind/);
  assert.equal(db.prepare("SELECT status FROM release_gates WHERE id = 'REL-HUMAN'").get().status, 'blocked');
}));

test('in-review and accepted require evidence; accepted remains local and can be reopened explicitly', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  appendEvents(db, raw, [event('TEST-BUILD', 'dispatched', 'in-progress')]);
  assert.throws(() => appendEvents(db, raw, [event('TEST-REVIEW-MISSING', 'in-progress', 'in-review')]), /Evidence refs required/);
  appendEvents(db, raw, [event('TEST-REVIEW', 'in-progress', 'in-review', ['test-fixture://build-output'])]);
  assert.throws(() => appendEvents(db, raw, [event('TEST-ACCEPT-MISSING', 'in-review', 'accepted')]), /Evidence refs required/);
  const accepted = appendEvents(db, raw, [event('TEST-ACCEPT', 'in-review', 'accepted', ['test-fixture://independent-review'])]).state;
  assert.equal(accepted.items.get('FL-R1').status, 'accepted');
  assert.match(renderStatus(accepted), /"accepted":1/);
  assert.match(renderStatus(accepted), /Release readiness is not computed/);
  assert.match(renderStatus(accepted), /test-fixture:\/\/independent-review/);
  assert.equal(db.prepare("SELECT status FROM work_items WHERE id = 'FL-R1'").get().status, 'proposed');
  assert.equal(db.prepare("SELECT status FROM release_gates WHERE id = 'REL-HUMAN'").get().status, 'blocked');
  appendEvents(db, raw, [event('TEST-REOPEN', 'accepted', 'blocked')]);
  assert.equal(replayEvents(db, raw).items.get('FL-R1').status, 'blocked');
}));

test('SQLite journal prevents direct UPDATE, DELETE and INSERT OR REPLACE of persisted events', () => memory((db) => {
  appendEvents(db, raw, parentEvents);
  assert.throws(() => db.exec("UPDATE operational_events SET event_json = '{}'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM operational_events'), /append-only/);
  assert.throws(() => db.exec('INSERT OR REPLACE INTO operational_events SELECT * FROM operational_events LIMIT 1'), /append-only/);
  assert.equal(replayEvents(db, raw).events.length, 9);
}));

test('file-backed restart replays the same sourced projection and accepts an idempotent retry', () => {
  const path = fileURLToPath(new URL(`./.coordinator/operational-test-${randomUUID()}.db`, import.meta.url));
  let db = new DatabaseSync(path);
  try {
    importSnapshot(db, raw);
    const first = appendEvents(db, raw, parentEvents).state;
    const rendered = renderStatus(first);
    const originals = originalRows(db);
    db.close();
    db = new DatabaseSync(path);
    db.exec('PRAGMA foreign_keys = ON');
    assert.equal(renderStatus(replayEvents(db, raw)), rendered);
    assert.equal(appendEvents(db, raw, parentEvents).inserted.length, 0);
    assert.equal(originalRows(db), originals);
    assert.match(rendered, /GENERATED/);
    assert.match(rendered, /PARENT-UPDATE-20260905.md#parent-authority/);
    assert.match(rendered, /"dispatched":3/);
    assert.match(rendered, /settings are NOT enforced/);
  } finally {
    db.close();
    rmSync(path);
  }
});

test('operational status and append refuse missing/invalid DB without creating state or changing projection', () => {
  const parent = fileURLToPath(new URL('./.coordinator/', import.meta.url));
  for (const condition of ['missing', 'empty', 'foreign-schema', 'corrupt']) {
    const directory = mkdtempSync(join(parent, 'operational-test-missing-'));
    const path = join(directory, 'coordinator.db');
    try {
      writeFileSync(join(directory, 'queue.json'), raw);
      writeFileSync(join(directory, 'events.json'), JSON.stringify(parentEvents));
      const sentinel = Buffer.from('Existing operational projection: preserve lost-history evidence.\r\n');
      writeFileSync(join(directory, 'STATUS.md'), sentinel);
      if (condition === 'empty') writeFileSync(path, '');
      if (condition === 'corrupt') writeFileSync(path, 'Not a SQLite database');
      if (condition === 'foreign-schema') {
        const db = new DatabaseSync(path);
        try { db.exec('CREATE TABLE unrelated (id INTEGER)'); } finally { db.close(); }
      }
      const before = existsSync(path) ? readFileSync(path) : null;
      const filesBefore = readdirSync(directory).sort();
      const open = (options) => {
        assert.equal(options.requireExisting, true, 'Both operational commands must require existing state');
        return { db: openDatabaseFile(path, options), raw: readFileSync(join(directory, 'queue.json'), 'utf8'), directory };
      };
      for (const args of [['status'], ['append', 'events.json']]) {
        assert.throws(() => runOperationalCommand(args, open), /Existing coordinator database required|Existing empty database|Unknown\/incomplete database schema|not a database/);
        assert.deepEqual(readFileSync(join(directory, 'STATUS.md')), sentinel, `${condition}: projection overwritten`);
        assert.deepEqual(readFileSync(join(directory, 'queue.json')), Buffer.from(raw));
        assert.deepEqual(readdirSync(directory).sort(), filesBefore, `${condition}: unexpected file/sidecar creation`);
        if (before === null) assert.equal(existsSync(path), false, 'Missing DB was created');
        else assert.deepEqual(readFileSync(path), before, `${condition}: existing DB bytes changed`);
      }
    } finally {
      rmSync(directory, { recursive: true });
    }
  }
});

test('direct operational append cannot seed an empty DB; explicit snapshot initialization remains available', () => {
  const db = new DatabaseSync(':memory:');
  try {
    assert.throws(() => appendEvents(db, raw, parentEvents), /Existing valid baseline required/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n, 0);
    assert.equal(importSnapshot(db, raw).outcome, 'imported');
    assert.equal(appendEvents(db, raw, parentEvents).inserted.length, 9);
  } finally {
    db.close();
  }
});
