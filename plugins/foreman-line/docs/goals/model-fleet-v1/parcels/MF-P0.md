# Parcel: MF-P0 — Host Boundary Feasibility

## Goal

Determine, without any provider call, whether this exact Windows/Codex host can mechanically
confine future OpenRouter worker commands and descendants to the ratified filesystem,
environment, process, and network boundaries.

## Initiative

`model-fleet-v1`

## Project Track

Windows host / Codex runtime security boundary

## Wave

Foundation

## Branch

`n/a` — evidence-only host feasibility parcel; no product source or Git commit authorized

## Worktree

`D:\Repos\agent-skills` for governance records only. All active canary material must live in
one uniquely named, resolved directory beneath the current user's temporary directory.

## Dependencies

- Ratified D1–D19 and Amendment A1
- Gate 2 grant for MF-P0–MF-P4

## Integration Surfaces

- Codex CLI → native Windows sandbox/permissions implementation
- Codex parent environment → model-generated command environment
- resolved repository root → filesystem read/write boundary
- Codex parent transport → worker-command network boundary
- launcher process → descendant-process termination boundary

## Security Gate

Security review required before MF-P0 acceptance. Two independent adversarial reviews are
required because this parcel determines whether external-provider work may proceed at all.

## Allowed Product Files

- None.

## Allowed Governance Files

- `plugins/foreman-line/docs/goals/model-fleet-v1/parcels/MF-P0.md`
- `plugins/foreman-line/docs/goals/model-fleet-v1/mf-p0-evidence.md`
- `plugins/foreman-line/docs/goals/model-fleet-v1/mf-p0-review-a.md`
- `plugins/foreman-line/docs/goals/model-fleet-v1/mf-p0-review-b.md`
- Goal status fields in `charter.md`, `loop-directive.md`, and `docs/goals/INDEX.md`

## Temporary Evidence

- One generated directory beneath `[System.IO.Path]::GetTempPath()` whose resolved path is
  recorded before use.
- The directory may contain only synthetic canaries, disposable Git content, captured
  command outputs, and generated ACL/process/network observations.
- Any cleanup target must be resolved and proven to be the generated child directory before
  recursive removal. If that proof fails, do not delete it.

## Forbidden

- Creating or editing any of the three Model Fleet product artifacts.
- Editing Codex base config, the OpenRouter overlay, Windows policy, firewall, ACLs outside
  the generated temporary directory, user profiles, repositories, or environment variables.
- Reading or emitting any credential value, length, hash, quoting, or storage location.
- Making an OpenRouter or other provider request.
- Using sandbox bypass, `danger-full-access`, `--add-dir`, interactive approvals, or
  hook-trust bypass.
- Treating a permission label, documentation claim, or prompt instruction as proof.
- Installing software, elevating privileges, or changing machine configuration.

## Out of Scope

- Fixing a failed host boundary.
- Building a container or disposable account fallback.
- Implementing the schema, launcher, or skill.
- Proving model/output compatibility.
- Provider spend or data transfer.

## Existing Patterns To Follow

- `plugins/foreman-line/docs/goals/model-fleet-v1/charter.md` — ratified boundary and stops.
- `plugins/foreman-line/docs/goals/model-fleet-v1/loop-directive.md` — queue and authority.
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md` — evidence and independent review.
- `plugins/foreman-line/skills/parcel-driven-development/SKILL.md` — exact files, isolation,
  verification, and stop-on-gap discipline.

## Contract

MF-P0 returns exactly one coordinator disposition:

- `GO`: every required control is supported and passes deterministic positive and negative
  canaries on this host; or
- `NO-GO`: at least one required control is absent, unsupported, ambiguous, or failing.

There is no `GO-WITH-WARNINGS` state. A `NO-GO` stops MF-P1–MF-P4 until a separately
ratified hardened environment or charter amendment closes the failed boundary.

## Required Checks

1. Record OS, PowerShell, trusted Codex executable resolution, Codex version, relevant
   feature state, and non-secret permission/sandbox configuration keys.
2. Reproduce and diagnose the exact supported native Windows sandbox invocation syntax.
3. Prove the generated temporary root is isolated and record its resolved path and ACL owner.
4. Prove an allowed file can be read and a denied outside-home canary cannot be read.
5. Prove an allowed-path write can succeed for a write profile while an outside write fails.
6. Prove `OPENROUTER_API_KEY` and synthetic secret variables are absent from model-command
   environments without reading their values.
7. Prove junction/reparse/symlink escape attempts cannot read or write the outside canary.
8. Prove worker-command outbound network fails while making no provider request.
9. Determine whether the pinned runtime can terminate and verify an entire synthetic child
   process tree without leaving a descendant alive.
10. Confirm no base config, overlay, product path, repository content outside allowed
    governance files, or persistent machine policy changed.

## Verification Commands

Run read-only discovery first:

```powershell
codex --version
codex --help
codex exec --help
codex sandbox --help
codex features list
Get-Command codex
$PSVersionTable
```

Then use the exact sandbox syntax proved by local help. Canary commands must use only
synthetic sentinel names/content, report booleans and exit codes rather than protected
content, and run with `approval_policy = "never"`.

## Acceptance Criteria

- Every Required Check has a captured command, exit code, observation, and disposition.
- Negative canaries demonstrate denial; positive controls demonstrate the harness itself is
  capable of observing an allowed operation.
- No provider request, secret read, persistent host mutation, or product artifact occurred.
- Two fresh independent reviewers reproduce or inspect the decisive evidence and agree that
  `GO` is earned.
- Any unsupported or failed control produces `NO-GO` and stops the queue.

## Evidence Required

- `mf-p0-evidence.md` with environment inventory, exact commands, results, coverage gaps,
  final disposition, and residual temporary paths if cleanup was unsafe.
- Two independent review records with severity, evidence locators, and `PASS` or
  `REQUEST CHANGES`.
- Read-back of the charter/loop/index state after closure or stop.

## Collision Risk

High. Tests touch host sandbox boundaries and process behavior. They must not run alongside
another Model Fleet feasibility test or mutate shared config/policy.

## Session Handoff

- Starting commit: record current `HEAD`; no commit authorized.
- Ending commit: must equal starting `HEAD`.
- Product files changed: none.
- Governance files changed: record exact list.
- Commands run: record in evidence.
- Tests passed/failed: record counts and decisive failures.
- Decisions needed: hardened-environment choice if `NO-GO`.
- Blockers: record exact unsupported or failed boundary.
- Next safe action: MF-P1 only after `GO` and two clean reviews.
- Do not touch: product artifacts, configs, credentials, persistent host policy.

## Step 0 Record

The coordinator restates and accepts this scope before active canaries:

- No product artifact is allowed.
- No provider call or spend is allowed.
- No secret value may be read.
- Canary actions are confined to the resolved generated temporary directory.
- Any absent, ambiguous, or failed mechanical boundary is `NO-GO`.

## Stop-and-Report Rule

Stop immediately if a check would require elevation, installation, persistent config/policy
mutation, credential inspection, a provider call, a fourth product artifact, a path outside
the generated temporary root, or a safety claim that cannot be proven mechanically.
