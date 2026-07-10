---
name: saltstack-config-management
description: "SaltStack-based host configuration management for package installation, file/state enforcement, and service orchestration. Use when operating Salt states for server provisioning pipelines. Triggers: saltstack, salt states, config management, host hardening."
argument-hint: "Salt state design or troubleshooting task"
---

# SaltStack Configuration Management

## Use This Skill For

- State file structure and composition
- Package/file/service orchestration on hosts
- Host hardening and baseline enforcement
- Validation of idempotent state application

## Guardrails

1. Keep states idempotent and environment-aware.
2. Separate baseline states from app-specific states.
3. Validate state runs in clean and drifted hosts.
4. Track state changes with clear release notes.
