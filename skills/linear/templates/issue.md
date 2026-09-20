# Issue

The body of every issue. Fill every field the work type warrants; say when a field does not apply. An issue that delivers a PRD story fills Story, Acceptance criteria, and Success target; a chore fills only what a reader needs.

```markdown
User prompt (verbatim, when direct): "<...>"
Outcome: <what is true when done>
Story: <the PRD story this delivers, or n/a>
Acceptance criteria:
- [ ] <criterion>
Scope class: MVP | MVP blocker | later
Success target: <from the PRD, when it delivers a story>
Verification surface: <test, benchmark, command output, artifact, or source that proves it>
Constraints: <what must not regress>
Boundaries: <files, tools, data, repositories the agent may use>
Owned paths: <disjoint from every in-flight issue>
Iteration policy: <how to decide what to try next after each attempt>
Blocked stop condition: <when to stop and report that no defensible path remains>
Workflow states skipped / overrides: <state: reason, or none>
Persona: <who works it>
Blocked by: <issue ids>
Design: <HLD/LLD section, or none>
PR: <url once raised>
```
