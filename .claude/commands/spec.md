---
description: Start spec-driven development — write a structured specification before writing code
---

Invoke the agent-skills:spec-driven-development skill.

Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)

Then generate a structured spec covering all six core areas: objective, commands, project structure, code style, testing strategy, and boundaries.

Before creating a new spec file, check if `specs/capability-map.md` exists. If the request extends or modifies an existing domain module, update its existing `specs/SPEC-<module>.md` instead of creating a duplicate spec file.

If the request bundles several independently testable capabilities or introduces a new domain, first propose a capability map (module ids, dependency direction, build order) per the skill's Phase 0 and get it approved, then spec each module in dependency order.

Save the spec inside the `specs/` directory (e.g., `specs/SPEC.md` or `specs/SPEC-<module>.md`, along with `specs/capability-map.md` if multi-module) and confirm with the user before proceeding.

