# Parallel Development Plan: Foreman Line Completion

> Historical planning baseline. Parent operational authority and the new FL-R1/R2/R3 exact candidate specs now supersede this plan's initial pre-dispatch holds and proposed file reservations for those NEW candidates only. See CHARTER, PARENT-UPDATE-20260905 and generated STATUS.md. Legacy owners/gates are unchanged; emitted Claude settings do not contain native Task workers. Do not execute an obsolete prompt instead of the current exact candidate spec.

## A. Objective

Coordinate every analysis finding to an existing owner, an exact evidence requirement and a next safe action. Deliver a durable baseline now; prepare collision-safe upstream handoffs and remediation specs without implementing or accepting new product work. Product readiness remains blocked until owner acceptance, integration, security and applicable human gates are evidenced.

## B. Assumptions

- `DISCOVERY.md` distinguishes directly read source from brief-attributed historical evidence. Remote state, installed plugin behavior, external repo defaults, owner liveness and provider availability remain unverified.
- The 15 goal classifications are fixed baseline facts from the request and evidence, not new goal dispositions. Historical IC evidence items use `deferred` to mean no active replay; their goal classification remains historically closed.
- All lanes except L0 are **prepared handoffs, not dispatched workers**. Existing owners must acknowledge exact scope, base, branch/worktree and Allowed Files before anyone implements. This worker cannot create those worktrees or change existing records.
- No new exact source contract/Allowed Files has been ratified for FL-R1/R2/R3. Paths in the lane map are proposed reservations, not write authority. Newly proposed test paths require absence/collision checks by the owner.
- Node `v24.7.0` is adequate for the local `node:sqlite` snapshot attempt, not evidence that Foreman's `>=24.11.1` packages have a supported environment. Product commands below are reviewed manifest commands, to run only in an authorized isolated worktree with approved dependencies/runtime.
- Model tiers are recommendations only. No per-model control, worker-dispatch tool, paid CLI or provider invocation is available/authorized to this worker. No independent reviewers have run for this board.

## C. Lane Map

`I` = this initiative directory; `FL` = `plugins/foreman-line/`. Every owner worktree and goal record is read-only to the initiative worker. L0 alone owns queue/database/markdown writes; other sessions return reports to the parent, which serializes board updates.

| Lane | Name / Purpose | Owned files/dirs | Parallel-safe with | Depends on | Risk | Recommended model | Rationale |
|---|---|---|---|---|---|---|---|
| L0 | Baseline and all-goal discovery | `I/**` exclusively, including generated DB | Read-only handoffs L1-L7 | None | Medium | Current native host + deterministic Node | Integrity and authority distinctions |
| L1 | W4/D4/debt/CI policy handoff | None now; existing owner retains closeout and workflows | L2-L7 | Owner acknowledgement before action | High | Advanced + human D4 | Config enforcement versus reported delivery |
| L2 | Packaging and skill optimization | None now; packaging owner retains manifests, skills, scaffold/canon | L1,L3-L7 | Owner designation; R10 follows G07 | High | Standard; advanced at canon/gate boundary | Installation truth and normative preservation |
| L3 | FK recovery/later decisions | None now; existing FK owner retains both worktrees and canon | L1,L2,L5-L7 | Existing recovery ruling; no new takeover | High | Advanced, goal-required independent reviews | R24-R29 and volatile canon controls |
| L4 | HCS/FK landing agreement | None; owner-to-owner handoff only | L1,L2,L5-L7; L3 read-only coordination | Explicit handoff OR reconciled post-merge state | High | Advanced + human ambiguity gate | Shared charter and stale authority anchors |
| L5 | WF-P0 acceptance packet | None; existing Claude owner retains candidate and goal records | L1-L4,L6,L7 | Existing P0 grant; AC13 evidence | High | Advanced, two independent reviews | Passive scope, reviewer-role distinction |
| L6 | GMF P0 gate / MF freeze | None; existing GMF owner retains outputs and immutable MF inputs | L1-L5,L7 | Exact P0 Gate 2 before dispatch | High | Advanced + human Gate 2 | Spend/authority and input custody |
| L7 | KPP/GTM owner handoffs | None; distinct existing owner records, shared commercial decisions serialized | L1-L6 | Current authority reconciliation; GTM amendment | High | Advanced + human/counsel | Commercial versus technical acceptance |
| L8 | FL-R1 terminal semantics | None now; proposed `FL/receipts/src/validator.ts`, `FL/receipts/tests/chain-invariants.test.ts` | L9,L10 after contract gate | Receipt contract amendment and exact grant | High | Advanced + independent security review | Public predicate/receipt semantics |
| L9 | FL-R2 real audit loader | None now; proposed `FL/integration/src/governing-spec.ts`, `FL/integration/tests/fl-r2-real-loader.test.ts` | L8,L10 after file claims | Exact scoped grant, parser contract | Medium/high | Standard; advanced if parser/security contract changes | Real loader, not injected descriptor tests |
| L10 | FL-R3 push short-circuit | None now; proposed `FL/integration/src/pr-plan.ts`, `FL/integration/tests/fl-r3-push-failure.test.ts` | L8,L9 after file claims | Error/result contract reviewed first | High | Standard; advanced for cross-module change | Small logic fix at external-effect boundary |
| L11 | R4 current evidence, R5/R6 integration, R7-R9 disposition | None now; evidence returned to L0, tests only after owner assigns exact files | Inventory with all read-only lanes; integration last | Final evidence consumes accepted leaf heads | High | Advanced integration; deterministic commands | Environment/normal-chain proof and honest scope |

