---
name: open-service-broker
description: "Open Service Broker API patterns for service provisioning contracts, catalog design, and async status handling. Use when implementing self-service resource provisioning interfaces. Triggers: osb, open service broker, provision, bind, service catalog."
argument-hint: "OSB contract or broker implementation task"
---

# Open Service Broker

## Use This Skill For

- Catalog, provision, bind, update, and deprovision contract design
- Async operation semantics and polling workflows
- Platform integration for self-service provisioning
- Broker-side validation and tenancy boundaries

## Guardrails

1. Keep broker operations idempotent.
2. Return explicit operation states and errors.
3. Enforce tenant/service plan authorization checks.
4. Version and document broker contract changes.
