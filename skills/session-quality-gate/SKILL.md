---
name: session-quality-gate
description: DEPRECATED — consolidated per maintainer feedback. Rationalization detection merged into handoff; other components pending eval-learn-loop integration.
version: 1.0.0
deprecated: true
replaced_by: handoff (rationalization detection) + eval-learn-loop (learning capture)
tags: [quality, audit, session, delivery, learning, deprecated]
---

# Session Quality Gate → Consolidated

Per [Addy Osmani's review on PR #331](https://github.com/addyosmani/agent-skills/pull/331):
three skills (handoff, eval-learn-loop, session-quality-gate) converge on
"capture what this session taught us."

## Consolidation status

| Component | Destination | Status |
|---|---|---|
| **Rationalization detection** | → handoff pre-write check | ✅ Merged |
| Self-audit (4 questions) | → eval-learn-loop or standalone | ⏳ TBD |
| Learning capture (growth-log) | → eval-learn-loop | ⏳ TBD |
| Disk check | → shipping-and-launch or project-specific | ⏳ TBD |

## What was merged

Rationalization detection — catching "I'll write it next session" and
"changes too small to audit" patterns — now lives as a pre-write sanity
check in handoff. This was the genuinely distinct piece that neither
handoff nor eval-learn-loop covered: detecting the moments you decide
NOT to capture anything.

## What was not merged (and why)

- **Self-audit**: The 4-question framework is a general-purpose quality
  check, not specific to session-end. Handoff's scope is document structure
  and artifact hygiene.
- **Learning capture**: The 5-library system is a specific implementation
  pattern. eval-learn-loop is the natural home for "what was learned."
- **Disk check**: Hardware-specific, not generally applicable.

## See Also

- [handoff SKILL.md](https://github.com/YuhaoLin2005/claude-code-skills/blob/main/engineering/handoff/skills/handoff/SKILL.md)
- [rationalization_detection.md](https://github.com/YuhaoLin2005/claude-code-skills/blob/main/engineering/handoff/skills/handoff/references/rationalization_detection.md)
