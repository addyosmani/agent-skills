---
name: code-simplification
description: 为清晰度简化代码。用于在不改变 behavior 的前提下重构代码以提升清晰度。也用于代码能工作但比应有状态更难读、维护或扩展，或 review 到累积了不必要复杂度的代码时。
---

# Code Simplification

> 灵感来自 [Claude Code Simplifier plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md)。这里改写为 model-agnostic、process-driven 的 skill，供任何 AI coding agent 使用。

## Overview
通过降低复杂度简化代码，同时严格保持 behavior 不变。目标不是更少行，而是更容易阅读、理解、修改和 debug 的代码。每个 simplification 都必须通过一个简单测试：“新团队成员会比读原版更快理解它吗？”

## When to Use
- Feature 已工作且 tests pass，但 implementation 感觉比需要的更重
- Code review 中指出 readability 或 complexity issues
- 遇到深层 nested logic、long functions 或不清晰命名
- 重构在时间压力下写出的代码
- Consolidating 分散在多个 files 的 related logic
- Merge 后引入了 duplication 或 inconsistency

**何时不要使用：**

- Code 已经 clean 且 readable，不要为了简化而简化
- 你还不理解 code 做什么，先理解再简化
- Code 是 performance-critical，且“更简单”的版本可测地更慢
- 你即将整个 rewrite module，简化 throwaway code 是浪费

## 五项原则

### 1. Preserve Behavior Exactly

不要改变代码做什么，只改变它如何表达。所有 inputs、outputs、side effects、error behavior 和 edge cases 必须保持一致。如果不确定某个 simplification 是否保持 behavior，就不要做。

```
每次变更前先问：
→ 是否对每个 input 都产生相同 output？
→ 是否保持相同 error behavior？
→ 是否保持相同 side effects 和 ordering？
→ 所有现有 tests 是否无需修改仍通过？
```

### 2. Follow Project Conventions

Simplification 是让代码更符合 codebase，而不是施加外部偏好。简化前：

```
1. 阅读 CLAUDE.md / project conventions
2. 研究 neighboring code 如何处理类似 patterns
3. 匹配项目在这些方面的 style：
   - Import ordering and module system
   - Function declaration style
   - Naming conventions
   - Error handling patterns
   - Type annotation depth
```

破坏 project consistency 的 simplification 不是简化，而是 churn。

### 3. Prefer Clarity Over Cleverness

当 compact version 需要读者停下来解析时，显式代码好过紧凑代码。

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

Simplification 有一种 failure mode：过度简化。注意这些 traps：

- **Inlining too aggressively** — 移除给 concept 命名的 helper，会让 call site 更难读
- **Combining unrelated logic** — 两个简单 functions 合并成一个复杂 function，并不更简单
- **Removing "unnecessary" abstraction** — 有些 abstractions 是为 extensibility 或 testability 存在，而不是复杂度
- **Optimizing for line count** — 更少行不是目标，更容易理解才是

### 5. Scope to What Changed

默认只简化最近修改的代码。避免对无关代码做 drive-by refactors，除非用户明确要求扩大 scope。Unscoped simplification 会制造 diff 噪声，并带来 unintended regressions 风险。

## Simplification Process

### Step 1: Understand Before Touching（Chesterton's Fence）

在改变或移除任何东西前，先理解它为什么存在。这就是 Chesterton's Fence：如果你看到路中间有栅栏，却不明白为什么在那里，不要拆掉它。先理解原因，再判断原因是否仍适用。

```
简化前先回答：
- 这段 code 的 responsibility 是什么？
- 谁调用它？它调用什么？
- Edge cases 和 error paths 是什么？
- 是否有 tests 定义 expected behavior？
- 它为什么可能这样写？（Performance？Platform constraint？Historical reason？）
- Check git blame：这段 code 的 original context 是什么？
```

如果答不上来，就还没准备好简化。先读更多 context。

### Step 2: Identify Simplification Opportunities

扫描这些 patterns。每一项都是具体 signal，不是模糊 smell：

**Structural complexity:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Deep nesting (3+ levels) | Control flow 难以跟踪 | 提取 conditions 为 guard clauses 或 helper functions |
| Long functions (50+ lines) | 多个 responsibilities | 拆成命名清晰的 focused functions |
| Nested ternaries | 需要 mental stack 才能解析 | 替换为 if/else chains、switch 或 lookup objects |
| Boolean parameter flags | `doThing(true, false, true)` | 替换为 options objects 或 separate functions |
| Repeated conditionals | 同一个 `if` check 多处出现 | 提取为命名良好的 predicate function |

