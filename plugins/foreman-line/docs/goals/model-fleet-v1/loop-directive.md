# Coordinator Loop Directive — Model Fleet V1

## COORDINATOR OWNERSHIP

> **Owner:** `/root` — current Remote-safe Codex conversation, claimed 2026-09-03.
> One goal has one coordinator. Transfer only at a parcel boundary by updating this block,
> the charter, and the goal index. If ownership becomes ambiguous, stop and reconcile.

**State:** `stopped_at_mf_p0_no_go`

## Authority ledger

- Gate 1 is closed for D1–D19, ratified Amendment A1, and MF-P0–MF-P4.
- Mandatory plan-level adversarial review is complete and closed by A1.
- Gate 2 was granted by Clinton Morgan on 2026-09-03 for exactly MF-P0–MF-P4 under this
  directive.
- Provider calls and spend are not granted.
- `internal-approved` transfer is not granted without a user-supplied, unexpired, run-bound
  approval reference after MF-P0 confinement passes.
- Gate 2 permitted reversible candidate installation under its conditions, but no candidate
  installation occurred before the MF-P0 stop.
- Gate 3 acceptance and routine use are human-owned and not delegated.
- Commit, push, merge, PR, deployment, publication, messaging, purchasing, credential
  inspection, and cloud changes are not authorized.

## Ratified queue

Run in strict dependency order:

1. **MF-P0 — Host boundary feasibility**
   - Static product files: none.
   - Prove trusted Codex and PowerShell resolution, strongest supported native Windows
     confinement, shell-environment filtering, filesystem/junction/network canaries, and
     process-tree control feasibility.
   - No provider call is required or authorized for this parcel.
   - Exit only with a documented go/no-go result. A failed confinement control stops the
     queue; it does not degrade to prompt-only safety.
2. **MF-P1 — Worker result contract**
   - Static product file:
     `C:\Users\clint\.codex\fleet\worker-result.schema.json`.
   - Pin the JSON Schema dialect, Codex-supported subset, validator/runtime, strict result
     shape, and ephemeral positive/negative fixtures.
3. **MF-P2 — Deterministic launcher**
   - Static product file:
     `C:\Users\clint\.codex\fleet\Invoke-FleetWorker.ps1`.
   - Implement the ratified interface, permissions boundary, normalized allowed paths,
     per-worktree locking, process-tree control, role contracts, data/spend gates, evidence
     lifecycle, rollback, receipt validation, and failure normalization.
4. **MF-P3 — Foreman skill**
   - Static product file:
     `C:\Users\clint\.agents\skills\model-fleet\SKILL.md`.
   - Implement the ratified delegation and reconciliation behavior without claiming system
     acceptance.
5. **MF-P4 — Integration and security evidence**
   - Static product files: none.
   - Independently rerun confinement controls and, only under separately granted provider
     and data authority, perform the researcher → builder → reviewer scenario.
   - Reconcile receipts, actual diffs, rerun tests, root identity, retention, and rollback.
   - Present the complete evidence chain for human Gate 3.

MF-P0 and MF-P4 may create only temporary/generated evidence. No parcel may create a fourth
static implementation artifact.

## Gate 2 grant

Clinton Morgan explicitly granted Gate 2 for exactly MF-P0 through MF-P4 in the order above,
subject to these limits:

1. Shape and execute only the ratified parcels and exact static files.
2. Create parcel specs, review records, hashes, canaries, temporary repositories, rollback
   snapshots, and run receipts only as governance or ephemeral evidence permitted by D1.
3. Perform reversible candidate installation to a final path only after proving it absent or
   recording a byte-for-byte rollback snapshot.
4. Run local no-provider preflight and confinement tests.
5. Dispatch two independent adversarial reviews for each architecture/security-risk parcel;
   reviewers never fix or write product files.
6. Do not make any live provider call without a separate explicit human authorization for
   the named run, data class, repository/task digest, and acknowledged absence of a hard
   dollar ceiling.
