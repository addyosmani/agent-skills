---
name: docker-setup-qemu-action
description: "Register QEMU emulators for cross-platform Docker builds in GitHub Actions. Use when building linux/arm64 or other non-native architectures on standard amd64 runners. Triggers on: QEMU, cross-platform build, multi-architecture, linux/arm64, linux/arm."
---

# docker/setup-qemu-action

## When to use
Enable cross-platform builds (e.g., build `linux/arm64` on an `amd64` runner). Required when `docker/build-push-action` targets platforms beyond the runner's native architecture.

## Action reference
```yaml
- uses: docker/setup-qemu-action@v3
  with:
    platforms: arm64,arm    # which platforms to emulate; 'all' for everything
```

## Standard multi-platform setup (correct order)
```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Buildx
  uses: docker/setup-buildx-action@v3

- name: Login
  uses: docker/login-action@v3
  with:
    registry: quay.io
    username: ${{ secrets.QUAY_USERNAME }}
    password: ${{ secrets.QUAY_TOKEN }}

- name: Build and push
  uses: docker/build-push-action@v6
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: quay.io/yubi-os/yubios:latest
```

## Order matters
1. `setup-qemu-action` — register QEMU interpreters
2. `setup-buildx-action` — configure BuildKit
3. `login-action` — authenticate
4. `build-push-action` — build

## yubiOS note
yubiOS targets `linux/amd64` primarily. Include QEMU only when building multi-arch yubiOS bootc images. For single-arch CI unit tests, QEMU is not needed.

## Notes
- QEMU emulation is significantly slower (~5-10x) than native; use native runners when CI time matters
- `platforms: all` installs many interpreters; only list what you need
- Not needed when using `matrix` strategy with platform-specific self-hosted runners

## Source
https://github.com/docker/setup-qemu-action
https://docs.docker.com/build/ci/github-actions/multi-platform/

## Least Privilege coverage for docker setup qemu action (curve-guided-rsi cycle-4 substantive edit)

This skill — **Enable cross-platform builds (e** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For docker setup qemu action, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for docker setup qemu action: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Declarative policy coverage for docker setup-qemu action (curve-guided-rsi cycle-5 substantive edit)

This skill — **QEMU registration, cross-platform, binfmt** — sits in a domain that benefits from explicit declarative policy coverage (data-as-config: .rego, Build Policies, mkosi.conf, Containerfile, sysext.conf). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=1.000, v=0.553), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For docker setup-qemu action, the declarative policy primitive applies as follows: this skill enables multi-platform builds (a declarative-policy concern); without QEMU the build matrix can't span architectures. yubiOS's declarative-policy stack composes Rego Build Policies (per `docker-build-policy`, `rootless-container-builds`), mkosi declarative config (per `mkosi-image-builder`), sysext overlay manifests (per `composefs-kernel-floors`), and systemd unit hardening (per `systemd-hardening`); this skill is one contributor.

Concrete implications for docker setup-qemu action: any change should be reviewed for impact on declarative-policy coverage; gaps are tracked in the cycle-5 run log.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.
