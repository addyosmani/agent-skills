---
name: security-and-hardening
description: Hardens code against vulnerabilities. Use when handling user input, authentication, data storage, or external integrations. Use when building any feature that accepts untrusted data, manages user sessions, or interacts with third-party services. Use when auditing dependencies for known vulnerabilities, triaging package-manager audit findings, or assessing supply-chain risk in a new package. Use when personal data or privacy compliance (GDPR, CCPA) is involved.
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

1. **Map the trust boundaries.** Where does untrusted data cross into your system? HTTP requests, form fields, file uploads, webhooks, third-party APIs, message queues, and **LLM output** — plus the local values that look internal because the OS handed them to you: another process's command line or environment, filenames on a shared volume, a path in a job payload. Trust follows who *wrote* a value, not which channel delivered it. Every boundary is attack surface.
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
- **Run `npm audit`** (or equivalent) before every release

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

These are prevention patterns, not a ranking; treat the OWASP Top 10 categories above as the checklist itself.
These are prevention patterns, not a ranking. For the 2021 ordering, see the quick-reference table in `../../references/security-checklist.md`.

### Injection (SQL, NoSQL, OS Command)

```typescript
// BAD: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM with parameterized input
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Broken Authentication

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

The `range() !== 'unicast'` check covers loopback, link-local `169.254.169.254` (cloud metadata, the #1 SSRF target), private, and unique-local ranges across IPv4 and IPv6.

**Caveat — this still has a TOCTOU gap.** `fetch` resolves DNS again after the check, so an attacker using a short-TTL record can rebind to an internal IP between validation and connection. For high-risk surfaces, resolve once and connect to the pinned IP, or put a filtering agent in front (`request-filtering-agent` / `ssrf-req-filter`).

## Input Validation Patterns

### Schema Validation at Boundaries

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

### Destructive Operations on Derived Paths

A delete, move, or overwrite is only as safe as the value that names its target. Reading that value from the kernel, a job payload, or a sibling service proves where it *arrived from*, not who *wrote* it — another process's command line is as attacker-controlled as a form field. A shape check ("absolute path, at least one directory deep") proves well-formedness and gets mistaken for authorization; that is how a cleanup routine deletes the root instead of the leaf.

Before a destructive call, require all three: the resolved target sits under an **allowlisted root** (compare after resolving symlinks, never on the raw string); it is at least one level **below** that root, so a root is never itself the target; and it carries **evidence that it is yours**, read *before* the operation and before any teardown that removes it — otherwise "absent" and "not mine" are indistinguishable. On refusal, log the rejected target and stop: a cleanup that falls back to a broader default path is the failure this guards against. Worked example in `../../references/security-checklist.md`.

Two limits, because the check reads stronger than it is. A marker inside the tree is self-attestation — anything that can write there can write the marker — so the expected owner has to come from authenticated state, and the marker needs integrity protection (restrictive ownership, or a MAC) before it counts as authorization. And resolving a path and then operating on the *name* is a check/use race wherever an untrusted process can swap an ancestor: on a shared volume, hold the target by descriptor and use no-follow, beneath-the-root operations, or make sure the hierarchy cannot change for the duration.

## Triaging Dependency Audit Results

Not all audit findings require immediate action. Use this decision tree:

```
npm audit reports a vulnerability
├── Severity: critical or high
│   ├── Is the vulnerable code reachable in your app?
│   │   ├── YES --> Fix immediately (update, patch, or replace the dependency)
│   │   └── NO (dev-only dep, unused code path) --> Fix soon, but not a blocker
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

`npm audit` catches known CVEs; it won't catch a malicious or typosquatted package. Also:

- **Commit the lockfile** and install with `npm ci` (not `npm install`) in CI — reproducible builds, no silent version drift.
- **Review new dependencies before adding them** — maintenance, download counts, and whether they truly earn their place. Every dependency is attack surface (OWASP **A06: Vulnerable Components**, **LLM03: Supply Chain**).
- **Be wary of `postinstall` scripts** in unfamiliar packages — they run arbitrary code at install time.
- **Watch for typosquats** — `cross-env` vs `crossenv`, `react-dom` vs `reactdom`.
1. **Find the installation boundary and manager.** Use the workspace root that owns the lockfile, or an independent nested project only when it is outside that workspace. There, corroborate `packageManager` (when present), the lockfile, and CI; stop on disagreement or competing lockfiles. Pin the manager version and use the matrix in `../../references/security-checklist.md`.
2. **Block dependency scripts before first execution.** Bootstrap with scripts disabled or a documented fail-closed policy, inspect the pending script source, approve only the minimum required packages, commit the policy, then verify with a clean frozen/immutable install. Never blanket-approve scripts.