7. Do not transfer `internal-approved` data without the ratified D10 approval reference and
   passed MF-P0 boundary.
8. Do not infer Gate 3 acceptance from candidate installation or green tests.

The exact grant was:

> `Grant Gate 2 for Model Fleet V1 MF-P0–MF-P4 under the ratified charter and loop directive.`

This does not grant provider calls, spend, internal-data transfer, or Gate 3 acceptance.

## MF-P0 stop record

- Disposition: `NO-GO — STOPPED` on 2026-09-03.
- Decisive controls: production elevated-sandbox startup failed; the comparison runtime
  allowed a junction read escape and outbound HTTP.
- Review A: `PASS` for the soundness of the stop, not for host feasibility.
- Review B: `REQUEST CHANGES`; incomplete command capture and the one-root authorization
  deviation leave MF-P0 not acceptance-closed.
- Queue effect: MF-P1–MF-P4 were not dispatched and remain prohibited.
- Product/provider effect: no product artifact, candidate installation, provider request,
  spend, internal-data transfer, or Gate 3 action occurred.
- Resume condition: a separately ratified hardened environment or charter/overlay redesign,
  followed by a fresh MF-P0 run with complete evidence and two fresh reviews.

## Per-parcel algorithm

1. Re-read the charter, this directive, current target state, and prior parcel evidence.
2. Verify coordinator ownership and current gate state.
3. Shape one parcel with exact allowed product files, temporary evidence paths, commands,
   acceptance criteria, tripwires, and stop conditions.
4. For any builder/reviewer dispatch, require Step 0 to restate the exact scope, permissions,
   evidence, and stop conditions before work.
5. Preserve any pre-existing target byte-for-byte. Stop on ownership ambiguity or an
   unauthorized overwrite.
6. Verify completion claims against disk and process evidence before rerunning anything.
7. Run the deterministic checks in the pinned local environment.
8. Dispatch two fresh independent adversarial reviews with no builder context beyond the
   parcel, charter, relevant product files, and evidence.
9. Triage every finding as fix, accept-as-documented, or informational. A decision-changing
   correction reopens Gate 1 only for the affected decision.
10. Rework under the same allowed-file and test-count tripwires; two failures of the same
    tripwire stop the goal.
11. Close the parcel only when the evidence chain is green and the next dependency is safe.
12. After MF-P4, present evidence and stop at human Gate 3. Do not self-accept routine use.

## Standing invariants

- The Remote root remains OpenAI `gpt-5.6-sol`.
- OpenRouter appears only in separately launched worker processes.
- The three-artifact static product surface does not widen.
- Worker roles cannot choose their model, sandbox, permissions, paths, classification, or
  approval reference.
- Every write run has normalized allowed paths and exclusive worktree occupancy.
- Every provider run has explicit spend authority; every internal-approved run also has an
  unexpired user-supplied approval reference.
- Credentials remain transport-only and absent from worker commands, prompts, events,
  receipts, metadata, and reports.
- A worker result is evidence for coordinator judgment, never authority or acceptance.

## Stop conditions

Stop and report on any charter stop condition, including:

- missing Gate 2 or provider/data authority;
- ambiguous ownership or collision with another goal;
- a required fourth static implementation artifact;
- pre-existing final-path content without explicit disposition;
- failed or unsupported filesystem, environment, junction/symlink, outside-write, network,
  cancellation, or descendant-process control;
- a need to use prompt-only safety where A1 requires mechanical proof;
- dirty/shared write target, escaping allowed path, or unexplained repository delta;
- secret exposure or unexpected sensitive output;
- an unbounded retry or a requirement for a hard per-run dollar ceiling;
- a worker commit, push, external effect, or root provider/model change;
- an unresolved architecture/security finding; or
- any need to infer a human gate.

## Wakeup and handoff

On resume, first reconcile the charter, plan review, target paths, Git state, installed
Codex behavior, and ownership block. If this session transfers ownership, record the
successor's exact identity and timestamp here before either coordinator performs further
work.
