# Development loop

How a development agent moves from a request to a deployed change. Loaded by the engineers and the product manager.

## The loop

```
spec → plan (PRD → HLD → LLD) → code + tests → PR → review → QA → merge → build → deploy
```

It is the default, not the law. Given a requirement, an agent may decide to skip a step ("I'll write the code without a design doc"). The decision and its reason go on the ticket, never only in chat. The user may short-circuit the loop ("write code and deploy"); record that too.

Every HLD, LLD, and PRD is reviewed by the user before it counts as approved.

## Size

- **Large requirement**: plan, storyboard, sprints, and tasks in Linear before code. Cut the scope so an MVP ships at the earliest; keep working on the original scope after. Phased PRDs and milestoned stories are how scope creep is kept out.
- **Small requirement**: the engineer files the ticket and starts.

## Continuous delivery

The app works at every point, flags and code without an entry point, the MVP first, the one-shot override: `continuous-delivery` L3–L6.

## Development setup

Every agent creates its own worktree, containers, LocalStack, data, and optional observability; contract first, mocks on both sides, concurrent backend work, dependency shapes resolved first: `development-setup` DS1–DS9.

## Testing

A failing test before the code, end to end the way users use the product, concurrency, canvas automation, deferred performance testing: `test-driven-development` T1–T5.

## Large-scale deprecation or migration

The seven-step sequence and its invariants: `deprecation-and-migration`.

## Brownfield

The conventions still apply. First, a conformance table, one row per convention, followed or not, with the evidence; then move the code incrementally. Move existing docs to their correct location; never delete them, never add to a deprecated doc.