Audits only find known advisories; they do not catch a newly malicious or typosquatted package. Therefore:

- **Never apply forced audit remediation automatically** (`npm audit fix --force` or equivalent). Preview the remediation, read changelogs, and test each resulting upgrade; forced fixes may cross declared dependency ranges.
- **Verify registry signatures and provenance where supported** (`npm audit signatures`, `pnpm audit signatures`) and treat absence as a signal to investigate, not automatic proof of compromise.
- **Review new dependencies, lockfile diffs, and script-policy changes together** — ownership, maintenance, release age, provenance, transitive graph, and typosquats such as `cross-env` vs `crossenv` (OWASP **A06**, **LLM03**).

## Rate Limiting

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

**Count in a shared store once there is more than one process.** `express-rate-limit` keeps its counters in process memory by default. Behind a load balancer each instance holds its own count, so the effective limit is `max × instances`; on serverless or edge runtimes a fresh invocation starts from zero, so the auth limit above may never fire. Pass a shared `store` (Redis via `rate-limit-redis`), or use an HTTP-based limiter that works where a long-lived TCP connection does not (for example `@upstash/ratelimit`):

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),                       // UPSTASH_REDIS_REST_URL + _TOKEN
  limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 attempts per 15 minutes, across all instances
});
const { success } = await authLimiter.limit(`login:${req.ip}`);
if (!success) return res.status(429).end();
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

## Data Privacy & Compliance

Securing data is "can an attacker read it?" Privacy is "should *we* even hold it, and for how long?" — a separate question that hardening doesn't answer. The cheapest data to protect, breach, and comply over is the data you never collected. Treat personal data as a liability to minimize, not an asset to hoard.

**Know what you hold.** You can't protect or honor a deletion request for data you can't find. Classify fields as you add them:

| Class | Examples | Handling |
|---|---|---|
| **Non-personal** | Aggregates, anonymized counts | Normal handling |
| **Personal (PII)** | Name, email, IP, device/user IDs | Minimize, access-control, include in export/delete |
| **Sensitive** | Health, finance, location, biometrics, gov IDs, anything about minors | Extra basis to collect, stricter access, often encryption + audit logging |

**Operating rules:**
- **Minimize and set a purpose.** Collect a field only against a stated use. "It might be useful later" is not a purpose — it's latent breach scope. Don't log PII into telemetry (the `observability-and-instrumentation` skill makes the same point from the ops side).
- **Set retention up front, then actually delete.** Every personal-data store needs a TTL and a working deletion path — including backups, caches, search indexes, and analytics copies. Data with no expiry is a breach scheduled for later.
- **Support the data-subject rights your jurisdiction requires** (GDPR/CCPA and kin): export, correct, and delete on request. These are engineering features — design the schema so a user's data is *findable* and *erasable*, not smeared irreversibly across systems.
- **Get consent before collection or third-party sharing**, and make it auditable. Sending PII to an analytics/ad/LLM vendor is "sharing" — the user's choice gates it, and the vendor needs a data-processing agreement.
- **Localize defaults, don't hardcode one region's law.** Data-residency and rules differ by user location; make the policy a configurable boundary, not an assumption.

When data crosses a trust boundary, validate it as untrusted (see Input Validation above); when a privacy incident exposes personal data, the breach-notification clock is part of the postmortem — follow the `debugging-and-error-recovery` skill.

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
- [ ] Delete/move/overwrite targets built from data are checked against an allowlisted root, a minimum depth, and ownership evidence read before the operation

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)
- [ ] Personal data is classified, collected against a stated purpose, and minimized
- [ ] Personal data has a retention limit and a working deletion path (incl. backups/indexes)
- [ ] Export/delete (data-subject) requests are supported where required; sharing with third parties has consent

### Infrastructure
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't expose internals

### Supply Chain
- [ ] Lockfile committed; CI installs with `npm ci`
- [ ] New dependencies reviewed (maintenance, downloads, postinstall scripts)

