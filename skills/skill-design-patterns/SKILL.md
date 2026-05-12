---
name: skill-design-patterns
description: Guides the design and review of agent skills. Use when creating a new skill, improving an existing skill, reviewing a skill for quality, or establishing skill-writing conventions for a project. Use when you need to ensure a skill follows the standard anatomy with anti-rationalization tables, red flags, and verification checklists.
---

# Skill Design Patterns

## Overview

Design and review agent skills using battle-tested patterns that prevent the most common failure mode: the agent knows what to do but finds rationalizations not to do it. This skill encodes the anatomy, quality gates, and anti-rationalization patterns that the skills in this repository follow.

This is the design companion to `using-agent-skills`. Where `using-agent-skills` helps agents discover and invoke skills, this skill helps you create and improve them.

## When to Use

- Creating a new skill from scratch
- Reviewing an existing skill for completeness and quality
- Establishing skill-writing conventions for a team
- Auditing a skill suite for gaps (missing sections, weak verification, absent anti-rationalization)
- Onboarding contributors who want to add skills to this repository

**When NOT to use:**

- Finding which skill applies to a task — use `using-agent-skills`
- Writing a one-off script or simple prompt — a skill is overkill for single commands
- Writing purely conversational guidance with no repeatable workflow — a skill should encode a process, not advice
- Making minor typo fixes to an existing skill — a full design review isn't needed for copy edits

## The Standard Skill Anatomy

Every well-designed skill follows this structure. Skills that omit sections degrade over time as the agent finds rationalizations to skip steps.

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Third-person what + when.    │  │
│  │              Max 1024 characters.         │  │
│  └───────────────────────────────────────────┘  │
│  Overview         → Elevator pitch (1-2 lines)  │
│  When to Use      → Triggers AND exclusions     │
│  [Core Process]   → Step-by-step workflow       │
│  [Techniques]     → Detailed guidance sections  │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Observable violation signs  │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

### Frontmatter (Required)

```yaml
---
name: skill-name-with-hyphens
description: Starts with third-person description of what the skill does.
  Then includes one or more "Use when..." trigger conditions.
---
```

**Rules:**
- `name`: Lowercase, hyphen-separated. Must match the directory name exactly.
- `description`: Describe what the skill does in third person, then add "Use when..." conditions. Include both *what* and *when*. Maximum 1024 characters.
- Never summarize the workflow in the description — if the agent reads process steps there, it may follow the summary instead of reading the full skill.

### Overview

One to two sentences. Answer: what does this skill do, and why should an agent follow it? This is the elevator pitch.

### When to Use

Two parts: positive triggers (bullet list of conditions) AND negative exclusions ("When NOT to use"). The negative exclusions are critical — they prevent the agent from applying the skill where it doesn't belong. Each exclusion should point to the correct alternative when possible.

### Core Process

The heart of the skill. A step-by-step workflow with numbered steps, checkpoints, and exit criteria. Use ASCII flowcharts at decision points. Every step must be specific and actionable:

```
Good: "Run `npm test -- --grep 'test name'` and verify all tests pass"
Bad:  "Make sure the tests work"
```

### Anti-Rationalization Table

The most distinctive feature. A table of excuses agents use to skip steps, paired with factual rebuttals.

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll add tests later" | Later never comes. Tests written under time pressure are worse than tests written in flow. |
```

**How to write good rationalizations:**

1. Think of every time you've seen an agent say "I'll do X later" or "This is simple enough to skip Y"
2. Each row targets a shortcut specific to this skill's most error-prone steps
3. The rebuttal must cite concrete technical consequences (e.g., "this causes a runtime ClassNotFoundException"), not vague warnings
4. 3–7 rows. More than 7 suggests the skill has too many steps that invite shortcuts

### Red Flags

Observable warning signs that the skill is being violated. Use the lead-in: "The following signals indicate this skill was not applied correctly:"

Every signal must be verifiable (e.g., "PR merged without any review comments"), not subjective (e.g., "code quality seems low"). Design these so a reviewer can scan for them in under a minute. 3–7 entries.

### Verification

A two-part checklist of exit criteria. Every item must be verifiable with evidence (test output, build result, screenshot, file contents). "Seems right" is never sufficient.

```markdown
## Verification

After completing the skill's process:

- [ ] All tests pass (`npm test` exits 0)
- [ ] Build succeeds with no new warnings
- [ ] The verification story is documented (what changed, how it was verified)
```

## The Skill Creation Workflow

Follow these steps when creating a new skill or doing a full review of an existing one.

### Step 1: Determine if a Skill Is Needed

Not everything needs to be a skill. Before creating one, check:

```
Is the workflow repeatable across sessions?
├── NO → Write a script or a one-off prompt instead
└── YES
    ├── Does it need structured steps with quality gates?
    │   ├── NO → A simple prompt or AGENTS.md rule is enough
    │   └── YES → Proceed to Step 2
    └── Does the agent need anti-rationalization guardrails?
        ├── NO → Consider a lighter-weight instruction
        └── YES → A skill is the right choice
```

A skill is justified when the task involves multiple steps, requires quality gates, and the agent has known failure modes (skipping verification, taking shortcuts, making wrong assumptions).

### Step 2: Define Scope and Boundaries

Before writing the skill body, nail down:

1. **What triggers it?** Write the description field first — it's how the agent discovers the skill. Include both the domain (what it does) and the triggers (when to use it).
2. **What does it NOT cover?** Define the negative space. What adjacent tasks should use different skills? This goes in "When NOT to use."
3. **What's the output?** What files, reports, or state changes does the skill produce?
4. **What are the prerequisites?** What must exist before this skill can run?

### Step 3: Write the Core Process

Map the workflow as numbered steps. For each step:

- State the action clearly and specifically
- Include the exact commands to run (not "run the tests" — "Run `npm test`")
- Add checkpoints: "Verify the output before proceeding"
- Add decision points with ASCII flowcharts if there are branches
- Keep the total under 500 lines; split detailed reference material to `references/`

```
Example checkpoint pattern:

