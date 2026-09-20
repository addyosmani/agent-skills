---
name: deprecation-and-migration
description: "The mandatory procedure for large-scale deprecation, rewrites, or migrations — build the new flow in parallel, freeze and mark the old flow deprecated, test, switch, delete the old flow, then migrate data; never edit the old flow in place, keep it working until the switch, and record any human override. Use when you replace an existing feature, service, schema, or flow; rename or restructure something in use; or the user says \"migrate\", \"deprecate\", \"rewrite\", \"replace the old X\", or \"v2\". Use when removing old systems, APIs, or features, migrating users from one implementation to another, migrating a database schema in production, such as renaming or dropping a column without downtime (expand/contract), or deciding whether to maintain or sunset existing code."
category: coding
---

# Deprecation and Migration

## Overview

This is the only sanctioned way to replace a flow that is in use.

Code is a liability, not an asset. Every line of code has ongoing maintenance cost — bugs to fix, dependencies to update, security patches to apply, and new engineers to onboard. Deprecation is the discipline of removing code that no longer earns its keep, and migration is the process of moving users safely from the old to the new. Most engineering organizations are good at building things. Few are good at removing them. This skill addresses that gap.

## When to Use

- You replace an existing feature, service, schema, or flow; rename or restructure something in use
- The user says "migrate", "deprecate", "rewrite", "replace the old X", or "v2"
- Replacing an old system, API, or library with a new one
- Sunsetting a feature that's no longer needed
- Consolidating duplicate implementations
- Removing dead code that nobody owns but everybody depends on
- Planning the lifecycle of a new system (deprecation planning starts at design time)
- Deciding whether to maintain a legacy system or invest in migration

## Core Principles

### Code Is a Liability

Every line of code has ongoing cost: it needs tests, documentation, security patches, dependency updates, and mental overhead for anyone working nearby. The value of code is the functionality it provides, not the code itself. When the same functionality can be provided with less code, less complexity, or better abstractions — the old code should go.

### Hyrum's Law Makes Removal Hard

With enough users, every observable behavior becomes depended on — including bugs, timing quirks, and undocumented side effects. This is why deprecation requires active migration, not just announcement. Users can't "just switch" when they depend on behaviors the replacement doesn't replicate.

### Deprecation Planning Starts at Design Time

When building something new, ask: "How would we remove this in 3 years?" Systems designed with clean interfaces, feature flags, and minimal surface area are easier to deprecate than systems that leak implementation details everywhere.

## The Deprecation Decision

Before deprecating anything, answer these questions:

```
1. Does this system still provide unique value?
   → If yes, maintain it. If no, proceed.

2. How many users/consumers depend on it?
   → Quantify the migration scope.

3. Does a replacement exist?
   → If no, build the replacement first. Don't deprecate without an alternative.

4. What's the migration cost for each consumer?
   → If trivially automated, do it. If manual and high-effort, weigh against maintenance cost.

5. What's the ongoing maintenance cost of NOT deprecating?
   → Security risk, engineer time, opportunity cost of complexity.
```

## The sequence

| Step | Rule |
| --- | --- |
| 1 | **Create the new flow in parallel** (new parallel features). |
| 2 | **Mark the old code and flow as deprecated.** |
| 3 | **Don't allow adding anything new to the old flow** — it is frozen. |
| 4 | **Test the new flow.** |
| 5 | **Switch to the new flow.** |
| 6 | **Delete the old flow.** |
| 7 | **Migrate old data.** |

### Step 1: Create the new flow in parallel

Don't deprecate without a working alternative. The replacement must:

- Cover all critical use cases of the old system
- Have documentation and migration guides
- Be proven in production (not just "theoretically better")

For a schema, the parallel flow is the additive **expand** phase: add the new column, table, or index alongside the old one (see Database Schema Migrations below).

### Step 2: Mark the old code and flow as deprecated

```markdown
## Deprecation Notice: OldService

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewService (see migration guide below)
**Removal:** step 6 of the sequence, after the switch
**Reason:** OldService requires manual scaling and lacks observability.
            NewService handles both automatically.

### Migration Guide
1. Replace `import { client } from 'old-service'` with `import { client } from 'new-service'`
2. Update configuration (see examples below)
3. Run the migration verification script: `npx migrate-check`
```

### Step 3: The old flow is frozen

Nothing new lands in the old flow. Invest in the replacement instead.

### Step 4: Test the new flow

Verify behavior matches (tests, integration checks) before any consumer is switched.

### Step 5: Switch to the new flow

Migrate consumers one at a time, not all at once. For each consumer:

```
1. Identify all touchpoints with the deprecated system
2. Update to use the replacement
3. Verify behavior matches (tests, integration checks)
4. Remove references to the old system
5. Confirm no regressions
```

**The Churn Rule:** If you own the infrastructure being deprecated, you are responsible for migrating your users — or providing backward-compatible updates that require no migration. Don't announce deprecation and leave users to figure it out.

#### Strangler Pattern

Run old and new systems in parallel. Route traffic incrementally from old to new. When the old system handles 0% of traffic, remove it.

```
Phase 1: New system handles 0%, old handles 100%
Phase 2: New system handles 10% (canary)
Phase 3: New system handles 50%
Phase 4: New system handles 100%, old system idle
Phase 5: Remove old system
```

#### Adapter Pattern

Create an adapter that translates calls from the old interface to the new implementation. Consumers keep using the old interface while you migrate the backend.

```typescript
// Adapter: old interface, new implementation
class LegacyTaskService implements OldTaskAPI {
  constructor(private newService: NewTaskService) {}

  // Old method signature, delegates to new implementation
  getTask(id: number): OldTask {
    const task = this.newService.findById(String(id));
    return this.toOldFormat(task);
  }
}
```

#### Feature Flag Migration

Use feature flags to switch consumers from old to new system one at a time:

```typescript
function getTaskService(userId: string): TaskService {
  if (featureFlags.isEnabled('new-task-service', { userId })) {
    return new NewTaskService();
  }
  return new LegacyTaskService();
}
```

### Step 6: Delete the old flow

Only after all consumers have migrated:

```
1. Verify zero active usage (metrics, logs, dependency analysis)
2. Remove the code
3. Remove associated tests, documentation, and configuration
4. Remove the deprecation notices
5. Celebrate — removing code is an achievement
```

### Step 7: Migrate old data

For a schema, this is the **backfill** and **contract** phases: copy the data across in batches, then drop the old shape in its own later deploy (see Database Schema Migrations below).

## Invariants throughout

| Rule |
| --- |
| **Don't edit the old flow in place.** |
| **The old flow is kept working as you make new changes**, until the switch. |
| **A human can override the above migration plan** — only on an explicit user instruction, recorded in `docs/LEARNINGS.md` and noted on the ticket. |

## How this fits the other rules

- The new flow ships behind a feature flag or without an entry point until step 5 (`continuous-delivery` L4).
- Schema changes stay backward compatible for one release with rollback (`database` D4); where slicing is impossible, say so on the ticket (`continuous-delivery` L6).
- Touching existing code stays backward compatible (`coding-standards` C13); the freeze in step 3 is what makes that cheap.
- Each step is its own small, working commit and PR (`git-workflow-and-versioning` P1, P11).

## Database Schema Migrations (Expand/Contract)

A schema change is the riskiest migration because the data is the one thing you cannot roll back by reverting a deploy. The failure mode is coupling the schema change to the code change: rename a column in the same release that starts using the new name, and during the rollout window — when old and new code run at once — one of them is querying a column that doesn't exist. The fix is to **never change a column in place**. Migrate in additive phases so old and new code are both valid at every step. Expand is step 1 of the sequence; backfill and contract are step 7.

```
EXPAND ──────────────→ MIGRATE ──────────────→ CONTRACT
add the new column,    backfill existing rows,  once no code reads the
nullable, alongside    dual-write old+new from  old column, drop it in
the old one            the app                  a later, separate deploy
```

**Worked example — renaming `name` to `full_name`:**

1. **Expand.** Add `full_name` as nullable. Deploy. (Old code ignores it; nothing breaks.)
2. **Dual-write.** App writes both `name` and `full_name` on every insert/update. Deploy.
3. **Backfill.** Copy `name → full_name` for existing rows, in batches, so you don't lock the table.
4. **Switch reads.** Point the app at `full_name`, keep writing both. Deploy and bake.
5. **Contract.** Stop writing `name`, then — in a *separate, later* deploy — drop the column.

Each step is independently deployable and reversible: if step 4 misbehaves, roll the code back and `full_name` is still being populated. Treat each phase as a thin vertical slice — see the `incremental-implementation` skill.

**Rules:**
- **Additive first, destructive last and alone.** Adds (new nullable column, new table, new index) are safe in any deploy; drops and renames get their own deploy *after* no code references the old shape.
- **Every migration has a tested down path.** A migration you can't reverse is a deploy you can't roll back. Write and run the `down` before merging.
- **Backfill in batches, off the hot path.** A single `UPDATE` over millions of rows locks the table; chunk it and throttle.
- **Build large indexes without blocking writes** (e.g. Postgres `CREATE INDEX CONCURRENTLY`).
- **Decouple from code by feature flag** when the cutover is risky, exactly as in the Feature Flag Migration pattern above.

