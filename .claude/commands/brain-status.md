---
description: Show this session's agent and every subagent with persona, skills, tools, model, harness, thinking effort, and ticket
---

Print the current state of this session's agents, yourself first, then every subagent you spawned, one block each:

```
Agent: session | subagent <id>
Persona: <name>
Skills: <loaded, in load order>
Tools: <in use>
Model: <model>
Harness: <harness>
Effort: <thinking effort>
Ticket: <id or ->
Type: - | fire-and-forget | fire-and-summarize
State: working | done | blocked
```

Report only what you know. A subagent that has not declared is `UNKNOWN` in every field you did not set yourself; ask it to declare rather than guessing. Do nothing else.
