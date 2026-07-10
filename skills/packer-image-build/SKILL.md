---
name: packer-image-build
description: "Packer workflows for deterministic base images, provisioning scripts, and image version governance. Use when implementing immutable host strategy on cloud or VPS fleets. Triggers: packer, image build, immutable host, base image, golden image."
argument-hint: "Packer template or rollout request"
---

# Packer Image Build

## Use This Skill For

- Building reproducible base images
- Structuring template variables and provisioners
- Embedding baseline runtime/security tooling
- Integrating image builds into CI/CD promotion flows

## Guardrails

1. Keep templates deterministic and environment-neutral.
2. Pin critical package/runtime versions where practical.
3. Validate images with smoke tests before promotion.
4. Track image lineage with SHA/date metadata.
