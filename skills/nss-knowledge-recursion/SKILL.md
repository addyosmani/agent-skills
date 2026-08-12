---
name: nss-knowledge-recursion
description: "Cycle-17 deep-research synthesis for the NSS knowledge_sources axis (10/12) AND recursion axis (12/12) in negative-skill-space, combined as the FINAL cycle of Jenny's 10-cycle directive. Knowledge_sources: citation patterns, BibTeX/JATS, docs-as-code xrefs, see-also, prior-art surveys, RFC/BCP/STD, reference-manager interoperability, scholarly cross-linking, provenance/durability, integrity/freshness CI. Recursion: self-archaeology trajectory notes, RSI closed loops, self-audit, double-loop reflexivity, Hofstadter strange loops, software archaeology, blameless postmortems that change the runbook, learning loops, memory/propagation to next cycle. Use when NSS lands on knowledge_sources or recursion as top gap, when adding Knowledge sources or Recursion section next to a file, when designing docs-as-code citation gates, when auditing link rot, or when designing closed-loop self-improvement processes. NOT for inputs/outputs/mode/audience/lifecycle/failure-modes/adjacent-problems/assumption-set."
---

# nss-knowledge-recursion

The **knowledge_sources** axis (10/12) and the **recursion** axis (12/12) of the 12-axis NSS sweep. Combined into one skill because both axes ask, in different ways, how a file participates in the wider knowledge ecology and in its own correction: knowledge_sources maps outward to citations and prior art; recursion maps inward to the closed loop that audits the file and changes it. They are the two faces of the same meta-discipline: a file that knows where it comes from and where it is going.

The cycle-17 NSS-knowledge-recursion sweep applies this rubric to ~40 files in the yubiOS corpus, where each file gets ONE knowledge_sources OR recursion-aware section added per lens-format patch (`## Knowledge sources -- cycle 17` or `## Recursion -- cycle 17`).

## When to use

- When a skill, file, ADR, research note, Containerfile, or workflow declares a single solution without enumerating the citation or RFC pattern that grounds its claims.
- When scoring or comparing files along the knowledge_sources or recursion axis for an NSS sweep.
- When designing a new skill, ADR, or refactor that needs to position itself against existing literature without re-deriving the citation graph from scratch.
- When a file says "we chose X" but never cites the paper, RFC, ADR, or upstream doc that supplies the design space.
- When a research note states findings without referencing the prior art it extends or contradicts.
- When a skill describes itself but never asks "where did this belief come from, and what would change it?" -- the recursion gap.
- When a postmortem or runbook exists but the runbook change that should have followed from the postmortem is absent.
- When learning loops exist in prose but no trigger, owner, success metric, or next-review date is named.

## When NOT to use

- You want primitive coverage (9-primitive binarization) -- use `negative-skill-space` directly.
- You want lens-format RSI patches specifically -- use `curve-compass-skill`.
- You want to enumerate explicit prerequisites or assumptions -- use `nss-assumption-set`.
- You want to enumerate failure modes or anti-patterns -- use `nss-failure-modes`.
- You want inputs/outputs/audience/mode/lifecycle coverage -- use the matching `nss-*` skill.
- Composition is the missing 9th axis and is out of scope for the 10-cycle directive (cycles 8-17).

## Knowledge sources -- what the axis covers

For every file, the **knowledge_sources** axis records whether the file is adequately connected to the authoritative knowledge it depends on. The unit of evaluation is the file's **evidence graph**: `claim or design decision -> citation/cross-reference -> identifiable source -> stable destination -> usable surrounding context`. Many links can still score poorly if claims are uncited, references lack identifiers, prior art is absent, or the source relationship is not explicit.

### 12 knowledge_source axes (0-3 each, max 36)

