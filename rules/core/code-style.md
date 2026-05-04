---
title: Code style conventions
applies-to: ["python", "typescript", "javascript"]
last-reviewed: 2026-05-04
enforcement: context-only
---

# Code style conventions

Consistent naming, documentation, and file scope reduce the cognitive load of every future reader — including the agent reading the code in a future session. These conventions apply uniformly across Python and TypeScript/JavaScript projects.

## Inviolable rules

1. Functions are named in the idiomatic case for their language (`snake_case` in Python; `camelCase` in TypeScript and JavaScript) and describe what the function DOES, not what it IS. The name must be readable as a verb phrase without the word "function" or "handler".
2. Every public function (exported from a module, or `public` in a class) has a docstring (Python) or JSDoc comment (TypeScript/JavaScript) that documents: the contract (what the function does), its parameters (type and meaning), its return value, and any non-obvious side effects or error modes. Implementation details belong in inline comments, not in the docstring.
3. No source file exceeds 500 lines. A file that crosses 500 lines is split at a logical module boundary. Files that mix unrelated concerns (e.g. auth + database access + email sending in one module) are split regardless of line count.
4. Comments explain WHY non-obvious decisions were made. Comments that describe WHAT the code does (narrating the syntax) are deleted.

## Allowed patterns

```python
def calculate_retry_delay(attempt: int, base_ms: int = 100) -> int:
    """
    Return the exponential backoff delay in milliseconds for a given attempt.

    Uses full jitter (random between 0 and 2^attempt * base_ms) to reduce
    thundering herd when many workers retry simultaneously.

    Args:
        attempt: Zero-indexed retry attempt number.
        base_ms: Base delay in milliseconds before exponential scaling.

    Returns:
        Delay in milliseconds. Always >= 0.
    """
    import random
    cap = (2 ** attempt) * base_ms
    # Full jitter chosen over equal jitter because it distributes load more evenly
    # across the retry window. See: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
    return random.randint(0, cap)
```

```typescript
/**
 * Resolve the canonical display name for a user account.
 *
 * Falls back to email prefix if `displayName` is not set, because
 * some legacy accounts were migrated without a display name.
 *
 * @param user - User record from the accounts table.
 * @returns Display name string, never empty.
 */
export function resolveDisplayName(user: User): string {
  if (user.displayName) return user.displayName;
  // Legacy accounts lack displayName; email prefix is the agreed fallback (product decision 2025-03-10)
  return user.email.split("@")[0];
}
```

## Anti-patterns

```python
# Bad — violates rule 1 (name describes what it IS, not what it DOES)
def data_handler(payload):
    ...

# Bad — violates rule 1 (name is opaque)
def func1(x):
    ...

# Bad — violates rule 1 (name includes redundant noise word)
def get_data():
    ...  # "get" is acceptable only when it clearly means "retrieve from a source"
         # — here it's ambiguous. "fetch_user_profile" or "load_config" is better.

# Bad — violates rule 4 (comment narrates the code — adds zero information)
counter += 1  # increment counter
```

```typescript
// Bad — violates rule 2 (exported function has no JSDoc — contract is implicit)
export function processPayment(amount: number, currency: string) {
  // ...
}

// Bad — violates rule 2 (JSDoc copies the function body in prose — not the contract)
/**
 * This function gets the user from the database by ID, then checks if
 * the user is active, and if so returns the user object, otherwise returns null.
 */
export async function findActiveUser(id: string): Promise<User | null> {
  // ...
}
```

```python
# Bad — violates rule 3 (single module mixing auth + DB + email: 830 lines)
# auth_and_db_and_email.py — split into auth.py, db.py, notifications.py
```

## Documented exceptions

- **Test functions**: test functions in `test_*.py` or `*.test.ts` files are exempt from the JSDoc/docstring rule. A descriptive test name (`test_payment_fails_when_card_expired`) is the documentation.
- **Private helpers** (prefixed with `_` in Python, or not exported in TypeScript): docstrings are encouraged but not required. The public API surface is the enforcement boundary.
- **One-liner lambdas and arrow functions**: anonymous functions assigned to local variables or passed directly as callbacks do not require JSDoc.
