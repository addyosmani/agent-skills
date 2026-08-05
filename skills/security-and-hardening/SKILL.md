---
name: security-and-hardening
description: Hardens code against vulnerabilities. Use when handling user input, authentication, data storage, or external integrations. Use when building any feature that accepts untrusted data, manages user sessions, or interacts with third-party services.
---

# Security and Hardening

## Overview

Security-first development practices for web applications. Treat every external input as hostile, every secret as sacred, and every authorization check as mandatory. Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

## When to Use

- Building anything that accepts user input
- Implementing authentication or authorization
- Storing or transmitting sensitive data
- Integrating with external APIs or services
- Adding file uploads, webhooks, or callbacks
- Handling payment or PII data

## Process: Threat Model First

Controls bolted on without a threat model are guesses. Before hardening, spend five minutes thinking like an attacker:

1. **Map the trust boundaries.** Where does untrusted data cross into your system? HTTP requests, form fields, file uploads, webhooks, third-party APIs, message queues, and **LLM output**. Every boundary is attack surface.
2. **Name the assets.** What's worth stealing or breaking? Credentials, PII, payment data, admin actions, money movement.
3. **Run STRIDE over each boundary** — a quick lens, not a ceremony:

| Threat | Ask | Typical mitigation |
|---|---|---|
| **S**poofing | Can someone impersonate a user/service? | Authentication, signature verification |
| **T**ampering | Can data be altered in transit or at rest? | Integrity checks, parameterized queries, HTTPS |
| **R**epudiation | Can an action be denied later? | Audit logging of security events |
| **I**nformation disclosure | Can data leak? | Encryption, field allowlists, generic errors |
| **D**enial of service | Can it be overwhelmed? | Rate limiting, input size caps, timeouts |
| **E**levation of privilege | Can a user gain rights they shouldn't? | Authorization checks, least privilege |

4. **Write abuse cases next to use cases.** For each feature, ask "how would I misuse this?" — then make that your first test.

If you can't name the trust boundaries for a feature, you're not ready to secure it. This is OWASP **A04: Insecure Design** — most breaches begin in design, not code.

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary (API routes, form handlers)
- **Parameterize all database queries** — never concatenate user input into SQL
- **Encode output** to prevent XSS (use framework auto-escaping, don't bypass it)
- **Use HTTPS** for all external communication
- **Hash passwords** with bcrypt/scrypt/argon2 (never store plaintext)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run the detected package manager's native audit** against the committed lockfile before every release

### Ask First (Requires Human Approval)

- Adding new authentication flows or changing auth logic
- Storing new categories of sensitive data (PII, payment info)
- Adding new external service integrations
- Changing CORS configuration
- Adding file upload handlers
- Modifying rate limiting or throttling
- Granting elevated permissions or roles

### Never Do

- **Never commit secrets** to version control (API keys, passwords, tokens)
- **Never log sensitive data** (passwords, tokens, full credit card numbers)
- **Never trust client-side validation** as a security boundary
- **Never disable security headers** for convenience
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in client-accessible storage** (localStorage for auth tokens)
- **Never expose stack traces** or internal error details to users

## OWASP Top 10 Prevention Patterns

These are prevention patterns, not a ranking. For the 2021 ordering, see the quick-reference table in `references/security-checklist.md`.

### Injection (SQL, NoSQL, OS Command)

#### Go

```go
// BAD: SQL injection via string concatenation
query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID)

// GOOD: Parameterized query with stdlib database/sql
var user User
err := db.QueryRow("SELECT * FROM users WHERE id = ?", userID).Scan(&user.ID, &user.Name)

// GOOD: Parameterized with sqlc (type-safe SQL code generation)
user, err := queries.GetUserByID(ctx, userID)

// GOOD: Parameterized with GORM (ORM)
var user User
result := db.Where("id = ?", userID).First(&user)
```

#### TypeScript

```typescript
// BAD: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM with parameterized input
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Broken Authentication

#### Go

```go
// Password hashing with bcrypt
import "golang.org/x/crypto/bcrypt"

const saltRounds = 12
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plaintext), saltRounds)
if err != nil {
  return fmt.Errorf("hash password: %w", err)
}

