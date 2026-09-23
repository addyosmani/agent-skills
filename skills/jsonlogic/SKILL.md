---
name: jsonlogic
description: "Work with JsonLogic business rules — the JSON-based conditional-logic format at jsonlogic.com. Use when the user wants to turn a business requirement into a JsonLogic rule, needs an existing JsonLogic expression explained or debugged, asks whether a rule is valid, wants to execute JsonLogic in a specific language (JavaScript, TypeScript, Python, Ruby, Java, PHP, Go, C#, others), is choosing or comparing a JsonLogic library, or is integrating JsonLogic into an application. Trigger on mentions of JsonLogic, json-logic, JSON rule objects shaped like {\"var\": ...}, or requests to express conditions and business rules as portable JSON."
---

# JsonLogic

## Overview

[JsonLogic](https://jsonlogic.com) is a small, portable format for expressing
conditional logic as JSON. This skill converts plain-language business rules into
JsonLogic, executes and validates rules against sample data in a chosen language, and
explains or debugs existing JsonLogic expressions.

A JsonLogic *rule* is language-agnostic — it's defined by the JsonLogic standard. A
*library* (e.g. json-logic-js for JavaScript, json-logic-rb for Ruby) is the code that
executes a rule in a particular language, and libraries can differ in which operations
they support.

## When to Use

- Converting a business requirement ("20% off orders over $200") into a JsonLogic rule
- Validating whether a JSON object is syntactically valid JsonLogic
- Executing a rule against sample data in a named language or library
- Explaining what an existing JsonLogic expression does
- Debugging why a rule produces an unexpected result
- Choosing between JsonLogic libraries for a language

Not for: general programming tasks that don't involve the JsonLogic format itself.

## Core Process

### 1. Get the data shape

Before writing a new rule, get the field names the rule will read. Ask the user how:
paste a schema (JSON Schema/OpenAPI), paste a sample JSON payload, or describe the
fields in prose. Never guess field names silently — a rule built on invented field
names silently fails at runtime instead of erroring.

### 2. Translate business language into JsonLogic

Map each condition in the request to the matching JsonLogic operator (`==`, `>`, `and`,
`or`, `in`, `var`, etc. — see the [operations reference](https://jsonlogic.com/operations.html)).
Keep the rule as flat as the logic allows; nest only where the business logic itself
nests.

### 3. Validate

Check the rule is well-formed JsonLogic: every operator is a single-key object, `var`
paths resolve against the agreed data shape, and the rule parses as valid JSON.

### 4. Execute or explain

If a specific library is named (e.g. "json-logic-js"), use that exact implementation.
If only a language is named ("in Python"), pick that language's standard library. Run
the rule against sample data and show the result, or, for an existing rule, walk through
each operator against the given data to explain the output.

### 5. Handle library limits

A rule can be valid JsonLogic and still unsupported by a specific library or version.
Flag the unsupported operation rather than silently rewriting the rule. Offer real
options: a custom operation, a different library that supports it, or a genuine logic
change — and say which level (standard vs. library) the limitation is at.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "The field name is obvious, I'll skip asking" | Wrong field names fail silently at runtime; JsonLogic has no schema to catch typos |
| "It's close enough to valid JsonLogic" | Invalid JsonLogic either throws or silently returns unexpected results depending on the library — validate before shipping |
| "This library doesn't support it, I'll just approximate the logic" | Changes what the rule *means*; always disclose the substitution and offer alternatives instead |

## Red Flags

- A custom Ruby operation compares or truth-tests values without `using JsonLogic::Semantics` — plain Ruby doesn't coerce types or treat `[]` as falsy the way JsonLogic does
- Two libraries are treated as behaving identically because both claim "spec compliant", without running the same rule and data on both to confirm

## Verification

- [ ] The rule's `var` paths match a data shape the user confirmed
- [ ] The rule was validated as well-formed JsonLogic
- [ ] The rule was run against at least one sample data object with the shown result
- [ ] Any library-specific limitation was flagged, not silently worked around