Run-now: L0 directory-local work and preparation of read-only handoff packets. Owner communication/worker dispatch is not claimed in this session. Blocked for implementation: L1-L11 until each existing owner accepts its exact task and applicable gates; L6 additionally has no GMF Gate 2. L8-L10 become parallel-safe only after shared contract decisions and explicit file claims, in separately authorized worktrees.

## D. Detailed Lane Plans

### L0: Durable Baseline

Goal/scope: preserve 15 classifications, upstream handoffs, broad gaps, integration/security/release gates and routing limits in `I/**`. Exclude every existing file, goal index, owner worktree, setting and external operation. Steps: read brief/templates/selected authority; record source limitations; validate queue and dependencies; import twice transactionally; inspect integrity/counts and hand off. Commands: `node --check snapshot-state.mjs`, `node --test snapshot-state.test.mjs`, `node snapshot-state.mjs` twice after parent `Test-Path` checks. Artifacts: charter/discovery/plan/queue/handoff/tests/verification and generated DB. Completion: board tests and idempotent import proven, zero new remediations claimed. Route: native host plus deterministic tools; upgrade to human on conflicting ownership or differing database snapshot.

### L1: Existing W4/Closeout Owners

Goal/scope: FL-G05/G06, FL-D1/D2, no implementation here. Exclude workflows, rulesets, Jira, goal records, FK canon and all board writes. Steps: preserve six-parcel delivery and transfer; reconcile intended D4 repository; prepare required checks/approval/no-bypass packet; deduplicate named freeze/follow-up debt with FK; distinguish report-only and applied enforcement. Validation: source/claim mapping now; effective-rules API procedure only by separately authorized owner/human, not a live command here. Artifact: owner-attributed D4/debt/disposition packet. Completion: owner receives a precise decision request, not a goal-complete claim; actual closure still requires rules evidence. Route: advanced/human; stop on outward workflow or rules changes.

### L2: Packaging Owner and Optimization

Goal/scope: FL-G07 then FL-R10; charter graph P1 -> P2 -> P4 -> P3 -> P5 -> P6 -> P7. Exclude personal skill deletion, installs, settings, shared canon/manifests until exact grant, and goal/board writes. Steps: identify owner; reconcile manifest versus installed source; request fresh-session P1 proof; propose compact progressive-disclosure improvements with before/after size and normative parity; preserve scaffold refusal/idempotence tests. Validation: owner-approved fresh-session probe and scaffold tests, commands to be supplied from current shaped parcel (not invented here). Artifact: P1 evidence request and bounded optimization proposal. Completion: installed resolution proven before any authorized consolidation; no implied P2-P7 completion. Route: standard, advanced if normative rules or identity/merge gates change; human for installation/deletion decisions.

### L3: Existing FK Recovery Owner

