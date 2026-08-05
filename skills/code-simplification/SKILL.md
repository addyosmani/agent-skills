---
name: code-simplification
description: Simplifies code for clarity. Use when refactoring code for clarity without changing behavior. Use when code works but is harder to read, maintain, or extend than it should be. Use when reviewing code that has accumulated unnecessary complexity.
---

# Code Simplification

> Inspired by the [Claude Code Simplifier plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md). Adapted here as a model-agnostic, process-driven skill for any AI coding agent.

## Overview

Simplify code by reducing complexity while preserving exact behavior. The goal is not fewer lines — it's code that is easier to read, understand, modify, and debug. In Go, that often means keeping code left-aligned with early returns, resisting abstractions until they earn their keep, and preferring flatter package boundaries over elaborate layering. Every simplification must pass a simple test: "Would a new team member understand this faster than the original?"

## When to Use

- After a feature is working and tests pass, but the implementation feels heavier than it needs to be
- During code review when readability or complexity issues are flagged
- When you encounter deeply nested logic, long functions, or unclear names
- When refactoring code written under time pressure
- When consolidating related logic scattered across files
- After merging changes that introduced duplication or inconsistency

**When NOT to use:**

- Code is already clean and readable — don't simplify for the sake of it
- You don't understand what the code does yet — comprehend before you simplify
- The code is performance-critical and the "simpler" version would be measurably slower
- You're about to rewrite the module entirely — simplifying throwaway code wastes effort

## The Five Principles

### 1. Preserve Behavior Exactly

Don't change what the code does — only how it expresses it. All inputs, outputs, side effects, error behavior, and edge cases must remain identical. If you're not sure a simplification preserves behavior, don't make it.

```
ASK BEFORE EVERY CHANGE:
→ Does this produce the same output for every input?
→ Does this maintain the same error behavior?
→ Does this preserve the same side effects and ordering?
→ Do all existing tests still pass without modification?
```

### 2. Follow Project Conventions

Simplification means making code more consistent with the codebase, not imposing external preferences. Before simplifying:

```
1. Read CLAUDE.md / project conventions
2. Study how neighboring code handles similar patterns
3. Match the project's style for:
   - Import ordering and module system
   - Function declaration style
   - Naming conventions
   - Error handling patterns
   - Type annotation depth
```

Simplification that breaks project consistency is not simplification — it's churn.

### 3. Prefer Clarity Over Cleverness

Explicit code is better than compact code when the compact version requires a mental pause to parse.

```go
// UNCLEAR: Deep nesting hides the happy path.
func process(item *Item) string {
  if item != nil {
    if item.IsNew {
      return "New"
    } else if item.IsUpdated {
      return "Updated"
    } else if item.IsArchived {
      return "Archived"
    } else {
      return "Active"
    }
  }
  return "Unknown"
}

// CLEAR: Guard clauses preserve line of sight.
// In idiomatic Go, avoid the else after a return.
func statusLabel(item *Item) string {
  if item == nil {
    return "Unknown"
  }
  if item.IsNew {
    return "New"
  }
  if item.IsUpdated {
    return "Updated"
  }
  if item.IsArchived {
    return "Archived"
  }
  return "Active"
}
```

Secondary TypeScript / JavaScript illustration:

```typescript
// UNCLEAR: Dense ternary chain
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// CLEAR: Readable mapping
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

```go
// UNCLEAR: Unnecessary branching around a straightforward count.
countByID := make(map[string]int)
for _, item := range items {
  if count, exists := countByID[item.ID]; exists {
    countByID[item.ID] = count + 1
  } else {
    countByID[item.ID] = 1
  }
}

// CLEAR: Let the zero value work for you.
countByID := make(map[string]int)
for _, item := range items {
  countByID[item.ID]++
}
```

Secondary TypeScript / JavaScript illustration:

```typescript
// UNCLEAR: Chained reduces with inline logic
const result = items.reduce((acc, item) => ({
  ...acc,
  [item.id]: { ...acc[item.id], count: (acc[item.id]?.count ?? 0) + 1 }
}), {});

