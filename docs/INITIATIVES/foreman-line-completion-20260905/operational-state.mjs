import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importSnapshot, inspectState, openCoordinatorDatabase, validateQueue } from './snapshot-state.mjs';

const transitions = {
  proposed: ['ready', 'blocked', 'deferred', 'canceled'],
  ready: ['dispatched', 'blocked', 'deferred', 'canceled'],
  dispatched: ['in-progress', 'blocked', 'canceled'],
  'in-progress': ['in-review', 'blocked', 'canceled'],
  'in-review': ['accepted', 'in-progress', 'blocked', 'rejected'],
  accepted: ['in-review', 'blocked'],
  blocked: ['ready', 'in-progress', 'deferred', 'canceled'],
  deferred: ['proposed', 'ready', 'canceled'],
  rejected: ['ready', 'deferred', 'canceled'],
  canceled: [],
};
const eventKeys = ['id', 'baseline_sha256', 'recorded_on', 'actor', 'kind', 'work_item_id', 'from', 'to', 'summary', 'source_refs', 'evidence_refs', 'context'];
const contextTypes = {
  owner: 'string', branch: 'string', worktree: 'string', spec_path: 'string', base_commit: 'string',
  phase: 'string', blocker: 'string', next_safe_action: 'string', runtime_path: 'string', runtime_version: 'string',
  native_task_available: 'boolean', routing_advisory: 'boolean', emitted_settings_enforced: 'boolean',
};
const text = (value) => assert(typeof value === 'string' && value.trim().length > 0, 'Nonempty text required');
const canonical = (value) => JSON.stringify(value, (_, entry) => entry && !Array.isArray(entry) && typeof entry === 'object'
  ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]])) : entry);

function baseline(db, raw) {
  const queue = JSON.parse(raw);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const snapshots = db.prepare('SELECT * FROM snapshot_imports').all();
  assert.equal(snapshots.length, 1, 'Exactly one baseline required');
  assert.equal(snapshots[0].sha256, sha256, 'Bad baseline hash');
  assert.equal(snapshots[0].queue_json, raw, 'Baseline bytes changed');
  assert.equal(snapshots[0].schema_version, 1, 'Unsupported baseline schema');
  inspectState(db, validateQueue(queue));
  return { queue, sha256 };
}

function validateEvent(event, sha256, items) {
  assert(event && typeof event === 'object' && !Array.isArray(event), 'Event object required');
  assert.deepEqual(Object.keys(event).sort(), eventKeys.toSorted(), 'Unexpected/missing event fields; gates and readiness cannot be changed');
  for (const field of ['id', 'recorded_on', 'actor', 'summary']) text(event[field]);
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(event.id), 'Invalid event ID');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(event.recorded_on) && new Date(event.recorded_on).toISOString().slice(0, 10) === event.recorded_on, 'Valid source date required');
  assert.equal(event.baseline_sha256, sha256, 'Bad baseline hash');
  assert(['note', 'transition'].includes(event.kind), 'Unsupported event kind; human gates are not journal targets');
  assert(event.work_item_id === null || items.has(event.work_item_id), 'Unknown work item');
  for (const field of ['source_refs', 'evidence_refs']) {
    assert(Array.isArray(event[field]), `${field} array required`);
    event[field].forEach(text);
    assert.equal(new Set(event[field]).size, event[field].length, `Duplicate ${field}`);
  }
  assert(event.source_refs.length > 0, 'Source refs required');
  assert(event.context && typeof event.context === 'object' && !Array.isArray(event.context), 'Context object required');
  for (const [key, value] of Object.entries(event.context)) {
    assert(Object.hasOwn(contextTypes, key) && typeof value === contextTypes[key], `Invalid context field ${key}`);
    if (typeof value === 'string') text(value);
  }
  if (event.context.base_commit) assert(/^[0-9a-f]{40}$/.test(event.context.base_commit), 'Exact base commit required');
  if (event.kind === 'note') {
    assert(event.from === null && event.to === null, 'Notes cannot transition state');
  } else {
    assert(event.work_item_id !== null, 'Transition work item required');
    assert(Object.hasOwn(transitions, event.from) && Object.hasOwn(transitions, event.to), 'Forbidden terminal/unknown state; no merged, shipped or gate waiver');
    assert(transitions[event.from].includes(event.to), 'Invalid transition');
    if (['in-review', 'accepted'].includes(event.to)) assert(event.evidence_refs.length > 0, 'Evidence refs required for in-review/accepted');
  }
}