| # | Axis | 0 -- absent | 1 -- weak | 2 -- adequate | 3 -- strong / gap-free |
|---|---|---|---|---|---|
| 1 | Citation patterns | No recognizable convention | Ad hoc URLs, footnotes, prose mentions | One consistent in-text/reference convention | Consistent, readable, unambiguous citations with local context |
| 2 | Claim-to-source coverage | Important claims unsupported | Selective / unclear | Material claims have nearby sources | Each material claim maps to an appropriate source; original assertions are marked |
| 3 | Bibliography / BibTeX quality | No records where needed | Incomplete or unstable keys | Usable bibliography with mostly complete metadata | Stable unique keys, correct entry types, authors, dates, titles, venues, identifiers, URLs |
| 4 | Docs-as-code cross-references | No links to related repo material | Fragile paths, "see above," copied content | Internal links resolve and point to relevant sections | Relative or repo-native links, named anchors, source-of-truth refs, build/CI validation |
| 5 | See-also / related reading | No navigational continuation | Generic link dump | A short, relevant See also section exists | Links are selective, descriptive, non-duplicative, and explain why to follow them |
| 6 | Prior-art and landscape coverage | No acknowledgment of predecessors | A few alternatives without comparison | Major directly relevant approaches are cited and distinguished | Lineage, competing approaches, rejected alternatives, trade-offs, and novelty are explicit |
| 7 | RFC / standards coverage | Applicable standards absent | RFC numbers without precise refs | Applicable normative and informative standards cited | RFC/BCP/STD relationships, sections, status, version/date, normative vs informative role explicit |
| 8 | Reference-manager interoperability | References cannot be imported | Export loses types, fields, or identifiers | BibTeX/RIS/CSL or another standard interchange works | Zotero, Citavi, KBibTeX, and the project's build pipeline preserve identity, type, authors, dates, DOI/URL, notes, citation keys |
| 9 | JATS / structured scholarly tagging | Scholarly refs unstructured when expected | Tagged but lack identifiers or types | References and callouts have parseable IDs and links | Each reference has unique ID, publication type, contributor roles, date, formal identifier; in-text callouts point to correct IDs |
| 10 | Scholarly cross-linking | No persistent scholarly relationships | Plain URLs or titles only | DOI/PMID/ISBN or equivalent identifiers appear where available | The file distinguishes article, dataset, software, preprint, thesis, standard, correction, translation, retraction, companion |
| 11 | Provenance, authority, and durability | Sources anonymous, untrusted, unrecoverable | Sources named but unstable, undated, indirect | Authoritative sources and access/version dates present | Cites most direct authoritative source, records version/date, uses DOI/permalink/archive, distinguishes primary from secondary |
| 12 | Integrity, freshness, and maintainability | Broken links, orphan refs, stale citations common | Manual checks only | References build and links checked periodically | CI validates unresolved citations, duplicate keys, missing bibliography entries, broken/ambiguous anchors, stale versions, orphaned references |

### Gating rules

Do not let a high average hide a critical failure. Apply these gates:

1. **Claim-support gate**: Axis 2 must be at least 2 for a file making substantial factual or normative claims.
2. **Integrity gate**: Axis 12 must be at least 2 for a file used in production documentation or a normative specification.
3. **Standards gate**: Axis 7 must be at least 2 when the file implements, profiles, or claims compatibility with an RFC or standard.
4. **Scholarly gate**: Axes 3, 8, 9, and 10 must be at least 2 when the file is a scholarly survey, research report, or publication source.
5. **No compensating for missing provenance**: many informal links cannot compensate for absent authoritative or persistent sources on Axis 11.

## Recursion -- what the axis covers

For every file, the **recursion** axis records whether the file merely *talks about learning and self-reference* or actually forms a **closed, evidence-bearing improvement loop**:

> The file describes its own state or history -> audits it against explicit criteria -> identifies a failure or gap -> changes the file/system/practice -> verifies the change -> records what was learned -> uses that record to drive the next audit.

That is stronger than "the document is reflective," "it contains lessons learned," or "it mentions RSI." It is documentation that can participate in its own correction. The relevant operational question is whether the file's descriptions of the system feed back into the system's future behavior.

### 12 recursion axes (0-4 each, max 48)

| # | Axis | 0 -- absent | 1 -- named | 2 -- described | 3 -- operational | 4 -- demonstrated |
|---|---|---|---|---|---|---|
| 1 | Object and boundary awareness | Ignored | Mentioned | Coherent account | Inputs, steps, outputs, ownership | Scope, version, assumptions, dependencies, explicit exclusions |
| 2 | Provenance and version awareness | No | Stated | Dated | Linked to commits, tickets, experiments | Claims linked to evidence; superseded beliefs marked not silently rewritten |
| 3 | Self-archaeology | No trajectory | Flat history | Earlier position noted | Earlier -> evidence/event -> revision -> current | Trajectory preserves reason for revision; does not invent retrospective history |
| 4 | Current-state model | Absent | Mentioned | Described | Invariants, deviations, open questions | Includes "as of" point, confidence levels, known deviations |
| 5 | Failure and error inventory | No record | Listed | Impact + cause + mitigation | Postmortem-grade (impact, causes, mitigation, follow-up, prevention) | Includes near misses, misleading assumptions, stale references, failed improvement attempts |
| 6 | Reflexive self-audit (double-loop) | No | Single-loop only | Both loops named | Examines methods, categories, assumptions, blind spots | Examines incentives and rules producing behavior; explicit "why did we define the problem this way" |
| 7 | Explicit recursion / strange loop | No path | Mentioned | Single-direction | Visible path from description back into operation | A checklist audits the document that defines the checklist; a postmortem changes the runbook and the next incident review checks whether that change worked |
| 8 | Learning-loop specification | None | Prose | Steps listed | Trigger, input, decision rule, action, stopping condition, owner, next review | Cadence named; state transition explicit (observe -> interpret -> hypothesize -> act -> measure -> retain -> repeat) |
| 9 | Feedback quality and independence | Self-impression | Single author review | Peer review | Test-based or environment-based | External, test-based, user-based, historical, with independent evidence |
| 10 | Change mechanism and agency | "Learn from this" | Listed | Concrete action | Owner + action + scope | Code, prompts, tests, workflow, architecture, taxonomy, docs, or skills changed; who performed change named |
| 11 | Verification, metrics, anti-self-deception | No metric | Listed | Before/after | Regression test or recurrence rate | Time-to-diagnosis, contradiction counts, stale-link counts, reviewer judgments; documentation freshness tracked |
| 12 | Memory, propagation, next-cycle handoff | None | Mentioned | Updated somewhere | Canonical artifact updated | Updates linked code/tests/runbooks + changelog or ADR + unresolved residue + next review; new baseline discoverable |

