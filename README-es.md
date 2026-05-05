# Agent Skills

**Habilidades de ingeniería de nivel producción para agentes de codificación con IA.**

Las skills codifican los flujos de trabajo, las puertas de calidad y las mejores prácticas que los ingenieros senior utilizan al construir software. Estas están empaquetadas para que los agentes de IA las sigan de manera consistente en cada fase del desarrollo.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## Comandos

7 comandos slash que se mapean al ciclo de vida del desarrollo. Cada uno activa las skills adecuadas automáticamente.

| Lo que estás haciendo | Comando | Principio clave |
|-----------------------|---------|---------------|
| Definir qué construir | `/spec` | Spec before code |
| Planificar cómo construirlo | `/plan` | Small, atomic tasks |
| Construir incrementalmente | `/build` | One slice at a time |
| Demostrar que funciona | `/test` | Tests are proof |
| Revisar antes del merge | `/review` | Improve code health |
| Simplificar el código | `/code-simplify` | Clarity over cleverness |
| Enviar a producción | `/ship` | Faster is safer |

Las skills también se activan automáticamente según lo que estés haciendo: diseñar una API activa `api-and-interface-design`, construir UI activa `frontend-ui-engineering`, y así sucesivamente.

---

## Inicio Rápido

<details>
<summary><b>Claude Code (recomendado)</b></summary>

**Instalación desde Marketplace:**

```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```

> **¿Errores de SSH?** El marketplace clona repositorios mediante SSH. Si no tienes claves SSH configuradas en GitHub, puedes [agregar tu clave SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) o usar la URL HTTPS completa para forzar la clonación mediante HTTPS:
> ```bash
> /plugin marketplace add https://github.com/addyosmani/agent-skills.git
> /plugin install agent-skills@addy-agent-skills
> ```

**Local / desarrollo:**

```bash
git clone https://github.com/addyosmani/agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

</details>

<details>
<summary><b>Cursor</b></summary>

Copia cualquier `SKILL.md` en `.cursor/rules/`, o referencia el directorio completo `skills/`. Consulta [docs/cursor-setup.md](docs/cursor-setup.md).

</details>

<details>
<summary><b>Gemini CLI</b></summary>

Instálalos como skills nativos para auto-descubrimiento, o agrégalos a `GEMINI.md` para contexto persistente. Consulta [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md).

**Instalar desde el repositorio:**

```bash
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

**Instalar desde un clon local:**

