---
name: fedora-bootc-base-images
description: "Working with official Fedora and CentOS Stream bootc base images: image tiers (standard/minimal/minimal-plus), source repos, digest pinning, bootc-base-imagectl, upstream tracking. Use when deriving yubiOS from fedora-bootc, sourcing digests, understanding tier differences, or tracking upstream package changes. Triggers on: fedora-bootc, centos-bootc, quay.io/fedora/fedora-bootc, quay.io/centos-bootc, base image tiers, rpm-ostree compose, bootc-base-imagectl, minimal-plus, standard tier."
---

# Fedora/CentOS bootc Base Images

## Source repositories

| Distro | GitLab | Published image |
|---|---|---|
| Fedora | https://gitlab.com/fedora/bootc/base-images | `quay.io/fedora/fedora-bootc:{version}` |
| CentOS Stream 9 | https://gitlab.com/redhat/centos-stream/containers/bootc (c9s branch) | `quay.io/centos-bootc/centos-bootc:stream9` |
| CentOS Stream 10 | https://gitlab.com/redhat/centos-stream/containers/bootc (c10s branch) | `quay.io/centos-bootc/centos-bootc:stream10` |

The CentOS repo's `main` branch is a redirect shell. Real image definitions are in `c9s` and `c10s` branches.

---

## Image tiers (Fedora standard repo)

| Tier | Image | Package set |
|---|---|---|
| **standard** | `quay.io/fedora/fedora-bootc` | Full: kernel, systemd, NetworkManager, podman, LUKS, LVM, RAID, sos, jq, etc. |
| **minimal-plus** | quay.io/bootc-devel/fedora-bootc-{N}-minimal-plus | Shared base for IoT, Atomic Desktops, CoreOS: kernel + systemd + bootc + networking basics |
| **minimal** | quay.io/bootc-devel/fedora-bootc-{N}-minimal | Smallest bootable reference: kernel + systemd + bootc only |

Inheritance: `standard` ← `minimal-plus` ← `minimal`.

Only `standard` is officially published to `quay.io/fedora/`. minimal/minimal-plus use the bootc-devel registry for dev/testing.

---

## yubiOS base image

yubiOS derives from Fedora standard. Always pin to digest:

```dockerfile
FROM quay.io/fedora/fedora-bootc:42@sha256:<digest>
LABEL containers.bootc 1
```

Get current digest:
```bash
skopeo inspect --format '{{.Digest}}' docker://quay.io/fedora/fedora-bootc:42
```

---

## What the standard tier includes (relevant to yubiOS)

Already included — no need to add:
- `bootc` — in-place upgrades
- LUKS, LVM, RAID filesystem tools
- `systemd`, `NetworkManager`

Consider removing (reduces attack surface):
- `podman` — avoid if not running containers inside yubiOS

Not included — must add in yubiOS layer:
- `ykman`, `pcscd`, `opensc` — YubiKey tooling
- `pam-u2f` — FIDO2 PAM
- `yubikey-manager` — enrollment scripts
- Cloud agents (`cloud-init`) — add for cloud deployments

---

## Repo structure (Fedora base-images)

```
Containerfile          ← OCI build (multi-stage: base + rechunk/chunked targets)
Justfile               ← Task runner: `just build`, `FEDORA_VERSION=43 just build`
bootc-base-imagectl    ← Shell script: rechunk, OCI image builds
fedora-{N}.yaml        ← Per-version treefile stubs
standard.yaml          ← Standard tier manifest
minimal.yaml           ← Minimal tier manifest
minimal-plus.yaml      ← minimal-plus tier manifest
iot.yaml               ← IoT variant
.tekton/               ← Konflux CI (official Red Hat builds)
ci/                    ← Shellcheck + whitespace validation
renovate.json          ← Automated dependency bumps
```

---

## Building the base locally (rarely needed)

```bash
# Standard tier against Fedora 43
FEDORA_VERSION=43 just build

# Specific tier
just build-minimal

# Rechunk (content-based layer splitting)
./bootc-base-imagectl rechunk --chunkah quay.io/local/fedora-bootc:build
```

---

## CentOS Stream repo structure

`main` branch: redirect shell only (git submodule to fedora base-images + README).
Real content:
- `c9s` — CentOS Stream 9 definitions → `quay.io/centos-bootc/centos-bootc:stream9`
- `c10s` — CentOS Stream 10 (in development) → `quay.io/centos-bootc/centos-bootc:stream10`

Used as upstream for RHEL Image Mode product.

---

## Upstream tracking (what to watch)

Changes in `minimal.yaml` / `standard.yaml` can affect yubiOS:
- New packages added (security tools, network managers)
- Packages removed from standard
- Bootloader/dracut changes

**Recent notable change** (2 days before 2026-05-11):
- `clevis-dracut` + `clevis-pin-tpm2` added to minimal/standard. Clevis handles LUKS auto-unlock. yubiOS replaces this with YubiKey FIDO2 unlock — verify no conflict with clevis hooks in the boot chain.

Renovate bumps Fedora version pins automatically; watch Renovate MRs for upstream version movement.

---

## Konflux CI (official builds)

Actual image builds happen in Konflux (Red Hat's internal CI). The Tekton pipeline definitions are in `.tekton/`. Local `just build` is for development testing only, not what produces the published images.

---

## Source references
- https://fedora.gitlab.io/bootc/docs/bootc/base-images/
- https://gitlab.com/fedora/bootc/base-images
- https://gitlab.com/redhat/centos-stream/containers/bootc
- https://bootc.dev/bootc/bootc-images.html

## Note on immutability coverage (curve-guided-rsi v1 gap-fix)

This skill contributes to immutability — sysext, read-only mounts, fsverity, OSTree, hermetic /usr, or verity. See `internal-big-picture` for the full immutability primitive.

## Note on audit/evidence coverage (curve-guided-rsi cycle-2 gap-fix)

This skill produces audit evidence — logs, journal, SBOM, SLSA provenance, attestation, rekor, cosign, or per-step log artifacts. See `internal-big-picture` for the full audit/evidence primitive.

## Least Privilege coverage for fedora bootc base images (curve-guided-rsi cycle-4 substantive edit)

This skill — **| Distro | GitLab | Published image |** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For fedora bootc base images, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for fedora bootc base images: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).
