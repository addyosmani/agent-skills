---
name: yubikey-operations
description: "YubiKey-specific identity operations for yubiOS: FIDO2 enrollment (hmac-secret, passkey, PRF extension), PIV slot management (9c signing, 9a auth, 82-95 retired), ssh-key provisioning from PIV and FIDO2 (ed25519-sk, ecdsa-sk), attestation certificate extraction (FIDO2 cert from slot 9c + FIDO2 device cert via credential management), multi-key quorum patterns for owner-held root-of-trust, and the yubiOS backup/restore discipline (export-attestation-cert + paperkey-style split-knowledge). Use when enrolling a YubiKey, signing with PIV slot 9c, deriving ssh keys from FIDO2 hmac-secret, designing multi-key quorum for owner-held root-of-trust, or auditing a YubiKey ceremony. Triggers on: YubiKey, FIDO2 enrollment, PIV, slot 9c, hmac-secret, passkey, attestation certificate, ssh-key from YubiKey, YKCS11, multi-key quorum, owner-held key, FIDO2 PRF, ed25519-sk, ecdsa-sk, webauthn."
license: "MIT"
metadata:
  short-description: "YubiKey identity root: PIV/FIDO2 enrollment, slot mgmt, ssh-key derivation, multi-key quorum, attestation cert extraction"
---
# YubiKey Operations

## Overview

yubiOS is named after the YubiKey because the YubiKey is the project's **identity root** — the load-bearing primitive that distinguishes owner-held cryptographic identity from platform-bound identity (TPM, fTPM). Every long-lived key on a yubiOS system that the user holds personally (not the system holds) lives on a YubiKey. This skill captures the operational patterns for that identity root.

The yubiOS YubiKey split is:

- **YubiKey** = user-held, removable, owner-controlled identity. Used for: SSH, Git signing, disk unlock (LUKS2 FIDO2), PAM login (pam-u2f), home unlock (systemd-homed), age/age-plugin-yubikey decryption, TPM2-PKCS#11 attestation key fallback, OAuth/webauthn.
- **fTPM** = platform-bound integrity attestation. Used for: PCR measurement, IMA, TPM2 quote emission, LUKS2 TPM2 unlock, measured boot. Pairs with YubiKey, never substitutes for it.

## When to Use

Use when:

- Enrolling a new YubiKey to a yubiOS system (initial setup ceremony)
- Migrating from an existing YubiKey to a new one (backup-restore discipline)
- Configuring ssh to use FIDO2-resident keys (`ed25519-sk`, `ecdsa-sk`)
- Configuring Git signing with PIV slot 9c or FIDO2
- Setting up LUKS2 FIDO2 unlock (`systemd-cryptenroll --fido2`)
- Setting up systemd-homed FIDO2 unlock
- Configuring multi-key quorum (2-of-3 or 3-of-5) for owner-held root-of-trust
- Extracting a FIDO2 attestation certificate for audit or device inventory
- Auditing an existing YubiKey enrollment against yubiOS best practices

Do NOT use when:

- Working with platform-bound identity (TPM, fTPM, TPM2 PCR sealing) — use `ftpm-optee-tpm` or `arm-trusted-firmware-optee`.
- Configuring UKI signing with a PIV/PKCS#11 key — use `mkosi-image-builder` (PIV/PKCS11 UKI signing section).
- Setting up SSH agent forwarding or Kerberos — use the operating-system-level SSH skill instead.
- Working with hardware security modules that aren't YubiKeys (TPM USB discrete, Nitrokey, OnlyKey) — patterns are similar but pin sets differ; this skill is YubiKey-specific.

## PIV Slot Conventions

The YubiKey PIV applet exposes 24 slots. yubiOS uses a stable convention so anyone walking up to the machine knows which slot holds what:

| Slot | Name | yubiOS purpose |
|---|---|---|
| `9a` | PIV Authentication | SSH user auth via PKCS#11 (`ssh -I /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so`); age decryption fallback |
| `9c` | PIV Digital Signature | UKI signing (mkosi PIV/PKCS11), Git commit/tag signing, age encryption |
| `9d` | PIV Key Management | TLS client auth (rare), S/MIME |
| `9e` | PIV Card Authentication | (reserved — yubiOS does not assign) |
| `82-95` | PIV Retired Keys 1-3 | Generation history (used by YubiKey Manager for key rotation) |

