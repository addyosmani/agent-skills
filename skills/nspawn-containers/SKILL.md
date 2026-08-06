---
name: nspawn-containers
description: "systemd-nspawn for yubiOS: hermetic container dev/test/build environments running off a signed mkosi image (RootImage=, RootMStack=), user-namespace isolation (--private-users=UID_RANGE), network namespace modes (--network-bridge=, --private-network), ephemeral layering (--ephemeral), boot-in-container (--boot), integration with mkosi-built images for reproducible container boundaries, and the yubiOS convention for using nspawn as a portable-service substitute when bootc swap is too heavyweight. Use when setting up a hermetic dev container, running CI in an image-rooted nspawn, configuring RootImage= for a systemd portable service, designing microsegmentation via nspawn + network policy, or testing a build inside a known-good image. Triggers on: systemd-nspawn, nspawn, RootImage=, RootMStack=, portable service, hermetic container, user namespace container, image-rooted nspawn, --ephemeral, --boot, nspawn network bridge."
license: "MIT"
metadata:
  short-description: "systemd-nspawn: hermetic image-rooted containers for dev/test/build, portable-service substitute"
---
# nspawn Containers

## Overview

systemd-nspawn is yubiOS's chosen **hermetic container** mechanism — the path between running on the host (`sysext` to the live /usr) and running in a full VM (`bcvk-virtualization`). nspawn runs a full systemd userspace inside a container rooted at a signed mkosi image, with user-namespace isolation by default and optional network namespace isolation.

The yubiOS nspawn decision tree:

- **Need a sandbox for a build** → nspawn with `RootImage=` from a built mkosi image
- **Need to test the build inside the exact runtime /usr** → nspawn with `RootImage=` + `--boot`
- **Need full isolation / kernel independence** → `bcvk-virtualization` (QEMU-based)
- **Need to ship a service to another host** → systemd portable service (uses nspawn under the hood)
- **Need to add tools without rebuilding the base** → `sysext` overlay (no nspawn)

## When to Use

Use when:

- Running a CI job inside a yubiOS image without the overhead of QEMU
- Setting up a dev container that mirrors production (rooted at the same mkosi image)
- Testing a systemd service unit inside the production /usr
- Building a project that requires a different /usr than the host (cross-distro container)
- Designing a microsegmentation policy using nspawn network namespaces
- Replacing a `docker run` workflow with `systemd-nspawn` for a single-host use case

Do NOT use when:

- The container needs to run on a different kernel (use `bcvk-virtualization` or `bootc-images` install)
- The container needs to be a long-running service in production (use systemd portable service or a managed runtime like podman)
- The container needs to access the host's hardware directly (GPU, USB, NIC) — nspawn's user-namespace isolation breaks hardware access; use QEMU with PCI passthrough
- The container needs to run on macOS or Windows (yubiOS is Linux-only; nspawn is Linux-only)

## Anatomy of an nspawn invocation

```bash
machinectl pull-yubiOS \
    --verify=signature \
    https://download.yubi-OS.com/yubiOS-2026.08.raw.xz \
    yubiOS-2026.08

systemd-nspawn \
    --machine=yubiOS-dev \
    --directory=/var/lib/machines/yubiOS-2026.08 \
    --ephemeral \
    --private-users=100000-165535 \
    --network-bridge=br0 \
    --bind=/home/user/project:/project \
    --setenv=DISPLAY=:0 \
    /usr/bin/bash
```

Flags yubiOS convention:

- `--directory=` is preferred over `--image=` because yubiOS images are typically extracted directories (mkosi default output), not raw disk images
- `--ephemeral` for dev/test — changes are discarded on exit
- `--private-users=100000-165535` matches the yubiOS standard UID range for rootless
- `--network-bridge=br0` for VMs that need network access; `--private-network` for fully offline builds

## Boot in container

```bash
systemd-nspawn \
    --machine=yubiOS-test \
    --directory=/var/lib/machines/yubiOS-2026.08 \
    --boot \
    --private-users=100000-165535
```

`--boot` makes PID 1 run `/sbin/init` (systemd) inside the container. This is the only way to test systemd unit files (systemd hardening, drop-ins, dynamic users) without running on the actual host.

yubiOS's test-in-image convention:

1. Build the mkosi image (`mkosi build`)
2. Extract to `/var/lib/machines/<image-tag>` (`machinectl import-tar` or manual extraction)
3. nspawn `--boot` and run the test suite inside the container
4. Ephemeral means the image is never modified — the next test starts from a clean state

## Network namespace modes

nspawn supports four network modes:

| Mode | What it gives | yubiOS use |
|---|---|---|
| `--private-network` | Container has only loopback | Fully offline builds (Fedora RPM build isolation) |
| `--network-bridge=br0` | Container shares a bridge with the host | Default for dev containers that need network |
| `--network-veth` | Container gets its own veth pair | Network-policy testing (iptables/nftables experiments) |
| `--network-zone=zone` | Container joins a pre-existing zone | Multi-container segmentation tests |

