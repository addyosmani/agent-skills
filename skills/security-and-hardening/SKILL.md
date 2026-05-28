---
name: security-and-hardening
description: 加固代码以抵御 vulnerabilities。处理 user input、authentication、data storage 或 external integrations 时使用。构建任何接受 untrusted data、管理 user sessions 或与 third-party services 交互的 feature 时使用。
---

# Security and Hardening

## Overview

面向 web applications 的 security-first development practices。把每个 external input 都视为 hostile，把每个 secret 都视为 sacred，把每个 authorization check 都视为 mandatory。Security 不是一个阶段，而是每行触达 user data、authentication 或 external systems 的代码都必须遵守的约束。

## When to Use

- 构建任何接受 user input 的功能
- 实现 authentication 或 authorization
- 存储或传输 sensitive data
- 集成 external APIs 或 services
- 添加 file uploads、webhooks 或 callbacks
- 处理 payment 或 PII data

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary（API routes、form handlers）
- **Parameterize all database queries**，绝不要把 user input 拼接进 SQL
- **Encode output** 以防止 XSS（使用 framework auto-escaping，不要绕过）
- **Use HTTPS** 进行所有 external communication
- **Hash passwords** with bcrypt/scrypt/argon2（绝不存 plaintext）
- **Set security headers**（CSP、HSTS、X-Frame-Options、X-Content-Type-Options）
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run `npm audit`**（或等价工具）before every release

### Ask First (Requires Human Approval)

- 添加新的 authentication flows 或修改 auth logic
- 存储新的 sensitive data 类别（PII、payment info）
- 添加新的 external service integrations
- 修改 CORS configuration
- 添加 file upload handlers
- 修改 rate limiting 或 throttling
- 授予 elevated permissions 或 roles

### Never Do

- **Never commit secrets** 到 version control（API keys、passwords、tokens）
- **Never log sensitive data**（passwords、tokens、完整 credit card numbers）
- **Never trust client-side validation** as a security boundary
- **Never disable security headers** for convenience
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in client-accessible storage**（auth tokens 不放 localStorage）
- **Never expose stack traces** 或 internal error details 给 users

## OWASP Top 10 Prevention

### 1. Injection (SQL, NoSQL, OS Command)

```typescript
// BAD: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM with parameterized input
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### 2. Broken Authentication

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

### 3. Cross-Site Scripting (XSS)

```typescript
// BAD: Rendering user input as HTML
element.innerHTML = userInput;

// GOOD: Use framework auto-escaping (React does this by default)
return <div>{userInput}</div>;

// If you MUST render HTML, sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 4. Broken Access Control

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

### 5. Security Misconfiguration

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

### 6. Sensitive Data Exposure

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

## Triaging npm audit Results

并非所有 audit findings 都需要立即处理。使用此 decision tree：

```
npm audit reports a vulnerability
├── Severity: critical or high
│   ├── vulnerable code 在 app 中是否 reachable？
│   │   ├── YES --> 立即修复（update、patch 或 replace dependency）
│   │   └── NO（dev-only dep、unused code path）--> 尽快修复，但不阻塞
│   └── 是否有 fix？
│       ├── YES --> Update 到 patched version
│       └── NO --> 检查 workarounds，考虑 replace dependency，或加入 allowlist 并设置 review date
├── Severity: moderate
│   ├── Production 中 reachable？ --> 下一个 release cycle 修复
│   └── Dev-only？ --> 方便时修复，并在 backlog 跟踪
└── Severity: low
    └── 跟踪，并在常规 dependency updates 中修复
```

**Key questions:**
- Vulnerable function 是否真的在你的 code path 中被调用？
- Dependency 是 runtime dependency 还是 dev-only？
- 在你的 deployment context 下该 vulnerability 是否 exploitable（例如 client-only app 中的 server-side vulnerability）？

当你 defer fix 时，记录原因并设置 review date。

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

## Secrets Management

```
.env files:
  ├── .env.example  → Committed（包含 placeholder values 的 template）
  ├── .env          → NOT committed（包含真实 secrets）
  └── .env.local    → NOT committed（local overrides）

.gitignore must include:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**每次 committing 前都检查：**
```bash
# Check for accidentally staged secrets
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

## Security Review Checklist

```markdown
### Authentication
- [ ] Passwords 使用 bcrypt/scrypt/argon2 hash（salt rounds ≥ 12）
- [ ] Session tokens 是 httpOnly、secure、sameSite
- [ ] Login 有 rate limiting
- [ ] Password reset tokens 会过期

### Authorization
- [ ] 每个 endpoint 都检查 user permissions
- [ ] Users 只能访问自己的 resources
- [ ] Admin actions 需要 admin role verification

### Input
- [ ] 所有 user input 都在 boundary validated
- [ ] SQL queries 已 parameterized
- [ ] HTML output 已 encoded/escaped

### Data
- [ ] Code 或 version control 中无 secrets
- [ ] Sensitive fields 从 API responses 中排除
- [ ] PII at rest 已 encrypted（如适用）

### Infrastructure
- [ ] Security headers 已配置（CSP、HSTS 等）
- [ ] CORS 限制为 known origins
- [ ] Dependencies 已 audit vulnerabilities
- [ ] Error messages 不暴露 internals
```
## See Also

详细 security checklists 和 pre-commit verification steps 见 `references/security-checklist.md`。

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “This is an internal tool, security doesn't matter” | Internal tools 也会被攻破。Attackers 会攻击最弱环节。 |
| “We'll add security later” | 事后补 security 难度是内建的 10 倍。现在就加。 |
| “No one would try to exploit this” | Automated scanners 会找到它。Security by obscurity 不是 security。 |
| “The framework handles security” | Frameworks 提供工具，不提供保证。你仍需正确使用。 |
| “It's just a prototype” | Prototypes 会进入 production。从 day one 建立 security habits。 |

## Red Flags

- User input 直接传入 database queries、shell commands 或 HTML rendering
- Secrets 出现在 source code 或 commit history
- API endpoints 缺少 authentication 或 authorization checks
- 缺失 CORS configuration 或使用 wildcard（`*`）origins
- Authentication endpoints 没有 rate limiting
- Stack traces 或 internal errors 暴露给 users
- Dependencies 有已知 critical vulnerabilities

## Verification

实现 security-relevant code 后：

- [ ] `npm audit` 没有 critical 或 high vulnerabilities
- [ ] Source code 或 git history 中无 secrets
- [ ] 所有 user input 在 system boundaries validated
- [ ] 每个 protected endpoint 都检查 authentication 和 authorization
- [ ] Response 中存在 security headers（用 browser DevTools 检查）
- [ ] Error responses 不暴露 internal details
- [ ] Auth endpoints 上 rate limiting active