Goal/scope: FL-G08 and FL-D3; exact candidate `0ee165720f8d1e3a91eb283cb770400b23f61bf5`. Exclude all FK worktree writes by this worker, source corpus expansion, charter/spec edits, weakening controls, Gate 3 and HCS landing changes. Steps: send recovery ruling; request owner's exact-head closure check; obtain sequential verification/generation/idempotence/counts/controls a-g; require fresh final reviews; separately ask U1-before-P18 and A1.8/A1.9 ratification questions. Validation: exact sequential plan from owner's recovery Step 0, not a guessed command sequence. Artifact: missing-evidence checklist and accepted-head owner report. Completion: only owner-reviewed complete transcript can advance P0; P1-P21 remain future. Route: advanced with existing independent-review requirements; human for ratification/Gate 3. A1/A2 proposal existence is not ratification.

### L4: HCS Boundary

Goal/scope: FL-G09 and S-OWNER; no dependency on finishing all FK parcels. Exclude FK/HCS charter writes, ownership transfer, dispatch and all board edits. Steps: reconcile September 3 stop with September 4 FK takeover; ask existing owners for explicit landing/serialization handoff OR verified post-merge ownership reconciliation; refresh digests and IDs; prepare Gate 1, then plan review and exact Gate 2. Validation: local `git rev-parse HEAD`/`git status --short` in named owner locations may be supplied by owners; source digests and comparison evidence must bind actual current files. Artifact: attributed landing agreement and refreshed anchor matrix. Completion: planning boundary unblocked, not implementation acceptance. Route: advanced; stop and human-escalate any competing writer or changed normative contract.

### L5: Existing WF-P0 Owner

Goal/scope: FL-G10 evidence reconciliation and AC13. Exclude candidate edits here, old Codex branch/worktree cleanup, provider activity and WF-P1-P18 dispatch. Steps: inventory final candidate via owner; locate F-21 lint evidence; retain later closed F-23/spec-lint findings rather than stale open prose; obtain two independent reviews and triage; request human Gate 3 only after accepted chain. Validation: owner-supplied exact WF-P0 spec checks/diff base, output and final SHA; no invented product tests for passive inventory. Artifact: AC13/evidence-location packet. Completion: P0 acceptance only if all required evidence exists; verifier roles in P1, tested rollback in P16 require new Gate 2. Route: advanced with dual reviews; stop on any provider or scope expansion.

### L6: GMF Gate Request and MF Freeze

Goal/scope: FL-G11/G12 and S-FLEET. Exclude all predecessor mutations, product code, model calls, spend, repositories/protection, installs and live negative-scenario execution. Steps: present exact five-output draft P0 Gate 2 packet; bind read-only input hashes or separately reviewed base; reconcile exit/graph and HG-R1 wording; specify 66 negatives without executing; preserve MF NO-GO and Review B limitations. Validation: passive input/output inventory, hash equality, exact Allowed Files and dual reviews only after owner obtains Gate 2. Artifact: gate request and downstream dependency ledger. Completion: request complete, not grant inferred; P0 never commits its governing inputs. Route: advanced, human at every stated effect boundary.

### L7: KPP and GTM Owners

Goal/scope: FL-G13/G14; two existing owners, not a replacement portfolio coordinator. Exclude external trackers, signatures, funds, customer data, counsel representations, public claims, settings and goal-file writes. Steps: KPP owner reconciles r3/KEO-202 disposals/current KEO-200/G2 and prior WGT-P0A merge; GTM owner requests bounded loop-maintenance amendment; preserve P0A verified-local/not-integrated; sequence P0B/P0C before W0-W8; assemble counsel/preview/founder/child-authority decisions. Validation: current owner-attributed source reconciliation and actual commercial/release evidence references, no live queries here. Artifact: separate KPP and GTM decision packets with shared decisions serialized. Completion: unblock ownership/maintenance planning without promising paid exit or integration. Route: advanced; Clinton/counsel for business and legal gates.

### L8: FL-R1 Placeholder

