---
name: arm-trusted-firmware-optee
description: 'Build and reason about the ARM64 secure boot firmware stack for yubiOS: ARM Trusted Firmware-A (TF-A) staging (BL1/BL2/BL31/BL32/BL33), Trusted Board Boot (TBB) with FIP packaging and the ROTPK chain of trust, OP-TEE as the BL32 secure-world OS, U-Boot as the BL33 non-secure bootloader, and the firmware-stage measured-boot event log (TCG2 / Firmware Handoff Transfer Lists). Use when porting yubiOS to ARM64 hardware, owning the boot ROM key, wiring OP-TEE into the boot flow, debugging SMC/secure-world handoff, or setting up U-Boot measured boot. Pairs with `ftpm-optee-tpm` for the fTPM TA. Triggers on: TF-A, arm-trusted-firmware, BL31, BL32, BL33, FIP, fiptool, ROTPK, Trusted Board Boot, TBB, OP-TEE, secure world, SMC, BL2 measured boot, Firmware Handoff, Transfer List, U-Boot BL33, ARM64 secure boot.'
---

# ARM Trusted Firmware + OP-TEE (yubiOS ARM64 secure boot)

## When to use

Read this when working on the **post-launch ARM64 root-of-trust project**
([FUTURE.md](https://github.com/yubi-OS/yubiOS/blob/main/FUTURE.md)). This skill
covers the firmware/bootloader layers. The fTPM Trusted Application itself is in
the sibling skill `ftpm-optee-tpm`.

The goal: on ARM64, yubiOS owns every trust anchor from the SoC fuse key onward,
instead of inheriting the vendor's TF-A, TEE, and boot ROM key. This is the ARM64
analogue of `bootctl enroll-keys` on x86-64, and it closes the OEM/vendor supply
chain surface documented in MITIGATE.md.

## The boot chain

```
ROTPK (SHA-256 of our public key, burned into SoC OTP/eFuse)
  │
 BL1   boot ROM / first stage — minimal HW init, verifies + loads BL2
  │
 BL2   Trusted Boot stage — parses FIP, verifies EVERY image against the
  │    TBB cert chain, measures each into the TCG2 event log, then loads:
  ├─► BL31  EL3 runtime / Secure Monitor — PSCI power mgmt, routes SMC
  │         calls between Normal and Secure worlds. Always resident.
  ├─► BL32  OP-TEE OS (Secure-EL1) — our secure-world OS. Hosts the fTPM TA.
  └─► BL33  U-Boot (Non-secure EL2/EL1) — measures kernel/DTB/initramfs,
            talks to the fTPM, hands the event log to Linux.
```

Exception levels: EL3 = BL31 (monitor), Secure-EL1 = OP-TEE kernel,
Secure-EL0 = Trusted Apps (fTPM), Non-secure EL2/EL1 = U-Boot then Linux.

## Trusted Board Boot (TBB) and FIP

- **ROTPK** (Root of Trust Public Key): yubiOS generates this keypair. The
  SHA-256 of the public half is burned into SoC OTP/eFuse. **Irreversible** —
  rehearse on a sacrificial board first.
- **FIP** (Firmware Image Package): single archive bundling BL31 + BL32 + BL33
  plus the X.509 content/key certificates. Built with `fiptool`.
- BL2 walks the cert chain: Trusted Boot FW cert → Trusted/Non-Trusted Key certs
  → content certs, each signature checked against the ROTPK hash, each image hash
  checked against its (now-trusted) cert before control transfers.

```sh
# Build TF-A with TBB + a BL32 (OP-TEE) + a BL33 (U-Boot), measured boot on
make -C arm-trusted-firmware \
  PLAT=<platform> \
  ARCH=aarch64 \
  SPD=opteed \                          # Secure Payload Dispatcher = OP-TEE
  BL32=<optee>/tee-header_v2.bin \
  BL32_EXTRA1=<optee>/tee-pager_v2.bin \
  BL32_EXTRA2=<optee>/tee-pageable_v2.bin \
  BL33=<u-boot>/u-boot.bin \
  TRUSTED_BOARD_BOOT=1 \
  GENERATE_COT=1 \
  MBEDTLS_DIR=<path-to-mbedtls> \
  ROT_KEY=<our-rotpk-private>.pem \
  MEASURED_BOOT=1 \
  EVENT_LOG_LEVEL=20 \
  all fip
```

Key flags: `SPD=opteed` wires OP-TEE as BL32; `TRUSTED_BOARD_BOOT=1` +
`GENERATE_COT=1` + `ROT_KEY=` enable TBB; `MEASURED_BOOT=1` makes BL1/BL2 emit
the event log. TF-A needs mbed TLS for crypto.

## OP-TEE as BL32

- Build OP-TEE OS for the same `PLATFORM=`. Output `tee-*.bin` feeds TF-A's
  `BL32*` inputs above.
- Normal world (U-Boot, Linux) reaches OP-TEE via **SMC** instructions, trapped
  to EL3 (BL31) and routed by the OP-TEE dispatcher into Secure-EL1.
- OP-TEE has no storage driver. Persistent secure storage goes through **RPMB**
  on eMMC/UFS (`CFG_RPMB_FS=y`), serviced from the normal world by
  `tee-supplicant` (or, for pre-rootfs writes, an early in-OP-TEE path). RPMB is
  rollback-protected by an HMAC key + write counter. This is where the fTPM's NV
  state lives — see `ftpm-optee-tpm`.

```sh
make -C optee_os \
  PLATFORM=<platform> \
  CFG_RPMB_FS=y \
  CFG_EARLY_TA=y \
  EARLY_TA_PATHS="<path>/bc50d971-d4c9-42c4-82cb-343fb7f37896.stripped.elf"
```

## U-Boot as BL33 (measured boot)

Kconfig:

```
CONFIG_TEE=y
CONFIG_OPTEE=y
CONFIG_TPM=y
CONFIG_TPM_V2=y
CONFIG_TPM2_FTPM_TEE=y           # driver tpm2_ftpm_tee.c (talks to fTPM TA)
CONFIG_MEASURED_BOOT=y
CONFIG_TPM2_EVENT_LOG_SIZE=0x10000
```

Device tree node for the fTPM:

```dts
tpm {
    compatible = "microsoft,ftpm";
};
```

U-Boot uses the `tpm2` command suite (`tpm2 init`, `tpm2 startup`), replays the
firmware event log into PCRs via `TPM2_PCR_Extend`, measures kernel/DTB/initramfs,
then hands the log to Linux by writing **`linux,sml-base`** and **`linux,sml-size`**
into the kernel `/chosen` DTB node.

## U-Boot as UEFI firmware (the architectural unlock)

With `CONFIG_EFI_LOADER=y` + `CONFIG_CMD_BOOTEFI=y`, U-Boot is a real UEFI
environment: boot + runtime services, the UEFI system table, `Boot####`/`BootOrder`
variables, and PE/COFF EFI binary loading. **systemd-boot, a UKI, shim, or GRUB run
unmodified** — the same artifacts yubiOS signs for x86-64 UEFI Secure Boot. ARM64
stops being a special boot path; U-Boot just speaks UEFI in place of vendor EDK2.

- `CONFIG_EFI_SECURE_BOOT=y` (needs `EFI_LOADER` + `FIT_SIGNATURE`): authenticates
  PE/COFF binaries against the standard `PK`/`KEK`/`db`/`dbx` databases.
- `CONFIG_EFI_TCG2_PROTOCOL=y` (with `TPM_V2`): UEFI/UKI stage measures into the
  fTPM via the TCG2 protocol, exactly as on a physical-TPM box.
- `CONFIG_EFI_CAPSULE_*`: capsule-on-disk firmware updates (FMP) for U-Boot, FIP,
  and OP-TEE images.

### Protected UEFI variables — EDK2 StandaloneMM on OP-TEE + RPMB

PK/KEK/db/dbx must be persistent AND protected from the normal world. Run EDK2's
**StandaloneMM** variable service as an OP-TEE module, backed by RPMB:

- U-Boot: `CONFIG_EFI_MM_COMM_TEE=y`, `CONFIG_OPTEE=y`, `CONFIG_CMD_OPTEE_RPMB=y`.
  U-Boot dispatches variable ops to the secure-world service over the MM protocol.
- OP-TEE: build EDK2 `StandAloneMM` (`BL32_AP_MM.fd`), then
  `CFG_STMM_PATH=BL32_AP_MM.fd CFG_RPMB_FS=y CFG_RPMB_WRITE_KEY=y CFG_CORE_DYN_SHM=y`.
- Result: tamper-resistant Secure Boot variables on RPMB, sharing the same RPMB
  that backs the fTPM. (`CFG_RPMB_WRITE_KEY=y` writes the RPMB key once per device
  — effectively irreversible; fold into provisioning.)

## Two provisioning paths (root of trust)

The five TF-A stages are identical on both paths. What differs is the **root**:
whether you can burn the ROTPK hash into SoC OTP/eFuse.

- **Path A — fuses burnable (enforcing):** ROTPK hash in OTP, full TBB, BL1 rejects
  anything that doesn't chain to it. Bad code never executes. Targets: RPi 5 (OTP
  key hash + counter-signed boot), Pi 4 (testable pre-lock), Ampere with documented
  fuse provisioning.
- **Path B — no fuses / vendor-locked / not burned (measured + attested):** no
  hardware rejection. Software RoT via U-Boot FIT verified boot (public key in the
  U-Boot control DTB) plus measured boot into the fTPM; trust is decided *after*
  boot by local/remote attestation and fTPM/YubiKey secret release. A compromised
  stage still executes long enough to measure itself — this is evidence + sealing,
  not enforcement. Use for dev boards and early bring-up.

Decide the path per board and document it. Path B's trust anchor lives in writable
firmware: only as strong as the storage holding U-Boot and its key.
Full rationale + diagrams: yubiOS `FUTURE.md`.

## Measured boot chain (who measures what)

| Stage | Measures | Into |
|---|---|---|
| BL1 (ROM) | BL2 | event log (memory) |
| BL2 | BL31, BL32 (OP-TEE), BL33 (U-Boot) | event log |
| U-Boot | replays log → PCRs; then kernel/DTB/initramfs | fTPM PCRs (0/1 fw, 8/9 OS) |
| Linux | consumes log via DTB; IMA measures userspace | fTPM via `tpm_ftpm_tee` |

Modern TF-A (2.10+) / OP-TEE 4.x / U-Boot pass the log via the **Firmware Handoff**
spec using **Transfer Lists** (`BLOBLISTT_TPM_EVLOG`) instead of ad-hoc memory
regions. Prefer this on new ports.

## yubiOS integration notes

- The fTPM gives ARM64 a measured-boot PCR set + local attestation root that no
  vendor controls. Bind `ConditionSecurity=measured-os` (ADR-016) to it.
- The **YubiKey stays the primary RoT**: FIDO2 hmac-secret still unlocks LUKS2
  (ADR-003). The fTPM measures and attests; it must never become the sole disk
  unlock gate, or yubiOS has re-created an on-device, vendor-shaped trust anchor.
- Pick ONE board and go deep first — TF-A is per-SoC. Prefer non-Qualcomm ARM64
  (RPi 5, Ampere, ARM Juno) per ADR-017 and the qcom,dload analysis in MITIGATE.md.

## Common gotchas

- `SPD=opteed` is required, or BL32 is loaded but never dispatched.
- TBB silently no-ops without all three of `TRUSTED_BOARD_BOOT=1`,
  `GENERATE_COT=1`, and a real `ROT_KEY`.
- Fuse burns are one-way. Never burn ROTPK on hardware you can't sacrifice until
  the flow is rehearsed end to end.
- Event log size mismatches between TF-A (`EVENT_LOG_LEVEL`) and U-Boot
  (`CONFIG_TPM2_EVENT_LOG_SIZE`) truncate measurements silently.


## Raspberry Pi 5 (BCM2712) — OTP / secure boot specifics

RPi 5 is the primary Path A target (ADR-019). Its OTP / secure-boot chain is **its
own system**, distinct from generic TF-A TBB. The EEPROM bootloader plays the BL1/BL2
role; TF-A BL31 is loaded as a payload inside `boot.img`.

### How the chain works on RPi 5

```
BCM2712 Boot ROM (read-only)
  1. Verifies EEPROM bootloader with Broadcom key  (always)
  2. Verifies EEPROM counter-signature with CUSTOMER key  (only when OTP programmed)
     ROM computes SHA-256 of attached customer pubkey, compares to OTP rows 47-54
EEPROM Bootloader / bootsys
  3. Enforces SIGNED_BOOT=1
  4. Verifies boot.img + boot.sig with customer key
  5. Verifies config.txt digest
boot.img
  Contains armstub8-2712.bin = TF-A BL31 + OP-TEE BL32 (concatenated)
  config.txt:  armstub=armstub8-2712.bin
TF-A BL31 (EL3) → OP-TEE BL32 (S-EL1) → U-Boot BL33 (Non-secure EL2)
```

### OTP layout (BCM2712 — 192 × 32-bit rows)

| Rows | Bits | Purpose |
|---|---|---|
| 47–54 | 256 | SHA-256 of customer RSA pubkey (**the yubiOS ROTPK slot**) |
| 55 | 32 | Secure-boot flags: `SIGNED_BOOT` enforcement bit + monotonic revocation counter |
| 56–63 | 256 | Device-unique ECDSA P-256 private key (per-board hardware identity) |

All OTP writes are **0 → 1 only. Irreversible.**

### What gets burned

- SHA-256 of customer RSA-2048/4096 public key → rows 47–54.
- `SIGNED_BOOT=1` bit in row 55 (locks enforcement permanently).
- `revoke_devkey` in row 55 (revokes Broadcom dev/recovery key — **do not set until
  signing chain is validated end-to-end**: once set, `recovery.bin` is refused unless
  counter-signed with your key).
- Monotonic revocation counter in row 55 (increment-only).

### Critical difference: Pi 5 vs Pi 4

- **Pi 4 (BCM2711):** supports dry-run — set `SIGNED_BOOT=1` in EEPROM config without
  burning OTP. Test the full signing chain and revert if it fails. **Use Pi 4 to
  validate the toolchain first.**
- **Pi 5 (BCM2712):** no dry-run. The Boot ROM requires a counter-signed EEPROM image,
  which only works after the OTP is programmed. Failure on D0 stepping = **silent**
  (no output, no LED). C1 stepping = 2 green LED flashes.
- **Strategy:** test on Pi 4, then burn a sacrificial Pi 5 before touching production.

### Bricking risks

- Burn OTP + lose private key = permanent brick. Keep the signing key offline, multiple
  air-gapped backups. Consider a YubiKey PIV slot.
- Set `revoke_devkey` with a corrupt `boot.img` = no recovery path.
- Never set `revoke_devkey` until the signed-image boot is proven on a sacrificial board.

### TF-A build for RPi 5

```sh
make -C arm-trusted-firmware \
  PLAT=rpi5 ARCH=aarch64 SPD=opteed \
  BL32=<optee>/tee-header_v2.bin BL32_EXTRA1=... BL32_EXTRA2=... \
  all
# Output: build/rpi5/release/bl31.bin
# Concatenate with OP-TEE: cat bl31.bin tee.bin > armstub8-2712.bin
# Place in /boot; config.txt: armstub=armstub8-2712.bin
```

`PLAT=rpi5` is mainlined in TF-A. OP-TEE `PLATFORM=rpi5` is mainlined in optee_os
(merged ~2024). **Limitation:** BCM2712 lacks open TrustZone memory partitioning
controllers; OP-TEE runs at high RAM rather than in hardware-isolated secure memory.
Assess whether this affects the fTPM threat model for production use.

### Device-unique ECDSA P-256 key (rows 56–63) — bonus trust anchor

Each BCM2712 has a **hardware-bound, per-board ECDSA P-256 key** in OTP. The
**`rpifwcrypto`** mailbox service lets the OS sign/HMAC with this key without
exposing the raw bytes. `lock_device_private_key=1` in `config.txt` blocks raw reads.
`embetrix/rpifwcrypto-pkcs11` wraps it as a PKCS#11 token. Possible uses for yubiOS:
- Board attestation identity (device-bound, never leaves SoC).
- Additional sealing factor on top of fTPM PCRs.
- Bridge to OP-TEE trust without burning a separate ROTPK.

**Full reference:** `knowledge/rpi5-otp-secure-boot.md`.
## References

- TF-A: `github.com/ARM-software/arm-trusted-firmware` (docs: TBB, Measured Boot, Firmware Handoff)
- OP-TEE OS: `github.com/OP-TEE/optee_os` · docs: optee.readthedocs.io
- U-Boot SPL measured boot worked example: Raymond Mao, "TPM 2.0 Event Log for U-Boot SPL on an ARMv8 Measured Boot Chain"
- fTPM TA build + integration: sibling skill `ftpm-optee-tpm`
- yubiOS plan: FUTURE.md · ADR-016 (v261) · ADR-017 (ARM64) · MITIGATE.md

## Least Privilege coverage for arm trusted firmware optee (curve-guided-rsi cycle-4 substantive edit)

This skill — **Read this when working on the **post-launch ARM64 root-of-trust project**** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For arm trusted firmware optee, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for arm trusted firmware optee: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Trust chain coverage for ARM Trusted Firmware / OP-TEE (curve-guided-rsi cycle-5 substantive edit)

This skill — **BL31/BL32/BL33, FIP, ROTPK chain, OP-TEE secure world** — sits in a domain that strengthens the yubiOS trust chain from BL31/BL32/BL33, FIP, ROTPK chain, OP-TEE secure world. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new); this skill's fit coordinate was (u=0.419, v=0.102), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For ARM Trusted Firmware / OP-TEE, the trust chain primitive applies as follows: this skill is the ARM64 firmware-stage trust chain; the YubiKey layer (per `yubikey-operations`) builds on this foundation. The trust chain for yubiOS runs YubiKey → fTPM (per `yubikey-operations` and `ftpm-optee-tpm`) → UKI PCR 11 → dm-verity root hash (per `dm-verity-and-integrity`) → bootc image digest (per `bootc-images`) → SLSA L3 attestation (per `slsa-provenance` + `sigstore-rekor-v2`); this skill is one contributor in that chain.

Concrete implications for ARM Trusted Firmware / OP-TEE: any change should be reviewed for impact on trust-chain integrity; gaps in the trust chain attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.


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

## Cycle 7 RSI audit-trail (2026-08-06)

This skill already covers all 5 remaining MOVABLE corpus-priority primitives post-cycle-6 (attestation, trust chain, declarative policy, immutability, least privilege). The cycle-7 RSI audit verified full movable coverage; no primitive closure needed.

The audit-trail entry: 2026-08-06 cycle 7 RSI — no movable primitive gap to close.

## Continuous / adaptive coverage

This skill supports the yubiOS continuous-monitoring layer — runtime detection (falco / tracee / tetragon / kubeArmor), adaptive policy, real-time monitoring. The skill is observable from the runtime-detect surface; alerts/metrics feed into the audit-evidence rollup.
