---
name: nss-adjacent-problems
description: "Sixth NSS axis (after Audience, Inputs, Outputs, Mode, Assumption set) -- the Adjacent problems axis scores a file's coverage of RELATED issues, alternative solutions, problem-family taxonomy, and prior-art cross-references. Per the 12-axis negative-skill-space sweep, each file should identify (a) the related problems it solves alongside the focal problem, (b) the alternative solutions that address the same need differently, (c) the problem family it sits in (e.g. secure-boot families: measured-boot + TPM-quote + UKI vs. signed-bootloader + UKI vs. vendor-keys + shim), and (d) the prior-art and RFC/survey cross-references that ground the choice. Used as the gap-finder for RSI cycle 13 on PR #207. Use when the request mentions NSS adjacent-problems axis, related-work, prior art, alternative solutions, problem-family taxonomy, problem framing, design space enumeration, RFC cross-reference, USPTO analogous-art, citation snowballing, see-also cross-linking, or cycle-13 NSS-adjacent-problems gap-finder. NOT for assumption-set enumeration (use nss-assumption-set), failure-mode enumeration (use negative-skill-space), mode axis (use nss-mode), or any other NSS axis."
---
# nss-adjacent-problems

The sixth of the twelve NSS axes (per `negative-skill-space`). The **Adjacent problems** axis scores a file's coverage of *related issues, alternative solutions, problem-family taxonomy, and prior-art cross-references* -- not the count of links, but the breadth AND correctness of the relationship map documented or evidenced in the file.

The cycle-13 NSS-adjacent-problems sweep applies this rubric to ~40 files in the yubiOS corpus, where each file gets ONE adjacent-problems-aware section added per lens-format patch (`## Adjacent problems -- cycle 13`).

## When to use

- When a skill, file, ADR, or research note declares a single solution without enumerating the alternative solutions it chose not to take.
- When scoring or comparing files along the Adjacent-problems axis for an NSS sweep.
- When designing a new skill, ADR, or refactor that needs to position itself against existing alternatives without re-deriving the survey from scratch.
- When a file says "we chose X" but never says why not Y or Z.
- When a research note states findings without linking to the prior art it extends or contradicts.

## When NOT to use

- You want primitive coverage (9-primitive binarization) -- use `negative-skill-space` directly.
- You want lens-format RSI patches specifically -- use `curve-compass-skill`.
- You want to enumerate explicit prerequisites or assumptions -- use `nss-assumption-set`.
- You want to enumerate failure modes or anti-patterns -- use `negative-skill-space` directly.

## Coverage rubric (0-5 levels)

Treat Adjacent-problems axis coverage as breadth AND correctness. Score by the highest level whose relationship map is actually evidenced.

| Level | Label | What the file demonstrates |
|---|---|---|
| 0 | Absent | No mention of related problems, alternatives, or prior art; the file presents its solution as the only solution. |
| 1 | Nominal | Mentions one or two related names (a sibling tool, an RFC number) without defining the relationship type or trade-off. |
| 2 | Basic | Covers at least two adjacent problems or alternative solutions with usable comparison (when each applies, what each replaces). Handles the happy path but not the problem-family boundaries. |
| 3 | Operational | Covers the full problem family the focal problem sits in: at least 3 alternative solutions with trade-offs, prior-art citations, and explicit "why not" reasoning for each rejected alternative. A reader can re-derive the design decision. |
| 4 | Production-grade | Covers the problem family, the alternative solutions, the prior-art citations, the rejection criteria, AND the boundary conditions under which the choice would flip. RFC/Survey cross-references are present and accurate. |
| 5 | Exemplary | Compact reusable problem-family model with explicit relation types (intersection, analogy, abstraction, substitution), decision tree, anti-patterns, and machine-readable alternative-solution matrix. |

## Scoring dimensions (0-2 each, max 20)

