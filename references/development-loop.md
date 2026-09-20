# Development loop

How a development agent moves from a request to a deployed change. Loaded by the engineers and the product manager.

## The loop

The loop is the Linear workflow (`linear` § Workflow): one ordered set of states from the user's request to production, on the issue itself, so the ticket always shows where the work is. It is the default, not the law. Not every issue needs every state: a bug skips spec and design, a small issue starts at `Todo`, the user may short-circuit ("write code and deploy"). Every skipped state is recorded on the issue with the reason, never only in chat.

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
