---
title: Secrets and PII handling
applies-to: ["any-language", "regulated-data", "auth-systems"]
last-reviewed: 2026-05-04
enforcement: context-only
---

# Secrets and PII handling

Leaking credentials or personal data is an irreversible event. Repository history is permanent; log aggregators are indexed; CLI history is shared across sessions. This rule states the minimum invariants that apply to every project regardless of stack.

## Inviolable rules

1. Secrets (API keys, tokens, passwords, signing keys, service account credentials) are never committed to the repository, never logged in plaintext, and never embedded in client-side code or static build artifacts.
2a. PII (names, email addresses, government IDs, financial account numbers, home addresses, phone numbers) is never logged at INFO or DEBUG levels.
2b. At WARNING or ERROR level, only the minimum identifier needed for triage (e.g. a hashed or truncated user ID) is included; production log pipelines redact or omit the rest.
3. Environment variables that hold secrets are validated at process startup. A missing or empty secret value causes the process to exit with a clear error message; it does not silently proceed with a `None` / `undefined` / empty fallback.
4. Secrets are passed via OS environment variables, a secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Azure Key Vault), or a platform-level config injection (Kubernetes secrets, Heroku config vars). `.env` files committed to git, CLI arguments visible in `ps aux`, and hardcoded default values are prohibited.

## Allowed patterns

```python
# Source: https://docs.python.org/3.11/library/os.html (verified 2026-04-26, python@3.11)
import os

def get_secret(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise EnvironmentError(
            f"Required secret '{key}' is not set. "
            "Set it via the platform config or a local .env file excluded from git."
        )
    return value

DATABASE_URL = get_secret("DATABASE_URL")
```

```typescript
// Source: https://nodejs.org/api/process.html#processenv (verified 2026-04-26, node@20.12)
function getSecret(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required secret '${key}' is not set. Configure it via environment or secret manager.`
    );
  }
  return value;
}

const apiKey = getSecret("PAYMENT_API_KEY");
```

## Anti-patterns

```bash
# Bad — violates rule 4 (committed .env with real secrets)
# .env checked into git:
DATABASE_URL=postgres://admin:hunter2@prod.db.example.com/app
```

```python
# Bad — violates rule 1 (hardcoded secret as default fallback)
API_KEY = os.environ.get("API_KEY", "sk-live-abc123")  # never do this

# Bad — violates rule 3 (silent None fallback — process continues without the secret)
API_KEY = os.environ.get("API_KEY")  # returns None if unset; no error raised
```

```typescript
// Bad — violates rule 2 (full user object logged at INFO level — contains PII)
console.log("User logged in:", user);

// Bad — violates rule 1 (secret in URL query string — appears in server access logs)
const url = `https://api.example.com/data?api_key=${apiKey}`;
```

```bash
# Bad — violates rule 4 (secret passed as CLI argument — visible in ps aux)
./deploy.sh --db-password=hunter2
```

```python
# Bad — violates rule 1 (secret in source code, committed to repo)
STRIPE_KEY = "sk_live_abc123xyz"
```

## Documented exceptions

- **Local development `.env` files**: a `.env` file is allowed locally provided it is listed in `.gitignore` AND is absent from the repository's history. Never commit it, even once — history is permanent.
- **Test fixtures with synthetic PII**: test files under `tests/fixtures/` or `__fixtures__/` may contain obviously synthetic identifiers (e.g. `user@example.com`, `SSN: 000-00-0000`) for schema validation purposes. These are not real PII.
- **Public keys and certificates**: non-secret public-key material (e.g. an OIDC public key, a TLS certificate without its private key) may be committed if it is genuinely public. When in doubt, treat it as a secret.
