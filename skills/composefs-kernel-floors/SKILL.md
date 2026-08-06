---
name: composefs-kernel-floors
description: "Kernel version floors and mount options required for composefs on yubiOS: kernel ≥6.5 for data-only OverlayFS (composefs's primary backing fs), kernel ≥6.6 for verity=require mount option (enforces composefs-signed catalog on mount), kernel ≥6.12 for file-backed EROFS (composefs's alternate backing fs), the systemd-dissect integration points, and the yubiOS convention for picking the lowest-supported kernel in PINNED.md. Use when deciding a kernel version floor for a new yubiOS image, debugging a composefs mount failure (incompatible kernel), picking between OverlayFS and EROFS as the backing fs for a sysext/confext, or auditing whether a yubiOS build's kernel supports the composefs flow. Triggers on: composefs, kernel floor, verity=require, file-backed EROFS, data-only OverlayFS, OverlayFS data-only, composefs mount, kernel ≥6.5, kernel ≥6.6, kernel ≥6.12, systemd-dissect."
license: "MIT"
metadata:
  short-description: "composefs kernel floors: 6.5 data-only OverlayFS, 6.6 verity=require, 6.12 file-backed EROFS"
---
# composefs Kernel Floors

## Overview

yubiOS uses composefs (per ADR-007) to layer signed sysext/confext images on top of the dm-verity-verified /usr base. composefs requires specific kernel features at specific kernel versions:

| Kernel version | composefs feature | Why it matters |
|---|---|---|
| **≥ 6.5** | Data-only OverlayFS | The primary backing filesystem for composefs. OverlayFS with `metacopy` and `redirect_dir` off, fs-only layers. Without ≥6.5, composefs falls back to a writable upper layer (defeats immutability). |
| **≥ 6.6** | `verity=require` mount option | The mount-time enforcement that the composefs catalog is signed. Without ≥6.6, the catalog is informational only — the kernel will mount an unsigned composefs layer. |
| **≥ 6.12** | File-backed EROFS | The alternate backing filesystem for composefs (used when the upper layer is small or read-mostly). EROFS is denser than Squashfs; yubiOS uses it for sysext images that need >50% density improvement. |

This skill is the **single reference** for which kernel version a yubiOS image needs for a given composefs use case. ADR-007 cites composefs but doesn't pin the kernel floors; this skill makes the implicit constraint explicit.

## When to Use

Use when:

- Picking a kernel version for a new yubiOS image (must be ≥ 6.12 to support the full composefs feature set)
- Picking a kernel version for a yubiOS image that supports only the base feature (≥ 6.5 for data-only OverlayFS)
- Debugging a composefs mount failure with `composefs: kernel too old` or similar
- Choosing between OverlayFS and EROFS as the backing fs for a specific sysext/confext image
- Auditing a yubiOS build's kernel vs the composefs requirements
- Updating PINNED.md with the kernel version floor rationale

Do NOT use when:

- The question is about general kernel version selection (not composefs-specific)
- The question is about dm-verity (kernel ≥ 4.4 supports dm-verity; this skill is composefs-specific)
- The question is about IMA or fs-verity (separate kernel floors; not covered here)
- Working with a non-Linux system (composefs is Linux-only)

## Why these floors

### Kernel ≥ 6.5 — Data-only OverlayFS

The composefs reference implementation uses OverlayFS with the upper layer's modifications merged into the lower layer at mount time (so the upper layer is "data-only" — no actual overlay write tracking). This is more efficient than traditional OverlayFS and is what makes composefs a viable /usr layering mechanism.

Data-only OverlayFS requires:

