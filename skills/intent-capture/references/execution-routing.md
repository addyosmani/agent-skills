# Execution Routing

Decision tree for Step 6 of intent-capture: maps a confirmed intent to the correct subagent. The main Opus agent orchestrates and routes — it does NOT execute `Edit`/`Write`/mutating `Bash` on client project files directly.

---

## Decision Tree

```
confirmed intent
    │
    ├── category = "research"
    │       └── → Explore / general-purpose Sonnet
    │           Pass: intent JSON + vault context + source URLs to check
    │
    ├── category = "meta"  (plugin meta-work: rules, skills, plan files, memory)
    │       └── → main-direct (kill-switch path; documented exception)
    │
    ├── category IN ["feature", "bug", "refactor"]
    │       ├── scope.includes.length ≤ 3
    │       │   AND no new control-flow (no new if/else/try/async/await)
    │       │   AND no new error handling
    │       │       └── → implementer-haiku (Haiku)
    │       │
    │       ├── scope.includes.length > 3
    │       │   OR tests with assertions
    │       │   OR async / error handling / integrations
    │       │       └── → implementer (Sonnet)
    │       │
    │       └── domain expertise required (regulation, client protocol, framework)
    │               └── → agent-architect (creates or reuses project-local specialist)
    │
    └── ambiguous category → grill again (return to Step 2)
```

---

## Routing Table

| category | scope.includes size | control-flow? | subagent | model |
|---|---|---|---|---|
| `research` | any | N/A | `Explore` / general-purpose | Sonnet |
| `meta` | any | any | main-direct | Opus (retained) |
| `refactor` | ≤ 3 files | no | `implementer-haiku` | Haiku |
| `bug` | ≤ 3 files | no | `implementer-haiku` | Haiku |
| `feature` | ≤ 3 files | no | `implementer-haiku` | Haiku |
| `refactor` | > 3 OR has control-flow | any | `implementer` | Sonnet |
| `bug` | > 3 OR has control-flow | any | `implementer` | Sonnet |
| `feature` | > 3 OR has control-flow | any | `implementer` | Sonnet |
| any | domain-specific | any | `agent-architect` | Sonnet |

---

## Concrete Examples

### 1. `kiosco/bancos-ekgs` — clean 12 hardcoded literals (Haiku)

```json
{
  "category": "refactor",
  "scope": { "includes": ["parsers/bbva.py"], "excludes": ["other bank parsers"] }
}
```

`scope.includes.length = 1`, no new control-flow, purely mechanical rename/parameterize.
**Route: `implementer-haiku`**. Context: intent JSON + `rules/no-hardcoded-magic.md`.

### 2. Add new bank parser to pipeline (Sonnet)

```json
{
  "category": "feature",
  "scope": { "includes": ["parsers/bold.py", "pipeline/registry.py", "tests/test_bold.py", "config/banks.yaml"] }
}
```

`scope.includes.length = 4`, new tests with assertions.
**Route: `implementer`** (Sonnet). Context: intent JSON + existing parser as reference.

### 3. Research: explore GitHub repo for API patterns (Sonnet via Explore)

```json
{ "category": "research" }
```

Main does NOT run `gh repo view` or `WebFetch` directly.
**Route: `Explore` subagent** with the intent JSON + target URL. Main synthesizes the return in ≤ 400 words.

### 4. Fix a single off-by-one bug in auth module (Haiku or Sonnet)

```json
{
  "category": "bug",
  "scope": { "includes": ["auth/token.py"], "excludes": ["oauth flow"] }
}
```

If fix is a single arithmetic change with no new error handling → **`implementer-haiku`**.
If fix requires adding a try/except or new test assertion → **`implementer`**.

### 5. Add a new rule to the plugin (meta → main-direct)

```json
{ "category": "meta", "scope": { "includes": ["rules/no-hardcoded-magic.md"] } }
```

Plugin meta-work is the documented kill-switch exception.
**Route: main-direct** (Opus writes the rule file directly after `batuta-rule-authoring` gate).

### 6. Colombian e-invoicing compliance fix (agent-architect)

```json
{ "category": "feature" }
```

Requires knowledge of DIAN regulations and CUFE calculation — outside base agent coverage.
**Route: `agent-architect`** to create/reuse a specialist at `<project>/.claude/agents/dian-specialist.md`.

### 7. Rename a CSS class across 2 files (Haiku)

```json
{
  "category": "refactor",
  "scope": { "includes": ["src/styles/card.css", "src/components/Card.tsx"] }
}
```

2 files, pure string rename, no logic change.
**Route: `implementer-haiku`**.

### 8. Multi-module refactor with integration tests (Sonnet)

```json
{
  "category": "refactor",
  "scope": { "includes": ["services/orders.py", "services/inventory.py", "api/checkout.py", "tests/integration/"] }
}
```

4+ files, integration tests required.
**Route: `implementer`** (Sonnet).

---

## Post-Routing Invariants

1. Always pass the **full confirmed intent JSON** as the subagent's first context block.
2. Always include citations to applicable rules: `no-hardcoded-magic`, `secrets-and-pii`, `model-routing`.
3. After the subagent returns, the audit chain runs unconditionally: `test-engineer` → `code-reviewer` → `security-auditor`.
4. If main-direct is used (meta path), the audit chain still runs on the staged diff.