Goal/scope: proposed terminal-completion semantics, only two proposed receipt paths in C. Exclude integration callers, contracts/schemas, manifests and docs until owner assigns amendment ownership first. Steps: inventory shipped `isSealed` consumers/AC6; ask owner to choose exact semantic change; ratify contract; add full/half/malformed/retry regressions and mutation control; implement only after exact grant; independently review. Validation in authorized receipts worktree: `node --version`, `npm test`, `npm run typecheck`, `npm run lint`; integration consumers verified later. Artifact: amendment plus minimal diff/test proof. Completion: half-closed stage F cannot satisfy a terminal-completion claim, full closure still works, no public contract silently changed. Route: advanced; escalate human if compatibility/authority is ambiguous.

### L9: FL-R2 Placeholder

Goal/scope: proposed real disk loader plus a dedicated unclaimed test path in C. Exclude `report.ts`, `pr-plan.ts`, workflow enforcement, shared contracts/manifests and all goal records. Steps: reproduce actual block-list mismatch; agree malformed/no-spec semantics; add real-disk block/inline/multiple/negative fixtures inside owned test; implement minimal approved loader correction; prove assertions fail under loader mutation. Validation in authorized integration worktree: `node --version`, `npm test`, `npm run typecheck`, `npm run lint`. Artifact: loader/test diff and raw exact-head output. Completion: actual corpus format resolves correctly without injected-parser shortcut or change to report-only exit 0. Route: standard, advanced for contract/security ambiguity. New dependency needs a foundation-owner amendment, never a parallel lockfile edit.

### L10: FL-R3 Placeholder

Goal/scope: proposed `pr-plan.ts` and dedicated test path in C. Exclude all real git/gh effects, `errors.ts`, callers, manifests and other integration files until separately sequenced contract grant. Steps: confirm unconditional call; choose owner-approved failure result/error; inject BOTH seams; prove nonzero/throw stops PR calls and success invokes once; implement minimal guard only after authority; review consumer compatibility. Validation in authorized integration worktree: `node --version`, `npm test`, `npm run typecheck`, `npm run lint`. Artifact: hermetic call-count/order tests and minimal diff. Completion: failed push cannot produce PR-create side effect or fabricated success. Route: standard with independent review; advanced if result shape/callers change, human for any external operation.

### L11: Current Evidence and Integration

Goal/scope: FL-R4 inventory now as a prepared handoff, FL-R5/R6 after prerequisites, FL-R7/R8/R9 scope disposition. Exclude installs, network calls, default live adapters, workflow changes, compiler/W5 implementation and all owner/board edits. Steps: gather approved engine/script/CI/installed-identity evidence; inventory all 14 suites; distinguish current from historical; request approval/launch and rework/normal D-E-F contracts; obtain accepted-head cross-boundary tests; preserve alpha/NOT_IMPLEMENTED/future limitations. Validation: manifest-derived `npm test`, `npm run typecheck`, `npm run lint` only after each package is reviewed and authorized; actual CI/installed-session evidence from authorized owners. No guessed root aggregate command. Artifact: environment matrix and scenario evidence mapped to SC-* IDs. Completion: each required scenario/gate passes only in its evidenced environment or has a legitimate owner disposition; baseline DB tests do not qualify. Route: advanced integration, deterministic tools; human for release/effect decisions.

## E. Integration Sequence

1. L0 creates and validates only this baseline. Parent obtains owner acknowledgements and collision-safe scope claims; no source merge occurs here.
2. L1-L7 owner handoffs may proceed independently as read-only packets. Serialize L3/L4 shared FK charter decisions and L7 shared commercial decisions. D4 packet preparation need not wait for FREEZE-SWEEP or all future goals.
3. Existing source owners land approved contract amendments before L8-L10 implementation. Receipt AC6 and PR result/error changes may require separate foundation ownership outside proposed leaf files; absent that, stop. Shared manifests, schemas, exports, locks, workflows and canon always have one owner.
4. After exact Gate 2/Allowed Files and authorized worktree isolation, L8/L9/L10 can build in parallel on disjoint claimed paths. Each needs focused tests, full package checks, count/mutation proof and applicable independent reviews before acceptance. L9/L10 share an integration package but not files; dependency/config changes force serialization.
5. L11 accepts final current-runtime/CI evidence at accepted leaf heads, then normal-chain and installed-host scenarios. FL-R5 depends on R4; FL-R6 depends on R1/R3/R4. Source implementation may not have a ready path until separate owner contracts exist.
6. Existing owners, not this worker, present actual Gate 3/D4/release decisions. Any future merge/apply order is contract foundations, independent leaves, integration last, each behind its explicit human gate. No command in this plan authorizes a merge.

