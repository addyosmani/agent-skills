---
name: ast-resilient-remediation
description: Guides agents through robust Abstract Syntax Tree (AST) parsing and structural code remediation. Use when fixing bugs, injecting resiliency features, or conducting large-scale refactors.
---

# AST-Aware Resilient Remediation

## Overview
Text-based string replacements and regex patching are highly fragile, frequently breaking indentation, corrupting scope, and introducing syntax errors. This skill mandates parsing source code into an Abstract Syntax Tree (AST) to perform precise, structurally valid injections of resiliency wrappers, timeouts, and circuit breakers.

## When to Use
- Injecting error handling, retries, or exponential backoff decorators
- Conducting codebase-wide API updates or structural refactors
- Resolving complex linting or static analysis failures
- Enforcing privilege boundaries or tool access restrictions

**When NOT to use:** Modifying documentation files, markdown text, or plain configuration files.

## The Gated Workflow

Follow these four linear phases. Do not proceed to the next phase until structural correctness is validated.

```
PARSE-AST ──→ LOCATE-FRAGILITY ──→ STRUCTURAL-PATCH ──→ VERIFY-SYNTAX
```

### Phase 1: Parse AST
Load the target source file into a strict syntax tree representation. Never attempt to patch raw multiline strings directly.

### Phase 2: Locate Fragility
Traverse the AST nodes to identify unprotected network requests, missing exception handlers, or unbounded tool execution scopes.

### Phase 3: Structural Patch
Construct new valid AST nodes for the required logic (e.g., injecting a `@retry` decorator or wrapping a block in a comprehensive `try/except` structure) and graft them into the syntax tree.

### Phase 4: Verify Syntax
Compile the modified AST back into source code and execute static verification to guarantee valid syntax before saving.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "String replacement is faster and much simpler to write." | Plain text replacements break indentation, ignore variable scope, and corrupt valid syntax. AST transformations guarantee deterministic structural correctness. |
| "I'm only changing a single line, regex is perfectly safe." | Even single-line regex replacements fail when adjacent code changes. AST matching ensures precision regardless of formatting shifts. |
| "We can just let the linter fix any formatting errors afterward." | Relying on downstream tools to fix broken syntax creates fragile dependency chains. Patches must be inherently valid upon injection. |

## Red Flags
- Attempting to replace multi-line code blocks using raw string search/replace
- Injecting decorators without verifying whether the target function definition supports them
- Omitting strict timeout parameters on external HTTP or API calls

## Verification
After completing the structural remediation, confirm:
- [ ] Modifications were applied via AST node manipulation or verified structural tools
- [ ] Resiliency wrappers (retries, timeouts) are fully injected around fragile calls
- [ ] Static verification passes cleanly without warnings (e.g., `uv run ruff check`)
- [ ] Unit tests confirm the modified blocks maintain correct functional behavior
