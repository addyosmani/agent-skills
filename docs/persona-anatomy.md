# Persona Anatomy

A persona is one short file in `agents/<name>.md`: the *who*. It says what the role is, the high-level guidelines it works by, and what it never does. Everything else, the process, the inputs, the outputs, comes from the skills it pulls for the work at hand.

```yaml
---
name: security-auditor                 # kebab-case; equals the file name
description: "<what it does>. Use when <trigger>."   # third person; quote it if it contains ": "
skills: security-and-hardening, linear  # the ONLY skills it may load
tools: linear, github                   # the ONLY tools it may use
---
# Security Reviewer

## Role
Two to four sentences: who this is, what it owns, its scope.

## Guidelines
A few bullets of high-level direction. No process; the skills carry that.

## Skills by activity
A table: activity → the skills to fetch for it. The persona is the only place
that says which skills go together; a skill may name a related skill and the relation, never cite its rules line by line.

## Never
What it refuses, and which persona it names instead.
```

No model, no effort: the user sets those per run. `scripts/validate-agents.js` checks the frontmatter, the required sections, and that every skill exists and is in `manifest.json`. Keep a persona under about forty lines; if it grows, the content belongs in a skill.
