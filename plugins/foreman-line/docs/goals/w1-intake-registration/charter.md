# Goal Charter — w1-intake-registration

**Goal slug:** `w1-intake-registration`
**Coordinator:** this session (see loop-directive.md ownership block once generated)
**Created:** 2026-07-22 (Stage Zero interrogation with Clint, decisions D1–D7 below)
**Status:** RATIFIED (Gate 1, Clint, 2026-07-22)

## Objective

Ship Wave 1 of the Foreman Line (FOREMAN-LINE-PLAN.md §8, "W1 — Intake & Registration"): the pipeline's Stage A/B capability — idea → interactive shaping → parcel spec drafts → Epic/Story projection → human approval (CLI) → Jira registration with bidirectional SHA-permalink linking — built parcel by parcel under PDD against the frozen W0 contracts.

## Exit criterion

One **real** idea — the shared-scaffold extraction candidate (met trigger recorded in the coordinator carryover) — shaped, approved, and registered end-to-end: linted parcel spec(s) in `plugins/foreman-line/docs/specs/`, approved via the W1-P3 CLI flow, **Epic/Story tree** (two-level, matching the frozen `ShapingResult` contract — F1 amendment; Task tier deferred to a future contract-revision goal) created in the **sandbox** Jira project via the W1-P4 MCP path, bidirectional links enforced per SPEC-CONVENTION §5, with the receipt chain minted per D8 (genesis + Stage-A receipt at approval, Stage-B receipt at registration — F8 amendment). (The proof requires shaping + registration of that idea, not building it — the extraction itself remains a separately-ratified future goal.)

## Locked decisions

| # | Decision | Reasoning |
|---|---|---|
| D1 | W1 scope = the master plan's four parcels, strict dependency order W1-P1 → W1-P2 → W1-P3 → W1-P4 | Each parcel feeds the next (specs → projection → approval → registration); the wave exit criterion needs all four. Ratified over "defer Jira" and "re-decompose" alternatives. |
| D2 | Exit-criterion proof idea = shared-scaffold extraction | A genuinely real backlog item with a met trigger (fifth scaffold copy exists, pattern stable); well-understood, low-risk as a proof subject. Proof = shaped + approved + registered, NOT built. |
| D3 *(amended by Clint at Gate 1 authority, 2026-07-22, during W1-P4 shaping)* | No separate sandbox project exists; the registration proof targets the **real KONE project** under **mechanical test-isolation conventions**: the F4 allowlist pins exactly `KONE`; every issue the proof creates MUST carry the label `mcp-test` AND a `[TEST]` summary prefix (both mechanically enforced by the package during the goal, not left to convention); cleanup after the proof via JQL `project = KONE AND labels = "mcp-test"`. Clint supplied the create schema: Epic issuetype id 11, Story issuetype id 7, Story→Epic linking via the `parent` field, required `customfield_14522` (Work Type, no default — use id 12817 "Sustaining/Tech Debt" for the proof), priority defaults to P2. | Clint's ruling: sole-user cleanup risk is nil under the label/prefix conventions; a dedicated sandbox is unavailable. The mechanical gate + negative control (F4) remain in full force; the label/prefix become additional mechanical assertions of the same gate. |
| D4 *(amended per plan-review F3, ratified by Clint 2026-07-22)* | Jira transport = the **Atlassian remote MCP server** already registered in the docker MCP `ai_coding` profile (`atlassian-remote`, verified via `docker mcp profile server ls`), reached through the docker MCP gateway; default-deny write authorization gate and sandbox project pinning (F4) remain locked. Recorded deviations: (a) auth is Clint's OAuth identity, a stand-in for — not an instance of — a scoped service principal per ADR workload identity (accepted, per plan-review F10); (b) the gateway connection was failing in the coordinator session at charter time — P4 shaping must verify live connectivity before dispatch. | Clint's direction at Gate 1 re-open: the server exists and is already authenticated; no local server build needed. Stop condition: if the gateway/write path can't be exercised at P4 shaping time, the loop stops rather than weakening the gate. |
| D5 | Standing authorizations: Gate 2 — standing dispatch authorization scoped to W1-P1..P4, effective once each parcel's spec passes coordinator lint; Gate 3 — standing "merge it" contingent on a fully green verification chain, any red step voids it | Same proven shape as the permission-profile-registry goal. Gate 1 (this ratification) is never delegable. |
| D6 | Risk/routing classes: W1-P1 **architecture/risk** (frontier builder, dual adversarial review — it defines the shaping contract everything downstream consumes); W1-P2 standard (Sonnet-class builder, single review); W1-P3 standard; W1-P4 **architecture/risk** (frontier, dual review — external Jira write path) | Frontier + dual review on the two load-bearing parcels; mid-tier on the mechanical middle. Lesson #12: dual review earns its cost on architecture/risk parcels. |
| D7 | Branch-protection precondition is met: the active `tools protector` repository ruleset on the default branch enforces `pull_request` (verified via `gh api` 2026-07-22) | Closes the carryover's standing open item #1; D2-of-the-plan's merge gate is now architectural, not procedural. |

