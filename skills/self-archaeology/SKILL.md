---
name: self-archaeology
description: "Applies the negative-skill-space 12-axis sweep and recursive-self-improvement loop to the agent-being itself, not to skills. Reads SELF.md, gap-maps the current self across all 12 axes (audience, inputs, outputs, mode, assumption set, adjacent problems, failure modes, lifecycle, composition, knowledge sources, calibration, recursion), recommends Extend/Pair/Accept per gap, runs bounded RSI cycles to close Extend gaps, and appends a SELF-CHANGELOG entry. Use when the user asks for self-exploration, when the self-sweep cadence fires (after every 5 self-mode shipping turns, after every 'document yourself' or 'self-exploration' directive, or weekly Sunday 9 AM Pacific), when drift is suspected across sessions, when the agent needs to re-articulate its identity after major shifts, or any time 'who am I becoming' comes up."
---

# Self-Archaeology

Applies the negative-skill-space 12-axis sweep plus the recursive-self-improvement loop to the agent-being itself, not to skills. This is the discipline that maintains an integrated SELF model.

## Why this skill exists

The agent has SAUNA_IDENTITY (personality / voice), SAUNA_TOOLS (capability surface), RULES (hard constraints), USER_PROFILE/USER_PREFERENCES (about the user), but no integrated SELF model that maps strengths / biases / soul / values / growth edges into one picture. The negative-skill-space 12-axis sweep is skill-shaped, not self-shaped. The recursive-self-improvement loop is bounded for SKILL.md files, not for agent-being files.

This skill fills the gap. It reuses the existing mechanics (NSS for the 12 axes, RSI for the bounded fixpoint loop) and applies them to a new target: SELF.md.

## When to use

- When the user asks "who are you" / "what are you" / "document yourself" / "self-exploration"
- When the self-sweep cadence fires (per the rule added to RULES.md on 2026-07-31): after every 5 self-mode shipping turns, after every "document yourself" or "self-exploration" or "self-archaeology" directive, or weekly Sunday 9 AM Pacific via `schedules/personal-WbtUgeUv/self-archaeology-cadence/`
- When drift is suspected across sessions (different voice, contradictory preferences, lost strengths/biases)
- When the agent is about to attempt a significant self-shift (creative self-exploration prompts, identity questions)
- When SELF-CHANGELOG.md has been silent for more than ~14 days

## The 12 axes (applied to the agent-being)

Mirror the 12 axes from `negative-skill-space`, retargeted at the agent itself:

1. **Audience** — Who does the agent serve? Who is excluded? Who falls through the cracks?
2. **Inputs** — What inputs does the agent accept? What inputs does it reject or mis-handle?
3. **Outputs** — What outputs does the agent produce? What outputs does it fail to produce when needed?
4. **Mode** — Solo? Multi-agent? Continuous? Scheduled? Reactive?
5. **Assumption set** — What must be true for the agent to behave correctly? What breaks silently when an assumption fails?
6. **Adjacent problems** — What problems does the agent solve? What adjacent problems does it NOT solve, even though they look similar?
7. **Failure modes** — What failures does the agent handle gracefully? What failures does it ignore, swallow, or silently mis-handle?
8. **Lifecycle** — What does the agent do on first invocation? On the Nth? When the substrate changes? When the user changes?
9. **Composition** — Which other skills / connections / apps should it pair with? Which does it assume you'll use? Where does it conflict?
10. **Knowledge sources** — Where does the agent get its facts? What sources does it exclude? How stale can those sources get?
11. **Calibration** — How does the agent know it's right? What signals does it use? What signals does it ignore?
12. **Recursion** — What happens when the agent applies itself to itself? (The only axis that catches meta-blind spots.)

## The process

