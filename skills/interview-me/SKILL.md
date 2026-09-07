---
name: interview-me
description: Clarify fuzzy requirements through focused questions. Use when the user asks to interview or grill them, requests one question at a time, or material ambiguity about the desired feature, audience, or success criteria would change the work. Reuse prior decisions and delegated judgment.
---

# Interview Me

## Overview

Resolve uncertainty that could cause the wrong outcome. The deliverable is a shared understanding of the goal, audience, success criteria, constraints, and meaningful scope boundaries—not a fixed number of questions.

## When to Use

Use when the user explicitly requests an interview or a material goal or tradeoff remains unresolved after inspection. Skip already-approved plans and clear requests.

## Start from available context

Read the request, earlier answers, relevant project context, and existing plans first. Do not ask the user to locate facts you can discover. If the desired outcome is already clear, continue the requested work without interviewing.

When an important ambiguity remains, briefly state your best interpretation and what is unresolved. Do not invent numerical confidence scores or suggest that the user does not understand their own intent.

## Focus the dialogue

Ask one focused question when the next question depends on its answer. Independent questions may be bundled when that reduces effort. Use the available question tool where suitable; otherwise ask plainly. Offer a recommendation or hypothesis when it helps the user choose, and remain open to correction rather than steering toward a predetermined answer.

Probe vague terms such as “faster” or “scalable” only when their meaning changes the solution. Ask what observable result matters and what constraint binds. Avoid repeated audience or “why now” questions when those details do not affect the task.

Pause work that depends on the answer. Continue useful, authorized investigation or implementation that does not. In a non-interactive run, use supported assumptions for routine choices and report genuinely blocking decisions without inventing approval.

## Recognize resolution

Restate the resolved intent briefly when that helps prevent a misunderstanding. Include outcome, success criteria, and exclusions only to the extent they matter.

- Accept “sounds good,” “sure, let's go,” and equivalent confirmation in context.
- Treat “whatever you think is best” as delegated judgment within the task. Choose a reasonable option, explain a consequential choice, and continue.
- Do not treat silence as approval for an action requiring authorization.
- Honor explicit requests for an interview or a review gate, but do not demand a particular confirmation phrase or re-confirm settled decisions.
- Stop asking when remaining choices can reasonably be resolved within scope. If several rounds are not resolving a foundational issue, name it and ask one targeted question rather than repeating the interview.

## Handoff and persistence

Use the resulting understanding directly in the requested plan or implementation. Do not start a second requirements interview in a downstream skill. If saving an intent document was requested or required by the project, use its convention; otherwise keep the result in conversation. For a requested file without a project convention, use `docs/intent/[topic].md`.

## Verification

The outcome and material constraints are clear, prior answers were respected, and any remaining blocker is specific. The user has not been asked to approve work already authorized. The next action follows the user's current intent.

## Common Rationalizations

“They delegated judgment, so I must ask again” — use that delegation within scope; reserve questions for material unresolved choices.

## Red Flags

Repeated confirmation of settled decisions; questions about discoverable facts; assumed permission from silence.