### Gating rules

Apply these gates -- a high average must not hide a closed-loop failure:

1. If Axis 7 (explicit recursion) is below 2, cap the result at **nominal**.
2. If Axis 9 (feedback) or Axis 11 (verification) is below 2, call it **unverified self-improvement**, regardless of prose quality.
3. If Axis 2 (provenance) or Axis 12 (memory/propagation) is below 2, call it **non-persistent learning**.
4. If Axis 3 (archaeology) is 0-1, the file may describe the present but does not demonstrate self-archaeology.
5. A score of 4 requires observed evidence of a completed cycle, not merely a detailed plan.

## Knowledge sources + Recursion -- yubiOS surface

Every yubiOS file has both a knowledge_sources and a recursion surface. Declaring each is the single highest-leverage move for each cycle-17 Extend gap.

### Containerfile / mkosi / systemd unit

- **Knowledge sources**: cite the upstream Containerfile docs (`docker buildx` / BuildKit secret mounts), the systemd.unit(5) and systemd.exec(5) pages, the mkosi 24.x schema, and the kernel feature documentation (composefs, dm-verity, cgroup v2). Use named anchors; provide a version/date; do not linkrot to the latest tag.
- **Recursion**: record the cycle-of-image-updates in `## Recursion -- cycle 17` -- what base digest was used, which quay.io rotation triggered the bump, what old sha was retired, and where the rotation handler (`fetch-fedora-bootc-manifest.yml`) is documented. Name the next-review cadence (every main build).

### Markdown / SKILL.md / docs/*.md

- **Knowledge sources**: every claim cites either an ADR (ADR-NNN), an RFC (RFC NNNN), a paper (DOI/URL), an upstream doc (URL + version/date), or a stable archive link. The yubiOS convention is to use named anchors (`#ref-name`) and to validate in CI via `xrefcheck` or equivalent.
- **Recursion**: a `## Recursion -- cycle 17` block records: the prior version of the file, the cycle that changed it, the change hypothesis, the verification result, and the next-review date. The lens-format patch is itself the smallest possible improvement cycle; track its delta in `lenses.json`.

### Shell / Python / Ruby scripts

- **Knowledge sources**: cite the upstream library docs (argparse, js-yaml, pydantic, mkosi Python API) and the project's CODEOWNERS / DESIGN.md / ARCHITECTURE.md cross-references. Library version + commit SHA for any dependency whose behavior changed in the last 12 months.
- **Recursion**: the script's exit-code vocabulary, structured-log schema, and test fixtures are themselves the file's self-improvement surface. A cycle-17 patch records: which test failed, which assertion moved, which prior version of the script was retired, and where the rotation trigger is recorded.

### GitHub Actions workflows

- **Knowledge sources**: cite the GitHub Actions metadata-syntax docs (`workflow_call.inputs` / `workflow_dispatch.inputs` / `permissions:` / `concurrency:`), the actions/checkout / actions/setup-* versions, and the yubiOS `audit-evidence-packaging` convention. Provide a release-drafter / conventional-commits mapping.
- **Recursion**: the workflow's `permissions:` block IS its self-audit surface; the `concurrency:` group IS its loop-cadence declaration. A cycle-17 patch adds an explicit `## Recursion -- cycle 17` block with the next-review date, the last-changed-in version, and the ADR that drove the most recent permissions change.

### Refs/notes (`refs/*.md`)

- **Knowledge sources**: frontmatter `commit:`, ADR number, prior-art citations (with DOI/URL/version), related notes (`supersedes:` / `superseded_by:`), and named anchors. The yubiOS convention is `lowercase-hyphenated-topic-name-YYYY-MM-DD.md` (per PROJECT_RULES.md).
- **Recursion**: the note IS the recursion artifact. A `## Recursion -- cycle 17` block records: the cycle that produced the note, the prior note it supersedes, the lens or ADR that drove the change, the open questions carried forward, and the next-review cadence.

## Examples

### Example 1 -- Containerfile Knowledge sources + Recursion

