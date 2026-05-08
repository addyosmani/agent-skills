---
name: finops-mothballing-and-optimization
description: Guides agents through infrastructure cost auditing and automated scale-to-zero mothballing. Use when modifying infrastructure definitions, deployment scripts, or orchestrating long-running agent fleets.
---

# FinOps Mothballing & Cost Optimization

## Overview
Cloud resources are frequently left running idly, accumulating immense financial and technical debt. This skill establishes an automated scale-to-zero workflow to mothball inactive agent fleets, Reasoning Engines, and serverless infrastructure, driving extreme cost efficiency (up to 92% reduction in operating expenses).

## When to Use
- Modifying Terraform, CloudFormation, or Serverless framework definitions
- Provisioning long-running or multi-agent orchestration fleets
- Establishing budget guardrails or token-traffic routing configurations
- Conducting routine infrastructure maintenance or cost reviews

**When NOT to use:** Simple application logic bug fixes or local-only non-deployed scripts.

## The Gated Workflow

Follow these four linear phases. Do not proceed to the next phase until the current verification gate passes.

```
COST-AUDIT ──→ TRAFFIC-ANALYSIS ──→ SCALE-TO-ZERO-PLAN ──→ APPLY-MOTHBALLING
```

### Phase 1: Cost Audit
Analyze the current infrastructure manifests to calculate baseline hourly burn rates. Identify all active runtimes, databases, and Reasoning Engine instances.

### Phase 2: Traffic Analysis
Map out the active execution cycles versus idle periods. Determine which services experience zero incoming requests during off-hours or batch processing windows.

### Phase 3: Scale-to-Zero Plan
Define explicit mothballing rules:
1. Configure auto-shutdown triggers for idle containers.
2. Set up token-traffic routing switches to divert non-critical background tasks to smaller, highly economical models (e.g., Gemini Flash).
3. Establish explicit budget ceilings in orchestration configurations.

### Phase 4: Apply Mothballing
Inject the scale-to-zero definitions directly into the deployment templates and apply the configuration updates.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Cloud resources are cheap, we don't need to optimize yet." | Idle resources accumulate runaway compounding debt. Establishing scale-to-zero baselines during inactive cycles is mandatory for long-term economic sustainability. |
| "Scaling down might increase cold start latency." | Cold start latency during inactive periods is a worthwhile trade-off for massive cost savings. Critical paths remain warm via explicit schedule triggers. |
| "We can just review the billing dashboard next month." | Retrospective audits happen too late. Cost governance must be enforced declaratively as code before provisioning. |

## Red Flags
- Deploying compute resources without explicit timeout or scale-to-zero policies
- Hardcoding premium models for background tasks that don't require deep reasoning
- Omitting budget alert thresholds from CI/CD pipeline deployment scripts

## Verification
After completing the optimization process, confirm:
- [ ] Infrastructure manifests include automated scale-to-zero triggers
- [ ] Baseline and projected hourly burn rates are documented in the deployment plan
- [ ] Token-traffic routing prefers economical models for static/batch workloads
- [ ] Configuration passes static validation (e.g., `terraform validate`)
