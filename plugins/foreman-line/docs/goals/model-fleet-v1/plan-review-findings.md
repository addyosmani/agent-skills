# Plan Review Findings — Model Fleet V1

**Review date:** 2026-09-03  
**Charter reviewed:** Gate-1-ratified D1–D19 version  
**Reviewer:** fresh independent frontier review session  
**Context supplied:** charter plus repository coordinator and parcel canon only  
**Reviewer authority:** advisory; reviewer made no edits  
**Verdict:** REVISE — CLOSED by ratified Amendment A1 on 2026-09-03

## Mandate

The reviewer was asked to test decomposition coherence, mechanical boundaries, missing
parcels/evidence, load-bearing decisions, parcel collisions, Windows and PowerShell process
failure modes, structured-result trust, provider/data/security boundaries, and whether the
three-static-artifact constraint is achievable.

## Findings and coordinator triage

| ID | Severity | Finding | Disposition | Gate effect |
|---|---|---|---|---|
| F1 | BLOCKER | `--cd` and ordinary sandbox labels do not by themselves prove that an external-provider worker cannot read unrelated host files, inherited secrets, or junction/symlink escape targets. Network denial was also qualified as “where supported” rather than fail-closed. | **Fix.** Require a preflight-proven elevated Windows/permissions boundary, explicit shell-secret exclusion, and host/network/escape canaries. If the installed runtime cannot prove confinement, stop or move the worker to an explicitly ratified hardened disposable environment. | Reopens D6, D7, D10, D11. |
| F2 | BLOCKER | P1–P3 write directly to live discovery paths even though Gate 3 was described as installation/acceptance, creating a circular requirement: post-install discovery evidence is needed before the installation gate. | **Fix.** Gate 2 may authorize reversible candidate installation to the final paths after snapshots; Gate 3 becomes human acceptance for routine use. Hash-bound rollback evidence is required. | Scoped D1/gate-lifecycle clarification. |
| F3 | HIGH | D9 allows concurrent read-only workers while D18 said the skill serializes all work touching one tree. | **Fix.** Make up to three same-tree read-only workers legal; any write-capable run is exclusive. | Reopens D18. |
| F4 | HIGH | `internal-approved` was only a caller-selected label, while persisted JSONL could contain internal source, prompts, or tool output without a retention and access policy. | **Fix.** Require a user-supplied per-run approval reference bound to repo, task digest, data class, and expiry. Apply owner-only ACLs and class-specific event retention; never persist raw internal events. | Reopens D4, D10, D15. |
| F5 | HIGH | Write roles lacked a structured allowed-path input, and final Git state alone cannot attribute ignored, out-of-tree, transient commit/reset, or restored-content mutations. | **Fix.** Require normalized allowed paths for every write-capable run and snapshot tracked, untracked, ignored, index, `HEAD`, refs/reflogs, and relevant filesystem state. Treat detection as evidence, not a claim of perfect prevention. | Reopens D4; strengthens D8/D16 during shaping. |
| F6 | HIGH | MF-P3 mixed skill authoring with end-to-end and security proof, leaving no independent evidence-only integration parcel. | **Fix.** Add MF-P0 confinement feasibility and MF-P4 zero-static-file integration/security evidence. | No D1–D19 change, but revised graph requires scoped Gate 1 confirmation before Gate 2. |
| F7 | HIGH | The illustrative PowerShell pipeline did not pin executable resolution, runtime version, encoding, asynchronous output draining, timeout races, cancellation, descendant termination, or kill verification. | **Fix.** Pin these in MF-P2 shaping and test spaces, Unicode, metacharacters, large output, hangs, cancellation, and descendants. | No locked-decision change. |
| F8 | MEDIUM | Tester received `workspace-write` while prose made writing conditional, which was not mechanically decidable. | **Fix.** Keep the five roles and tester sandbox, but require explicit normalized allowed paths for every write-capable invocation; without them tester refuses. | Closed by the D4 amendment; D5/D6 role names remain unchanged. |
| F9 | MEDIUM | JSON Schema dialect, supported structured-output subset, local validator, PowerShell version, and provider compatibility were unpinned. | **Fix.** Pin them during MF-P1/MF-P2 shaping and prove both local and approved provider validation before integration credit. | No locked-decision change. |
| C1 | HIGH | D17's reasoning called timeout a bounded-spend control, but elapsed time and concurrency do not impose a hard monetary ceiling for a dynamically routed model. | **Fix.** State honestly that V1 has no mechanical dollar ceiling. Every live call requires explicit approval; timeout/concurrency only bound exposure. | Reopens D17. |

