# @foreman-line/shaping — Stage A (Shaping Agent), W1-P1

Turns a raw idea into linted parcel **spec drafts** plus a schema-valid
`ShapingResult` handed forward to W1-P2. Ships as a three-part split.

## The split

1. **This package** (`plugins/foreman-line/shaping/`) — the deterministic,
   tested core: emits and reads the `ShapingResult`, and runs a two-layer
   advisory self-check on the drafts it authors. All testable behavior lives
   here.
2. **The skill** (`plugins/foreman-line/skills/foreman-shaping/SKILL.md`) — the interactive-shaping
   session prompt (clarify intent, surface constraints, propose decomposition,
   ask small-batch clarifying questions with recommended defaults, write drafts,
   emit the `ShapingResult`, then STOP). Prose/interaction guidance only — no
   business logic.
3. **The kickstarter template**
   (`plugins/foreman-line/docs/kickstarters/foreman-shaping-template.md`) — a
   reusable dispatch shell for future shaping sessions.

## `ShapingResult` emission — the bare payload

The emitter produces the **bare payload** `{ parcelSpecRefs, epics }`, validated
against the **frozen** `shapingResultSchema` imported from `contracts` (never
re-declared here) — **not** a `StageOutput<ShapingResult>` envelope. The
envelope requires a `ReceiptRef`, and receipt minting is W1-P3's job (charter
F8); emitting an envelope here would preempt P3 and demand a receipt that does
not exist at shaping time.

- **`epics: []`** always at Stage A. This is schema-valid — the frozen schema
  declares no `minItems` on `epics`. W1-P2 fills it. The emitter never
  fabricates a placeholder epic; empty means empty.
- **`parcelSpecRefs`** — repo-relative **POSIX-separator** paths to the emitted
  draft `.md` files. Although `parcelSpecRefs: []` is schema-valid, it is
  semantically wrong for Stage A, so the emitter applies a **semantic guard**
  requiring `length >= 1` and refuses to emit otherwise. (Schema-valid is not
  the same as semantically complete.)

## Artifact location / naming and the P1→P2 contract

Exactly one artifact per shaping session at
`plugins/foreman-line/docs/specs/active/<session-slug>.shaping-result.json`
(a sibling `.json` in `active/` never trips the spec-linter, which collects only
`.md`). The `<session-slug>` is caller-chosen; `deriveSessionSlug(raw)` produces
a filesystem-safe slug (lowercase, trim, collapse non-alphanumeric runs to a
single `-`, strip leading/trailing `-`, throw on empty). The emitter **refuses
to overwrite** an existing artifact, so two sessions can never silently collide.

- **Primary interface:** `readShapingResult(path)` — the **explicit path handoff
  is the contract**. W1-P2 is handed the artifact path and reads the parsed,
  schema-validated payload.
- **Fallback:** `discoverShapingResults(repoRoot)` — the documented
  `active/*.shaping-result.json` glob discovery helper, not the primary
  interface.

## Two-layer advisory self-check

Every draft this package authors is self-checked, in two layers:

1. **Frontmatter** — delegates to the imported `parseFrontmatter` +
   `validateSpecFrontmatter` from the **frozen** `spec-linter` (the v0.2 schema
   authority). No re-implementation that could drift; `spec-linter` is never
   modified.
2. **Body sections** — a thin complementary check *in this package* confirming
   the SPEC-CONVENTION §4 required sections are present and **in order** (Intent,
   Constraints, Acceptance Criteria, Out of Scope, Context & References) and that
   **Out of Scope is non-empty** (§4.4). This lives here, not in the frozen
   linter.

**Authority.** The self-check is **advisory** — a fast local gate to cut
round-trips. **Coordinator lint remains the sole authority.** A passing
self-check never authorizes a `status` flip to `active`: the self-check never
writes, moves, or flips a spec's status. Promotion to `active` is coordinator
lint + Gate-2 authorization, downstream of this artifact.

## RFC 8785 canonicalizability (future genesis subject)

The emitted JSON is a plain object with no non-serializable values, byte-stable
under a parse/serialize round-trip, so it is **RFC 8785-canonicalizable**. This
lets W1-P3 compute the genesis / Stage-A receipt hash over it **later**. This
parcel writes the artifact in that shape and mints **no receipt** — it imports,
vendors, and invokes **no** canonicalization/hashing code (that is W1-P3 / pcc's
job).

## Import mechanism (relative ESM only; bare specifiers banned)

Cross-package imports use **filesystem-relative ESM specifiers** (W0-P4
precedent):

```ts
import { type ShapingResult, shapingResultSchema } from '../../contracts/src/index.js'
import { parseFrontmatter, validateSpecFrontmatter } from '../../spec-linter/src/index.js'
```

No npm workspace linking exists across `plugins/foreman-line/*` (the root
`package.json` `workspaces` covers only `apps/*`/`packages/*`). The bare
specifiers `@foreman-line/contracts` / `@foreman-line/spec-linter` **do not
resolve** and MUST NOT be used. Adding workspace linking to the root
`package.json` is out of scope and a Stop-and-Report (SCAF-P1 / W0-P4). This
package's only runtime dependency is `ajv`.

## Verification note (install precondition)

Because the cross-package imports are relative and there is no workspace
hoisting, the consumed packages' own bare dependencies (`ajv`, `yaml`) resolve
relative to *their* directories. Before the deterministic pass, run
`npm install` in each of: `plugins/foreman-line/shaping/`,
`plugins/foreman-line/contracts/`, `plugins/foreman-line/spec-linter/`,
`plugins/foreman-line/permission-profiles/`, and
`plugins/foreman-line/schema-scaffold/`. The last two are pulled transitively:
`spec-linter`'s frontmatter schema enum-validates `permission_profile` against
`PROFILE_NAMES` (`permission-profiles`), and `contracts`'s registry consumes the
shared `schema-scaffold` (SCAF-P1). Verification runs in **PowerShell**,
`node -v` first (`>=24.11.1`).

Commands: `npx tsc --noEmit` · `npx tsx --test tests/*.test.ts` · `biome check .`