## F. Validation Strategy

- Board: strict queue shape, all 15 exact goal directories/classifications, unique IDs, foreign references, acyclic hard dependencies, required evidence/blocker/next action, and no completed new remediation. In-memory SQLite tests exercise rollback, idempotence, changed-snapshot refusal and row tamper detection. File-backed import twice verifies integrity, foreign keys and exact row counts/content.
- Product focused checks: receipts/integration manifest commands listed above; owners supply approved commands for other tracks. Full suite means all 14 actual package suites, not root marketplace CI. No package tests run in existing worktrees by this worker.
- Build/typecheck/lint: engine requirement first; inspect package scripts and dependencies; record complete output and exit code, without install/network fallback. Generation must be authorized and leave owner worktree clean where required, especially FK.
- Integration: seven surfaces, fourteen positive/negative SC-* scenarios in queue. Every eventual run records environment, build/commit set, configuration, date/time, command/procedure, result and evidence. No fixture substitutes for required actual installed/CI/commercial evidence.
- Human review: ownership ambiguity, all exact gates, security/contract amendments, D4, installation, external effects and commercial/counsel facts. Security reviewers are required, not assigned by fiction. Failed, blocked, skipped, unknown and not-applicable remain distinct.

## G. Risk Register

| Risk / collision | Likelihood | Impact | Mitigation | Safe recovery |
|---|---|---|---|---|
| Active goal writers / INDEX | High | High | Directory-only L0, owner handoffs not claims | Stop conflicting lane; preserve their edits |
| FK canon / HCS amendment / freeze sweep | High | High | Single current FK owner, explicit landing sequence and fresh anchors | Withdraw proposed change; no reset or rule deletion |
| Receipt public contract / integration consumers | High | High | Amendment first, caller inventory, independent review | Keep candidate unaccepted; owner-approved corrective parcel |
| L9/L10 shared integration errors/exports/lock | Medium | High | Only disjoint proposed files; foundation owner for cross-file changes | Serialize affected work, retain other validated lane |
| Marketplace CI mistaken for 14 package tests | High | High | Current job command/output inventory at exact SHA | Hold release; do not rewrite historical closure |
| Native host/model/permission capability overclaimed | High | High | Advisory routes, actual-session evidence, no external probe | Report unavailable/unverified; no silent fallback |
| MF historical failure treated as current trial license | Medium | Critical | Freeze read-only evidence and separate GMF grants | Reject resurrection, no cleanup of predecessor |
| KPP/GTM old prose supersedes current authority | High | High | r3/current evidence and maintenance amendment; separate business gates | Preserve history, request owner-attributed reconciliation |
| Mutable snapshot overwrites newer operational truth | Medium | High | Immutable hash-bound import and complete table-content comparison | Reject mismatch, preserve DB; later update design reviewed separately |

No rollback strategy here includes deleting owner work, resetting branches, changing settings, reversing signatures/payments or dropping a differing database.

## H. Execution Prompt Pack

These are prepared prompts for the parent or existing owners, **not dispatch receipts**. Existing-owner prompts request bounded reports only; they grant no authority over that owner's source files. Every report must state branch/worktree, starting/ending SHA, files changed, summary, commands and raw test output/exit codes, known issues, scope deviations, boundary compliance (yes/no with details), decisions needed, blocker and next safe action. No report may say a remediation is complete without the queue evidence.

### L0

```text
Act only as the directory-local board custodian for D:/Repos/agent-skills/docs/INITIATIVES/foreman-line-completion-20260905/. Read CHARTER, DISCOVERY and queue. Own only that directory; exclude all existing goal files, INDEX, owner worktrees, settings and external effects. Native host plus deterministic Node, no per-model control. Validate all 15 classifications and the dependency/evidence board; run node --test snapshot-state.test.mjs, then node snapshot-state.mjs twice after parent Test-Path checks. Never reset a differing database. Report branch/worktree and start/end SHA, changed files, summary, exact commands/output/exit codes, known issues, deviations, boundary compliance, decisions, blocker and next safe action. No product completion claim.
```

