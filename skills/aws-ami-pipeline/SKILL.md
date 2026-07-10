---
name: aws-ami-pipeline
description: "Immutable AMI pipeline design, image provenance, promotion, and rollback strategy. Use when building baseline host images for EC2 fleets. Triggers: ami, image pipeline, immutable host, host baseline, image promotion."
argument-hint: "AMI build/promotion/rollback request"
---

# AWS AMI Pipeline

## Use This Skill For

- Host image build and versioning strategy
- Environment promotion workflow
- Image provenance and patch cadence
- Rollback via prior approved image ids

## Guardrails

1. Separate image release from app release.
2. Never bake secrets into images.
3. Record image ids per environment for rollback.
4. Replace hosts instead of mutating in place.
