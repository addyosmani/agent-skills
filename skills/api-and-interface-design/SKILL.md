---
name: api-and-interface-design
description: Guides stable API and interface design. Use when designing APIs, module boundaries, or any public interface. Use when creating REST or GraphQL endpoints, defining type contracts between modules, or establishing boundaries between frontend and backend.
---

# API and Interface Design

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

#### Go

```go
// Define request/response types first.
type CreateTaskInput struct {
  Title       string  `json:"title"`
  Description *string `json:"description,omitempty"`
}

type Task struct {
  ID          TaskID    `json:"id"`
  Title       string    `json:"title"`
  Description *string   `json:"description,omitempty"`
  CreatedAt   time.Time `json:"createdAt"`
}

// Consumers define the smallest interface they need, at the point of use.
type taskRepository interface {
  Insert(ctx context.Context, task *Task) error
  ByID(ctx context.Context, id TaskID) (*Task, error)
}

// Return a concrete type; accept an interface.
type Service struct {
  repo taskRepository
}

func NewService(repo taskRepository) *Service {
  return &Service{repo: repo}
}

func (s *Service) CreateTask(ctx context.Context, input CreateTaskInput) (*Task, error) {
  task := &Task{
    ID:          NewTaskID(),
    Title:       input.Title,
    Description: input.Description,
    CreatedAt:   time.Now(),
  }

  if err := s.repo.Insert(ctx, task); err != nil {
    return nil, fmt.Errorf("create task: %w", err)
  }
  return task, nil
}

func (s *Service) Task(ctx context.Context, id TaskID) (*Task, error) {
  task, err := s.repo.ByID(ctx, id)
  if err != nil {
    return nil, fmt.Errorf("load task %s: %w", id, err)
  }
  return task, nil
}

// A consumer that only reads tasks can define its own tiny interface.
type TaskLookup interface {
  Task(ctx context.Context, id TaskID) (*Task, error)
}
```

In Go, prefer **small interfaces defined by the consumer**, keep `context.Context` as the first parameter on request-scoped methods, and follow the proverb: **accept interfaces, return concrete types**.

#### TypeScript

```typescript
// The same contract-first principle applies in TypeScript.
interface TaskAPI {
  createTask(input: CreateTaskInput): Promise<Task>;
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;
  getTask(id: string): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}
```

### 2. Consistent Error Semantics

Pick one error strategy and use it everywhere:

#### Go

```go
var ErrNotFound = errors.New("task not found")

type ValidationError struct {
  Field  string
  Reason string
}

func (e *ValidationError) Error() string {
  return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

type APIError struct {
  Code    string `json:"code"`
  Message string `json:"message"`
  Details any    `json:"details,omitempty"`
}

type ErrorResponse struct {
  Error APIError `json:"error"`
}

func (s *Service) Task(ctx context.Context, id TaskID) (*Task, error) {
  task, err := s.repo.ByID(ctx, id)
  if err != nil {
    if errors.Is(err, sql.ErrNoRows) {
      return nil, ErrNotFound
    }
    return nil, fmt.Errorf("load task %s: %w", id, err)
  }
  return task, nil
}

func handleError(w http.ResponseWriter, err error) {
  w.Header().Set("Content-Type", "application/json")

  var validationErr *ValidationError

  switch {
  case errors.Is(err, ErrNotFound):
    w.WriteHeader(http.StatusNotFound)
    json.NewEncoder(w).Encode(ErrorResponse{
      Error: APIError{
        Code:    "NOT_FOUND",
        Message: "Task not found",
      },
    })
  case errors.As(err, &validationErr):
    w.WriteHeader(http.StatusUnprocessableEntity)
    json.NewEncoder(w).Encode(ErrorResponse{
      Error: APIError{
        Code:    "VALIDATION_ERROR",
        Message: validationErr.Reason,
        Details: map[string]string{"field": validationErr.Field},
      },
    })
  default:
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(ErrorResponse{
      Error: APIError{
        Code:    "INTERNAL_ERROR",
        Message: "An unexpected error occurred",
      },
    })
  }
}
```

In Go, service methods should return explicit `(T, error)` pairs rather than relying on exceptions, and internal layers should wrap errors with context using `fmt.Errorf("...: %w", err)` so callers can preserve the chain with `errors.Is` and `errors.As`.

