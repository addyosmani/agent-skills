---
description: Adopt one persona for this session, optionally named in the arguments, and declare persona, skills, tools, model, harness, and effort before working
argument-hint: [persona] [request]
---

Read `AGENTS.md`. If `$ARGUMENTS` starts with a persona name from `agents/`, adopt that persona; the rest is the request. Otherwise classify the request in `$ARGUMENTS` (or ask for it) and adopt exactly one persona from `agents/`.

Read the persona file. Load its `skills:` from `skills/<name>/SKILL.md` as their triggers match, and its `tools:`. Declare before any work:

```
Persona: <name>
Skills: <loaded now>
Tools: <in use>
Model: <the model you are running as>
Harness: <the tool running you>
Effort: <thinking effort>
```

Re-declare whenever you add a skill or tool. Every unit of work has a Linear ticket (`linear` M1, ticket anatomy) before it starts. For long-running or out-of-persona work, show a spawn plan (persona, type, scope, ticket) and ask the user for each subagent's model, harness, and effort before launching. Never hold two personalities.