// Verify password
err = bcrypt.CompareHashAndPassword(hashedPassword, []byte(plaintext))
if err != nil {
  return fmt.Errorf("invalid password")
}

// Session management with secure cookies
import "net/http"

http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
  // After successful auth:
  cookie := &http.Cookie{
    Name:     "session",
    Value:    sessionToken,
    HttpOnly: true,        // Not accessible via JavaScript
    Secure:   true,        // HTTPS only
    SameSite: http.SameSiteLaxMode,  // CSRF protection
    MaxAge:   24 * 60 * 60, // 24 hours
    Path:     "/",
  }
  http.SetCookie(w, cookie)
})
```

#### TypeScript

```typescript
// Password hashing
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;
const hashedPassword = await hash(plaintext, SALT_ROUNDS);
const isValid = await compare(plaintext, hashedPassword);

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET,  // From environment, not code
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Not accessible via JavaScript
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));
```

### Cross-Site Scripting (XSS)

#### Go

```go
// BAD: Rendering user input as HTML
fmt.Fprintf(w, "<div>%s</div>", userInput)  // XSS vulnerability

// GOOD: Use html/template with automatic escaping
import "html/template"

tmpl := template.Must(template.New("page").Parse("<div>{{ . }}</div>"))
tmpl.Execute(w, userInput)  // Automatically HTML-escaped

// GOOD: Explicitly escape strings
import "html"
safe := html.EscapeString(userInput)
fmt.Fprintf(w, "<div>%s</div>", safe)
```

#### TypeScript

```typescript
// BAD: Rendering user input as HTML
element.innerHTML = userInput;

// GOOD: Use framework auto-escaping (React does this by default)
return <div>{userInput}</div>;

// If you MUST render HTML, sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Broken Access Control

#### Go

```go
// Always check authorization, not just authentication
func handleUpdateTask(w http.ResponseWriter, r *http.Request) {
  userID := r.Context().Value("userID").(string)
  taskID := r.PathValue("id")
  
  task, err := taskService.FindByID(r.Context(), taskID)
  if err != nil {
    http.Error(w, "task not found", http.StatusNotFound)
    return
  }

  // Check that the authenticated user owns this resource
  if task.OwnerID != userID {
    http.Error(w, "not authorized to modify this task", http.StatusForbidden)
    return
  }

  // Proceed with update
  updated, err := taskService.Update(r.Context(), taskID, r.Body)
  if err != nil {
    http.Error(w, "update failed", http.StatusInternalServerError)
    return
  }
  
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(updated)
}
```

#### TypeScript

```typescript
// Always check authorization, not just authentication
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);

  // Check that the authenticated user owns this resource
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Not authorized to modify this task' }
    });
  }

  // Proceed with update
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

### Security Misconfiguration

#### Go

```go
// Security headers
func securityHeaders(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    w.Header().Set("X-Content-Type-Options", "nosniff")
    w.Header().Set("X-Frame-Options", "DENY")
    w.Header().Set("X-XSS-Protection", "1; mode=block")
    next.ServeHTTP(w, r)
  })
}

// Content Security Policy
func cspHeader(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Security-Policy", 
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'")
    next.ServeHTTP(w, r)
  })
}

// CORS — restrict to known origins
func corsMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    origin := r.Header.Get("Origin")
    allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
    for _, allowed := range allowedOrigins {
      if origin == allowed {
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        break
      }
    }
    next.ServeHTTP(w, r)
  })
}
```

#### TypeScript

```typescript
// Security headers (use helmet for Express)
import helmet from 'helmet';
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Tighten if possible
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
}));

// CORS — restrict to known origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

### Sensitive Data Exposure

#### Go

