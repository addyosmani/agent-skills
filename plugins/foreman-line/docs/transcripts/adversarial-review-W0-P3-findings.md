# Adversarial Review — W0-P3 (routing policy schema + validator) — Findings Report

Reviewer: frontier instance, distinct from coordinator (D4). Directive: docs/kickstarters/adversarial-review-W0-P3.md
Verdict: **No blocking findings.** 1 should-fix (Finding 1), 2 nits. Mandated focuses and coordinator probes summarized below from the reviewer's report; coordinator triage at the end.

## Mandated focus results

1. **Invariant depth (D5/D6 intent):** two probes. Non-binding-but-positive ceiling (`ceiling_usd: 999999999`) passes — by design, explicitly scoped out (constraint "structurally present and positive, nothing more"); not a defect. Readmitting a restricted-ineligible model through a shared class is not constructible in-document (the class↔classification link is dispatch-time, W2-P3, per Out of Scope). But the **shared-frontier-tier readmission is real and is Finding 1** — the one structurally-valid, all-invariants-passing document that violates D5/D6 intent, and the validator does not reject it.
2. **Class-enum reconciliation:** grep-verified from disk, legitimate. `implementation/standard` = PCC-P0-pcc-cli-scaffold.md:13; `architecture/risk` = W0-P1-pipeline-stage-contracts.md:13 (and plan §5).
3. **Exit-code parity:** accurate. pcc documents 0/1/2/3/4; routing-policy README claims same meaning for 0/1/2 and explicitly disclaims 3/4, which the validator has no use for. A correct, honestly-scoped subset.
4. **Non-pre-emption hunt:** clean. Sole occurrence of `routingDecisionRef`/decision-record language is README.md:7, stating what the parcel does NOT do. No receipt shape, no `ReceiptRef`, no decision-record type in types, fixtures, or examples. Frozen contracts untouched.

Coordinator probes: monotonic narrowing IS fully enforced (validator.ts:55-68 checks both adjacent subset relations, `restricted ⊆ internal` and `internal ⊆ public`, transitively `restricted ⊆ public`) — not just the fixture's shape; not a defect. Schema-layer and semantic-layer violations DO both surface together, no short-circuit — but no fixture proves it (Nit 1).

## Findings

**Finding 1 (should-fix) — `model_tiers.frontier` contents are unanchored.** The security-override and role-pinning invariants check tier *names* against the literal `frontier`; nothing constrains what model ids live inside `model_tiers.frontier`. A one-line edit placing `claude-haiku-4-5` inside `model_tiers.frontier` satisfies every invariant while gutting D4's frontier pinning and the §5 security hard-override. Structurally valid, all checks pass, intent violated.

**Nit 1 —** the both-layers code path (schema + semantic violations listed together) exists but no fixture exercises it.

**Nit 2 —** citation record for the class-enum reconciliation (see focus 2 above); informational.

No blocking findings. Reviewer did not fix, commit, or re-run the deterministic pass.

---

## Coordinator triage (post-review)

| Finding | Disposition | Route |
|---|---|---|
| Finding 1 | **Fix — validator-side frontier registry.** The circularity (a self-describing document cannot anchor itself) is broken by putting the authority in the *validator's code*, not the policy document: a `KNOWN_FRONTIER_MODELS` constant (v0: `['claude-opus-4-8']`, from plan §5's July-2026 table) and a fifth invariant (e): every model id in `model_tiers.frontier` must be in the registry. The policy file is mutable data under validation; the validator is reviewed, tested code. Changing what counts as frontier becomes a code change with tests — exactly the right friction for the quarterly model revisit. Spec amended accordingly (rework amendment, coordinator-ratified). | Rework pass, original builder |
| Nit 1 | Fix — add a `reject-both.yaml` fixture (one structural + one semantic violation) and a CLI test asserting both layers' violations appear on stderr together | Rework pass, original builder |
| Nit 2 | Informational — citations preserved in this report; no code change | Closed here |

Rework directive: docs/kickstarters/foreman-line-parcel-W0-P3-rework.md.

## Closure record

**Rework attempt 1: ACCEPTED — all items closed, verified against disk.** Finding 1: `KNOWN_FRONTIER_MODELS` registry in validator code (validator.ts:36) + invariant (e) (checkFrontierTierAnchoring, wired at :168); rejecting fixture names the offending id at the process boundary; shipped policy passes unchanged; README documents the code-change friction as intentional. Spec amendment ff9f6d3 committed alone, before code (AC5 four → five suites, Security-override bullet extended). Nit 1: reject-both.yaml proves schema-layer and semantic-layer violations surface together, no short-circuit. Deterministic pass green: tsc 0, biome 0, 40/40 tests (37 → 40, matching the Step-0 estimate exactly). schemas/ untouched, per ruling. Transcript: docs/transcripts/build-W0-P3-deterministic-pass.md (rework section).
