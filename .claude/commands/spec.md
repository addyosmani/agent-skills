---
description: Start spec-driven development — write a structured specification before writing code
---

Invoke the agent-skills:spec-driven-development skill.

First check whether SPEC.md already exists in the project root — that decides which flow applies.

**New spec** (no SPEC.md, or the request is unrelated to what it describes): Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)

Then generate a structured spec covering all six core areas: objective, commands, project structure, code style, testing strategy, and boundaries. Save it as SPEC.md in the project root and confirm with the user before proceeding.

**Delta spec** (SPEC.md exists and this request is a change to what it describes): do not overwrite it — write a delta spec (e.g. SPEC-<change-slug>.md) covering only the change, per the skill's Spec Evolution section, and confirm with the user before proceeding.
