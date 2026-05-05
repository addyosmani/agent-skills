# Contribuir a Agent Skills

¡Gracias por tu interés en contribuir! Este proyecto es una colección de habilidades de ingeniería de nivel producción para agentes de codificación con IA.

## Agregar una Nueva Skill

1. Crea un directorio bajo `skills/` con un nombre en kebab-case
2. Agrega un `SKILL.md` siguiendo el formato en [docs/skill-anatomy.md](docs/skill-anatomy.md)
3. Incluye frontmatter YAML con los campos `name` y `description`
4. Asegúrate de que el `description` describa brevemente lo que hace la skill (tercera persona), luego incluye las condiciones de activación `Use when`

### Nivel de Calidad de las Skills

Las skills deben ser:

- **Specific** — Pasos accionables, no consejos vagos
- **Verifiable** — Criterios de salida claros con requisitos de evidencia
- **Battle-tested** — Basadas en flujos de trabajo de ingeniería reales, no en ideales teóricos
- **Minimal** — Solo el contenido necesario para guiar correctamente al agente

### Estructura

Cada nueva skill debe tener:

- `SKILL.md` en el directorio de la skill
- Frontmatter YAML con `name` y `description` válidos

Las nuevas skills deben seguir generalmente la anatomía estándar:

- **Overview** — Qué hace esta skill y por qué importa
- **When to Use** — Condiciones de activación
- **Process** — Flujo de trabajo paso a paso
- **Common Rationalizations** — Excusas que los agentes usan para saltarse pasos, con contra-argumentos
- **Red Flags** — Señales de advertencia de que la skill se está aplicando incorrectamente
- **Verification** — Cómo confirmar que la skill se aplicó correctamente

### Qué No Hacer

- No dupliques contenido entre skills — referencia otras skills en su lugar
- No agregues skills que sean consejos vagos en lugar de procesos accionables
- No crees archivos de soporte a menos que el contenido exceda las 100 líneas
- No coloques material de referencia dentro de los directorios de skills — usa `references/` en su lugar

## Modificar Skills Existentes

- Mantén los cambios enfocados y mínimos
- Preserva la estructura y el tono existentes
- Verifica que el frontmatter YAML siga siendo válido después de las ediciones

## Reportar Problemas

Abre un issue si encuentras:

- Una skill que proporciona orientación incorrecta o desactualizada
- Cobertura faltante para un flujo de trabajo de ingeniería común
- Inconsistencias entre skills

## Licencia

Al contribuir, aceptas que tus contribuciones se licenciarán bajo la MIT License.
