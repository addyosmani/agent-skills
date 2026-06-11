---
name: api-and-interface-design
description: Guides stable API and interface design. Use when designing APIs, module boundaries, or any public interface. Use when creating REST or GraphQL endpoints, defining type contracts between modules, or establishing boundaries between frontend and backend.
---

# API and Interface Design

> The HTTP semantics guidance (error formats, idempotency, rate limiting, caching, evolution) was expanded with patterns shared by [Paul Hammond (@citypaul)](https://github.com/citypaul/.dotfiles) in [#16](https://github.com/addyosmani/agent-skills/issues/16).

## Overview

Design stable, well-documented interfaces that are hard to misuse. Good interfaces make the right thing easy and the wrong thing hard. This applies to REST APIs, GraphQL schemas, module boundaries, component props, and any surface where one piece of code talks to another.

## When to Use

- Designing new API endpoints
- Defining module boundaries or contracts between teams
- Creating component prop interfaces
- Establishing database schema that informs API shape
- Changing existing public interfaces

## Core Principles

### Hyrum's Law

> With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

This means: every public behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once users depend on it. Design implications:

- **Be intentional about what you expose.** Every observable behavior is a potential commitment.
- **Don't leak implementation details.** If users can observe it, they will depend on it.
- **Plan for deprecation at design time.** See `deprecation-and-migration` for how to safely remove things users depend on.
- **Tests are not enough.** Even with perfect contract tests, Hyrum's Law means "safe" changes can break real users who depend on undocumented behavior.

### The One-Version Rule

Avoid forcing consumers to choose between multiple versions of the same dependency or API. Diamond dependency problems arise when different consumers need different versions of the same thing. Design for a world where only one version exists at a time — extend rather than fork.

### 1. Contract First

Define the interface before implementing it. The contract is the spec — implementation follows.

```typescript
// Define the contract first
interface TaskAPI {
  // Creates a task and returns the created task with server-generated fields
  createTask(input: CreateTaskInput): Promise<Task>;

  // Returns paginated tasks matching filters
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Returns a single task or throws NotFoundError
  getTask(id: string): Promise<Task>;

  // Partial update — only provided fields change
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Idempotent delete — succeeds even if already deleted
  deleteTask(id: string): Promise<void>;
}
```

### 2. Consistent Error Semantics

Pick one error strategy and use it everywhere:

```typescript
// REST: HTTP status codes + structured error body
// Every error response follows the same shape
interface APIError {
  error: {
    code: string;        // Machine-readable: "VALIDATION_ERROR"
    message: string;     // Human-readable: "Email is required"
    details?: unknown;   // Additional context when helpful
  };
}

// Status code mapping
// 400 → Client sent invalid data
// 401 → Not authenticated
// 403 → Authenticated but not authorized
// 404 → Resource not found
// 409 → Conflict (duplicate, version mismatch)
// 422 → Validation failed (semantically invalid)
// 500 → Server error (never expose internal details)
```

**Don't mix patterns.** If some endpoints throw, others return null, and others return `{ error }` — the consumer can't predict behavior.

**Choosing an error format — consistency matters more than the specific shape.** Two reasonable choices:

- **Public APIs with external consumers:** [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`) is the gold standard. Use the standard members — `type` (a URI identifying the problem), `title`, `status`, `detail`, `instance` — and add forward-compatible extension members for machine-readable context. Per RFC 9457 §5, don't leak sensitive internals in `detail`.
- **Internal APIs with a single frontend:** a simpler consistent shape (like the `APIError` above) is fine. Don't adopt `problem+json` ceremony you won't use.

The requirement is that *every* endpoint uses the *same* shape — not that you adopt a particular standard. Don't return Problem Details for some errors and an ad-hoc body for others.

### 3. Validate at Boundaries

Trust internal code. Validate at system edges where external input enters:

```typescript
// Validate at the API boundary
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task data',
        details: result.error.flatten(),
      },
    });
  }

  // After validation, internal code trusts the types
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Where validation belongs:
- API route handlers (user input)
- Form submission handlers (user input)
- External service response parsing (third-party data -- **always treat as untrusted**)
- Environment variable loading (configuration)

