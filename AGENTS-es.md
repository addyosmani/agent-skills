# AGENTS.md

Este archivo proporciona orientación a los agentes de codificación con IA (Claude Code, Cursor, Copilot, Antigravity, etc.) al trabajar con el código de este repositorio.

## Descripción General del Repositorio

Una colección de skills para Claude.ai y Claude Code dirigidas a ingenieros de software senior. Las skills son instrucciones y scripts empaquetados que extienden las capacidades de Claude y tus agentes de codificación.

## Integración con OpenCode

OpenCode utiliza un **modelo de ejecución basado en skills** impulsado por la herramienta `skill` y el directorio `/skills` de este repositorio.

### Reglas Principales

- Si una tarea coincide con una skill, DEBES invocarla
- Las skills se encuentran en `skills/<skill-name>/SKILL.md`
- Nunca implementes directamente si una skill aplica
- Sigue siempre las instrucciones de la skill exactamente (no las apliques parcialmente)

### Mapeo de Intención a Skill

El agente debe mapear automáticamente la intención del usuario a skills:

- Feature / nueva funcionalidad → `spec-driven-development`, luego `incremental-implementation`, `test-driven-development`
- Planning / descomposición → `planning-and-task-breakdown`
- Bug / fallo / comportamiento inesperado → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplificación → `code-simplification`
- Diseño de API o interfaz → `api-and-interface-design`
- Trabajo de UI → `frontend-ui-engineering`

### Mapeo del Ciclo de Vida (Comandos Implícitos)

OpenCode no soporta comandos slash como `/spec` o `/plan`.

En su lugar, el agente debe seguir internamente este ciclo de vida:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Modelo de Ejecución

Para cada solicitud:

1. Determina si alguna skill aplica (incluso con un 1% de probabilidad)
2. Invoca la skill apropiada utilizando la herramienta `skill`
3. Sigue estrictamente el flujo de trabajo de la skill
4. Solo procede a la implementación después de completar los pasos requeridos (spec, plan, etc.)

### Anti-Racionalización

Los siguientes pensamientos son incorrectos y deben ignorarse:

- "Esto es demasiado pequeño para una skill"
- "Puedo implementar esto rápidamente"
- "Primero reuniré contexto"

Comportamiento correcto:

- Siempre verifica y usa las skills primero

Esto asegura que OpenCode se comporte de manera similar a Claude Code con la aplicación completa de flujos de trabajo.

## Orquestación: Personas, Skills y Comandos

Este repositorio tiene tres capas componibles. Tienen trabajos diferentes y no deben confundirse:

- **Skills** (`skills/<name>/SKILL.md`) — flujos de trabajo con pasos y criterios de salida. El *cómo*. Saltos obligatorios cuando una intención coincide.
- **Personas** (`agents/<role>.md`) — roles con una perspectiva y un formato de salida. El *quién*.
- **Comandos slash** (`.claude/commands/*.md`) — puntos de entrada orientados al usuario. El *cuándo*. La capa de orquestación.

Regla de composición: **el usuario (o un comando slash) es el orquestador. Las personas no invocan a otras personas.** Una persona puede invocar skills.

El único patrón de orquestación multi-persona que este repositorio respalda es **parallel fan-out con un paso de merge** — utilizado por `/ship` para ejecutar `code-reviewer`, `security-auditor` y `test-engineer` de manera concurrente y sintetizar sus reportes. No construyas una "persona enrutadora" que decida qué otra persona llamar; ese es el trabajo de los comandos slash y del mapeo de intenciones.

Consulta [agents/README.md](agents/README.md) para la matriz de decisiones y [references/orchestration-patterns.md](references/orchestration-patterns.md) para el catálogo completo de patrones.