### L1

```text
Prepare a read-only handoff to existing W4/closeout owners for FL-G05/G06 and FL-D1/D2 in the initiative queue. Own no source or board files. Preserve six-parcel history, transferred debt and three-parcel closeout; reconcile target identity before the D4 checklist (test, integration-report, approval >=1, no bypass across applicable rules). Deduplicate follow-ups/freeze sweep with FK and distinguish report-only/applied:false from enforcement. No rules API call, settings/workflow edit, Jira, push or merge under this prompt. Advisory advanced route, Clinton owns D4. Validate against cited local records; request owner evidence, never fabricate live checks. Report branch/worktree/start/end SHA, files changed (normally none), summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L2

```text
Prepare packaging-owner handoff for FL-G07 then FL-R10 from the initiative queue. Own no files; do not claim the unassigned coordinator role. Request owner designation and fresh-session human P1 install/discovery proof; preserve P1->P2->P4->P3->P5->P6->P7. Propose measured compact skill/progressive-disclosure improvements only after installed-source identity; retain all normative gates. No personal-copy deletion, install, settings, manifest/canon/goal/board edits or external call. Advisory standard route, advanced for contracts; human installation boundary. Validation is cited records and requested owner-approved fresh-session/scaffold evidence, not invented commands. Report branch/worktree/start/end SHA, files, summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L3

```text
Prepare a read-only FL-G08/FL-D3 handoff to the current FK Codex owner (2026-09-04). Own no files and never run generation in its worktree. Read the cited Round 6 recovery ruling for candidate 0ee165720f8d1e3a91eb283cb770400b23f61bf5; request exact sequential verification, clean/idempotent generation, test-count tripwire, R24-R29 controls a-g and fresh reviews. Static alignment is not green. Ask separately about U1 before P18 and A1.8/A1.9 ratification; no source expansion, norm weakening, charter edit, Gate 3 or external action. Advisory advanced route with goal-required reviews. Report branch/worktree/start/end SHA, files, summary, exact evidence/commands/output/exit codes or missing, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L4

```text
Prepare read-only FL-G09 handoff to existing HCS Codex /root and current FK owner. Own no files; do not claim either goal or edit charter/INDEX. Reconcile old September 3 FK anchor against September 4 takeover. Seek explicit parcel-boundary landing/serialization handoff OR verified post-merge ownership reconciliation; then fresh digests/decision IDs, Gate 1/plan review and exact Gate 2. Do not make all FK completion an invented prerequisite. No worktree creation, implementation, merge or external effects. Advisory advanced route; Clinton resolves ambiguity. Validate cited owner records and source hashes, not old prose alone. Report branch/worktree/start/end SHA, files, summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L5

```text
Prepare read-only FL-G10 packet to existing Claude WF coordinator. Own no files; preserve prior Codex branch/worktree and dirty candidate edits. Request final candidate inventory and AC13 dual independent reviews, locate F-21 lint evidence, preserve later F-23/spec-lint closures rather than stale open prose. Gate 2 is only P0; P1 verifier semantics and P16 rollback remain later parcels with new grants. No provider calls, spend, candidate repairs, goal/board edits, push or merge. Advisory advanced route; human Gate 3. Validate only owner-approved exact-spec evidence; identify missing output explicitly. Report branch/worktree/start/end SHA, files, summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L6

```text
Prepare read-only FL-G11/G12 packet to existing GMF Remote-safe Codex /root owner. Own no files. Exact P0 Gate 2 is absent: request five new documentation/evidence outputs and specification of 66 negative scenarios, not execution or code. Require hash-identical governing inputs or separately reviewed base; P0 cannot commit governing inputs. Reconcile revised P9 exit/graph and post-P2C HG-R1 wording. Preserve MF-P0 NO-GO and Review B caveats; never rewrite predecessor or rerun canaries. No provider/spend/repo/protection/installation/external effects. Advisory advanced plus human gates; dual reviews only via owner after Gate 2. Report branch/worktree/start/end SHA, files, summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L7

