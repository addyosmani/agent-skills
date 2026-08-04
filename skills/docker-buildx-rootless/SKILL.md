---
name: docker-buildx-rootless
description: >-
  Docker CLI-level skill covering three topics: (1) dockerd rootless mode —
  running the Docker daemon as a non-root user via user namespaces, daemon
  socket location, systemd user unit, contexts; (2) docker buildx CLI —
  builder instances, driver types (docker, docker-container, kubernetes,
  remote), buildx create/use/inspect/rm, multi-platform builds, cache
  management, bake; (3) Docker Build Policies (OPA/Rego) — the --policy flag,
  policy file schema, input object fields, decision object, yubiOS yubiOS.rego
  pattern. Use when setting up rootless dockerd, creating/managing buildx
  builders, running multi-platform builds, writing or debugging Build Policy
  .rego files, or working with docker buildx bake. Pairs with
  rootless-container-builds (supply chain hardening) and the docker GitHub
  Actions skills for CI. Triggers on: dockerd rootless, dockerd --rootless,
  rootless daemon, buildx create, buildx use, buildx drivers, docker-container
  driver, bake, docker-bake.hcl, --policy, Build Policy, OPA rego docker,
  isCanonical, multi-platform buildx.
---

# Docker Buildx + Rootless Daemon (CLI)

## Part 1 — dockerd Rootless Mode

Rootless mode runs the Docker daemon and containers inside a **user namespace**.
Neither the daemon nor the containers require root on the host. A compromised build
or container can't escalate to host root.

Source: https://docs.docker.com/engine/security/rootless/

### How it works

The daemon executes inside a user namespace. Container UID 0 maps to an unprivileged
host UID (100000+) via `/etc/subuid` / `/etc/subgid`. Does not use SETUID bits or
file capabilities — only `newuidmap` / `newgidmap` for UID/GID mapping.

Differs from `userns-remap` mode: with userns-remap the daemon itself runs as root;
with rootless mode both daemon and containers run without root.

### Prerequisites

```sh
# /etc/subuid and /etc/subgid must have >= 65,536 subordinate UIDs/GIDs:
grep ^$(whoami): /etc/subuid    # e.g. jenny:231072:65536
grep ^$(whoami): /etc/subgid

# Install newuidmap / newgidmap if missing (Fedora/RHEL):
sudo dnf install shadow-utils
# Ubuntu/Debian: sudo apt-get install uidmap

# Disable the system-wide daemon if running:
sudo systemctl disable --now docker.service docker.socket
sudo rm /var/run/docker.sock
```

### Install (with RPM/DEB packages)

```sh
# Sets up ~/.config/systemd/user/docker.service + creates "rootless" CLI context
dockerd-rootless-setuptool.sh install

# Start and enable on login:
systemctl --user start docker.service
sudo loginctl enable-linger $USER   # persist across logouts

# Or install without packages (get.docker.com script):
curl -fsSL https://get.docker.com/rootless | sh
# Binaries land in ~/bin
```

### Daemon socket and CLI context

```sh
# Socket lives at: unix:///run/user/<UID>/docker.sock
export DOCKER_HOST=unix:///run/user/1000/docker.sock

# Or use the created context (preferred):
docker context use rootless
docker context ls

# Verify:
docker info | grep -A5 "Security Options:"
#  Security Options:
#   seccomp ...
#   rootless              ← confirms rootless mode
#   cgroupns
```

### Known limitations (from official docs)

- No cgroup v1 device access (`--device` limited without cgroup v1)
- AppArmor/SELinux policy enforcement may require extra config
- Network performance can differ (slirp4netns vs host namespace)
- Some `docker run` flags that require root are restricted
- Overlay storage driver requires kernel >= 5.11 or `fuse-overlayfs` fallback

### yubiOS context

yubiOS builds use rootless Docker Buildx (ADR-014), not rootless Podman. The
rootless daemon provides the security isolation; Buildx + Build Policies provide
the supply-chain controls. The dhi.io CI container image already ships in a
rootless-compatible environment.

---

## Part 2 — docker buildx CLI

BuildKit is the build backend. `docker buildx` is the CLI frontend. Builders are
named BuildKit instances; you can have multiple with different drivers.

### Builder drivers

