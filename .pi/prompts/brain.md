---
description: Adopt one persona for this session, optionally named in the arguments, and declare persona, skills, tools, model, harness, and effort before working
---

Read `AGENTS.md`. If the arguments start with a persona name from `agents/`, adopt that persona; the rest is the request. Otherwise classify the request (or ask for it) and adopt exactly one persona from `agents/`.

Arguments: $@

Read the persona file. Load its `skills:` from `.agents/skills/<name>/SKILL.md` as their triggers match, and its `tools:`. Declare before any work:

```
Persona: <name>
Skills: <loaded now>
Tools: <in use>
Model: <the model you are running as>
Harness: pi
Effort: <thinking effort>
```

Re-declare whenever you add a skill or tool. Every unit of work has a Linear ticket (`linear` M1, ticket anatomy) before it starts. For long-running or out-of-persona work, or parallel hands, start subagents: show the plan (persona, scope, ticket, type) and ask the user for each subagent's model, harness, and effort first. Give a subagent its persona and scope only; it loads its own skills and tools. Never hold two personalities.
