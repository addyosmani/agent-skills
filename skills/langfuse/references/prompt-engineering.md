---
name: langfuse-prompt-engineering
description: Write or change prompts in Langfuse or code. Use whenever the user asks to create, edit, rewrite, debug, tune, or otherwise modify a prompt, including a small wording or instruction change. Distinct from prompt-migration and judge-calibration.
metadata:
  required_access: []
---

# Prompt Engineering

## Universal principles

1. **Be specific.** State the required output format, constraints, and, when order matters, numbered steps. Write for someone with minimal context.
2. **Use labeled sections** for the role, instructions, examples, and context. Use XML tags when they help distinguish rules, data, and variables.
3. **Give the model a role.** A focused system-prompt sentence can steer tone and behavior.
4. **Explain why important rules exist** so the model can apply them to adjacent cases.

## Adjusting an existing prompt

1. **Pin down the failure first.** Use concrete misbehaving outputs and name the exact failure mode: wrong format, ignored instruction, wrong tone, hallucination, or another observable error. The task and data show what could fail, not what did fail; do not write a fix before observing the failure.
2. **Trace the failure to the prompt.** Look for a missing, ambiguous, or conflicting instruction.
3. **Fix the failure class, not the example.** Generalize the observed mistake into an error class and write the instruction at that level, in your own words. Cover adjacent cases, but do not add definitions, rules, or examples for unobserved problems or encode the failing example itself. If a generalized instruction does not work, report the failure instead of narrowing the rule to that case.
4. **Preserve existing behavior.** Before changing text, identify what behavior it protects. Avoid contradicting other rules or breaking cases that already work.
5. **Make the smallest testable edit.** Change one cause per attempt so you can attribute the result. Avoid extra length, emphasis, or all-caps. In Langfuse, save each attempt as a new version or label so you can compare and roll back.

## Model-specific tuning

Identify the target model if you can — tuning differs by model, so when you know which model the prompt runs on, follow that model's own prompting guidance.

| Technique | Standard (GPT) | Reasoning (Claude latest) |
|-----------|----------------|---------------------------|
| Instruction density | High, prescriptive | Goal-level; don't micro-manage steps |
| Reasoning | Add explicit chain-of-thought | Native thinking; "think thoroughly" + tune `effort` |
| Emphasis language | Strong directives fine | Dial back `MUST`/`CRITICAL` |
| Output format | Prefilling/scaffolds | Prefill removed (4.6+); structured outputs + "no preamble" |
| Roles | `developer` > `user` > `assistant` | `system` role + `user`/`assistant` |