#### TypeScript

```typescript
// The same consistency principle applies in TypeScript REST APIs.
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

### 3. Validate at Boundaries

Trust internal code. Validate at system edges where external input enters:

#### Go

```go
// Validate at the API boundary
func handleCreateTask(w http.ResponseWriter, r *http.Request) {
  var input CreateTaskInput
  if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
    http.Error(w, "invalid JSON", http.StatusBadRequest)
    return
  }

  // Validate using a validation library
  if err := input.Validate(); err != nil {
    w.WriteHeader(http.StatusUnprocessableEntity)
    json.NewEncoder(w).Encode(ErrorResponse{
      Error: APIError{
        Code:    "VALIDATION_ERROR",
        Message: "Invalid task data",
      },
    })
    return
  }

  // After validation, internal code trusts the types
  task, err := taskService.CreateTask(r.Context(), input)
  if err != nil {
    handleError(w, err)
    return
  }

  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusCreated)
  json.NewEncoder(w).Encode(task)
}

// Validation method on input struct
func (i *CreateTaskInput) Validate() error {
  if i.Title == "" {
    return &ValidationError{Field: "title", Reason: "Title is required"}
  }
  if len(i.Title) > 200 {
    return &ValidationError{Field: "title", Reason: "Title must be ≤ 200 chars"}
  }
  return nil
}
```

#### TypeScript

```typescript
// The same boundary-validation principle applies in TypeScript.
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

#### Go

```go
// Good: Add optional fields using pointers or struct tags
type CreateTaskInput struct {
  Title       string   `json:"title"`
  Description *string  `json:"description,omitempty"`  // Added later, optional
  Priority    *string  `json:"priority,omitempty"`     // Added later, optional (low|medium|high)
  Labels      []string `json:"labels,omitempty"`       // Added later, optional
}

// When parsing JSON, omitted fields are zero-values or nil
// Existing consumers sending { title: "...", description: "..." } still work

// Bad: Change existing field types or remove fields
type CreateTaskInput struct {
  Title string `json:"title"`
  // Description string `json:"description"` // Removed — breaks existing consumers
  Priority int `json:"priority"`  // Changed from string — breaks existing consumers
}
```

#### TypeScript

```typescript
// The same additive approach applies in TypeScript.
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

### 5. Predictable Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params / JSON fields | camelCase on the wire | `?sortBy=createdAt&pageSize=20`, `{ "createdAt": "...", "taskId": "..." }` |
| Go identifiers | MixedCaps, not underscores | `TaskID`, `CreatedAt`, `ListTasksParams` |
| Go getters and methods | No `Get` prefix for accessors; use verbs only for actions | `task.Title()`, `svc.Task(ctx, id)`, `svc.CreateTask(ctx, input)` |
| Go request-scoped methods | `context.Context` is the first parameter | `Task(ctx context.Context, id TaskID)` |
| Go interfaces | Small behavior-based names, often `-er` or a concise noun | `Reader`, `Writer`, `TaskStore`, `TaskLookup` |
| Boolean fields | `is`/`has`/`can` on the wire; Go bool names should still read naturally | `isComplete`, `hasAttachments`, `CanRetry` |
| Enum values | UPPER_SNAKE on the wire when that's the API convention | `"IN_PROGRESS"`, `"COMPLETED"` |

## REST API Patterns

### Resource Design

#### Go (`net/http`)

```go
mux := http.NewServeMux()

mux.HandleFunc("GET /api/tasks", handleListTasks)
mux.HandleFunc("POST /api/tasks", handleCreateTask)
mux.HandleFunc("GET /api/tasks/{id}", handleTask)
mux.HandleFunc("PATCH /api/tasks/{id}", handleUpdateTask)
mux.HandleFunc("DELETE /api/tasks/{id}", handleDeleteTask)

// Sub-resource
mux.HandleFunc("GET /api/tasks/{id}/comments", handleListTaskComments)
mux.HandleFunc("POST /api/tasks/{id}/comments", handleCreateTaskComment)
```

The same resource model should hold regardless of implementation language:

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

#### Go

```go
type Pagination struct {
  Page       int `json:"page"`
  PageSize   int `json:"pageSize"`
  TotalItems int `json:"totalItems"`
  TotalPages int `json:"totalPages"`
}

