# Testing Patterns Reference

Quick reference for common testing patterns across the stack. Use alongside the `test-driven-development` skill.

## Table of Contents

- [Test Structure (Arrange-Act-Assert)](#test-structure-arrange-act-assert)
- [Test Naming Conventions](#test-naming-conventions)
- [Common Assertions](#common-assertions)
- [Test Planner](#test-planner)
- [Layer Map](#layer-map)
- [Unit Testing](#unit-testing)
- [Mocking Patterns](#mocking-patterns)
- [Component Testing](#component-testing)
- [Accessibility Testing](#accessibility-testing)
- [Frontend Integration Testing](#frontend-integration-testing)
- [API Testing](#api-testing)
- [Contract Testing](#contract-testing)
- [Backend Integration Testing](#backend-integration-testing)
- [E2E / System Testing (Playwright)](#e2e--system-testing-playwright)
- [Test Data and Fixtures](#test-data-and-fixtures)
- [Flaky Test Triage](#flaky-test-triage)
- [Test Anti-Patterns](#test-anti-patterns)

## Test Structure (Arrange-Act-Assert)

```typescript
it('describes expected behavior', () => {
  // Arrange: Set up test data and preconditions
  const input = { title: 'Test Task', priority: 'high' };

  // Act: Perform the action being tested
  const result = createTask(input);

  // Assert: Verify the outcome
  expect(result.title).toBe('Test Task');
  expect(result.priority).toBe('high');
  expect(result.status).toBe('pending');
});
```

## Test Naming Conventions

```typescript
// Pattern: [unit] [expected behavior] [condition]
describe('TaskService.createTask', () => {
  it('creates a task with default pending status', () => {});
  it('throws ValidationError when title is empty', () => {});
  it('trims whitespace from title', () => {});
  it('generates a unique ID for each task', () => {});
});
```

## Common Assertions

```typescript
// Equality
expect(result).toBe(expected);           // Strict equality (===)
expect(result).toEqual(expected);        // Deep equality (objects/arrays)
expect(result).toStrictEqual(expected);  // Deep equality + type matching

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeDefined();
expect(result).toBeUndefined();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThanOrEqual(10);
expect(result).toBeCloseTo(0.3, 5);      // Floating point

// Strings
expect(result).toMatch(/pattern/);
expect(result).toContain('substring');

// Arrays / Objects
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(object).toHaveProperty('key', 'value');

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(ValidationError);
expect(() => fn()).toThrow('specific message');

// Async
await expect(asyncFn()).resolves.toBe(value);
await expect(asyncFn()).rejects.toThrow(Error);
```

## Test Planner

Before writing tests, keep planning dimensions separate:

| Dimension | Use For | Do Not Put Here |
|---|---|---|
| Changed surfaces | Code/data areas touched by the change | Test layer names like E2E |
| Affected contracts | Public schemas, generated clients, events, API compatibility | Backend implementation details |
| Test layer | Where behavior should be proven | Quality concerns like accessibility or security |
| Case design technique | How representative cases are derived | Test layer names or execution commands |
| Quality concerns | Extra risk dimensions to verify | Surface names like frontend/backend |
| Execution size | Runtime cost and CI placement | User-visible behavior categories |

Case-design techniques may combine, but they remain separate from operating mode, risk heuristics, and exit criteria. Use `Direct example` for a single concrete behavior and `Regression reproduction` for a known defect instead of inventing a formal technique. See `references/test-design-techniques.md` for selectors and required artifacts.

### Changed Surfaces

| Surface | Examples |
|---|---|
| Frontend UI | components, pages, forms, modals |
| Frontend state/router | stores, route loaders, client-side caching |
| Backend endpoint | route handler, controller, middleware |
| Backend service/domain | business rules, orchestration, domain services |
| Shared schema/types/generated client | OpenAPI, GraphQL schema, protobuf, typed SDK |
| Persistence | database, cache, filesystem, migrations |
| Async infrastructure | queue, worker, cron, scheduler |
| External integration | payment provider, email service, third-party API |

### Quality Concerns

Quality concerns cross layers. Verify them at the lowest layer that proves the risk, then add broader tests only when needed.

| Concern | First places to check |
|---|---|
| Accessibility | component role/name/focus, frontend integration state, E2E keyboard journey |
| Security | unit validation, API auth/authorization, integration with secrets or storage |
| Performance | unit algorithm cost, API/query timing, browser performance trace |
| Visual regression | component screenshot, page screenshot, browser comparison |
| Observability | structured logs, metrics, traces, alert behavior |
| Migration safety | unit transforms, migration dry run, backend integration with test data |

## Layer Map

Use the lowest layer that proves the behavior. This table is only the test-layer axis.

| Layer | Proves | Typical tools |
|---|---|---|
| Unit | Pure behavior in one function/module | Jest, Vitest, pytest, go test |
| Component | One UI unit renders and reacts correctly | Testing Library, Vue Test Utils |
| Frontend Integration | UI modules cooperate without a real backend | Testing Library + router/store + MSW |
| API | Backend HTTP endpoint behavior | supertest, httpx, requests |
| Contract | Consumer/provider compatibility | Pact, OpenAPI validators, generated client checks |
| Backend Integration | Service dependencies cooperate | test database, testcontainers, local queues |
| E2E / System | Critical user journey works through the app | Playwright, Cypress |

## Unit Testing

Keep unit tests small, deterministic, and focused on behavior:

```typescript
describe('calculateInvoiceTotal', () => {
  it('rounds line items before summing tax-inclusive total', () => {
    const invoice = {
      taxRate: 0.0825,
      items: [
        { quantity: 2, unitPrice: 10.005 },
        { quantity: 1, unitPrice: 4.335 },
      ],
    };

    expect(calculateInvoiceTotal(invoice)).toBe(26.55);
  });

  it('returns zero for an invoice with no items', () => {
    expect(calculateInvoiceTotal({ taxRate: 0.0825, items: [] })).toBe(0);
  });
});
```

Good unit tests cover happy paths, empty input, boundaries, and error paths. They should not require network, disk, database, wall-clock timing, or a real browser.

## Mocking Patterns

### Mock Functions

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'test' });
mockFn.mockImplementation((x) => x * 2);

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

### Mock Modules

```typescript
// Mock an entire module
jest.mock('./database', () => ({
  query: jest.fn().mockResolvedValue([{ id: 1, title: 'Test' }]),
}));

// Mock specific exports
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  generateId: jest.fn().mockReturnValue('test-id'),
}));
```

### Mock at Boundaries Only

```
Mock these:                    Don't mock these:
├── Database calls             ├── Internal utility functions
├── HTTP requests              ├── Business logic
├── File system operations     ├── Data transformations
├── External API calls         ├── Validation functions
└── Time/Date (when needed)    └── Pure functions
```

## Component Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('TaskForm', () => {
  it('submits the form with entered data', async () => {
    const onSubmit = jest.fn();
    render(<TaskForm onSubmit={onSubmit} />);

    // Find elements by accessible role/label (not test IDs)
    await screen.findByRole('textbox', { name: /title/i });
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), {
      target: { value: 'New Task' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ title: 'New Task' });
    });
  });

  it('shows validation error for empty title', async () => {
    render(<TaskForm onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });
});
```

## Accessibility Testing

Accessibility is testable behavior. Prefer the lowest layer that catches the regression, then add browser evidence when real rendering, tab order, focus trapping, or contrast matters.

### Component Semantics

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('marks the email validation error as an accessible alert', async () => {
  render(<SettingsForm />);

  expect(screen.getByRole('textbox', { name: /email/i })).toBeRequired();
  expect(screen.getByRole('button', { name: /save settings/i })).toBeEnabled();

  await userEvent.click(screen.getByRole('button', { name: /save settings/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/email is required/i);
});
```

This proves the component exposes the expected role, name, state, and alert markup. It does not prove what a screen reader announces.

### Automated Violation Scan

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no obvious accessibility violations', async () => {
  const { container } = render(<SettingsForm />);

  expect(await axe(container)).toHaveNoViolations();
});
```

### Browser Keyboard Flow

```typescript
import { test, expect } from '@playwright/test';

test('settings modal keeps keyboard focus predictable', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /open settings/i }).click();

  await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /email/i })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /save settings/i })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /open settings/i })).toBeFocused();
});
```

Use axe, pa11y, or Lighthouse for broad violation scans, but do not rely on automated scans alone. Browser tests can verify keyboard paths, focus, and accessibility-tree exposure. Claims about actual announcements or assistive-technology interoperability require evidence from the target browser/AT combination; otherwise add an explicit manual verification handoff. See `references/accessibility-checklist.md` for the full checklist.

## Frontend Integration Testing

Use frontend integration tests when multiple frontend modules must cooperate: page components, routing, stores, and API boundaries. Mock the network at the boundary; do not mock internal components just to make assertions easier.

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const server = setupServer(
  http.get('/api/tasks', () => HttpResponse.json([{ id: '1', title: 'Ship it' }])),
  http.post('/api/tasks', async ({ request }) => {
    const body = (await request.json()) as { title: string };
    return HttpResponse.json({ id: '2', title: body.title }, { status: 201 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('loads tasks and adds a new task from the page', async () => {
  render(<TaskPage />);

  expect(await screen.findByText('Ship it')).toBeInTheDocument();

  await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'Write tests');
  await userEvent.click(screen.getByRole('button', { name: /create/i }));

  expect(await screen.findByText('Write tests')).toBeInTheDocument();
});
```