1. **Related problems named** -- the file names the problems it solves *alongside* the focal problem (siblings, cousins, not just prerequisites). Score 2 if 3+ related problems are named with a relation type.
2. **Alternative solutions enumerated** -- the file enumerates at least two alternative approaches with their trade-offs, not just the one it chose. Score 2 if 3+ alternatives are enumerated.
3. **Problem-family taxonomy** -- the file identifies the problem family it sits in (e.g. "OS trust anchoring" vs. "OS measurement" vs. "OS key sealing"). Score 2 if the family name is explicit and the boundary with adjacent families is documented.
4. **Prior-art citations** -- the file cites prior art (papers, RFCs, vendor docs, similar projects) with enough context that the reader can find them. Score 2 if every alternative has at least one citation.
5. **Rejection criteria documented** -- for each rejected alternative, the file states WHY it was rejected (constraint violation, missing primitive, security boundary, etc.). Score 2 if every alternative has an explicit "why not" line.
6. **Relation type classified** -- relationships are classified (intersection / analogy / abstraction / substitution / alternative / prior-art / extension) rather than free-form "see also" links. Score 2 if a controlled vocabulary is used.
7. **Decision reversibility stated** -- the file states the conditions under which the chosen solution would be abandoned for an alternative. Score 2 if the flip conditions are explicit.
8. **Boundary with adjacent families** -- the file distinguishes its problem from adjacent families (e.g. "secure boot" vs. "measured boot" vs. "encrypted boot" vs. "reproducible boot"). Score 2 if at least one boundary is explicitly named.
9. **Cross-context invariance** -- the relationship map holds across the relevant contexts (operator/developer/CI/architect). Score 2 if all four contexts see the same map.
10. **Link integrity** -- every cross-reference resolves to the cited artifact (no broken links, no stale RFC numbers). Score 2 if a machine check is feasible.

**Convert score to label:** 0-3 Narrow | 4-7 Emerging | 8-12 Useful | 13-16 Strong | 17-20 Comprehensive.

## Important distinctions

- **Related problem is not alternative solution.** A related problem shares the *focal problem's structure*; an alternative solution solves the focal problem *differently*. Confusing the two collapses two distinct relationship types into one.
- **Prior art is not alternative solution.** Prior art is what existed before; an alternative solution may include both prior art AND novel designs. Prior art without an alternative-solution relationship is just a bibliography.
- **Sibling tool is not problem family.** A sibling tool may solve a different problem in the same family. The family is the abstract shape; the sibling is one implementation.
- **"See also" is not relation-type.** "See also" is a link; the relation type (analogy, alternative, prerequisite, extension) is what makes the link useful.
- **RFC number without context is not cross-reference.** "See RFC 8174" without saying *what* RFC 8174 says and *why* it matters here is a name-drop.
- **Problem-family boundary is not adjacency.** Two problems in the same family may have no adjacency; two problems in different families may be near-adjacent (functional analog).

## Lens format (cycle-13 patch generator)

Each cycle-13 patch is one lens per file:

```
L<N> -- <short-name>
  hypothesis:  <testable claim about this file's adjacent-problems coverage>
  method:      <how to verify>
  parameters:  {axis: adjacent_problems, dim_scores: {related_named:1, ...}, total: X/20}
  delta:       {adj_gaps_before, adj_gaps_after, dim_closed, family_named, alternatives_count}
  verdict:     YES | PARTIAL | NO
  score:       0-50
  caveat:      <what was NOT measured>
```

The patch is the lens. No `## Adjacent problems -- cycle 13` section without hypothesis + method + parameters + delta + verdict + score + caveat.

## Examples

### Example 1 -- scoring a Containerfile

A Containerfile that `FROM`s an image and adds packages but never says why not `FROM scratch` or `FROM debian:bookworm`:

