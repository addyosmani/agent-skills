---
name: ci-cd-and-automation
description: 自动化 CI/CD pipeline 设置。用于设置或修改 build 与 deployment pipelines。用于自动化 quality gates、在 CI 中配置 test runners，或建立 deployment strategies。
---

# CI/CD and Automation

## Overview

自动化 quality gates，确保没有变更在未通过 tests、lint、type checking 和 build 前进入 production。CI/CD 是其他所有 skill 的执行机制，它捕获人类和 agents 漏掉的问题，并在每一次变更上稳定执行。

**Shift Left：** 尽可能早地在 pipeline 中捕获问题。Linting 中发现 bug 成本是分钟级，同一个 bug 到 production 才发现会消耗数小时。将 checks 前移：static analysis 在 tests 前，tests 在 staging 前，staging 在 production 前。

**Faster is Safer：** 更小批次、更频繁 release 会降低风险，而不是增加风险。包含 3 个变更的 deployment 比包含 30 个变更的更易 debug。频繁 release 会增强对 release process 本身的信心。

## When to Use

- 为新项目设置 CI pipeline
- 添加或修改 automated checks
- 配置 deployment pipelines
- 某个变更应触发 automated verification 时
- Debugging CI failures

## The Quality Gate Pipeline

每个变更在 merge 前都经过这些 gates：

```
Pull Request Opened
    │
    ▼
┌─────────────────┐
│   LINT CHECK     │  eslint, prettier
│   ↓ pass         │
│   TYPE CHECK     │  tsc --noEmit
│   ↓ pass         │
│   UNIT TESTS     │  jest/vitest
│   ↓ pass         │
│   BUILD          │  npm run build
│   ↓ pass         │
│   INTEGRATION    │  API/DB tests
│   ↓ pass         │
│   E2E (optional) │  Playwright/Cypress
│   ↓ pass         │
│   SECURITY AUDIT │  npm audit
│   ↓ pass         │
│   BUNDLE SIZE    │  bundlesize check
└─────────────────┘
    │
    ▼
  Ready for review
```

**任何 gate 都不能跳过。** 如果 lint fails，修 lint，不要 disable rule。如果 test fails，修代码，不要 skip test。

## GitHub Actions Configuration

### Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
```

### With Database Integration Tests

```yaml
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: ci_user
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://ci_user:${{ secrets.CI_DB_PASSWORD }}@localhost:5432/testdb
```

> **Note:** 即使是仅用于 CI 的 test databases，也使用 GitHub Secrets 存放 credentials，不要 hardcode values。这能建立好习惯，并避免 test credentials 被意外复用到其他 context。

### E2E Tests

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Build
        run: npm run build
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Feeding CI Failures Back to Agents

CI 与 AI agents 结合的价值在 feedback loop。CI 失败时：

```
CI fails
    │
    ▼
复制 failure output
    │
    ▼
交给 agent：
“CI pipeline 因以下错误失败：
[paste specific error]
请修复问题，并在再次 push 前本地验证。”
    │
    ▼
Agent 修复 → pushes → CI 再次运行
```

**Key patterns:**

```
Lint failure → Agent 运行 `npm run lint --fix` 并 commit
Type error  → Agent 读取 error location 并修复 type
Test failure → Agent 按 debugging-and-error-recovery skill 处理
Build error → Agent 检查 config 和 dependencies
```

## Deployment Strategies

### Preview Deployments

每个 PR 都应有 preview deployment，便于 manual testing：

```yaml
# Deploy preview on PR (Vercel/Netlify/etc.)
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy preview
      run: npx vercel --token=${{ secrets.VERCEL_TOKEN }}
```

### Feature Flags

Feature flags 将 deployment 与 release 解耦。把未完成或有风险的 features 放在 flags 后 deploy，这样可以：

- **Ship code without enabling it.** 尽早 merge 到 main，准备好后再 enable。
- **Roll back without redeploying.** 禁用 flag，而不是 revert code。
- **Canary new features.** 先对 1% 用户 enable，再 10%，再 100%。
- **Run A/B tests.** 对比有无该 feature 的行为。

```typescript
// Simple feature flag pattern
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

