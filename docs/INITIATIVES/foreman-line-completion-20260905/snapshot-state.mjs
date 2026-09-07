import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = 'D:/Repos/agent-skills/docs/INITIATIVES/foreman-line-completion-20260905/';
const INITIATIVE = 'foreman-line-completion-20260905';
const ic = (fields) => `id TEXT PRIMARY KEY NOT NULL, initiative_id TEXT NOT NULL REFERENCES initiatives(id), ${fields}`;

// Fixed IC tables for this baseline only. Full source records retain evidence and owner detail.
const schema = {
  initiatives: 'id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, mission TEXT NOT NULL, status TEXT NOT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL',
  projects: ic('name TEXT NOT NULL, repo_path TEXT, remote_url TEXT, default_branch TEXT, role TEXT NOT NULL, status TEXT NOT NULL'),
  tracks: ic('project_id TEXT REFERENCES projects(id), name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, notes TEXT'),
  contracts: ic('name TEXT NOT NULL, owner_track_id TEXT NOT NULL REFERENCES tracks(id), contract_type TEXT NOT NULL, location TEXT, status TEXT NOT NULL, version TEXT, notes TEXT'),
  integration_surfaces: ic('name TEXT NOT NULL, producer_track_id TEXT NOT NULL REFERENCES tracks(id), consumer_track_id TEXT NOT NULL REFERENCES tracks(id), contract_id TEXT REFERENCES contracts(id), auth_boundary TEXT, data_classification TEXT, security_relevance TEXT NOT NULL, status TEXT NOT NULL'),
  work_items: ic('track_id TEXT REFERENCES tracks(id), type TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, branch TEXT, worktree TEXT, pr_url TEXT, assigned_agent TEXT, blocks_release INTEGER NOT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL'),
  work_item_dependencies: 'work_item_id TEXT NOT NULL REFERENCES work_items(id), depends_on_work_item_id TEXT NOT NULL REFERENCES work_items(id)',
  integration_scenarios: ic('surface_id TEXT NOT NULL REFERENCES integration_surfaces(id), name TEXT NOT NULL, environment_required TEXT NOT NULL, positive_or_negative TEXT NOT NULL, release_blocking INTEGER NOT NULL, security_relevance TEXT NOT NULL, status TEXT NOT NULL'),
  verification_runs: ic('scenario_id TEXT REFERENCES integration_scenarios(id), work_item_id TEXT REFERENCES work_items(id), environment TEXT NOT NULL, commit_set_json TEXT, command TEXT, result TEXT NOT NULL, evidence_path TEXT, notes TEXT, created_at_utc TEXT NOT NULL'),
  decisions: ic('title TEXT NOT NULL, status TEXT NOT NULL, decision TEXT, owner TEXT, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL'),
  risks: ic('title TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, mitigation TEXT, owner TEXT'),
  security_gates: ic('surface_id TEXT REFERENCES integration_surfaces(id), name TEXT NOT NULL, threat_class TEXT NOT NULL, required_evidence TEXT NOT NULL, status TEXT NOT NULL, blocking INTEGER NOT NULL'),
  release_gates: ic('name TEXT NOT NULL, description TEXT NOT NULL, required_evidence TEXT NOT NULL, status TEXT NOT NULL, owner TEXT, blocking INTEGER NOT NULL'),
  session_handoffs: ic('work_item_id TEXT REFERENCES work_items(id), agent_name TEXT NOT NULL, session_label TEXT, starting_commit_set_json TEXT, ending_commit_set_json TEXT, files_changed_json TEXT, commands_run_json TEXT, tests_result TEXT, decisions_needed TEXT, blockers TEXT, next_safe_action TEXT, do_not_touch TEXT, created_at_utc TEXT NOT NULL'),
  artifacts: ic('artifact_type TEXT NOT NULL, path TEXT NOT NULL, description TEXT, related_work_item_id TEXT REFERENCES work_items(id), related_scenario_id TEXT REFERENCES integration_scenarios(id), created_at_utc TEXT NOT NULL'),
};
const workStates = new Set(['proposed', 'ready', 'dispatched', 'in-progress', 'blocked', 'in-review', 'merged', 'rejected', 'deferred', 'canceled']);
const scenarioStates = new Set(['pending', 'running', 'passing', 'failing', 'blocked', 'skipped', 'not-applicable']);
const gateStates = new Set(['pending', 'ready-for-review', 'passing', 'failing', 'blocked', 'waived', 'not-applicable']);
const workTypes = new Set(['discovery', 'contract', 'parcel', 'integration', 'security-gate', 'release-gate', 'documentation', 'deployment', 'evidence', 'decision']);
const goals = {
  'permission-profile-registry': 'historically-closed',
  'w1-intake-registration': 'historically-closed',
  'w2-dispatch': 'historically-closed',
  'w3-verification': 'historically-closed',
  'w4-ci-integration': 'transferred-debt',
  'w4-closeout': 'incomplete',
  'plugin-packaging-and-scaffolder': 'incomplete',
  'foreman-kernel': 'incomplete',
  'hierarchical-coordination-sidecars': 'incomplete',
  'heterogeneous-agent-worker-fabric': 'incomplete',
  'governed-model-fleet': 'incomplete',
  'model-fleet-v1': 'frozen',
  'keon-proof-led-portfolio-priority': 'incomplete',
  'keon-full-platform-gtm-readiness': 'incomplete',
  'ledgerline-v1': 'unknown',
};
const text = (value, label) => assert(typeof value === 'string' && value.trim().length > 0, `${label}: nonempty text required`);
const texts = (value, label) => {
  assert(Array.isArray(value) && value.length > 0, `${label}: nonempty list required`);
  value.forEach((entry) => text(entry, label));
};
const columns = (table) => schema[table].split(', ').map((definition) => ({ name: definition.split(' ')[0], definition }));
const key = (row) => row.id ?? `${row.work_item_id}:${row.depends_on_work_item_id}`;

