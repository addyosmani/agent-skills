# Coordinator Carryover — Foreman Line (as of 2026-07-23, post-W1 — handoff to the next goal coordinator)

**W1 (Intake & Registration) is COMPLETE.** The w1-intake-registration goal shipped all four parcels and proved the exit criterion end-to-end on a real idea. Its loop directive is closed (`plugins/foreman-line/docs/goals/w1-intake-registration/loop-directive.md` — GOAL COMPLETE state line); the ownership block no longer authorizes anyone. The incoming coordinator enters via `/goal <new-slug>` and runs the chartered machinery: Stage Zero ideation with Clint → Goal Charter → adversarial plan review → loop directive with an ownership block naming YOUR session. One goal, one coordinator; transfers only at parcel boundaries. If the ownership block of any live goal names another coordinator, STOP and report.

You consume verification results; you never produce them (D4). You route rework, ratify spec amendments, run deterministic passes, and triage adversarial reviews. Clint's human gates: charter ratification, dispatch approval, and any approval a spec designates human-only (the W1-P3 CLI approval is one — it cannot be run headless).

## Canon — read before acting
- plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md — the master plan (stages A-F, locked decisions, waves W0-W5). §8's W1 row now points at `audit-suite/jira-integration` (F2 correction shipped in W1).
- plugins/foreman-line/docs/COORDINATOR-PATTERN.md + plugins/foreman-line/skills/goal/SKILL.md — the chartered coordinator machinery.
- docs/SPEC-CONVENTION.md — spec schema v0.2 incl. §2 monorepo rule and §5 bidirectional SHA-permalink linking (now LIVE and enforceable — W1-P4 writes real tickets).
- docs/transcripts/defects_lessons.md — lessons #1–#21, all earned on real defects. #18–#21 are W1's: the emitter owns worktree creation; CI scanners (CodeQL) are a fourth verification net — write linear-time string ops up front; probe full argument TYPES not just names, and ratify contingency ladders at shaping time; live-probe iteration is its own loop stage, fixture-isolated.
- plugins/foreman-line/docs/kickstarters/ — every directive ever issued; reuse their shape. plugins/foreman-line/docs/goals/w1-intake-registration/ — the full W1 paper trail (charter with D1–D7 as amended, plan-review findings, per-parcel adversarial findings).

## State at handoff (2026-07-23, main at 972ce43)

