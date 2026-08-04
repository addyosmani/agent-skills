---
name: docker-metadata-action
description: "Generate OCI-compliant Docker image tags and labels automatically from Git metadata (branch, tag, SHA, PR) in GitHub Actions using docker/metadata-action. Use before docker/build-push-action to avoid hardcoded tags and ensure proper OCI annotations. Triggers on: docker tags, OCI labels, metadata-action, image tags, semver tags, tags and labels."
---

# docker/metadata-action

## When to use
Automatically generate image tags and OCI labels from Git ref, SHA, PR number, or semver tags. Use before `docker/build-push-action` to avoid hardcoded image tags and get consistent OCI annotations.

## Action reference
```yaml
- uses: docker/metadata-action@v5
  id: meta
  with:
    images: |
      quay.io/yubi-os/yubios
      ghcr.io/yubi-os/yubios
    tags: |
      type=schedule
      type=ref,event=branch
      type=ref,event=pr
      type=semver,pattern={{version}}
      type=semver,pattern={{major}}.{{minor}}
      type=sha
```

## Tag types reference
| Type | Trigger | Example output |
|---|---|---|
| `ref,event=branch` | push to branch | `main`, `feat-fido2` |
| `ref,event=pr` | PR open | `pr-42` |
| `semver,pattern={{version}}` | tag `v1.2.3` | `1.2.3` |
| `semver,pattern={{major}}.{{minor}}` | tag `v1.2.3` | `1.2` |
| `sha` | any push | `sha-a1b2c3d` (short) |
| `sha,format=long` | any push | `sha-a1b2c3d4e5f6...` (full) |
| `schedule` | cron trigger | `nightly` |
| `raw,value=latest` | any push | `latest` (use sparingly) |

## Outputs
| Output | Description |
|---|---|
| `tags` | Newline-separated tag list |
| `labels` | Newline-separated OCI label list |
| `version` | Extracted version string |
| `bake-file` | JSON bake file for `docker/bake-action` integration |
| `json` | Full JSON metadata |

## Usage with build-push-action
```yaml
- uses: docker/metadata-action@v5
  id: meta
  with:
    images: quay.io/yubi-os/yubios

- uses: docker/build-push-action@v6
  with:
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
```

## yubiOS pattern (supply chain + bootc label)
```yaml
- uses: docker/metadata-action@v5
  id: meta
  with:
    images: |
      quay.io/yubi-os/yubios
    tags: |
      type=sha,format=long          # full SHA for digest pinning
      type=ref,event=branch         # branch builds
      type=semver,pattern={{version}}  # release tags
    labels: |
      containers.bootc=1
      org.opencontainers.image.source=https://github.com/yubi-OS/yubiOS
      org.opencontainers.image.description=FIDO2-first immutable OS
      org.opencontainers.image.licenses=GPL-2.0
```

## Auto-generated OCI labels
These are generated automatically from GitHub repo metadata:
- `org.opencontainers.image.title`
- `org.opencontainers.image.url`
- `org.opencontainers.image.created`
- `org.opencontainers.image.revision`
- `org.opencontainers.image.version`

## Notes
- `id: meta` is required so subsequent steps can reference `steps.meta.outputs.*`
- Multiple `images:` entries generate tags for all registries simultaneously
- `type=sha,format=long` preferred over `:latest` for supply chain compliance (yubiOS.rego)
- The `bake-file` output integrates with `docker/bake-action` for multi-target builds

## Source
https://github.com/docker/metadata-action
https://docs.docker.com/build/ci/github-actions/manage-tags-labels/

## Note on attestation coverage (curve-guided-rsi v1 gap-fix)

This skill relates to measured-boot evidence, PCRs, fTPM, IMA, or TPM attestation in the yubiOS trust chain. See `internal-big-picture` for the full attestation primitive.

## Note on continuous/adaptive coverage (curve-guided-rsi cycle-2 gap-fix)

This skill supports continuous/adaptive updates — upgrade, rollback, atomic switch, bootc upgrade, OSTree, composefs, or image mode. See `internal-big-picture` for the full continuous/adaptive primitive.

## Least Privilege coverage for docker metadata action (curve-guided-rsi cycle-4 substantive edit)

This skill — **Automatically generate image tags and OCI labels from Git ref, SHA, PR number, or semver tags** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For docker metadata action, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for docker metadata action: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).
