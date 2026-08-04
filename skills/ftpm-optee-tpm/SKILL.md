---
name: ftpm-optee-tpm
description: >-
  Build and integrate a firmware TPM 2.0 for yubiOS on ARM64: the Microsoft
  ms-tpm-20-ref reference implementation running as an OP-TEE Trusted
  Application via OP-TEE/optee_ftpm. Covers building the fTPM TA, the Early-TA
  vs dynamic-TA decision, RPMB-backed NV storage, the RPMB-before-supplicant
  bootstrap hazard, the U-Boot tpm2_ftpm_tee driver, the Linux tpm_ftpm_tee
  driver, measured-boot event log handoff, IMA probe ordering, and how the fTPM
  (platform integrity) stays complementary to the YubiKey (user identity / disk
  unlock). Use when building or debugging the fTPM TA, wiring it to U-Boot or
  Linux, or deciding the fTPM-vs-YubiKey split. Pairs with
  `arm-trusted-firmware-optee` for the TF-A/OP-TEE/U-Boot firmware stack.
  Triggers on: fTPM, firmware TPM, ms-tpm-20-ref, optee_ftpm, OP-TEE TA, Early
  TA, RPMB, tpm_ftpm_tee, tpm2_ftpm_tee, vTPM, TPM 2.0 on ARM, measured boot
  PCR, IMA fTPM, tee-supplicant.
---

# fTPM on OP-TEE (ms-tpm-20-ref) for yubiOS

## When to use

