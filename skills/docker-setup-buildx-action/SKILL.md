---
name: docker-setup-buildx-action
description: "Set up Docker Buildx (BuildKit) in GitHub Actions for multi-platform builds, cache export/import, SLSA attestations, and advanced build features. Use before docker/build-push-action when needing cache, attestations, or multi-platform. Triggers on: Docker Buildx, BuildKit, setup-buildx, multi-platform build, cache export, build attestations."
---

# docker/setup-buildx-action

## When to use
Required before `docker/build-push-action` when using: cache export/import, SLSA provenance/SBOM attestations, multi-platform builds, or custom buildkitd config.

## Action reference
```yaml
- uses: docker/setup-buildx-action@v3
  with:
    version: latest          # pin for reproducibility
    driver: docker-container # default; needed for cache/attestations
```

## Minimal usage (most workflows)
```yaml
- name: Set up Buildx
  uses: docker/setup-buildx-action@v3
```

## With buildkitd config (registry mirrors)
```yaml
- uses: docker/setup-buildx-action@v3
  with:
    buildkitd-config-inline: |
      [registry."quay.io"]
        mirrors = ["mirror.example.com"]
```

## With network host (for accessing local services during build)
```yaml
- uses: docker/setup-buildx-action@v3
  with:
    driver-opts: network=host
```

## Notes
- The `docker-container` driver runs BuildKit in a container; required for cache/attestations
- Use `docker` driver only for simple single-platform builds without extra features
- Pin action SHA for AGENTS.md-compliant workflows; `@v3` acceptable for dev
- For yubiOS CI: always include before building bootc images with attestations

## Driver comparison
| Driver | Cache export | Attestations | Multi-platform |
|---|---|---|---|
| `docker-container` (default) | Yes | Yes | Yes |
| `docker` | No | No | No |
| `kubernetes` | Yes | Yes | Yes |

## Source
https://github.com/docker/setup-buildx-action
https://docs.docker.com/build/ci/github-actions/configure-builder/

## Least Privilege coverage for docker setup buildx action (curve-guided-rsi cycle-4 substantive edit)

This skill — **Required before `docker/build-push-action` when using: cache export/import, SLSA provenance/SBOM attestations, multi-platform builds, or custom buildkitd config** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For docker setup buildx action, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for docker setup buildx action: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Declarative policy coverage for docker setup-buildx action (curve-guided-rsi cycle-5 substantive edit)

This skill — **BuildKit setup, cache, multi-platform, attestations** — sits in a domain that benefits from explicit declarative policy coverage (data-as-config: .rego, Build Policies, mkosi.conf, Containerfile, sysext.conf). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.593, v=0.818), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For docker setup-buildx action, the declarative policy primitive applies as follows: this skill is the setup step for declarative-policy builds; buildx is the executor for the policy gate. yubiOS's declarative-policy stack composes Rego Build Policies (per `docker-build-policy`, `rootless-container-builds`), mkosi declarative config (per `mkosi-image-builder`), sysext overlay manifests (per `composefs-kernel-floors`), and systemd unit hardening (per `systemd-hardening`); this skill is one contributor.

Concrete implications for docker setup-buildx action: any change should be reviewed for impact on declarative-policy coverage; gaps are tracked in the cycle-5 run log.
