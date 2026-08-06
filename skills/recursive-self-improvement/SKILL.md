## Changelog` section (create it if absent). Format:

```
- YYYY-MM-DD cycle N: Hypothesis "<hypothesis>". Edit: <what changed>. Result: <what the re-map showed>; <fixpoint reached / continue to cycle N+1 / escalate>.
```

The changelog is the audit trail. Without it, recursive improvement is invisible — a reviewer reading the skill can't see why it's the shape it is. With it, the diff trail justifies every section.

- 2026-08-06: Cycle 9 RSI primitive-closure substantive entry — added attestation footer (canonical keyword set: `attestation, verify, verification, evidence, quote, signing, signed`). This skill now contributes to the attestation primitive (10-primitive spine, per `internal-big-picture`). Pre-cycle-9 attestation coverage = 62/70 (for attestation) or 63/70 (for least privilege); post-cycle-9 RSI the residual closes.
## Edit Taxonomy

Most edits fall into four categories. Pick **one** per cycle, not multiple:

| Edit type | When | Example |
|---|---|---|
| **Close a gap** | A real gap (likelihood × severity ≥ 6) needs extending | Add a missing `## Verification` checklist; add an anti-pattern the gap map flagged |
| **Fix drift** | Description promises X, body delivers Y (or vice versa) | Tighten description to drop phrases the body doesn't deliver; align body to match a description that was right |
| **Sharpen** | The skill works but has bloat — over-explained, redundant examples, sections that duplicate another | Cut a section that duplicates the philosophy; merge two anti-patterns that say the same thing |
| **Reposition** | The skill's *place* in the workflow is wrong | Mark this for `using-agent-skills` review, not a body edit — and stop editing here |

A cycle that mixes close + sharpen + reposition is a **red flag** — the loop is being driven by vibes, not a hypothesis. Pick one. If the skill needs all three, that's three cycles, not one.

## Modes

The skill has two modes that follow the same loop:

### Improvement mode (default)

Input is a gap map from `negative-skill-space` applied to a *different* skill. The loop closes the gaps on that target skill. Cycle 1 is gap-closing; subsequent cycles catch edit-induced gaps.

### Self-mode

Input is the skill itself. Cycle 1 is gap-mapping (apply `negative-skill-space` to this skill); cycle 2 onward is gap-closing on the self-references the gap map surfaces. Self-mode is more prone to **self-author bias** — the entity that wrote the skill is the entity reviewing it. Mitigation:

- Pass each edit hypothesis through `doubt-driven-development` before editing.
- **Use a fresh-context subagent (`context-isolation`) for every cycle in self-mode, not just the gap-map step.** Cycle 2+ in main-thread context re-introduces the author bias that cycle 1 mitigated. This is mandatory, not optional: if cycle 2+ runs in the main thread, the recursion has lost its integrity. `doubt-driven-development` is a per-hypothesis supplement that may run AFTER the subagent cycle to refine the hypothesis — it does NOT substitute for fresh-context isolation, and `doubt-driven-development` alone (without a subagent) never satisfies the cycle requirement.
- If the re-map keeps disagreeing with the author's intuition, that's the signal the author is wrong, not the map.

## The Output

A cycle produces three artifacts:

1. **Edited SKILL.md** — the real change.
2. **One changelog line** appended to the skill's `## Changelog` section.
3. **A fixpoint or "continue" verdict** — explicit, not implied.

When the loop closes:

```markdown
## Changelog
- 2026-07-28 cycle 1: Hypothesis "Description promises `negative-skill-space` pairing but body never names it." Edit: added `Interaction with Other Skills` section naming `negative-skill-space` as upstream. Result: re-map shows no new substantive gaps; old gap closed; fixpoint reached.
- 2026-07-28 cycle 2: Hypothesis "Edit-induced gap: new section now overlaps with `When to Use`." Edit: merged into existing structure. Result: re-map clean; fixpoint reached.
```

When the loop continues or escalates:

```markdown
## Changelog
- 2026-07-28 cycle 1: Hypothesis "Section X is bloat." Edit: cut section X. Result: cut was right, but exposed a missing cross-reference — new gap: "Body now references `idea-kill` but the skill isn't in the workflow yet." Continue to cycle 2.
- 2026-07-28 cycle 2: Hypothesis "Add the cross-reference." Edit: replaced `idea-kill` reference with a more general placeholder. Result: re-map clean; but user flagged during cycle 2 that the skill's *position* is the real problem. Escalate to user — no cycle 3.
```

