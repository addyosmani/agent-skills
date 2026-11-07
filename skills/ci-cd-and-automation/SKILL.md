---
name: ci-cd-and-automation
description: Automates CI/CD pipeline setup. Use when adding, changing, or removing a CI job, stage, or pipeline (GitHub Actions, GitLab CI, or any other runner), even for a single job. Use when setting up or modifying build and deployment pipelines. Use when you need to automate quality gates, configure test runners in CI, or establish deployment strategies.
---

# CI/CD and Automation

## Overview

Automate quality gates so that no change reaches production without passing tests, lint, type checking, and build. CI/CD is the enforcement mechanism for every other skill — it catches what humans and agents miss, and it does so consistently on every single change.

**One pipeline, two test stages.** A **commit stage** gives fast feedback on every change and builds the release candidate once. An **acceptance stage** deploys that same candidate into a production-like environment and runs the executable specifications against it. Green acceptance stage means releasable: no manual gate decides it (see `acceptance-testing`).

**Shift Left:** Catch problems as early in the pipeline as possible. A bug caught in linting costs minutes; the same bug caught in production costs hours. Move checks upstream — static analysis before tests, the commit stage before the acceptance stage, the acceptance stage before production.

**Faster is Safer:** Smaller batches and more frequent releases reduce risk, not increase it. A deployment with 3 changes is easier to debug than one with 30. Frequent releases build confidence in the release process itself.

## When to Use

- Setting up a new project's CI pipeline
- Adding or modifying automated checks
- Configuring deployment pipelines, including the acceptance stage
- When a change should trigger automated verification
- Debugging CI failures

## The Deployment Pipeline

Every change goes through both stages. The commit stage gates the merge; the acceptance stage decides whether the candidate can ship.

```
Commit (PR or push to main)
    │
    ▼
┌──────────────────────────┐
│ COMMIT STAGE  (< 10 min)  │
│   LINT CHECK              │  eslint, prettier
│   TYPE CHECK              │  tsc --noEmit
│   UNIT TESTS              │  jest/vitest (TDD tests)
│   INTEGRATION             │  thin adapters against real deps
│   BUILD                   │  npm run build
│   SECURITY AUDIT          │  npm audit
│   BUNDLE SIZE             │  bundlesize check
│   → RELEASE CANDIDATE     │  versioned artifact, built once
└──────────────────────────┘
    │ pass
    ▼
┌──────────────────────────┐
│ ACCEPTANCE STAGE (< 1 h)  │
│   PROVISION ENVIRONMENT   │  production-like, defined as code
│   DEPLOY CANDIDATE        │  same artifact, production deploy tooling
│   EXECUTABLE SPECS        │  the acceptance-testing suite
│   OTHER RELEASE TESTS     │  performance, security, resilience
└──────────────────────────┘
    │ green ⇒ releasable
    ▼
  Production deployment of the same artifact
```

- **Build once, promote the artifact.** Every later stage deploys the commit stage's candidate. Rebuilding per environment tests something other than what ships.
- **Deploy the candidate the way production is deployed**, into an environment provisioned as code, so the acceptance stage also tests the deployment and its configuration. A shared, hand-kept "integration staging" environment is a poor substitute: other teams' versions in it make results uncontrollable.
- **The acceptance tests live in the same repository** as the system they specify, and change in the same commits.
- **In-progress specs run too.** A spec for a feature still being built is committed expected-to-fail, as `acceptance-testing` describes: it passes while its scenario still fails, so the stage stays green. The stage goes red the moment the feature works, which says to remove the marker. Never skip or exclude in-progress specs from the stage.
- **Run the suite twice against one deployment**, and in parallel where it can run that way. A test that passes once and fails the second time leaks data between runs: it reuses a name instead of aliasing it, or depends on what an earlier run left behind (`acceptance-testing`, Test Isolation). Run the second pass in the same job, so the check costs no extra environment.
- **No automatic retries.** Don't configure the runner to re-run failed acceptance tests. A test that passes on the second try has found an intermittent bug, most likely in the system, and a retry hides it.
- **Manual exploratory testing is optional.** Do it on a candidate the acceptance stage has already passed, to learn. It is never a gate.