All findings are accepted for correction. None is accepted merely as informational. The
reviewer's three-static-artifact conclusion is retained: the constraint is feasible if
staging, canaries, temporary repositories, parcel specs, review records, and run receipts
are classified as governance or ephemeral evidence rather than additional static product
surface.

## Proposed Gate 1 Amendment A1

The text below was ratified by Clinton Morgan on 2026-09-03 and is incorporated into the
authoritative charter.

### A1-D1 — artifact and installation lifecycle

Replace D1 with:

> V1 ships exactly three static implementation artifacts at the final paths:
> `Invoke-FleetWorker.ps1`, `worker-result.schema.json`, and `model-fleet/SKILL.md`.
> Candidate staging, parcel specs, review records, pre-install snapshots, hashes, temporary
> test repositories, canaries, and generated run receipts are governance or ephemeral
> evidence, not additional static product artifacts. After Gate 2, each parcel may perform
> a reversible candidate installation to its final path only after proving the path absent
> or recording a byte-for-byte rollback snapshot. Installation is not acceptance. Gate 3
> is the human decision to accept and use the installed fleet routinely.

### A1-D4 — explicit authority-bearing launcher interface

Replace D4 with:

> The launcher requires `-Role`, `-Task`, `-Repo`, and `-DataClassification`. Every
> write-capable invocation also requires one or more normalized `-AllowedPath` values; absent
> or escaping paths fail before provider invocation. `internal-approved` additionally
> requires a user-supplied `-ApprovalRef` bound in the run metadata to the resolved repo,
> task digest, data class, expiry, and authorized provider. Bounded operational switches may
> include `-TimeoutMinutes` and `-PreflightOnly`. The launcher uses a trusted executable path
> plus an argument list, sends the composed prompt over stdin, and never uses
> `Invoke-Expression`.

### A1-D6 — role sandbox plus proven filesystem confinement

Replace D6 with:

> `researcher` and `reviewer` use `read-only`; `builder`, `tester`, and `documenter` use
> `workspace-write`. In addition, every worker must run under the strongest supported native
> Windows sandbox/permissions boundary, with exact eligible read roots and exact write roots
> derived from the resolved repository, role, and allowed paths. Preflight canaries must
> prove denial of unrelated home files, inherited-secret reads from tool subprocesses,
> junction/symlink escapes, outside writes, and unauthorized network. No V1 path uses
> `danger-full-access`, `--add-dir`, sandbox bypass, hook-trust bypass, or interactive
> approvals. If the installed Codex/Windows runtime cannot prove this confinement, dispatch
> stops unless a separately ratified hardened disposable environment supplies it.

### A1-D7 — fail-closed worker network boundary

Replace D7 with:

> Model-generated commands and their descendants must have outbound network denied by a
> preflight-proven sandbox or firewall boundary. The Codex parent transport may reach only
> the configured OpenRouter endpoint needed for inference. “Unsupported,” “best effort,” or
> a failed network canary is a stop condition, not a warning. Workers may not perform cloud,
> deployment, publication, messaging, purchasing, credential, Git push, PR, or other
> external-effect actions.

### A1-D10 — data classification and scoped approval

Replace D10 with:

> V1 accepts `public` or `internal-approved`. `public` must contain no nonpublic host or
> repository data. `internal-approved` is available only after the confinement canaries pass
> and requires a user-supplied, unexpired approval reference bound to the exact resolved
> repository, task digest, provider, and run data class. The coordinator may not mint or
> infer that reference. `restricted`, secret-bearing, regulated, personal, credential, and
> ambiguous data are refused. If approval or classification cannot be proven before launch,
> no provider request is made.