Cover loading, empty, error, retry, and optimistic-update states here. Save real browser rendering and full authentication flows for E2E.

## API Testing

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task' })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      title: 'Test Task',
      status: 'pending',
    });
  });

  it('returns 422 for invalid input', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: '' })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without authentication', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Test' })
      .expect(401);
  });
});
```

API tests are pure backend interface tests. They run against the backend app or service and prove endpoint behavior: method, route, auth, status codes, validation, response body, and stable error shapes. They do not prove frontend/backend compatibility unless a shared contract is also verified.

## Contract Testing

Contract tests prove that consumers and providers agree on the API shape. Use them when frontend and backend evolve independently, when generated clients depend on OpenAPI, or when multiple consumers share one backend.

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { TaskClient } from '../src/task-client';

const provider = new PactV3({ consumer: 'web-app', provider: 'tasks-api' });

it('web app can fetch a task from the tasks API contract', async () => {
  provider
    .given('a task exists')
    .uponReceiving('a request for a task')
    .withRequest({ method: 'GET', path: '/api/tasks/1' })
    .willRespondWith({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        id: MatchersV3.string('1'),
        title: MatchersV3.string('Ship it'),
        status: MatchersV3.string('pending'),
      },
    });

  await provider.executeTest(async (mockServer) => {
    const client = new TaskClient(mockServer.url);
    await expect(client.getTask('1')).resolves.toMatchObject({
      id: '1',
      title: 'Ship it',
    });
  });
});
```

