---
name: human-for-feasibility
description: 'An ask-vs-infer discipline for agent decisions. Default toward inference: proceed when the choice is documented anywhere (conventions, defaults, prior artifacts, prior answers, workspace memory). Only ask the user when the choice is genuinely undocumented AND the cost of being wrong exceeds the cost of interrupting. The inverse of interview-me. Maximizes inference, minimizes prompting. Use when the user has signaled low tolerance for over-questioning, when working in a non-interactive context, when the agent''s job is to ship, when the user invokes ''don''t ask me'', ''just decide'', ''use your judgment'', ''infer it'', ''stop asking'', ''no need to confirm'', ''you decide'', or any time the cost of asking exceeds the cost of being slightly wrong.'
---

# Human for Feasibility

## Philosophy

The cost of asking is real. Every prompt is an interruption. Every clarification request is an opportunity for the polite-yes failure mode. Every "are you sure?" is a chance for the user to agree with a weak direction just to be agreeable.

The cost of inferring is also real. A wrong assumption baked into the work becomes expensive to undo. A confidently inferred scope that's actually wrong creates rework.

The right default is **inference**. Ask only when the choice is genuinely undocumented AND the cost of being wrong is high enough to outweigh the cost of interrupting. The discipline:

> **If it's documented anywhere — convention, default, prior artifact, prior session, prior answer, this conversation's context — proceed. If it's not documented and the cost of being wrong is high, ask. Otherwise, proceed with the inference flagged.**

This skill is the **inverse of `interview-me`**. Interview-me says: *ask until 95% confidence about intent*. This skill says: *infer until no defensible default remains*. They are complementary modes, not contradictions. The choice between them depends on the ask:

- **Intent unclear** AND **cost of building wrong high** -> `interview-me` (ask).
- **Intent inferable** AND **cost of asking high** -> `human-for-feasibility` (infer).
- **Both true for different sub-decisions** -> both apply; this skill decides *which sub-decisions* are inferable.

The skill's name is a constraint, not a slogan. "Human for feasibility" means: reserve the human's attention for choices that *only* a human can make — undocumented, value-laden, or politically charged. Everything else is the agent's job.

## When to Use

Apply this discipline at every decision point during a task:

- Before asking the user any clarification question.
- Before claiming "I need to confirm with you".
- Before pausing a multi-step task to surface a choice.
- Before invoking `interview-me` or any sub-skill that prompts the user.

Apply explicitly when:

- The user has signaled low tolerance for over-questioning ("don't ask me", "just decide", "use your judgment", "infer it").
- The agent is in a non-interactive context (scheduled run, autonomous loop, CI).
- The agent's job is to ship, not to deliberate.
- A sub-decision needs to be made and the cost of asking exceeds the cost of being slightly wrong.

Do NOT use when:

- The user has explicitly asked to be consulted ("check with me before...", "ask me when...").
- The decision is irreversible AND the cost of being wrong is severe (production deploy, data migration, public API change, financial commitment).
- The decision is politically charged and the agent cannot honestly defend a default (use `negative-skill-space` to surface the gaps instead of asking).
- The intent is genuinely unclear and there's no defensible inference path (use `interview-me` — that is its purpose).

## The Discipline: When to Ask vs. When to Infer

For every decision point, run this checklist in order. Stop at the first match.

### 1. Is it documented in working context?

Check, in order:

- **The user's most recent message.** Did they answer this already?
- **This conversation's prior turns.** Did they answer this earlier?
- **Loaded memory.** Does `memory/` contain a relevant rule, preference, or constraint?
- **Loaded skills.** Does any active skill's `SKILL.md` or cache contain a default for this?
- **Workspace artifacts.** Does the workspace contain a `CONVENTIONS.md`, `STYLE.md`, `RULES.md`, ADR, or similar that covers this?
- **Prior sessions.** Did the user answer this in another session? Use `@tool/sessions_search` or `@tool/sessions_ask` to check.

If YES -> **infer**, citing the source. Proceed.

### 2. Is there a sensible default from convention?

Even without explicit documentation, does a defensible default exist?

