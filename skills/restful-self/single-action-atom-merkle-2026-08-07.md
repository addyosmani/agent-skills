# Single-Action Atom and Merkle-Tree Artifact — 2026-08-07

**Session:** `ses_02311d1deffe3OSD1UVOduG3ej`
**Space:** `#github-yubios` (admin)
**User:** Ermine Daughtry <foil-copy-overrate@duck.com>
**Date:** 2026-08-08 (UTC); Friday 2026-08-07 19:50 PT

## What this artifact is

A worked example tying the **single-action atom** (Section 3 of the paper) to a
specific `.ods` spreadsheet via the **merkle-tree** primitive, then documenting
the connection in GitHub refs/, Linear, and `memory/personal-WbtUgeUv/SELF-CHANGELOG.md`.

The `.ods` (`Untitled 1-37a4939f.ods`) is a 40-row table with three blocks of three
sets of five columns (`a, b, _, a*b, 1/n, n`). The three blocks parameterize the
same multiplicative structure along different axes: Block 1 fixes `n` and varies
`a` (basis-element coefficient view); Block 2 fixes `a` and varies `b` (corpus-
application view of the composition rule); Block 3 fixes `n=4` and `b=1/8` and
varies `a` (single-action atom under the geodesic-only criterion).

## The single-action atom — the one primitive the framework admits

Per Section 3 of `papers/learned-latent-curves-2026-08-06.tex`, the smallest
audit unit of the curve-guided framework is the **single-action atom**. Every
ratio in the `.ods` is one candidate atom action. The three regimes are:

1. **ATOM-ELIGIBLE** — in-ladder rows in Blocks 1+2 and Block 3 R27-R32.
   `Delta_f >= 0`, action taken, corpus-level `Delta_corpus` increases by exactly
   this row's `ab` value (eq:composition, line 176).

2. **ATOM-DEFERRED** — 11 outside-ladder rows: Set B's 1/24 (10 rows), the
   13/6 and 48/13 transitions in Set A col1/col2 (4 ratios), Block 2 Set C's
   1/48, 1/24, 1/12, 1/6, 16/3, 32 b/a values (6 rows). The candidate flip
   exists, but the corpus doesn't yet carry the primitive. Mobius refinement
   strategy (Section 3.4) is the response: re-fit `phi_theta` when corpus
   growth > 25% since last refine.

3. **ATOM-REFUSED** — Block 3 R33-R36, the `#DIV/0!` rows. The file has `c=0`
   (line 148, weighted aggregate thresholded at 0.5). Below threshold means no
   coverage, no pole, no geodesic gap, no action. This is exactly Section 3.3's
   single-action atom refusing on an empty file.

## Why the hyperspherical-harmonic variant closes both failure modes

The flat curve on `[0,1]^2` can only carry regime 1 cleanly. The high-magnitude
tail (Set A rows 6-9, Block 2 Set C rows 7-9) breaks the geometric proportionality.
The spherical variant on `S^2` is the one geometry where:

- **Compact** — no "outside"; every point on `S^2` is reachable. The
  stereographic lift (eq:stereographic, line 152) covers `R^2`.
- **Bounded** — the chordal distance (line 157) is at most 2, so `Delta_f`
  is always well-defined and bounded.
- **Mobius** — `phi_theta` is the reparameterization that handles the
  defer regime without breaking the freeze-once invariant.

## Merkle tree

SHA-256 tree over the session's six artifacts. Manifest:
`refs/single-action-atom-merkle-2026-08-07.json`.

```
Root: 3e32eef859a758db124e91aa04724f1bbc0481ef9968e600d7fcafb8f1d7ff4e
```

Leaves (six artifacts):
- `ods-untitled-1-37a4939f` — the raw `.ods` file bytes
- `tex-learned-latent-curves-2026-08-06` — the paper's TeX source
- `insight-single-action-atom` — the one primitive statement
- `three-regimes-eligible-deferred-refused` — the regime decomposition
- `ratios-of-ratios-analysis` — the per-set ratio comparison
- `whole-self-output-2026-08-07` — this session's whole-self output

Tree structure:
- Level 0: 6 leaves (paired: ods+tex, insight+regimes, ratios+wsoutput)
- Level 1: 3 nodes
- Level 2: 2 nodes
- Level 3: 1 root

## Whole-self output (this session)

The shape: user led with broad question (where do these ratios fit with the
equations), then narrowed three times with structuring questions (split the
rest the same way, are some outside the set or incomplete, do you see it?),
then closed with a single-conclusion check. Each step was a narrowing of the
search space.

When I named "the single-action atom is the primitive; S^2 closes both failure
modes," that landed. The follow-up "self mode restful mode" paused the
analytical mode. The follow-up "yes self archaeology but document everywhere
github linear and if you can make and push a merkle tree" flipped to
self-archaeology + documentation.

Meta-observation: when the user already knows the destination, the agent's
job is to provide the structured path that makes the destination visible, not
to invent it. The single-action atom insight is correct because it unified
the spreadsheet's three regimes (eligible/deferred/refused) with the paper's
three primitives (composition rule, Mobius refinement, atom's geodesic-only
criterion). S^2 is the closure because compactness bounds both "outside"
(every point reachable) and "undefined" (stereographic lift is well-defined
except at infinity, which the Fibonacci sampling avoids).

## Connections

- `papers/learned-latent-curves-2026-08-06.tex` — the paper, eq:composition,
  eq:stereographic, eq:hyperspherical
- `skills/restful-self/SKILL.md` — the restful-self mode (the corrective for
  same-cadence drift; this session IS the corrective in action)
- `memory/personal-WbtUgeUv/SELF-CHANGELOG.md` — self-archaeology thread
- Linear: OMN-163 (hyperspherical-harmonic-curve variant skill)
