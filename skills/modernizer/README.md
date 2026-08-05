# Modernizer — Legacy Codebase Rewriter

> **Shack to Mansion.** Extract intent, rebuild clean, zero translation debt.

## Quick Start

### With Claude Desktop / claude.ai

Just ask naturally:

```
Use the modernizer skill to rewrite my legacy API at D:/Repos/old-inventory-service 
to C# Web API .NET 10. Output to D:/Repos/inventory-api-v2
```

Or be explicit with YAML:

```
Run modernizer with this config:

source:
  type: path
  location: "D:/Repos/old-inventory-service"
target:
  stack: "C# Web API .NET 10"
  output_path: "D:/Repos/inventory-api-v2"
```

### With Claude Code (CLI)

```bash
# Natural language
claude "Use modernizer to rewrite /repos/legacy-auth from Python Flask to Go 1.23 + Gin. Output to /repos/auth-service-go"

# With config file
claude "Run modernizer using examples/dotnet-migration.yaml"

# Interactive session
claude
> Load the modernizer skill
> I need to modernize D:/Repos/old-api to .NET 10, exclude the legacy-reports module
```

---

## Invocation Patterns

### Pattern 1: Natural Language (Recommended)

Claude will parse your intent and build the config:

```
Modernize my Python Django app at /repos/crm-backend to C# Web API .NET 10.
Skip the analytics module — we're deprecating it.
Use minimal APIs where possible and System.Text.Json instead of Newtonsoft.
Output to /repos/crm-backend-v2
```

### Pattern 2: Explicit YAML Config

For precision and repeatability:

```yaml
source:
  type: path
  location: "D:/Repos/crm-backend"
  exclude_patterns: ["**/analytics/**", "**/tests/**"]

target:
  stack: "C# Web API .NET 10"
  output_path: "D:/Repos/crm-backend-v2"

options:
  drift_tolerance: 0.08
  forced_optimizations:
    - "use minimal APIs for simple endpoints"
    - "replace Newtonsoft.Json with System.Text.Json"
  exclusions:
    - module: "analytics"
      reason: "deprecated, not migrating"
```

### Pattern 3: Reference Example File

```
Run modernizer using the dotnet-migration example against D:/Repos/my-legacy-app
```

---

## Source Types

### Local Path
```yaml
source:
  type: path
  location: "D:/Repos/legacy-api"
```

### Public GitHub URL
```yaml
source:
  type: url
  location: "https://github.com/org/legacy-api"
  branch: develop
```

### Private Repo (SSH)
```yaml
source:
  type: repo
  location: "git@github.com:org/secret-api.git"
  branch: main
```

---

## Target Stacks (Examples)

The `stack` field is free-form — Claude interprets it idiomatically:

| Stack String | What Claude Builds |
|-------------|-------------------|
| `"C# Web API .NET 10"` | ASP.NET Core minimal APIs, EF Core, built-in DI |
| `"C# Web API .NET 10 + MediatR + CQRS"` | Clean architecture, MediatR handlers, separate read/write |
| `"Go 1.23 + Gin + GORM"` | Gin router, GORM ORM, standard Go project layout |
| `"Go 1.23 + Echo + sqlc"` | Echo framework, type-safe SQL with sqlc |
| `"Rust + Axum + SQLx"` | Axum async web, SQLx compile-time checked queries |
| `"Python FastAPI + SQLAlchemy"` | Modern Python async, Pydantic models |
| `"Node.js + Fastify + Prisma"` | Fastify server, Prisma ORM, TypeScript |

---

## Options Deep Dive

### Drift Tolerance

How much behavioral difference is acceptable before escalation:

```yaml
options:
  drift_tolerance: 0.05  # 5% — strict (default)
  drift_tolerance: 0.10  # 10% — lenient (for known-buggy legacy)
```

Override per-module in contracts when some modules need more slack.

### Reconciliation

Control the black-box audit:

```yaml
options:
  reconciliation:
    enabled: true
    min_samples_per_contract: 15  # More samples = higher confidence
    coverage_targets:
      happy_path: 0.35      # 35% of samples
      error_cases: 0.35     # 35% — match error handling
      edge_cases: 0.20      # 20% — nulls, timeouts, etc.
      security_flows: 0.10  # 10% — auth, rate limits
```

### Forced Optimizations

Mandate specific improvements:

```yaml
options:
  forced_optimizations:
    - "use minimal APIs for simple endpoints"
    - "replace XML config with appsettings.json"
    - "implement health checks endpoint"
    - "add OpenTelemetry tracing"
    - "use async/await throughout"
```

### Exclusions

Skip modules entirely:

```yaml
options:
  exclusions:
    - module: "legacy-reports"
      reason: "moving to separate reporting service"
    - module: "admin-tools"
      reason: "internal only, will rewrite separately"
```

---

## HITL Checkpoints

The modernizer pauses for human approval at critical points:

1. **After Discovery** — "Does this manifest capture the true business intent?"
2. **Low Confidence** — When implementation confidence < 0.85
3. **High Drift** — When reconciliation shows > 5% meaningful delta

You'll see prompts like:

```
📋 Behavioral Manifest Ready for Review

I've identified 23 contracts across 5 modules:
- auth-service: 8 contracts
- inventory: 6 contracts  
- orders: 5 contracts
- notifications: 4 contracts

Key behaviors captured:
• JWT authentication with 1-hour expiry
• Rate limiting: 100 req/min per user
• Inventory reservation with 15-min hold
• Order saga with compensating transactions

⚠️ Potential issues found:
• Password truncation at 8 chars (security anti-pattern)
• Silent failure on notification timeout

Should I:
1. Proceed with migration (tombstone the anti-patterns)
2. Show detailed contracts for a specific module
3. Modify the manifest
```

---

## Outputs Explained

After completion, `target.output_path` contains:

```
/inventory-api-v2/
├── src/                      # Your shiny new code
├── tests/                    # Contract-based tests
├── task_store.db             # Full execution history
├── telemetry.log             # Every action logged
├── delta_report.md           # Reconciliation results
├── coverage_summary.md       # Test coverage by contract
├── TOMBSTONES.md             # Intentional divergences
└── README.md                 # Architecture overview
```

---

## Troubleshooting

### "Claimed task not progressing"

Check for stale locks:
```sql
SELECT * FROM tasks 
WHERE status = 'Claimed' 
AND heartbeat_at < datetime('now', '-5 minutes');
```

Stale tasks auto-release, but you can force:
```sql
UPDATE tasks SET status = 'Pending', claimed_at = NULL WHERE cid = '...';
```

### "High drift on reconciliation"

1. Check `delta_report.md` for specific variances
2. Cross-reference `TOMBSTONES.md` — is the drift intentional?
3. If legitimate bug fix, add tombstone and re-run reconciliation

### "Confidence too low"

The agent found ambiguities. Check telemetry:
```bash
grep "confidence" telemetry.log | jq 'select(.metric.confidence < 0.85)'
```

Common causes:
- Unclear business rules in source
- Missing documentation
- Inconsistent behavior in legacy code

Resolution: Provide clarification during HITL checkpoint.

---

## Tips & Best Practices

1. **Start with a small module** — Validate the flow before full migration
2. **Review tombstones carefully** — They're your "intentional changes" audit trail
3. **Keep forced_optimizations minimal** — Let the agent find improvements
4. **Run reconciliation even for "simple" rewrites** — Surprises happen
5. **Version your config files** — Reproducibility matters

---

## See Also

- `SKILL.md` — Core skill definition
- `examples/` — Ready-to-use config templates
- `telemetry.log` — Execution audit trail