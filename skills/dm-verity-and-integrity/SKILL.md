## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `dm-verity-and-integrity` proposal — dm-verity was only mentioned inline in `mkosi-image-builder` and `bootc-images`. The load-bearing invariant "dm-verity-verified /usr" is now first-class. Skill mapped to 10-primitive axes: P6 immutability (primary), P1 attestation (Merkle root is attestable), P5 continuous/adaptive (continuous verification at mount + runtime via IMA), P10 self-describing (signed composefs catalog). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Immutability coverage for dm-verity and integrity (curve-guided-rsi cycle-5 substantive edit)

This skill — **dm-verity root hash, fs-verity signing, IMA policy, composefs catalog** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.056, v=0.266), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For dm-verity and integrity, the immutability primitive applies as follows: this skill is the first-class home of the /usr immutability invariant; dm-verity + fs-verity + IMA + composefs compose the load-bearing chain. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for dm-verity and integrity: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `dm-verity-and-integrity` proposal — dm-verity was only mentioned inline in `mkosi-image-builder` and `bootc-images`. The load-bearing invariant "dm-verity-verified /usr" is now first-class. Skill mapped to 10-primitive axes: P6 immutability (primary), P1 attestation (Merkle root is attestable), P5 continuous/adaptive (continuous verification at mount + runtime via IMA), P10 self-describing (signed composefs catalog). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Immutability coverage for dm-verity and integrity (curve-guided-rsi cycle-5 substantive edit)

This skill — **dm-verity root hash, fs-verity signing, IMA policy, composefs catalog** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.056, v=0.266), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For dm-verity and integrity, the immutability primitive applies as follows: this skill is the first-class home of the /usr immutability invariant; dm-verity + fs-verity + IMA + composefs compose the load-bearing chain. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for dm-verity and integrity: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).
