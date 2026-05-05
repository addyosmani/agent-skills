# agent-skills

Este es el proyecto agent-skills: una colección de habilidades de ingeniería de nivel producción para agentes de codificación con IA.

## Estructura del Proyecto

```
skills/       → Skills principales (SKILL.md por directorio)
agents/       → Personas de agente reutilizables (code-reviewer, test-engineer, security-auditor)
hooks/        → Hooks del ciclo de vida de sesiones
.claude/commands/ → Comandos slash (/spec, /plan, /build, /test, /review, /code-simplify, /ship)
references/   → Listas de verificación complementarias (testing, performance, security, accessibility)
docs/         → Guías de configuración para diferentes herramientas
```

## Skills por Fase

**Define:** spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, frontend-ui-engineering, api-and-interface-design
**Verify:** browser-testing-with-devtools, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening, performance-optimization
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Convenciones

- Cada skill reside en `skills/<name>/SKILL.md`
- Frontmatter YAML con campos `name` y `description`
- La descripción comienza con lo que hace la skill (tercera persona), seguida de condiciones de activación ("Use when...")
- Cada skill tiene: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification
- Las referencias están en `references/`, no dentro de los directorios de skills
- Los archivos de soporte solo se crean cuando el contenido excede las 100 líneas

## Comandos

- `npm test` — No aplica (este es un proyecto de documentación)
- Validate: Verifica que todos los archivos SKILL.md tengan un frontmatter YAML válido con name y description

## Límites

- Siempre: Sigue el formato de skill-anatomy.md para nuevas skills
- Nunca: Agregues skills que sean consejos vagos en lugar de procesos accionables
- Nunca: Dupliques contenido entre skills — referencia otras skills en su lugar
