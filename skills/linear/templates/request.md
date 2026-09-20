# Request

The intake issue: what the user asked for, in the user's words, before anyone has decided whether it is a project or an issue. It lands in `Triage`. Fill what is known; leave the rest for triage. When classified, it becomes the planning issue of a new project (large) or is rewritten with `issue.md` and moved to `Todo` (small); it is never deleted.

```markdown
Kind: feature | product change | tech improvement | chore | question
Requested by: <user or persona> on <date>
User prompt (verbatim): "<...>"
Goal: <what should be true afterwards, in one sentence>
Why now: <the trigger: a user need, an incident, a deadline, a cost, or "none stated">
Affects: <services, screens, or docs, if known>
Size (triage): small (an issue) | large (a project) | unknown
Scope class (triage): MVP | MVP blocker | later
Persona (triage): <who takes it first>
Becomes: <project id or issue id, once classified>
```

Kinds:

- **feature**: new user-visible capability. Large ones become a project with a PRD (`Spec`); small ones an issue.
- **product change**: a change to what the product does or for whom; always through the PM and the project PRD.
- **tech improvement**: refactor, upgrade, performance, observability, or convention conformance with no user-visible change; states the measurable outcome and the risk.
- **chore**: housekeeping with no design: a dependency bump, a config change, a doc move; goes straight to `Todo`.
- **question**: needs an answer, not work; closed with the answer as a comment, or converted.