```text
Prepare separate read-only FL-G13 KPP and FL-G14 GTM handoffs to their existing owners. Own no files. KPP r3 manual letter->signature->cleared funds->approved intake->delivery/economics controls; reconcile KEO-202 disposals, later KEO-200/current G2, KEO-203 counsel, preview owner and superseded WGT-P0A HOLD. GTM needs bounded owner-ratified loop-maintenance amendment; P0A is verified-local NOT integrated, P0B/P0C before W0-W8. Shared decisions serialize through owners. No tracker/outreach/signature/payment/customer data/publication/settings/goal/board edits or external calls. Advisory advanced; Clinton/counsel gates. Validate current attributed records, no live-state invention. Report branch/worktree/start/end SHA, files, summary, commands/raw output/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L8

```text
Shape FL-R1 terminal-completion contract for receipt owner, do not implement yet. Own no files until exact owner-approved Gate 2/base/worktree and contract amendment. Proposed reservation only: plugins/foreman-line/receipts/src/validator.ts and receipts/tests/chain-invariants.test.ts. Exclude contracts/schemas/callers/manifests/goal/board files; ask foundation owner for any cross-file change. Historical AC6 says stage-F tip: do not silently redefine shipped API. Require full closure true, HalfClosedClosure stage F false for terminal-completion claim, malformed/missing/retry controls and mutation tests. After grant only, authorized isolated receipts worktree runs node --version, npm test, npm run typecheck, npm run lint; no external effects. Advisory advanced, independent security review. Report branch/worktree/start/end SHA, files, summary, raw tests/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action. No completion without accepted evidence.
```

### L9

```text
Shape FL-R2 real audit loader fix with integration owner; no implementation until exact Allowed Files/base/worktree and Gate 2. Own no files now. Proposed reservation: plugins/foreman-line/integration/src/governing-spec.ts and integration/tests/fl-r2-real-loader.test.ts; owner must verify test path is unclaimed. Exclude report.ts, pr-plan.ts, workflows, manifests/locks, contracts, goal and board records. Reproduce actual block-list loading through disk, not injected descriptors; cover inline/block/no-spec/malformed/multi-spec and mutation control. Preserve report-only zero exit. After grant only, isolated integration worktree runs node --version, npm test, npm run typecheck, npm run lint. No install/network/default live seam. Advisory standard, escalate contract/security ambiguity to advanced/owner. Report branch/worktree/start/end SHA, files, summary, raw tests/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L10

```text
Shape FL-R3 push-failure short-circuit with integration owner; no implementation until exact grant and failure-result/caller contract review. Own no files now. Proposed reservation: plugins/foreman-line/integration/src/pr-plan.ts and integration/tests/fl-r3-push-failure.test.ts; verify test path unclaimed. Exclude errors.ts/callers/manifests/other integration/goal/board files; cross-file amendment goes to foundation owner first. Nonzero or thrown push must yield zero PR-create calls; success exactly one ordered call; no fabricated success. Inject BOTH seams and never run real git push or gh. After grant only, isolated integration worktree runs node --version, npm test, npm run typecheck, npm run lint. Advisory standard, advanced for contracts and independent review for effect boundary. Report branch/worktree/start/end SHA, files, summary, raw tests/exit codes, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```

### L11

```text
Prepare FL-R4 current CI/installed runtime evidence packet and FL-R5/R6 integration contracts; keep FL-R7/R8/R9 explicitly alpha/deferred/future. Own no source or board files. Inventory supported engine/script/dependency requirements for all 14 packages and request owner-provided final-SHA CI plus fresh installed-session identity. Local Node 24.7.0 is not >=24.11.1 proof. No installs, provider calls, default live adapters, workflow changes, compiler/W5 implementation, merge or external effects. R4 inventory is independent; final proof binds accepted R1/R2/R3 and packaging heads. R5 approval/native launch follows R4; R6 failed-to-passing normal D/E/F follows R1/R3/R4. Use owner-approved manifest commands only in later exact authorized worktrees; no guessed aggregate command. Advisory advanced plus deterministic checks and human effects. Report branch/worktree/start/end SHA, files, summary, raw tests/exit codes or missing evidence, issues, deviations, boundary compliance, decisions, blocker and next safe action.
```
