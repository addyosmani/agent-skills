## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `yubikey-operations` proposal — closes the project-namesake gap (zero skills dedicated to YubiKey operations despite 4 skills referencing it inline). Skill mapped to 10-primitive axes: P8 cryptographic identity (primary), P2 trust chain (root of trust), P1 attestation (FIDO2 attestation cert), P7 audit/evidence (key-use log). Frontmatter validated by `js-yaml`: name regex OK, description ≤1024 chars, no `<`/`>`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Cryptographic identity coverage for YubiKey operations (curve-guided-rsi cycle-5 substantive edit)

This skill — **YubiKey enrollment, PIV slot management, ssh-key derivation** — sits in a domain that benefits from explicit cryptographic-identity coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.508, v=0.497), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For YubiKey operations, the cryptographic-identity primitive applies as follows: this skill anchors the user-held key component of the trust chain; FIDO2/PIV enrollment, ssh-key provisioning, attestation certificate extraction all flow into the trust-chain via this skill. yubiOS's identity model pairs YubiKey (per `yubikey-operations`) for user-held keys and fTPM (per `ftpm-optee-tpm`) for platform-bound attestation; this skill contributes to one side of that pair.

Concrete implications for YubiKey operations: any change should be reviewed for impact on cryptographic-identity coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **least privilege** (top-priority MOVABLE missing post-cycle-7).

Least privilege relevance: scoped permission grants, role-based access control, and minimal authorization are the attack-surface-narrowing binding between identity and action. This skill's target primitive list is: least privilege, least-privilege, minimal, scoped, RBAC, narrow, permission, privilege.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added least privilege keywords (top-priority MOVABLE missing post-cycle-7).

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `yubikey-operations` proposal — closes the project-namesake gap (zero skills dedicated to YubiKey operations despite 4 skills referencing it inline). Skill mapped to 10-primitive axes: P8 cryptographic identity (primary), P2 trust chain (root of trust), P1 attestation (FIDO2 attestation cert), P7 audit/evidence (key-use log). Frontmatter validated by `js-yaml`: name regex OK, description ≤1024 chars, no `<`/`>`.

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Cryptographic identity coverage for YubiKey operations (curve-guided-rsi cycle-5 substantive edit)

This skill — **YubiKey enrollment, PIV slot management, ssh-key derivation** — sits in a domain that benefits from explicit cryptographic-identity coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.508, v=0.497), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For YubiKey operations, the cryptographic-identity primitive applies as follows: this skill anchors the user-held key component of the trust chain; FIDO2/PIV enrollment, ssh-key provisioning, attestation certificate extraction all flow into the trust-chain via this skill. yubiOS's identity model pairs YubiKey (per `yubikey-operations`) for user-held keys and fTPM (per `ftpm-optee-tpm`) for platform-bound attestation; this skill contributes to one side of that pair.

Concrete implications for YubiKey operations: any change should be reviewed for impact on cryptographic-identity coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.

## Cycle 8 RSI primitive-closure (2026-08-06)

This skill's cycle 8 RSI target primitive is **least privilege** (top-priority MOVABLE missing post-cycle-7).

Least privilege relevance: scoped permission grants, role-based access control, and minimal authorization are the attack-surface-narrowing binding between identity and action. This skill's target primitive list is: least privilege, least-privilege, minimal, scoped, RBAC, narrow, permission, privilege.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added least privilege keywords (top-priority MOVABLE missing post-cycle-7).