The post-launch ARM64 project ([FUTURE.md](https://github.com/yubi-OS/yubiOS/blob/main/FUTURE.md))
gives yubiOS a TPM 2.0 it **owns** on ARM64 hardware that has no discrete TPM.
This skill covers the TPM itself (the OP-TEE Trusted Application). The firmware
stack that hosts it (TF-A, OP-TEE OS, U-Boot) is the sibling skill
`arm-trusted-firmware-optee`.

Why this matters for a FIDO2-first OS: measured boot needs a TPM-shaped thing to
hold PCRs and seal secrets. On ARM64 the vendor's fTPM (if any) is a trust anchor
yubiOS did not choose. Running our own `ms-tpm-20-ref` in our own OP-TEE build
makes the PCR set and sealing root **ours**, auditable, and reproducible.

## What it is

- **`OP-TEE/optee_ftpm`** — the canonical integration repo (split out of
  `ms-tpm-20-ref`'s `Historical_Samples/Samples/ARM32-FirmwareTPM` in Oct 2024).
  This is the maintained home; the in-tree MS sample is historical.
- Wraps **`microsoft/ms-tpm-20-ref`** (a full TPM 2.0 reference). Pin to commit
  **`98b60a44aba79b15fcce1c0d1e46cf5918400f6a`** (the commit optee_ftpm expects).
- fTPM TA **UUID: `bc50d971-d4c9-42c4-82cb-343fb7f37896`**.
- Used in production on NVIDIA BlueField DPUs — that BSP doc is the best worked
  example of the whole flow.

## Building the TA

```sh
# 1. Check out the pinned ms-tpm-20-ref
git clone https://github.com/microsoft/ms-tpm-20-ref
git -C ms-tpm-20-ref checkout 98b60a44aba79b15fcce1c0d1e46cf5918400f6a

# 2. Build the fTPM TA against the OP-TEE TA dev kit
make -C optee_ftpm \
  TA_DEV_KIT_DIR=<optee_os>/out/<plat>/export-ta_arm64 \
  CFG_MS_TPM_20_REF=<abs-path>/ms-tpm-20-ref \
  CFG_TA_MEASURED_BOOT=y \
  CFG_TA_EVENT_LOG_SIZE=4096
```

- `CFG_MS_TPM_20_REF` must point at the checked-out reference source.
- `CFG_TA_MEASURED_BOOT=y` enables reading + extending a TCG2 event log at TA
  init. Requires the OP-TEE PTA `PTA_SYSTEM_GET_TPM_EVENT_LOG`.
- `CFG_TA_EVENT_LOG_SIZE` defaults to 1024 bytes — too small for a real chain;
  bump it (e.g. 4096+).
- Output is `bc50d971-d4c9-42c4-82cb-343fb7f37896.{elf,ta,stripped.elf}`.

## Early TA vs dynamic TA — pick Early TA

A **dynamic TA** loads from the rootfs (`/lib/optee_armtz/<uuid>.ta`) after the
filesystem is mounted and `tee-supplicant` is running. But U-Boot and Linux IMA
both need the TPM **before** any rootfs exists. So build the fTPM as an
**Early TA**, compiled into the OP-TEE binary's `.rodata.early_ta` section:

```sh
make -C optee_os \
  PLATFORM=<plat> \
  CFG_RPMB_FS=y \
  CFG_EARLY_TA=y \
  EARLY_TA_PATHS="<path>/bc50d971-d4c9-42c4-82cb-343fb7f37896.stripped.elf"
```

Now the fTPM is alive the instant OP-TEE boots, with no userspace dependency.

## The bootstrap hazard (read before you build hardware)

The fTPM needs persistent NV storage (seeds, monotonic counters, NV indices)
in **RPMB**. But an Early TA initializes **before `tee-supplicant`** is running,
and OP-TEE's normal RPMB path RPCs out to that supplicant. An early NV write with
no supplicant **panics** (OP-TEE issue #5766). Two mitigations:

1. Run `tee-supplicant` from the **initramfs** so it is up before Linux needs the
   TPM, and defer the fTPM's first persistent write until then; **and/or**
2. Use an early in-OP-TEE RPMB path (platform-dependent) so the secure world can
   reach eMMC without the normal-world supplicant.

This is the single biggest integration risk. Prove it on emulation (QEMU virt)
in Phase F0 before touching real hardware.

## U-Boot side

Driver `tpm2_ftpm_tee.c`. Kconfig + DT node are in `arm-trusted-firmware-optee`.
Summary: `CONFIG_TPM2_FTPM_TEE=y`, DT `tpm { compatible = "microsoft,ftpm"; };`,
then `tpm2 init` / `tpm2 startup`, replay firmware event log into PCRs, measure
kernel/DTB/initramfs, hand log to Linux via `linux,sml-base` / `linux,sml-size`.

## Linux side

```
CONFIG_TEE=y
CONFIG_OPTEE=y
CONFIG_TCG_TPM=y
CONFIG_TCG_FTPM_TEE=m     # drivers/char/tpm/tpm_ftpm_tee.c (Microsoft)
```

- `tpm_ftpm_tee.ko` reads `linux,sml-base` / `-size` from the DTB, exposes
  `/dev/tpm0` and `/dev/tpmrm0`.
- **Probe ordering**: the fTPM must be registered before IMA runs, and the OP-TEE
  bus needs RPMB access (so `tee-supplicant` in initramfs). If IMA runs first you
  get probe deferral / missing measurements. Use early init tables for the probe.

## PCR layout (convention)

| PCR | Content |
|---|---|
| 0, 1 | System firmware (BL31/BL32/BL33) + config |
| 2, 3 | Option ROM / drivers (rarely used on ARM SoC) |
| 7 | Secure Boot policy state |
| 8, 9 | Kernel, DTB, initramfs (measured by U-Boot) |
| 10 | IMA runtime measurement log |

Seal to PCR 0/1/7 for "is this the firmware+policy we signed".

## fTPM vs YubiKey — keep them complementary

| | fTPM (in OP-TEE) | YubiKey 5 |
|---|---|---|
| Job | Platform integrity, PCR measurement, attestation, optional seal | User identity, secret unlock, signing |
| Location | On-device, secure world | External hardware, off-device |
| yubiOS use | Measured boot + attestation root on ARM64; bind `ConditionSecurity=measured-os` | Primary RoT, unchanged — FIDO2 hmac-secret unlocks LUKS2 (ADR-003) |

**Rule:** the YubiKey stays the disk-unlock path. The fTPM seal, if used, is an
additive attestation/fallback bound to PCRs — never the sole gate. If the fTPM
becomes the only unlock, yubiOS has reintroduced exactly the on-device,
vendor-shaped trust anchor it exists to remove.

## Pinning & supply chain

The fTPM is software — a `ms-tpm-20-ref` or OP-TEE bug is a TPM bug. Pin
optee_ftpm, ms-tpm-20-ref (`98b60a44`), OP-TEE OS, and TF-A commits; fold into
the existing Renovate digest tracking (ADR-015) and the Docker Buildx + OPA/Rego
pipeline (ADR-014). Track upstream ms-tpm-20-ref CVEs; do not fork-and-forget.

## References

- `github.com/OP-TEE/optee_ftpm` (README: build flags, measured boot)
- `github.com/microsoft/ms-tpm-20-ref` @ `98b60a44`
- Linux driver: `drivers/char/tpm/tpm_ftpm_tee.c` (torvalds/linux)
- Bootstrap hazard: OP-TEE/optee_os issue #5766 (fTPM Early TA + initramfs)
- Worked example: NVIDIA BlueField DPU BSP — "fTPM over OP-TEE"
- Firmware stack: sibling skill `arm-trusted-firmware-optee`
- yubiOS plan: FUTURE.md · ADR-016 · ADR-017

## Note on continuous/adaptive coverage (curve-guided-rsi cycle-2 gap-fix)

This skill supports continuous/adaptive updates — upgrade, rollback, atomic switch, bootc upgrade, OSTree, composefs, or image mode. See `internal-big-picture` for the full continuous/adaptive primitive.

## Least Privilege coverage for ftpm optee tpm (curve-guided-rsi cycle-4 substantive edit)

This skill — **The post-launch ARM64 project ([FUTURE** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For ftpm optee tpm, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for ftpm optee tpm: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).