| Work | Status |
|---|---|
| **W0 (7 parcels), permission-profile-registry goal, DOCS-P1, SCAF-P1** | Complete (see prior carryover in git history for detail). |
| **W1-P1 Shaping Agent** | Shipped PR #35 (39 tests). `plugins/foreman-line/shaping/` + `plugins/foreman-line/skills/foreman-shaping/`. Emits schema-valid `ShapingResult` with provisional/empty `epics`. |
| **W1-P2 Projection generator** | Shipped PR #37 (59 tests). `plugins/foreman-line/projection/`. Fills `epics`, two-level Epic/Story only (Task tier deferred — frozen-contract ruling F1). |
| **W1-P3 Approval CLI** | Shipped PR #39 (66 tests). `plugins/foreman-line/approval/`. RFC 8785 composite approvedHash (payload + per-ref spec content hashes, closes the F7 TOCTOU); genesis + Stage-A receipt. Human-interactive by design. |
| **W1-P4 Jira registration** | Shipped PR #41 (71 tests). `plugins/foreman-line/registration/`. Atlassian remote MCP via `@modelcontextprotocol/sdk` stdio client over `docker mcp gateway run --servers atlassian-remote` (key=value transports are STRINGS ONLY — the SDK path is the ratified contingency, lesson #20/#21). Mechanical KONE allowlist + `mcp-test` label + `[TEST]` prefix enforcement, hash-match refusal, create→backfill→commit→push→permalink write-back, Stage-B receipt, receipt-before-link ordering (dual-review blocker fix). |
| **W1 exit criterion** | **MET 2026-07-23** (PR #43): real idea (scaffold test-harness consolidation) shaped → SCAF-P2 spec → approved (workflowId bfdba601-8d48-449e-9530-2317ed931d6d) → registered live: Epic KONE-23194 + Story KONE-23195, §5 links bound to SHA 86d374a, walkable receipt chain at `docs/receipts/bfdba601…/`. |
| **Jira create schema (KONE)** | Locked in charter D3: Epic issuetype 11, Story 7, `parent` linking, required customfield_14522 (Work Type; 12817 = Sustaining/Tech Debt), priority defaults P2, labels string[]. No sandbox project exists — isolation is mechanical (label+prefix). |
| **Branch protection** | `tools protector` ruleset live: PRs required on main, CodeQL required. Verify via the effective-rules API (lesson #15). |

## Debts and loose ends (verify each on disk/API before acting)
1. **`plugins` workflow `test` job fails on EVERY run including main** — root package.json has no `test` script. Pre-existing, not merge-blocking, flagged to Clint at W1 close; needs a workflow fix or its own parcel.
2. **mcp-test cleanup** — JQL `project = KONE AND labels = "mcp-test"` covers probe artifacts KONE-23161..23164 and Clint's KONE-23157. The real proof tree KONE-23194/23195 also carries the label by D3 mandate; Clint decides whether it stays.
3. **SCAF-P2 is registered, NOT dispatched** — spec at `plugins/foreman-line/docs/specs/active/SCAF-P2-shared-test-scaffold-extraction.md` (ticket KONE-23195). It touches shipped schema-scaffold, so building it needs its own ratified charter.
4. **spec-linter corpus reconciliation** — `validate <done-dir>` still exits 1 on pre-registry `permission_profile` values (grandfather rule needed). Held constant by name through all of W1.
5. **schema-scaffold `generate()` input guard** (SCAF-P1 INFO-2) — rides the next parcel touching schema-scaffold (SCAF-P2 is the natural carrier).
6. **contracts testing.ts fixture staleness** (DOCS-P1 INFO-1) — cosmetic, future contracts-maintenance parcel.
7. **Dependabot alert #4** (root postcss, moderate) — unverified since 2026-07-16; check the API.
8. **Orphaned worktree folders** — check `git worktree list` and C:\Repos for locked leftovers before assuming clean.

## The proven loop
Unchanged from the prior carryover (11 steps: shaping → lint → dispatch via the permission-profiles emitter (NEVER pre-create worktrees — lesson #18) → Step 0 gate → build → closure check before re-running → deterministic pass (PowerShell only, `node -v` first) → adversarial review (dual for architecture/risk) → triage → rework with own Step 0 + tripwires → PR-only merge → Stage F). New in W1: treat CI scanners as a fourth net and write linear-time string handling up front (lesson #19); when a parcel has a live external boundary, run a fixture-isolated live-probe stage before calling it shipped (lesson #21); ratify contingency ladders (e.g. transport fallbacks) at shaping time so firing one is a ruling already made (lesson #20).

Coordinator shell and git discipline, standing: capture command output in full (`$null = cmd 2>&1` or `| Out-String`) before reading `$LASTEXITCODE` — never truncate a pipeline whose exit code you are about to trust (lesson #11); a destructive step (`Remove-Item`, `git worktree remove`, force-anything) never rides in the same command as the step that establishes its precondition, and `;` between mutation steps is an assertion that earlier failures don't matter — use `&&` or separate commands with a state check between (lesson #17); before creating any PR, sync the builder branch with main and require `git diff --stat origin/main` to be additions-only for the affected directories (lesson #26). Every builder/reviewer dispatch includes the standing constraints by reference: `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.

## Scorecard to date
Every layer caught real defects in W1: plan review found 2 blockers (incl. a frozen-contract Task-tier conflict); Step 0 flags produced ratified amendments committed alone; dual review caught a genuine push→link-seam blocker reproduced live; CodeQL caught 3 polynomial-redos; the coordinator's live probes caught 7 transport/schema mismatches before any unwanted Jira write; and the exit-proof shaping caught a stale premise in the proof idea itself and re-scoped it. The pipeline the wave built then shipped its own proof. Demo materials: docs/demo/PDD-DEMO-PLAN.md, docs/demo/spec-driven-development-demo.html.

## Recommended next move
Stage Zero with Clint for the next wave. Candidates: **W2** per FOREMAN-LINE-PLAN.md §8 (next in dependency order), **W5 Smart Triage** (parallelizable after W1 per the plan), or a small **SCAF-P2 goal** (spec already shaped, approved, and ticketed — needs only a charter ratifying the schema-scaffold touch). Whatever is chosen: `/goal <slug>`, charter first.
