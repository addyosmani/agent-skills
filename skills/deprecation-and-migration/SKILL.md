---
name: deprecation-and-migration
description: Manages deprecation and migration. Use when removing old systems, APIs, or features. Use when migrating users from one implementation to another. Use when deciding whether to maintain or sunset existing code.
---

# Deprecation and Migration

## Overview

Code is a liability, not an asset. Every line of code has ongoing maintenance cost — bugs to fix, dependencies to update, security patches to apply, and new engineers to onboard. Deprecation is the discipline of removing code that no longer earns its keep, and migration is the process of moving users safely from the old to the new.

Most engineering organizations are good at building things. Few are good at removing them. This skill addresses that gap.

## When to Use

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

## Compulsory vs Advisory Deprecation

| Type | When to Use | Mechanism |
|------|-------------|-----------|
| **Advisory** | Migration is optional, old system is stable | Warnings, documentation, nudges. Users migrate on their own timeline. |
| **Compulsory** | Old system has security issues, blocks progress, or maintenance cost is unsustainable | Hard deadline. Old system will be removed by date X. Provide migration tooling. |

**Default to advisory.** Use compulsory only when the maintenance cost or risk justifies forcing migration. Compulsory deprecation requires providing migration tooling, documentation, and support — you can't just announce a deadline.

## The Migration Process

### Step 1: Build the Replacement

Don't deprecate without a working alternative. The replacement must:

- Cover all critical use cases of the old system
- Have documentation and migration guides
- Be proven in production (not just "theoretically better")
- Preserve a credible transition path for existing consumers (for example: Go adapters, deprecated doc comments, or build-tagged compatibility files during the overlap period)

### Step 2: Announce and Document

```markdown
## Deprecation Notice: OldClient

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewClient (see migration guide below)
**Removal date:** Advisory — no hard deadline yet
**Reason:** OldClient depends on an unmaintained module version and lacks
            context-aware APIs. NewClient fixes both.

### Migration Guide
1. Mark old exported APIs with Go doc comments in the standard format:
   `// Deprecated: use NewClient instead.`
2. Replace `import "github.com/org/oldclient"` with
   `import "github.com/org/newclient/v2"` if the replacement is a v2+ module.
3. Update `go.mod` and `go.sum`, then run `go mod tidy`.
4. Use `go mod graph` to find downstream consumers still pinned to the old module.
5. If the old dependency is also a security concern, run `govulncheck ./...`.
6. Update configuration (see examples below).
```

### Step 3: Migrate Incrementally

Migrate consumers one at a time, not all at once. For each consumer:

```
1. Identify all touchpoints with the deprecated system
2. Update to use the replacement
   - In Go, update import paths when a v2+ module now requires the `/v2` suffix in both the `module` line and all imports.
   - During gradual cutovers, use `//go:build` tags or separate compatibility files so old and new implementations can coexist without tangled conditionals.
3. Verify behavior matches (tests, integration checks)
   - Run `go mod tidy` to normalize module metadata and `go mod graph` to understand transitive migration impact.
4. Remove references to the old system
5. Confirm no regressions
```

**The Churn Rule:** If you own the infrastructure being deprecated, you are responsible for migrating your users — or providing backward-compatible updates that require no migration. Don't announce deprecation and leave users to figure it out.

### Step 4: Remove the Old System

Only after all consumers have migrated:

```
1. Verify zero active usage (metrics, logs, dependency analysis)
2. Remove the code
3. Remove associated tests, documentation, and configuration
4. Remove the deprecation notices
5. Celebrate — removing code is an achievement
```

## Migration Patterns

### Strangler Pattern

Run old and new systems in parallel. Route traffic incrementally from old to new. When the old system handles 0% of traffic, remove it.

```
Phase 1: New system handles 0%, old handles 100%
Phase 2: New system handles 10% (canary)
Phase 3: New system handles 50%
Phase 4: New system handles 100%, old system idle
Phase 5: Remove old system
```

### Adapter Pattern

Create an adapter that translates calls from the old interface to the new implementation. Consumers keep using the old interface while you migrate the backend.

#### Go

```go
// Deprecated: use NewTaskService directly.
type LegacyTaskService struct {
  newService *NewTaskService
}

// Old method signature, delegates to new implementation.
func (l *LegacyTaskService) GetTask(ctx context.Context, id int) (*OldTask, error) {
  task, err := l.newService.FindByID(ctx, strconv.Itoa(id))
  if err != nil {
    return nil, err
  }
  return l.toOldFormat(task), nil
}

func (l *LegacyTaskService) toOldFormat(task *NewTask) *OldTask {
  return &OldTask{ID: task.ID, Title: task.Title}
}
```

Compatibility files can isolate the transition:

```go
//go:build legacytask

package task

