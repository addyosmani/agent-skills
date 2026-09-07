# Governed Model Fleet — Plan-Level Adversarial Review

**Review date:** 2026-09-04  
**Reviewed baseline:** Gate-1-ratified D1–D24 and GMF-P0–GMF-P6  
**Reviewer:** fresh `/root/gmf_plan_adversarial_review` session  
**Context boundary:** charter plus current Keon repo instructions, canon, and directly
referenced Runtime/Gateway implementation; no prior Model Fleet review disposition  
**Mode:** passive, read-only, no provider call or workload launch  
**Verdict:** `REQUEST CHANGES — SCOPED GATE 1 REOPEN REQUIRED`

## Coordinator reproduction

The coordinator reproduced the load-bearing implementation facts before triage:

- the current permission verifier checks revocation before a later spend-ledger reservation;
- the SQLite spend ledger atomically records only permission use/index/timestamps;
- the execution dispatcher persists spend evidence after the spend and evaluates budget
  after handler execution as soft-only;
- MCP Gateway currently provides tier/static-scope filtering and generic
  action/resource/parameter admission, not D14's Fleet capability contract; and
- the ratified parcel table contains no promotion actuator, MCP-admission implementation,
  new-repository bootstrap, or independently accepted verifier implementation parcel.

These checks support the review's architectural findings. They do not constitute parcel
verification or authorize implementation.

## Findings and triage

| ID | Severity | Finding | Triage | Gate effect / disposition |
|---|---|---|---|---|
| PR-01 | Critical | `fleet.patch.promote` has no trusted actuator owner or implementation parcel. | **Fix** | Amend D15/D19 and graph: a separately identified Promotion Actuator in the executor repository applies only to an isolated promotion worktree/ref; add a dedicated parcel. Gate 3 remains merge authority. |
| PR-02 | Critical | D9 transfers/materializes source before any effect permission is spent. | **Fix** | Amend D5/D9/D11/D22. Pre-spend preparation is blank only. A satisfied `fleet.worker.execute` spend starts one isolated process-tree effect; source transfer/materialization occurs after spend and before cognition. No fourth effect is introduced, so A4–A6 and D4 remain intact. |
| PR-03 | Critical | One P4 cannot gain independent deny-only acceptance before enabling its own allowed path. | **Fix** | Amend D17 and split executor work into baseline, deny-only, and later bounded-allow parcels. The allowed parcel depends on independent closure of deny-only evidence. |
| PR-04 | Critical | P2 hides a new durable atomic state machine, migration, accounting, recovery, and verification behind one parcel. | **Fix** | Clarify D6 and split P2 into durable state/migration, atomic spend/reservation, and terminal reconciliation/recovery parcels. Runtime owns the one durable transaction boundary. |
| PR-05 | Critical | Inference effect/retry/unknown-charge/settlement semantics are incomplete. | **Fix** | Amend D6/D13/D16/D21. One exact outbound provider attempt is one spend; automatic provider retry/fallback is prohibited; unknown post-send usage remains reserved and receives append-only settlement evidence. |
| PR-06 | High | D14's capability-scoped MCP admission has no implementation parcel. | **Fix** | Add a dedicated MCP admission parcel. D14/D19 semantics remain unchanged. |
| PR-07 | High | The two absent service repositories cannot supply parcel base commits or Allowed Files. | **Fix** | Add an explicit human repository-creation/protection prerequisite and separate baseline/scaffold parcels. D20 remains unchanged; repository creation is still not implicitly authorized. |
| PR-08 | High | `ExecutionEnvironmentIdentity` omits the VM/hypervisor/enforcement plane it relies upon. | **Fix** | Amend D10/D11 to bind and attest VM/base OS image, kernel, hypervisor/isolation version, enforcement-plane identity, boot/config posture, and resource policy. |
| PR-09 | High | P6 silently combines verifier implementation with the final independent proof that consumes it. | **Fix** | Add an independently reviewed verifier parcel before a verification-only E2E parcel whose Allowed Files exclude verifier source/fixtures. D19 remains the ownership decision. |
| PR-10 | High | GMF-NEG-001–010 do not yet cover inference-, MCP-, cost-, settlement-, and promotion-specific denials. | **Fix in GMF-P0 shaping** | D17 already permits additive cases. P0 must add permanent negative cases with independent observers; no locked decision or graph change is required. |
| PR-11 | Important | “One worker process” and source identity omit process-tree and filesystem edge semantics. | **Fix in GMF-P0/P1 shaping** | Define one authorized root process tree, descendant accounting/termination, and symlink/hardlink/mode/case/LFS/submodule/sparse/overlay rules without changing D5/D8's effect boundary. |

## Accepted review correction

The review suggested that PR-02 might require a fourth materialization effect and amendments
to Stage Zero assumptions. The coordinator rejects that specific remedy while accepting the
finding. Amendment A1 instead defines the authorized `fleet.worker.execute` consequence as
one isolated process-tree effect whose post-spend bootstrap includes source transfer and
materialization. Before spend, preparation cannot access source, credentials, external
network, or authoritative repository state. This preserves ratified A4–A6 and D4 while
closing the authority gap.

## Additive P0 coverage

GMF-P0 must expand the permanent negative suite beyond GMF-NEG-001–010 for:

- inference permission/request/provider/model/data-class substitution;
- provider retry/fallback duplication, disconnect/timeout, unknown usage, pricing/currency
  drift, stream overrun, and cost/concurrency races;
- direct-provider and secret-leakage bypass;
- promotion target/patch/review substitution, stale or dirty target, path/symlink/hardlink/
  submodule/binary/case-collision attacks, concurrent or partial apply, replay, and Gate-3
  confusion;
- source fetch/materialization, LFS/submodule/overlay/archive drift or traversal and manifest
  TOCTOU;
- surviving descendants, resource exhaustion, and evidence export after policy loss;
- MCP server/tool/argument/effect/call-limit/audience/expiry mismatch and transport bypass;
  and
- envelope forgery, receipt persistence failure, terminal-outcome omission/duplication,
  reservation leakage, cost-evidence forgery, trust-bundle/key rotation, and
  canonicalization mismatch.

## Coverage gaps

- The two future service repositories do not yet exist, so their implementation, CI,
  supply chain, container images, and deployable identities could not be inspected.
- No live container/VM, provider, network, secret, cost, or patch-promotion path was tested.
- The review validates plan coherence against the present local canon and implementation;
  it is not security acceptance of a future design.

## Triage and ratification result

Amendment A1 changes D5, D6, D9–D11, D13, D15–D17, D19, D21, D22, and the phase graph.
Gate 1 is reopened only for those changes and their downstream dependencies. D1–D4, D7,
D8, D12, D14, D18, D20, D23, D24, and Stage Zero assumptions A1–A7 remain ratified and
unaffected.

The owner explicitly ratified Amendment A1 and the revised graph through GMF-P9 on
2026-09-04. The amendment is incorporated into the charter. The plan review is closed;
Gate 2 and all external effects remain withheld.
