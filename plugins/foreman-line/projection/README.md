# @foreman-line/projection — Epic/Story projection generator, W1-P2

The Stage A→B seam of the Foreman Line: takes a schema-valid `ShapingResult`
emitted by the shipped W1-P1 `shaping` package (with `epics: []`) and produces
a *proposal* filling `ShapingResult.epics` with a two-level Epic/Story tree.
**Projection only** — no Jira registration (W1-P4), no human approval or
receipts (W1-P3), no `status` flips.

## Input contract

- **Primary:** the shipped `readShapingResult(path)` from `../../shaping/src/index.js`
  — the **explicit path handoff is the contract** (W1-P1's ratified P1→P2
  interface). This package delegates entirely; it never re-parses or
  re-validates the input JSON itself.
- **Fallback:** `discoverProjectableInputs(repoRoot)` wraps the shipped
  `discoverShapingResults(root)` glob (`active/*.shaping-result.json`) and
  filters out this package's own `*.projected.shaping-result.json` output —
  which would otherwise also match the suffix. `shaping/` itself is never
  changed; the filter lives here.

## Topology: single Epic, 1:1 Stories

Exactly **one Epic per `ShapingResult`**, containing exactly **one Story per
`parcelSpecRef`**, in `parcelSpecRefs` order. No Story is invented; no ref is
dropped. Multi-Epic grouping is out of scope (YAGNI).

## Title provenance — no fabrication

- **Story title** ← the referenced spec draft's frontmatter `title:`, read via
  the frozen `spec-linter` `parseFrontmatter` (`readSpecTitle`). Refuses,
  naming the offending ref, when the spec is missing, has no parseable
  frontmatter, or has a missing/empty `title:`. Never fabricated or defaulted.
- **Epic title** ← a **required explicit `epicTitle` parameter**. There is
  **no** slug-derived fallback: `ShapingResult` carries no goal field, and a
  silent slug-derivation would be exactly the fabricated-looking-complete
  value the empty-`epics` ruling exists to prevent. An absent, empty, or
  whitespace-only `epicTitle` is refused.

## Provisional key derivation + uniqueness guard

No Jira keys exist at projection time (registration is W1-P4). Keys are
non-empty, stable, distinct **placeholders** W1-P4 overwrites:

- **Story key** = the referenced spec's filename stem (basename minus `.md`).
- **Epic key** = `epic-<slug>`, where `<slug>` is the input artifact's slug —
  pinned verbatim, never a derived fallback from `ticket:` frontmatter (every
  unregistered spec is `KONE-TBD`, which would collide across all Stories).
- **Uniqueness guard:** two `parcelSpecRefs` sharing a filename stem, or a
  Story key that collides with the Epic key, are both refused with a clear
  error. All derivation is linear-time (basename/endsWith/slice; no regex over
  untrusted text — lesson #19).

## Output mechanics — new sibling artifact, never in-place

`writeProjectedResult(inputPath, epicTitle)` writes a **new sibling artifact**
at `active/<slug>.projected.shaping-result.json`. The pristine input
`<slug>.shaping-result.json` is **never mutated**. Writing **refuses to
overwrite** an existing projected artifact. `parcelSpecRefs` is copied
verbatim (byte-for-byte) from the input into the output. The file is
two-space-pretty JSON with a trailing newline — a plain object, **RFC
8785-canonicalizable**, so W1-P3 can hash it later. This package imports,
vendors, and invokes **no** canonicalization/hashing code and mints **no**
receipt.

## Path containment (rework, same class as W1-P1's slug hardening)

Two guards (`assertSafeSlug`, `assertContainedPath`) run before any path is
constructed or resolved: a `slug` containing `/`, `\`, or `..` is refused at
both the key-minting point (`projectShapingResult`, before the Epic key is
derived) and the path-construction point (`writeProjectedArtifact`); a
`parcelSpecRef` whose resolved path escapes `repoRoot` is refused (naming the
ref) before `readSpecTitle` checks existence or reads anything.

## Validation boundary + four semantic guards

Before write, the filled `ShapingResult` is re-validated against the imported
frozen `shapingResultSchema` (`../../contracts/src/index.js` — never
re-declared), **plus** four guards this package enforces because the frozen
schema declares no `minItems` anywhere:

- (a) `parcelSpecRefs` preserved verbatim from the input.
- (b) every input `parcelSpecRef` is represented by exactly one Story.
- (c) every Epic has `stories.length >= 1`.
- (d) the result's `epics.length >= 1` — the inverse of W1-P1's deliberately
  empty `epics`.

Each guard has a passing fixture and a rejecting fixture that would pass raw
schema validation (e.g. `epics: []` or an Epic with `stories: []`).

## Library-only — the CLI is W1-P3's surface

This package ships no CLI entry point. W1-P3's approval flow is the single
downstream CLI surface that invokes this package's `projectShapingResult` /
`writeProjectedResult`.

## Import mechanism (relative ESM only; bare specifiers banned)

```ts
import { type ShapingResult, shapingResultSchema } from '../../contracts/src/index.js'
import { discoverShapingResults, readShapingResult, ACTIVE_SPECS_DIR } from '../../shaping/src/index.js'
import { parseFrontmatter } from '../../spec-linter/src/index.js'
```

No npm workspace linking exists across `plugins/foreman-line/*`. The bare
specifiers `@foreman-line/contracts` / `@foreman-line/shaping` /
`@foreman-line/spec-linter` **do not resolve** and MUST NOT be used. Adding
workspace linking to the root `package.json` is out of scope and a
Stop-and-Report (SCAF-P1 / W0-P4 precedent). This package's only runtime
dependency is `ajv`.

## Verification note (install precondition)

Because cross-package imports are relative with no workspace hoisting, run
`npm install` in each of: `plugins/foreman-line/projection/`,
`plugins/foreman-line/shaping/`, `plugins/foreman-line/contracts/`,
`plugins/foreman-line/spec-linter/`, and (transitively)
`plugins/foreman-line/permission-profiles/` and
`plugins/foreman-line/schema-scaffold/`. Verification runs in **PowerShell**,
`node -v` first (`>=24.11.1`).

Commands: `npx tsc --noEmit` · `npx tsx --test tests/*.test.ts` · `biome check .`