```go
// Never return sensitive fields in API responses
type PublicUser struct {
  ID    string `json:"id"`
  Name  string `json:"name"`
  Email string `json:"email"`
  // PasswordHash and ResetToken are NOT included
}

func sanitizeUser(user *User) *PublicUser {
  return &PublicUser{
    ID:    user.ID,
    Name:  user.Name,
    Email: user.Email,
  }
}

// Use environment variables for secrets
var (
  stripeAPIKey = os.Getenv("STRIPE_API_KEY")
)

func init() {
  if stripeAPIKey == "" {
    log.Fatal("STRIPE_API_KEY not configured")
  }
}
```

#### TypeScript

```typescript
// Never return sensitive fields in API responses
function sanitizeUser(user: UserRecord): PublicUser {
  const { passwordHash, resetToken, ...publicFields } = user;
  return publicFields;
}

// Use environment variables for secrets
const API_KEY = process.env.STRIPE_API_KEY;
if (!API_KEY) throw new Error('STRIPE_API_KEY not configured');
```

### Server-Side Request Forgery (SSRF)

Any time the server fetches a URL the user influenced — webhooks, "import from URL", image proxies, link previews — an attacker can aim it at internal services (cloud metadata, `localhost`, private IPs).

#### Go

```go
// BAD: fetch whatever the user gives you
resp, _ := http.Get(req.Body.WebhookURL)

// GOOD: allowlist scheme + host, reject if ANY resolved IP is private, forbid redirects
import (
  "net"
  "net/http"
  "net/url"
  "strings"
)

var allowedHosts = map[string]bool{"hooks.example.com": true}

func assertSafeURL(raw string) (*url.URL, error) {
  u, err := url.Parse(raw)
  if err != nil {
    return nil, fmt.Errorf("invalid URL: %w", err)
  }
  
  if u.Scheme != "https" {
    return nil, fmt.Errorf("https only")
  }
  
  if !allowedHosts[u.Hostname()] {
    return nil, fmt.Errorf("host not allowed")
  }
  
  // Resolve ALL records; a single private IP fails the check
  ips, err := net.LookupIP(u.Hostname())
  if err != nil {
    return nil, fmt.Errorf("DNS lookup failed: %w", err)
  }
  
  for _, ip := range ips {
    if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
      return nil, fmt.Errorf("private/reserved IP: %s", ip)
    }
  }
  
  return u, nil
}

// Fetch with redirects forbidden
client := &http.Client{
  CheckRedirect: func(req *http.Request, via []*http.Request) error {
    return http.ErrUseLastResponse  // Forbid redirects
  },
}
resp, err := client.Get(url.String())
```

#### TypeScript

```typescript
// BAD: fetch whatever the user gives you
await fetch(req.body.webhookUrl);

// GOOD: allowlist scheme + host, reject if ANY resolved IP is private, forbid redirects
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

const ALLOWED_HOSTS = new Set(['hooks.example.com']);

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('https only');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('host not allowed');
  // Resolve ALL records; a single private/reserved address fails the check.
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.some((a) => ipaddr.parse(a.address).range() !== 'unicast')) {
    throw new Error('private/reserved IP');
  }
  return url;
}

await fetch(await assertSafeUrl(req.body.webhookUrl), { redirect: 'error' });
```

The `ip.IsPrivate()` and related checks cover loopback, link-local, private ranges across IPv4 and IPv6.

**Caveat — this still has a TOCTOU gap.** `http.Get` resolves DNS again after the check, so an attacker using a short-TTL record can rebind to an internal IP between validation and connection. For high-risk surfaces, resolve once and connect to the pinned IP, or put a filtering agent in front.

## Input Validation Patterns

### Schema Validation at Boundaries

#### Go