**Flag lifecycle：** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code。长期存在的 flags 会变成 technical debt，创建时就设置 cleanup date。

### Staged Rollouts

```
PR merged to main
    │
    ▼
  Staging deployment (auto)
    │ Manual verification
    ▼
  Production deployment (manual trigger or auto after staging)
    │
    ▼
  Monitor for errors（15-minute window）
    │
    ├── Errors detected → Rollback
    └── Clean → Done
```

### Rollback Plan

每次 deployment 都应可回退：

```yaml
# Manual rollback workflow
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          # Deploy the specified previous version
          npx vercel rollback ${{ inputs.version }}
```

## Environment Management

```
.env.example       → Committed（developers 使用的 template）
.env                → NOT committed（local development）
.env.test           → Committed（test environment，无真实 secrets）
CI secrets          → Stored in GitHub Secrets / vault
Production secrets  → Stored in deployment platform / vault
```

CI 绝不能拥有 production secrets。CI testing 使用单独 secrets。

## Automation Beyond CI

### Dependabot / Renovate

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

### Build Cop Role

指定一个人负责保持 CI green。当 build breaks，Build Cop 的职责是 fix 或 revert，而不是由导致 break 的人负责。这能防止 broken builds 积累，同时每个人都以为别人会修。

### PR Checks

- **Required reviews:** Merge 前至少 1 个 approval
- **Required status checks:** Merge 前 CI must pass
- **Branch protection:** 禁止 force-pushes to main
- **Auto-merge:** 所有 checks pass 且已 approved 后自动 merge

## CI Optimization

当 pipeline 超过 10 分钟时，按影响力顺序应用这些策略：

```
Slow CI pipeline?
├── Cache dependencies
│   └── 使用 actions/cache 或 setup-node cache option 缓存 node_modules
├── Run jobs in parallel
│   └── 将 lint、typecheck、test、build 拆成独立 parallel jobs
├── Only run what changed
│   └── 使用 path filters 跳过无关 jobs（例如 docs-only PR 跳过 e2e）
├── Use matrix builds
│   └── 将 test suites shard 到多个 runners
├── Optimize the test suite
│   └── 从 critical path 移除慢 tests，改为按 schedule 运行
└── Use larger runners
    └── 对 CPU-heavy builds 使用 GitHub-hosted larger runners 或 self-hosted
```

**Example: caching and parallelism**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “CI is too slow” | 优化 pipeline（见下方 CI Optimization），不要跳过它。5 分钟 pipeline 能避免数小时 debugging。 |
| “This change is trivial, skip CI” | Trivial changes 也会破坏 builds。CI 对 trivial changes 本来也很快。 |
| “The test is flaky, just re-run” | Flaky tests 会掩盖真实 bugs，并浪费所有人的时间。修复 flakiness。 |
| “We'll add CI later” | 没有 CI 的项目会积累 broken states。Day one 就设置。 |
| “Manual testing is enough” | Manual testing 不可扩展且不可重复。能自动化的都自动化。 |

## Red Flags

- 项目没有 CI pipeline
- CI failures 被忽略或静默处理
- 为让 pipeline pass 而在 CI 中 disable tests
- Production deploys 没有 staging verification
- 没有 rollback mechanism
- Secrets 存在 code 或 CI config files 中（而非 secrets manager）
- CI 时间很长且没有 optimization effort

## Verification

设置或修改 CI 后：

- [ ] 所有 quality gates 都存在（lint、types、tests、build、audit）
- [ ] Pipeline 在每个 PR 和 push to main 上运行
- [ ] Failures 会阻塞 merge（branch protection configured）
- [ ] CI results 会反馈到 development loop
- [ ] Secrets 存储在 secrets manager，而不是 code
- [ ] Deployment 有 rollback mechanism
- [ ] Pipeline 对 test suite 的运行时间低于 10 分钟