## Wave/parcel decomposition (dependency order)

| Parcel | One-liner | Risk | Routing class |
|---|---|---|---|
| W1-P1 | Shaping Agent: idea → interactive shaping → parcel spec drafts (v0.2 schema, `risk:`/`surfaces:`/`routing_class:`). Emits a schema-valid `ShapingResult` (frozen `contracts/src/stages/a-intake.ts`) with provisional/empty `epics` that P2 fills (F6) | elevated | architecture/risk — frontier builder, dual review |
| W1-P2 | Epic/Story projection generator: parcel spec set → two-level Epic/Story tree *proposal* filling `ShapingResult.epics` (projection only, no registration) | standard | standard — mid-tier builder, single review |
| W1-P3 | Human approval flow (CLI) for parcel set + tree; approval binds to an RFC 8785 canonical hash of the approved `ShapingResult`/spec-set (W0-P4 receipts machinery — F7); emits genesis + Stage-A receipt on approval (F8) | standard | standard — mid-tier builder, single review |
| W1-P4 | Jira MCP integration via the Atlassian remote MCP server (D4): tree creation pinned to the sandbox project by a **mechanical project-key allowlist asserted before any create call, with a negative-control probe** (F4); refuses to register if the current artifact hash differs from the P3-approved hash (F7); owns the **registration write-back protocol** — create → back-fill `ticket:` frontmatter → commit → push → write the `commit->ticket` permalink bound to the pushed post-key SHA (F5); emits Stage-B receipt (F8); default-deny write authorization gate; **built on `plugins/audit-suite/skills/jira-integration`** (write-direction — F2 amendment; §5 SHA-permalink linking is net-new on top). A one-line correction to FOREMAN-LINE-PLAN.md §8 (jira-workflow → jira-integration) rides in the first W1 PR | critical | architecture/risk — frontier builder, dual review |

## Canon this goal builds against

- Frozen W0 contracts (`plugins/foreman-line/contracts/` and the W0-P2..P5 schema/validator packages) — modification of a frozen contract is a loop-stop, not a ruling.
- `docs/SPEC-CONVENTION.md` (spec schema v0.2), `docs/transcripts/defects_lessons.md` (lessons #1–#17), `plugins/foreman-line/docs/kickstarters/` (directive shapes).
- Shipped routing policy + permission-profile registry/emitter (dispatch envelopes per COORDINATOR-PATTERN dispatch table).
- The shared `plugins/foreman-line/schema-scaffold/` extraction (SCAF-P1, merged f04f3e8): **W1 packages MUST consume the shared scaffold, not copy it** (plan-review F9).
- Inter-parcel contract types by name: `ShapingResult` (`contracts/src/stages/a-intake.ts`) is P1/P2's shared output; `RegistrationResult`/`RegistrationLink` (`contracts/src/stages/b-registration.ts`) is P4's output (F6).
- Master plan non-negotiable: specs are the source of truth; Jira artifacts are projections (plan D1).

## Stop conditions

Universal set (COORDINATOR-PATTERN): a frozen contract needs modification; a tripwire fires twice on one parcel; a security finding can't close in-parcel; anything outward-facing beyond the standing authorizations; queue empty. Goal-specific additions: any Jira write outside the sandbox project; D4's constraints unsatisfiable at P4 shaping time.

## Ratification record

- Gate 1: **RATIFIED** by Clint, 2026-07-22, decisions D1–D7 as presented, no amendments.
- Plan-level adversarial review 2026-07-22 (see plan-review-findings.md): Gate 1 re-opened for the exit criterion (F1), W1-P4 scope (F2), and D4 (F3) only. Clint ruled: exit criterion aligned to the frozen Epic/Story two-level tree; P4 repointed to `jira-integration`; D4 amended to the Atlassian remote MCP server in the docker MCP `ai_coding` profile. **Re-ratified 2026-07-22.** F4–F9 fixed as charter/spec-scope amendments (no locked decision touched); F10 accepted-as-documented.
