```markdown
---
name: agent-resilience-and-fuzzing
description: Guides agents through resilience and fuzzing testing for any skill. Use when you have finished implementing a skill and want to ensure it handles edge cases, invalid inputs, and adversarial interactions gracefully.
---

# Agent Resilience and Fuzzing

## Overview
This skill ensures that any skill is production-ready by systematically testing its resilience to unexpected or adversarial inputs. Instead of assuming “it works on the happy path”, the agent follows a concrete fuzzing workflow to discover failures, ambiguous behaviors, and security-relevant edge cases.

## When to Use
- Use when you have finished implementing a new skill or significantly changed an existing one.
- Use when a skill interacts with external systems (APIs, CLIs, databases) or receives untrusted input.
- Use when a skill’s failure could lead to data loss, security issues, or poor user experience.
- Do NOT use for purely documentation-only skills that do not execute logic.

## Core Process
1. **Identify the skill under test**: Locate the target skill directory under `skills/` and read its `SKILL.md`.
2. **Extract the input schema**: Identify the inputs the skill accepts (CLI args, paths, JSON payloads). Document expected types and constraints.
3. **Define fuzzing dimensions**: For each input, define fuzzing categories: Type mismatches, Boundary values, Invalid formats, Adversarial payloads.
4. **Generate concrete fuzz cases**: Write 2–5 examples per dimension in a `fuzz-cases.md` file inside the skill directory.
5. **Run the skill with each fuzz case**: Execute the skill in a safe environment. Capture exit status, errors, and side effects. Use the helper script `scripts/fuzz-skill.sh`.
6. **Classify outcomes**: Graceful failure, Ambiguous behavior, Unsafe failure, or Unexpected success.
7. **Fix and document**: Update the skill’s logic for unsafe/ambiguous outcomes. Add an `Edge Cases` section to its `SKILL.md`.
8. **Resilience summary**: Create a `RESILIENCE.md` in the skill directory summarizing tested dimensions and known limitations.
9. **Update Verification section**: Add resilience checks to the target skill’s Verification checklist.

## Fuzzing with `scripts/fuzz-skill.sh`
This skill ships a helper script to run simple fuzz tests for skills that accept command-line arguments.

Example usage:

```bash
./skills/agent-resilience-and-fuzzing/scripts/fuzz-skill.sh \
  --skill skills/<skill-name>/SKILL.md \
  --arg "limit" --type number \
  --fuzz-type "boundary,mismatch,overflow"
```

## Common Rationalizations
| Rationalization | Reality |
| --- | --- |
| “The happy path is enough; edge cases are rare.” | Production systems often fail under rare or adversarial inputs; resilience is a feature. |
| “If the input is invalid, it’s the caller’s fault.” | Robust skills fail safely and clearly, regardless of who is at fault. |
| “Adding resilience checks will bloat the skill.” | A few explicit checks are cheaper than debugging outages or security incidents. |

## Red Flags
- The skill crashes, hangs, or produces unclear errors on any fuzz case.
- The skill silently accepts invalid input and proceeds as if it were valid.
- The skill leaks internal details (stack traces, full file paths) in error messages.
- The skill performs destructive actions on invalid inputs without confirmation.

## Verification
After completing this skill for a target skill, confirm:
- [ ] A `fuzz-cases.md` file exists in the target skill directory.
- [ ] All fuzz cases have been executed and their outcomes recorded.
- [ ] No unsafe or ambiguous failures remain; each is handled gracefully or documented as a known limitation.
- [ ] A `RESILIENCE.md` file exists and summarizes the tested dimensions and known limitations.
- [ ] The target skill’s `SKILL.md` Verification section includes resilience exit criteria.
```