Keep contract tests about compatibility, not backend implementation. Backend API tests can pass while a frontend contract still breaks because a field was renamed, made optional, or changed type.

## Backend Integration Testing

Use backend integration tests for service boundaries that must cooperate with real infrastructure substitutes: database, cache, queue, filesystem, or a local service emulator.

```typescript
describe('TaskService.completeTask', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db('tasks').truncate();
  });

  it('marks a task completed and persists the completion timestamp', async () => {
    const task = await taskRepository.create({ title: 'Test integration' });

    const completed = await taskService.completeTask(task.id);
    const persisted = await taskRepository.findById(task.id);

    expect(completed.status).toBe('completed');
    expect(persisted?.completedAt).toBeInstanceOf(Date);
  });
});
```

Keep these tests isolated: reset state per test, use deterministic fixtures, run migrations explicitly, and avoid sharing mutable test data between tests.

## E2E / System Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can create and complete a task', async ({ page }) => {
  // Navigate and authenticate
  await page.goto('/');
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
  await page.getByLabel(/password/i).fill('testpass123');
  await page.getByRole('button', { name: /log in/i }).click();

  // Create a task
  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByRole('textbox', { name: /title/i }).fill('Buy groceries');
  await page.getByRole('button', { name: /create/i }).click();

  // Verify task appears
  const task = page.getByRole('listitem', { name: /buy groceries/i });
  await expect(task).toBeVisible();

  // Complete the task
  await task.getByRole('checkbox', { name: /complete buy groceries/i }).check();
  await expect(task).toHaveCSS('text-decoration-line', 'line-through');
});
```

E2E tests should cover only the user journeys that must not break. Use stable test accounts or seeded data, prefer role/label locators, and upload trace, screenshot, and video artifacts on failure.

## Test Data and Fixtures

- Prefer explicit per-test setup over shared global fixtures.
- Use builders for verbose objects, but keep important values visible in the test.
- Reset databases, queues, caches, and mocked network handlers between tests.
- Seed only the data required for the behavior under test.
- Keep credentials, tokens, and production data out of fixtures.

## Flaky Test Triage

When a test is flaky, fix the uncertainty instead of re-running until it passes:

| Symptom | Likely cause | Fix |
|---|---|---|
| Passes alone, fails in suite | Shared state or order dependence | Reset state, remove globals, run in isolation |
| Fails on CI only | Environment or timing difference | Pin versions, inspect logs, remove timing assumptions |
| Random timeout | Race condition or missing wait condition | Wait on observable state, not arbitrary sleeps |
| E2E click misses target | Layout shift or unstable locator | Use role/label locators, wait for stable UI state |
| API test sometimes sees old data | Transaction/cache leakage | Isolate DB state and clear caches per test |

## Test Anti-Patterns

| Anti-Pattern | Problem | Better Approach |
|---|---|---|
| Testing implementation details | Breaks on refactor | Test inputs/outputs |
| Snapshot everything | No one reviews snapshot diffs | Assert specific values |
| Shared mutable state | Tests pollute each other | Setup/teardown per test |
| Testing third-party code | Wastes time, not your bug | Mock the boundary |
| Skipping tests to pass CI | Hides real bugs | Fix or delete the test |
| Using `test.skip` permanently | Dead code | Remove or fix it |
| Overly broad assertions | Doesn't catch regressions | Be specific |
| No async error handling | Swallowed errors, false passes | Always `await` async tests |