```go
type CreateTaskRequest struct {
  Title       string    `json:"title" validate:"required,min=1,max=200"`
  Description string    `json:"description" validate:"max=2000"`
  Priority    string    `json:"priority" validate:"omitempty,oneof=low medium high"`
  DueDate     time.Time `json:"dueDate" validate:"omitempty"`
}

// Using the validator package
import "github.com/go-playground/validator/v10"

func handleCreateTask(w http.ResponseWriter, r *http.Request) {
  var req CreateTaskRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    http.Error(w, "invalid JSON", http.StatusBadRequest)
    return
  }
  
  validate := validator.New()
  if err := validate.Struct(req); err != nil {
    w.WriteHeader(http.StatusUnprocessableEntity)
    json.NewEncoder(w).Encode(map[string]interface{}{
      "error": map[string]interface{}{
        "code":    "VALIDATION_ERROR",
        "message": "Invalid input",
        "details": err.Error(),
      },
    })
    return
  }
  
  // req is now validated
  task, err := taskService.Create(r.Context(), &req)
  if err != nil {
    http.Error(w, "create failed", http.StatusInternalServerError)
    return
  }
  
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusCreated)
  json.NewEncoder(w).Encode(task)
}
```

#### TypeScript

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

// Validate at the route handler
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.flatten(),
      },
    });
  }
  // result.data is now typed and validated
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

### File Upload Safety

#### Go

```go
// Restrict file types and sizes
const maxSize = 5 * 1024 * 1024  // 5MB

var allowedTypes = map[string]bool{
  "image/jpeg": true,
  "image/png":  true,
  "image/webp": true,
}

func validateUpload(r *http.Request) error {
  // Parse the multipart form
  if err := r.ParseMultipartForm(maxSize); err != nil {
    return fmt.Errorf("invalid form: %w", err)
  }
  
  file, handler, err := r.FormFile("file")
  if err != nil {
    return fmt.Errorf("missing file: %w", err)
  }
  defer file.Close()
  
  // Check file size
  if handler.Size > maxSize {
    return fmt.Errorf("file too large (max 5MB)")
  }
  
  // Check MIME type from Content-Type header
  if !allowedTypes[handler.Header.Get("Content-Type")] {
    return fmt.Errorf("file type not allowed")
  }
  
  // Don't trust the filename or extension — check magic bytes if critical
  // (Read first 512 bytes to detect actual file type)
  buffer := make([]byte, 512)
  _, err = file.Read(buffer)
  if err != nil && err != io.EOF {
    return fmt.Errorf("read file: %w", err)
  }
  
  // Use a library to detect actual MIME type from magic bytes
  // (Or verify with a simple check: JPEG starts with FF D8 FF, PNG with 89 50 4E 47, etc.)
  
  return nil
}
```

#### TypeScript

```typescript
// Restrict file types and sizes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError('File type not allowed');
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('File too large (max 5MB)');
  }
  // Don't trust the file extension — check magic bytes if critical
}
```

## Triaging Dependency Audit Results

Package-manager audits report known advisories; they do not prove a package is trustworthy or that vulnerable code is reachable. Use this decision tree:

```
The native package-manager audit reports a vulnerability
├── Severity: critical or high
│   ├── Is the vulnerable code reachable in runtime, build, test, or deployment paths?
│   │   ├── YES --> Fix immediately (update, patch, or replace the dependency)
│   │   └── NO (confirmed unused across those paths) --> Fix soon, but not a blocker
│   └── Is a fix available?
│       ├── YES --> Update to the patched version
│       └── NO --> Check for workarounds, consider replacing the dependency, or add to allowlist with a review date
├── Severity: moderate
│   ├── Reachable in production? --> Fix in the next release cycle
│   └── Dev-only? --> Fix when convenient, track in backlog
└── Severity: low
    └── Track and fix during regular dependency updates
```

**Key questions:**
- Is the vulnerable function actually called in your code path?
- Is the dependency a runtime dependency or dev-only?
- Is the vulnerability exploitable given your deployment context (e.g., a server-side vulnerability in a client-only app)?

When you defer a fix, document the reason and set a review date.

### Supply-Chain Hygiene

Do not assume npm or treat the nearest manifest as the install root. Apply this order:

1. **Find the installation boundary and manager.** Use the workspace root that owns the lockfile, or an independent nested project only when it is outside that workspace. There, corroborate `packageManager` (when present), the lockfile, and CI; stop on disagreement or competing lockfiles. Pin the manager version and use the matrix in `references/security-checklist.md`.
2. **Block dependency scripts before first execution.** Bootstrap with scripts disabled or a documented fail-closed policy, inspect the pending script source, approve only the minimum required packages, commit the policy, then verify with a clean frozen/immutable install. Never blanket-approve scripts.

