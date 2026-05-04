---
title: Research-first citations
applies-to: ["python", "typescript", "any-language-with-imports"]
last-reviewed: 2026-05-04
enforcement: context-only
---

# Research-first citations

Every external library, API, or service dependency carries uncertainty: APIs change between versions, deprecations land without broad announcements, and training data goes stale. Verifying at the point of use — and making that verification visible — eliminates an entire class of rework caused by stale assumptions.

This rule is derived from the operator's global `~/.claude/CLAUDE.md` "Research-first (non-negotiable)" section. It counts as universally applied under §A.6 of the admission gate.

## Inviolable rules

1. Before writing code that uses any external library, API, or service, perform a Context7 lookup for the exact version declared in the project's dependency manifest (`pyproject.toml`, `package.json`, `Cargo.toml`, `go.mod`, etc.).
2. If Context7 has no coverage for that library or the version it returns is outdated relative to the manifest, perform a web search against the official documentation domain or the library's GitHub repository before writing any code.
3. Add a `// Source:` citation comment at the import site with the format `// Source: <url> (verified YYYY-MM-DD, <lib>@<version>)`. In Python, use `# Source:` — match the comment syntax of the target language.
4. Re-verify and update the citation comment any time the dependency version is bumped in the manifest.

## Allowed patterns

```python
# Source: https://docs.pydantic.dev/2.7/ (verified 2026-04-26, pydantic@2.7.1)
from pydantic import BaseModel, field_validator
```

```typescript
// Source: https://zod.dev/?id=basic-usage (verified 2026-04-26, zod@3.23.8)
import { z } from "zod";
```

```python
# Source: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html (verified 2026-04-26, boto3@1.34.84)
import boto3
```

## Anti-patterns

```python
# Bad — violates rule 1 and rule 3 (no research, no citation)
import stripe

# Bad — violates rule 3 (citation lacks verification date)
# Source: https://stripe.com/docs/api
import stripe

# Bad — violates rule 3 (citation lacks lib version)
# Source: https://stripe.com/docs/api (verified 2026-04-26)
import stripe

# Bad — violates rule 4 (version bumped in manifest but citation not updated)
# Source: https://stripe.com/docs/api (verified 2025-01-10, stripe@7.0.0)
# (manifest now declares stripe@8.2.0 — citation is stale)
import stripe
```

```typescript
// Bad — violates rule 3 (citation points at unofficial source, not official docs or GitHub)
// Source: https://stackoverflow.com/questions/12345678 (verified 2026-04-26, axios@1.6.0)
import axios from "axios";

// Bad — violates rule 1 and rule 3 (no verification performed, no comment present)
import { Pool } from "pg";
```

## Documented exceptions

- **Standard library imports** (e.g. `os`, `sys`, `path`, `fs`, built-in Node modules): no citation required. Standard libraries ship with the language runtime — version is the language version, which is already documented in the toolchain config.
- **Internal packages** within the same monorepo or workspace: no citation required. Source is the same repository; the import path itself is the reference.
- **Test-only imports** where the library is a test framework (e.g. `pytest`, `jest`, `vitest`): citation is encouraged but not enforced for the test runner itself. Plugins and matchers that are project dependencies still require citation.