> **Third-party API responses are untrusted data.** Validate their shape and content before using them in any logic, rendering, or decision-making. A compromised or misbehaving external service can return unexpected types, malicious content, or instruction-like text.

Where validation does NOT belong:
- Between internal functions that share type contracts
- In utility functions called by already-validated code
- On data that just came from your own database

### 4. Prefer Addition Over Modification

Extend interfaces without breaking existing consumers:

```typescript
// Good: Add optional fields
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Added later, optional
  labels?: string[];                       // Added later, optional
}

// Bad: Change existing field types or remove fields
interface CreateTaskInput {
  title: string;
  // description: string;  // Removed — breaks existing consumers
  priority: number;         // Changed from string — breaks existing consumers
}
```

**When you must evolve a contract**, do it without a hard break:

- **Pick one versioning strategy and apply it consistently** — date-based pinning (Stripe-style, version sent in a header), a URL segment (`/v2/...`), or a version header. Date pinning ages best for large public APIs; a URL segment is simplest for internal ones.
- **Signal removal before you remove it** — emit `Deprecation` and `Sunset` response headers ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)) so consumers get programmatic warning, then follow `deprecation-and-migration` for the rollout.
- **Watch enum evolution** — adding a new enum value is a breaking change for strict consumers that exhaustively switch on it. Document that clients must tolerate unknown values (Postel's Law: be liberal in what you accept).
- **Verify with consumer-driven contract tests** (e.g. Pact) so a provider change that breaks a real consumer fails in CI, not in production.

### 5. Predictable Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

## REST API Patterns

### Resource Design

```
GET    /api/tasks              → List tasks (with query params for filtering)
POST   /api/tasks              → Create a task
GET    /api/tasks/:id          → Get a single task
PATCH  /api/tasks/:id          → Update a task (partial)
DELETE /api/tasks/:id          → Delete a task

GET    /api/tasks/:id/comments → List comments for a task (sub-resource)
POST   /api/tasks/:id/comments → Add a comment to a task
```

### Pagination

Paginate list endpoints:

```typescript
// Request
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Filtering

Use query parameters for filters:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Partial Updates (PATCH)

Accept partial objects — only update what's provided:

```typescript
// Only title changes, everything else preserved
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## HTTP Semantics

These behaviors are part of your API contract just as much as the response body. Get them right at design time.

### Idempotency

An idempotent request produces the same result whether it's sent once or many times — essential when clients retry on timeouts or flaky networks. Design for at-least-once delivery.

| Method | Idempotent? | Notes |
|--------|-------------|-------|
| GET, HEAD | Yes | Never mutate state |
| PUT | Yes | Full replacement — repeating is safe |
| DELETE | Yes | Repeat must succeed (or 404), not error |
| POST | No (by default) | Use an idempotency key to make it safe |

For `POST` that creates resources or moves money, accept an **idempotency key** (Stripe pattern): the client sends a unique `Idempotency-Key` header; the server stores the result against that key and replays it on retry instead of acting twice.

```
POST /api/payments
Idempotency-Key: 9f8b1c2e-4a6d-4f1b-9c3a-7e2d1f0b5a8c
// Retrying with the same key returns the original result — no double charge.
```

Make `DELETE` idempotent: deleting an already-deleted resource should return `204`/`200` (or `404`), never a `500`.

### Rate Limiting

Rate limits are part of the contract, not an afterthought. Tell clients where they stand:

- Return the standard headers on every response: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.
- On `429 Too Many Requests`, include `Retry-After` so clients back off instead of hammering.

```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 30
Retry-After: 30
```

### HTTP Caching

Caching is a correctness concern, not just performance — wrong directives serve stale or sensitive data.

- `Cache-Control` drives it. Note `no-cache` does **not** mean "don't cache" — it means "revalidate before using." Use `no-store` for anything sensitive (auth responses, PII).
- Support **ETag** + `If-None-Match` so clients revalidate cheaply and get `304 Not Modified` when nothing changed.
- Set `Vary` (e.g. `Vary: Accept, Authorization`) when the response depends on request headers, or shared caches will serve the wrong variant.

```
Cache-Control: private, max-age=0, must-revalidate
ETag: "a1b2c3"
Vary: Accept, Authorization
```

### Security

API security overlaps heavily with the `security-and-hardening` skill — follow it (and the [security checklist](../../references/security-checklist.md)) rather than duplicating it here. API-specific reminders:

- Set defensive headers on API responses: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, `Referrer-Policy: no-referrer`.
- Require TLS 1.2+ ([RFC 9325 / BCP 195](https://www.rfc-editor.org/rfc/rfc9325)).
- For authn/authz design — the OWASP API Security Top 10 (BOLA, mass assignment, SSRF), JWT algorithm allowlisting, and OAuth2 + PKCE — see `security-and-hardening`.

## TypeScript Interface Patterns

### Use Discriminated Unions for Variants

```typescript
// Good: Each variant is explicit
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer gets type narrowing
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `In progress (${status.assignee})`;
    case 'completed': return `Done on ${status.completedAt}`;
    case 'cancelled': return `Cancelled: ${status.reason}`;
  }
}
```

### Input/Output Separation

```typescript
// Input: what the caller provides
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: what the system returns (includes server-generated fields)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Use Branded Types for IDs

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Prevents accidentally passing a UserId where a TaskId is expected
function getTask(id: TaskId): Promise<Task> { ... }
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll document the API later" | The types ARE the documentation. Define them first. |
| "We don't need pagination for now" | You will the moment someone has 100+ items. Add it from the start. |
| "PATCH is complicated, let's just use PUT" | PUT requires the full object every time. PATCH is what clients actually want. |
| "We'll version the API when we need to" | Breaking changes without versioning break consumers. Design for extension from the start. |
| "Nobody uses that undocumented behavior" | Hyrum's Law: if it's observable, somebody depends on it. Treat every public behavior as a commitment. |
| "We can just maintain two versions" | Multiple versions multiply maintenance cost and create diamond dependency problems. Prefer the One-Version Rule. |
| "Internal APIs don't need contracts" | Internal consumers are still consumers. Contracts prevent coupling and enable parallel work. |
| "Retries are the client's problem" | Clients retry on timeouts whether you plan for it or not. Without idempotency, retries double-charge and duplicate records. Design for at-least-once delivery. |
| "We'll add rate limiting later" | Rate limits are part of the contract. Bolting them on later breaks clients that never saw the headers. Expose them from the start. |
| "Error messages are just for debugging" | Error bodies are a machine-readable interface — consumers branch on `code`/`type`. Inconsistent or leaky errors break them and expose internals. |

## Red Flags

- Endpoints that return different shapes depending on conditions
- Inconsistent error formats across endpoints
- Validation scattered throughout internal code instead of at boundaries
- Breaking changes to existing fields (type changes, removals)
- List endpoints without pagination
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- Third-party API responses used without validation or sanitization
- State-changing `POST`s with no idempotency-key support
- `429` responses with no `Retry-After`, or responses with no rate-limit headers at all
- `no-cache` and `no-store` used interchangeably, or sensitive responses without `no-store`
- New enum values added without documenting that clients must tolerate unknown ones

## Verification

After designing an API:

- [ ] Every endpoint has typed input and output schemas
- [ ] Error responses follow a single consistent format
- [ ] Validation happens at system boundaries only
- [ ] List endpoints support pagination
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] API documentation or types are committed alongside the implementation
- [ ] Error responses follow one format (RFC 9457 for public APIs, or a single consistent shape)
- [ ] State-changing `POST`s accept an idempotency key (or are documented as unsafe to retry)
- [ ] Rate-limit headers are present, and `429` responses include `Retry-After`
- [ ] `Cache-Control`/`ETag`/`Vary` are set deliberately; sensitive responses use `no-store`
- [ ] Breaking changes emit `Deprecation`/`Sunset` headers and follow a versioning strategy