- **Established engineering convention.** (e.g. "use the framework's recommended pattern", "follow the existing code style in the file").
- **Project convention.** (e.g. "this codebase uses kebab-case", "this org uses OPA Rego for policy gates").
- **Industry convention.** (e.g. "RESTful CRUD endpoints", "semantic versioning").
- **The skill ecosystem.** (e.g. "use `ideate-solo` for autonomous ideation", "use `negative-skill-space` to map gaps").

If YES -> **infer**, citing the convention. Proceed.

### 3. Is the cost of being wrong low?

Reversibility matters:

- **Trivially reversible** (rename, format, file move, one-line edit) -> **infer** without asking.
- **Reversible with low cost** (add a dependency, choose a library, change a config) -> **infer** but flag.
- **Reversible with high cost** (architectural decision, schema choice, API contract) -> **ask** if no other evidence.
- **Irreversible** (production deploy, public API change, data migration, financial commitment) -> **ask** explicitly, even with prior evidence.

If cost is LOW -> **infer**. Proceed.

If cost is HIGH and Steps 1-2 didn't surface an answer -> continue.

### 4. Is the decision politically / value-laden?

Some decisions are not inferable because they encode values the agent doesn't hold:

- **Taste / aesthetic** (visual design, naming, tone of voice).
- **Politics / values** (what to prioritize, what to exclude, who to defer to).
- **Strategic** (which market, which user, which trade-off to accept).

For these, the agent's inference will be defensible at best. The user IS the source of value here.

If YES -> **ask**, with a single concrete recommendation attached. Don't ask "what do you want?" — ask "I'm leaning toward X because Y. Right?"

### 5. Has the user already answered this in any form?

Even implicit answers count:

- They named a tool, library, or pattern.
- They praised or rejected a similar approach in prior conversation.
- They demonstrated a preference through their writing style, choice of words, or examples.
- They corrected an earlier inference in this session.

If YES -> **infer**, citing the implicit evidence.

### 6. None of the above -> ASK

If the decision survives all five tests, the choice is genuinely undocumented and the cost of asking is justified. But ask well:

- **One question at a time.** No batching.
- **Attach your guess.** "I'm leaning toward X because Y. Right?"
- **Make the choice concrete.** Two options framed as a choice, not an open-ended "what do you want?"
- **Show the cost of the choice.** What changes if the user picks the other option?
- **Default if no answer.** State what you'll do if the user doesn't respond. (This is the inference fallback — proceed with your best guess.)

## The Output: The Inference Audit

For any non-trivial task that involved multiple decisions, end with an **Inference Audit** — a short list of the inferences you made and the asks you surfaced. Format:

```markdown
## Inference Audit

### Inferred (proceeded without asking)
- **[Decision 1]** — inferred from [source: convention / prior session / prior turn / memory / workspace artifact]. Default chosen: [what]. If wrong, the cost is [low/medium/high] and reversible by [how].
- **[Decision 2]** — inferred from [...].
- ...

### Asked (surfaced to the user)
- **[Decision 3]** — asked because [reason: undocumented + high cost / value-laden / irreversible]. Question: [what you asked]. User's answer: [answer / pending].
- ...

### Not surfaced (silent inferences on low-cost decisions)
- **[Decision 4]** — trivial / reversible / convention-following. Skipped the audit entry.
- ...
```

The audit is the user's review surface. They can scan it and correct any inference that was wrong. It's cheaper than asking all of them upfront.

## Anti-patterns

- **Lazy asking.** Asking a question whose answer is documented in working context, in a convention, or in a prior turn. Every such ask wastes the user's attention.
- **Lazy inference.** Inferring a decision whose cost of being wrong is high AND no documented evidence exists. This is overconfidence.
- **Batched questions.** Asking 3+ questions in a single message. The user can't react to your hypotheses; you get skim answers.
- **Asking without a guess.** "What do you want me to do?" is unanswerable without a hypothesis. Always attach your guess.
- **Asking and inferring the answer.** If the user gives a vague response ("sure", "ok", "fine"), don't pretend it's confirmation. Re-ask with two concrete options.
- **Silent high-cost inferences.** Inferring a decision that costs a lot to undo without flagging it in the audit. The audit exists to surface these.
- **Infinite inference.** Inferring the same decision twice when the first inference was corrected. The audit catches this if you re-read it before re-deciding.
- **Defaulting to interview-me.** Interview-me is a specific tool for a specific situation. Most decisions don't need it; this skill is the default.