Audits only find known advisories; they do not catch a newly malicious or typosquatted package. Therefore:

- **Never apply forced audit remediation automatically** (`npm audit fix --force` or equivalent). Preview the remediation, read changelogs, and test each resulting upgrade; forced fixes may cross declared dependency ranges.
- **Verify registry signatures and provenance where supported** (`npm audit signatures`, `pnpm audit signatures`) and treat absence as a signal to investigate, not automatic proof of compromise.
- **Review new dependencies, lockfile diffs, and script-policy changes together** — ownership, maintenance, release age, provenance, transitive graph, and typosquats such as `cross-env` vs `crossenv` (OWASP **A06**, **LLM03**).

## Rate Limiting

#### Go

```go
import (
  "github.com/go-chi/chi/v5"
  "github.com/go-chi/httprate"
  "time"
)

func setupRateLimiting(router *chi.Mux) {
  // General API rate limit: 100 requests per 15 minutes
  router.Use(httprate.LimitByIP(100, 15*time.Minute))
  
  // Stricter limit for auth endpoints: 10 attempts per 15 minutes
  router.Route("/api/auth", func(r chi.Router) {
    r.Use(httprate.LimitByIP(10, 15*time.Minute))
    r.Post("/login", handleLogin)
    r.Post("/register", handleRegister)
  })
  
  router.Route("/api", func(r chi.Router) {
    // General endpoints with base rate limit
    r.Get("/tasks", listTasks)
    r.Post("/tasks", createTask)
  })
}

// Alternative: custom rate limiting with a map
import (
  "sync"
  "time"
)

type rateLimiter struct {
  mu        sync.Mutex
  attempts  map[string][]time.Time
  maxAttempts int
  window    time.Duration
}

func (rl *rateLimiter) isAllowed(ip string) bool {
  rl.mu.Lock()
  defer rl.mu.Unlock()
  
  now := time.Now()
  windowStart := now.Add(-rl.window)
  
  // Clean old attempts
  recent := []time.Time{}
  for _, t := range rl.attempts[ip] {
    if t.After(windowStart) {
      recent = append(recent, t)
    }
  }
  
  if len(recent) >= rl.maxAttempts {
    return false  // Rate limit exceeded
  }
  
  rl.attempts[ip] = append(recent, now)
  return true
}
```

#### TypeScript

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter limit for auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 attempts per 15 minutes
}));
```

## Secrets Management

```
.env files:
  ├── .env.example  → Committed (template with placeholder values)
  ├── .env          → NOT committed (contains real secrets)
  └── .env.local    → NOT committed (local overrides)

.gitignore must include:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**Always check before committing:**
```bash
# Check for accidentally staged secrets
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

**If a secret is ever committed, rotate it.** Deleting the line or rewriting history is not enough — assume it's compromised the moment it reaches a remote. Revoke and reissue the key first, then purge it from history.

## Securing AI / LLM Features

If your app calls an LLM — chatbots, summarizers, agents, RAG — it inherits a new attack surface. Map it to the [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/):

- **Treat all model output as untrusted input (LLM05: Improper Output Handling).** Never pass LLM output straight into `eval`, SQL, a shell, `innerHTML`, or a file path. Validate and encode it exactly as you would raw user input.
- **Assume prompts can be hijacked (LLM01: Prompt Injection).** Untrusted text in the context window — a user message, a fetched web page, a PDF — can carry instructions. The system prompt is not a security boundary; enforce permissions in code, not in the prompt.
- **Keep secrets and other users' data out of prompts (LLM02 / LLM07).** Anything in the context can be echoed back. Don't put API keys, cross-tenant data, or the full system prompt where the model can repeat it.
- **Constrain tool and agent permissions (LLM06: Excessive Agency).** Scope tools to the minimum, require confirmation for destructive or irreversible actions, and validate every tool argument.
- **Bound consumption (LLM10: Unbounded Consumption).** Cap tokens, request rate, and loop/recursion depth so a crafted input can't run up cost or hang the system.
- **Isolate retrieval data (LLM08: Vector and Embedding Weaknesses).** In RAG, treat the vector store as a trust boundary: partition embeddings per tenant so one user can't retrieve another's data, and validate documents before indexing so poisoned content can't steer answers.

```typescript
// BAD: trusting model output as a command or as markup
const sql = await llm.generate(`Write SQL for: ${userQuestion}`);
await db.query(sql);                                   // arbitrary query execution
container.innerHTML = await llm.reply(userMessage);   // stored XSS, via the model