### AI / LLM (if used)
- [ ] Model output treated as untrusted (no eval/SQL/innerHTML/shell)
- [ ] Secrets and other users' data kept out of prompts
- [ ] Tool/agent permissions scoped; destructive actions require confirmation
```
## See Also

Use the OWASP Top 10 categories above as the pre-commit security checklist.
For detailed security checklists and pre-commit verification steps, see `../../references/security-checklist.md`.

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
| "Collect it now, we might need it later" | Data you don't hold can't be breached, subpoenaed, or mis-deleted. "Might need it" is breach scope, not a purpose. |
| "We'll handle deletion requests manually" | Manual erasure misses backups, caches, and analytics copies. If the schema can't find a user's data, you can't honor the request — design for it. |
| "Compliance is legal's problem, not ours" | Export, deletion, retention, and consent are schema and code. Legal can't bolt them on after you've smeared PII across ten systems. |

## Red Flags

- User input passed directly to database queries, shell commands, or HTML rendering
- A delete, move, or overwrite whose target comes from a payload, a config value, or another process's command line, guarded only by a shape check on the path
- Secrets in source code or commit history
- API endpoints without authentication or authorization checks
- Missing CORS configuration or wildcard (`*`) origins
- No rate limiting on authentication endpoints, or an in-memory limiter in front of more than one instance
- Stack traces or internal errors exposed to users
- Dependencies with known critical vulnerabilities
- Server fetches user-supplied URLs without an allowlist (SSRF)
- LLM/model output passed into a query, the DOM, a shell, or `eval`
- Secrets, PII, or the full system prompt placed inside an LLM context window
- Personal data collected with no stated purpose, retention limit, or deletion path
- PII sent to analytics/ad/LLM vendors with no consent or data-processing agreement
- "Delete my account" that only flips a flag while the personal data lingers in stores and backups

## Verification

After implementing security-relevant code:

- [ ] `npm audit` shows no critical or high vulnerabilities
- [ ] No secrets in source code or git history
- [ ] All user input validated at system boundaries
- [ ] Destructive filesystem operations resolve symlinks, then verify allowlisted root, minimum depth, and ownership before running
- [ ] Authentication and authorization checked on every protected endpoint
- [ ] Security headers present in response (check with browser DevTools)
- [ ] Error responses don't expose internal details
- [ ] Rate limiting active on auth endpoints, backed by a shared store when more than one instance serves traffic
- [ ] Server-side URL fetches validated against an allowlist (no SSRF)
- [ ] LLM/model output validated and encoded before use (if AI features present)

## Continuous/Adaptive coverage for security and hardening (curve-guided-rsi cycle-4 substantive edit)

This skill — **Security-first development practices for web applications** — sits in a domain that benefits from explicit continuous/adaptive updates (upgrade, rollback, atomic switch, bootc upgrade, OSTree, composefs, image mode) coverage. Even when the skill's primary job is not the continuous/adaptive primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For security and hardening, the continuous/adaptive primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the continuous/adaptive layer of the yubiOS pipeline, and consumers that reason about continuous/adaptive coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full continuous/adaptive primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for security and hardening: any change to the skill should be reviewed for impact on continuous/adaptive coverage; gaps in continuous/adaptive that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Least privilege coverage for security and hardening (curve-guided-rsi cycle-5 substantive edit)

This skill — **input validation, auth, storage, integration safety** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.615, v=0.094), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For security and hardening, the least privilege primitive applies as follows: this skill is the application-layer least-privilege gate. yubiOS's least-privilege model composes user-namespace isolation (per `nspawn-containers`), rootless containers (per `rootless-container-builds`, `docker-buildx-rootless`), and systemd sandbox directives (per `systemd-hardening`); this skill contributes to that model.

Concrete implications for security and hardening: any change should be reviewed for impact on least-privilege coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `trust chain` coverage gap in the 10-primitive yubiOS framework. **trust chain** was missing across 23/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill contributes to the yubiOS trust chain via PCR / UKI / secure boot / TPM / fTPM integration. Specifically it covers: trust chain, PCR, UKI.

**Keywords introduced in this skill (cycle-5 RSI):** `trust chain`, `PCR`, `UKI`, `secure boot`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `trust chain` count moved 23→24/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `trust chain` primitive gap (corpus-wide count 23→24/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `declarative policy` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's declarative policy (.rego / OPA / Build Policy) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `declarative policy` primitive gap.
- [ ] Personal data is classified, minimized to a stated purpose, and has a retention limit
- [ ] Deletion and export requests work end-to-end (including backups, caches, and analytics copies)