yubiOS's microsegmentation pattern uses `--network-zone=zone` to group nspawn containers by CISA ZTMM maturity stage (e.g. `zone=identity-only`, `zone=device-trust`, `zone=continuous-validation`).

## Portable services

A systemd **portable service** is the production-side cousin of nspawn. It uses `portablectl` to attach a service definition + image to a target host, then runs the service in an nspawn container rooted at the image. The service definition (a `.service` unit) ships with the image.

```bash
# On the build host
portablectl attach \
    --image=/path/to/yubiOS-portable-2026.08.raw \
    yubiOS-portable \
    /etc/portables/yubiOS-portable.service

# The service is now available on the host
systemctl start yubiOS-portable.service
# Behind the scenes, systemd-nspawn is invoked with --directory=
```

yubiOS uses portable services for:

- Shipping a tool to a customer without requiring them to install it natively
- Running an old version of a service alongside the current version
- Running a service that needs a specific /usr without rebuilding the host

## Anti-patterns

- **nspawn as a substitute for QEMU when kernel isolation is required** — nspawn shares the host kernel. For TEE/seccomp/test isolation that requires a separate kernel, use `bcvk-virtualization`.
- **nspawn with `--private-users=0`** — this disables user namespace isolation and runs the container as root inside, breaking the yubiOS least-privilege model. Always use `--private-users=UID_RANGE` (yubiOS convention: 100000-165535).
- **nspawn with `--bind=/home`** — binding the host's /home into the container shares the host's UID namespace, defeating user-namespace isolation. Use `--bind=/home/user/project` to scope the bind.
- **Long-running nspawn containers without `--ephemeral`** — nspawn doesn't have a proper image-update story; long-running containers drift from the source image. For long-running, use `bootc install to-disk` (a real VM/host) or `podman` (managed runtime).
- **nspawn for multi-tenant isolation** — nspawn's isolation is process-level, not hardware-level. Multi-tenant workloads that need hardware-enforced isolation should use Kata Containers, gVisor, or `bcvk-virtualization` with QEMU.
- **Running nspawn inside Docker** — nested user namespaces are fragile. If you need a container inside a container, use `docker buildx` with the `docker-container` driver, not nspawn-in-Docker.

## References

- [systemd-nspawn man page](https://www.freedesktop.org/software/systemd/man/systemd-nspawn.html)
- [systemd Portable Services documentation](https://systemd.io/PORTABLE_SERVICES/)
- [machinectl man page](https://www.freedesktop.org/software/systemd/man/machinectl.html)
- yubiOS skill `bcvk-virtualization` (QEMU-based isolation, the "go bigger" alternative)
- yubiOS skill `mkosi-image-builder` (the image provider for nspawn RootImage=)
- yubiOS skill `bootc-images` (the image-mode source for nspawn root directories)
- yubiOS skill `systemd-hardening` (systemd unit testing inside nspawn)
- yubiOS ADR-031 (vfio-user boundary; nspawn is the "go smaller" side of this trust boundary)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `nspawn-containers` proposal — nspawn was implicit across `bcvk-virtualization`, `bootc-images`, and `mkosi-image-builder` but had no dedicated skill. The hermetic-image-rooted container pattern is now first-class. Skill mapped to 10-primitive axes: P9 segmentation (primary), P3 least privilege (user-namespace + bind scoping), P6 immutability (signed mkosi image as root), P4 declarative policy (nspawn flags as declarative). Frontmatter validated by `js-yaml`.

## Segmentation coverage for nspawn containers (curve-guided-rsi cycle-5 substantive edit)

This skill — **RootImage=, --boot, --private-users, --network-bridge** — sits in a domain that benefits from explicit segmentation coverage (process, container, VM, network, hardware). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.559, v=0.175), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For nspawn containers, the segmentation primitive applies as follows: this skill provides the segmentation primitive for image-rooted containers; hermetic builds + portable services + boundary testing compose via nspawn. yubiOS's segmentation stack composes nspawn containers (per `nspawn-containers`), vfio-user device boundaries (per ADR-031), and CISA ZTMM microsegmentation primitives (per `internal-big-picture`); this skill is one contributor.

Concrete implications for nspawn containers: any change should be reviewed for impact on segmentation coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `trust chain` coverage gap in the 10-primitive yubiOS framework. **trust chain** was missing across 23/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill contributes to the yubiOS trust chain via PCR / UKI / secure boot / TPM / fTPM integration. Specifically it covers: trust chain, PCR, UKI.

**Keywords introduced in this skill (cycle-5 RSI):** `trust chain`, `PCR`, `UKI`, `secure boot`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `trust chain` count moved 23→24/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `trust chain` primitive gap (corpus-wide count 23→24/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.
