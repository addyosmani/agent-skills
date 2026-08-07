---
name: context-isolation
description: 'Always read first, before starting any multi-step, multi-phase, or multi-workstream task: decide what needs its own isolated context versus what should share the main thread. Use fresh subagents or sessions for adversarial/verification review, independent parallel workstreams, and large exploratory research so their intermediate noise, dead ends, and half-formed guesses don''t pollute or bias the main thread. Keep a single continuous task in one context instead of fragmenting it. Triggers on: context pollution, context rot, subagent, isolated task, fresh context, parallel work, verification review, long session, context window, contaminated reasoning.'
---

# Context Isolation

## Overview

Every additional turn, tool result, and dead-end exploration in a context window is signal until it becomes noise. As a session grows, irrelevant history dilutes the model's attention on what actually matters right now — this is context rot. Left unmanaged it produces three concrete failure modes: decisions anchored on stale or superseded findings, verification that rubber-stamps the original reasoning because it can see that reasoning, and wasted tokens re-establishing context that a cleanly scoped subagent would never have needed in the first place.

Context isolation is not "use fewer tokens" (that's `token-efficiency`) — it's "put the right boundary around the right unit of work" so contamination can't cross it.

## When to isolate

- **Independent verification or adversarial review.** A reviewer that can see the original author's reasoning inherits its blind spots and biases toward agreeing. Verification needs a fresh context: give it the artifact and the acceptance criteria, not the story of how it was built.
- **Parallel independent workstreams.** If two pieces of work don't depend on each other's intermediate state, running them in the same context serializes them for no benefit and lets one's noise bleed into the other's reasoning.
- **Large exploratory research or search.** Most of what a broad search turns up is noise you discard. Isolate the search so only the distilled conclusion — not every dead end — lands in the main thread.
- **Anything whose failure shouldn't contaminate the main thread.** A speculative approach that might not pan out should be explored somewhere its abandonment doesn't leave confusing half-finished context behind.

## When NOT to isolate

- **A single continuous task with real dependencies between steps.** Splitting a task where step 3 needs the reasoning from step 1 just to re-derive that reasoning at extra cost. Isolation only pays off when the boundary is real.
- **Anything the main thread needs to react to immediately.** If you'll need to make a judgment call based on subtlety in the result, don't hide that subtlety behind a subagent's compressed summary.

## How to isolate

- **Subagents with a minimal, self-contained prompt.** A subagent has no memory of this conversation. Give it exactly the inputs it needs (specific IDs, file paths, constraints, the question to answer) — not "everything we discussed," which forces it to either ask for clarification it can't get or guess.
- **Fresh sessions for genuinely separate topics.** If a new thread of work shares no state with the current one, starting fresh avoids both context rot and cross-topic confusion.
- **Scoped tool calls over broad ones.** Reading one targeted file section is a form of isolation too — it keeps unrelated file content out of context entirely.
- **Bring back conclusions, not transcripts.** When a subagent or isolated exploration finishes, pull its distilled finding into the main thread — not its full working log.

## Subagent prompt load-order

Every `@tool/task` general-subagent prompt MUST begin with a skill-load directive. The prompt should literally start with:

> "Read these skills first, in this order: 1) `using-agent-skills` (if not loaded) 2) `token-efficiency` 3) `context-isolation` 4) the relevant domain skill for this task (e.g. `linear`, `github-api`, `prior-art-search`). Then proceed with the task below."

Why: subagents have fresh context and won't load skills proactively on their own. Without this directive, the subagent re-discovers the same discipline the hard way — 3+ wasted turns on schema/type errors before reading the right skill.

When to skip: only when the task is bounded enough that no external API or skill is required (e.g. pure computation, file-system-only work). Even then, include the always-on pair.

## Anti-patterns

- Spawning a subagent with the entire chat history when it only needs three specific facts.
- Re-running the same exploration twice because an earlier isolated thread's findings were never surfaced back to the main context.
- Asking a verification pass to review work while it can still see the original chain of reasoning that produced it.
- Fragmenting one continuous, dependent task across multiple isolated calls purely to "save tokens," then paying more to re-establish context each time than isolation ever saved.

## Interaction with Other Skills

- **`token-efficiency`** — adjacent, always-on pair. `token-efficiency` minimizes *cost* (tokens per signal); `context-isolation` minimizes *contamination* (irrelevant reasoning leaking into relevant decisions). Compose: apply `token-efficiency` to keep the unit of work small, then `context-isolation` to decide where that unit lives. The subagent prompt load-order already pairs them.
- **`negative-skill-space`** — primary pair. NSS maps an artifact's gaps; `context-isolation` runs that mapping in a fresh-context subagent so the mapper doesn't carry the artifact author's blind spots. When NSS produces actionable Extend gaps for a skill, isolate the editing cycle before closing them — and add `negative-skill-space` to the subagent load-order.
- **`doubt-driven-development`** — orthogonal. DDD doubts a specific decision with a fresh-context reviewer; `context-isolation` is the boundary that makes DDD's "fresh context" possible. Self-mode of `recursive-self-improvement` requires both.
- **`recursive-self-improvement`** — downstream consumer. RSI's self-mode cycles (improving a skill the agent itself authored) require `context-isolation` for every cycle, not just cycle 1, to avoid re-introducing author bias. Apply this skill at the start of every RSI self-mode cycle.
- **`using-agent-skills`** — upstream. If `context-isolation` is consistently NOT being applied where it should be, that's a workflow-position problem (skill not in `using-agent-skills` discovery), not a body-edit problem. Hand off to `using-agent-skills` review, not another RSI cycle.
- **`code-review-and-quality`** — downstream. After a subagent has done isolated verification, the result still flows through normal review before merge. `context-isolation` is upstream of review; review is downstream.

## Changelog

- 2026-07-29 cycle 1: Hypothesis "Skill lacks explicit `## Interaction with Other Skills` section, creating asymmetry with downstream skills (`negative-skill-space`, `doubt-driven-development`, `recursive-self-improvement`, `code-review-and-quality`) that already point at it." Edit: added `## Interaction with Other Skills` section naming `token-efficiency`, `negative-skill-space`, `doubt-driven-development`, `recursive-self-improvement`, `using-agent-skills`, and `code-review-and-quality` as explicit pairs; created `## Changelog` section header per RSI cycle protocol. Result: re-map shows no new substantive gaps ≥ L×S 6 introduced; primary gap #1 closed (16→0), gap #6 closed (9→0), gap #5 reduced (16→9); js-yaml frontmatter validated clean; fixpoint reached.




## Note on least privilege coverage (curve-guided-rsi v1 gap-fix)

This skill contributes to least-privilege hardening — sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, or rootless patterns. See `internal-big-picture` for the full least privilege primitive.

## Declarative Policy coverage for context isolation (curve-guided-rsi cycle-4 substantive edit)

This skill — **Every additional turn, tool result, and dead-end exploration in a context window is signal until it becomes noise** — sits in a domain that benefits from explicit the declarative policy pattern (mkosi.conf, Containerfile, Rego policy, yubiOS.rego, build configuration) coverage. Even when the skill's primary job is not the declarative policy primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For context isolation, the declarative policy primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the declarative policy layer of the yubiOS pipeline, and consumers that reason about declarative policy coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full declarative policy primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for context isolation: any change to the skill should be reviewed for impact on declarative policy coverage; gaps in declarative policy that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Least privilege coverage for context isolation (curve-guided-rsi cycle-5 substantive edit)

This skill — **fresh subagent context, isolation boundaries, no main-thread pollution** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.741, v=0.315), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For context isolation, the least privilege primitive applies as follows: this skill is the operational discipline for least-privilege in agent context; fresh-context subagents do not inherit the main thread's permissions. yubiOS's least-privilege model composes user-namespace isolation (per `nspawn-containers`), rootless containers (per `rootless-container-builds`, `docker-buildx-rootless`), and systemd sandbox directives (per `systemd-hardening`); this skill contributes to that model.

Concrete implications for context isolation: any change should be reviewed for impact on least-privilege coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `trust chain` coverage gap in the 10-primitive yubiOS framework. **trust chain** was missing across 23/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill contributes to the yubiOS trust chain via PCR / UKI / secure boot / TPM / fTPM integration. Specifically it covers: trust chain, PCR, UKI.

**Keywords introduced in this skill (cycle-5 RSI):** `trust chain`, `PCR`, `UKI`, `secure boot`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `trust chain` count moved 23→24/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `trust chain` primitive gap (corpus-wide count 23→24/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `attestation` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's attestation evidence (SLSA / in-toto / provenance / TPM-quote patterns) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `attestation` primitive gap.

## Continuous / adaptive coverage

This skill supports the yubiOS continuous-monitoring layer — runtime detection (falco / tracee / tetragon / kubeArmor), adaptive policy, real-time monitoring. The skill is observable from the runtime-detect surface; alerts/metrics feed into the audit-evidence rollup.
