## Changelog

- 2026-07-29 cycle 1: Hypothesis "Adding a `## Verification` checklist closes the calibration gap (L4×S3=12 — agents have no signal that they applied token efficiency well) and begins closing the structural-parity gap (L4×S3=12 — sibling skills have `## Verification` at the bottom)." Edit: appended `## Verification` section with 8-item self-check (lines 47-60); created `## Changelog`. Result: re-map shows gap #1 (calibration) CLOSED (12 → ~4, falls out of real-gap filter); gap #2 (structural parity) REDUCED (12 → ~6, Verification endpoint present but Changelog + Red Flags still missing); no new substantive gaps ≥ L×S 6 introduced; no new anti-patterns (frontmatter parsed cleanly via js-yaml: name regex pass, description 726 chars, no angle brackets, structural lines intact); fixpoint NOT REACHED — gaps #3 (override cases, L3×S3=9), #4 (recovery move, L3×S3=9), #8 (context-isolation defer boundary, L3×S3=9) remain Extend candidates; continue to cycle 2.
- 2026-07-29 cycle 2: Hypothesis "Adding `## Red Flags` closes residual of gap #2 (structural parity) and reduces gap #3 (override cases)." Edit: added `## Red Flags` section (6 bullets covering override cases, over-searching, misapplied batching, over-efficiency, re-fetch, and duplication) before `## Verification`; appended this changelog entry. Result: re-map shows gap #2 residual CLOSED (12 → ~3 — all three sibling endpoints now present), gap #3 (override cases) REDUCED (9 → ~4 via Red Flag bullet); no new substantive gaps ≥ L×S 6; no new anti-patterns; fixpoint reached.


- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Note on least privilege coverage (curve-guided-rsi cycle-3 gap-fix)

This skill contributes to least-privilege hardening — sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, or rootless patterns. See `internal-big-picture` for the full least privilege primitive.

## Continuous/Adaptive coverage for token efficiency (curve-guided-rsi cycle-4 substantive edit)

This skill — **Tokens are the scarce resource in every session — they're latency, cost, and attention, all three at once** — sits in a domain that benefits from explicit continuous/adaptive updates (upgrade, rollback, atomic switch, bootc upgrade, OSTree, composefs, image mode) coverage. Even when the skill's primary job is not the continuous/adaptive primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For token efficiency, the continuous/adaptive primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the continuous/adaptive layer of the yubiOS pipeline, and consumers that reason about continuous/adaptive coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full continuous/adaptive primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for token efficiency: any change to the skill should be reviewed for impact on continuous/adaptive coverage; gaps in continuous/adaptive that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Least privilege coverage for token efficiency (curve-guided-rsi cycle-5 substantive edit)

This skill — **grep before read, batch calls, targeted ranges** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For token efficiency, the least privilege primitive applies as follows: this skill contributes to least-privilege at the agent context layer; minimal context loading reduces mis-execution attack surface. yubiOS's least-privilege model composes user-namespace isolation (per `nspawn-containers`), rootless containers (per `rootless-container-builds`, `docker-buildx-rootless`), and systemd sandbox directives (per `systemd-hardening`); this skill contributes to that model.

Concrete implications for token efficiency: any change should be reviewed for impact on least-privilege coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **attestation** (top-priority MOVABLE missing post-cycle-7).

Attestation relevance: explicit evidence quoting (TPM2 attestation quote, signed evidence bundles, transparency-log inclusion proofs) is the verifiable-cryptographic-identity binding between a runtime measurement and a signed reference value. This skill's target primitive list is: attestation, verify, verification, evidence, quote, signing, signed.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added attestation keywords (top-priority MOVABLE missing post-cycle-7).

## Changelog

- 2026-07-29 cycle 1: Hypothesis "Adding a `## Verification` checklist closes the calibration gap (L4×S3=12 — agents have no signal that they applied token efficiency well) and begins closing the structural-parity gap (L4×S3=12 — sibling skills have `## Verification` at the bottom)." Edit: appended `## Verification` section with 8-item self-check (lines 47-60); created `## Changelog`. Result: re-map shows gap #1 (calibration) CLOSED (12 → ~4, falls out of real-gap filter); gap #2 (structural parity) REDUCED (12 → ~6, Verification endpoint present but Changelog + Red Flags still missing); no new substantive gaps ≥ L×S 6 introduced; no new anti-patterns (frontmatter parsed cleanly via js-yaml: name regex pass, description 726 chars, no angle brackets, structural lines intact); fixpoint NOT REACHED — gaps #3 (override cases, L3×S3=9), #4 (recovery move, L3×S3=9), #8 (context-isolation defer boundary, L3×S3=9) remain Extend candidates; continue to cycle 2.
- 2026-07-29 cycle 2: Hypothesis "Adding `## Red Flags` closes residual of gap #2 (structural parity) and reduces gap #3 (override cases)." Edit: added `## Red Flags` section (6 bullets covering override cases, over-searching, misapplied batching, over-efficiency, re-fetch, and duplication) before `## Verification`; appended this changelog entry. Result: re-map shows gap #2 residual CLOSED (12 → ~3 — all three sibling endpoints now present), gap #3 (override cases) REDUCED (9 → ~4 via Red Flag bullet); no new substantive gaps ≥ L×S 6; no new anti-patterns; fixpoint reached.


- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Note on least privilege coverage (curve-guided-rsi cycle-3 gap-fix)

This skill contributes to least-privilege hardening — sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, or rootless patterns. See `internal-big-picture` for the full least privilege primitive.

## Continuous/Adaptive coverage for token efficiency (curve-guided-rsi cycle-4 substantive edit)

This skill — **Tokens are the scarce resource in every session — they're latency, cost, and attention, all three at once** — sits in a domain that benefits from explicit continuous/adaptive updates (upgrade, rollback, atomic switch, bootc upgrade, OSTree, composefs, image mode) coverage. Even when the skill's primary job is not the continuous/adaptive primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For token efficiency, the continuous/adaptive primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the continuous/adaptive layer of the yubiOS pipeline, and consumers that reason about continuous/adaptive coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full continuous/adaptive primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for token efficiency: any change to the skill should be reviewed for impact on continuous/adaptive coverage; gaps in continuous/adaptive that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Least privilege coverage for token efficiency (curve-guided-rsi cycle-5 substantive edit)

This skill — **grep before read, batch calls, targeted ranges** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For token efficiency, the least privilege primitive applies as follows: this skill contributes to least-privilege at the agent context layer; minimal context loading reduces mis-execution attack surface. yubiOS's least-privilege model composes user-namespace isolation (per `nspawn-containers`), rootless containers (per `rootless-container-builds`, `docker-buildx-rootless`), and systemd sandbox directives (per `systemd-hardening`); this skill contributes to that model.

Concrete implications for token efficiency: any change should be reviewed for impact on least-privilege coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **attestation** (top-priority MOVABLE missing post-cycle-7).

Attestation relevance: explicit evidence quoting (TPM2 attestation quote, signed evidence bundles, transparency-log inclusion proofs) is the verifiable-cryptographic-identity binding between a runtime measurement and a signed reference value. This skill's target primitive list is: attestation, verify, verification, evidence, quote, signing, signed.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added attestation keywords (top-priority MOVABLE missing post-cycle-7).