// CLEAR: Named intermediate step
const countById = new Map<string, number>();
for (const item of items) {
  countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
}
```

### 4. Maintain Balance

Simplification has a failure mode: over-simplification. Watch for these traps:

- **Inlining too aggressively** — removing a helper that gave a concept a name makes the call site harder to read
- **Combining unrelated logic** — two simple functions merged into one complex function is not simpler
- **Removing "unnecessary" abstraction** — some abstractions exist for extensibility or testability, not complexity
- **Adding abstraction "just in case"** — in Go especially, avoid introducing interfaces, generics, or package layers before you have a concrete need
- **Optimizing for line count** — fewer lines is not the goal; easier comprehension is

### 5. Scope to What Changed

Default to simplifying recently modified code. Avoid drive-by refactors of unrelated code unless explicitly asked to broaden scope. Unscoped simplification creates noise in diffs and risks unintended regressions.

## The Simplification Process

### Step 1: Understand Before Touching (Chesterton's Fence)

Before changing or removing anything, understand why it exists. This is Chesterton's Fence: if you see a fence across a road and don't understand why it's there, don't tear it down. First understand the reason, then decide if the reason still applies.

```
BEFORE SIMPLIFYING, ANSWER:
- What is this code's responsibility?
- What calls it? What does it call?
- What are the edge cases and error paths?
- Are there tests that define the expected behavior?
- Why might it have been written this way? (Performance? Platform constraint? Historical reason?)
- Check git blame: what was the original context for this code?
```

If you can't answer these, you're not ready to simplify. Read more context first.

### Step 2: Identify Simplification Opportunities

Scan for these patterns — each one is a concrete signal, not a vague smell:

**Structural complexity:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Deep nesting (3+ levels) | Hard to follow control flow | Extract conditions into guard clauses or helper functions; in Go, prefer early returns that keep the happy path left-aligned |
| Long functions (50+ lines) | Multiple responsibilities | Split into focused functions with descriptive names |
| Nested ternaries | Requires mental stack to parse | Replace with if/else chains, switch, or lookup objects |
| Boolean parameter flags | `doThing(true, false, true)` | Replace with options objects or separate functions |
| Repeated conditionals | Same `if` check in multiple places | Extract to a well-named predicate function |
| Pass-through package layers | `handler -> service -> manager -> repository` with little added logic | Collapse unnecessary layers; Go often reads better with fewer, flatter packages |

**Naming and readability:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Generic names | `data`, `result`, `temp`, `val`, `item` | Rename to describe the content: `userProfile`, `validationErrors` |
| Abbreviated names | `usr`, `cfg`, `btn`, `evt` | Use full words unless the abbreviation is universal (`id`, `url`, `api`) |
| Misleading names | Function named `get` that also mutates state | Rename to reflect actual behavior |
| Comments explaining "what" | `// increment counter` above `count++` | Delete the comment — the code is clear enough |
| Comments explaining "why" | `// Retry because the API is flaky under load` | Keep these — they carry intent the code can't express |

