---
name: security-and-hardening
description: Endurece el código contra vulnerabilidades. Úsalo cuando manejes input de usuarios, autenticación, almacenamiento de datos o integraciones externas. Úsalo cuando construyas cualquier feature que acepte datos no confiables, gestione sesiones de usuario o interactúe con servicios de terceros.
---

# Security and Hardening

## Overview

Prácticas de desarrollo con seguridad como prioridad para aplicaciones web. Trata cada input externo como hostil, cada secreto como sagrado y cada verificación de autorización como obligatoria. La seguridad no es una fase: es una restricción en cada línea de código que toca datos de usuarios, autenticación o sistemas externos.

## When to Use

- Construyes algo que acepta input de usuario
- Implementas autenticación o autorización
- Almacenas o transmites datos sensibles
- Integras con APIs o servicios externos
- Añades file uploads, webhooks o callbacks
- Manejas pagos o datos PII

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **Validate all external input** en el límite del sistema (API routes, form handlers)
- **Parameterize all database queries** — nunca concatenes input de usuario en SQL
- **Encode output** para prevenir XSS (usa el auto-escaping del framework, no lo ignores)
- **Use HTTPS** para toda comunicación externa
- **Hash passwords** con bcrypt/scrypt/argon2 (nunca en texto plano)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** para sesiones
- **Run `npm audit`** (o equivalente) antes de cada release

### Ask First (Requires Human Approval)

- Añadir nuevos flujos de autenticación o cambiar la lógica de auth
- Almacenar nuevas categorías de datos sensibles (PII, información de pago)
- Añadir nuevas integraciones con servicios externos
- Cambiar la configuración de CORS
- Añadir handlers de file upload
- Modificar rate limiting o throttling
- Otorgar permisos o roles elevados

### Never Do

- **Never commit secrets** al control de versiones (API keys, passwords, tokens)
- **Never log sensitive data** (passwords, tokens, números completos de tarjetas de crédito)
- **Never trust client-side validation** como límite de seguridad
- **Never disable security headers** por conveniencia
- **Never use `eval()` or `innerHTML`** con datos proporcionados por el usuario
- **Never store sessions in client-accessible storage** (localStorage para auth tokens)
- **Never expose stack traces** o detalles internos de errores a los usuarios

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

No todos los hallazgos de audit requieren acción inmediata. Usa este árbol de decisiones:

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
- ¿La función vulnerable se invoca realmente en tu ruta de código?
- ¿Es la dependencia de runtime o solo de desarrollo?
- ¿Es la vulnerabilidad explotable dado tu contexto de despliegue (p. ej., una vulnerabilidad del lado del servidor en una app solo de cliente)?

Cuando postergues una corrección, documenta la razón y establece una fecha de revisión.

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

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)

### Infrastructure
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't expose internals
```
## See Also

Para listas de verificación detalladas de seguridad y pasos de verificación pre-commit, consulta `references/security-checklist.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal tool, security doesn't matter" | Las herramientas internas también se comprometen. Los atacantes apuntan al eslabón más débil. |
| "We'll add security later" | Refactorizar seguridad es 10 veces más difícil que construirla desde el inicio. Agrégala ahora. |
| "No one would try to exploit this" | Los escáneres automatizados la encontrarán. La seguridad por oscuridad no es seguridad. |
| "The framework handles security" | Los frameworks proporcionan herramientas, no garantías. Aún debes usarlas correctamente. |
| "It's just a prototype" | Los prototipos se convierten en producción. Hábitos de seguridad desde el día uno. |

## Red Flags

- Input de usuario pasado directamente a consultas de base de datos, comandos de shell o renderizado HTML
- Secrets en el código fuente o en el historial de commits
- API endpoints sin autenticación ni verificaciones de autorización
- Configuración de CORS faltante o wildcard (`*`) en los orígenes
- Sin rate limiting en endpoints de autenticación
- Stack traces o errores internos expuestos a los usuarios
- Dependencias con vulnerabilidades críticas conocidas

## Verification

Después de implementar código relevante para seguridad:

- [ ] `npm audit` no muestra vulnerabilidades críticas ni altas
- [ ] No hay secrets en el código fuente ni en el historial de git
- [ ] Todo input de usuario se valida en los límites del sistema
- [ ] La autenticación y autorización se verifican en cada endpoint protegido
- [ ] Los security headers están presentes en la respuesta (verifica con DevTools del navegador)
- [ ] Las respuestas de error no exponen detalles internos
- [ ] El rate limiting está activo en endpoints de auth