- related_named: 0
- alternatives_enum: 0
- family_taxonomy: 0
- prior_art: 0
- rejection_criteria: 0
- relation_type: 0
- reversibility: 0
- family_boundary: 0
- cross_context: 1 (the maintainer sees the choice; operator/developer/CI do not)
- link_integrity: 0
- **Total: 1/20 -- Narrow.** No relation map; the choice is opaque to every audience.

### Example 2 -- scoring an ADR

An ADR that proposes option A, lists options B and C, and concludes A without saying what constraint made A win:

- related_named: 1 (B and C named)
- alternatives_enum: 1 (B and C enumerated)
- family_taxonomy: 1 (the ADR implies a family)
- prior_art: 0 (no citations)
- rejection_criteria: 0 (no "why not B, why not C")
- relation_type: 0 ("B and C exist" without relation type)
- reversibility: 0 (no flip conditions)
- family_boundary: 0
- cross_context: 1 (the ADR's maintainer-only audience sees the map)
- link_integrity: 0
- **Total: 4/20 -- Emerging.** The alternatives are named but the relationship map is missing; "why not" lines are the highest-leverage add.

### Example 3 -- scoring a research note (refs/*.md)

A `refs/foo-bar-2026-08-04.md` note that states findings and cites 3 papers but never links to the surveys that frame the same problem family:

- related_named: 1 (3 papers named)
- alternatives_enum: 0
- family_taxonomy: 1 (implicit family)
- prior_art: 2 (3 citations with context)
- rejection_criteria: 0
- relation_type: 0
- reversibility: 0
- family_boundary: 1 (one boundary named)
- cross_context: 1
- link_integrity: 2 (machine-checkable)
- **Total: 7/20 -- Emerging.** Strong on prior art, missing on alternatives and rejection criteria; a 1-paragraph "what we did not adopt, and why" would push to Strong.

## Guidelines

1. **Score behavior, not keywords.** A token like `see also` earns at most partial credit; full credit requires a relation type, a trade-off, and a flip condition.
2. **Name the family.** A file that solves problem X without naming the family X belongs to cannot position itself against alternatives.
3. **Distinguish alternatives from related problems.** An alternative solves the *same* problem differently; a related problem solves a *different* problem in the same family.
4. **Cite prior art with context.** A citation without "this is the prior art for component X" is a name-drop, not a cross-reference.
5. **Document rejection criteria.** For every alternative, write "why not" -- the constraint violated, the primitive missing, the trade-off that lost.
6. **Use the seven-relation taxonomy verbatim.** intersection / analogy / abstraction / substitution / alternative / prior-art / extension. New relations require a vocabulary revision.
7. **State flip conditions explicitly.** A choice is fragile if its reversal conditions are implicit; name them.
8. **Boundary with adjacent families.** A secure-boot ADR that does not say "we did not pick measured-boot, here's why" under-sells the choice.
9. **Lens-format patches only (cycle-13).** Each file patch is a lens with hypothesis + method + parameters + delta + verdict + score + caveat. No templated `## Adjacent problems` sections.
10. **Cross-context invariance.** The relation map should hold for operator / developer / CI / architect. Stale maps re-anchor biases from the author's role.

## Constraints

- LOCAL ONLY for the rubric; no network for measurement.
- The rubric is binary per-dimension (0/1/2). No fractional scores.
- Lens output (cycle-13) carries its own experimental design; the patch is the lens, not prose about the file.
- Self-containment: this SKILL.md embeds the full rubric and the distinctions; no external doc fetch required.
- The seven-relation taxonomy is fixed: intersection / analogy / abstraction / substitution / alternative / prior-art / extension.

## Anti-patterns

- Awarding points for keywords alone ("mentions RFC" = full credit).
- Confusing related problem with alternative solution.
- Confusing prior art with alternative solution.
- Naming a sibling tool without naming the problem family.
- "See also" links without a relation type.
- RFC number without context.
- No "why not" lines for rejected alternatives.
- No flip conditions on the chosen solution.
- Family boundaries implicit or missing.
- Shipping templated `## Adjacent problems -- cycle 13` sections without lens format.

## Red flags

| Observation | What it means |
|---|---|
| File says "we chose X" but never names an alternative | adjacent-problems axis is a gap |
| "See also" without a relation type | the link is decorative, not informative |
| RFC / paper cited without context | name-drop, not cross-reference |
| No "why not" lines for rejected alternatives | rejection criteria missing |
| Family boundary implicit or absent | the choice cannot be re-derived |
| Lens has `delta: {}` or `score: 0` | the experiment did not run; lens is aspirational |
| 40+ lenses all verdict=YES score=50 | experiment is degenerate |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | provides the 12-axis sweep framework; this skill owns axis #6 (Adjacent problems). NSS sweeps this axis on every cycle that asks for adjacent-problems gap finding. | negative-skill-space -> nss-adjacent-problems |
| `curve-compass-skill` | provides the lens-format patch generator and the Sigma ladder; this skill emits one lens per file in the same JSON shape. | curve-compass-skill <-> nss-adjacent-problems |
| `prior-art-search` | provides the survey/prior-art cross-reference convention; nss-adjacent-problems scores files against the prior-art channel. | nss-adjacent-problems <-> prior-art-search |
| `documentation-and-adrs` | ADRs are the canonical place to enumerate alternatives + rejection criteria; this skill scores ADRs against the rubric and pushes missing "why not" lines into the cycle-13 patch. | documentation-and-adrs <-> nss-adjacent-problems |
| `recursive-self-improvement` | the closing loop. nss-adjacent-problems proposes gaps; RSI applies the per-file patch. | nss-adjacent-problems -> recursive-self-improvement |
| `context-isolation` | when running the cycle-13 sweep, run each file's lens in a fresh-context subagent so author bias from prior cycles doesn't re-anchor. | context-isolation -> nss-adjacent-problems |

## Self-containment

Reads: nothing required (rubric + distinctions + lens schema embedded).
Writes: lens-format JSON per file. Depends on: stdlib only.

## Verification

```
python3.12 -c "import re; s=open('skills/github-yubios-KS9n5GAT/nss-adjacent-problems/SKILL.md').read(); assert re.match(r'^---\n.*name: nss-adjacent-problems\n.*description: .*', s, re.S); print('OK')"
```

Plus the lens output schema: lens, file, hypothesis, method, parameters, delta, verdict, score, caveat all present; verdict in {YES, PARTIAL, NO}; score 0-50; parameters.axis == "adjacent_problems".

## Changelog

- **1.0.0** (2026-08-12) -- initial. Built for RSI cycle 13 on PR #207. Establishes the Adjacent-problems axis rubric, the 0-5 level scale, the 10-dimension 0-20 score, the seven-relation taxonomy (intersection / analogy / abstraction / substitution / alternative / prior-art / extension), the lens-format patch format, and the cross-context invariance quality signal. Source synthesis: Springer typology of related-work relationships (intersection / interpretation / expansion / abstraction / reification / analogy / substitution), USPTO MPEP §904 analogous-art search practice, RFC 2119/8174 normative alternative enumeration, ACM secondary-research typology (systematic mapping, scoping review, snowballing), Relatedly diversity-aware related-work aggregation, SE taxonomy-mapping study, Google documentation style cross-reference conventions, SE competencies mapping study, and the prior-art-search + documentation-and-adrs skills in this corpus.

## Maintainer

Sauna, wave 2. Built against `negative-skill-space` SKILL.md (the 12-axis sweep framework), `curve-compass-skill` v1.1.0 (lens-format patch generator), the deepresearch output on adjacent-problems coverage (Springer typology of related work, USPTO MPEP §904, ACM secondary research, Relatedly aggregation, RFC 2119/8174, Google cross-reference style, SE taxonomy mapping, SE competencies mapping), and the cycle-7 PR #207 baseline (391 atomic per-file NSS patches already on the branch).
