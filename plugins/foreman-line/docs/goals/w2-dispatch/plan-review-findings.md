# Plan Adversarial Review Findings — w2-dispatch

**Reviewer:** Independent frontier session (zero coordinator context)
**Review date:** 2026-07-23
**Charter reviewed:** `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` (post-Gate-1 ratification)
**Overall verdict:** 2 BLOCKERs, 3 SHOULD-FIXes, 2 INFOs

---

## Triage (coordinator rulings, 2026-07-23)

All BLOCKERs and SHOULD-FIXes ruled on below. None require a loop-stop: no frozen contract modification involved in any fix. Charter amended accordingly (see amendment notes per finding).

---

## PAR-1 — BLOCKER → RULED: SUSTAINED, D5 AMENDED

**Location:** Decision D5; parcels W2-P4 and W2-P2

**Claim:** D5 states that Kompress compressed artifact ID and retrieval metadata go "into the `DispatchOrder` as opaque references," but the frozen `c-dispatch.ts` `DispatchOrder` interface has no field for this data and its schema enforces `additionalProperties: false`.

**Evidence:**
- Charter D5: "compressed artifact ID and retrieval metadata go into the `DispatchOrder` as opaque references"
- Frozen `c-dispatch.ts`: five fields only (`parcelRef`, `stepZeroRestatement`, `routingDecisionRef`, `injectedSkills`, `permissionProfile?`); `additionalProperties: false`
- Worked trace: W2-P4 returns `hd-abc123` (Kompress artifact ID). W2-P2 builds a `DispatchOrder` — no field to put it in. Either (a) it omits the ref, defeating W2-P4's purpose, or (b) schema validation fails. Both paths fail.
- Charter stop conditions: "`DispatchOrder` schema incompatibility with the frozen `c-dispatch.ts` contract (loop-stop, not a ruling)" — D5 as written creates its own stop condition.

**Root cause:** D5 conflated two separate artifacts. The Kompress reference belongs in the Stage-C dispatch receipt (`ReceiptDocument.subject: JsonValue` — an open field), not the `DispatchOrder`. The builder kickstarter, assembled by the coordinator from the receipt chain, carries the `headroom_retrieve` call.

**Ruling:** SUSTAINED. D5 amended: Kompress artifact ID and retrieval metadata are recorded in the Stage-C dispatch receipt's `subject` field. W2-P4 returns the compressed artifact ID + retrieval metadata to W2-P2, which records it in the receipt document. The `DispatchOrder` itself carries no Kompress reference. The builder kickstarter (coordinator-assembled after W2-P2 runs) cites the receipt for `headroom_retrieve`. No contract modification required.

**Charter amendment:** D5 text replaced. See charter.

---

## PAR-2 — BLOCKER → RULED: SUSTAINED, PARCEL TABLE AMENDED

**Location:** Charter parcel table "Routing class" column; W2-P3 implementation; SCAF-P2 exit proof

**Claim:** Charter parcel table uses "standard" as the routing class label for W2-P1, W2-P3, W2-P5, and SCAF-P2, but the frozen `routing-policy.yaml` has no class named `standard`. SCAF-P2's spec frontmatter uses `routing_class: standard-feature`.

**Evidence:**
- Charter table: W2-P1/W2-P3/W2-P5/SCAF-P2 routing class: "standard — mid-tier builder, single review"
- Frozen routing-policy.yaml classes: `boilerplate`, `standard-feature`, `architecture/risk`, `implementation/standard`
- SCAF-P2 spec: `routing_class: standard-feature`
- Worked trace: W2-P3 builder builds a class map for "standard" → lookup fails for `standard-feature` → routing eval fails → W2-P2 cannot assemble `DispatchOrder.routingDecisionRef` → exit criterion blocked.

**Ruling:** SUSTAINED. Pure labeling error in the charter table — the routing class names must be exact `routing_class` values from SPEC-CONVENTION v0.2 and routing-policy.yaml. All "standard" labels changed to "standard-feature" in the parcel table. Architecture/risk labels are already correct.

**Charter amendment:** Parcel table routing class column corrected. See charter.

---

## PAR-3 — SHOULD-FIX → RULED: SUSTAINED, W2-P2 SCOPE AMENDED

**Location:** W2-P2 parcel scope; charter canon (permission-profile emitter)

**Claim:** W2-P2's one-liner is silent on (a) reading `permission_profile` from the parcel spec and populating `DispatchOrder.permissionProfile`, and (b) invoking the permission-profile emitter to create the builder worktree per lesson #18.

**Evidence:**
- W2-P2 one-liner: no mention of `permission_profile` extraction or emitter invocation
- Frozen `c-dispatch.ts`: `permissionProfile?` field is optional at schema level — a builder won't get a schema error for omitting it
- Charter canon: "Permission-profile registry + emitter (shipped) — dispatch uses the emitter to create builder worktrees per lesson #18"
- Lesson #18: "when a shipped tool owns a mutation sequence, dispatch through the tool from the start"
- SCAF-P2 spec: `permission_profile: builder-standard`

**Ruling:** SUSTAINED. Real gap — no other W2 parcel can own this. W2-P2's scope amended to include: (i) reads `permission_profile` from parcel spec frontmatter and populates `DispatchOrder.permissionProfile`; (ii) on one-tap approval, invokes the permission-profile emitter with the resolved profile to create the builder worktree before the `DispatchOrder` is emitted.

