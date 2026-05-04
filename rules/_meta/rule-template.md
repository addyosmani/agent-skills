---
title: <Human-readable rule name>
applies-to: ["python", "sql"]   # array of language/stack/context tags this rule applies to
                                # Common values: python, typescript, sql, bash, markdown,
                                # frontend, backend, regulated-data, multi-tenant, colombia
last-reviewed: 2026-04-26       # YYYY-MM-DD; quarterly review cadence
enforcement: context-only       # 'context-only' (loaded into agent context, no runtime gate)
                                # OR 'hook' (PreToolUse hook blocks violations at tool-call time;
                                # add a `hook:` field below pointing at the script path under hooks/).
# hook: hooks/pre-write-skill-gate.sh   # only when enforcement: hook
---

# <Title — same as frontmatter `title`>

<Optional one-paragraph framing of why this rule exists. Skip if obvious.>

## Inviolable rules

1. <Rule 1 in imperative voice. Verifiable. Example: "Every external library import is preceded by a `// Source:` citation comment with URL + verification date + lib@version.">
2. <Rule 2.>
3. <…>

Rules are numbered for easy reference in code review comments ("violates rule 2 of `core/<this-rule>.md`"). Keep the count low — three to five inviolable rules per file is the sweet spot.

## Allowed patterns

Concrete, executable examples of code that complies with the inviolable rules. Use the language(s) declared in `applies-to`. Keep examples minimal — one or two patterns is enough.

```python
# Good — citation present, lib pinned in import
# Source: https://docs.python.org/3.11/library/asyncio.html (verified 2026-04-26, python@3.11)
import asyncio
```

## Anti-patterns

**Mandatory section. Cannot be empty.** This is what differentiates a rule (precise) from generic advice (vague).

Show explicit examples of what violates the rules. Each anti-pattern names which inviolable rule it breaks.

```python
# Bad — violates rule 1 (no citation)
import asyncio

# Bad — violates rule 1 (citation lacks lib version)
# Source: https://docs.python.org/3.11/library/asyncio.html
import asyncio
```

## Documented exceptions

*(Optional section.)*

If the rule has known exceptions where it does not apply, list them here with rationale. Anything not listed here counts as a violation. If a project finds it needs an exception that is not on this list, the project documents the deviation in its own `CLAUDE.md` per the exception protocol in [`how-to-import.md`](how-to-import.md) §B.4.

Example:
- **Test fixtures** under `tests/fixtures/`: synthetic data may include obviously fake PII (e.g. `user@example.com`) without sanitization. The "no PII in logs" rule does not apply here.

## Notes for rule authors

- Total file length: 50–200 lines. Files outside that range are split or expanded by `batuta-rule-authoring`.
- Imperative tone. "Every X must Y" works. "It is recommended that X" does not — too soft, ambiguous in code review.
- No client names. The plugin is public; client relationships are private.
- The `applies-to` array uses lowercase tags (canonical vocabulary shown in the frontmatter example above). Add new tags as needed but keep them composable.