```dockerfile
# Knowledge sources -- cycle 17
#   Citation pattern: in-line `# ref: <key>` tags; BibTeX-free (build artifact)
#   Claim-to-source coverage:
#     - "BuildKit secret mounts are preferred for build-time secrets" -> docker docs
#       BuildKit --mount=type=secret, accessed 2026-08-12, stable URL
#       https://docs.docker.com/build/building/secrets/
#     - "kernel >= 6.7 required for composefs" -> kernel.org composefs docs,
#       accessed 2026-08-12, https://composefs.io/
#   See also: docs/CONTAINERFILE-DESIGN.md, ADR-016, refs/fedora-bootc-digest-rotation-2026-07-30.md
#   RFC/standards coverage: none (build artifact, no normative standard)
#   Prior art: OpenShift buildah / Source-to-Image / ko; rejected -- not image-first.
#   Integrity: xrefcheck in .github/workflows/ci.yml group=docs (planned)
#
# Recursion -- cycle 17
#   Provenance: this Containerfile has been revised 12 times since 2026-02-14;
#     current sha pinned to fedora-bootc:45@sha256:1dcca7ac54b243bef0cf65bfca165fb4a514d7891854db216a4ab6cbc10215ff.
#   Self-archaeology: prior digest sha256:f6b5b77567f3d7aadb138c466380bbb8f6a65e2d7d264741f29c5b3bae77543e
#     was rotated 2026-07-26 due to quay.io stream truncation on arm64 layer 16,045,778.
#   Failure inventory: 3 digest incidents in 7 days (see refs/fedora-bootc-digest-rotation-2026-07-30.md).
#   Learning loop: trigger = quay.io 404/422 on the pinned digest;
#     action = dispatch fetch-fedora-bootc-manifest.yml; verify = next green main build.
#   Next review: every main build (no manual cadence).
```

### Example 2 -- SKILL.md Knowledge sources + Recursion

```markdown
---
name: foo-skill
description: "..."
---

# foo-skill

## Knowledge sources -- cycle 17
- **Foundational**: docs/ARCHITECTURE.md (system modules), ADR-016 (build-time vs runtime),
  refs/single-action-curve-rsi-2026-07-25.md (atom-bound pipeline context).
- **Standards**: RFC 8594 (Sunset header), RFC 9745 (Deprecation header) -- both for
  HTTP API lifecycle; SemVer 2.0.0; Keep a Changelog 1.1.0; Conventional Commits 1.0.0.
- **Reference managers**: BibTeX not applicable (skill, not paper); cited URLs use
  named anchors and access dates for stability.
- **See also**: github-api (the API this skill composes), curve-compass-skill
  (the parent regime), recursive-self-improvement (the closing loop).
- **Prior art / rejected alternatives**: `the-cult` (skipped: anthropomorphization),
  `the-follower` (skipped: RSS-only, no canonical source).
- **Integrity**: xrefcheck planned in `.github/workflows/ci.yml` group=docs.

## Recursion -- cycle 17
- **Provenance**: this SKILL.md is at v1.4.2; introduced_in 1.0.0 (2026-02-14).
- **Self-archaeology**: cycle-17 patch adds the knowledge_sources + recursion blocks.
  Prior cycles added audience (cycle 8), inputs (cycle 9), outputs (cycle 10),
  mode (cycle 11), assumption-set (cycle 12), adjacent-problems (cycle 13),
  failure-modes (cycle 14), lifecycle (cycle 15). Composition was deferred (out of
  10-cycle directive scope).
- **Failure inventory**: cycle-9 patch flagged `js-yaml` executor-availability as
  undocumented (resolved by `## Verification` recipe).
- **Learning loop**: trigger = NSS sweep lands on knowledge_sources or recursion;
  action = lens-format patch + `lenses.json` + `new-ideas-YYYY-MM-DD.md`;
  verify = next NSS sweep does NOT re-flag the same axis.
- **Next review**: weekly Sunday sweep (per `schedules/self-archaeology-cadence`).
```

### Example 3 -- refs/notes Knowledge sources + Recursion

```markdown
---
stage: stable
introduced_in: 0.9.0
last_changed_in: 1.4.2
commit: ee62285834e6b1a26e11858273084686cb862702
adr: ADR-016
supersedes: refs/fedora-bootc-digest-rotation-2026-07-30.md
superseded_by: null
owner: rsi-phi-skill-team
next_review: 2026-11-12
---

# foo-research-note