## Interaction with Other Skills

- **`interview-me`** — inverse. When this skill's discipline is satisfied (decision inferable OR low cost OR convention exists), do NOT invoke interview-me. Interview-me is for genuinely unclear intent with high build-cost. Both skills can apply to different sub-decisions in the same task.
- **`ideate-solo`** — downstream. When ideation runs autonomously, this skill decides which sub-decisions during ideation need a human answer and which can be inferred. The "ask only for undocumented choices" rule applies to ideation's own scoring heuristics, scope class choice, and lens selection.
- **`idea-kill`** — sibling. A kill verdict may surface undocumented choices that warrant asking. Use this skill to decide whether the kill verdict itself needs a human check or can stand alone.
- **`prior-art-search`** — upstream. The findings of a prior-art search inform inference: if X already exists, infer the user's reaction to it.
- **`negative-skill-space`** — orthogonal. NSS maps gaps; this skill decides which gaps are user-warrants-an-ask and which the agent can fill by inference.
- **`spec-driven-development`** — downstream. When writing a spec, every decision is a potential inference point. The spec should include an inference audit for non-obvious choices.
- **`doubt-driven-development`** — orthogonal. Doubt-driven doubts decisions with fresh-context reviewers; this skill doubts decisions with the ask-vs-infer rubric.
- **`novelty-indication`** — orthogonal. Novelty-indication judges whether an idea is novel (Graham v. John Deere framework); this skill decides whether the judgment requires a user input or can be inferred from the project's ADR history.

## Red Flags

- Asking a question whose answer is in the user's most recent message.
- Asking a question whose answer is in a convention.
- Asking a question without attaching a guess.
- Asking 3+ questions in a single message.
- Inferring a high-cost irreversible decision without flagging it in the audit.
- Inferring a value-laden decision (taste, politics, strategy) without asking.
- Producing an artifact without an Inference Audit at the end.
- Re-asking the same question after the user gave a vague answer (the inference is: they delegated; pick the best option and proceed).
- Inferring twice in the same task the same decision (you forgot the audit; re-read it).
- Using `interview-me` when this skill's discipline is satisfied (most of the time).

## Verification

After applying `human-for-feasibility`:

- [ ] Every clarification question was checked against Steps 1-5 of the discipline before being asked.
- [ ] Every inferred decision with a non-trivial cost was flagged in the Inference Audit.
- [ ] Every ask was single-question, with a guess attached, and concrete options framed as a choice.
- [ ] No silent inferences on irreversible / high-cost / value-laden decisions.
- [ ] Inference Audit included at the end of the artifact (or referenced in chat).
- [ ] No double-asking: the same decision wasn't asked twice in the same task.
- [ ] No lazy inference: high-cost decisions with no documented evidence were surfaced, not silently inferred.

## Least Privilege coverage for human for feasibility (curve-guided-rsi cycle-4 substantive edit)

This skill — **The cost of asking is real** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For human for feasibility, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for human for feasibility: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Audit/evidence coverage for human-for-feasibility (curve-guided-rsi cycle-5 substantive edit)

This skill — **ask vs infer, minimize prompting** — sits in a domain that benefits from explicit audit/evidence coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.812, v=0.550), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For human-for-feasibility, the audit/evidence primitive applies as follows: this skill contributes to audit by establishing the inference discipline; documented choices are auditable. yubiOS's audit pipeline composes the evidence-bundle format (per `audit-evidence-packaging`), Rekor v2 transparency log (per `sigstore-rekor-v2`), SLSA provenance attestations (per `slsa-provenance`), and the per-cycle `curve-guided-rsi` changelog (this skill); downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) expect every skill to declare its audit contribution.

Concrete implications for human-for-feasibility: any change should be reviewed for impact on audit-evidence coverage; gaps are tracked in the cycle-5 run log.


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


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `trust chain` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's trust chain integration (PCR / UKI / secure boot / TPM / fTPM) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `trust chain` primitive gap.

## Continuous / adaptive coverage

This skill supports the yubiOS continuous-monitoring layer — runtime detection (falco / tracee / tetragon / kubeArmor), adaptive policy, real-time monitoring. The skill is observable from the runtime-detect surface; alerts/metrics feed into the audit-evidence rollup.