function applyEvent(state, event) {
  validateEvent(event, state.sha256, state.items);
  if (event.work_item_id === null) return;
  const item = state.items.get(event.work_item_id);
  if (event.kind === 'transition') {
    assert.equal(item.status, event.from, `Stale from-state for ${event.work_item_id}`);
    item.status = event.to;
  }
  Object.assign(item.context, event.context);
  item.event_ids.push(event.id);
  item.source_refs.push(...event.source_refs);
  item.evidence_refs.push(...event.evidence_refs);
}

export function replayEvents(db, raw) {
  const { queue, sha256 } = baseline(db, raw);
  const state = {
    queue, sha256,
    items: new Map(queue.work_items.map((item) => [item.id, { ...item, context: {}, event_ids: [], source_refs: [...item.source_refs], evidence_refs: [] }])),
    events: [],
  };
  if (!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'operational_events'").get()) return state;
  for (const row of db.prepare('SELECT * FROM operational_events ORDER BY sequence').all()) {
    const event = JSON.parse(row.event_json);
    assert.equal(canonical(event), row.event_json, 'Noncanonical event payload');
    assert.equal(event.id, row.id, 'Event identity drift');
    assert.equal(event.work_item_id, row.work_item_id, 'Event item drift');
    assert.equal(event.baseline_sha256, row.baseline_sha256, 'Event baseline drift');
    assert.equal(row.baseline_id, 1, 'Wrong baseline reference');
    applyEvent(state, event);
    state.events.push({ sequence: row.sequence, appended_at_utc: row.appended_at_utc, ...event });
  }
  return state;
}

export function appendEvents(db, raw, events) {
  assert(Array.isArray(events) && events.length > 0, 'Nonempty reviewed event array required');
  // Operational resume verifies existing history; only deliberate snapshot import may initialize it.
  importSnapshot(db, raw, { requireExisting: true });
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = replayEvents(db, raw);
    db.exec(`CREATE TABLE IF NOT EXISTS operational_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      baseline_id INTEGER NOT NULL CHECK (baseline_id = 1) REFERENCES snapshot_imports(id),
      baseline_sha256 TEXT NOT NULL,
      work_item_id TEXT REFERENCES work_items(id),
      event_json TEXT NOT NULL,
      appended_at_utc TEXT NOT NULL
    )`);
    db.exec("CREATE TRIGGER IF NOT EXISTS operational_events_no_update BEFORE UPDATE ON operational_events BEGIN SELECT RAISE(ABORT, 'Operational events are append-only'); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS operational_events_no_delete BEFORE DELETE ON operational_events BEGIN SELECT RAISE(ABORT, 'Operational events are append-only'); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS operational_events_no_replace BEFORE INSERT ON operational_events WHEN EXISTS (SELECT 1 FROM operational_events WHERE id = NEW.id OR sequence = NEW.sequence) BEGIN SELECT RAISE(ABORT, 'Operational events are append-only'); END");
    const inserted = [];
    const duplicates = [];
    for (const event of events) {
      validateEvent(event, state.sha256, state.items);
      const payload = canonical(event);
      const existing = db.prepare('SELECT event_json FROM operational_events WHERE id = ?').get(event.id);
      if (existing) {
        assert.equal(existing.event_json, payload, `Conflicting event ID ${event.id}`);
        duplicates.push(event.id);
        continue;
      }
      applyEvent(state, event);
      db.prepare('INSERT INTO operational_events (id, baseline_id, baseline_sha256, work_item_id, event_json, appended_at_utc) VALUES (?, 1, ?, ?, ?, ?)')
        .run(event.id, state.sha256, event.work_item_id, payload, new Date().toISOString());
      inserted.push(event.id);
    }
    const replayed = replayEvents(db, raw);
    db.exec('COMMIT');
    return { inserted, duplicates, state: replayed };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const cell = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
export function renderStatus(state) {
  const items = [...state.items.values()];
  const counts = Object.fromEntries([...new Set(items.map((item) => item.status))].sort().map((status) => [status, items.filter((item) => item.status === status).length]));
  const lines = [
    '# Current Coordination Status', '',
    '> GENERATED by operational-state.mjs from the immutable SQLite baseline and append-only events. Do not edit manually.', '',
    `Baseline SHA-256: \`${state.sha256}\`. Journal through sequence ${state.events.at(-1)?.sequence ?? 0} (${state.events.length} events).`, '',
    `Baseline initiative status: **${cell(state.queue.initiative.status)}**. Release readiness is not computed by this utility; local accepted/in-review states do not grant plugin authority, merge, shipment or a human-gate waiver.`, '',
    `Current work-item counts: ${cell(JSON.stringify(counts))}. Evidence references are attributed records, not automatically verified proof.`, '',
    '## Work Items', '',
    '| Item | Baseline | Current | Owner | Phase / Blocker | Next Safe Action | Sources / Events |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const item of items) {
    const original = state.queue.work_items.find((row) => row.id === item.id);
    lines.push(`| ${[item.id, original.status, item.status, item.context.owner ?? item.owner, item.context.phase ?? item.context.blocker ?? item.blocker, item.context.next_safe_action ?? item.next_safe_action, [...new Set([...item.source_refs, ...item.event_ids])].join('; ')].map(cell).join(' | ')} |`);
  }
  lines.push('', '## Operational Candidate Context', '');
  for (const item of items.filter((row) => row.context.worktree)) {
    lines.push(`### ${cell(item.id)}`, '', ...Object.entries(item.context).map(([key, value]) => `- ${cell(key)}: ${cell(value)}`), '');
  }
  lines.push('## Gates (Unchanged Baseline)', '', '| Gate | Status | Owner | Required Evidence |', '|---|---|---|---|');
  for (const gate of [...state.queue.security_gates, ...state.queue.release_gates]) lines.push(`| ${[gate.id, gate.status, gate.owner, gate.required_evidence].map(cell).join(' | ')} |`);
  lines.push('', '## Event Sources', '');
  for (const event of state.events) {
    lines.push(`### ${event.sequence}. ${cell(event.id)}`, '',
      `- Source date: ${event.recorded_on}; recorded by: ${cell(event.actor)}; appended UTC: ${event.appended_at_utc}.`,
      `- ${cell(event.kind)}: ${cell(event.work_item_id ?? 'initiative note')}; ${cell(event.from ?? 'no state change')} -> ${cell(event.to ?? 'no state change')}.`,
      `- Summary: ${cell(event.summary)}`,
      `- Source refs: ${event.source_refs.map(cell).join('; ')}`,
      `- Evidence refs: ${event.evidence_refs.length ? event.evidence_refs.map(cell).join('; ') : 'none supplied (not an acceptance event)'}`,
      ...Object.entries(event.context).map(([key, value]) => `- ${cell(key)}: ${cell(value)}`), '');
  }
  return `${lines.join('\n')}\n`;
}

export function runOperationalCommand(args, open = openCoordinatorDatabase) {
  const [command, input, ...extra] = args;
  assert(extra.length === 0 && ((command === 'append' && input) || (command === 'status' && input === undefined)), 'Usage: operational-state.mjs append <reviewed-local-events.json> | status');
  const { db, raw, directory } = open({ requireExisting: true });
  try {
    let result;
    if (command === 'append') {
      const path = resolve(directory, input);
      const relativePath = relative(directory, realpathSync(path));
      assert(relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath), 'Reviewed event file must be inside initiative directory');
      assert(!relativePath.includes(':') && path.endsWith('.json'), 'Reviewed local JSON event file required');
      result = appendEvents(db, raw, JSON.parse(readFileSync(path, 'utf8')));
    } else {
      importSnapshot(db, raw, { requireExisting: true });
      db.exec('BEGIN');
      try {
        result = { inserted: [], duplicates: [], state: replayEvents(db, raw) };
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    const target = join(directory, 'STATUS.md');
    const stat = lstatSync(target, { throwIfNoEntry: false });
    assert(!stat || (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1), 'STATUS.md must not redirect writes');
    writeFileSync(target, renderStatus(result.state), 'utf8');
    console.log(JSON.stringify({ inserted: result.inserted, duplicates: result.duplicates, event_count: result.state.events.length, projection: target, baseline_sha256: result.state.sha256 }, null, 2));
  } finally {
    db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { runOperationalCommand(process.argv.slice(2)); } catch (error) { console.error(`Operational journal refused: ${error.message}`); process.exitCode = 1; }
}