**Naming and readability:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Generic names | `data`, `result`, `temp`, `val`, `item` | Rename 为描述内容的名字：`userProfile`, `validationErrors` |
| Abbreviated names | `usr`, `cfg`, `btn`, `evt` | 使用完整单词，除非 abbreviation 是通用的（`id`, `url`, `api`） |
| Misleading names | 名为 `get` 的 function 同时 mutates state | Rename 以反映实际 behavior |
| Comments explaining "what" | `// increment counter` above `count++` | 删除 comment，code 已足够清楚 |
| Comments explaining "why" | `// Retry because the API is flaky under load` | 保留，这些承载 code 无法表达的 intent |

**Redundancy:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Duplicated logic | 相同 5+ lines 多处出现 | 提取为 shared function |
| Dead code | Unreachable branches、unused variables、commented-out blocks | 移除（先确认它确实 dead） |
| Unnecessary abstractions | 不增加 value 的 wrapper | Inline wrapper，直接调用 underlying function |
| Over-engineered patterns | Factory-for-a-factory、strategy-with-one-strategy | 替换为简单直接做法 |
| Redundant type assertions | Cast 到已 inferred 的 type | 移除 assertion |

### Step 3: Apply Changes Incrementally

一次只做一个 simplification。每次 change 后运行 tests。**Refactoring changes 要与 feature 或 bug fix changes 分开提交。** 一个 PR 同时 refactor 和加 feature，就是两个 PR，拆开。

```
对每个 simplification：
1. 做 change
2. 运行 test suite
3. 如果 tests pass → commit（或继续下一个 simplification）
4. 如果 tests fail → revert 并重新考虑
```

避免把多个 simplifications 批量放进一个未测试 change。如果出问题，你需要知道是哪一个 simplification 导致的。

**Rule of 500:** 如果 refactoring 会触碰超过 500 行，投资自动化（codemods、sed scripts、AST transforms），不要手工改。这个规模的 manual edits 容易出错，也难以 review。

### Step 4: Verify the Result

所有 simplifications 完成后，退一步评估整体：

```
比较前后：
- Simplified version 是否真的更容易理解？
- 是否引入了任何与 codebase 不一致的新 patterns？
- Diff 是否 clean 且 reviewable？
- Teammate 会 approve 这个 change 吗？
```

如果“simplified”版本更难理解或 review，就 revert。不是每次 simplification attempt 都会成功。

## Language-Specific Guidance

### TypeScript / JavaScript

```typescript
// SIMPLIFY: Unnecessary async wrapper
// Before
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// After
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// SIMPLIFY: Verbose conditional assignment
// Before
let displayName: string;
if (user.nickname) {
  displayName = user.nickname;
} else {
  displayName = user.fullName;
}
// After
const displayName = user.nickname || user.fullName;

// SIMPLIFY: Manual array building
// Before
const activeUsers: User[] = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}
// After
const activeUsers = users.filter((user) => user.isActive);

// SIMPLIFY: Redundant boolean return
// Before
function isValid(input: string): boolean {
  if (input.length > 0 && input.length < 100) {
    return true;
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
| “能工作，没必要动” | 难读的 working code 在出问题时也难修。现在简化，会节省未来每次 change 的时间。 |
| “行数越少越简单” | 1 行 nested ternary 不比 5 行 if/else 简单。Simplicity 关乎理解速度，不是 line count。 |
| “我顺手把这段无关代码也简化一下” | Unscoped simplification 会制造 noisy diffs，并给你无意修改的代码带来 regressions 风险。保持聚焦。 |
| “Types 让它 self-documenting” | Types 记录 structure，不记录 intent。命名良好的 function 比 type signature 更能解释 *why*。 |
| “这个 abstraction 以后可能有用” | 不要保留 speculative abstractions。如果现在没用，它就是没有价值的复杂度。移除，未来需要再加。 |
| “原作者肯定有理由” | 也许。Check git blame，应用 Chesterton's Fence。但累积复杂度经常没有理由，只是压力下迭代的残留。 |
| “我加 feature 时顺便 refactor” | 把 refactoring 与 feature work 分开。Mixed changes 更难 review、revert，也更难理解历史。 |

## Red Flags

- Simplification 需要修改 tests 才能通过（你很可能改变了 behavior）
- “Simplified” code 比原版更长且更难跟踪
- 按你的偏好而不是 project conventions 重命名
- 因为“让代码更干净”而移除 error handling
- 简化你尚未完全理解的代码
- 把许多 simplifications 批量放进一个大而难 review 的 commit
- 未经要求就 refactor 当前 task scope 外的代码

## Verification
完成 simplification pass 后：

- [ ] 所有现有 tests 无需修改即可通过
- [ ] Build 成功，且没有 new warnings
- [ ] Linter/formatter 通过（无 style regressions）
- [ ] 每个 simplification 都是 reviewable、incremental change
- [ ] Diff clean，未混入 unrelated changes
- [ ] Simplified code 遵循 project conventions（已对照 CLAUDE.md 或等价文件检查）
- [ ] 没有移除或削弱 error handling
- [ ] 没有留下 dead code（unused imports、unreachable branches）
- [ ] Teammate 或 review agent 会认为该 change 是 net improvement 并 approve