| Driver | Where BuildKit runs | Use for |
|---|---|---|
| `docker` | Inside the running Docker daemon | Default. Simple local builds. Limited: no cache export, no multi-platform without QEMU. |
| `docker-container` | A BuildKit container started by Docker | Full BuildKit feature set: cache export/import, multi-platform, SBOM/provenance attestations, Build Policies. **Recommended for yubiOS.** |
| `kubernetes` | BuildKit pods in a Kubernetes cluster | CI at scale. |
| `remote` | An already-running BuildKit daemon | Custom infrastructure. |

### Builder lifecycle

```sh
# Create a builder with the docker-container driver (full features)
docker buildx create \
  --name yubiOS-builder \
  --driver docker-container \
  --driver-opt network=host \
  --use

# Bootstrap (starts the BuildKit container, fetches info):
docker buildx inspect --bootstrap

# List all builders:
docker buildx ls

# Switch default builder:
docker buildx use yubiOS-builder

# Remove a builder:
docker buildx rm yubiOS-builder

# Use the "default" docker driver (built-in, no daemon start needed):
docker buildx use default
```

### Multi-platform builds

```sh
# Register QEMU emulators (needed for non-native platforms on amd64 runners):
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
# OR use docker/setup-qemu-action in CI

# Build for amd64 + arm64, push to registry:
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t quay.io/fedora/fedora-bootc:45 \
  .

# yubiOS multi-arch build (ADR-017):
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --policy reset=true,strict=true,filename=yubiOS.rego \
  -t dhi.io/yubi-OS/yubiOS:latest \
  .
```

### Cache management

```sh
# Inline cache (embedded in the image, only useful for small images):
docker buildx build --cache-to type=inline --cache-from type=registry,ref=<image> .

# Registry cache (most common in CI):
docker buildx build \
  --cache-to type=registry,ref=dhi.io/yubi-OS/yubiOS-cache:latest,mode=max \
  --cache-from type=registry,ref=dhi.io/yubi-OS/yubiOS-cache:latest \
  .

# GitHub Actions cache:
docker buildx build \
  --cache-to type=gha,mode=max \
  --cache-from type=gha \
  .
```

### Attestations (SBOM + Provenance)

```sh
# Add SLSA provenance + SBOM attestation (requires docker-container driver):
docker buildx build \
  --attest type=provenance,mode=max \
  --attest type=sbom \
  --push -t dhi.io/yubi-OS/yubiOS:latest .

# Verify provenance:
docker buildx imagetools inspect dhi.io/yubi-OS/yubiOS:latest \
  --format '{{ json .Provenance }}'
```

### Bake — multi-target declarative builds

`docker buildx bake` reads `docker-bake.hcl` (or `.json`, `docker-compose.yml`).

```hcl
# docker-bake.hcl

variable "REGISTRY" { default = "dhi.io/yubi-OS" }
variable "TAG"      { default = "latest" }

group "default" {
  targets = ["yubiOS"]
}

target "yubiOS" {
  context    = "."
  dockerfile = "Containerfile"
  platforms  = ["linux/amd64", "linux/arm64"]
  tags       = ["${REGISTRY}/yubiOS:${TAG}"]
  args = {
    BASE_DIGEST = "sha256:6a60ff82da9d2f73aad315233fbffe2ed880a7d695ec9940c0754f84f13db9d6"
  }
}

# Inherit a base target and override:
target "yubiOS-dev" {
  inherits = ["yubiOS"]
  tags     = ["${REGISTRY}/yubiOS:dev"]
}
```

```sh
# Build default group:
docker buildx bake

# Build a specific target:
docker buildx bake yubiOS-dev

# Override a variable:
docker buildx bake --set "yubiOS.tags=dhi.io/yubi-OS/yubiOS:ci-${GITHUB_SHA}"

# Print the resolved config without building:
docker buildx bake --print
```

---

## Part 3 — Build Policies (OPA/Rego)

Build Policies run **before any layer executes**. They evaluate the `input` object
against a Rego policy and gate the build based on the `decision.allow` result.

Source: https://docs.docker.com/build/policies/

### Invocation

