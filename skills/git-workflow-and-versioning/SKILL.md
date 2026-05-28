---
name: git-workflow-and-versioning
description: 组织 git workflow 实践。进行任何 code change 时使用。用于 commit、branch、解决 conflicts，或需要在多个 parallel streams 中组织工作时。
---

# Git Workflow and Versioning

## Overview

Git 是你的安全网。把 commits 当作 save points，把 branches 当作 sandboxes，把 history 当作文档。AI agents 高速生成代码时，严格的 version control 是让变更保持可管理、可 review、可回退的机制。

## When to Use

始终使用。每个 code change 都经过 git。

## Core Principles

### Trunk-Based Development (Recommended)

保持 `main` 始终可 deploy。使用 short-lived feature branches，并在 1-3 天内 merge 回 main。Long-lived development branches 是隐藏成本：它们会 diverge、制造 merge conflicts，并延迟 integration。DORA 研究持续表明 trunk-based development 与高绩效工程团队相关。

```
main ──●──●──●──●──●──●──●──●──●──  （始终可 deploy）
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱    ← short-lived feature branches（1-3 天）
```

这是推荐默认方式。使用 gitflow 或 long-lived branches 的团队可将这些原则（atomic commits、小变更、描述性 messages）适配到自己的 branching model。Commit discipline 比具体 branching strategy 更重要。

- **Dev branches 是成本。** Branch 每多存在一天，就多积累一天 merge risk。
- **Release branches 可以接受。** 当需要在 main 继续前进时稳定 release。
- **Feature flags > long branches。** 优先把未完成工作放在 flags 后 deploy，而不是让它在 branch 上停留数周。

### 1. Commit Early, Commit Often

每个成功增量都应有自己的 commit。不要积累大量 uncommitted changes。

```
工作模式：
  实现一个 slice → Test → Verify → Commit → 下一个 slice

不要这样：
  实现全部内容 → 祈祷它能工作 → 巨型 commit
```

Commits 是 save points。如果下一个变更破坏了东西，你可以立即回到最后一个 known-good state。

### 2. Atomic Commits

每个 commit 只做一件逻辑事情：

```
# Good: 每个 commit 都是自包含的
git log --oneline
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: 所有内容混在一起
git log --oneline
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

### 3. Descriptive Messages

Commit messages 解释 *why*，不只是 *what*：

```
# Good: 解释意图
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema validation at the route handler level,
consistent with existing validation patterns in auth.ts.

# Bad: 只描述 diff 已经显而易见的内容
update auth.ts
```

**Format:**
```
<type>: <short description>

<optional body explaining why, not what>
```

**Types:**
- `feat` — 新 feature
- `fix` — Bug fix
- `refactor` — 既不修 bug 也不加 feature 的代码变更
- `test` — 添加或更新 tests
- `docs` — 仅 documentation
- `chore` — Tooling、dependencies、config

### 4. Keep Concerns Separate

不要把 formatting changes 和 behavior changes 合在一起。不要把 refactors 和 features 合在一起。每类变更都应是单独 commit，最好也是单独 PR：

```
# Good: 分离 concerns
git commit -m "refactor: extract validation logic to shared utility"
git commit -m "feat: add phone number validation to registration"

# Bad: 混合 concerns
git commit -m "refactor validation and add phone number field"
```

**将 refactoring 与 feature work 分开。** Refactoring change 和 feature change 是两个不同变更，应分开提交。这让每个变更更易 review、revert，并在 history 中更易理解。小清理（重命名变量）可由 reviewer 酌情包含在 feature commit 中。

### 5. Size Your Changes

目标是每个 commit/PR 约 100 行。超过约 1000 行的变更应拆分。如何拆分大变更，见 `code-review-and-quality` 中的 splitting strategies。

```
~100 lines  → 易 review，易 revert
~300 lines  → 单一逻辑变更可接受
~1000 lines → 拆成更小变更
```

## Branching Strategy

### Feature Branches

```
main（始终可 deploy）
  │
  ├── feature/task-creation    ← 每个 branch 一个 feature
  ├── feature/user-settings    ← Parallel work
  └── fix/duplicate-tasks      ← Bug fixes
```

- 从 `main`（或团队默认 branch）创建 branch
- 保持 branches short-lived（1-3 天内 merge），long-lived branches 是隐藏成本
- Merge 后删除 branches
- 对未完成 features，优先使用 feature flags，而非 long-lived branches

### Branch Naming

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

## Working with Worktrees

对于 parallel AI agent work，使用 git worktrees 同时运行多个 branches：

```bash
# 为 feature branch 创建 worktree
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings

# 每个 worktree 都是单独目录，有自己的 branch
# Agents 可以并行工作且互不干扰
ls ../
  project/              ← main branch
  project-feature-a/    ← task-creation branch
  project-feature-b/    ← user-settings branch

# 完成后 merge 并清理
git worktree remove ../project-feature-a
```

好处：
- 多个 agents 可同时处理不同 features
- 无需 branch switching（每个目录有自己的 branch）
- 如果某个实验失败，删除 worktree 即可，不会丢失内容
- 变更在显式 merge 前保持隔离

## The Save Point Pattern

```
Agent 开始工作
    │
    ├── 做出一个变更
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    ├── 再做一个变更
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → 所有 commits 形成清晰 history
```

这个 pattern 意味着最多只会丢失一个增量的工作。如果 agent 走偏，`git reset --hard HEAD` 会回到最后一个成功状态。

## Change Summaries

任何修改后，提供结构化 summary。这会让 review 更容易，记录 scope discipline，并暴露非预期变更：

```
已完成变更：
- src/routes/tasks.ts: 为 POST endpoint 添加 validation middleware
- src/lib/validation.ts: 使用 Zod 添加 TaskCreateSchema

我有意未触碰的内容：
- src/routes/auth.ts: 有类似 validation gap，但不在 scope 内
- src/middleware/error.ts: Error format 可改进（单独 task）

潜在关注点：
- Zod schema 是 strict，会拒绝 extra fields。请确认这是期望行为。
- 添加了 zod dependency（72KB gzipped），已存在于 package.json
```

这个 pattern 能早发现错误假设，并给 reviewers 一张清晰的变更地图。“DIDN'T TOUCH” 部分尤其重要，它表明你遵守了 scope discipline，没有主动做不相关改造。

## Pre-Commit Hygiene

每次 commit 前：

```bash
# 1. 检查将要 commit 的内容
git diff --staged

# 2. 确认没有 secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. 运行 tests
npm test

# 4. 运行 linting
npm run lint

# 5. 运行 type checking
npx tsc --noEmit
```

用 git hooks 自动化：

```json
// package.json (using lint-staged + husky)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Handling Generated Files

- **只在项目期望时 commit generated files**（例如 `package-lock.json`、Prisma migrations）
- **不要 commit** build output（`dist/`、`.next/`）、environment files（`.env`）或 IDE config（除非共享的 `.vscode/settings.json`）
- **应有 `.gitignore`** 覆盖：`node_modules/`、`dist/`、`.env`、`.env.local`、`*.pem`

## Using Git for Debugging

```bash
# 找出引入 bug 的 commit
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Git 会 checkout 中点；每次运行 test 以缩小范围

# 查看最近变更
git log --oneline -20
git diff HEAD~5..HEAD -- src/

# 找出谁最后修改了某一行
git blame src/services/task.ts

# 按关键词搜索 commit messages
git log --grep="validation" --oneline
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “I'll commit when the feature is done” | 一个巨型 commit 无法 review、debug 或 revert。按 slice commit。 |
| “The message doesn't matter” | Messages 是文档。未来的你（和未来 agents）需要理解改了什么以及为什么。 |
| “I'll squash it all later” | Squashing 会破坏 development narrative。从一开始就优先保持干净的 incremental commits。 |
| “Branches add overhead” | Short-lived branches 成本很低，并能防止冲突工作互相碰撞。Long-lived branches 才是问题，应在 1-3 天内 merge。 |
| “I'll split this change later” | 大变更更难 review、deploy 风险更高、revert 更难。提交前拆分，而不是之后。 |
| “I don't need a .gitignore” | 直到包含 production secrets 的 `.env` 被 commit。立即设置。 |

## Red Flags

- 积累大量 uncommitted changes
- Commit messages 类似 “fix”、“update”、“misc”
- Formatting changes 与 behavior changes 混在一起
- 项目没有 `.gitignore`
- Commit `node_modules/`、`.env` 或 build artifacts
- Long-lived branches 与 main 明显 diverge
- Force-pushing 到 shared branches

## Verification

每次 commit：

- [ ] Commit 只做一件逻辑事情
- [ ] Message 解释 why，并遵循 type conventions
- [ ] Commit 前 tests pass
- [ ] Diff 中无 secrets
- [ ] 无 formatting-only changes 与 behavior changes 混合
- [ ] `.gitignore` 覆盖标准排除项
