---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Parcel Compiler - pcc CLI scaffold (PCC-P0)
status: done                # merged via PR #14 (12b1046), 2026-07-14
owner: clinton.morgan
created: 2026-07-14
updated: 2026-07-14
supersedes: PR-0 (sandbox directive; artifact lost, never landed on disk or remote)
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [skills/parcel-compiler/tool/*]
routing_class: implementation/standard   # scaffold work; no frontier routing required
---

# PCC-P0 - Proof-Gated Parcel Compiler CLI Scaffold

## Intent

Scaffold `pcc`, the Proof-Gated Parcel Compiler CLI - the trust-path binary that will compile parcel plans, seal claims, and verify receipt chains for the Foreman Line. This parcel ships the command surface, the exit-code contract, the CLI router, and the three trust-path utility primitives (RFC 8785 canonicalization, hashing, git base-SHA resolution) with tests. **Every command is a stub that exits 2 NOT_IMPLEMENTED.** The deliverable is the frozen shape of the tool, not its behavior - identical in spirit to W0-P1: later parcels implement commands against this surface without renegotiating it.

This parcel re-executes the lost PR-0. The original was built and verified only in a sandbox and never landed; this spec is written after W0-P1 froze, so the scaffold is built against the frozen contract surface from day one rather than retrofitted.

## Constraints

- **Location:** `skills/parcel-compiler/tool/` in `kaseya-one-productivity-tools` (local: `C:\Repos\kaseya-one-productivity-tools`).
- **Stack:** TypeScript, Node >=22, ESM-only. Tests via `npx tsx --test`. Lint/format with `biome`.
- **Zero runtime dependencies - ratified.** PR-0 deviated from a "commander-based" note and flagged it; this spec ratifies the deviation as a constraint. `pcc` sits in the trust path of every claim and receipt; its supply-chain surface is Node itself and nothing else. `package.json` MUST have no `dependencies` entry (devDependencies for tsc/tsx/biome only), and a test MUST enforce this by reading `package.json`.
- **Command surface (9 commands, frozen by this parcel):**
  | Command | Summary |
  |---|---|
  | `compile <artifact-path>` | Compile an artifact into a validated parcel plan (or refuse with clarifications) |
  | `answer <plan-id> --file <answers.json>` | Merge clarification answers and recompile |
  | `validate <plan-id>` | Run the deterministic validator pipeline (V-01..V-14) on a plan |
  | `directive <plan-id> <parcel-id>` | Render the implementation directive for a parcel |
  | `claim init <parcel-id>` | Scaffold a claim manifest (records author identity + base SHA) |
  | `claim seal <parcel-id>` | Hash the evidence tree and freeze the claim manifest |
  | `verify <parcel-id>` | Re-derive claim tier from the verification contract (trusted only in CI) |
  | `receipt verify` | Walk the receipt chain; recompute hashes and check signatures |
  | `status <plan-id>` | Fold the receipt chain into per-parcel states |
- **Exit-code contract (frozen by this parcel):** `0` success; `1` validation/verification failure; `2` usage error, unknown command, or NOT_IMPLEMENTED stub; `3` trust-invariant violation; `4` environment error. In the scaffold only 0 and 2 are reachable; the contract itself is documented in `cli.ts` and README.
- **Router:** longest-prefix match over argv tokens (two-token commands like `claim seal` resolve before one-token). `COMMANDS` table and `resolveCommand` are exported for tests. Bare `pcc` prints usage and exits 0; `--version` prints `0.1.0-scaffold` and exits 0; `<command> --help` prints the command's usage line and exits 0; unknown commands exit 2 with usage on stderr.
- **Utility primitives (the only real logic in this parcel):**
  - `src/receipts/canonical.ts` - RFC 8785 (JCS) canonical JSON serialization. Algorithm only.
  - `src/util/hash.ts` - SHA-256 over canonical bytes (node:crypto).
  - `src/util/git.ts` - `mergeBase(cwd, ref)` resolving the base SHA for `claim.base_sha`; returns `null` when the ref does not resolve (callers decide fatality).
- **W0-P4 non-pre-emption (hard rule):** this parcel defines NO receipt type, schema, manifest shape, or chain format. `canonical.ts` and `hash.ts` are algorithms that W0-P4's receipt shape will consume; receipts remain exactly as opaque as W0-P1's frozen `ReceiptRef` (`hash` + `locator`). If the builder finds itself typing a receipt structure, that is a Stop-and-Report.
- **Standing constraint from the W0-P1 rework:** ajv's `JSONSchemaType` is banned as a schema authority anywhere in this repo. No schemas should exist in this parcel at all; if any are added, they are standard JSON Schema draft-07 typed as `SchemaObject`.
- All source is `readonly`/immutable-shaped where applicable; the scaffold describes a surface, not mutable state.

## Acceptance Criteria

1. `npx tsc --noEmit` passes.
2. `npx biome check .` passes with zero diagnostics.
3. `package.json` contains no runtime `dependencies`, enforced by a test that reads and asserts it.
4. Bare `pcc` prints usage naming all 9 commands, exits 0. `--version` matches `^0\.1\.0-scaffold`, exits 0.
5. Every declared command with args exits 2 with `NOT_IMPLEMENTED` on stderr and a marker identifying the scaffold build.
6. Every declared command with `--help` exits 0 and prints its usage line and summary.
7. Unknown commands exit 2 with `unknown command '<input>'` and usage on stderr.
8. Router test proves longest-prefix resolution for all two-token commands and null for unknowns.
9. `canonical.ts` passes RFC 8785 test vectors (minimum: key ordering, number serialization, string escaping, nested structures) plus a determinism test (same value -> identical bytes across calls).
10. `hash.ts` produces stable, documented hex digests for known canonical inputs.
11. `mergeBase` returns a SHA for a resolvable ref and `null` for an unresolvable one (tested against a temp git repo, not this repo's state).
12. All tests pass via `npx tsx --test`; total test count >= 25.
13. `tool/README.md` documents the command surface, the exit-code contract, and the zero-dependency rationale in <= 1 page.

## Out of Scope

- Implementing the semantics of ANY command (compile, answer, validate, directive, claim init/seal, verify, receipt verify, status are all future pcc parcels).
- Receipt shape, claim manifest schema, chain linkage, or signatures (W0-P4 owns receipt shape; pcc consumes it later).
- The validator pipeline V-01..V-14 (referenced by `validate`'s summary only).
- Routing policy evaluation (W0-P3).
- CI trust configuration for `verify` ("trusted only in CI" is documented, not enforced, in the scaffold).
- Publishing, packaging, or npm distribution.
- The `parcel-compiler` SKILL.md (separate authoring task; this parcel is the tool only).
- Any modification to `plugins/foreman-line/contracts/` (frozen).

## Context & References

- FOREMAN-LINE-PLAN.md - Parcel Compiler is a top-tier Foreman plugin (force multiplier).
- SPEC-CONVENTION.md - schema this parcel is written under.
- `docs/specs/active/W0-P1-pipeline-stage-contracts.md` (shipped, PR #12) - frozen `ReceiptRef` opacity that this parcel's primitives must not pre-empt.
- RFC 8785 (JSON Canonicalization Scheme) - normative for `canonical.ts`.
- PR-0 sandbox session - prior art for the command table, exit codes, and zero-dep decision. The artifact is lost; this spec is the authority, not the transcript.

## Verification Plan

Deterministic: compile check, full test suite, biome, plus the AC3 dependency-freedom assertion. Adversarial review mandated focuses: (a) exit-code contract consistency - do the documented codes, the README, and every reachable code path agree, and are the "not reachable in scaffold" claims true; (b) zero-dependency claim verified against BOTH `package.json` and the lockfile; (c) W0-P4 pre-emption hunt - confirm no receipt/claim/manifest shape is smuggled in via types, test fixtures, or canonicalization examples; (d) does any test assert less than its name claims. Deterministic pass runs on Node >=22 on the coordinator's machine - `node -v` before anything else.