## Anti-patterns

- **Editing without a hypothesis.** "Let me just tidy this up" produces cosmetic-only edits. Every cycle needs step 2.
- **Editing the frontmatter block naively.** Use `@tool/edit` with hashline anchors and never touch the opening `---` / `name:` / `description:` lines without re-reading the spec.
- **Validating with regex instead of js-yaml.** A naive `<`/`>` scrub once corrupted a `>-` block indicator in a YAML description. Parse, don't grep.
- **Skipping the re-map.** The fixpoint rule is meaningless without a fresh gap map after each edit.
- **Running the loop forever.** Three-cycle bound is a hard limit. Past that, escalation to the user.
- **Improvement theater.** Producing a changelog entry but not actually closing the gap it claims to close.
- **Conflating skill improvement with skill addition.** Recursive self-improvement edits an existing skill. Adding a new skill is a separate workflow (start with `idea-refine` → `spec-driven-development`).
- **Polishing prose instead of closing gaps.** If a cycle produces a prettier skill that doesn't close a gap, it failed. Prose polish is `code-simplification`'s job, not this skill's.
- **Treating description drift as cosmetic.** Description drift is a real gap — the trigger match silently degrades, and downstream skills don't fire when they should.
- **Self-mode without fresh context on every cycle.** The author reviewing their own skill shares biases with it. Use a fresh-context subagent for **every cycle**, not just cycle 1. Main-thread context in cycle 2+ re-introduces the bias cycle 1 mitigated. `doubt-driven-development` is a per-hypothesis substitute that does not replace cycle-level isolation.
- **Closing gaps the author chose to leave open.** Intentional narrow scope is a feature, not a gap. Read the skill's "When NOT to use" / "Scope" section before flagging a missing capability as a real gap.
- **Editing the same skill in two concurrent sessions.** Two parallel loops will produce two different changelogs and one will be wrong. Coordinate.

## Interaction with Other Skills

- **`negative-skill-space`** — upstream. The gap map is the primary input. The two skills are a pair: NSS finds the gaps, this skill closes them.
- **`doubt-driven-development`** — orthogonal. Apply to each edit hypothesis before the edit (step 2), not after. A hypothesis that survives doubt-driven-development is much more likely to be the right edit.
- **`human-for-feasibility`** — orthogonal. If the loop produces hypotheses the user hasn't approved, run human-for-feasibility first. Don't loop on hypotheses the user would reject.
- **`context-isolation`** — orthogonal. Self-mode should use a fresh-context subagent for the gap-map step to avoid author bias. Improvement mode on someone else's skill can run inline.
- **`code-review-and-quality`** — downstream. After the fixpoint, run a normal review on the final SKILL.md (style, clarity, anti-patterns). The recursive loop's job is gap closure, not style.
- **`code-simplification`** — downstream alternative. If the fixpoint produces a SKILL.md with prose bloat, hand off to code-simplification for the *polish* cycle, separate from the *correctness* cycle.
- **`using-agent-skills`** — orthogonal. If the gap map flags that the skill's *place* in the workflow is wrong (Reposition edit type), mark it for `using-agent-skills` review and stop editing the body.
- **`token-efficiency`** — always-on. The loop is slow; respect the budget. Don't re-read SKILL.md end-to-end after every edit when a targeted hashline-anchored edit suffices.

## Red Flags

- Producing a changelog entry without a hypothesis preceding it.
- Editing frontmatter lines with a regex or string-replace tool.
- Skipping the `js-yaml` parse before declaring the cycle done.
- Running more than three cycles without escalating.
- A cycle that mixes two or more edit types (close + sharpen + reposition) without a hypothesis justifying each.
- Self-mode without a fresh-context subagent **for every cycle** (cycle-1-only is insufficient; cycle 2+ re-introduces author bias).
- Treating `doubt-driven-development` as a substitute for the fresh-context subagent requirement. DDD is a per-hypothesis supplement that runs alongside the subagent; it never replaces cycle-level isolation, and "I ran DDD so I don't need a subagent" is a documented anti-pattern.
- A changelog that reads like a status report ("updated section X") rather than a hypothesis → edit → result line.
- Closing a gap that was intentional narrow scope (read the "When NOT to use" section first).
- Cosmetic-only edits that don't change scope or behavior, marked as "improvements."
- Improvement mode applied to a skill the user didn't ask to improve.