```sh
# Standard yubiOS invocation (from AGENTS.md):
docker buildx build --policy reset=true,strict=true,filename=yubiOS.rego .

# Key --policy options:
#   reset=true     — start from blank policy (don't inherit daemon defaults)
#   strict=true    — fail build if policy evaluation fails (not just warns)
#   filename=<f>   — path to the .rego policy file
#   log-level=debug — verbose evaluation output (combine with reset=true)
```

### Input object fields

| Field | Type | Description |
|---|---|---|
| `input.image.ref` | string | Full image reference, e.g. `quay.io/fedora/fedora-bootc:45@sha256:...` |
| `input.image.isCanonical` | bool | `true` if the ref includes a `@sha256:` digest — no mutable tags |
| `input.image.hasProvenance` | bool | `true` if a SLSA provenance attestation is present |
| `input.local` | bool | `true` for local builds (Containerfile with no external FROM) |

### yubiOS.rego (the live policy)

```rego
package docker

import future.keywords.if
import future.keywords.in

default allow := false

# Approved registries
approved_registry(ref) if startswith(ref, "quay.io/fedora/")
approved_registry(ref) if startswith(ref, "dhi.io/")

# Allow local context (COPY-only layers, no FROM pull)
allow if input.local

# Allow: approved registry AND digest-pinned (isCanonical)
allow if {
    approved_registry(input.image.ref)
    input.image.isCanonical
}

# Decision + deny reasons
decision := { "allow": allow, "reason": reason }

reason := msg if {
    not input.local
    not approved_registry(input.image.ref)
    msg := sprintf("Image '%v' not from an approved registry (quay.io/fedora/, dhi.io/)", [input.image.ref])
}

reason := msg if {
    not input.local
    approved_registry(input.image.ref)
    not input.image.isCanonical
    msg := sprintf("Image '%v' uses a mutable tag. Pin to a digest: FROM %v@sha256:<hash>", [input.image.ref, input.image.ref])
}

reason := "Build allowed." if allow
```

### Policy design patterns

```rego
# Deny if no provenance attestation (stricter supply chain):
allow if {
    approved_registry(input.image.ref)
    input.image.isCanonical
    input.image.hasProvenance
}

# Allow specific digest only (maximum lock-down):
allow if {
    input.image.ref == "quay.io/fedora/fedora-bootc:45@sha256:6a60ff82da9d..."
}

# Warn but don't fail (remove from decision, or use log-level=warn in --policy):
# Note: no "warn" action in the current policy schema — it's allow or deny.
# Use log-level=debug to see evaluation trace.
```

### Debugging policies

```sh
# See verbose evaluation during build:
docker buildx build \
  --policy reset=true,log-level=debug,filename=yubiOS.rego \
  --progress=plain \
  .

# The deny reason is printed in the build output when allow=false.
# NOTE: 'docker buildx policy eval' does NOT exist — debug via --progress=plain.
```

---

## Quick reference — yubiOS build commands

```sh
# Standard yubiOS OCI image build (ADR-014/015):
docker buildx build \
  --policy reset=true,strict=true,filename=yubiOS.rego \
  -t dhi.io/yubi-OS/yubiOS:latest \
  .

# Multi-arch (ADR-017):
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --policy reset=true,strict=true,filename=yubiOS.rego \
  -t dhi.io/yubi-OS/yubiOS:latest \
  --push .

# Check current rootless daemon context:
docker context ls
docker info | grep -E "rootless|Security"
```

## References

- Rootless mode: https://docs.docker.com/engine/security/rootless/
- Buildx builders: https://docs.docker.com/build/builders/
- Build drivers: https://docs.docker.com/build/builders/drivers/
- Build Policies: https://docs.docker.com/build/policies/
- Bake: https://docs.docker.com/build/bake/
- ADR-014 (Docker Buildx over Podman), ADR-015 (digest pinning), ADR-017 (multi-arch)

## Immutability coverage for docker buildx rootless (curve-guided-rsi cycle-4 substantive edit)

This skill — **Rootless mode runs the Docker daemon and containers inside a **user namespace**** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fsverity, OSTree, hermetic /usr, verity) coverage. Even when the skill's primary job is not the immutability primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For docker buildx rootless, the immutability primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the immutability layer of the yubiOS pipeline, and consumers that reason about immutability coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full immutability primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for docker buildx rootless: any change to the skill should be reviewed for impact on immutability coverage; gaps in immutability that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).
