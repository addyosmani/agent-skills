## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `nspawn-containers` proposal — nspawn was implicit across `bcvk-virtualization`, `bootc-images`, and `mkosi-image-builder` but had no dedicated skill. The hermetic-image-rooted container pattern is now first-class. Skill mapped to 10-primitive axes: P9 segmentation (primary), P3 least privilege (user-namespace + bind scoping), P6 immutability (signed mkosi image as root), P4 declarative policy (nspawn flags as declarative). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Segmentation coverage for nspawn containers (curve-guided-rsi cycle-5 substantive edit)

This skill — **RootImage=, --boot, --private-users, --network-bridge** — sits in a domain that benefits from explicit segmentation coverage (process, container, VM, network, hardware). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.559, v=0.175), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For nspawn containers, the segmentation primitive applies as follows: this skill provides the segmentation primitive for image-rooted containers; hermetic builds + portable services + boundary testing compose via nspawn. yubiOS's segmentation stack composes nspawn containers (per `nspawn-containers`), vfio-user device boundaries (per ADR-031), and CISA ZTMM microsegmentation primitives (per `internal-big-picture`); this skill is one contributor.

Concrete implications for nspawn containers: any change should be reviewed for impact on segmentation coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `nspawn-containers` proposal — nspawn was implicit across `bcvk-virtualization`, `bootc-images`, and `mkosi-image-builder` but had no dedicated skill. The hermetic-image-rooted container pattern is now first-class. Skill mapped to 10-primitive axes: P9 segmentation (primary), P3 least privilege (user-namespace + bind scoping), P6 immutability (signed mkosi image as root), P4 declarative policy (nspawn flags as declarative). Frontmatter validated by `js-yaml`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Segmentation coverage for nspawn containers (curve-guided-rsi cycle-5 substantive edit)

This skill — **RootImage=, --boot, --private-users, --network-bridge** — sits in a domain that benefits from explicit segmentation coverage (process, container, VM, network, hardware). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.559, v=0.175), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For nspawn containers, the segmentation primitive applies as follows: this skill provides the segmentation primitive for image-rooted containers; hermetic builds + portable services + boundary testing compose via nspawn. yubiOS's segmentation stack composes nspawn containers (per `nspawn-containers`), vfio-user device boundaries (per ADR-031), and CISA ZTMM microsegmentation primitives (per `internal-big-picture`); this skill is one contributor.

Concrete implications for nspawn containers: any change should be reviewed for impact on segmentation coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).