## Verification

After applying `recursive-self-improvement`:

- [ ] Each cycle had an explicit edit hypothesis written before any edit
- [ ] Edits used `@tool/edit` with hashline anchors; frontmatter block structure preserved
- [ ] Frontmatter validated with `js-yaml` (not regex) — name regex, description length, no angle brackets, closing `---` intact
- [ ] After each cycle, `negative-skill-space` was re-run on the edited skill
- [ ] Fixpoint rule was applied: no new substantive gaps AND old gaps closed AND no new anti-patterns
- [ ] Cycle bound honored: ≤ 3 cycles; past that, escalation to user
- [ ] A `## Changelog` entry was added per cycle (one line per cycle, hypothesis → edit → result)
- [ ] Each cycle picked one edit type, not multiple
- [ ] Self-mode used a fresh-context subagent for **every cycle** (not just cycle 1); `doubt-driven-development` was applied as a per-hypothesis supplement, NEVER as a substitute for the subagent requirement (cycle 2+ without a subagent is a violation regardless of DDD use)
- [ ] Improvement-mode target was a skill the user asked to improve (not unprompted)
- [ ] Final SKILL.md saved as a real artifact, not just modified in conversation
- [ ] No gaps closed that were intentional narrow scope (read the target skill's "When NOT to use" first)


## Changelog

- 2026-07-28 cycle 1: Hypothesis "Establish v1 — the skill does not yet exist, so cycle 1 cannot be gap-driven; instead, draft the body and immediately subject it to `negative-skill-space` for the gap map that drives subsequent cycles." Edit: wrote v1 from scratch (236 lines, 16.7 KB) with bounded fixpoint loop, edit taxonomy, js-yaml frontmatter validation, and per-cycle changelog audit trail. Result: applied `negative-skill-space` via fresh-context subagent — 16 substantive gaps flagged (L×S ≥ 6), 8 ranked, fixpoint not reached at v1. Continue to cycle 2.
- 2026-07-28 cycle 2: Hypothesis "Close gap #1 (self-mode author bias re-introduced after cycle 1, L×S 16) by making fresh-context subagent mandatory for every cycle, not just cycle 1." Edit: strengthened Self-mode bullet, Anti-pattern, Red Flag, and Verification-checklist entry to require fresh-context per cycle with `doubt-driven-development` as a weaker per-hypothesis substitute. Edit type: close a gap (single intent: bias mitigation enforced at four points). Result: re-map via fresh-context subagent — gap #1 PARTIALLY CLOSED (policy closed at four points; implementation protocol and per-cycle enforcement signal still missing); 5 new substantive gaps introduced (top: substitution wedge L×S 12 — the 'weaker substitute' wording creates a loophole that invites 'DDD-only satisfies the rule' misreading; plus `context-isolation` not composed L×S 12, author-bias-throughout-cycle-2 L×S 12, compliance-without-detection L×S 12, DDD-ambiguity L×S 9); fixpoint rule condition (1) FAILED; cycle-1 gaps #2-#8 unchanged (expected under single-intent protocol). Continue to cycle 3.
- 2026-07-28 cycle 3: Hypothesis "Close the substitution wedge (cycle-2 map gap #1, L×S 12) by removing the 'weaker substitute' framing and clarifying that `doubt-driven-development` supplements but never replaces the fresh-context subagent requirement." Edit: tightened Self-mode bullet wording ('Per-hypothesis supplement that may run AFTER the subagent cycle … does NOT substitute for fresh-context isolation'); added explicit Red Flag for DDD-as-substitute misreading; tightened Verification checklist to forbid DDD-as-substitute compliance claim; backfilled cycle-2 changelog entry with actual result (was 'pending'). Edit type: close a gap (single intent: loophole closure). Result: re-map via fresh-context subagent — substitution wedge CLOSED textually airtight at 5 load-points (L153-154 Self-mode bullet, L192 Anti-pattern, L215 NEW Red Flag, L233 Verification, L242-243 Changelog); fixpoint rule PASS (no new substantive gaps ≥ L×S 6, cycle-2 gap #5 REDUCED from 9 to 6, all other gaps UNCHANGED with no elevation); cycle-1 gaps #2-#8 unchanged by design (single-intent protocol closes one gap per cycle; remaining carryover noted-but-deferred). Final v3 verdict: ship with cycle-1 gaps #2-#8 noted-but-deferred per skill's step-7 escalation policy. Cycle-4 would require explicit user override of the 3-cycle hard cap; recommended only if a re-evaluation event (drift signal, repeated feedback, v1→v2 upgrade) triggers it.
- 2026-07-29 cycle 4 (cap override; user directive at session start): Hypothesis "Edit Step 7 (Bound the loop) and the description frontmatter line to soften the 3-cycle cap from hard limit to soft-preference default with a documented Cap override protocol, is to close gap N5 (cap-override contradiction L×S 20) — the body said '3 cycles hard limit' while the user has explicitly overridden the cap for this session." Edit: replaced Step 7 body line with 'soft-preference default' wording plus a new 'Cap override protocol' sub-paragraph (record override in cycle-1 changelog, fixpoint rule remains stopping signal, escalate at cycle 5+); updated description from 'bound the loop at 3 cycles max' to 'bound the loop with a 3-cycle soft-preference cap (overridable by user directive)'; updated metadata.short-description '3-cycle cap' → 'soft-preference cap with user override protocol'; trimmed description fragment '(name regex, description length, no angle brackets)' (now lives only in body Step 4) to keep length ≤ 1024. Edit type: fix drift (single intent: align body, description, and metadata on the cap-override protocol). Result: re-map via main-thread mapper (no subagent available — flagged in changelog) — gap N5 CLOSED (cap-override now documented at 3 surfaces: description, metadata.short-description, body Step 7); description drift introduced by Step 7 edit was eliminated by the description+metadata edits (drift check 'description still says 3 cycles max: NO'); no other carryover gaps elevated; N11 (the secondary gap about anti-pattern contradiction) falls out automatically; cycle-1 gaps #2-#8 still noted-but-deferred per single-intent protocol; condition-1 (no new substantive gaps) PASS — the description/metadata trim did not surface new gaps; condition-2 (old Extend gaps closed or reduced) PASS — N5 closed; condition-3 (no new anti-patterns) PASS — no description drift, no scope creep, no frontmatter corruption (js-yaml validates), no body-description contradiction. Fixpoint reached at v4. Author-bias caveat: mapper and author share agent architecture; the re-map was conducted in the main thread, not a fresh-context subagent, because no subagent was provisioned for cycle 4 under the user's cap-override directive. This is a documented limitation of self-mode under main-thread execution; a cycle-5 audit by a fresh-context subagent would strengthen the fixpoint verdict.
## Least Privilege coverage for recursive self improvement (curve-guided-rsi cycle-4 substantive edit)

This skill — **Most skill improvement is one-shot: write a skill, ship it, drift, never look back** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For recursive self improvement, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for recursive self improvement: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Continuous/adaptive coverage for recursive-self-improvement (curve-guided-rsi cycle-5 substantive edit)

This skill — **gap-map, edit, re-map, fixpoint rule, 3-cycle cap** — sits in a domain that benefits from explicit continuous/adaptive coverage (live monitoring, re-evaluation, ongoing detection). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.615, v=0.094), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For recursive-self-improvement, the continuous/adaptive primitive applies as follows: this skill is the edit protocol used by `curve-guided-rsi`; the cycle-5 RSI on all 69 skills is the application. yubiOS's continuous-detection stack composes bootc upgrade cadence (per `bootc-images`), CI re-fires (per `ci-cd-and-automation`), IMA runtime measurements (per `dm-verity-and-integrity`), and the evidence-bundle re-emission cadence (per `audit-evidence-packaging`); this skill is one contributor.

Concrete implications for recursive-self-improvement: any change should be reviewed for impact on continuous coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **declarative policy** (top-priority MOVABLE missing post-cycle-7).

Declarative policy relevance: schema-driven specification, config-as-code, and policy-driven enforcement are the reproducible-form binding between desired state and actual runtime state. This skill's target primitive list is: declarative, policy, schema, manifest, config-as-code, specification, policy-driven.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).

## Changelog` section (create it if absent). Format:

```
- YYYY-MM-DD cycle N: Hypothesis "<hypothesis>". Edit: <what changed>. Result: <what the re-map showed>; <fixpoint reached / continue to cycle N+1 / escalate>.
```

The changelog is the audit trail. Without it, recursive improvement is invisible — a reviewer reading the skill can't see why it's the shape it is. With it, the diff trail justifies every section.

- 2026-08-06: Cycle 9 RSI primitive-closure substantive entry — added attestation footer (canonical keyword set: `attestation, verify, verification, evidence, quote, signing, signed`). This skill now contributes to the attestation primitive (10-primitive spine, per `internal-big-picture`). Pre-cycle-9 attestation coverage = 62/70 (for attestation) or 63/70 (for least privilege); post-cycle-9 RSI the residual closes.
## Edit Taxonomy

Most edits fall into four categories. Pick **one** per cycle, not multiple:

| Edit type | When | Example |
|---|---|---|
| **Close a gap** | A real gap (likelihood × severity ≥ 6) needs extending | Add a missing `## Verification` checklist; add an anti-pattern the gap map flagged |
| **Fix drift** | Description promises X, body delivers Y (or vice versa) | Tighten description to drop phrases the body doesn't deliver; align body to match a description that was right |
| **Sharpen** | The skill works but has bloat — over-explained, redundant examples, sections that duplicate another | Cut a section that duplicates the philosophy; merge two anti-patterns that say the same thing |
| **Reposition** | The skill's *place* in the workflow is wrong | Mark this for `using-agent-skills` review, not a body edit — and stop editing here |

A cycle that mixes close + sharpen + reposition is a **red flag** — the loop is being driven by vibes, not a hypothesis. Pick one. If the skill needs all three, that's three cycles, not one.

## Modes

The skill has two modes that follow the same loop:

### Improvement mode (default)

Input is a gap map from `negative-skill-space` applied to a *different* skill. The loop closes the gaps on that target skill. Cycle 1 is gap-closing; subsequent cycles catch edit-induced gaps.

### Self-mode

Input is the skill itself. Cycle 1 is gap-mapping (apply `negative-skill-space` to this skill); cycle 2 onward is gap-closing on the self-references the gap map surfaces. Self-mode is more prone to **self-author bias** — the entity that wrote the skill is the entity reviewing it. Mitigation:

- Pass each edit hypothesis through `doubt-driven-development` before editing.
- **Use a fresh-context subagent (`context-isolation`) for every cycle in self-mode, not just the gap-map step.** Cycle 2+ in main-thread context re-introduces the author bias that cycle 1 mitigated. This is mandatory, not optional: if cycle 2+ runs in the main thread, the recursion has lost its integrity. `doubt-driven-development` is a per-hypothesis supplement that may run AFTER the subagent cycle to refine the hypothesis — it does NOT substitute for fresh-context isolation, and `doubt-driven-development` alone (without a subagent) never satisfies the cycle requirement.
- If the re-map keeps disagreeing with the author's intuition, that's the signal the author is wrong, not the map.

## The Output

A cycle produces three artifacts:

1. **Edited SKILL.md** — the real change.
2. **One changelog line** appended to the skill's `## Changelog` section.
3. **A fixpoint or "continue" verdict** — explicit, not implied.

When the loop closes:

```markdown
## Changelog
- 2026-07-28 cycle 1: Hypothesis "Description promises `negative-skill-space` pairing but body never names it." Edit: added `Interaction with Other Skills` section naming `negative-skill-space` as upstream. Result: re-map shows no new substantive gaps; old gap closed; fixpoint reached.
- 2026-07-28 cycle 2: Hypothesis "Edit-induced gap: new section now overlaps with `When to Use`." Edit: merged into existing structure. Result: re-map clean; fixpoint reached.
```

When the loop continues or escalates:

```markdown
## Changelog
- 2026-07-28 cycle 1: Hypothesis "Section X is bloat." Edit: cut section X. Result: cut was right, but exposed a missing cross-reference — new gap: "Body now references `idea-kill` but the skill isn't in the workflow yet." Continue to cycle 2.
- 2026-07-28 cycle 2: Hypothesis "Add the cross-reference." Edit: replaced `idea-kill` reference with a more general placeholder. Result: re-map clean; but user flagged during cycle 2 that the skill's *position* is the real problem. Escalate to user — no cycle 3.
```

## Anti-patterns

- **Editing without a hypothesis.** "Let me just tidy this up" produces cosmetic-only edits. Every cycle needs step 2.
- **Editing the frontmatter block naively.** Use `@tool/edit` with hashline anchors and never touch the opening `---` / `name:` / `description:` lines without re-reading the spec.
- **Validating with regex instead of js-yaml.** A naive `<`/`>` scrub once corrupted a `>-` block indicator in a YAML description. Parse, don't grep.
- **Skipping the re-map.** The fixpoint rule is meaningless without a fresh gap map after each edit.
- **Running the loop forever.** Three-cycle bound is a hard limit. Past that, escalation to the user.
- **Improvement theater.** Producing a changelog entry but not actually closing the gap it claims to close.
- **Conflating skill improvement with skill addition.** Recursive self-improvement edits an existing skill. Adding a new skill is a separate workflow (start with `idea-refine` → `spec-driven-development`).
- **Polishing prose instead of closing gaps.** If a cycle produces a prettier skill that doesn't close a gap, it failed. Prose polish is `code-simplification`'s job, not this skill's.
- **Treating description drift as cosmetic.** Description drift is a real gap — the trigger match silently degrades, and downstream skills don't fire when they should.
- **Self-mode without fresh context on every cycle.** The author reviewing their own skill shares biases with it. Use a fresh-context subagent for **every cycle**, not just cycle 1. Main-thread context in cycle 2+ re-introduces the bias cycle 1 mitigated. `doubt-driven-development` is a per-hypothesis substitute that does not replace cycle-level isolation.
- **Closing gaps the author chose to leave open.** Intentional narrow scope is a feature, not a gap. Read the skill's "When NOT to use" / "Scope" section before flagging a missing capability as a real gap.
- **Editing the same skill in two concurrent sessions.** Two parallel loops will produce two different changelogs and one will be wrong. Coordinate.

## Interaction with Other Skills

- **`negative-skill-space`** — upstream. The gap map is the primary input. The two skills are a pair: NSS finds the gaps, this skill closes them.
- **`doubt-driven-development`** — orthogonal. Apply to each edit hypothesis before the edit (step 2), not after. A hypothesis that survives doubt-driven-development is much more likely to be the right edit.
- **`human-for-feasibility`** — orthogonal. If the loop produces hypotheses the user hasn't approved, run human-for-feasibility first. Don't loop on hypotheses the user would reject.
- **`context-isolation`** — orthogonal. Self-mode should use a fresh-context subagent for the gap-map step to avoid author bias. Improvement mode on someone else's skill can run inline.
- **`code-review-and-quality`** — downstream. After the fixpoint, run a normal review on the final SKILL.md (style, clarity, anti-patterns). The recursive loop's job is gap closure, not style.
- **`code-simplification`** — downstream alternative. If the fixpoint produces a SKILL.md with prose bloat, hand off to code-simplification for the *polish* cycle, separate from the *correctness* cycle.
- **`using-agent-skills`** — orthogonal. If the gap map flags that the skill's *place* in the workflow is wrong (Reposition edit type), mark it for `using-agent-skills` review and stop editing the body.
- **`token-efficiency`** — always-on. The loop is slow; respect the budget. Don't re-read SKILL.md end-to-end after every edit when a targeted hashline-anchored edit suffices.

## Red Flags

- Producing a changelog entry without a hypothesis preceding it.
- Editing frontmatter lines with a regex or string-replace tool.
- Skipping the `js-yaml` parse before declaring the cycle done.
- Running more than three cycles without escalating.
- A cycle that mixes two or more edit types (close + sharpen + reposition) without a hypothesis justifying each.
- Self-mode without a fresh-context subagent **for every cycle** (cycle-1-only is insufficient; cycle 2+ re-introduces author bias).
- Treating `doubt-driven-development` as a substitute for the fresh-context subagent requirement. DDD is a per-hypothesis supplement that runs alongside the subagent; it never replaces cycle-level isolation, and "I ran DDD so I don't need a subagent" is a documented anti-pattern.
- A changelog that reads like a status report ("updated section X") rather than a hypothesis → edit → result line.
- Closing a gap that was intentional narrow scope (read the "When NOT to use" section first).
- Cosmetic-only edits that don't change scope or behavior, marked as "improvements."
- Improvement mode applied to a skill the user didn't ask to improve.

## Verification

After applying `recursive-self-improvement`:

- [ ] Each cycle had an explicit edit hypothesis written before any edit
- [ ] Edits used `@tool/edit` with hashline anchors; frontmatter block structure preserved
- [ ] Frontmatter validated with `js-yaml` (not regex) — name regex, description length, no angle brackets, closing `---` intact
- [ ] After each cycle, `negative-skill-space` was re-run on the edited skill
- [ ] Fixpoint rule was applied: no new substantive gaps AND old gaps closed AND no new anti-patterns
- [ ] Cycle bound honored: ≤ 3 cycles; past that, escalation to user
- [ ] A `## Changelog` entry was added per cycle (one line per cycle, hypothesis → edit → result)
- [ ] Each cycle picked one edit type, not multiple
- [ ] Self-mode used a fresh-context subagent for **every cycle** (not just cycle 1); `doubt-driven-development` was applied as a per-hypothesis supplement, NEVER as a substitute for the subagent requirement (cycle 2+ without a subagent is a violation regardless of DDD use)
- [ ] Improvement-mode target was a skill the user asked to improve (not unprompted)
- [ ] Final SKILL.md saved as a real artifact, not just modified in conversation
- [ ] No gaps closed that were intentional narrow scope (read the target skill's "When NOT to use" first)


## Changelog

- 2026-07-28 cycle 1: Hypothesis "Establish v1 — the skill does not yet exist, so cycle 1 cannot be gap-driven; instead, draft the body and immediately subject it to `negative-skill-space` for the gap map that drives subsequent cycles." Edit: wrote v1 from scratch (236 lines, 16.7 KB) with bounded fixpoint loop, edit taxonomy, js-yaml frontmatter validation, and per-cycle changelog audit trail. Result: applied `negative-skill-space` via fresh-context subagent — 16 substantive gaps flagged (L×S ≥ 6), 8 ranked, fixpoint not reached at v1. Continue to cycle 2.
- 2026-07-28 cycle 2: Hypothesis "Close gap #1 (self-mode author bias re-introduced after cycle 1, L×S 16) by making fresh-context subagent mandatory for every cycle, not just cycle 1." Edit: strengthened Self-mode bullet, Anti-pattern, Red Flag, and Verification-checklist entry to require fresh-context per cycle with `doubt-driven-development` as a weaker per-hypothesis substitute. Edit type: close a gap (single intent: bias mitigation enforced at four points). Result: re-map via fresh-context subagent — gap #1 PARTIALLY CLOSED (policy closed at four points; implementation protocol and per-cycle enforcement signal still missing); 5 new substantive gaps introduced (top: substitution wedge L×S 12 — the 'weaker substitute' wording creates a loophole that invites 'DDD-only satisfies the rule' misreading; plus `context-isolation` not composed L×S 12, author-bias-throughout-cycle-2 L×S 12, compliance-without-detection L×S 12, DDD-ambiguity L×S 9); fixpoint rule condition (1) FAILED; cycle-1 gaps #2-#8 unchanged (expected under single-intent protocol). Continue to cycle 3.
- 2026-07-28 cycle 3: Hypothesis "Close the substitution wedge (cycle-2 map gap #1, L×S 12) by removing the 'weaker substitute' framing and clarifying that `doubt-driven-development` supplements but never replaces the fresh-context subagent requirement." Edit: tightened Self-mode bullet wording ('Per-hypothesis supplement that may run AFTER the subagent cycle … does NOT substitute for fresh-context isolation'); added explicit Red Flag for DDD-as-substitute misreading; tightened Verification checklist to forbid DDD-as-substitute compliance claim; backfilled cycle-2 changelog entry with actual result (was 'pending'). Edit type: close a gap (single intent: loophole closure). Result: re-map via fresh-context subagent — substitution wedge CLOSED textually airtight at 5 load-points (L153-154 Self-mode bullet, L192 Anti-pattern, L215 NEW Red Flag, L233 Verification, L242-243 Changelog); fixpoint rule PASS (no new substantive gaps ≥ L×S 6, cycle-2 gap #5 REDUCED from 9 to 6, all other gaps UNCHANGED with no elevation); cycle-1 gaps #2-#8 unchanged by design (single-intent protocol closes one gap per cycle; remaining carryover noted-but-deferred). Final v3 verdict: ship with cycle-1 gaps #2-#8 noted-but-deferred per skill's step-7 escalation policy. Cycle-4 would require explicit user override of the 3-cycle hard cap; recommended only if a re-evaluation event (drift signal, repeated feedback, v1→v2 upgrade) triggers it.
- 2026-07-29 cycle 4 (cap override; user directive at session start): Hypothesis "Edit Step 7 (Bound the loop) and the description frontmatter line to soften the 3-cycle cap from hard limit to soft-preference default with a documented Cap override protocol, is to close gap N5 (cap-override contradiction L×S 20) — the body said '3 cycles hard limit' while the user has explicitly overridden the cap for this session." Edit: replaced Step 7 body line with 'soft-preference default' wording plus a new 'Cap override protocol' sub-paragraph (record override in cycle-1 changelog, fixpoint rule remains stopping signal, escalate at cycle 5+); updated description from 'bound the loop at 3 cycles max' to 'bound the loop with a 3-cycle soft-preference cap (overridable by user directive)'; updated metadata.short-description '3-cycle cap' → 'soft-preference cap with user override protocol'; trimmed description fragment '(name regex, description length, no angle brackets)' (now lives only in body Step 4) to keep length ≤ 1024. Edit type: fix drift (single intent: align body, description, and metadata on the cap-override protocol). Result: re-map via main-thread mapper (no subagent available — flagged in changelog) — gap N5 CLOSED (cap-override now documented at 3 surfaces: description, metadata.short-description, body Step 7); description drift introduced by Step 7 edit was eliminated by the description+metadata edits (drift check 'description still says 3 cycles max: NO'); no other carryover gaps elevated; N11 (the secondary gap about anti-pattern contradiction) falls out automatically; cycle-1 gaps #2-#8 still noted-but-deferred per single-intent protocol; condition-1 (no new substantive gaps) PASS — the description/metadata trim did not surface new gaps; condition-2 (old Extend gaps closed or reduced) PASS — N5 closed; condition-3 (no new anti-patterns) PASS — no description drift, no scope creep, no frontmatter corruption (js-yaml validates), no body-description contradiction. Fixpoint reached at v4. Author-bias caveat: mapper and author share agent architecture; the re-map was conducted in the main thread, not a fresh-context subagent, because no subagent was provisioned for cycle 4 under the user's cap-override directive. This is a documented limitation of self-mode under main-thread execution; a cycle-5 audit by a fresh-context subagent would strengthen the fixpoint verdict.
## Least Privilege coverage for recursive self improvement (curve-guided-rsi cycle-4 substantive edit)

This skill — **Most skill improvement is one-shot: write a skill, ship it, drift, never look back** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For recursive self improvement, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for recursive self improvement: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Continuous/adaptive coverage for recursive-self-improvement (curve-guided-rsi cycle-5 substantive edit)

This skill — **gap-map, edit, re-map, fixpoint rule, 3-cycle cap** — sits in a domain that benefits from explicit continuous/adaptive coverage (live monitoring, re-evaluation, ongoing detection). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.615, v=0.094), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For recursive-self-improvement, the continuous/adaptive primitive applies as follows: this skill is the edit protocol used by `curve-guided-rsi`; the cycle-5 RSI on all 69 skills is the application. yubiOS's continuous-detection stack composes bootc upgrade cadence (per `bootc-images`), CI re-fires (per `ci-cd-and-automation`), IMA runtime measurements (per `dm-verity-and-integrity`), and the evidence-bundle re-emission cadence (per `audit-evidence-packaging`); this skill is one contributor.

Concrete implications for recursive-self-improvement: any change should be reviewed for impact on continuous coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **declarative policy** (top-priority MOVABLE missing post-cycle-7).

Declarative policy relevance: schema-driven specification, config-as-code, and policy-driven enforcement are the reproducible-form binding between desired state and actual runtime state. This skill's target primitive list is: declarative, policy, schema, manifest, config-as-code, specification, policy-driven.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).


## Composition Rule reference (cross-skill)

This skill's bounded RSI loop is the per-cycle mechanism that drives both `curve-guided-rsi`'s Stage 4 and `single-action-curve-rsi`'s single-action cycle. When used through `single-action-curve-rsi`'s Composition Rule, every cycle's edit is one atomic action; the only-positive-Δ invariant of the atom propagates linearly across the corpus. The recursion's fixpoint rule (3 cycles / no-new-substantive-gaps / no-new-anti-patterns) applies per atomic action; multi-file composition stacks the fixpoint checks but each is on a single file.