**Charter amendment:** W2-P2 parcel table entry updated. See charter.

---

## PAR-4 — SHOULD-FIX → RULED: SUSTAINED, W2-P1 SCOPE AMENDED

**Location:** Decision D6; W2-P1 first-in-order

**Claim:** No parcel is assigned responsibility for creating the `plugins/foreman-line/dispatch/` package scaffold. The package does not exist on disk. W2-P1's one-liner covers query logic only.

**Evidence:**
- D6: "single `plugins/foreman-line/dispatch/` package containing modules for each sub-concern"
- Disk: no `plugins/foreman-line/dispatch/` path exists
- W2-P1 one-liner: query + ranking only; no scaffold mention
- Lesson #9: "Tell the builder where to stand, not just what to build" — the package-level parallel of the worktree-level lesson

**Ruling:** SUSTAINED. W2-P1 is the first parcel and the natural owner of package initialization. W2-P1's scope amended to include: creates `plugins/foreman-line/dispatch/` package structure consistent with W1 package pattern (`package.json`, `tsconfig.json`, `src/index.ts`, `src/query/` sub-module). Subsequent parcels add their sub-modules to an already-initialized package.

**Charter amendment:** W2-P1 parcel table entry updated. See charter.

---

## PAR-5 — SHOULD-FIX → RULED: SUSTAINED, W2-P1 AND W2-P2 SCOPES AMENDED

**Location:** W2-P1 scope; W2-P2 scope; exit criterion receipt chain

**Claim:** No parcel is assigned responsibility for locating Stage-B's receipt hash so W2-P2 can correctly populate `ReceiptDocument.prevHash` in the Stage-C receipt — required for the exit criterion's walkable chain.

**Evidence:**
- Exit criterion: "receipt chain must be walkable: genesis → Stage-A (W1) → Stage-B (W1) → Stage-C (W2)"
- Frozen `receipts/src/types.ts`: `prevHash: string | null` (null only at sequence 0)
- SCAF-P2 spec: no `workflowId` field — the spec frontmatter cannot supply it
- W1-P4: stored bidirectional Jira links + receipt chain at `docs/receipts/<workflowId>/`; the `workflowId` propagates via `CorrelationContext` unmutated through all stage envelopes
- W2-P1 one-liner: no mention of `workflowId` or prior-stage receipt locator in the candidate record

**Ruling:** SUSTAINED. W2-P1 is amended: for each ranked candidate, the candidate record includes the `workflowId` (sourced from the Jira ticket's receipt locator stored by W1-P4) and the locator path of the most-recent prior-stage receipt file. W2-P2 is amended: before emitting Stage-C receipt, reads Stage-B receipt hash from the prior-stage receipt locator in the selected candidate record and uses it as `prevHash` in the Stage-C `ReceiptDocument`.

**Charter amendment:** W2-P1 and W2-P2 parcel table entries updated. See charter.

---

## PAR-6 — INFO

**Location:** D4, D8, stop conditions; W2-P4

**Claim:** The headroom MCP live probe is implied by the stop condition but lessons #20/#21 argument-type coverage (string, number, object for all `headroom_compress` arguments) and a ratified contingency ladder are not explicitly required as W2-P4 spec ACs.

**Coordinator note:** Acknowledged. The canon references lessons #20/#21 explicitly. W2-P4's shaping kickstarter will include explicit mandatory ACs: (a) probe all argument types `headroom_compress` will receive before building the adapter, (b) record any discovered type ceilings as a ratified contingency ladder in the spec, (c) probe fixture-isolated from production data. No charter amendment needed — enforced at shaping time.

---

## PAR-7 — INFO

**Location:** D3; SCAF-P2 adversarial review item 6

**Claim:** D3 authorization exists and is in the charter, but won't automatically appear in SCAF-P2's kickstarter where adversarial review item 6 will look for it.

**Coordinator note:** Acknowledged. When the SCAF-P2 dispatch kickstarter is generated by W2-P2, it will include an explicit line citing `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` D3 (Gate 1 ratification 2026-07-23) as the dispatch precondition authorization. No charter amendment needed — enforced at W2-P2 kickstarter generation.

---

## Findings summary

| ID | Severity | Ruling | Charter amended |
|---|---|---|---|
| PAR-1 | BLOCKER | SUSTAINED — D5 amended, Kompress ref → receipt subject | Yes |
| PAR-2 | BLOCKER | SUSTAINED — parcel table routing class labels corrected | Yes |
| PAR-3 | SHOULD-FIX | SUSTAINED — W2-P2 scope amended (permission_profile + emitter) | Yes |
| PAR-4 | SHOULD-FIX | SUSTAINED — W2-P1 scope amended (dispatch/ package scaffold) | Yes |
| PAR-5 | SHOULD-FIX | SUSTAINED — W2-P1 and W2-P2 scopes amended (receipt chain linking) | Yes |
| PAR-6 | INFO | Acknowledged — enforced at W2-P4 shaping kickstarter | No |
| PAR-7 | INFO | Acknowledged — enforced at SCAF-P2 dispatch kickstarter | No |
