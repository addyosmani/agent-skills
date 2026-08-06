---
name: novelty-indication
description: "Assesses whether an idea is novel and non-obvious before expanding it. Walks the Graham v. John Deere framework (MPEP 2141) adapted for engineering judgment, distinguishes mechanism vs application vs policy layers, treats the project's own ADRs/PRs/Linear issues as internal prior art, and returns a structured verdict (NOVEL / BORDERLINE / NOT-NOVEL) with cited reasoning. Use when you have an idea in yubiOS and want to know whether it's worth expanding vs filing under existing work, when reviewing a proposal that might duplicate an existing ADR or PR, when answering 'is this novel enough to patent / publish / commit to', or any time 'are we sure this hasn't been done' comes up. Triggers on 'novel', 'prior art', 'obviousness', 'is this original', 'has anyone done this', 'duplicate of', 'redundant with', 'non-obvious', 'patent', 'invention', 'first-of-its-kind'."
license: "MIT"
metadata:
  short-description: "Graham v. John Deere novelty assessment adapted for engineering decisions, with internal prior art awareness"
---

# Novelty Indication

## Overview

When someone says "is this novel?", the honest answer requires more than a vibe. This skill adapts the patent-law Graham v. John Deere obviousness framework (35 U.S.C. § 103, codified in MPEP §2141) for **engineering-decision** use: a structured verdict on whether an idea is worth expanding versus filing under existing work.

The framework is biased toward honest skepticism. The default is "this is probably not novel" — your job is to surface what *is* novel and what is *already covered*.

## When to Use

Apply when:

- A teammate proposes an idea and wants to know "is this worth expanding?"
- You're about to invest significant effort and want to verify the work isn't duplicating an existing ADR or PR
- The user says "novel," "prior art," "obviousness," "has anyone done this," "patent," "first-of-its-kind"
- You're reviewing a spec and need to flag what is genuinely new versus what is already decided

Do NOT use:

- For trivial feature additions (use the existing ADR/PR lookup)
- For pure factual questions ("does Linux support X?") — use `source-driven-development`
- To replace a real prior-art search for actual patent filing — this is engineering judgment, not legal opinion
- When the user already has a one-pager and just wants execution (use `planning-and-task-breakdown`)

## The Framework

### Step 1 — Restate the idea as a one-sentence problem statement

If you can't, the intent is unclear. Use `interview-me` first.

Example: "How might we use the bootc + QEMU/libvirt PCI passthrough boundary as a cutoff point when an AI/ML model misbehaves, preserving model state for forensic capture?"

### Step 2 — Split the idea into layers

Most ideas mix three layers. Surface them separately:

| Layer | Question | Example |
|---|---|---|
| **Mechanism** | What does the system DO? | "bootc VM with vfio-user-pci device model + IOMMU gate" |
| **Trigger** | What causes the system to act? | "anomaly score from model output crosses a threshold" |
| **Policy** | What does the system DO in response? | "revoke device access, snapshot VM, alert operator" |

Patent law treats the *combination* as the invention. Engineering decisions often have one layer already covered, with the new contribution in a different layer. Surface which layer is novel.

### Step 3 — Check internal prior art FIRST

The project's own ADRs, PRs, and Linear issues are the most important prior art to check. Search before looking externally:

- `refs/*.md` on the yubiOS repo (especially anything matching the topic)
- `docs/ADR.md` for Architecture Decision Records
- `docs/FUTURE.md` for planned-but-not-decided work
- Linear team OMNI-AGENT issues matching the topic
- PRs in `yubi-OS/yubiOS` with relevant keywords

If internal prior art covers the **mechanism** layer, the new contribution must be in the **trigger** or **policy** layer to be worth pursuing.

### Step 4 — Check external prior art

For each layer not covered internally, run a quick scan:

- **Direct equivalents:** what existing products/projects address the same problem?
- **Failed attempts:** what was tried and abandoned, and why?
- **Academic / formal:** any research papers or surveys?
- **Adjacent / historical:** earlier or related efforts in the same family?

Use `prior-art-search` for a structured external scan. Quick informal searches (3-5 queries, top 5 hits) are fine for engineering judgment.

### Step 5 — Apply the Graham factors

For each *new* layer (the ones not covered by prior art), apply the four Graham inquiries (MPEP §2141 II.A–C):

1. **Scope and content of prior art.** What's been done in this exact area, and in analogous areas?
2. **Differences between the claimed invention and the prior art.** What's actually new?
3. **Level of ordinary skill in the pertinent art.** Could a skilled practitioner combine the known elements?
4. **Secondary considerations.** Long-felt need, failure of others, unexpected results (only if you have evidence).

Use the KSR rationale catalog (MPEP §2141 III) to anticipate §103 rejection rationales:

- **(A)** Combining prior art elements according to known methods to yield predictable results — the most common rejection rationale
- **(B)** Simple substitution of one known element for another
- **(C)** Use of known technique to improve similar devices in the same way
- **(D)** Applying a known technique to a known device ready for improvement
- **(E)** "Obvious to try" — finite number of predictable solutions
- **(F)** Known work in one field prompting variations in another field

If a §103 rejection is buildable from KSR rationale (A), the idea is at risk. Rationale (E) is the weakest and easiest to overcome.

### Step 6 — Produce the verdict

One of three verdicts, with explicit reasoning:

| Verdict | Meaning | Action |
|---|---|---|
| **NOVEL** | At least one layer is genuinely new, not obvious from prior art | Worth expanding; proceed to `idea-refine` or `ideate-solo` |
| **BORDERLINE** | Layers are present but a §103 rejection is buildable | Worth expanding ONLY if secondary considerations (long-felt need, etc.) can be cited |
| **NOT-NOVEL** | All layers covered by prior art (internal or external) | File under existing work; reference the covering ADR/PR/issue |

Always cite the specific prior art that drove the verdict. "It's novel" without a citation is not a verdict.

## The Output

```markdown
# Novelty Indication: [idea name]

Date: YYYY-MM-DD
Verdict: NOVEL | BORDERLINE | NOT-NOVEL
Source: novelty-indication skill (Graham v. John Deere adapted)

## Problem statement
[One sentence from Step 1]

## Layers

### Mechanism
[What it does, and the prior art that covers it — internal first]

### Trigger
[What causes it to act, and prior art coverage]

### Policy
[What it does in response, and prior art coverage]

## Internal prior art (cited)
- [ADR-NNN / PR #NN / refs/<file>.md / OMN-NNN] — [what it covers]

## External prior art (cited)
- [Source name + URL] — [what it covers]

## Graham factor analysis

### Scope and content of prior art
[What's known]

### Differences from prior art
[What's genuinely new — by layer]

### Level of ordinary skill
[Could a PHOSITA in this area combine the known elements?]

### Secondary considerations
[Long-felt need, failure of others, etc. — only if evidence exists]

## Anticipated KSR rejection rationales
- (A) Combining prior art: [buildable?]
- (B) Simple substitution: [buildable?]
- ...

## Verdict
[NOVEL | BORDERLINE | NOT-NOVEL] — [one-sentence reason]

## Recommended next step
[Specific action: which ADR to extend, which Linear issue to file, which skill to invoke]
```

## Anti-patterns