## Zombie Code

Zombie code is code that nobody owns but everybody depends on. It's not actively maintained, has no clear owner, and accumulates security vulnerabilities and compatibility issues. Signs:

- No commits in 6+ months but active consumers exist
- No assigned maintainer or team
- Failing tests that nobody fixes
- Dependencies with known vulnerabilities that nobody updates
- Documentation that references systems that no longer exist

**Response:** Either assign an owner and maintain it properly, or deprecate it with a concrete migration plan. Zombie code cannot stay in limbo — it either gets investment or removal.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's faster to edit the old flow into the new one" | Don't edit the old flow in place. Create the new flow in parallel (step 1). |
| "One more feature in the old flow won't hurt" | The old flow is frozen (step 3); nothing new lands in it. |
| "Delete the old flow now, we'll switch once the new one is done" | The old flow is kept working until the switch (step 5); deletion is step 6. |
| "The new flow works, no need to test before switching" | Test the new flow (step 4) before the switch (step 5). |
| "We'll skip the sequence, it's a small rewrite" | This is the only sanctioned way to replace a flow that is in use; only an explicit user instruction, recorded in `docs/LEARNINGS.md` and noted on the ticket, overrides it. |
| "It still works, why remove it?" | Working code that nobody maintains accumulates security debt and complexity. Maintenance cost grows silently. |
| "Someone might need it later" | If it's needed later, it can be rebuilt. Keeping unused code "just in case" costs more than rebuilding. |
| "The migration is too expensive" | Compare migration cost to ongoing maintenance cost over 2-3 years. Migration is usually cheaper long-term. |
| "We'll deprecate it after we finish the new system" | Deprecation planning starts at design time. By the time the new system is done, you'll have new priorities. Plan now. |
| "Users will migrate on their own" | They won't. Provide tooling, documentation, and incentives — or do the migration yourself (the Churn Rule). |
| "We can maintain both systems indefinitely" | Two systems doing the same thing is double the maintenance, testing, documentation, and onboarding cost. |
| "Just rename the column, it's one line" | During the rollout, old and new code run together — one will query a column that no longer exists. Expand/contract, never rename in place. |
| "I'll add the column and drop the old one in the same migration" | That couples a safe add to a destructive drop. Drops get their own deploy, after no code references the old shape. |
| "We'll write the rollback if we need it" | A migration with no down path is a deploy you can't reverse. Write and run the `down` before merging. |

## Red Flags

- The old flow edited in place instead of a new flow built in parallel
- The old flow broken before the switch
- New features added to a deprecated system (invest in the replacement instead)
- The switch made before the new flow is tested
- The old flow deleted before the switch, or data migrated before the old flow is deleted
- The sequence skipped or reordered with no recorded user instruction
- Deprecated systems with no replacement available
- Deprecation announcements with no migration tooling or documentation
- "Soft" deprecation that's been advisory for years with no progress
- Zombie code with no owner and active consumers
- Deprecation without measuring current usage
- Removing code without verifying zero active consumers
- A schema change and the code that depends on it shipped in the same deploy
- A column renamed or dropped in place rather than via expand/contract
- A migration merged with no tested down path, or a backfill that locks the table

## Verification

After completing a deprecation:

- [ ] The new flow was created in parallel; the old flow was never edited in place
- [ ] The old code and flow were marked deprecated and frozen; nothing new landed in the old flow
- [ ] The new flow was tested before the switch; the old flow kept working until the switch
- [ ] The old flow was deleted after the switch, then old data migrated
- [ ] Any deviation from the sequence has an explicit user instruction recorded in `docs/LEARNINGS.md` and noted on the ticket
- [ ] Replacement is production-proven and covers all critical use cases
- [ ] Migration guide exists with concrete steps and examples
- [ ] All active consumers have been migrated (verified by metrics/logs)
- [ ] Old code, tests, documentation, and configuration are fully removed
- [ ] No references to the deprecated system remain in the codebase
- [ ] Deprecation notices are removed (they served their purpose)

After a database schema migration:

- [ ] The change ships in additive phases (expand → backfill → contract), not a single in-place edit
- [ ] Old and new code are both valid against the schema at every deploy step
- [ ] Each migration has a tested down path; backfills run in throttled batches
- [ ] Destructive steps (drop/rename) ship in their own deploy after no code references the old shape