**Redundancy:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Duplicated logic | Same 5+ lines in multiple places | Extract to a shared function |
| Dead code | Unreachable branches, unused variables, commented-out blocks | Remove (after confirming it's truly dead) |
| Unnecessary abstractions | Wrapper that adds no value | Inline the wrapper, call the underlying function directly |
| Premature interfaces | One implementation used only internally | Keep the concrete type; in Go, accept interfaces at boundaries and return structs |
| Premature generics | Type parameters add noise without reducing duplication meaningfully | Prefer a concrete type or a small interface until a reusable generic abstraction is clearly justified |
| Over-engineered patterns | Factory-for-a-factory, strategy-with-one-strategy | Replace with the simple direct approach |
| Redundant type assertions | Casting to a type that's already inferred | Remove the assertion |

For Go codebases, automated simplification checks can find low-risk cleanup opportunities. Run the project's normal `golangci-lint` configuration and pay special attention to `gosimple` / `S1xxx` findings, then apply only the ones that improve readability in context.

### Step 3: Apply Changes Incrementally

Make one simplification at a time. Run tests after each change. **Submit refactoring changes separately from feature or bug fix changes.** A PR that refactors and adds a feature is two PRs — split them.

```
FOR EACH SIMPLIFICATION:
1. Make the change
2. Run the test suite
3. If tests pass → commit (or continue to next simplification)
4. If tests fail → revert and reconsider
```

Avoid batching multiple simplifications into a single untested change. If something breaks, you need to know which simplification caused it.

**The Rule of 500:** If a refactoring would touch more than 500 lines, invest in automation (codemods, sed scripts, AST transforms) rather than making the changes by hand. Manual edits at that scale are error-prone and exhausting to review.

### Step 4: Verify the Result

After all simplifications, step back and evaluate the whole:

```
COMPARE BEFORE AND AFTER:
- Is the simplified version genuinely easier to understand?
- Did you introduce any new patterns inconsistent with the codebase?
- Is the diff clean and reviewable?
- Would a teammate approve this change?
```

If the "simplified" version is harder to understand or review, revert. Not every simplification attempt succeeds.

## Language-Specific Guidance

### Go

Use Go as the default lens for this skill: preserve line of sight, avoid the `else` after a `return`, keep abstractions sparse, and lean on tooling for low-risk simplifications.

#### SIMPLIFY: Guard clauses over deep nesting

```go
// Before
func validateUser(u *User) error {
  if u != nil {
    if u.Email != "" {
      if u.Active {
        return nil
      } else {
        return errors.New("user is inactive")
      }
    } else {
      return errors.New("email is required")
    }
  }
  return errors.New("user is nil")
}

// After
func validateUser(u *User) error {
  if u == nil {
    return errors.New("user is nil")
  }
  if u.Email == "" {
    return errors.New("email is required")
  }
  if !u.Active {
    return errors.New("user is inactive")
  }
  return nil
}
```

#### SIMPLIFY: Unnecessary interface

```go
// Before
type UserFetcher interface {
  GetByID(ctx context.Context, id string) (*User, error)
}

type userService struct {
  repo UserFetcher
}

// After
type userService struct {
  repo *UserRepository
}
```

Only introduce the interface when you truly need multiple implementations or a package-boundary seam for testing. In Go, "accept interfaces, return structs" is usually the simpler default.

#### SIMPLIFY: Unnecessary generics

```go
// Before
func firstMatch[T any](items []T, predicate func(T) bool) (T, bool) {
  var zero T
  for _, item := range items {
    if predicate(item) {
      return item, true
    }
  }
  return zero, false
}

user, ok := firstMatch(users, func(u User) bool { return u.ID == id })

// After
func findUserByID(users []User, id string) (User, bool) {
  for _, user := range users {
    if user.ID == id {
      return user, true
    }
  }
  return User{}, false
}
```

If the generic helper is used once or twice and hides a simple domain operation, the concrete function is often clearer.

#### SIMPLIFY: Redundant wrapper layer

```go
// Before
func (s *UserService) GetByID(ctx context.Context, id string) (*User, error) {
  return s.repo.GetByID(ctx, id)
}

// After
// Remove the pass-through method and have the caller use repo.GetByID directly,
// or move the real logic into UserService once it earns the extra layer.
```

#### SIMPLIFY: Boolean accumulator

```go
// Before
func isValid(input string) bool {
  if len(input) > 0 {
    if len(input) < 100 {
      return true
    }
  }
  return false
}

// After
func isValid(input string) bool {
  return len(input) > 0 && len(input) < 100
}
```

#### SIMPLIFY: Let tooling catch low-risk wins

Use `golangci-lint` as a backstop for mechanical cleanups:

```sh
golangci-lint run
```

Review `gosimple` / `S1xxx` findings with judgment. Tooling can point at opportunities, but the human standard is still readability in this codebase.

### TypeScript / JavaScript

Secondary / alternative illustrations:

#### SIMPLIFY: Unnecessary async wrapper

```typescript
// Before
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// After
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}
```

#### Go Equivalent

```go
// Before (redundant wrapper)
func getUser(ctx context.Context, id string) (*User, error) {
  return userService.GetByID(ctx, id)  // Unnecessary wrapper function
}

// After (direct function reference or simpler alias)
// Call userService.GetByID directly from caller
// OR
var getUser = userService.GetByID  // Direct assignment
```

#### SIMPLIFY: Verbose conditional assignment

```typescript
// Before
let displayName: string;
if (user.nickname) {
  displayName = user.nickname;
} else {
  displayName = user.fullName;
}
// After
const displayName = user.nickname || user.fullName;
```

#### Go Equivalent

```go
// Before (verbose)
var displayName string
if user.Nickname != "" {
  displayName = user.Nickname
} else {
  displayName = user.FullName
}

// After (simpler and still explicit)
displayName := user.FullName
if user.Nickname != "" {
  displayName = user.Nickname
}
```

#### SIMPLIFY: Manual array building

```typescript
// Before
const activeUsers: User[] = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}
// After
const activeUsers = users.filter((user) => user.isActive);
```

#### Go Equivalent

```go
// Before (verbose loop)
var activeUsers []*User
for _, user := range users {
  if user.IsActive {
    activeUsers = append(activeUsers, user)
  }
}

// After (keep the explicit loop; just simplify the control flow)
activeUsers := make([]*User, 0, len(users))
for _, user := range users {
  if !user.IsActive {
    continue
  }
  activeUsers = append(activeUsers, user)
}
```

#### SIMPLIFY: Verbose boolean return

```typescript
// Before
function isValid(input: string): boolean {
  if (input.length > 0) {
    if (input.length < 100) {
      return true;
    }
  }
  return false;
}

// After
function isValid(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
```

### Python

```python
# SIMPLIFY: Verbose dictionary building
# Before
result = {}
for item in items:
    result[item.id] = item.name
# After
result = {item.id: item.name for item in items}

# SIMPLIFY: Nested conditionals with early return
# Before
def process(data):
    if data is not None:
        if data.is_valid():
            if data.has_permission():
                return do_work(data)
            else:
                raise PermissionError("No permission")
        else:
            raise ValueError("Invalid data")
    else:
        raise TypeError("Data is None")
# After
def process(data):
    if data is None:
        raise TypeError("Data is None")
    if not data.is_valid():
        raise ValueError("Invalid data")
    if not data.has_permission():
        raise PermissionError("No permission")
    return do_work(data)
```

### React / JSX

```tsx
// SIMPLIFY: Verbose conditional rendering
// Before
function UserBadge({ user }: Props) {
  if (user.isAdmin) {
    return <Badge variant="admin">Admin</Badge>;
  } else {
    return <Badge variant="default">User</Badge>;
  }
}
// After
function UserBadge({ user }: Props) {
  const variant = user.isAdmin ? 'admin' : 'default';
  const label = user.isAdmin ? 'Admin' : 'User';
  return <Badge variant={variant}>{label}</Badge>;
}

// SIMPLIFY: Prop drilling through intermediate components
// Before — consider whether context or composition solves this better.
// This is a judgment call — flag it, don't auto-refactor.
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's working, no need to touch it" | Working code that's hard to read will be hard to fix when it breaks. Simplifying now saves time on every future change. |
| "Fewer lines is always simpler" | A 1-line nested ternary is not simpler than a 5-line if/else. Simplicity is about comprehension speed, not line count. |
| "I'll just quickly simplify this unrelated code too" | Unscoped simplification creates noisy diffs and risks regressions in code you didn't intend to change. Stay focused. |
| "The types make it self-documenting" | Types document structure, not intent. A well-named function explains *why* better than a type signature explains *what*. |
| "This abstraction might be useful later" | Don't preserve speculative abstractions. If it's not used now, it's complexity without value. Remove it and re-add when needed. |
| "The original author must have had a reason" | Maybe. Check git blame — apply Chesterton's Fence. But accumulated complexity often has no reason; it's just the residue of iteration under pressure. |
| "I'll refactor while adding this feature" | Separate refactoring from feature work. Mixed changes are harder to review, revert, and understand in history. |

## Red Flags

- Simplification that requires modifying tests to pass (you likely changed behavior)
- "Simplified" code that is longer and harder to follow than the original
- Renaming things to match your preferences rather than project conventions
- Removing error handling because "it makes the code cleaner"
- Simplifying code you don't fully understand
- Batching many simplifications into one large, hard-to-review commit
- Refactoring code outside the scope of the current task without being asked

## Verification

After completing a simplification pass:

- [ ] All existing tests pass without modification
- [ ] Build succeeds with no new warnings
- [ ] Linter/formatter passes (no style regressions)
- [ ] Each simplification is a reviewable, incremental change
- [ ] The diff is clean — no unrelated changes mixed in
- [ ] Simplified code follows project conventions (checked against CLAUDE.md or equivalent)
- [ ] No error handling was removed or weakened
- [ ] No dead code was left behind (unused imports, unreachable branches)
- [ ] A teammate or review agent would approve the change as a net improvement
