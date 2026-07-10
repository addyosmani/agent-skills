---
name: aws-cloudformation
description: "AWS CloudFormation infrastructure-as-code patterns for stack design, drift control, promotion flow, and safe updates. Use when creating or reviewing IaC for AWS resources. Triggers: cloudformation, cfn, stack update, template, drift detection."
argument-hint: "CloudFormation template or stack workflow task"
---

# AWS CloudFormation

## Use This Skill For

- Template authoring and modular stack structure
- Stack update strategy and change sets
- Multi-environment promotion and parameter hygiene
- Drift detection and remediation planning

## Guardrails

1. Use change sets before production updates.
2. Protect critical resources with stack policies.
3. Keep environment-specific values out of templates where possible.
4. Run drift checks on a schedule.