export function validateQueue(queue) {
  assert.equal(queue.schema_version, 1, 'Unsupported queue schema');
  assert.equal(queue.initiative?.id, INITIATIVE, 'Wrong initiative');
  assert.equal(queue.initiative.status, 'blocked', 'This baseline cannot claim readiness');
  assert.equal(queue.authority?.write_root, ROOT, 'Wrong write boundary');
  assert.equal(queue.authority.goal_ownership_transferred, false, 'No takeover permitted');
  assert.equal(queue.authority.external_effects_authorized, false, 'No external authority permitted');
  assert.equal(queue.authority.new_remediations_completed, 0, 'No completed remediation permitted');
  assert.equal(queue.routing?.per_model_control, false, 'Routing must remain advisory');
  assert.equal(queue.routing.workers_dispatched, 0, 'This baseline dispatched no workers');
  assert.equal(queue.routing.worker_dispatch_available_in_this_session, false, 'No dispatch tool exposed');
  assert.equal(queue.snapshot_at, '2026-09-05T00:00:00Z', 'Wrong date-granular baseline');

  for (const table of Object.keys(schema)) {
    if (!['initiatives', 'work_item_dependencies'].includes(table)) {
      assert(Array.isArray(queue[table]), `${table}: array required`);
      for (const row of queue[table]) assert(row && typeof row === 'object' && !Array.isArray(row), `${table}: object required`);
    }
  }
  const rows = { ...queue, initiatives: [queue.initiative] };
  rows.work_item_dependencies = queue.work_items.flatMap((item) => {
    assert(Array.isArray(item.depends_on), `${item.id}: depends_on array required`);
    return item.depends_on.map((dependency) => ({ work_item_id: item.id, depends_on_work_item_id: dependency }));
  });

  const normalized = {};
  for (const table of Object.keys(schema)) {
    const seen = new Set();
    normalized[table] = rows[table].map((record) => {
      const values = {
        initiative_id: INITIATIVE,
        created_at_utc: queue.snapshot_at,
        updated_at_utc: queue.snapshot_at,
        ...record,
      };
      const row = {};
      for (const { name, definition } of columns(table)) {
        const value = values[name] ?? null;
        if (definition.includes('NOT NULL')) assert.notEqual(value, null, `${table}.${name}: required`);
        if (value !== null) {
          if (definition.includes('INTEGER')) assert([0, 1].includes(value), `${table}.${name}: 0 or 1 required`);
          else text(value, `${table}.${name}`);
          if (name.endsWith('_json')) JSON.parse(value);
        }
        row[name] = value;
      }
      const identity = key(row);
      assert(!seen.has(identity), `${table}: duplicate ${identity}`);
      seen.add(identity);
      row.details_json = JSON.stringify(record);
      return row;
    });
  }
  // All references are checked before opening the file-backed database.
  for (const [table, records] of Object.entries(normalized)) {
    for (const { name, definition } of columns(table)) {
      const referenced = definition.match(/REFERENCES (\w+)\(id\)/)?.[1];
      if (!referenced) continue;
      const ids = new Set(normalized[referenced].map((row) => row.id));
      for (const row of records) {
        assert(row[name] === null || ids.has(row[name]), `${table}.${name}: dangling reference ${row[name]}`);
      }
    }
  }
  const goalTracks = queue.tracks.filter((track) => track.goal_dir !== null);
  assert.equal(goalTracks.length, 15, 'Exactly 15 goal tracks required');
  assert.deepEqual(Object.fromEntries(goalTracks.map((track) => [track.goal_dir, track.classification])), goals, 'Goal classifications changed');
  for (const track of queue.tracks) {
    text(track.owner, `${track.id}.owner`);
    assert(workStates.has(track.status) && track.status !== 'merged', `${track.id}: invalid baseline track status`);
  }
  for (const project of queue.projects) assert.equal(project.status, 'blocked', `${project.id}: baseline project not ready`);
  for (const contract of queue.contracts) assert(['proposed', 'blocked'].includes(contract.status), `${contract.id}: baseline contract not accepted`);
  for (const decision of queue.decisions) assert(['recorded', 'pending'].includes(decision.status), `${decision.id}: invalid decision status`);
  for (const risk of queue.risks) {
    assert.equal(risk.status, 'open', `${risk.id}: baseline risk unresolved`);
    assert(['low', 'medium', 'high', 'critical'].includes(risk.severity), `${risk.id}: invalid severity`);
  }
  for (const track of goalTracks) {
    assert(queue.work_items.some((item) => item.track_id === track.id && /^FL-G\d{2}$/.test(item.id)), `${track.id}: goal handoff missing`);
  }
  for (const id of ['FL-R1', 'FL-R2', 'FL-R3', 'FL-R4']) {
    assert(queue.work_items.some((item) => item.id === id), `${id}: required placeholder missing`);
  }
  for (const item of queue.work_items) {
    assert(workStates.has(item.status), `${item.id}: invalid work status`);
    assert(!['merged', 'dispatched', 'in-progress'].includes(item.status), `${item.id}: no execution or completion claim in baseline`);
    assert.equal(item.assigned_agent, null, `${item.id}: no worker assigned by this baseline`);
    assert(workTypes.has(item.type), `${item.id}: invalid work type`);
    for (const field of ['owner', 'blocker', 'next_safe_action', 'lane', 'priority']) text(item[field], `${item.id}.${field}`);
    texts(item.required_evidence, `${item.id}.required_evidence`);
    texts(item.source_refs, `${item.id}.source_refs`);
  }
  const visited = new Set();
  const visiting = new Set();
  const byId = new Map(queue.work_items.map((item) => [item.id, item]));
  function visit(id) {
    assert(!visiting.has(id), `Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    byId.get(id).depends_on.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  byId.forEach((_, id) => visit(id));
  for (const surface of queue.integration_surfaces) {
    assert.equal(surface.status, 'blocked', `${surface.id}: baseline surface unverified`);
    for (const field of ['owner', 'failure_behavior', 'required_evidence', 'environment_coverage']) text(surface[field], `${surface.id}.${field}`);
    for (const kind of ['positive', 'negative']) {
      assert(queue.integration_scenarios.some((scenario) => scenario.surface_id === surface.id && scenario.positive_or_negative === kind), `${surface.id}: ${kind} scenario missing`);
    }
  }
  for (const scenario of queue.integration_scenarios) {
    assert(scenarioStates.has(scenario.status) && scenario.status !== 'passing', `${scenario.id}: no baseline passing scenario`);
    assert(['positive', 'negative'].includes(scenario.positive_or_negative), `${scenario.id}: invalid scenario polarity`);
    text(scenario.steps, `${scenario.id}.steps`);
    text(scenario.required_evidence, `${scenario.id}.required_evidence`);
  }
  for (const gate of [...queue.security_gates, ...queue.release_gates]) {
    assert(gateStates.has(gate.status) && !['passing', 'waived'].includes(gate.status), `${gate.id}: no passing/waived baseline gate`);
    text(gate.owner, `${gate.id}.owner`);
  }
  assert.equal(queue.verification_runs.length, 0, 'Product verification was not performed; board tests live in VERIFICATION.md');
  assert(queue.session_handoffs.length > 0, 'Session handoff required');
  return normalized;
}

export function inspectState(db, expected) {
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1, 'Foreign keys must be enabled');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'Foreign key check failed');
  assert.deepEqual(db.prepare('PRAGMA integrity_check').all().map((row) => row.integrity_check), ['ok'], 'Integrity check failed');
  const counts = {};
  for (const [table, records] of Object.entries(expected)) {
    const names = [...columns(table).map((column) => column.name), 'details_json'];
    const actual = db.prepare(`SELECT ${names.join(', ')} FROM ${table}`).all();
    const wanted = new Map(records.map((row) => [key(row), row]));
    assert.equal(actual.length, records.length, `${table}: row count drift`);
    for (const row of actual) assert.deepEqual({ ...row }, wanted.get(key(row)), `${table}: persisted state differs from reviewed snapshot`);
    counts[table] = actual.length;
  }
  return counts;
}

export function importSnapshot(db, raw, { requireExisting = false } = {}) {
  const queue = JSON.parse(raw);
  const expected = validateQueue(queue);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('BEGIN IMMEDIATE');
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((row) => row.name);
    assert(!requireExisting || tables.length > 0, 'Existing valid baseline required; recover persisted history, do not reseed');
    let outcome;
    if (tables.length > 0) {
      assert.deepEqual(tables.filter((table) => table !== 'operational_events').toSorted(), [...Object.keys(schema), 'snapshot_imports'].toSorted(), 'Unknown/incomplete database schema; preserve it');
      const imports = db.prepare('SELECT * FROM snapshot_imports').all();
      assert.equal(imports.length, 1, 'Exactly one baseline snapshot required');
      assert.equal(imports[0].sha256, sha256, 'Snapshot differs; preserve DB and reconcile with coordinator, never reset/reseed');
      assert.equal(imports[0].queue_json, raw, 'Snapshot payload differs');
      assert.equal(imports[0].schema_version, 1, 'Database schema version differs');
      outcome = 'no-op';
    } else {
      for (const [table, definition] of Object.entries(schema)) {
        const primary = table === 'work_item_dependencies' ? ', PRIMARY KEY (work_item_id, depends_on_work_item_id)' : '';
        db.exec(`CREATE TABLE ${table} (${definition}, details_json TEXT NOT NULL${primary})`);
        const names = [...columns(table).map((column) => column.name), 'details_json'];
        const insert = db.prepare(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`);
        for (const row of expected[table]) insert.run(...names.map((name) => row[name]));
      }
      db.exec('CREATE TABLE snapshot_imports (id INTEGER PRIMARY KEY CHECK (id = 1), schema_version INTEGER NOT NULL, sha256 TEXT NOT NULL, queue_json TEXT NOT NULL, imported_at_utc TEXT NOT NULL)');
      db.prepare('INSERT INTO snapshot_imports VALUES (1, 1, ?, ?, ?)').run(sha256, raw, new Date().toISOString());
      outcome = 'imported';
    }
    const counts = inspectState(db, expected);
    const importedAt = db.prepare('SELECT imported_at_utc FROM snapshot_imports WHERE id = 1').get().imported_at_utc;
    assert(importedAt, 'Missing import timestamp');
    db.exec('COMMIT');
    return { scope: 'immutable-baseline', outcome, sha256, imported_at_utc: importedAt, integrity: 'ok', foreign_key_violations: 0, counts, snapshot_imports: 1, goal_tracks: 15, new_remediations_completed: 0 };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function openCoordinatorDatabase({ requireExisting = false } = {}) {
  const directory = dirname(fileURLToPath(import.meta.url));
  const canonical = (path) => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
  assert.equal(canonical(directory), canonical(ROOT), 'Script may write only the granted initiative directory');
  assert.equal(canonical(realpathSync(directory)), canonical(directory), 'Initiative directory must not redirect writes');
  const parent = join(directory, '.coordinator');
  assert(lstatSync(parent).isDirectory() && !lstatSync(parent).isSymbolicLink(), 'Pre-created .coordinator directory required; no links');
  assert.equal(canonical(realpathSync(parent)), canonical(parent), 'Coordinator directory must not redirect writes');
  const raw = readFileSync(join(directory, 'queue.json'), 'utf8');
  validateQueue(JSON.parse(raw));
  const path = join(parent, 'coordinator.db');
  return { db: openDatabaseFile(path, { requireExisting }), raw, directory, path };
}

// The caller enforces its directory boundary; isolated tests use their own generated files.
export function openDatabaseFile(path, { requireExisting = false } = {}) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  assert(!requireExisting || stat, 'Existing coordinator database required; recover persisted history, do not reseed or overwrite STATUS.md');
  if (stat) {
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Database must be a regular unlinked file');
    assert(stat.size > 0, 'Existing empty database is not an accepted snapshot; preserve and report');
  }
  for (const suffix of ['-journal', '-wal', '-shm']) {
    assert(!lstatSync(`${path}${suffix}`, { throwIfNoEntry: false }), `Existing SQLite sidecar ${suffix}; another writer/recovery may be active, preserve and stop`);
  }
  return new DatabaseSync(path);
}

function main() {
  assert.equal(process.argv.length, 2, 'No path overrides or mutation flags supported');
  const { db, raw, path } = openCoordinatorDatabase();
  try {
    console.log(JSON.stringify({ database: path, ...importSnapshot(db, raw) }, null, 2));
  } finally {
    db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Snapshot refused: ${error.message}`);
    process.exitCode = 1;
  }
}