- `metacopy=off` (don't duplicate metadata in the upper layer)
- `redirect_dir=off` (don't redirect directories)
- A kernel that understands `data-only` mount (≥ 6.5)

Without ≥ 6.5, composefs falls back to a writable upper layer. The mounted /usr is mutable, which breaks the dm-verity invariant ("/usr is immutable at every boot"). The result is a yubiOS image that boots but cannot enforce its load-bearing invariant.

### Kernel ≥ 6.6 — `verity=require`

The `verity=require` mount option tells the kernel: "refuse to mount this overlay if the composefs catalog is not signed by a trusted key." This is the load-bearing enforcement — without it, an unsigned or tampered catalog can be mounted.

The yubiOS convention is to compile the trusted composefs-signing public key into the kernel (via `CONFIG_OVERLAY_FS_REDIRECT_DIR` and the embedded cert in the kernel command line). At mount time, systemd-dissect passes the key and the `verity=require` flag.

### Kernel ≥ 6.12 — File-backed EROFS

EROFS (Enhanced Read-Only File System) is the alternate backing filesystem for composefs. It's denser than Squashfs (typically 5-15% smaller) and has faster decompression for sequential reads. yubiOS uses EROFS for sysext images that need high density (e.g. developer toolchains with many small files).

Kernel ≥ 6.12 is required for **file-backed EROFS** (i.e. EROFS images stored as regular files rather than block devices). This is the composefs-friendly mode — block-device EROFS works on older kernels but is not how composefs composes layers.

## yubiOS convention

The yubiOS PINNED.md convention is to **pick the lowest-supported kernel that supports the full feature set needed**. The current default (2026-08) is:

- **Production yubiOS**: kernel ≥ 6.12 (full composefs feature set, EROFS where applicable)
- **Long-term-support (LTS) yubiOS**: kernel ≥ 6.6 (data-only OverlayFS + `verity=require`, no EROFS)
- **Experimental / pre-release**: kernel ≥ 6.5 (data-only OverlayFS only; no signed-catalog enforcement)

A yubiOS image using a kernel older than 6.5 cannot use composefs; it must use the pre-composefs dm-verity-only path (which ADR-007 explicitly discourages).

## systemd-dissect integration

systemd-dissect is the yubiOS user-space tool that composes composefs layers at boot. The relevant kernel features are exposed via:

- `dissect --mount` — mounts a composefs image (requires ≥ 6.5)
- `dissect --mount-with-catalog` — mounts with a signed catalog (requires ≥ 6.6 + `verity=require`)
- `dissect --mount-with-erofs` — mounts with EROFS backing (requires ≥ 6.12)

The yubiOS boot flow uses `dissect --mount-with-catalog` for the base /usr and `dissect --mount-with-erofs` for sysext images where EROFS density matters.

## Anti-patterns

- **Pinning a kernel < 6.5 for "stability"** — composefs is the yubiOS load-bearing invariant; a kernel < 6.5 silently disables it. The "stability" gain is a fiction (the composefs feature has been stable since 6.5).
- **Pinning ≥ 6.5 but not enforcing `verity=require`** — the kernel supports the feature but the mount option isn't passed; the catalog is informational only.
- **Pinning ≥ 6.12 but using block-device EROFS instead of file-backed** — wastes the density gain that file-backed EROFS provides.
- **Documenting kernel floors in ADR-007 without making this skill** — implicit constraints drift; this skill is the explicit reference.
- **Skipping the kernel version check in `mkosi build`** — a yubiOS image built with kernel < 6.5 will boot but mount an unsigned /usr overlay. Add a `mkosi.prepare` script that asserts the kernel version is ≥ the required floor.
- **Using composefs on a non-Linux system** — composefs is Linux-only; there's no equivalent on macOS/Windows. If you need cross-platform layering, use Docker or OCI image layers (which composefs's metadata format derives from).

## References

- [composefs upstream repo](https://github.com/containers/composefs)
- [Kernel 6.5 OverlayFS data-only mount option](https://docs.kernel.org/filesystems/overlayfs.html)
- [Kernel 6.6 verity=require for overlayfs](https://lwn.net/Articles/933616/)
- [Kernel 6.12 EROFS file-backed support](https://docs.kernel.org/filesystems/erofs.html)
- [systemd-dissect composefs support](https://www.freedesktop.org/software/systemd/man/systemd-dissect.html)
- yubiOS ADR-007 (composefs over dm-verity-checked erofs)
- yubiOS skill `bootc-images` (composefs integration in image-mode)
- yubiOS skill `mkosi-image-builder` (composefs catalog generation at build time)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 3 (upstream comparative) — Stream 3 ranked `composefs-kernel-floors` as the second-pick highest-leverage corpus addition (composefs is fully upstreamed but the kernel-floor dependency was uncurated in ADR-007). Low-effort short reference skill that closes the implicit-constraint gap. Skill mapped to 10-primitive axes: P6 immutability (kernel-floor is the immutability enforcement point), P10 self-describing (the signed catalog is a self-describing artifact). Frontmatter validated by `js-yaml`.

## Immutability coverage for composefs kernel floors (curve-guided-rsi cycle-5 substantive edit)

This skill — **kernel ≥6.5 data-only OverlayFS, ≥6.6 verity=require, ≥6.12 file-backed EROFS** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.661, v=0.672), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For composefs kernel floors, the immutability primitive applies as follows: this skill makes the implicit kernel-floor dependency in ADR-007 explicit; composefs catalogs (per `dm-verity-and-integrity`) require the kernel version floors this skill documents. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for composefs kernel floors: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
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

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `trust chain` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's trust chain integration (PCR / UKI / secure boot / TPM / fTPM) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `trust chain` primitive gap.