### A1-D11 — transport-only credential availability

Replace D11 with:

> Authentication remains environment-based through `OPENROUTER_API_KEY`. The launcher may
> check presence only. The Codex parent process may use the value solely for provider
> transport, while explicit shell-environment filtering must exclude it and other sensitive
> variables from every model-generated command and descendant. Canary commands must prove
> absence without revealing any value, length, hash, or storage location. The launcher,
> prompt, events, receipts, and run metadata never read, print, persist, transform, or
> describe the credential.

### A1-D15 — class-aware evidence lifecycle

Replace D15 with:

> Each invocation creates a unique owner-only run directory and records sanitized invocation
> metadata, final structured result, process exit state, and launcher validation state.
> Public runs may retain JSONL events for at most 30 days. Internal-approved runs process
> JSONL through an owner-only temporary stream and do not retain raw events; their sanitized
> metadata and final receipt expire after 7 days. Cleanup runs before and after invocation.
> Unexpected sensitive output causes a failed run, the narrowest possible owner-only
> quarantine pending human disposition, and no output echo to the foreman. Retention and
> deletion are best-effort filesystem lifecycle controls, not secure-erasure claims.

### A1-D17 — bounded execution, no false dollar ceiling

Replace D17 with:

> Default timeout is 30 minutes, launcher-layer automatic retry is zero, cancellation is
> terminal, and every retry receives a new run ID plus an explicit foreman decision. Timeout,
> concurrency, and retry controls bound execution exposure but do not create a hard monetary
> ceiling. V1 has no mechanically enforced per-run dollar cap; every live provider call
> therefore requires explicit human spend authorization, and a requirement for a hard dollar
> ceiling is a stop condition for V1.

### A1-D18 — unambiguous concurrency rule

Replace D18 with:

> The `$model-fleet` skill delegates only bounded work. Up to three independent read-only
> workers may share one resolved tree. Any run involving a write-capable worker is exclusive
> for that worktree: no other read or write worker may overlap it. The skill requires
> independent post-change review before recommending acceptance and never tells the foreman
> to trust worker conclusions or skip personal validation.

## Revised parcel graph proposed by plan review

| Parcel | Outcome | Static product files | Dependencies |
|---|---|---:|---|
| MF-P0 — Host boundary feasibility | Proves trusted executable/runtime resolution, elevated Windows confinement, environment filtering, filesystem/junction/network canaries, and the go/no-go boundary before product implementation. | 0 | none |
| MF-P1 — Worker result contract | Produces the strict, dialect-pinned schema and ephemeral positive/negative fixtures. | 1 | MF-P0 |
| MF-P2 — Deterministic launcher | Produces the guarded launcher, allowed-path enforcement, process-tree control, locking, evidence lifecycle, rollback, and failure normalization. | 1 | MF-P1 |
| MF-P3 — Foreman skill | Produces the user-level skill without claiming system acceptance. | 1 | MF-P2 |
| MF-P4 — Integration and security evidence | Independently runs canaries and the approved researcher → builder → reviewer proof, reconciles receipts/diffs/tests/root identity, and presents Gate 3 evidence. | 0 | MF-P1, MF-P2, MF-P3 |

MF-P0 and MF-P4 may create only temporary or generated evidence. They may not create a
fourth static implementation artifact.

## Re-ratification record

Clinton Morgan explicitly stated
`Ratify Model Fleet V1 Amendment A1 and revised graph MF-P0–MF-P4.` on 2026-09-03.
Gate 1 is therefore closed for A1-D1, A1-D4, A1-D6, A1-D7, A1-D10, A1-D11, A1-D15,
A1-D17, A1-D18, and the revised graph. Original D2, D3, D5, D8, D9, D12–D14, D16,
and D19 remain ratified unchanged.

This closes plan review; it does not grant Gate 2, provider calls, spend, internal-data
transfer, candidate installation, or Gate 3 acceptance.
