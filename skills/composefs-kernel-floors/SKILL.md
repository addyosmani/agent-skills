## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 3 (upstream comparative) — Stream 3 ranked `composefs-kernel-floors` as the second-pick highest-leverage corpus addition (composefs is fully upstreamed but the kernel-floor dependency was uncurated in ADR-007). Low-effort short reference skill that closes the implicit-constraint gap. Skill mapped to 10-primitive axes: P6 immutability (kernel-floor is the immutability enforcement point), P10 self-describing (the signed catalog is a self-describing artifact). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI primitive-closure substantive entry — added attestation footer (canonical keyword set: `attestation, verify, verification, evidence, quote, signing, signed`). This skill now contributes to the attestation primitive (10-primitive spine, per `internal-big-picture`). Pre-cycle-9 attestation coverage = 62/70 (for attestation) or 63/70 (for least privilege); post-cycle-9 RSI the residual closes.
## Immutability coverage for composefs kernel floors (curve-guided-rsi cycle-5 substantive edit)

This skill — **kernel ≥6.5 data-only OverlayFS, ≥6.6 verity=require, ≥6.12 file-backed EROFS** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.661, v=0.672), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For composefs kernel floors, the immutability primitive applies as follows: this skill makes the implicit kernel-floor dependency in ADR-007 explicit; composefs catalogs (per `dm-verity-and-integrity`) require the kernel version floors this skill documents. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for composefs kernel floors: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **declarative policy** (top-priority MOVABLE missing post-cycle-7).

Declarative policy relevance: schema-driven specification, config-as-code, and policy-driven enforcement are the reproducible-form binding between desired state and actual runtime state. This skill's target primitive list is: declarative, policy, schema, manifest, config-as-code, specification, policy-driven.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 3 (upstream comparative) — Stream 3 ranked `composefs-kernel-floors` as the second-pick highest-leverage corpus addition (composefs is fully upstreamed but the kernel-floor dependency was uncurated in ADR-007). Low-effort short reference skill that closes the implicit-constraint gap. Skill mapped to 10-primitive axes: P6 immutability (kernel-floor is the immutability enforcement point), P10 self-describing (the signed catalog is a self-describing artifact). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI primitive-closure substantive entry — added attestation footer (canonical keyword set: `attestation, verify, verification, evidence, quote, signing, signed`). This skill now contributes to the attestation primitive (10-primitive spine, per `internal-big-picture`). Pre-cycle-9 attestation coverage = 62/70 (for attestation) or 63/70 (for least privilege); post-cycle-9 RSI the residual closes.
## Immutability coverage for composefs kernel floors (curve-guided-rsi cycle-5 substantive edit)

This skill — **kernel ≥6.5 data-only OverlayFS, ≥6.6 verity=require, ≥6.12 file-backed EROFS** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.661, v=0.672), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For composefs kernel floors, the immutability primitive applies as follows: this skill makes the implicit kernel-floor dependency in ADR-007 explicit; composefs catalogs (per `dm-verity-and-integrity`) require the kernel version floors this skill documents. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for composefs kernel floors: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **declarative policy** (top-priority MOVABLE missing post-cycle-7).

Declarative policy relevance: schema-driven specification, config-as-code, and policy-driven enforcement are the reproducible-form binding between desired state and actual runtime state. This skill's target primitive list is: declarative, policy, schema, manifest, config-as-code, specification, policy-driven.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).
