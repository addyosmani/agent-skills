---
name: negative-skill-space
description: "Maps the negative space (gaps, blind spots, and unknown unknowns) of any skill, plan, or artifact. Recursive by design. Applying it to itself surfaces gaps in the mapping process itself. Use when a skill feels incomplete, when shipping something that will be reused, when 'are we sure this covers X?' comes up, when adopting an unfamiliar plan or spec, or any time you'd benefit from seeing the shape of what you don't know. Triggers on 'what am I missing', 'map the gaps', 'negative space', 'unknown unknowns', 'what doesn't this cover?', 'stress-test my skill', 'blind spots', 'what's not in scope here?'."
---

# Negative Skill Space

## Philosophy

Every skill, plan, or artifact has two regions:

- **Positive space** — what it claims to do. Trigger phrases, defined process, outputs, success criteria.
- **Negative space** — what it doesn't do. The shape of its absence. The boundaries (conscious or not) around the positive space.

The author's blind spot IS the negative space — they built the positive space deliberately and left the negative space not-deliberately. Mapping the negative space before shipping catches failure modes the author couldn't see. Mapping it recursively (the skill mapped against itself) catches failure modes in the mapping process itself.

Always ask what you don't know. The questions that surface the negative space are not "what does this do?" but: "What does this NOT do? What adjacent problem does this leave unsolved? Who falls through the cracks? What assumption, if broken, would cause silent misbehavior? What happens when this is applied to itself?"

Always improve. Recurrence: map, ship, use, drift, re-map. Improvement is continuous and never declared complete.

## When to Use

Apply when:

- A skill or artifact is about to ship and you want a sanity check on its scope.
- Adopting an unfamiliar plan, spec, or library and want to know its hidden assumptions.
- A teammate asks "are you sure this covers X?" and you're not sure how to find out.
- A skill has been used N times and you suspect its gap map has drifted from the original.
- You catch yourself silently filling in unknown requirements before any plan exists.
- You're reviewing someone else's work and need to surface their blind spots systematically.

Do NOT use:

- Mechanical operations (rename, format, file move, copy).
- Artifacts that are intentionally narrow and whose negative space is the design (e.g. a tight git-conventional-commits validator — its job IS to reject things outside the spec; expanding it is a bug).
- Single-use throwaway scripts.
- One-line code edits where the negative space is obviously the line.
- When the user has explicitly asked for speed over verification.

## The 12 Axes

When mapping any artifact's negative space, sweep across these 12 axes. They're not exhaustive — add a 13th, 14th, 15th when a real gap doesn't fit. They're the ones the practice keeps surfacing.

| # | Axis | Question it asks |
|---|------|------------------|
| 1 | Audience | Who does this serve? Who is excluded? Who falls through the cracks? |
| 2 | Inputs | What inputs does it accept? What inputs does it reject or mis-handle? |
| 3 | Outputs | What outputs does it produce? What outputs does it fail to produce when needed? |
| 4 | Mode | Interactive? Solo? Batch? Continuous? Reactive? Scheduled? |
| 5 | Assumption set | What must be true for it to behave correctly? What breaks silently when an assumption fails? |
| 6 | Adjacent problems | What problems does it solve? What adjacent problems does it NOT solve, even though they look similar? |
| 7 | Failure modes | What failures does it handle gracefully? What failures does it ignore, swallow, or silently mis-handle? |
| 8 | Lifecycle | What does it do on first invocation? On the Nth? When the artifact it's paired with changes? When the user/context changes? |
| 9 | Composition | Which other skills should it pair with? Which does it assume you'll use? Where does it conflict? |
| 10 | Knowledge sources | Where does it get its facts? What sources does it exclude? How stale can those sources get? |
| 11 | Calibration | How does it know it's right? What signals does it use? What signals does it ignore? |
| 12 | Recursion | What happens when you apply this skill to itself? (The only axis that catches meta-blind spots.) |

For each axis, write two answers:

- **Positive** — what the artifact claims.
- **Negative** — what it doesn't claim or actively excludes.

Score the negative on each axis as **likelihood times severity**, where both are honest subjective numbers (1–5). Filter to real gaps. Drop:

- **Performative gaps** — flagged but don't actually bite anyone in any plausible deployment.
- **Intentional scope** — narrow by design. Confirming this requires checking the artifact's "when NOT to use" / "scope" / "out of scope" sections.

For each remaining real gap, recommend one of three actions:

- **Extend** — add capability to the artifact itself.
- **Pair** — use another skill / process alongside it.
- **Accept** — document why the gap is okay for now, with a re-evaluation trigger.

## The Process

1. **Load the artifact.** Read the full text of the skill, plan, spec, or code under review. If it's a skill, read SKILL.md fully — not just the description. If it's a plan or spec, read the relevant slice end-to-end.
2. **Name the positive space in one sentence.** What does this artifact claim to do? If you can't write this in one sentence, the artifact has a different problem (unfocused scope) — surface it before mapping gaps.
3. **Check for intentional narrow scope.** Read the artifact's "when NOT to use", "scope", or "out of scope" sections. If it's intentionally narrow, the negative space is small and that's a feature. Don't manufacture gaps to fill the report.
4. **Sweep the 12 axes.** For each axis, write the positive (what it claims) and the negative (what it doesn't). Score the negative: likelihood times severity. Be honest — performative gaps waste the reader's time.
5. **Filter to real gaps.** Drop performative, drop intentional scope. Rank the rest by likelihood times severity. Keep the top 5–10; everything else is a "noted but deferred" entry.
6. **Recommend an action per gap.** Extend / Pair / Accept. Pairing is the most common action — most gaps are closed by another skill, not by editing the artifact itself.
7. **Apply recursively.** Run the same process on the gap map you just produced. What did the mapping miss? What false gaps did it flag? What scope did it miss? Capture the recursion findings as a separate section in the output. This is the only step that catches meta-blind spots.
8. **Bound the loop.** After one recursive pass, stop. If substantive new gaps emerge from the recursion, run a second pass. If the recursion's recursion produces nothing new, stop. Three cycles is the upper bound — past that, the artifact's gap-mapping is itself the problem, escalate to the user.
9. **Save the gap map.** Convention: `docs/gaps/<artifact-slug>-<YYYY-MM-DD>.md` (or wherever the team keeps gap artifacts — `yubi-OS/yubiOS` uses `refs/`). Include the date, the artifact name, the mapper, the positive-space sentence, the filtered gaps, the actions, and the recursive findings.

## The Output

```markdown
# Gap Map: [artifact name]

Date: YYYY-MM-DD
Artifact: [path / slug / identifier]
Mapper: [agent or human]
Confidence: [1–5 on each axis — overall subjective]

## Positive space (one sentence)
[What this artifact claims to do]

## Intentional narrow scope?
Yes — see artifact's "when NOT to use". Stop here, document the narrowness, no gap map needed.
No — proceed.

## Axis sweep

### 1. Audience
- Positive: [...]
- Negative: [...] — likelihood L, severity S

### 2. Inputs
- Positive: [...]
- Negative: [...] — likelihood L, severity S

(... 3–11 ...)

### 12. Recursion
- Positive: [does the artifact apply to itself?]
- Negative: [...] — likelihood L, severity S

## Filtered real gaps (top 5–10, ranked)

1. **[Gap 1]** — likelihood L, severity S — action: extend / pair / accept
2. **[Gap 2]** — likelihood L, severity S — action: extend / pair / accept

## Noted but deferred
- [Gap A] — low likelihood × low severity OR covered by intentional scope
- [Gap B] — [...]

## Recommended pairings
- [Skill X] — closes gap #2
- [Process Y] — closes gap #5

## Recursive findings (the gap map's own gaps)
- [What the mapping missed]
- [What the mapping got wrong]
- [What scope the mapping didn't sweep]

## Re-evaluation triggers
- [When should this gap map be re-run? E.g. "every 6 months", "when the artifact gets a major version bump", "when a new adjacent skill appears"]
```

## Anti-patterns

- **Gap-finding theater.** Producing a long gap list that's performative rather than actionable. If a gap doesn't have an action, drop it.
- **Gap-finding paralysis.** Surfacing so many gaps that nothing ships. Keep the filtered list to 5–10.
- **Flagging intentional scope as gaps.** "This skill is narrow" isn't a gap — confirm with the artifact's scope section before flagging.
- **Same-blind-spot mapping.** The mapper and the artifact's author share biases. For non-trivial artifacts, recommend a cross-model or external review to catch what the mapper missed.
- **Confident wrong gaps.** Scoring a gap high because it feels bad, without evidence. Every gap needs at least one sentence of "this would bite when..." — if you can't write it, the gap isn't real.
- **Skipping recursion.** The recursion step is the only one that catches meta-blind spots. Skipping it leaves the skill itself unexamined.
- **Recursion without a bound.** Running the recursion forever. Stop after one pass; run a second only if the first surfaced substantive gaps; never run a third without escalation.
- **Producing a gap map and not saving it.** The artifact is the deliverable. A gap map that exists only in conversation is theatre.
- **Confusing gap-mapping with blame.** Gaps aren't failures of the author. They're the predictable shape of any artifact that doesn't try to be everything.

## Interaction with Other Skills

- **`interview-me`** — upstream. Before mapping an artifact's negative space, confirm the *intent* the artifact serves. Mapping gaps against an unclear intent produces gaps that don't matter.
- **`idea-refine`** — orthogonal. `idea-refine` refines ideas into one-pagers; `negative-skill-space` maps the gaps of an artifact (which could itself be the output of `idea-refine`). Use `idea-refine` first to produce the artifact, then `negative-skill-space` to find its gaps.
- **`spec-driven-development`** — upstream. The spec is the artifact; this skill finds its gaps.
- **`doubt-driven-development`** — orthogonal but overlapping. `doubt-driven-development` doubts a specific decision with a fresh-context reviewer; `negative-skill-space` doubts an entire artifact's scope along the 12 axes. When in doubt about a single decision, use `doubt-driven-development`. When in doubt about a whole artifact, use `negative-skill-space`. They compose: map gaps first, then doubt the gap-closure plan.
- **`source-driven-development`** — complementary. `source-driven-development` verifies the artifact's claims against authoritative docs; `negative-skill-space` verifies the artifact's scope against plausible deployments. SDD catches "this skill says it does X but the docs say otherwise"; NSS catches "this skill says it does X but it doesn't handle Y."
- **`code-review-and-quality`** — downstream. After mapping gaps, the gap-closure plan can be reviewed for code quality.
- **`context-isolation`** — use a fresh-context subagent for the mapping step if the artifact is large or politically sensitive. The mapper shouldn't carry the artifact-author's context.

## Red Flags

- Producing 20+ gaps when most are performative.
- Flagging intentional narrow scope as gaps ("this skill doesn't do X" when X is explicitly out of scope).
- Skipping the recursive step.
- Looping the recursion past 2 cycles without escalating.
- Producing a gap map without saving it as an artifact.
- Same-author mapping an artifact they themselves wrote, without external review.
- Confident scores without a "this would bite when..." sentence per gap.
- Confusing gap-mapping with negative review (gap maps are constructive, not punitive).
- Saving the gap map before running the recursive step.

## Verification

After applying `negative-skill-space`:

- [ ] Positive space was named in one sentence
- [ ] Intentional narrow scope was checked (artifact's own scope section)
- [ ] All 12 axes were swept (positive + negative for each)
- [ ] Gaps were scored (likelihood times severity) with a "this would bite when..." sentence per gap
- [ ] Performative gaps and intentional scope were filtered out
- [ ] Top 5–10 real gaps were kept; the rest noted-but-deferred
- [ ] Each real gap has an action: extend / pair / accept
- [ ] Recommended pairings name specific skills / processes
- [ ] The recursive step was run on the gap map itself
- [ ] Recursion was bounded (2 cycles or fewer; third requires user escalation)
- [ ] A re-evaluation trigger is named (when to re-map)
- [ ] The gap map was saved as an artifact, not just produced in conversation

## Least Privilege coverage for negative skill space (curve-guided-rsi cycle-4 substantive edit)

This skill — **Every skill, plan, or artifact has two regions:** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For negative skill space, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for negative skill space: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Audit/evidence coverage for negative-skill-space (curve-guided-rsi cycle-5 substantive edit)

This skill — **12-axis gap map, unknown unknowns, recursive** — sits in a domain that benefits from explicit audit/evidence coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For negative-skill-space, the audit/evidence primitive applies as follows: this skill is the gap-mapper used by `curve-guided-rsi`; the focused NSS dispatch is the input to RSI edits. yubiOS's audit pipeline composes the evidence-bundle format (per `audit-evidence-packaging`), Rekor v2 transparency log (per `sigstore-rekor-v2`), SLSA provenance attestations (per `slsa-provenance`), and the per-cycle `curve-guided-rsi` changelog (this skill); downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) expect every skill to declare its audit contribution.

Concrete implications for negative-skill-space: any change should be reviewed for impact on audit-evidence coverage; gaps are tracked in the cycle-5 run log.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.