func NewTaskAPI() TaskService {
  return &LegacyTaskService{newService: &NewTaskService{}}
}
```

#### TypeScript

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

### Feature Flag Migration

Use feature flags to switch consumers from old to new system one at a time. In Go, this is often paired with separate files or build tags so compatibility code stays explicit and easy to delete.

#### Go

```go
func getTaskService(ctx context.Context, userID string) TaskService {
  if featureFlags.IsEnabled(ctx, "new-task-service", map[string]string{"userID": userID}) {
    return NewTaskService{}
  }
  return &LegacyTaskService{}
}

// Or using interface assignment
var service TaskService
if featureFlags.IsEnabled(ctx, "new-task-service", map[string]string{"userID": userID}) {
  service = &NewTaskService{}
} else {
  service = &LegacyTaskService{}
}
```

#### TypeScript

```typescript
function getTaskService(userId: string): TaskService {
  if (featureFlags.isEnabled('new-task-service', { userId })) {
    return new NewTaskService();
  }
  return new LegacyTaskService();
}
```

### Database Schema Migrations (Expand/Contract)

A schema change is the riskiest migration because the data is the one thing you cannot roll back by reverting a deploy. The failure mode is coupling the schema change to the code change: rename a column in the same release that starts using the new name, and during the rollout window — when old and new code run at once — one of them is querying a column that doesn't exist. The fix is to **never change a column in place**. Migrate in additive phases so old and new code are both valid at every step.

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

For Go dependencies specifically, treat stale modules as both migration and supply-chain risks: inspect the dependency tree with `go mod graph`, clean up unused requirements with `go mod tidy`, and run `govulncheck ./...` before deciding whether "deprecated but still working" is acceptable.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It still works, why remove it?" | Working code that nobody maintains accumulates security debt and complexity. Maintenance cost grows silently. |
| "Someone might need it later" | If it's needed later, it can be rebuilt. Keeping unused code "just in case" costs more than rebuilding. |
| "The migration is too expensive" | Compare migration cost to ongoing maintenance cost over 2-3 years. Migration is usually cheaper long-term. |
| "We'll deprecate it after we finish the new system" | Deprecation planning starts at design time. By the time the new system is done, you'll have new priorities. Plan now. |
| "Users will migrate on their own" | They won't. Provide tooling, documentation, and incentives — or do the migration yourself (the Churn Rule). |
| "We can maintain both systems indefinitely" | Two systems doing the same thing is double the maintenance, testing, documentation, and onboarding cost. |
| "Just rename the column, it's one line" | During the rollout, old and new code run together — one will query a column that no longer exists. Expand/contract, never rename in place. |
| "I'll add the column and drop the old one in the same migration" | That couples a safe add to a destructive drop. Drops get their own deploy, after no code references the old shape. |
| "We'll write the rollback if we need it" | A migration with no down path is a deploy you can't reverse. Write and run the `down` before merging. |
| "We can release v2 without changing the Go module path" | In Go modules, v2+ requires the module path and imports to include `/v2`, `/v3`, etc. Skipping that breaks consumers and tooling expectations. |

## Red Flags

- Deprecated systems with no replacement available
- Deprecation announcements with no migration tooling or documentation
- "Soft" deprecation that's been advisory for years with no progress
- Zombie code with no owner and active consumers
- New features added to a deprecated system (invest in the replacement instead)
- Go APIs that are "deprecated" in prose only, without `// Deprecated: ...` doc comments that tooling can detect
- A v2+ Go module released without the required `/v2` major-version suffix in `module` and import paths
- Breaking-change transition logic hidden behind ad hoc conditionals instead of explicit `//go:build` tags or separate compatibility files
- Deprecation without measuring current usage
- Removing code without verifying zero active consumers
- A schema change and the code that depends on it shipped in the same deploy
- A column renamed or dropped in place rather than via expand/contract
- A migration merged with no tested down path, or a backfill that locks the table

## Verification

After completing a deprecation:

- [ ] Replacement is production-proven and covers all critical use cases
- [ ] Migration guide exists with concrete steps and examples
- [ ] Deprecated Go APIs are marked with `// Deprecated: use NewFunc instead.` so IDEs and static analysis can surface the migration
- [ ] If the replacement is a Go v2+ module, `go.mod`, `go.sum`, module path, and import paths all reflect the required major-version suffix
- [ ] All active consumers have been migrated (verified by metrics/logs)
- [ ] Dependency impact has been checked (`go mod tidy`, `go mod graph`, and `govulncheck ./...` when relevant)
- [ ] Old code, tests, documentation, and configuration are fully removed
- [ ] No references to the deprecated system remain in the codebase
- [ ] Deprecation notices are removed (they served their purpose)

After a database schema migration:

- [ ] The change ships in additive phases (expand → backfill → contract), not a single in-place edit
- [ ] Old and new code are both valid against the schema at every deploy step
- [ ] Each migration has a tested down path; backfills run in throttled batches
- [ ] Destructive steps (drop/rename) ship in their own deploy after no code references the old shape
