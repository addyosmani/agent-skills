# Adversarial Review Findings — DOCS-P1

Reviewer: fresh session, no builder context. Branch: feat/docs-p1-relocation (main..HEAD).
Directive: plugins/foreman-line/docs/kickstarters/adversarial-review-DOCS-P1.md (5 mandated focus questions).

## Findings as delivered

**FQ3 — History preservation: CONFIRMED CLEAN.** `git show 00ebfa5 --name-status` returns exactly 90 R100 lines and nothing else. `git log --follow` traces pre-move history for files from all four destination projects. No delete+add pairs.

**FQ2 — Receipt immutability: CONFIRMED CLEAN.** `git diff main..HEAD --diff-filter=M --name-only` returns exactly 6 files, all reference-update list entries. No transcript or findings file modified. The coordinator-carryover diff (the file that needed the c87a320 second pass) is path-string-only.

**SHOULD-FIX 1 — Demo docs: stale paths exempted without justification.** `docs/demo/PDD-DEMO-PLAN.md` (lines 100, 104, 180, 182, 183) and `docs/demo/foreman-line-W0-demo-notes.md` (lines 21, 63, 69) reference moved targets (`docs/transcripts/...`, `docs/kickstarters/...`, `docs/COORDINATOR-PATTERN.md`, `docs/goals/...`). The builder's sweep found these and exempted them, but AC5's exempt criteria (defects_lessons refs, root-docs/specs refs, historical quotes inside moved receipts) covers none of them. They are present-tense navigable presenter material — a demo presenter following PDD-DEMO-PLAN.md:182-183 reaches files that no longer exist.

**SHOULD-FIX 2 — PDD SKILL.md `docs/PARCELS/` guidance conflicts with the new monorepo rule.** `skills/parcel-driven-development/SKILL.md` lines 176, 293, 478, 479 direct a new PDD project to create `docs/PARCELS/` at the repo root — directly contradicting the §2 monorepo rule this parcel ratified. The "generic pattern" exemption fails on its own terms: the pattern it documents is now actively harmful, and the directory it names no longer exists in this repo.

**SHOULD-FIX 3 — SPEC-CONVENTION §7 lint glob inconsistent with the §2 monorepo rule.** `docs/SPEC-CONVENTION.md:176` scopes secret/PII lint to `docs/specs/**`, which does not cover the project-level spec trees §2 now mandates. The dangerous naive reading: project-level specs are exempt from secret/PII scanning. The text as written supports it.

**INFORMATIONAL 1 — contracts/src/testing.ts fixture paths doubly stale.** Lines 55, 74, 105: fixture strings reference `docs/specs/active/` (wrong lifecycle AND wrong project path post-move) and `docs/specs/shipped/` (never existed). "Fixture data" exemption defensible — nothing follows these paths at runtime — but the justification understates the staleness.

**FQ4 — §2 amendment internally coherent** (naive-reading probes on both directions fail to find ambiguity); §7 is the only coherence gap (SF3). **FQ5 — exemption ledger: one defensible row (testing.ts), two wrong rows (PDD SKILL.md, demo docs).** Clean surfaces verified: `.claude-plugin/`, `.github/workflows/`, `scripts/`, all other `skills/*/SKILL.md`. Root `docs/` at HEAD matches AC2 exactly.

Summary: 3 should-fix, 1 informational, 0 blockers.

## Coordinator triage (2026-07-21)

Coordinator verification notes: all four findings reproduced on disk before triage. SF1 evidence count is 8 matched lines (reviewer prose says "nine"; the enumerated evidence is 8 — immaterial, the rework mandate is "every stale hit," not a count). SF3 verification found a second instance the review missed: `docs/SPEC-CONVENTION.md:208` (§10 adoption path) carries the same `docs/specs/**` glob — folded into the SF3 fix.

| Finding | Disposition | Reasoning |
|---|---|---|
| SF1 demo-doc stale paths | **FIX** (rework item 1) | The spec never permitted this exemption — reference-update item 7 already mandated updating any stale live reference the sweep found. Demo docs are presenter-navigable material, not receipts. The exemption was the defect, not the spec. |
| SF2 PDD SKILL.md `docs/PARCELS/` guidance | **FIX** (rework item 2, via coordinator-ratified spec amendment) | Editing this file was out of scope as dispatched; the review establishes the convention change made its guidance actively wrong. Amendment adds it to the reference-update list: the four lines restate per the §2 monorepo rule (`<project-root>/docs/parcels/`). |
| SF3 SPEC-CONVENTION lint globs | **FIX** (rework item 3, via the same amendment) | AC3's sole-change clause gains a ratified exception for exactly two lines: 176 and 208, `docs/specs/**` -> `**/docs/specs/**`. Coherence between §2 and §7/§10 outweighs the single-amendment purity rule, and the fix rides the same PR as the rule that necessitated it. |
| INFO1 testing.ts fixture staleness | **ACCEPT** (informational, backlogged) | `plugins/foreman-line/contracts/` is frozen; no runtime path-following exists. Logged for a future contracts maintenance parcel alongside the spec-linter corpus-reconciliation debt (AC8). |

Rework directive: plugins/foreman-line/docs/kickstarters/foreman-line-parcel-DOCS-P1-rework.md.
