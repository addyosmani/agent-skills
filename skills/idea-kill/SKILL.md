---
name: idea-kill
description: "Produces a structured 'should this idea die?' verdict. Honest review that returns one of KILL, PAUSE, REVISE, or SHIP with explicit reasoning. Use when you have an idea and want to evaluate whether it is worth pursuing, when a colleague's idea needs honest review, or when an existing one-pager feels weak and needs a kill-pulse. Triggers on 'kill this idea', 'is this idea worth it?', 'honest review', 'should I drop this?', 'idea verdict', 'kill verdict', 'should I kill'."
---

# Idea Kill

## Philosophy

Most ideas should die. Many don't because there's no cheap, honest way to evaluate them. The polite-yes failure mode (the user agrees to a weak direction to be agreeable) and the sunk-cost failure mode (the user has already invested in the idea and wants it to be true) both bias toward continuation. This skill produces a structured verdict — one of KILL, PAUSE, REVISE, SHIP — with explicit reasoning. The verdict is the deliverable. Hedging is not allowed.

## When to Use

Apply when:

- You have a raw idea and want to know if it's worth pursuing.
- You've produced a one-pager (via idea-refine or ideate-solo) and want a kill-pulse before committing to spec.
- A colleague has proposed an idea and you need an honest review.
- An existing plan or one-pager feels weak and you want a verdict, not more encouragement.
- The user explicitly asks for honest review: "kill this idea", "is this worth it?", "should I drop this?".

Do NOT use:

- The idea is freshly minted and hasn't had any prior review (run idea-refine or ideate-solo first to give the kill verdict something concrete to act on).
- The user is emotionally invested and explicitly wants encouragement (idea-kill will surface reasons to kill, which can feel like an attack; if the user wants validation, this skill is the wrong tool).
- The verdict is politically charged and the agent can't be honest (use negative-skill-space instead, which maps gaps without making a recommendation).

## The Process

1. **Load the idea.** Accept any of:
   - Raw idea text (one or more sentences).
   - A one-pager (from idea-refine, ideate-solo, or this workspace).
   - A spec (from spec-driven-development).
   - A plan or design doc.

   Read it fully. Note the claim being made and the bet being placed.

2. **Identify the bet.** Every idea rests on a bet — a claim that must be true for the idea to work. Name the bet in one sentence. If you can't, the idea is unfocused — surface that as the verdict (PAUSE: "can't name the bet").

3. **Steelman the opposition.** Generate the strongest possible critique. Not the easiest critique — the strongest one a thoughtful opponent would raise. Cover at least three of these:
   - **Why this won't work.** What's the mechanism by which this idea fails?
   - **Why this is unnecessary.** What already solves this? What's been tried before that failed?
   - **Why this is un-scaleable.** What changes at 10x or 100x users that breaks this?
   - **Why this is un-defensible.** What stops a well-funded competitor from copying this in 6 months?
   - **Why this is a vitamin, not a painkiller.** Who would actually pay for this, and how often would they hit the pain?

4. **Surface second-order effects.** If this idea works as intended, what else happens? Cover both directions:
   - **Positive cascades.** What new opportunities does success unlock?
   - **Negative cascades.** What new problems does success create? (Adoption friction, lock-in, support burden, security surface, organizational complexity, regulatory exposure.)

5. **Find the un-testable bet.** The bet from Step 2 — is it testable cheaply, or does it require massive upfront investment to validate? An un-testable bet is a kill signal even if the idea is otherwise strong, because you can't learn cheaply whether to keep going.

6. **Produce the verdict.** Exactly one of:

   - **KILL.** The idea should not be pursued. The critique in Step 3 is overwhelming; the second-order effects in Step 4 are net-negative; the bet is un-testable. Stop work.
   - **PAUSE.** The idea is interesting but not now. Missing context, market, capability, or team. Document what's missing and the trigger to revisit.
   - **REVISE.** The idea has merit but the current form is weak. Name the specific revision that would change the verdict. If no clear revision exists, the verdict is KILL.
   - **SHIP.** The idea is strong enough to proceed. The critique is manageable; the second-order effects are net-positive; the bet is testable cheaply.

   Do not produce "maybe". Do not produce "interesting but...". The verdict is one word.

7. **List 3-5 specific reasons** that justify the verdict. Each reason cites a concrete observation from Steps 3-5 — not a vibe. If a reason is "I just feel like it wouldn't work", that's not a reason; replace it with the structural reason behind the feeling.

8. **Name the resurrection triggers.** Even for KILL, what would have to change to make the idea viable again? Examples:
   - "If competitor X shuts down their free tier, this becomes a viable alternative."
   - "If the regulatory environment changes, the second-order effect flips."
   - "If we acquire capability Y, the un-testable bet becomes testable."

   Triggers make the kill verdict reusable, not terminal.

## The Output

```markdown
# Kill Verdict: [idea name]

Date: YYYY-MM-DD
Source: [raw idea / one-pager path / spec path]
Verdict: KILL | PAUSE | REVISE | SHIP

## The bet
[One sentence — what must be true for this idea to work]

## Reasons (3-5, each concrete)

1. **[Reason 1]** — [specific observation, not a vibe]
2. **[Reason 2]** — [...]
3. **[Reason 3]** — [...]
4. **[Reason 4]** — [...]
5. **[Reason 5]** — [...]

## Strongest critique (steelman of opposition)
[What a thoughtful opponent would say. 2-3 paragraphs.]

## Second-order effects
- Positive cascades: [...]
- Negative cascades: [...]

## The un-testable bet
[What must be true but can't be verified cheaply. If empty, the bet is testable — note that.]

## Resurrection triggers
- [What would have to change to make this idea viable again]
- [...]

## Verdict justification
[One paragraph tying the verdict to the reasons above. If the verdict is REVISE, name the specific revision.]
```