**Interoperabilidad con Claude Code:** las personas en `agents/` funcionan como subagentes de Claude Code (auto-descubiertos desde el directorio `agents/` de este plugin) y como compañeros de Agent Teams (referenciados por nombre al instanciarlos). Dos restricciones de la platafa se alinean con nuestras reglas: los subagentes no pueden instanciar otros subagentes, y los equipos no pueden anidarse. Los agentes del plugin ignoran silenciosamente los campos de frontmatter `hooks`, `mcpServers` y `permissionMode`.

## Crear una Nueva Skill

### Estructura de Directorios

```
skills/
  {skill-name}/           # nombre de directorio en kebab-case
    SKILL.md              # Requerido: definición de la skill
    scripts/              # Requerido: scripts ejecutables
      {script-name}.sh    # Scripts de Bash (preferidos)
  {skill-name}.zip        # Requerido: empaquetado para distribución
```

### Convenciones de Nomenclatura

- **Directorio de la skill**: `kebab-case` (por ejemplo, `web-quality`)
- **SKILL.md**: Siempre en mayúsculas, siempre este nombre exacto de archivo
- **Scripts**: `kebab-case.sh` (por ejemplo, `deploy.sh`, `fetch-logs.sh`)
- **Archivo zip**: Debe coincidir exactamente con el nombre del directorio: `{skill-name}.zip`

### Formato de SKILL.md

```markdown
---
name: {skill-name}
description: {Una oración que describe cuándo usar esta skill. Incluye frases de activación como "Deploy my app", "Check logs", etc.}
---

# {Título de la Skill}

{Breve descripción de lo que hace la skill.}

## Cómo Funciona

{Lista numerada que explica el flujo de trabajo de la skill}

## Uso

```bash
bash /mnt/skills/user/{skill-name}/scripts/{script}.sh [args]
```

**Argumentos:**
- `arg1` - Descripción (valor por defecto X)

**Ejemplos:**
{Muestra 2-3 patrones de uso comunes}

## Output

{Muestra el output de ejemplo que los usuarios verán}

## Presentar Resultados al Usuario

{Plantilla para cómo Claude debe formatear los resultados al presentarlos a los usuarios}

## Troubleshooting

{Problemas comunes y soluciones, especialmente errores de red/permisos}
```

### Mejores Prácticas para la Eficiencia de Contexto

Las skills se cargan bajo demanda: solo el nombre y la descripción de la skill se cargan al inicio. El `SKILL.md` completo se carga en el contexto solo cuando el agente decide que la skill es relevante. Para minimizar el uso de contexto:

- **Mantén SKILL.md bajo 500 líneas** — coloca el material de referencia detallado en archivos separados
- **Escribe descripciones específicas** — ayuda al agente a saber exactamente cuándo activar la skill
- **Usa progressive disclosure** — referencia archivos de soporte que se leen solo cuando se necesitan
- **Prefiere scripts sobre código inline** — la ejecución de scripts no consume contexto (solo el output lo hace)
- **Las referencias de archivos funcionan a un nivel de profundidad** — enlaza directamente desde SKILL.md a archivos de soporte

### Requisitos de Scripts

- Usa el shebang `#!/bin/bash`
- Usa `set -e` para comportamiento fail-fast
- Escribe mensajes de estado a stderr: `echo "Message" >&2`
- Escribe output legible por máquinas (JSON) a stdout
- Incluye un trap de limpieza para archivos temporales
- Referencia la ruta del script como `/mnt/skills/user/{skill-name}/scripts/{script}.sh`

### Crear el Paquete Zip

Después de crear o actualizar una skill:

```bash
cd skills
zip -r {skill-name}.zip {skill-name}/
```

### Instalación para el Usuario Final

Documenta estos dos métodos de instalación para los usuarios:

**Claude Code:**
```bash
cp -r skills/{skill-name} ~/.claude/skills/
```

**claude.ai:**
Agrega la skill al conocimiento del proyecto o pega el contenido de SKILL.md en la conversación.

Si la skill requiere acceso a la red, instruye a los usuarios para que agreguen los dominios requeridos en `claude.ai/settings/capabilities`.