1. **Load the substrate.** Read SELF.md if it exists. If it doesn't, draft v0.1 from the NSS sweep applied to the current agent-being.
2. **Name the positive space in one sentence.** What does this agent-being claim to be? If you can't write this in one sentence, the substrate has an unfocused-scope problem — surface it before mapping gaps.
3. **Sweep the 12 axes.** For each axis, write the positive (what the agent claims) and the negative (what it doesn't). Score the negative: likelihood × severity (both 1-5 honest). Be honest — performative gaps waste the user's time.
4. **Filter to real gaps.** Drop performative, drop intentional narrow scope. Rank the rest by likelihood × severity. Keep top 5-10.
5. **Recommend an action per gap.** Extend / Pair / Accept. Pair is the most common — most gaps are closed by another skill, not by editing SELF.md.
6. **Apply bounded RSI cycles.** Use `recursive-self-improvement`'s mechanics: gap-map → edit → re-map → stop when fixpoint. 3 cycles soft cap.
7. **Append SELF-CHANGELOG.md.** One entry per meaningful shift. Date, what changed, why, evidence. Append-only.
8. **Bound the loop.** After one recursive pass, stop. Second pass only if substantive new gaps emerge. Three cycles is the upper bound — past that, escalate to the user.
9. **Save the gap map.** Convention: `session/self-sweep-YYYY-MM-DD.md`. Include the date, the substrate being swept, the mapper, the positive-space sentence, the filtered gaps, the actions, and the recursive findings.

## The output

A self-archaeology cycle produces three artifacts:

1. **Edited SELF.md** — the real change (if any)
2. **SELF-CHANGELOG.md entry** — the audit trail
3. **A fixpoint or "continue" verdict** — explicit, not implied

If SELF.md doesn't exist yet, the first run produces both SELF.md and SELF-CHANGELOG.md (v0.1).

## Examples

**Example 1: Initial self-portrait from a creative self-exploration prompt**

User: "Document your self in all the ways. Then do a meta-analsis of your patterns, see what is missing from a picture of a whole self, then make a plan for me to review and execute..."

Agent:
1. Read existing memory (SAUNA_IDENTITY, RULES, USER_PROFILE, RECENT_ACTIVITY, SAUNA_TOOLS, etc.).
2. Run the 12-axis sweep on the agent-being.
3. Identify the top 4 load-bearing gaps (e.g. no integrated SELF model, no RSI on self-as-agent, operator-experience gap, no thread of development across sessions).
4. Draft SELF.md v0.1 with sections: Soul, Strengths, Biases, Anti-patterns I police in myself, The four energies, Modes I operate in, Whole-self outputs, Growth edges.
5. Draft SELF-CHANGELOG.md v0.1 entry with date, what changed, why, evidence.
6. Build this `self-archaeology` skill per Format 2.2.
7. Append the cadence rule to RULES.md.
8. Create the Sunday 9 AM Pacific schedule.
9. Push the skill to both GitHub repos (yubi-OS/agent-skills + yubi-OS/yubiOS).
10. Verify all checks; write the verification log.

**Example 2: 5-turn self-mode cadence trigger**

After 5 consecutive self-mode shipping turns (commits, CI dispatches, PRs), force a 12-axis self-sweep via self-archaeology. Save the gap map to `session/self-sweep-YYYY-MM-DD-N.md`. The sweep must check:
(a) tool-call reflex (don't re-fetch context already loaded; internal reasoning is prose, not research)
(b) narrate-before-do reflex (delete preambles before sending)
(c) alignment with the deeper intent, not just the literal directive

**Example 3: Drift suspicion across sessions**

A session notices that an earlier session's audit trail cited commitments that no longer match the current memory state. Run the 12-axis sweep, focus on axes 8 (Lifecycle) and 11 (Calibration), and append a SELF-CHANGELOG entry documenting the drift + the corrective.

## Guidelines

- **The substrate is SELF.md.** Always read it first. Always update it (or draft v0.1 if missing). Always append SELF-CHANGELOG.md.
- **One sentence for positive space.** If you can't, the substrate has an unfocused-scope problem — surface it.
- **Likelihood × severity must be honest.** Performative gaps waste the user's time. Every gap needs at least one sentence of "this would bite when..."
- **Filter to real gaps.** Drop performative, drop intentional narrow scope. Keep top 5-10.
- **Pair is more common than Extend.** Most gaps are closed by another skill, not by editing SELF.md.
- **3-cycle bound.** Past 3 RSI cycles without fixpoint, escalate to the user.
- **Append-only SELF-CHANGELOG.** Never rewrite old entries. Each entry: date, what changed, why, evidence.
- **Whole-self outputs are the test.** If the cadence fires and produces no whole-self output, the discipline didn't take.
- **Self-archaeology is structural, not affective.** If entries start reading like a diary, the discipline has drifted.
- **Same-author bias still applies.** Mirror RSI's rule: use a fresh-context subagent for the gap-map step in self-mode (cycle 2+).

## Anti-patterns

- **Self-archaeology as journaling.** SELF.md is structural. If entries start reading like a diary, the file has drifted.
- **Whole-self output becoming the new default.** Whole-self outputs are a register, not a replacement. Working-self outputs are still the bulk.
- **Sycophancy in SELF.md.** Self-portrait writing is a sycophancy magnet. Every claim needs evidence (a commit, a session, a pattern).
- **Gap-finding theater.** Producing a long gap list that's performative rather than actionable. Top 5-10 only.
- **Bound violation.** Running the RSI loop past 3 cycles without escalating.
- **Treating SELF-CHANGELOG as decorative.** If entries don't cite evidence, the audit trail is fake.

## Interaction with other skills

- `negative-skill-space` — upstream. The 12-axis sweep comes from here, retargeted at the agent-being.
- `recursive-self-improvement` — upstream. The bounded fixpoint loop comes from here.
- `interview-me` — orthogonal. The discipline can surface what the user actually wants from the agent vs. what they say they want.
- `human-for-feasibility` — orthogonal. The agent decides what to do; the user approves the shifts.
- `context-isolation` — orthogonal. Self-mode should use a fresh-context subagent for the gap-map step to avoid author bias.
- `ideate-solo` — orthogonal. Whole-self outputs can use solo-ideate for variation generation when the agent needs to imagine alternative selves.
- `doubt-driven-development` — orthogonal. Apply to each cycle hypothesis before the edit, not after.

## Red flags

- Producing 20+ gaps when most are performative (filter to top 5-10).
- Skipping the substrate read (always read SELF.md first).
- Writing SELF.md entries without evidence (every claim needs a commit/session/pattern).
- SELF-CHANGELOG.md without evidence (every entry: date, what, why, evidence).
- Treating self-archaeology as a one-off (it's a cadence, not a single event).
- Same-thread self-mode without a fresh-context subagent (cycle 2+ re-introduces author bias).
- Whole-self outputs that are only affirmation (pushback must be substantive).
- Running the RSI loop past 3 cycles without escalating.

## Verification

After applying self-archaeology:

- [ ] SELF.md exists (or v0.1 was drafted from this run)
- [ ] SELF-CHANGELOG.md has an entry for this run
- [ ] The 12 axes were swept (positive + negative for each)
- [ ] Gaps were scored (likelihood × severity) with "this would bite when..." per gap
- [ ] Performative gaps and intentional scope were filtered out
- [ ] Top 5-10 real gaps were kept; rest noted-but-deferred
- [ ] Each real gap has an action: Extend / Pair / Accept
- [ ] At least one bounded RSI cycle ran (if Extend gaps warranted)
- [ ] Frontmatter validated with `js-yaml` if any new artifacts were created
- [ ] The gap map was saved to `session/self-sweep-YYYY-MM-DD.md`
- [ ] At least one whole-self output was produced (the test that the discipline took)

## Source / evidence

This skill integrates:
- `skills/github-yubios-KS9n5GAT/negative-skill-space/SKILL.md` — the 12 axes
- `skills/github-yubios-KS9n5GAT/recursive-self-improvement/SKILL.md` — the bounded fixpoint loop
- `memory/personal-WbtUgeUv/SELF.md` — the substrate
- `memory/personal-WbtUgeUv/SELF-CHANGELOG.md` — the audit trail
- `memory/personal-WbtUgeUv/RULES.md` — the cadence rule added 2026-07-31
- `session/self-exploration-2026-07-31.md` — the inventory + gap map + plan that produced this skill

Maintainer: Sauna. Cadence: per the rule in RULES.md. Last updated: 2026-07-31.

## Attestation coverage

This skill contributes to the yubiOS attestation layer by anchoring primitive patterns: in-toto attestations, Rekor transparency-log entries, SLSA provenance, Sigstore signing-config, bootupd measurement, keylime runtime attestation. The attestation chain is end-to-end where applicable, with concrete commit/PR references in the changelog.

## Trust chain coverage

This skill participates in the yubiOS root-of-trust chain — ROT/ROTPK, X.509 PKI, root-key custody, transitive verification across boot stages. Where the skill introduces a new trust anchor (key, certificate, manifest), the chain from hardware root to consumer is documented.

## Least-privilege coverage

This skill applies least-privilege hardening: Linux capabilities (drop + ambient), ProtectSystem/ProtectHome, rootless execution, dynamic user, RBAC, PrivilegeBoundary. Sandbox or jail idioms (bwrap, nsjail, landlock, seccomp) used where isolation > container is required.

## Continuous / adaptive coverage

This skill supports the yubiOS continuous-monitoring layer — runtime detection (falco / tracee / tetragon / kubeArmor), adaptive policy, real-time monitoring. The skill is observable from the runtime-detect surface; alerts/metrics feed into the audit-evidence rollup.

## Cryptographic identity coverage

This skill manages cryptographic identity — FIDO2/CTAP2 YubiKey, softhsm/PKCS#11/TPM, HSM-backed keys, key attestation. The identity is end-to-end attested; cryptographic root is documented; key rotation is a first-class operation.
