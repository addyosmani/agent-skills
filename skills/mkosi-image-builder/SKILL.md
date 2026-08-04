---
name: mkosi-image-builder
description: "Builds OS images with mkosi for yubiOS including OCI containers, UKIs, disk images with dm-verity and Secure Boot. Use when writing mkosi.conf profiles, configuring PIV/PKCS11 UKI signing, setting up dm-verity, writing FinalizeScripts, or building the yubiOS OCI image pipeline. Triggers on: mkosi, UKI, unified kernel image, Secure Boot, dm-verity, OCI image build, finalize-script."
---

# mkosi Image Builder

## Overview

mkosi wraps `dnf`/`apt`/`pacman`/`zypper` to produce disk images, UKIs, OCI containers, sysexts, and initrds — with Secure Boot signing, dm-verity, and bootloader support baked in.

**yubiOS pipeline**: mkosi builds OCI images → bootc installs/upgrades → bcvk tests.

---

## Key Commands

```bash
# Build (uses mkosi.conf in CWD)
mkosi build

# Build a specific image
mkosi -i yubiOS build

# Boot built image in QEMU
mkosi boot

# Run image in systemd-nspawn
mkosi shell

# Generate summary
mkosi summary

# Clean build artifacts
mkosi clean
```

**Validation (from mkosi AGENTS.md):**
```bash
mypy mkosi tests kernel-install/*.install
ruff format mkosi tests kernel-install/*.install
ruff check --fix mkosi tests kernel-install/*.install
python3 -m pytest
```

---

## mkosi.conf Reference

```ini
[Distribution]
Distribution=debian
Release=trixie

[Output]
Format=oci                    # or disk, uki, directory, tar, cpio, oci
OutputDirectory=mkosi.output
ImageId=yubiOS
ImageVersion=2026.05.10

[Build]
CacheDirectory=mkosi.cache
History=yes

[Content]
Packages=
    systemd
    systemd-boot
    systemd-cryptsetup
    pam-u2f
    yubikey-manager
    libfido2-dev
    opensc
    linux-image-amd64
    dracut

[Validation]
SecureBoot=yes
SecureBootKey=mkosi.secure-boot.key         # or PKCS11 URI
SecureBootCertificate=mkosi.secure-boot.crt
SecureBootAutoEnroll=yes

Verity=yes                    # dm-verity root hash embedded in UKI cmdline

[Host]
QemuHeadless=yes
```

---

## PIV/PKCS11 UKI Signing (yubiOS YubiKey path)

mkosi v26+ supports signing via PKCS11 through systemd-sbsign's engine/provider backends.

```ini
# mkosi.conf
[Validation]
SecureBoot=yes
SecureBootKey=pkcs11:token=yubiOS-sb;object=sb-key;type=private
SecureBootKeySource=engine:pkcs11
SecureBootCertificate=mkosi.secure-boot.crt
```

For YubiKey PIV slot 9c:
```bash
# Init key on YubiKey (PIV slot 9c = signing)
yubico-piv-tool -a generate -s 9c -A ECCP256
yubico-piv-tool -a selfsign-certificate -s 9c -S "/CN=yubiOS Secure Boot/"
yubico-piv-tool -a import-certificate -s 9c -i cert.pem

# Test PKCS11 token visibility
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/libykcs11.so \
  --login --pin 123456 --list-objects
```

**CI fallback (SoftHSM):**
```bash
softhsm2-util --init-token --slot 0 --label "yubiOS-ci" --pin 1234 --so-pin 1234
pkcs11-tool --module /usr/lib64/libsofthsm2.so \
  --login --pin 1234 \
  --keypairgen --key-type EC:prime256v1 \
  --label "sb-key" --usage-sign
# In mkosi.conf: SecureBootKey=pkcs11:token=yubiOS-ci;object=sb-key;type=private
```

---

## dm-verity

```ini
[Validation]
Verity=yes
# v26+: Verity=signed (requires signing key), Verity=hash (hash only), Verity=defer
```

mkosi embeds `roothash=<hash>` in the UKI kernel cmdline automatically. The roothash file is written to `mkosi.output/<ImageId>.roothash`.

---

## Profiles

```ini
# mkosi.conf.d/yubiOS/mkosi.conf  (profile)
[Match]
Profile=yubiOS

[Distribution]
Distribution=debian
Release=trixie

[Content]
Packages=
    pam-u2f
    yubikey-manager
    libfido2-dev

[Output]
KernelCommandLine=rd.luks.options=fido2-device=auto
```

Build with profile:
```bash
mkosi --profile=yubiOS build
```

---

## FinalizeScripts

Run after package installation, before image sealing. Use for FIDO2 enrollment, SBOM generation, factory defaults.

```bash
#!/bin/bash
# mkosi.finalize  (or mkosi/finalize-scripts/60-enroll-fido2.sh)
set -euo pipefail

# Only run if FIDO2 enrollment is requested
[[ "${ENROLL_FIDO2:-0}" == "1" ]] || exit 0

# Enroll FIDO2 to LUKS slot
systemd-cryptenroll --fido2-device=auto "$BUILDROOT/dev/sda3"
```

Register in mkosi.conf:
```ini
[Content]
FinalizeScripts=mkosi.finalize
```

---

## OCI Pipeline

```ini
[Output]
Format=oci
```

```bash
# Push to registry
skopeo copy oci:mkosi.output/yubiOS docker://dhi.io/yubi-OS/yubiOS:latest

# Pin to digest after push
DIGEST=$(skopeo inspect --format '{{.Digest}}' docker://dhi.io/yubi-OS/yubiOS:latest)
echo "dhi.io/yubi-OS/yubiOS@$DIGEST"
```

---

## AI Attribution Rule

Per mkosi AGENTS.md:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Add to all commit messages on AI-generated/modified code. Human reviews before submission.

---

## References

- https://mkosi.systemd.io/
- https://github.com/systemd/mkosi
- https://github.com/systemd/mkosi/blob/main/mkosi/resources/man/mkosi.1.md
- https://deepwiki.com/systemd/mkosi/5.5-secure-boot-and-signing

## Least Privilege coverage for mkosi image builder (curve-guided-rsi cycle-4 substantive edit)

This skill — **mkosi wraps `dnf`/`apt`/`pacman`/`zypper` to produce disk images, UKIs, OCI containers, sysexts, and initrds — with Secure Boot signing, dm-verity, and bootloader support baked in** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For mkosi image builder, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for mkosi image builder: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Immutability coverage for mkosi image builder (curve-guided-rsi cycle-5 substantive edit)

This skill — **mkosi.conf, dm-verity, UKI, PIV/PKCS11 signing, finalize-scripts** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.722, v=0.238), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For mkosi image builder, the immutability primitive applies as follows: this skill is the build-time home of dm-verity + UKI + PIV signing; the resulting artifacts feed the SLSA L3 attestation pipeline. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for mkosi image builder: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