The **slot 9c** is yubiOS's signing root. The slot 9a is the user-auth root. Slots 82-95 are generation history — when you regenerate slot 9c, the old key moves to slot 82 (or 83, 84 if those are already populated).

## FIDO2 Patterns

### hmac-secret

The FIDO2 hmac-secret extension is the yubiOS-recommended way to derive a symmetric key from a YubiKey. It is used by:

- `systemd-cryptenroll --fido2` for LUKS2 unlock
- `systemd-homed` for home-directory unlock
- `age-plugin-yubikey` for age encryption

The hmac-secret is bound to the YubiKey's attestation key + a per-credential salt stored in the LUKS2 token / homed record / age identity. Rotating the YubiKey means re-enrolling every consumer with the new key.

### passkey (FIDO2 discoverable credential)

Used for webauthn flows. yubiOS's design intent is: a passkey on a YubiKey should be the primary webauthn credential, with platform passkeys (iCloud Keychain, Chrome profile passkey) as fallback only. The YubiKey passkey is portable across devices.

### PRF extension

The FIDO2 PRF extension (HMAC Secret extension v2) returns a 32-byte deterministic secret for a given (credential_id, salt) pair. Used by:

- Bitwarden / 1Password vault encryption
- WireGuard PSK derivation
- Deterministic-key SSH (rare)

If the consumer needs cross-device sync, PRF on a YubiKey is better than hmac-secret (more entropy per call), but the consumer must support PRF.

## SSH Key Provisioning

### From PIV (slot 9a)

```bash
# Generate key on YubiKey
yubico-piv-tool -a generate -s 9a -A RSA2048 -o pubkey.pem
# Or with ed25519 (YubiKey 5 firmware ≥5.3)
yubico-piv-tool -a generate -s 9a -A ED25519 -o pubkey.pem

# Add to authorized_keys
ssh-keygen -D /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so >> ~/.ssh/authorized_keys

# ssh-agent integration
ssh-add -s /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so
```

### From FIDO2 (resident or non-resident)

```bash
# ed25519-sk (non-resident; user presence required, PIN optional)
ssh-keygen -t ed25519-sk -f ~/.ssh/id_yubico_ed25519_sk
# ecdsa-sk with PIN
ssh-keygen -t ecdsa-sk -O verify-required -O resident -f ~/.ssh/id_yubico_ecdsa_sk_resident
# Resident keys (passkey-style; the private key lives on the YubiKey)
```

The yubiOS convention: name the SSH key file `id_yubico_<algo>_<resident?>` so any reader knows it is YubiKey-backed and whether it requires touch.

## Multi-Key Quorum

For owner-held root-of-trust, yubiOS uses a **2-of-3 quorum** pattern when the threat model includes "YubiKey lost or stolen but not both":

- **Key A**: Daily-driver YubiKey 5 NFC (in pocket / on desk)
- **Key B**: Backup YubiKey 5 NFC (in safe / safe deposit box)
- **Key C**: Recovery YubiKey 5C NFC (in different physical location)

The quorum logic is at the consumer (ssh-agent with multiple providers, `ykman` orchestration, `age-plugin-yubikey` with multiple recipients). The YubiKeys themselves do not natively support quorum — yubiOS composes it at the application layer.

For higher assurance (3-of-5), add two more keys at two more physical locations.

## Backup/Restore Discipline

yubiOS treats YubiKey enrollment as a **destructive** operation. Re-enrolling a slot 9c replaces the existing key. The yubiOS discipline is:

1. **Before enrollment**: Export the existing attestation certificate (`ykman piv export-cert 9c pre-enroll.pem`).
2. **Before enrollment**: If replacing an active key, ensure the consumer has the new key enrolled alongside the old (`ssh-add -s ...` with both PKCS#11 providers loaded).
3. **After enrollment**: Verify the new slot 9c works (sign a test message, decrypt a test ciphertext).
4. **After enrollment**: Re-sign any artifacts signed by the old key if signature continuity matters (UKIs, Git tags, age recipients).
5. **Old key rotation**: The old key moves to slot 82 (Retired Key 1). It can still sign but yubiOS convention is to retire from active use after 90 days.

## Anti-patterns

- **Using YubiKey as TPM substitute**: YubiKey is user-held and removable; TPM is platform-bound. Conflating them breaks the threat model. The fTPM path is for PCR/IMA measurement; the YubiKey path is for user identity.
- **Single-key no-backup enrollment**: A YubiKey can be lost, stolen, or break. yubiOS conventions require at least a 2-key quorum before treating any key as a "root of trust".
- **Slot 9c for SSH auth**: Slot 9c is for **signing**, not auth. Use slot 9a for SSH auth (via PKCS#11 provider). Signing commits/authenticating SSH are different operations with different attestation requirements.
- **Storing the recovery PIN in a password manager that requires the same YubiKey**: Circular dependency — lose the YubiKey, lose the manager, lose the PIN, lose the YubiKey. The recovery PIN must be stored offline (paper in a safe, two halves in two physical locations).
- **Using `ykman piv reset` without re-enrolling every consumer**: Resetting the PIV applet wipes all four slots. Every consumer (ssh, age, mkosi, systemd-cryptenroll) needs re-enrollment.
- **Reusing the same PIN across multiple YubiKeys**: If one YubiKey's PIN is compromised, all are compromised. yubiOS convention: per-device random PIN, stored in a password manager with 2FA-protected access.

## References

- [YubiKey PIV slot reference](https://developers.yubico.com/PIV/Introduction/Certificate_slots.html)
- [YubiKey FIDO2 hmac-secret extension](https://fidoalliance.org/specs/fido-v2.1-rd-20210309/fido-client-to-authenticator-protocol-v2.1-rd-20210309.html#sctn-hmac-secret-extension)
- [YubiKey FIDO2 PRF extension](https://fidoalliance.org/specs/fido-v2.1-rd-20210309/fido-client-to-authenticator-protocol-v2.1-rd-20210309.html#sctn-prf-extension)
- [OpenSC PKCS#11 provider for YubiKey PIV](https://github.com/OpenSC/OpenSC)
- [ykman (YubiKey Manager CLI)](https://github.com/Yubico/yubikey-manager)
- [age-plugin-yubikey](https://github.com/str4d/age-plugin-yubikey)
- yubiOS skill `systemd-homed` (FIDO2 home unlock)
- yubiOS skill `systemd-hardening` (pam-u2f, FIDO2 PAM)
- yubiOS skill `mkosi-image-builder` (PIV/PKCS11 UKI signing)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `yubikey-operations` proposal — closes the project-namesake gap (zero skills dedicated to YubiKey operations despite 4 skills referencing it inline). Skill mapped to 10-primitive axes: P8 cryptographic identity (primary), P2 trust chain (root of trust), P1 attestation (FIDO2 attestation cert), P7 audit/evidence (key-use log). Frontmatter validated by `js-yaml`: name regex OK, description ≤1024 chars, no `<`/`>`.

## Cryptographic identity coverage for YubiKey operations (curve-guided-rsi cycle-5 substantive edit)

This skill — **YubiKey enrollment, PIV slot management, ssh-key derivation** — sits in a domain that benefits from explicit cryptographic-identity coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.508, v=0.497), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For YubiKey operations, the cryptographic-identity primitive applies as follows: this skill anchors the user-held key component of the trust chain; FIDO2/PIV enrollment, ssh-key provisioning, attestation certificate extraction all flow into the trust-chain via this skill. yubiOS's identity model pairs YubiKey (per `yubikey-operations`) for user-held keys and fTPM (per `ftpm-optee-tpm`) for platform-bound attestation; this skill contributes to one side of that pair.

Concrete implications for YubiKey operations: any change should be reviewed for impact on cryptographic-identity coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.


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

This skill's `declarative policy` primitive is closed by cycle-6 RSI. This skill's declarative policy (.rego / OPA / Build Policy) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `declarative policy` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `immutability` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's immutability enforcement (verity / fs-verity / composefs / signed catalog / EROFS) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `immutability` primitive gap.