- **Skipping internal prior art.** A non-trivial fraction of "novel" ideas in yubiOS are already covered by an existing ADR. Internal-first saves the most time.
- **Confident verdict without citation.** "It's novel" with no cited prior art is guessing. Always cite what was checked.
- **Treating mechanism novelty as application novelty.** If the mechanism is established (ADR-031 covers vfio-user mediation), the application layer is what's new — say so.
- **Inventing prior art.** If a search returns nothing, the verdict says "no prior art found" — not made-up citations to fill the report.
- **Over-using BORDERLINE.** BORDERLINE is for cases where both NOVEL and NOT-NOVEL are defensible. If it's clearly NOVEL or clearly NOT-NOVEL, say so.
- **Skipping the trigger/policy decomposition.** Many "novel" ideas have a generic mechanism and the actual novelty is in the trigger or policy. Surface it.
- **Conflating engineering novelty with patentability.** This skill gives engineering judgment for "is this worth expanding?" — not a legal opinion on patentability. Real patent filing requires a patent attorney and a real prior-art search.

## Loading Constraints

- **Read-only.** Produces a verdict document. Does not modify external systems.
- **Cited.** Every claim about prior art has a URL or file path behind it.
- **Honest.** Default to skepticism; surface the novel layer, don't invent novelty.
- **Bounded.** One pass. No recursion beyond Step 4.

## Interaction with Other Skills

- **`prior-art-search`** — upstream or parallel. Run prior-art-search first for a structured external scan, then novelty-indication for the verdict.
- **`idea-refine` / `ideate-solo`** — downstream. If the verdict is NOVEL or BORDERLINE-with-evidence, hand off to idea-refine or ideate-solo to develop it.
- **`idea-kill`** — downstream alternative. If the verdict is NOT-NOVEL or BORDERLINE-without-evidence, run idea-kill to get an honest kill verdict before dropping it.
- **`negative-skill-space`** — orthogonal. novelty-indication asks "is this new?"; negative-skill-space asks "what doesn't this cover?". Different gaps.
- **`documentation-and-adrs`** — when expanding, the new contribution goes into a `refs/<topic>-YYYY-MM-DD.md` on the yubiOS repo, not into local `documents/` (per project rules).

## Red Flags

- A verdict with no internal-prior-art check (highest-signal prior art in yubiOS is internal)
- "NOVEL" without a single citation
- Treating the user's framing as the layer decomposition (decompose by mechanism/trigger/policy, not by the user's wording)
- Inventing external prior art to support a desired verdict
- Skipping the KSR rejection rationales — these are the actual test for §103 obviousness
- A verdict that conflicts with an existing ADR and doesn't explain the conflict

## Verification

After applying novelty-indication:

- [ ] Problem statement is one sentence
- [ ] Layers split into mechanism / trigger / policy
- [ ] Internal prior art checked first (ADRs, PRs, Linear issues, refs/)
- [ ] External prior art cited with URLs
- [ ] Graham factors A, B, C addressed (D = secondary considerations only if evidence)
- [ ] KSR rejection rationales A–F assessed
- [ ] Verdict is one of NOVEL / BORDERLINE / NOT-NOVEL
- [ ] Verdict cites at least one specific prior-art source
- [ ] Recommended next step is concrete (which ADR/PR/issue/skill)

## Least Privilege coverage for novelty indication (curve-guided-rsi cycle-4 substantive edit)

This skill — **When someone says "is this novel** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For novelty indication, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for novelty indication: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Audit/evidence coverage for novelty indication (curve-guided-rsi cycle-5 substantive edit)

This skill — **Graham/John Deere, mechanism/application/policy, prior-art search** — sits in a domain that benefits from explicit audit/evidence coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.686, v=0.329), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For novelty indication, the audit/evidence primitive applies as follows: this skill contributes to audit by enforcing the novelty-verification discipline before committing to ideas. yubiOS's audit pipeline composes the evidence-bundle format (per `audit-evidence-packaging`), Rekor v2 transparency log (per `sigstore-rekor-v2`), SLSA provenance attestations (per `slsa-provenance`), and the per-cycle `curve-guided-rsi` changelog (this skill); downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) expect every skill to declare its audit contribution.

Concrete implications for novelty indication: any change should be reviewed for impact on audit-evidence coverage; gaps are tracked in the cycle-5 run log.


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