type ListTasksResponse struct {
  Data       []Task     `json:"data"`
  Pagination Pagination `json:"pagination"`
}

// GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

#### TypeScript

```typescript
// The same response shape applies in TypeScript clients or servers.
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

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

#### Go

```go
type UpdateTaskInput struct {
  Title       *string `json:"title,omitempty"`
  Description *string `json:"description,omitempty"`
}

// Only provided fields change; everything else is preserved.
func (s *Service) UpdateTask(ctx context.Context, id TaskID, input UpdateTaskInput) (*Task, error) {
  task, err := s.repo.ByID(ctx, id)
  if err != nil {
    return nil, fmt.Errorf("load task %s: %w", id, err)
  }
  if input.Title != nil {
    task.Title = *input.Title
  }
  if input.Description != nil {
    task.Description = input.Description
  }
  return task, nil
}
```

#### TypeScript

```typescript
// The same PATCH contract applies in TypeScript.
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## Interface Design Patterns

### Use Discriminated Unions for Variants

#### Go

```go
// Good: Use an interface and concrete types for each variant
type TaskStatus interface{ isTaskStatus() }

type PendingStatus struct{}
func (PendingStatus) isTaskStatus() {}

type InProgressStatus struct {
  Assignee  string
  StartedAt time.Time
}
func (InProgressStatus) isTaskStatus() {}

type CompletedStatus struct {
  CompletedAt time.Time
  CompletedBy string
}
func (CompletedStatus) isTaskStatus() {}

type CancelledStatus struct {
  Reason string
  CancelledAt time.Time
}
func (CancelledStatus) isTaskStatus() {}

// Consumer gets type safety via type assertion
func GetStatusLabel(status TaskStatus) string {
  switch s := status.(type) {
  case PendingStatus:
    return "Pending"
  case InProgressStatus:
    return fmt.Sprintf("In progress (%s)", s.Assignee)
  case CompletedStatus:
    return fmt.Sprintf("Done on %s", s.CompletedAt)
  case CancelledStatus:
    return fmt.Sprintf("Cancelled: %s", s.Reason)
  default:
    return "Unknown"
  }
}
```

#### TypeScript

```typescript
// The same explicit-variant principle applies in TypeScript.
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

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

#### Go

```go
// Input: what the caller provides
type CreateTaskInput struct {
  Title       string `json:"title" validate:"required"`
  Description *string `json:"description"`
}

// Output: what the system returns (includes server-generated fields)
type Task struct {
  ID        string    `json:"id"`
  Title     string    `json:"title"`
  Description *string   `json:"description"`
  CreatedAt time.Time `json:"createdAt"`
  UpdatedAt time.Time `json:"updatedAt"`
  CreatedBy string    `json:"createdBy"`
}

// Separate input from output by type to prevent confusion
// Input structs include only user-provided fields
// Output structs include server-generated fields (IDs, timestamps, audit fields)
```

#### TypeScript

```typescript
// The same separation applies in TypeScript.
interface CreateTaskInput {
  title: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Use Strong Types for IDs

#### Go

```go
// Define strong ID types to prevent mixing
type TaskID string
type UserID string

// The compiler prevents accidental use of the wrong type
func Task(ctx context.Context, id TaskID) (*Task, error) {
  // id is a TaskID, not a string or UserID
}

// To convert from string (e.g., from URL):
func handleTask(w http.ResponseWriter, r *http.Request) {
  idStr := r.PathValue("id")
  id := TaskID(idStr)  // Explicit conversion
  task, err := Task(r.Context(), id)
}
```

#### TypeScript

```typescript
// The same strong-type idea applies in TypeScript.
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

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

## Red Flags

- Endpoints that return different shapes depending on conditions
- Inconsistent error formats across endpoints
- Validation scattered throughout internal code instead of at boundaries
- Breaking changes to existing fields (type changes, removals)
- List endpoints without pagination
- Verbs in REST URLs (`/api/createTask`, `/api/getUsers`)
- Third-party API responses used without validation or sanitization

## Verification

After designing an API:

- [ ] Every endpoint has typed input and output schemas
- [ ] Error responses follow a single consistent format
- [ ] Validation happens at system boundaries only
- [ ] List endpoints support pagination
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] API documentation or types are committed alongside the implementation