**No gate can be skipped.** If lint fails, fix lint — don't disable the rule. If a test fails, fix the code — don't skip the test.

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

> **Note:** Even for CI-only test databases, use GitHub Secrets for credentials rather than hardcoding values. This builds good habits and prevents accidental reuse of test credentials in other contexts.

### Acceptance Stage

The acceptance job takes the commit stage's artifact, deploys it with the same script production uses, and runs the executable specifications against that deployment. Drivers such as Playwright are an implementation detail of the suite (`acceptance-testing`), not a separate test category.

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: release-candidate-${{ github.sha }}
          path: dist/

  acceptance:
    needs: [quality, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: release-candidate-${{ github.sha }}
          path: dist/
      - name: Provision a production-like environment
        run: ./deploy/provision.sh acceptance-${{ github.run_id }}
      - name: Deploy the release candidate
        run: ./deploy/deploy.sh acceptance-${{ github.run_id }} dist/
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Run the executable specifications
        run: npm run test:acceptance
        env:
          SUT_URL: https://acceptance-${{ github.run_id }}.example.test
      - name: Run them again against the same deployment (isolation check)
        run: npm run test:acceptance
        env:
          SUT_URL: https://acceptance-${{ github.run_id }}.example.test
      - name: Tear down the environment
        if: always()
        run: ./deploy/teardown.sh acceptance-${{ github.run_id }}
```

`deploy/provision.sh` and `deploy/deploy.sh` stand for whatever provisions and deploys production (Terraform, Helm, a platform CLI). The acceptance stage must call the same ones, with acceptance-environment parameters.

## Feeding CI Failures Back to Agents

The power of CI with AI agents is the feedback loop. When CI fails:

```
CI fails
    │
    ▼
Copy the failure output
    │
    ▼
Feed it to the agent:
"The CI pipeline failed with this error:
[paste specific error]
Fix the issue and verify locally before pushing again."
    │
    ▼
Agent fixes → pushes → CI runs again
```

**Key patterns:**

```
Lint failure → Agent runs `npm run lint --fix` and commits
Type error  → Agent reads the error location and fixes the type
Test failure → Agent follows debugging-and-error-recovery skill
Build error → Agent checks config and dependencies
```

## Deployment Strategies

### Preview Deployments

Every PR gets a preview deployment for manual testing:

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

Feature flags decouple deployment from release. Deploy incomplete or risky features behind flags so you can:

- **Ship code without enabling it.** Merge to main early, enable when ready.
- **Roll back without redeploying.** Disable the flag instead of reverting code.
- **Canary new features.** Enable for 1% of users, then 10%, then 100%.
- **Run A/B tests.** Compare behavior with and without the feature.

```typescript
// Simple feature flag pattern
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

**Flag lifecycle:** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Flags that live forever become technical debt — set a cleanup date when you create them.

### Staged Rollouts

```
PR merged to main
    │
    ▼
  Commit stage builds the release candidate
    │
    ▼
  Acceptance stage (auto): deploy candidate, run executable specs
    │ green ⇒ releasable
    ▼
  Production deployment of the same artifact (manual trigger or auto)
    │
    ▼
  Monitor for errors (15-minute window)
    │
    ├── Errors detected → Rollback
    └── Clean → Done
```

### Rollback Plan

Every deployment should be reversible:

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
.env.example       → Committed (template for developers)
.env                → NOT committed (local development)
.env.test           → Committed (test environment, no real secrets)
CI secrets          → Stored in GitHub Secrets / vault
Production secrets  → Stored in deployment platform / vault
```

CI should never have production secrets. Use separate secrets for CI testing.

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

Designate someone responsible for keeping CI green. When the build breaks, the Build Cop's job is to fix or revert — not the person whose change caused the break. This prevents broken builds from accumulating while everyone assumes someone else will fix it.

### PR Checks

- **Required reviews:** At least 1 approval before merge
- **Required status checks:** CI must pass before merge
- **Branch protection:** No force-pushes to main
- **Auto-merge:** If all checks pass and approved, merge automatically

## CI Optimization

When the commit stage exceeds 10 minutes, apply these strategies in order of impact:

```
Slow CI pipeline?
├── Cache dependencies
│   └── Use actions/cache or setup-node cache option for node_modules
├── Run jobs in parallel
│   └── Split lint, typecheck, test, build into separate parallel jobs
├── Only run what changed
│   └── Use path filters to skip unrelated jobs (e.g., skip lint for docs-only PRs)
├── Use matrix builds
│   └── Shard test suites across multiple runners
├── Optimize the test suite
│   └── Move slow system-level tests to the acceptance stage, which runs after every commit stage
└── Use larger runners
    └── GitHub-hosted larger runners or self-hosted for CPU-heavy builds
```

**Self-hosted runners run your repository's code on your machine.** Any job, and any pull request that can trigger one, executes with whatever the runner can reach. Isolate the runner before the first job:

- **No host filesystem.** Check what the VM or container actually mounts. Some local VM tools mount the user's home directory read-write by default, even when the config lists no mounts (colima does).
- **No host network.** A local VM's gateway address often forwards to the host's loopback (on colima, `192.168.5.2` reaches the Mac's `localhost`). Firewall the VM so jobs can't reach databases, admin UIs or other services that trust localhost.
- **No untrusted code.** Don't run workflows from fork pull requests on a self-hosted runner. Keep it to branches and events from people with write access.
- **Prove it.** From inside a job, try reading a host file and connecting to a host-only port. Both should fail.

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
| "CI is too slow" | Optimize the pipeline (see CI Optimization below), don't skip it. A 5-minute pipeline prevents hours of debugging. |
| "This change is trivial, skip CI" | Trivial changes break builds. CI is fast for trivial changes anyway. |
| "The test is flaky, just re-run" | Flaky tests mask real bugs and waste everyone's time. Fix the flakiness. |
| "We'll add CI later" | Projects without CI accumulate broken states. Set it up on day one. |
| "Manual testing is enough" | Manual testing doesn't scale and isn't repeatable. Automate what you can. |
| "Someone checks staging by hand before release" | A manual gate is slow and inconsistent, and decides nothing the acceptance stage can't. Green acceptance stage means releasable; explore by hand afterwards if you want to learn more. |
| "We'll run the E2E suite against the shared staging environment" | Other teams' versions make it uncontrollable and hard to diagnose. Deploy your own candidate into an environment you provision, and fake what lies beyond your boundary. |

## Red Flags

- No CI pipeline in the project
- CI failures ignored or silenced
- Tests disabled in CI to make the pipeline pass
- Production deploys of a candidate the acceptance stage hasn't passed
- A manual verification step gating production
- Rebuilding the artifact for each environment instead of promoting one release candidate
- An acceptance stage that deploys differently from production, or into a hand-kept shared environment
- In-progress acceptance tests skipped or excluded instead of committed expected-to-fail
- Automatic retries of failed acceptance tests
- No rollback mechanism
- Secrets stored in code or CI config files (not secrets manager)
- A self-hosted runner that can read the host's files or reach its localhost services, or that runs fork pull requests
- Long CI times with no optimization effort

## Verification

After setting up or modifying CI:

- [ ] All commit-stage gates are present (lint, types, tests, build, audit), and the stage produces one versioned release candidate
- [ ] Pipeline runs on every PR and push to main
- [ ] Failures block merge (branch protection configured)
- [ ] CI results feed back into the development loop
- [ ] Secrets are stored in the secrets manager, not in code
- [ ] Any self-hosted runner is isolated: no host mounts, no route to the host's loopback services, no fork pull requests, checked from inside a job
- [ ] Deployment has a rollback mechanism
- [ ] The commit stage runs in under 10 minutes
- [ ] An acceptance stage deploys that release candidate into a production-like environment with production deploy tooling, and runs the executable specifications in under an hour
- [ ] Green acceptance stage is what makes a candidate releasable; no manual verification gates production
- [ ] The acceptance suite runs twice against one deployment, and no failed test is retried automatically