// GOOD: model output is data — parse defensively, then validate, then encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError('unexpected model output'); // JSON.parse or schema failed
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```

## Security Review Checklist

```markdown
### Authentication
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (salt rounds ≥ 12)
- [ ] Session tokens are httpOnly, secure, sameSite
- [ ] Login has rate limiting
- [ ] Password reset tokens expire

### Authorization
- [ ] Every endpoint checks user permissions
- [ ] Users can only access their own resources
- [ ] Admin actions require admin role verification

### Input
- [ ] All user input validated at the boundary
- [ ] SQL queries are parameterized
- [ ] HTML output is encoded/escaped
- [ ] Server-side URL fetches are allowlisted (no SSRF to internal services)

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)

### Infrastructure
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't expose internals

### Supply Chain
- [ ] One authoritative lockfile committed; CI uses that manager's frozen/immutable install
- [ ] Native audit triaged by reachability and fix risk; dependency install scripts blocked unless explicitly approved
- [ ] New dependencies reviewed (ownership, provenance, release age, transitive graph)

### AI / LLM (if used)
- [ ] Model output treated as untrusted (no eval/SQL/innerHTML/shell)
- [ ] Secrets and other users' data kept out of prompts
- [ ] Tool/agent permissions scoped; destructive actions require confirmation
```
## See Also

For detailed security checklists and pre-commit verification steps, see `references/security-checklist.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal tool, security doesn't matter" | Internal tools get compromised. Attackers target the weakest link. |
| "We'll add security later" | Security retrofitting is 10x harder than building it in. Add it now. |
| "No one would try to exploit this" | Automated scanners will find it. Security by obscurity is not security. |
| "The framework handles security" | Frameworks provide tools, not guarantees. You still need to use them correctly. |
| "It's just a prototype" | Prototypes become production. Security habits from day one. |
| "Threat modeling is overkill here" | Five minutes of "how would I attack this?" prevents the design flaws no control can patch later. |
| "It's just LLM output, it's only text" | That "text" can be a SQL statement, a script tag, or a shell command. Treat it like any untrusted input. |
| "The audit passed, so the dependency is safe" | Audits match known advisories. They do not detect a newly malicious package or make unreviewed install scripts safe to execute. |

## Red Flags

- User input passed directly to database queries, shell commands, or HTML rendering
- Secrets in source code or commit history
- API endpoints without authentication or authorization checks
- Missing CORS configuration or wildcard (`*`) origins
- No rate limiting on authentication endpoints
- Stack traces or internal errors exposed to users
- Dependencies with known critical vulnerabilities, competing lockfiles at one installation boundary, non-reproducible installs, or blanket-approved scripts
- Server fetches user-supplied URLs without an allowlist (SSRF)
- LLM/model output passed into a query, the DOM, a shell, or `eval`
- Secrets, PII, or the full system prompt placed inside an LLM context window

## Verification

After implementing security-relevant code:

- [ ] The native audit has no unmitigated reachable critical/high findings; CI preserves the authoritative lockfile and blocks unreviewed dependency scripts
- [ ] No secrets in source code or git history
- [ ] All user input validated at system boundaries
- [ ] Authentication and authorization checked on every protected endpoint
- [ ] Security headers present in response (check with browser DevTools)
- [ ] Error responses don't expose internal details
- [ ] Rate limiting active on auth endpoints
- [ ] Server-side URL fetches validated against an allowlist (no SSRF)
- [ ] LLM/model output validated and encoded before use (if AI features present)
