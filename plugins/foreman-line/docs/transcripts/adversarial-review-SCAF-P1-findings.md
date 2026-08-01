# Adversarial Review Findings — SCAF-P1

Reviewer: fresh session, no builder context, frontier per D4. Branch: feat/foreman-line-scaf-p1 (main..HEAD, build commit c3d0040).
Directive: plugins/foreman-line/docs/kickstarters/adversarial-review-SCAF-P1.md (6 mandated focus questions + lesson #12 hostile-input probe).

## Verdict: no blockers

## Focus-question results (as delivered)

- **Q1 byte-identical schemas, independently re-derived through the shared `serialize`: PASS — 32/32 files byte-identical, 0 mismatches** (contracts 17, routing-policy 4, receipts 2, spec-linter 1, skill-injection 4, permission-profiles 4). Re-derived from typed sources, not trusted from the parity suites.
- **Q2 circularity/purity: PASS** — schema-scaffold imports only node builtins, ajv, and its own modules; zero consumer imports, zero consumer data.
- **Q3 contracts frozen surface:** schemas PASS (empty diff), index.ts file PASS (zero-line diff) — but via `export * from './registry.js'` the effective public *type-name* set changed `Contract` → `SchemaFile`. Spec-ratified; detailed as INFO-1.
- **Q4 public-surface widening: PASS** — only contracts (ratified) gains a new name; four consumers don't re-export registry at all; `serialize`/`generate` leak through no consumer surface.
- **Q5 bare-specifier/root-config: PASS** — all `@foreman-line/schema-scaffold` occurrences are docs/name-field/warning prose; root package.json untouched.
- **Q6 testing.ts scope-creep: PASS** — zero testing.ts diffs; README quotes the ruling faithfully, unsoftened.
- Cross-cutting: all six `generate.ts` at one git blob (`991dca2`); scaffold tsc clean, 4/4 tests.

## Findings

**INFO-1 — contracts' public type surface loses `Contract`, gains `SchemaFile`.** The literal answer to Q3 is "not name-for-name unchanged": `export *` re-exports the renamed interface. Authorized by the spec's naming-convergence clause; reviewer extended the spec's contracts-tests-only check to a repo-wide `git grep '\bContract\b'` — zero real usages. Residual risk confined to hypothetical external importers of a `"private": true` package.

**INFO-2 — `generate()`'s contract silent on hostile inputs (build-time, trusted).** Live probes: `name: '../escaped'` silently writes outside `outDir` (path traversal via `join`); nested names throw ENOENT; `outDir`-as-file throws EEXIST; duplicate names last-wins silently; empty name writes `.schema.json`; empty array logs `generated 0`. Nothing contradicts the README (it makes no promise); inputs are static in-repo literals under the direct-invoke guard only.

**INFO-3 — branch one commit behind main.** The `defects_lessons.md -6` in the range diff is main's `fad0eb3` (lesson #17) landing after divergence, not a parcel deletion — `git log main..HEAD -- <file>` is empty. Needs a rebase before integration; conflict-free by construction.

**INFO-4 (trivial) —** (a) scaffold's `exports` map points at TS source; inert while the bare-specifier ban holds. (b) contracts' `import type` sits mid-file after a section comment; legal, biome-clean, cosmetic.

## Coordinator triage (2026-07-22)

| Finding | Disposition | Reasoning |
|---|---|---|
| INFO-1 | **Accept-as-documented** | The rename is spec-ratified with the reasoning on record; the reviewer's repo-wide grep is a *stronger* verification than the spec required and is now part of the receipt. The honest caveat stands in this transcript: "frozen surface" for contracts means schemas + semantic types; the scaffold interface name was ruled maintenance surface at shaping. |
| INFO-2 | **Accept-as-debt-documented** | Build-time developer tool, static in-repo inputs, direct-invoke guard only — no attacker-controlled path exists today. Backlogged: a `name` validation guard (reject path separators, `..`, empty) plus one README contract line is the candidate fix the next time schema-scaffold is touched; W2-P5 (skill-injection engine) is the natural carrier if it consumes this package. Not worth a rework cycle now; recorded so the gap is a decision, not a surprise. |
| INFO-3 | **Act at integration** | Rebase onto main before push (coordinator does this as integration prep). The reviewer correctly prevented a scope-creep misread of the range diff. |
| INFO-4 | **Accept (trivial)** | (a) is inert by the ban and consistent with the sibling precedent (contracts ships the same shape); (b) is cosmetic and biome-clean. Neither warrants a diff. |

Zero fix-class findings; no rework cycle. Proceeds to integration.
