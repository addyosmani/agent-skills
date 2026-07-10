---
name: aws-ec2-autoscaling
description: "EC2 and Auto Scaling Group design for immutable fleet operations, launch templates, and health-based replacement. Use when scaling or operating EC2 service fleets. Triggers: ec2, autoscaling, asg, launch template, instance lifecycle."
argument-hint: "EC2/ASG architecture, scaling, or rollout task"
---

# AWS EC2 and Auto Scaling

## Use This Skill For

- Launch template and ASG policy design
- Immutable host replacement and rolling updates
- Health check tuning and instance lifecycle policies
- Capacity planning across environments and regions

## Guardrails

1. Prefer replace-over-patch for production hosts.
2. Keep image versioning explicit in rollout plans.
3. Use staged scaling changes with clear rollback.
4. Monitor instance churn and failed launch rates.