```bash
gemini skills install ./agent-skills/skills/
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Agrega el contenido de las skills a tu configuración de reglas de Windsurf. Consulta [docs/windsurf-setup.md](docs/windsurf-setup.md).

</details>

<details>
<summary><b>OpenCode</b></summary>

Utiliza la ejecución de skills basada en agentes mediante AGENTS.md y la herramienta `skill`.

**Workspace-local:** Copia `AGENTS.md` + `skills/` en tu proyecto.  
**Global (todos los proyectos):** Instala las skills en `~/.agents/skills/` y referencia un `AGENTS.md` global desde `~/.claude/CLAUDE.md`.

Consulta [docs/opencode-setup.md](docs/opencode-setup.md) para ambos enfoques.

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

Utiliza las definiciones de agentes de `agents/` como personas de Copilot y el contenido de skills en `.github/copilot-instructions.md`. Consulta [docs/copilot-setup.md](docs/copilot-setup.md).

</details>

<details>
  <summary><b>Kiro IDE & CLI </b></summary>
  Las skills para Kiro residen bajo ".kiro/skills/" y pueden almacenarse a nivel de Proyecto o Global. Kiro también soporta Agents.md. Consulta la documentación de Kiro en https://kiro.dev/docs/skills/
</details>

<details>
<summary><b>Codex / Otros Agentes</b></summary>

Las skills son Markdown plano; funcionan con cualquier agente que acepte system prompts o archivos de instrucciones. Consulta [docs/getting-started.md](docs/getting-started.md).

</details>

---

## Las 20 Skills

Los comandos anteriores son los puntos de entrada. Bajo el capó, activan estas 20 skills; cada una es un flujo de trabajo estructurado con pasos, puertas de verificación y tablas de anti-racionalización. También puedes referenciar cualquier skill directamente.

### Define - Clarifica qué construir

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [idea-refine](skills/idea-refine/SKILL.md) | Pensamiento divergente/convergente estructurado para convertir ideas vagas en propuestas concretas | Tienes un concepto aproximado que necesita exploración |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | Escribe un PRD que cubra objetivos, comandos, estructura, estilo de código, testing y límites antes de cualquier código | Inicias un proyecto, feature o cambio significativo |

### Plan - Descompónlo

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | Descompone specs en tareas pequeñas y verificables con criterios de aceptación y orden de dependencias | Tienes una spec y necesitas unidades implementables |

### Build - Escribe el código

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | Thin vertical slices: implementa, testea, verifica, commitea. Feature flags, valores seguros por defecto, cambios con rollback-friendly | Cualquier cambio que toque más de un archivo |
| [test-driven-development](skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), test sizes, DAMP over DRY, Beyonce Rule, browser testing | Implementando lógica, arreglando bugs o cambiando comportamiento |
| [context-engineering](skills/context-engineering/SKILL.md) | Alimenta a los agentes con la información correcta en el momento correcto: archivos de reglas, context packing, integraciones MCP | Iniciando una sesión, cambiando de tarea o cuando la calidad de salida disminuye |
| [source-driven-development](skills/source-driven-development/SKILL.md) | Fundamenta cada decisión de framework en documentación oficial: verifica, cita fuentes, señala lo que no está verificado | Quieres código con fuentes autoritativas para cualquier framework o biblioteca |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | Arquitectura de componentes, sistemas de diseño, state management, diseño responsive, accesibilidad WCAG 2.1 AA | Construyendo o modificando interfaces orientadas al usuario |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, semántica de errores, validación de límites | Diseñando APIs, límites de módulos o interfaces públicas |

### Verify - Demuestra que funciona

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP para datos de runtime en vivo: inspección de DOM, logs de consola, trazas de red, profiling de rendimiento | Construyendo o haciendo debugging de cualquier cosa que se ejecute en un navegador |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | Triage de cinco pasos: reproduce, localiza, reduce, arregla, protege. Stop-the-line rule, fallbacks seguros | Los tests fallan, los builds se rompen o el comportamiento es inesperado |

### Review - Puertas de calidad antes del merge

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | Revisión de cinco ejes, tamaño de cambios (~100 líneas), etiquetas de severidad (Nit/Optional/FYI), normas de velocidad de revisión, estrategias de división | Antes de hacer merge de cualquier cambio |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduce la complejidad preservando el comportamiento exacto | El código funciona pero es más difícil de leer o mantener de lo que debería |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | Prevención del OWASP Top 10, patrones de auth, gestión de secrets, auditoría de dependencias, sistema de límites de tres niveles | Manejando input de usuario, auth, almacenamiento de datos o integraciones externas |
| [performance-optimization](skills/performance-optimization/SKILL.md) | Enfoque measure-first: objetivos de Core Web Vitals, flujos de profiling, análisis de bundle, detección de anti-patrones | Existen requisitos de rendimiento o sospechas de regresiones |

### Ship - Despliega con confianza

| Skill | Qué hace | Cuándo usarla |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, commits atómicos, tamaño de cambios (~100 líneas), el patrón commit-as-save-point | Realizando cualquier cambio de código (siempre) |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, pipelines de puertas de calidad, feedback loops de fallos | Configurando o modificando pipelines de build y deploy |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | Mentalidad de code-as-liability, deprecación compulsiva vs. consultiva, patrones de migración, eliminación de código zombie | Eliminando sistemas antiguos, migrando usuarios o dando de baja features |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records, documentación de API, estándares de documentación inline: documenta el *por qué* | Tomando decisiones de arquitectura, cambiando APIs o lanzando features |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | Checklists pre-lanzamiento, ciclo de vida de feature flags, despliegues escalonados, procedimientos de rollback, configuración de monitoreo | Preparándote para desplegar a producción |

---

## Personas de Agente

Personas especialistas preconfiguradas para revisiones dirigidas:

| Agente | Rol | Perspectiva |
|--------|------|-------------|
| [code-reviewer](agents/code-reviewer.md) | Senior Staff Engineer | Revisión de código de cinco ejes con el estándar "¿un staff engineer aprobaría esto?" |
| [test-engineer](agents/test-engineer.md) | QA Specialist | Estrategia de testing, análisis de cobertura y el patrón Prove-It |
| [security-auditor](agents/security-auditor.md) | Security Engineer | Detección de vulnerabilidades, threat modeling, evaluación OWASP |

---

## Listas de Verificación de Referencia

Material de referencia rápida que las skills utilizan cuando es necesario:

| Referencia | Cubre |
|-----------|--------|
| [testing-patterns.md](references/testing-patterns.md) | Estructura de tests, naming, mocking, ejemplos de React/API/E2E, anti-patrones |
| [security-checklist.md](references/security-checklist.md) | Checks pre-commit, auth, validación de input, headers, CORS, OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Objetivos de Core Web Vitals, checklists de frontend/backend, comandos de medición |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Navegación por teclado, screen readers, diseño visual, ARIA, herramientas de testing |

---

## Cómo Funcionan las Skills

Cada skill sigue una anatomía consistente:

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**Decisiones clave de diseño:**

- **Process, not prose.** Las skills son flujos de trabajo que los agentes siguen, no documentos de referencia que leen. Cada una tiene pasos, checkpoints y criterios de salida.
- **Anti-rationalization.** Cada skill incluye una tabla de excusas comunes que los agentes usan para saltarse pasos (por ejemplo, "agregaré tests más tarde") con contra-argumentos documentados.
- **La verificación no es negociable.** Cada skill termina con requisitos de evidencia: tests pasando, output de build, datos de runtime. "Parece correcto" nunca es suficiente.
- **Progressive disclosure.** El `SKILL.md` es el punto de entrada. Las referencias de soporte se cargan solo cuando se necesitan, manteniendo el uso de tokens al mínimo.

---

## Estructura del Proyecto

```
agent-skills/
├── skills/                            # 20 skills principales (SKILL.md por directorio)
│   ├── idea-refine/                   #   Define
│   ├── spec-driven-development/       #   Define
│   ├── planning-and-task-breakdown/   #   Plan
│   ├── incremental-implementation/    #   Build
│   ├── context-engineering/           #   Build
│   ├── source-driven-development/     #   Build
│   ├── frontend-ui-engineering/       #   Build
│   ├── test-driven-development/       #   Build
│   ├── api-and-interface-design/      #   Build
│   ├── browser-testing-with-devtools/ #   Verify
│   ├── debugging-and-error-recovery/  #   Verify
│   ├── code-review-and-quality/       #   Review
│   ├── code-simplification/          #   Review
│   ├── security-and-hardening/        #   Review
│   ├── performance-optimization/      #   Review
│   ├── git-workflow-and-versioning/   #   Ship
│   ├── ci-cd-and-automation/          #   Ship
│   ├── deprecation-and-migration/     #   Ship
│   ├── documentation-and-adrs/        #   Ship
│   ├── shipping-and-launch/           #   Ship
│   └── using-agent-skills/            #   Meta: cómo usar este pack
├── agents/                            # 3 personas especialistas
├── references/                        # 4 listas de verificación complementarias
├── hooks/                             # Hooks del ciclo de vida de sesiones
├── .claude/commands/                  # 7 comandos slash (Claude Code)
├── .gemini/commands/                  # 7 comandos slash (Gemini CLI)
└── docs/                              # Guías de configuración por herramienta
```

---

## ¿Por Qué Agent Skills?

Los agentes de codificación con IA tienden por defecto al camino más corto, lo que a menudo significa omitir specs, tests, revisiones de seguridad y las prácticas que hacen que el software sea confiable. Agent Skills proporciona a los agentes flujos de trabajo estructurados que imponen la misma disciplina que los ingenieros senior aplican al código de producción.

Cada skill codifica juicio de ingeniería duramente ganado: *cuándo* escribir una spec, *qué* testear, *cómo* revisar y *cuándo* hacer ship. No son prompts genéricos: son el tipo de flujos de trabajo orientados a procesos que separan el trabajo de calidad de producción del de calidad de prototipo.

Las skills incorporan las mejores prácticas de la cultura de ingeniería de Google, incluyendo conceptos de [Software Engineering at Google](https://abseil.io/resources/swe-book) y la [guía de prácticas de ingeniería de Google](https://google.github.io/eng-practices/). Encontrarás la Ley de Hyrum en el diseño de API, la Beyonce Rule y la test pyramid en testing, el tamaño de cambios y las normas de velocidad de revisión en code review, la Cerca de Chesterton en simplificación, trunk-based development en git workflow, Shift Left y feature flags en CI/CD, y una skill dedicada a deprecación que trata el código como un pasivo. Estos no son principios abstractos: están incrustados directamente en los flujos de trabajo paso a paso que los agentes siguen.

---

## Contribuciones

Las skills deben ser **específicas** (pasos accionables, no consejos vagos), **verificables** (criterios de salida claros con requisitos de evidencia), **probadas en batalla** (basadas en flujos de trabajo reales) y **mínimas** (solo lo necesario para guiar al agente).

Consulta [docs/skill-anatomy.md](docs/skill-anatomy.md) para la especificación del formato y [CONTRIBUTING.md](CONTRIBUTING.md) para las pautas.

---

## Licencia

MIT: usa estas skills en tus proyectos, equipos y herramientas.