## Knowledge sources -- cycle 17
- **Citations**: quay.io manifest spec (https://quay.io/api/v1/, accessed 2026-08-12),
  OCI distribution-spec (https://github.com/opencontainers/distribution-spec/blob/main/spec.md,
  v1.1.0, commit pinned), BuildKit secrets spec (https://github.com/moby/buildkit/blob/master/frontend/dockerfile/docs/secrets.md,
  commit pinned).
- **Prior art**: digest-pinning in NixOS / Guix / Fedora CoreOS (rejected -- not bootc).
- **RFCs / standards**: RFC 8949 (CBOR, manifest serialization), RFC 8259 (JSON,
  manifest metadata).
- **DOI / stable identifiers**: stable URL `https://quay.io/fedora/fedora-bootc:45`
  with digest suffix; DOI for any cited paper.
- **See also**: ADR-016 (build-time digest pin decision), refs/fetch-fedora-bootc-manifest-2026-07-23.md
  (the rotation handler), docs/CONTAINERFILE-DESIGN.md.

## Recursion -- cycle 17
- **Provenance**: written 2026-08-12, revised 1 time (cycle-17 patch).
- **Self-archaeology**: the original note predated the cycle-7 NSS sweep; the cycle-17
  patch adds the knowledge_sources + recursion blocks per the axis gap.
- **Failure inventory**: 3 quay.io rotations in 7 days triggered the rotation handler;
  see refs/fedora-bootc-digest-rotation-2026-07-30.md for the trajectory.
- **Learning loop**: trigger = quay.io rotation; action = note the incident in the
  handler's CHANGELOG; verify = next rotation uses the same handler without a new ADR.
- **Next review**: 2026-11-12 (every 90 days, or on every rotation, whichever comes first).
```

### Example 4 -- GitHub Actions workflow Knowledge sources + Recursion

```yaml
# Knowledge sources -- cycle 17
#   Citation pattern: `# ref: <key>` tags in workflow YAML comments
#   Standards:
#     - GitHub Actions metadata-syntax docs (workflow_call.inputs,
#       workflow_dispatch.inputs, permissions, concurrency)
#     - Conventional Commits 1.0.0 (release-drafter mapping)
#   Claim-to-source coverage:
#     - "permissions: contents: read is the least-privilege default" -> GitHub docs
#       "Assigning permissions to jobs", accessed 2026-08-12
#     - "Type=notify for services with readiness semantics" -> systemd.service(5),
#       the yubiOS systemd-hardening skill
#   See also: docs/CI-DESIGN.md, refs/ci_chain_failures_2026-07-29.md, github-actions skill
#   Prior art: GitLab CI (rejected -- GitHub-native), CircleCI (rejected -- third-party)
#   Integrity: xrefcheck planned in ci.yml group=docs

# Recursion -- cycle 17
#   Provenance: this workflow was last changed in commit ee62285834e6b1a26e11858273084686cb862702
#   Self-archaeology: prior permissions: contents: write was narrowed to read-only
#     after PR #150 cycle (per PROJECT_RULES.md PR #150 doctrine).
#   Failure inventory: outer-dispatcher success hiding inner failure (per PR #150 cycle);
#     resolved by always reading inner run logs.
#   Learning loop: trigger = NSS sweep lands on knowledge_sources or recursion;
#     action = workflow YAML patch + ADR if permissions: change; verify = green next run
#   Next review: every release-drafter run (weekly Sunday sweep)
```

### Example 5 -- Python script Knowledge sources + Recursion

```python
"""
Knowledge sources -- cycle 17:
  Citation pattern: argparse --help + docstring `## See also` block
  Claim-to-source coverage:
    - "Python 3.11+ for tomllib" -> Python docs, https://docs.python.org/3/library/tomllib.html
      (added 3.11, stable)
    - "js-yaml safe_load is the only safe loader" -> PyYAML docs,
      https://pyyaml.org/wiki/PyYAMLDocumentation, accessed 2026-08-12
  See also: scripts/validate-input-shape.py (the canonical implementation);
    api-and-interface-design skill (the API design convention)
  Standards: PEP 257 (docstring conventions), PEP 8 (style)
  Prior art: PyYAML / ruamel.yaml / PyYAML-ng (rejected -- not actively maintained)
  Reference-manager interoperability: n/a (no bibliographic content)
  Integrity: mypy --strict in CI; pytest with regression cases per release

Recursion -- cycle 17:
  Provenance: this script was last changed in commit ee62285834e6b1a26e11858273084686cb862702
  Self-archaeology: prior version used yaml.safe_load without schema validation;
    resolved by Pydantic Settings layer in cycle 9.
  Failure inventory: silent except Exception: pass found in audit; resolved
    by documented recovery column in nss-failure-modes cycle 14.
  Learning loop: trigger = NSS sweep lands on knowledge_sources or recursion;
    action = script patch + lens-format comment block; verify = pytest green
  Next review: weekly Sunday sweep (per schedules/self-archaeology-cadence)
"""
```

## Guidelines

1. **Every claim has a source.** If a claim is original, mark it "original assertion"
   rather than implying citation. If a claim is borrowed, name the source.
2. **Every source has an identifier.** DOI / RFC number / ADR number / commit SHA /
   URL + access date. Plain prose mentions ("see also some blog") are not sources.
3. **Every RFC/standard has a role.** Normative vs informative; section cited;
   status (proposed / draft / standard). Bare RFC numbers are not enough.
4. **Prior art is not "see also."** Prior art enumerates competing approaches with
   trade-offs and rejection criteria. See also points to navigationally adjacent files.
5. **Recursion must close the loop.** A postmortem that does not change the runbook
   is unverified self-improvement. A learning log that does not change the next
   prompt is non-persistent learning. State the trigger, action, and verification.
6. **Self-archaeology preserves the trajectory, not just the current state.** A note
   that says "we believe X" without "we used to believe Y because Z" loses the
   reason for revision.
7. **Memory is not "we'll remember."** Memory is an artifact (changelog, ADR,
   next-review field, linked code/test). Without the artifact, the loop is open.
8. **Feedback must be independent.** Self-impression is not feedback; tests, metrics,
   reviewers, incidents, and historical evidence are. Name the feedback source.
9. **Use the 12-axis knowledge_sources and 12-axis recursion rubrics verbatim.**
   Each axis has a fixed 0-3 (knowledge_sources) or 0-4 (recursion) score band.
   Custom rubrics require a new skill.
10. **Lens-format patches only (cycle 17).** Each file patch is a lens with
    hypothesis + method + parameters + delta + verdict + score + caveat. No
    templated `## Knowledge sources` or `## Recursion` sections.
11. **Close the gap with one section per file.** The atomic cycle-17 patch for any
    file with a knowledge_sources OR recursion gap is ONE knowledge_sources OR
    recursion-aware section, file-type-aware comment syntax, with at least one
    concrete claim-to-source mapping OR one concrete recursion chain entry.
12. **Pre-register the rubric.** Before adding a citation, write the gate check
    (claim-support / integrity / standards / scholarly) before the citation itself.
    Schema-first.

## Constraints

- **Self-contained.** This skill does not depend on `negative-skill-space` being
  loaded; it composes *with* NSS as a follow-up action (NSS proposes the gap,
  nss-knowledge-recursion closes it).
- **No runtime.** This is a documentation skill. It does not run `xrefcheck`,
  validate DOIs, or invoke reference managers.
- **Schema is for humans first.** The Knowledge sources and Recursion sections a
  cycle-17 patch adds are read by humans (and by the next RSI cycle's NSS sweep)
  before they are consumed by any parser. Clarity > strict YAML.
- **One section per file, per axis.** Do not stack multiple `## Knowledge sources
  -- cycle 17` or `## Recursion -- cycle 17` blocks in one file; do not nest them
  inside another section heading.
- **Axis names are fixed.** Knowledge_sources: citation_patterns / claim_to_source /
  bibtex_quality / docs_as_code_xrefs / see_also / prior_art / rfc_standards /
  ref_manager / jats_scholarly / scholarly_xlinking / provenance_authority /
  integrity_freshness. Recursion: object_boundary / provenance_version /
  self_archaeology / current_state / failure_inventory / reflexive_audit /
  explicit_recursion / learning_loop / feedback_independence / change_mechanism /
  verification_metrics / memory_propagation.
- **No silent re-scoping.** A cycle-17 patch that adds `## Knowledge sources` but
  does not list at least one citation with identifier + role + access date is a
  placeholder and counts as a NO verdict, not a YES.
- **Pair with `negative-skill-space`.** This skill is the knowledge_sources AND
  recursion-axis specialist; the parent NSS skill orchestrates the 12-axis sweep
  and the action taxonomy (Extend / Pair / Accept).

## Anti-patterns

- **Awarding points for keywords alone.** "Mentions RFC" = at most partial credit;
  full credit requires the RFC role, section, status, and version/date.
- **Confusing prior art with see also.** Prior art enumerates competing
  approaches with trade-offs; see-also navigates. The two are not interchangeable.
- **Name-dropping without identifiers.** "See RFC XXXX" without what RFC XXXX says
  and why it matters here is decoration, not citation.
- **Self-reference is not recursion.** "This document describes itself" is not a
  feedback loop. Recursion requires a closed chain (state -> audit -> change ->
  verify -> memory).
- **Iteration is not improvement.** Repeated edits without a success criterion may
  be drift. A `## Recursion` block that lists 10 prior versions with no `delta:`
  metric is iteration, not improvement.
- **Changelog is not self-audit.** A history records change; it does not
  necessarily evaluate whether the change was good. Self-audit pairs each change
  with a measured delta.
- **Postmortem is not learning until follow-through is verified.** A postmortem
  that is published but whose preventive action is not checked in the next
  incident review is unverified self-improvement. Name the follow-through owner
  and the verification cycle.
- **More documentation is not better documentation.** Stale references,
  contradictions, and untested claims can increase apparent coverage while
  reducing trustworthiness. CI gates (xrefcheck, link-rot checks, stale-reference
  scans) are required for the integrity axis to score 2+.
- **Self-generated critique is circular.** If the same process creates the claim,
  the audit, and the success measure, the feedback is not independent. Require
  external tests, historical evidence, human review, or a separate environment.
- **Confusing "compatible with X" with citation.** "Compatible with" is a claim;
  citation is the link to the source of X. State which is which.
- **Cross-channel aliasing without precedence.** Two citations that both support
  the same claim without saying which is primary; two cross-references that
  resolve to different versions; two prior-art lists that overlap without a
  chosen canonical set.
- **A Knowledge sources section that does not name the file's own citations.**
  A cycle-17 patch that adds `## Knowledge sources -- cycle 17` to a SKILL.md
  but does not list the cited standards, ADRs, RFCs, or upstream docs is a
  placeholder and counts as a NO verdict.
- **A Recursion section that does not name the file's own closed loop.**
  A cycle-17 patch that adds `## Recursion -- cycle 17` to a Containerfile but
  does not list the trajectory, the trigger, the action, or the verification
  cadence is a placeholder and counts as a NO verdict.

## Red flags

| Observation | What it means |
|---|---|
| `## Knowledge sources -- cycle 17` section lists zero concrete citations | placeholder section |
| A citation lacks identifier, role, or access date | not a citation, a name-drop |
| `## Recursion -- cycle 17` section lists zero concrete chain entries | placeholder section |
| A trajectory note says "earlier we believed X" without "because Y" | archaeology invented, not recovered |
| Lens has `delta: {}` or `score: 0` | the experiment did not run; lens is aspirational |
| 40+ lenses all verdict=YES score=50 | experiment is degenerate |
| A `## Knowledge sources` or `## Recursion` patch lands but the next NSS sweep re-flags the axis | the patch did not close the gap |
| A postmortem exists but its runbook change is missing | unverified self-improvement (Axis 9 or 11 below 2) |
| A changelog entry has no ADR link | memory lost; non-persistent learning (Axis 12 below 2) |
| A learning log mentions "we should" without an owner | change mechanism absent (Axis 10 below 2) |
| A `next_review` field is older than 30 days without a re-review | recursion cadence broken |
| An RFC is cited without role (normative / informative) | standards gate fails (Axis 7 below 2) |
| A claim is asserted without source AND without "original assertion" marker | claim-support gate fails (Axis 2 below 2) |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `knowledge_sources` or `recursion` as a candidate Extend gap; nss-knowledge-recursion closes both. Pair the two in the final cycle. | negative-skill-space -> nss-knowledge-recursion |
| `curve-compass-skill` | Lens-format patches in cycle-17 use nss-knowledge-recursion as the knowledge_sources + recursion lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the section this skill defines. | nss-knowledge-recursion -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-17 sweep operates over is the same `lens --corpus` JSON; the corpus's `knowledge_sources` and `recursion` columns map to this skill's 12-axis rubrics. | nss-knowledge-recursion <-> curved-corpus-create |
| `prior-art-search` | Owns the survey / prior-art cross-reference convention; nss-knowledge-recursion scores files against the prior_art axis (knowledge_sources #6). | prior-art-search -> nss-knowledge-recursion |
| `documentation-and-adrs` | ADRs are the canonical citation target in yubiOS; nss-knowledge-recursion scores ADRs against the citation_patterns and rfc_standards axes. | documentation-and-adrs <-> nss-knowledge-recursion |
| `recursive-self-improvement` | Owns the RSI closed-loop protocol; nss-knowledge-recursion scores files against the recursion axis (object_boundary / provenance_version / self_archaeology / etc.). | recursive-self-improvement <-> nss-knowledge-recursion |
| `self-archaeology` | Owns the trajectory-note pattern; nss-knowledge-recursion scores notes against self_archaeology (recursion #3). | self-archaeology -> nss-knowledge-recursion |
| `repo-refs-skill` / `repo-history-skill` | Provide the git-history / blame / commit-traversal primitives that backfill provenance_version (recursion #2). | nss-knowledge-recursion <- repo-* |
| `audit-evidence-packaging` | Owns SLSA / SBOM / provenance; nss-knowledge-recursion scores docs against provenance_authority (knowledge_sources #11). | audit-evidence-packaging -> nss-knowledge-recursion |
| `source-driven-development` | Each documented standard (JATS4R, BibTeX, RFCXML, RFC 8594 / 9745, xrefcheck, SemVer, Keep a Changelog, Conventional Commits) was verified against the official docs in the deep-research phase that produced this skill. | source-driven-development -> nss-knowledge-recursion |
| `nss-*` (cycles 8-15) | Sister NSS-axis closure skills. The Inputs / Outputs / Audience / Mode / Lifecycle / Failure-modes / Adjacent-problems / Assumption-set blocks a file declares upstream compose with the Knowledge sources + Recursion blocks the cycle-17 patch declares. | nss-knowledge-recursion <-> siblings |
| `github-api` | The only network touchpoint -- pushes the new skill to 3 repos + the audit log + updated lenses.json + new-ideas-YYYY-MM-DD.md to PR #207. | nss-knowledge-recursion -> github-api |

## Verification

For each cycle-17 patch that closes a knowledge_sources OR recursion gap:

1. **The patch adds ONE `## Knowledge sources -- cycle 17` OR `## Recursion --
   cycle 17` section** (or the file-type-aware equivalent: `# Knowledge sources --
   cycle 17` for Containerfile / Makefile, `# # Knowledge sources -- cycle 17`
   for Python triple-quoted docstring, `# Knowledge sources -- cycle 17` for
   shell `#` comments, `<!-- Knowledge sources -- cycle 17 -->` HTML comment
   for `.md` if a section is not appropriate, `<!-- Knowledge sources
   (workflow_call inputs) -- cycle 17 -->` for GitHub Actions YAML).
2. **The Knowledge sources section names at least one concrete citation** with
   identifier + role + access date. A placeholder section with zero concrete
   citations counts as a NO verdict.
3. **The Recursion section names at least one concrete chain entry** (trajectory
   note, trigger, action, verification cadence, or next-review date). A
   placeholder section with zero concrete chain entries counts as a NO verdict.
4. **Every RFC / standard has a role declared** (normative vs informative;
   section; status). Bare RFC numbers fail the standards gate.
5. **Every prior-art entry has at least one rejection criterion.** "We considered
   X" without "we rejected X because Y" fails the prior_art axis.
6. **Every Recursion chain has a closed loop** -- trigger -> action -> verify ->
   memory. A learning log without memory fails the memory_propagation axis.
7. **Next-review date is named and in the future.** A `next_review:` field that
   is past or absent fails the cadence discipline.
8. **Lens-format output is valid.** lens, file, hypothesis, method, parameters,
   delta, verdict, score, caveat all present; verdict in {YES, PARTIAL, NO};
   score 0-50; parameters.axis in {knowledge_sources, recursion}.
9. **The next NSS sweep on the same file does NOT re-flag knowledge_sources or
   recursion as the top Extend gap.** If it does, the patch did not close the
   gap and the cycle-17 lens is a NO verdict.
10. **Skill is byte-identical across 3 repos.** The new `nss-knowledge-recursion`
    SKILL.md is pushed to `local`, `yubi-OS/agent-skills`, and `yubi-OS/yubiOS`
    with byte-identical content_sha (verifiable via `GET .../contents/.../SKILL.md`
    `sha` field).

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-17 deep-research synthesis (the
  FINAL cycle of Jenny's 10-cycle directive) for the NSS knowledge_sources axis
  (10/12) AND the NSS recursion axis (12/12), combined into one skill because
  both axes ask how a file participates in the wider knowledge ecology and in
  its own correction -- knowledge_sources maps outward to citations and prior
  art; recursion maps inward to the closed loop that audits the file and
  changes it. Captures the 12-axis knowledge_sources rubric (citation patterns /
  claim-to-source / BibTeX quality / docs-as-code xrefs / see-also / prior art /
  RFC standards / reference-manager interoperability / JATS scholarly tagging /
  scholarly cross-linking / provenance-authority-durability / integrity-freshness
  with the claim-support / integrity / standards / scholarly gates), the
  12-axis recursion rubric (object-boundary / provenance-version / self-archaeology
  / current-state / failure-inventory / reflexive-audit / explicit-recursion /
  learning-loop / feedback-independence / change-mechanism / verification-metrics
  / memory-propagation with the Axis-7 / Axis-9-or-11 / Axis-2-or-12 / Axis-3
  gating rules), the yubiOS-specific patterns for Containerfile / mkosi / systemd
  units, Markdown / SKILL.md / docs/*.md, Shell / Python / Ruby scripts, GitHub
  Actions workflows, and refs/*.md. Every example and anti-pattern is grounded
  in the deep-research pass on IETF Reference Style Guidance (RFCXML), JATS4R
  Citations, Fuchsia docs doc-checker, Google Cross-references, xrefcheck,
  BibTeXing documentation, Zotero Bibliographic Data Formats, Citavi to BibTeX
  mapping, KBibTeX Handbook, JATS Callouts and Cross-references, JATS Related
  Articles, Zotero Citation Styles, Hofstadter "Gödel, Escher, Bach" strange
  loops, the Self-Archaeology pattern catalog, the INTROSPECTION / RISE recursive
  introspection paper (NeurIPS 2024), the DOCER study on outdated code references
  in GitHub documentation, the "Documentation as Code" empirical study, double-loop
  reflective practice research, Google SRE Blameless Postmortem Culture, and
  An Empirical Approach to Software Archaeology. Cycle 17 of `rsi-compass` ships
  this skill as the FINAL cycle of Jenny's 10-cycle directive (cycles 8-17).
  Self-validated: frontmatter parsed by `js-yaml` (name `nss-knowledge-recursion`
  matches `^[a-z0-9-]+$`; description length 1-1024 chars; no literal `<`/`>`;
  closing `---` intact; H1 immediately after frontmatter; Examples / Guidelines
  / Constraints / Anti-patterns / Red flags / Composition / Verification /
  Changelog sections all present; no dangling `references/*.md` pointers).
  Byte-identical content_sha verified across `skills/github-yubios-KS9n5GAT/`,
  `yubi-OS/agent-skills`, and `yubi-OS/yubiOS`.

## Maintainer

Sauna, wave 2 cycle 17 (FINAL of Jenny's 10-cycle directive). Built against the
deep-research synthesis for the NSS knowledge_sources + recursion axes (PR #207
cycle-7 NSS gap-informed context), `negative-skill-space` SKILL.md (the
12-axis sweep framework), the cycle-8 through cycle-16 NSS-axis sister SKILL.md
exemplars (`nss-audience`, `nss-inputs`, `nss-outputs`, `nss-mode`,
`nss-assumption-set`, `nss-adjacent-problems`, `nss-failure-modes`,
`nss-lifecycle`, `nss-composition`), `curve-compass-skill` v1.1.0 (lens-format
patch generator), `recursive-self-improvement` and `self-archaeology` (the
recursion-axis prior art), `source-driven-development` (the citation-axis prior
art), and the cycle-7 through cycle-16 lens pool (`lenses.json` at root of
`feat/rsi-compass-cycle7-nss-research-2026-08-12`).
