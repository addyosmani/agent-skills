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

Save the spec as SPEC.md in the project root and confirm with the user before proceeding.

## Version Management

When evolving specifications from V1 to V2:

1. **Version Labeling**: Clearly mark specifications with version identifiers (V1, V2) in the document title and filename
2. **Separation**: Maintain distinct specification documents for each major version to avoid feature pollution
3. **Migration Planning**: Document technology migrations (e.g., SQLite to PostgreSQL) and architectural changes in a separate V2 backlog
4. **Incremental Development**: Add new features incrementally with clear version tracking rather than mixing versions
