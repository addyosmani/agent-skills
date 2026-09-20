# Commits and pull requests

Loaded by every agent that commits. The rules for commits, branches, pull requests, and merge are `git-workflow-and-versioning` P1–P16; the `git-workflow-and-versioning` and `github` skills carry the mechanics. This file holds only the commit message anatomy that P3 points at.

## Commit message anatomy

Do not duplicate what the ticket already says; link it.

```
<type>(<scope>): <what changed, imperative> [<TICKET-ID>]

<why, one or two lines; link the ticket for the full reasoning>

Summary
- <tight pointers>

Deployment order       (if applicable)
Testing / verification (what you ran)
Blast radius / risk
Rollback plan

Model: <model id>
Thinking-effort: <low|medium|high|...>
Harness: <claude-code|herdr|...>
```

The anatomy bends to the work type: a bug fix leads with the cause; a chore may be summary only.
