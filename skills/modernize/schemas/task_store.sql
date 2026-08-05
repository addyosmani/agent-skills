-- task_store.sql — Choreography node tree for the `modernize` skill.
-- SQLite. Durable source of truth for the supervised process-skill tree.
-- Companion to SKILL.md "Execution Model — Choreography of Process-Skills".
--
-- DOCTRINE (read before you "improve" this schema):
--   This is a SUPERVISED TREE, not a queue + worker pool. There are
--   deliberately NO lease, TTL, or heartbeat columns here, and there is
--   NO reaper. A node leaves 'started' ONLY by writing its own terminal
--   row (done|failed). The primary agent is a WATCHER: it observes this
--   tree and never auto-reaps, requeues, or mutates a child's terminal
--   state on its behalf.
--
--   Ephemeral presence ("is this process alive right now?") lives in Redis
--   and is ADVISORY ONLY -- used solely to decide WHEN to raise an
--   investigate flag for a node still in 'started'. It never reclaims work.
--   That is why no last_seen/heartbeat column appears below.
--
--   Investigate signal = status='started' AND Redis presence absent AND no
--   terminal row. Surfaced to the human/primary; never auto-resolved.
--
-- NOTE: foreign_keys is per-connection in SQLite; the application MUST also
--       set `PRAGMA foreign_keys = ON;` on every connection, not just here.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ───────────────────────────────────────────────────────────────────────
-- runs: one modernization run. Scopes a node tree; tracks the active phase
-- so phase-transition gates query per-run. Holds governance ceilings.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runs (
  run_id          TEXT PRIMARY KEY,             -- app-generated; UUIDv7/ULID recommended
  source_ref      TEXT NOT NULL,                -- source path/url/repo identifier
  target_stack    TEXT,                         -- free-form target description
  current_phase   TEXT NOT NULL DEFAULT 'phase0'
                    CHECK (current_phase IN
                      ('phase0','phase1','phase2','phase3','phase4','phase5','released')),
  max_depth       INTEGER NOT NULL DEFAULT 5,   -- dumb fuse; budget is the real control
  max_concurrency INTEGER NOT NULL DEFAULT 8,   -- ceiling on simultaneously 'started' nodes
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ───────────────────────────────────────────────────────────────────────
-- nodes: the supervised process-skill tree. One row per process invocation.
-- Lifecycle: pending -> started -> (done | failed). Terminal is immutable.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nodes (
  id                 TEXT PRIMARY KEY,          -- stable node id; UUIDv7/ULID recommended
  run_id             TEXT NOT NULL
                       REFERENCES runs(run_id) ON DELETE CASCADE,
  parent_id          TEXT
                       REFERENCES nodes(id) ON DELETE CASCADE,  -- NULL only for the root node
  path               TEXT NOT NULL,             -- materialized scope path, '/'-delimited
                                                --   e.g. root/backend/billing/invoice-calc
  depth              INTEGER NOT NULL DEFAULT 0  -- derived from path; app enforces max_depth fuse
                       CHECK (depth >= 0),
  node_type          TEXT NOT NULL,             -- OPEN vocabulary (convention, not a hard enum):
                                                --   scope tier:   root|subsystem|project|module|component
                                                --   process kind: discovery|implementation|reconcile|coverage_check
  phase              TEXT NOT NULL
                       CHECK (phase IN ('phase0','phase1','phase2','phase3','phase4','phase5')),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','started','done','failed')),
  trigger            TEXT,                       -- what fires this node; convention: root|spawn|schedule|event|manual
  spawn_reason       TEXT,                       -- why the parent decomposed into this child (provenance)
  result_ref         TEXT,                       -- pointer to durable output artifact; NULL until produced
  failure_reason     TEXT,                       -- REQUIRED when status='failed' (loud failure); trigger-enforced
  spawn_budget_total INTEGER NOT NULL DEFAULT 0, -- children this node may spawn (allotted by parent)
  spawn_budget_used  INTEGER NOT NULL DEFAULT 0
                       CHECK (spawn_budget_used >= 0 AND spawn_budget_used <= spawn_budget_total),
  started_at         TEXT,                       -- set by trigger when status -> started
  terminal_at        TEXT,                       -- set by trigger when status -> done|failed
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (run_id, path)
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent           ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_run_phase_status ON nodes(run_id, phase, status);
CREATE INDEX IF NOT EXISTS idx_nodes_run_status       ON nodes(run_id, status);

-- ── Terminal-state contract: enforce the lifecycle in the store itself ──

-- Legal transitions only: pending->{started,failed}, started->{done,failed},
-- and no-op self-updates. Anything else (incl. leaving a terminal state) aborts.
CREATE TRIGGER IF NOT EXISTS trg_nodes_status_transition
BEFORE UPDATE OF status ON nodes
WHEN NOT (
     (OLD.status = 'pending' AND NEW.status IN ('pending','started','failed'))
  OR (OLD.status = 'started' AND NEW.status IN ('started','done','failed'))
  OR (OLD.status = NEW.status)
)
BEGIN
  SELECT RAISE(ABORT,
    'illegal node status transition (terminal is immutable; a node leaves started only once)');
END;

-- Loud failure: a node may not enter 'failed' without a failure_reason.
CREATE TRIGGER IF NOT EXISTS trg_nodes_failed_requires_reason_upd
BEFORE UPDATE OF status ON nodes
WHEN NEW.status = 'failed'
 AND (NEW.failure_reason IS NULL OR length(trim(NEW.failure_reason)) = 0)
BEGIN
  SELECT RAISE(ABORT, 'failed node must record a failure_reason (loud failure, never quiet)');
END;

CREATE TRIGGER IF NOT EXISTS trg_nodes_failed_requires_reason_ins
BEFORE INSERT ON nodes
WHEN NEW.status = 'failed'
 AND (NEW.failure_reason IS NULL OR length(trim(NEW.failure_reason)) = 0)
BEGIN
  SELECT RAISE(ABORT, 'failed node must record a failure_reason (loud failure, never quiet)');
END;

-- Stamp started_at exactly once, on first entry to 'started'.
CREATE TRIGGER IF NOT EXISTS trg_nodes_stamp_started
AFTER UPDATE OF status ON nodes
WHEN NEW.status = 'started' AND OLD.status <> 'started' AND NEW.started_at IS NULL
BEGIN
  UPDATE nodes SET started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

-- Stamp terminal_at on entry to a terminal state.
CREATE TRIGGER IF NOT EXISTS trg_nodes_stamp_terminal
AFTER UPDATE OF status ON nodes
WHEN NEW.status IN ('done','failed') AND OLD.status NOT IN ('done','failed')
BEGIN
  UPDATE nodes SET terminal_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

-- ── Watcher / coverage queries (the gate's evidence) ──

-- Every non-terminal node. A phase or baseline with any open node is NOT complete.
CREATE VIEW IF NOT EXISTS v_open_nodes AS
SELECT run_id, phase, id, path, node_type, status, started_at
FROM nodes
WHERE status IN ('pending','started');

-- Per-run, per-phase coverage. A phase-transition gate may open only when open = 0.
CREATE VIEW IF NOT EXISTS v_phase_coverage AS
SELECT run_id,
       phase,
       COUNT(*)                              AS total,
       SUM(status IN ('done','failed'))      AS terminal,
       SUM(status IN ('pending','started'))  AS open
FROM nodes
GROUP BY run_id, phase;

-- Durable half of the investigate signal: nodes still 'started'. The watcher
-- intersects this with "Redis presence absent" to raise an investigate flag.
-- (No auto-reap, no requeue -- surfaced for human/primary judgment only.)
CREATE VIEW IF NOT EXISTS v_investigate_candidates AS
SELECT run_id, id, path, node_type, phase, started_at
FROM nodes
WHERE status = 'started';
