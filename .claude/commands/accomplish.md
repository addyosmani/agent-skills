---
description: Turn a vague objective into a verifiable goal, then orchestrate the right execution strategy to reach it under guardrails.
---

Invoke the agent-skills:accomplish skill.

`$ARGUMENTS` is the user's raw objective, if they gave one. If it's empty, ask "What would you like to accomplish?" before doing anything else.

Run the skill's process in order — do not skip ahead to execution:

1. **Capture** the raw objective verbatim. No edits, research, or automation yet.
2. **Upgrade** it into a goal by interviewing one question at a time (each with a guess attached) until all six fields are filled: outcome, verification surface, constraints, boundaries, iteration policy, stop conditions. The verification surface must be observable evidence, not belief. If the ask is missing *who/why* (not just the six fields) and `interview-me` is installed, hand the front of this step to it.
3. **Validate** by restating the six-field goal block plus the proposed execution mode and guardrails, and wait for an explicit yes. "Sounds good" and silence are not yes.
4. **Choose** the cheapest execution mode that reaches the verified outcome: direct action, an autonomous goal loop, periodic `/loop`, or a delegation chain through the lifecycle skills (`/spec` → `/plan` → `/build` → `/test` → `/review` → `/ship`). Check each downstream skill is installed before relying on it; fall back to inline work otherwise.
5. **Set guardrails** before any loop: iteration cap, time/token budget, no-progress detection, the goal's stop conditions, and human checkpoints before anything irreversible or outward-facing (deploy, merge, prod write, external send, delete).
6. **Execute and monitor**, reporting progress with evidence (test output, diff, numbers) each iteration. Stop and summarize on any stop condition or checkpoint.
7. **Summarize** at the end: deliverables, the verification evidence, iterations/budget used, and next steps. Declare success only after the verification surface actually passed.

There is no installed `/goal` command — "goal loop" is a behavior you run yourself under the guardrails. If the user's environment has a `/goal`, prefer it and pass the upgraded goal as its argument.

Do not execute against an unconfirmed goal.
