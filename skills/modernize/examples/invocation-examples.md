# Invocation Examples

## Claude Desktop / claude.ai (natural language):
```
Use the modernizer skill to rewrite D:/Repos/old-inventory-api to C# Web API .NET 10. 
Output to D:/Repos/inventory-v2. Skip the legacy-reports module.
```

## Claude Desktop (with example file):
```
Run modernizer using the dotnet-clean-architecture example against D:/Repos/my-monolith
```

## Claude Code CLI:
```bash# Natural language
claude "Modernize /repos/auth-service from Python to Go 1.23 + Gin, output to /repos/auth-go"
```

## Reference example
```
claude "Run modernizer with examples/go-migration.yaml against /repos/legacy-api"
```

## Interactive
```
claude
> Load modernizer skill
> Rewrite D:/Repos/old-api to .NET 10 with Clean Architecture patterns
```