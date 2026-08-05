---
name: modernizer
description: |
  A contract-first modernization agent skill.
  Modernizer extracts behavioral contracts from legacy systems,
  orchestrates human-in-the-loop validation, and generates
  target-native implementations that are provably correct
  via reconciliation and receipt packs.
version: "1.2"
metadata:
  author: The Brotherhood
  keywords:
    - modernization
    - legacy rewrite
    - contract-first
    - reconciliation
    - receipts
compatibility:
  required:
    - filesystem_access
    - git
    - persistent_storage
    - execution_tracing
  optional:
    - network_capture_tools
    - schema_contracts
    - runtime_engines
specification: https://agentskills.io/specification
---

## Objective

Modernize a legacy codebase by extracting **behavioral contracts** (inputs + state → outputs + side effects), validating them with human intervention where needed, and rebuilding a clean, target-native implementation that is provably equivalent within defined drift tolerances.

Correctness is demonstrated with:
- Contract conformance tests
- Dual-execution or protocol parity evidence
- Replayable receipts and trace artifacts

---

## Rules (Non-Negotiable)

1. **Contracts are the truth.** You may not implement or guess behavior that is not defined in approved contracts.
2. **No line-for-line translation.** Implementation must be idiomatic in the target stack.
3. **Human validation gate required** before any implementation begins.
4. **Every behavioral claim must link to evidence** via receipts.
5. **Ambiguity triggers escalation.** If behavior is unclear, do not proceed without HITL resolution.
6. **Reconciliation must pass before release.** Drift must remain within tolerance.

---

## Required Outputs

The Modernizer run must produce:

- `contracts/` directory with:
  - `DRAFT_MANIFEST.yaml`  
  - `MANIFEST.yaml` (HITL-approved)
  - individual contract files
- `TOMBSTONES.md` documenting approved divergences
- `ARCHITECTURE.md` describing target design
- `task_store.db` and lease metadata
- `telemetry.log` with evidence links
- Reconciliation outputs:
  - `coverage_summary.md`
  - `sampling_summary.md`
  - `delta_report.md`
  - `recon/` diffs
- Receipt pack:
  - `receipts/manifest.json`
  - `receipts/trace_index.json`
  - `receipts/replay.sh` / `receipts/replay.ps1`
  - `receipts/hashes.sha256`

---

## Execution Phases

### Phase I — Discovery
- Inventory source system (API, code, traces, tests, logs)
- Extract behavioral contracts based on prioritized sources

### Phase II — Validation Gate (HITL)
- Present draft manifest
- Resolve ambiguities
- Record tombstones
- Approve final manifest

### Phase III — Architecture
- Create target-native design
- Populate task graph and persistence store

### Phase IV — Implementation
- Implement only from approved contracts
- Add tests per contract
- Track confidence and emit receipts

### Phase V — Reconciliation
- Execute stratified sampling
- Compare legacy vs new outputs using drift rules
- Generate reports and diffs

---

## Failure Conditions

Stop and escalate if:
- Contract coverage is insufficient
- Strict fields drift outside tolerance
- Ambiguities remain unresolved
- Confidence below threshold
- Reconciliation fails

---

## Contract Format

Contracts must describe:

- Inputs and preconditions
- Execution trigger
- Expected outputs
- Side effects with structured assertions
- Error handling cases
- Determinism strategy

Contracts must be stored in versioned YAML and reference schemas where available.

---

## Drift Scoring

Drift is measured using weighted scoring:

- Strict fields (status codes, signed outputs)
- Ignored fields (timestamps, IDs)
- Epsilon rules for floats
- Ordering semantics (set vs list)

---

## Receipts

Receipts are replayable proof artifacts with:

- Manifest linkage
- Trace indexes
- Contract versions
- Checksums
- Replay scripts

Receipts must make it possible to rebuild and reverify acceptance criteria without external context.

---

## Non-Goals

This skill does NOT:

- Reimagine domain semantics beyond approved tombstones
- Attempt speculative refactors
- Enforce architectural preferences outside contracts
- Assume behavior not validated by evidence

---

## Final Instruction

Optimize for **defensibility, replayability, and evidence**. A modernization that “seems right” but is not provable with receipts and reconciliation is a failure.

---