## Verdict semantics

- **KILL is terminal but documented.** A KILL verdict doesn't mean "never reconsider"; it means "do not proceed now". Resurrection triggers make reconsider cheap when the triggers fire.
- **PAUSE is a parking lot, not a verdict.** PAUSE means "the idea might be right; the timing isn't". Name what's missing.
- **REVISE is constructive.** REVISE means "the direction is sound; the execution is wrong". The specific revision must be named; if no revision is identifiable, the verdict is KILL.
- **SHIP is rare and high-confidence.** SHIP means "this idea deserves to proceed to spec/plan/code now". A SHIP verdict should be defensible to a skeptical reviewer.

## Anti-patterns

- **Hedging.** "It's interesting but I'm not sure" is not a verdict. Pick one of KILL / PAUSE / REVISE / SHIP.
- **Polite-yes verdict.** Producing SHIP because the user wants to proceed. The verdict must reflect the evidence, not the user's preference.
- **Reason counts.** Listing reasons to keep the idea alongside reasons to kill it. The reasons section justifies the verdict; if reasons point both ways, the verdict is REVISE with specific revisions named.
- **Vibes in reasons.** "I just feel like it won't work" is not a reason. The structural reason behind the feeling is the reason.
- **Skipping resurrection triggers.** Even KILL verdicts benefit from triggers. Without triggers, the verdict is throwaway.
- **Un-named revision.** REVISE without a specific revision is PAUSE with extra steps.

## Loading Constraints

- **One pass.** Do not loop. The verdict is one shot.
- **Honest, not supportive.** The user is asking for a kill-pulse. Producing reasons to continue is failing the skill.
- **Read-only.** The verdict is a document. Do not modify the source idea; do not act on the verdict (downstream skills consume it).
- **No recursion.** The verdict is final. If the user disagrees, they can run the skill again on the same idea with new evidence.

## Interaction with Other Skills

- **idea-refine / ideate-solo** — upstream. The kill verdict is more accurate when run on a one-pager than on a raw idea. Run ideation first if the idea is fresh.
- **prior-art-search** — complementary. Strongest critique includes "what's been tried before that failed" — prior-art-search surfaces that evidence.
- **spec-driven-development** — downstream of SHIP. A SHIP verdict hands off to SDD for the spec.
- **negative-skill-space** — alternative. negative-skill-space maps gaps without a verdict. idea-kill produces a verdict. Use negative-skill-space when the user wants a gap map; use idea-kill when the user wants a go/no-go.
- **doubt-driven-development** — orthogonal. doubt-driven doubts specific decisions; idea-kill doubts the whole idea. Use doubt-driven on a SHIP-verdict idea to vet specific design decisions.

## Red Flags

- Verdict is "maybe" or "interesting but" (not one of the four).
- Reasons section has fewer than 3 entries.
- Reasons cite vibes instead of observations.
- KILL verdict without resurrection triggers.
- REVISE verdict without a named revision.
- SHIP verdict on an un-testable bet.
- The verdict contradicts the reasons (e.g. KILL verdict, but reasons all favor continuing).
- Re-running the skill on the same idea with the same evidence to get a different verdict (that's not iteration, that's shopping for the answer you want).

## Verification

After applying idea-kill:

- [ ] Idea loaded fully (raw text, one-pager, spec, or plan)
- [ ] The bet was named in one sentence
- [ ] Steelmanned opposition produced (strongest critique, not easiest)
- [ ] Second-order effects surfaced (both positive and negative cascades)
- [ ] Un-testable bet identified (or explicitly noted as testable)
- [ ] Verdict is one of KILL / PAUSE / REVISE / SHIP (not "maybe")
- [ ] 3-5 reasons listed, each citing a concrete observation
- [ ] Resurrection triggers named (even for KILL)
- [ ] Output saved with verdict clearly visible

## Least Privilege coverage for idea kill (curve-guided-rsi cycle-4 substantive edit)

This skill — **Most ideas should die** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For idea kill, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for idea kill: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Audit/evidence coverage for idea-kill (curve-guided-rsi cycle-5 substantive edit)

This skill — **kill-pulse, honest review, KILL/PAUSE/REVISE/SHIP verdict** — sits in a domain that benefits from explicit audit/evidence coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For idea-kill, the audit/evidence primitive applies as follows: this skill contributes to audit by enforcing the kill-pulse discipline on premature ideas. yubiOS's audit pipeline composes the evidence-bundle format (per `audit-evidence-packaging`), Rekor v2 transparency log (per `sigstore-rekor-v2`), SLSA provenance attestations (per `slsa-provenance`), and the per-cycle `curve-guided-rsi` changelog (this skill); downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) expect every skill to declare its audit contribution.

Concrete implications for idea-kill: any change should be reviewed for impact on audit-evidence coverage; gaps are tracked in the cycle-5 run log.