### Step 3: Generate the output

Run the generation command:
    command-to-run --input X --output Y

VERIFY BEFORE PROCEEDING:
→ Does the output file exist at the expected path?
→ Is the file non-empty?
→ Does it pass the format validator?

If any check fails, fix the issue before moving to Step 4.
```

### Step 4: Add the Three Quality Gates

Every skill needs three sections that form its quality backbone:

**Common Rationalizations.** List every excuse the agent might use to skip steps in this workflow. For each excuse, write the rebuttal. Be specific about the consequences of the shortcut.

**Red Flags.** List observable signs that the skill wasn't followed. These should be things a reviewer can check in under a minute without understanding the full domain.

**Verification.** Write the evidence checklist. What must be true for this skill to be considered complete? Every item must reference concrete, checkable output.

### Step 5: Review Against the Quality Bar

Before finalizing, check the skill against these criteria:

```
SPECIFIC:  Are the steps actionable commands, not vague advice?       [ ]
VERIFIABLE: Does the verification section require concrete evidence?  [ ]
BATTLE-TESTED: Is this based on real workflows, not theory?          [ ]
MINIMAL:    Is every section pulling its weight?                     [ ]
```

**Remove anything that doesn't earn its place.** If removing a section wouldn't change the agent's behavior, remove it.

### Step 6: Cross-Reference and Integrate

- Reference existing skills where relevant using backtick-wrapped names: `code-review-and-quality`
- Don't duplicate content that exists in other skills — reference them instead
- If this skill belongs in the lifecycle (DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP), note which phase
- Check `using-agent-skills` to see if the discovery flowchart needs updating

## Writing Principles

These apply to every skill in the repository.

### Process Over Knowledge

Skills are workflows agents follow, not reference docs they read. Every section should drive action. If a section is purely informational, consider whether it belongs in a reference file instead.

### Specific Over General

```
Good: "Run `npm test -- --grep 'test name'`"
Bad:  "Make sure the tests work"
```

The agent should never have to guess what command to run or what output to check.

### Evidence Over Assumption

Every verification checkbox requires proof. "Seems right" is explicitly forbidden. If a verification item can't be checked objectively, it's not a verification.

### Token-Conscious

Every section must justify its inclusion in the context window. Supporting material over 100 lines should move to `references/`. Patterns and principles under 50 lines should stay inline.

### Follow Project Conventions

Before writing, study how existing skills handle similar patterns. Match the project's style for section naming, code block formatting, table structure, and cross-references.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This skill is simple, it doesn't need anti-rationalization" | Every skill has failure modes. If you can't think of rationalizations, you haven't thought hard enough about how the agent might shortcut the workflow. |
| "I'll add the red flags and verification later" | These sections are the quality backbone. A skill without them is a suggestion, not a workflow. Add them before the skill is used. |
| "The description can summarize the process" | If the description summarizes the process, the agent may follow the summary instead of reading the full skill. The description should advertise, not substitute. |
| "500 lines is too short for this domain" | If the workflow exceeds 500 lines, the domain is too broad. Split into multiple skills or move reference material to `references/`. |
| "The existing skills are fine, no need to review" | Skills degrade as the codebase evolves. A review against the quality bar catches sections that became stale or were never complete. |
| "I'll just model it after an existing skill and skip the checklist" | Every skill has unique failure modes. Copying structure without reasoning about this skill's specific rationalizations produces generic, ineffective guardrails. |
| "Writing anti-rationalizations feels redundant" | They feel redundant until the agent finds a plausible-sounding excuse to skip a critical step. The anti-rationalization table is pre-negotiation — it settles the argument before it starts. |

## Red Flags

The following signals indicate a skill design issue:

- Skill has no "When NOT to use" section (or it's empty)
- Skill is missing the Common Rationalizations table
- Verification items use phrases like "looks correct" or "seems right"
- Skill description in frontmatter summarizes the workflow steps
- SKILL.md exceeds 500 lines without splitting to `references/`
- Content is duplicated across multiple skills instead of cross-referenced
- Red flags describe subjective impressions rather than observable signals
- The skill reads like a reference document rather than a workflow to follow
- Supporting files exist for content under 50 lines (should be inline)
- Cross-skill references use markdown links instead of backtick-wrapped skill names

## Verification

After creating or reviewing a skill:

- [ ] Frontmatter `name` matches the directory name (lowercase, hyphen-separated)
- [ ] Frontmatter `description` includes both what the skill does AND when to use it
- [ ] "When to Use" section includes both positive triggers and negative exclusions
- [ ] Core process has numbered, actionable steps with specific commands (not vague advice)
- [ ] Common Rationalizations table has 3–7 rows with concrete rebuttals
- [ ] Red Flags section has 3–7 observable, verifiable signals
- [ ] Verification section has checkbox items requiring concrete evidence
- [ ] SKILL.md body is under 500 lines (reference material split to `references/` if needed)
- [ ] No content duplicated from other skills or `AGENTS.md` (cross-reference instead)
- [ ] The skill passes the quality bar: Specific, Verifiable, Battle-tested, Minimal
- [ ] Supporting files declare their load conditions at the top (`> 💡 Load on demand: only when...`)
- [ ] Cross-skill references use backtick-wrapped skill names
