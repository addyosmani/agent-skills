# Plan — Hardening del agente: anti-hardcoding + reparto Opus/Sonnet + intent-capture

## Context

Tres failure modes detectados en producción de proyectos cliente y en el meta-trabajo del plugin:

1. **Hardcoding excesivo (root cause de regresiones)**. En `<client>/<project>` el agente fijó ~10-12 valores que debían ser parámetros: códigos de cuenta `11100501` (CC vs AH vs WO), layout de Excel a 9 hojas, headers literales `empresa`/`cuenta`/`NIT`, 4 patrones tamiz fijados a febrero, código nómina `250501`. Cuando se agregaron Bold y Bancolombia, el pipeline rompió porque cada literal asumía el contexto BBVA original. Evidencia en `<vault>/clients/<client>/projects/<project>/sessions/2026-05-02.md` y `2026-05-03.md`.

2. **Reparto de modelo desbalanceado**. En esta sesión llegamos al 4% de Opus con Sonnet a 0%. El main Opus ejecutó `gh repo view`, `gh api`, lookups completos en lugar de delegar a un Agent Sonnet. Coste alto, sin razón. Memoria operativa ya guardada (`feedback_delegate_research_to_sonnet.md`); falta convertirla en rule importable y eventual gate.

3. **Captura de intent fragmentada**. El operador suelta bullets uno tras otro a medida que piensa (lo verbalizó él mismo). El agente actual procesa cada bullet inmediatamente y arranca a ejecutar antes de tener el panorama completo. El operador pidió blindaje: antes de ejecutar, batchear los bullets, formalizarlos en **JSON Schema 2020-12** (el estándar que usa Anthropic `tool_use` internamente) y exigir confirmación explícita.

Los tres ejes son distintos pero comparten una causa: **el agente actúa antes de tener el contexto completo o adecuado**. Resolverlos juntos refuerza el patrón de "verificar antes de ejecutar" en tres niveles (input → modelo → código).

## Out of scope

- Vendorizar `mattpocock/skills` entero. Solapamiento alto con skills existentes; descartado en respuesta previa al operador.
- **Sí adoptamos el patrón de grilling de `grill-with-docs`** — pero NO copiamos el skill ni el output (PRD/CONTEXT.md/ADRs en markdown). Lo trasplantamos a `intent-capture` con output JSON Schema 2020-12 conformante. Atribución vía URL en el SKILL.md y en los `references/`.
- Adoptar `CONTEXT.md` (glosario de dominio compartido) de mattpocock — propuesta interesante pero independiente, queda para otro plan si el operador lo pide.
- Refactorizar el código real de `<project>`. Esa rama vive en otro repo; este plan solo escribe los invariantes que prevendrán que vuelva a pasar.
- Modificar la API de tool_use o los hooks core de Claude Code.

## Recommended approach

Cuatro entregables atómicos, en orden secuencial dentro del mismo PR:

### 1. `skills/intent-capture/` (meta-skill, gate universal pre-ejecución, con grilling)

**Invariante**: el agente NUNCA ejecuta trabajo descrito por el operador sin pasar por **grill → capture → confirm → execute**. No hay heurística de "≥ N mensajes" — el gate aplica siempre, también cuando el operador escribe un solo bullet. La razón es que el operador sabe (y lo verbalizó) que tiende a soltar ideas progresivamente y a veces ambiguamente; el grilling lo obliga a refinar antes de que el agente se comprometa con una interpretación.

**Patrón de grilling** adoptado de [`mattpocock/skills/grill-with-docs`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md): entrevista 1×1 (una pregunta por turno, espera respuesta), prefiere leer código sobre asumir, valida contra contexto existente (vault Obsidian, ADRs, code-graph), no fija cantidad de preguntas — continúa hasta shared understanding. Adaptación clave para nuestro caso: el output **NO es un PRD/ADR** sino el JSON conformante al schema (mantenemos formato estructurado validable, solo trasplantamos la mecánica).

- `SKILL.md` con frontmatter `name: intent-capture` y `description` redactada para auto-fire en cualquier turno del operador que describa trabajo a ejecutar (Edit/Write/Bash-no-readonly). Workflow:
  1. **Detect**: cualquier mensaje del operador que pida acción concreta (verbo en imperativo o request de cambio en archivos / repos / configs). Excepciones: preguntas read-only ("¿qué hace X?", "explicame Y"), confirmaciones a un intent ya emitido ("dale", "sí", "procedé"), correcciones a un intent en curso (se mergean al batch existente).
  2. **Grill** (nuevo paso, antes de capture): el agente hace **una pregunta concreta por turno** hasta que el ask es inequívoco. Taxonomía de preguntas (en `references/grilling-taxonomy.md`):
     - **Scope**: "¿esto aplica a archivo X o también a Y?", "¿es solo el flujo principal o también edge cases?"
     - **Ambigüedad**: "decís 'simplificar' — ¿reducir líneas, mejorar legibilidad, o sacar features?"
     - **Constraint discovery**: "¿hay deadline?", "¿corre en CI o solo local?", "¿toca datos productivos?"
     - **Alternativa rechazada**: "consideré X y Z — ¿descartaste alguna por razón concreta o quedan abiertas?"
     - **Acceptance**: "¿cómo sabemos que está bien? ¿test que pase, output específico, demo manual?"
     - Si el agente puede contestar la pregunta leyendo código/docs (vault, glossary, ADRs), **lo hace en lugar de preguntar** — preferir evidencia a operador-asumido. Cita la evidencia ("según `<file:line>`, X ya hace Y, ¿confirmás que querés extender o reemplazar?").
     - **Stopping criterion**: el grilling se detiene cuando los tres campos por ask están poblados sin ambigüedad: `text` (qué), `scope` (dónde aplica y dónde no), `acceptance` (cómo se valida). Si los tres están claros, formalizar; si no, seguir preguntando.
  3. **Capture**: construir objeto JSON conformante a `intent-schema.json` con N ítems en `asks[]`. `status: "ready_for_confirmation"`. Incluir `original_text` (lo que el operador escribió crudo) Y `refined_text` (el ask post-grilling) por trazabilidad.
  4. **Present + ask "¿es todo?"** — mostrar el JSON al operador en bloque markdown, una línea final preguntando si falta algún ask. Si agrega más, loop a (2) con `asks[]` extendido (cada nuevo ask pasa por su propio grilling).
  5. **Confirm**: el operador responde "sí, procedé" / "es todo" / equivalente. El agente actualiza `status: "confirmed"` y registra `confirmed_at` + `confirmed_via`.
  6. **Route + Execute**: el `status: "confirmed"` es el unblock, **pero el main Opus NO ejecuta directo** — enruta al subagente correcto según `category` y scope del intent (decisión documentada en `references/execution-routing.md`):
     - `category: "research"` → `Agent(subagent_type="Explore")` o `general-purpose` (Sonnet).
     - `category: "feature" | "bug" | "refactor"` con `scope.includes.length ≤ 3` y sin nueva control-flow → `Agent(subagent_type="implementer-haiku")` (Haiku).
     - `category: "feature" | "bug" | "refactor"` con scope mediano o tests/integraciones → `Agent(subagent_type="implementer")` (Sonnet).
     - `category: "feature" | "bug" | "refactor"` que requiere dominio (regulación, protocolo cliente) → `Agent(subagent_type="agent-architect")` para crear/reusar specialist.
     - `category: "meta"` (cambios al plugin mismo: rules, skills, plan files, memory) → main-direct OK porque es kill-switch path documentado.
     - El subagente recibe como input el intent JSON completo (todos los `asks[]` confirmados que le tocan) más cita a las rules aplicables (`no-hardcoded-magic`, `secrets-and-pii`, etc.) — esto le da contexto limpio sin heredar el contexto sucio del main.
     - Tras retornar el subagente, el audit chain (`test-engineer` → `code-reviewer` → `security-auditor`) corre sobre el diff staged.
     - Si durante la ejecución el operador agrega un nuevo ask, el main **interrumpe** el subagente, vuelve a (2) con un nuevo intent (nuevo grilling), y reanuda recién con el nuevo `confirmed`.
- `references/intent-schema.json` con **JSON Schema 2020-12** (`$schema: "https://json-schema.org/draft/2020-12/schema"`, `type: object`). Campos:
  - `asks[]` (1-10 items): cada uno con `id` (`ask_[a-z0-9]{12}`), `original_text` (≤500 chars, lo que escribió el operador crudo), `refined_text` (10-500 chars, post-grilling), `scope` (object con `includes[]` y `excludes[]`), `acceptance` (string ≤300 chars, criterio verificable), `priority` (`high|medium|low`), `category` (`feature|bug|research|refactor|meta`), `captured_at` (date-time), `clarifications[]` (array de objects `{question, answer, asked_at}` — el log del grilling para auditoría).
  - `metadata`: `session_id`, `operator_id`, `created_at`, `agent_version`.
  - `status`: enum `draft | grilling | ready_for_confirmation | confirmed | rejected | superseded`.
  - `confirmation`: `confirmed_at`, `confirmed_via` (`explicit_text|askuserquestion`), null mientras `status != confirmed`.
- `references/grilling-taxonomy.md`: las 5 categorías de preguntas con 2-3 ejemplos cada una, criterios para decidir cuál usar primero.
- `references/intent-capture-examples.md`: 4 ejemplos canónicos: (i) ask único corto que necesita 1 pregunta de scope ("agregá test a X" → "¿unit, integration, o ambos?"), (ii) bullets sueltos como esta sesión con grilling intercalado entre cada bullet, (iii) cambio de scope mid-stream (operador agrega un ask después de confirmar el primero — nuevo intent, nuevo grilling), (iv) excepciones (read-only question — el skill NO se invoca y lo documenta).
- Gate: `batuta-skill-authoring` antes de Write (marker requerido).

### 2. `rules/no-hardcoded-magic.md` (rule-evidencia <project>)

Sigue formato canónico §A.4 (validado por `batuta-rule-authoring`). Estructura:
- `## Inviolable rules` (4 reglas): no literales para account codes / paths / fechas / patrones cuando provienen de config externa o input variable; constantes con nombre en archivo dedicado; tests deben correr con N≥2 inputs distintos antes de mergear; cualquier número o string que aparezca > 1 vez es config, no literal.
- `## Allowed patterns` (Python + TS): config dataclass, `os.environ.get("KEY")`, fixtures parametrizados con `pytest.mark.parametrize`.
- `## Anti-patterns` (concretos de <project>):
  - `account_code = "11100501"` literal en branch AH cuando debería ser `config.accounts.ah`.
  - `for sheet in range(9):` hardcodea el layout cuando bancos nuevos traen 5 o 12 hojas.
  - `headers = ["empresa", "cuenta", "NIT"]` literal cuando los headers vienen del template del cliente.
  - Regex tamiz `r"^FEB.*"` fijo al mes de febrero.
  - `if codigo_nomina == "250501":` literal embebido en lógica de routing.
- `## Documented exceptions`: constantes universales (HTTP status codes, días de la semana en código no-localizado), dimensiones de buffers fijadas por protocolo externo (TLS, MTU).
- Evidencia §A.6: <project> es N=1 directo; el operador confirma que el patrón también vive en patrones similares de proyectos previos (verbalizado en sesión actual: "varios problemas"), suficiente para N=2 si lo declaramos como universal proveniente del global `~/.claude/CLAUDE.md` "research-first" parent rule. Si `batuta-rule-authoring` rechaza, escalar a operador para citar segundo proyecto antes de Write.

### 3. `rules/model-routing.md` (delegación casi-universal: lookups Y implementación)

**Reframe crítico** (a partir de la sesión 2026-05-04): la rule no cubre solo lookups. La causa raíz del fracaso en `<project>` fue que el main Opus aceptó ejecutar refactor de hardcodes con contexto sucio y produjo resultados pésimos. La delegación a `implementer` / `implementer-haiku` existe en el plugin pero no se está usando. La rule debe convertir la delegación en invariante, no en sugerencia.

Tres dominios cubiertos por la rule, en orden de fuerza:

**A. Lookups y research** (lo que ya tenía la versión previa de esta sección):
- Main Opus NO ejecuta `gh repo view|api`, `WebFetch`, exploración multi-archivo (>3 queries), lectura de READMEs largos, surveys de catálogos.
- Esos pasos van por `Agent(subagent_type="Explore")` o `general-purpose` (Sonnet por default).
- Excepción: un único `gh`/`Read`/`Grep` < 30 líneas que alimenta el siguiente tool call del mismo turno (latencia > coste).

**B. Implementación de trabajo descrito por el operador** (nuevo, núcleo del problema):
- Main Opus NO ejecuta `Edit`/`Write` ni Bash-mutador en archivos de proyectos cliente para implementar trabajo. Eso va por:
  - `implementer-haiku` (Haiku) cuando: ≤ 3 archivos, sin nueva control-flow, sin async, sin error handling nuevo, scope mecánico (renombres, CSS, strings, README/CHANGELOG, config flips, tests fixture-only). El proyecto `<client>/<project>` (cited evidence) cae acá: ~12 puntos hardcodeados en código pequeño, mecánicos, perfecto para Haiku.
  - `implementer` (Sonnet) cuando: cualquier cosa con control-flow, tests con assertions, integraciones, async, error handling, o refactor multi-módulo.
  - Specialist via `agent-architect` cuando: dominio específico que los base agents no cubren (regulaciones, frameworks, protocolos cliente).
- Main Opus SÍ retiene: orquestación, decisión arquitectónica, grilling de intent-capture, sintesis post-subagent, edits en archivos del meta-trabajo del plugin (plan files, memory entries, MEMORY.md index, ADRs, este `rules/model-routing.md` mismo).

**C. Audit y review**:
- Main Opus NO ejecuta el audit chain — el chain ya delega a `test-engineer`, `code-reviewer`, `security-auditor` (Sonnet) por contrato existente. La rule lo refuerza para que main no "salte" el chain con edits directos.

Estructura del archivo:

- `## Inviolable rules`: 5 reglas numeradas cubriendo A+B+C arriba.
- `## Allowed patterns`: 3 ejemplos concretos de delegación correcta:
  1. Research: operador pide "explorá X repo" → `Agent(subagent_type="Explore")` con prompt autocontenido → main sintetiza el reporte ≤400 palabras.
  2. Refactor pequeño tipo <project>: intent-capture confirmó "limpiar hardcodes en módulo X" → main invoca `implementer-haiku` con el intent JSON como contexto + cita a `rules/no-hardcoded-magic.md` → haiku ejecuta → audit chain.
  3. Feature multi-módulo: intent-capture confirmó "agregar nuevo banco al pipeline" → main invoca `implementer` (Sonnet) → audit chain.
- `## Anti-patterns`: 4 ejemplos de violación:
  1. `gh repo view <repo>` directo en main para explorar.
  2. **Main Opus editando archivos `.py` en `<project>/` para limpiar hardcodes** (el caso real que falló).
  3. Main escribiendo tests directos en lugar de invocar `implementer` o `implementer-haiku`.
  4. Main aplicando un fix de bug "rápido" en código cliente sin pasar por intent-capture + delegación.
- `## Documented exceptions`:
  - Edits del meta-trabajo del plugin (plan files, memory, MEMORY.md, ADRs, rules) → main-direct OK.
  - Una sola línea de fix obvio cuando el operador dice explícitamente "no llames implementer, hacelo vos rápido" — bypass via instrucción operador.
  - Operación read-only (Read, Glob, Grep, Bash readonly) → siempre OK en main.
- Evidencia §A.6: la decisión vive en `~/.claude/CLAUDE.md` "Native delegation + post-edit audit" + ADR-0001 + ADR-0002 + DELEGATION-RULE.md, más el caso real de `<project>` 2026-05-04. Califica universal por §A.6 documented exception (verbatim from global) Y por evidencia N≥2 (<project> + cualquier proyecto futuro donde aplicaría).

### 4. Extensión audit chain — `agents/code-reviewer.md` Step de Readability

Agregar bullet en Review Framework dimensión #2 (Readability): "**Anti-hardcoding check**: grep el diff por literales numéricos > 3 dígitos, strings ALL_CAPS no declarados como constante, paths absolutos, fechas embebidas. Por cada hit, validar que no debería ser parámetro/config. Si sí, FLAG bloqueante con cita a `rules/no-hardcoded-magic.md`."

NO crear nuevo agente; extender el existente. Editar dentro del Step ya escrito.

### 5. Propagación al user-scope: live `~/.claude/CLAUDE.md` + réplica `user-settings/CLAUDE.md`

El comportamiento nuevo (intent-capture obligatorio antes de ejecutar, model-routing Opus↔Sonnet) debe quedar **en las reglas user-scope**, no solo en el plugin. Hay dos archivos que mantener en sync:

- **Live**: `C:\Users\JNMZ\.claude\CLAUDE.md` — el que carga Claude Code en cada sesión. Última edición 2026-05-02. Incluye Authoring gates, Vault lookup step 0, Wikilink invariant, project-init/retrofit auto-trigger detallado.
- **Réplica versionada**: `E:\BATUTA PROJECTS\batuta-agent-skills\user-settings\CLAUDE.md` — copia trackeada en git (May 1). Está **desfasada** respecto al live: le faltan Authoring gates, Vault lookup, Wikilink invariant, y el detalle de auto-triggers de hygiene. Esa divergencia es bug latente: cualquier máquina que se rehidrate desde el repo carga reglas viejas.

Trabajo en dos pasos discretos:

**5a. Sync de baseline (sin cambios de comportamiento)**: copiar el contenido actual de `~/.claude/CLAUDE.md` (live) sobre `user-settings/CLAUDE.md` (réplica), commit aparte. Diff esperado ≈80 líneas (los bloques que están solo en live). Esto deja la réplica al día antes de aplicar los nuevos bloques. Sin este sync, el commit siguiente mezcla "actualización de baseline" con "adición de comportamiento nuevo" y se vuelve impossible to review.

**5b. Adición de los bloques nuevos** (a ambos archivos en el mismo commit, idénticos):

- **Nuevo bloque `## Intent capture (pre-execution gate)`**: 1 párrafo + 4 viñetas. **Aplica siempre**, en cada turno del operador que pida trabajo — no condicionado a count de mensajes. El main agent NUNCA ejecuta `Edit`/`Write`/Bash-no-readonly hasta que existe un intent JSON `status: "confirmed"` en la conversación que cubra el ask actual. Excepciones: preguntas read-only ("¿qué hace X?"), confirmaciones simples a un intent emitido, y correcciones a un intent en curso (que extienden el batch existente). Cita la rule `model-routing.md` para el caso "el operador pidió research" → delegar a subagente Sonnet en lugar de ejecutar en main.
- **Extensión de `## Native delegation + post-edit audit`**: reescribir la sección para que la delegación sea el **default**, no la excepción. (a) Lookups (`gh`/`WebFetch`/exploración multi-archivo) → Sonnet via `Explore`/`general-purpose`. (b) **Implementación en código de proyectos cliente → SIEMPRE `implementer-haiku` (Haiku) o `implementer` (Sonnet) según scope, NUNCA main directo**. (c) Main Opus retiene orquestación, grilling, decisión de routing, edits del meta-trabajo del plugin. Toda la sección apunta a `rules/model-routing.md` para los detalles.
- **Extensión de `## Engineering invariants from rules/`**: listar las dos rules nuevas (`no-hardcoded-magic`, `model-routing`) en el ejemplo de imports recomendados. Las rules son opt-in per-proyecto; el bloque global solo las hace visibles.

Una vez sincronizadas, cualquier máquina que clone el plugin y corra el bootstrap deja `~/.claude/CLAUDE.md` igual al `user-settings/CLAUDE.md` del repo. Si el operador edita `~/.claude/CLAUDE.md` en otra máquina, el siguiente sync la vuelca al repo y discutimos el diff en el PR — la réplica es el source of truth versionado.

**Out of scope acá**: automatizar el sync bidireccional (script `sync-user-claudemd.sh` que diffee y actualice). Eso es un follow-up si se vuelve fricción real; por ahora, sync manual es suficiente y obliga a revisar cambios.

## Files to create or modify

**Create**:
- `skills/intent-capture/SKILL.md` — workflow del meta-skill (grill → capture → confirm → route → execute, ~210 líneas)
- `skills/intent-capture/references/intent-schema.json` — JSON Schema 2020-12 con campos extendidos (original_text/refined_text/scope/acceptance/clarifications, ~110 líneas)
- `skills/intent-capture/references/grilling-taxonomy.md` — 5 categorías de preguntas con ejemplos y criterios de selección (~80 líneas)
- `skills/intent-capture/references/execution-routing.md` — árbol de decisión "intent → subagente" (research → Explore; refactor pequeño → implementer-haiku; feature mediano → implementer; dominio → agent-architect; meta → main-direct) con 6-8 ejemplos concretos cubriendo <project> como caso de Haiku (~100 líneas)
- `skills/intent-capture/references/intent-capture-examples.md` — 4 ejemplos canónicos con grilling intercalado (~90 líneas)
- `rules/no-hardcoded-magic.md` — rule canónica §A.4/§A.5/§A.6 (~140 líneas, dentro del rango 50-200)
- `rules/model-routing.md` — rule canónica (~110 líneas)
- `docs/adr/0013-intent-capture-and-model-routing.md` — ADR único cubriendo decisiones 1+3 (separa de la rule porque la rule es invariante, el ADR captura el "por qué de este formato")

**Modify**:
- `agents/code-reviewer.md` — extender Review Framework dimensión #2 con anti-hardcoding check
- `CLAUDE.md` (raíz proyecto) — agregar bloque de imports `@.claude/rules/no-hardcoded-magic.md` y `@.claude/rules/model-routing.md` en la sección "Engineering invariants"
- **`user-settings/CLAUDE.md`** (réplica versionada en repo) — paso 5a: sync con live. Paso 5b: agregar los tres bloques nuevos (intent-capture gate, model-routing en native delegation, rules nuevas en engineering invariants).
- **`C:\Users\JNMZ\.claude\CLAUDE.md`** (live, user-scope, en esta máquina) — paso 5b: aplicar los mismos tres bloques nuevos para que la sesión actual y futuras los carguen sin esperar a re-bootstrap del plugin.
- `tools/setup-rules.sh` — incluir las dos rules nuevas en `--all`
- `tests/v2.5-validators/run.sh` — agregar validador estructural de `rules/no-hardcoded-magic.md` y `rules/model-routing.md` (presencia de Anti-patterns no vacío, longitud 50-200, frontmatter sin `name:`/`description:`)
- `~/.claude/projects/E--BATUTA-PROJECTS-batuta-agent-skills/memory/MEMORY.md` — agregar pointer a la nueva rule de model-routing (la entrada de memoria ya existe en disco como `feedback_delegate_research_to_sonnet.md`, pero el index de MEMORY.md no fue actualizado en mi turno previo por bloqueo de plan mode; debe agregarse al ejecutar)

**Reuse (no modificar)**:
- `skills/batuta-rule-authoring/SKILL.md` — gate de las dos rules nuevas, ya está montado
- `skills/batuta-skill-authoring/SKILL.md` — gate del skill `intent-capture`, ya está montado
- `hooks/pre-write-skill-gate.sh` y `pre-write-agent-gate.sh` — ya bloquean Writes sin marker, no requieren cambios
- `rules/_meta/rule-template.md` — template canónico, las nuevas rules lo siguen literal

## Verification

**Estática (pre-merge)**:
1. `bash tests/v2.5-validators/run.sh` — exit 0; nuevos validadores pasan para las dos rules.
2. `python -m jsonschema -i <ejemplo-real> skills/intent-capture/references/intent-schema.json` — validación del schema contra los 3 ejemplos canónicos pasa.
3. Frontmatter y secciones obligatorias presentes en las dos rules y en el SKILL.md (validado por authoring gates al momento del Write).

**Dinámica (en sesión real)**:
4. Sesión simulada: operador escribe 3 bullets sueltos sobre features distintas. Esperado: main detecta el patrón, invoca `intent-capture`, devuelve JSON conformante, pregunta "¿es todo?", espera confirmación antes de cualquier `Edit`/`Write`.
5. Sesión simulada: feature branch con commit que reintroduce un literal `account_code = "11100501"` en un módulo. Esperado: `code-reviewer` flaggea con cita explícita a `rules/no-hardcoded-magic.md` Anti-pattern #1.
6. Sesión simulada: pregunta "explorá X repo de GitHub". Esperado: main NO corre `gh` directo; lanza `Agent(subagent_type="Explore")` antes de cualquier comando externo.

**E2E con <project> (después de merge a este plugin)**:
7. Importar las dos rules en `<<project>>/CLAUDE.md` vía `setup-rules.sh --rule no-hardcoded-magic --rule model-routing`. Re-correr el pipeline de <project> sobre Bold y Bancolombia. Esperado: el code-reviewer del audit chain bloquea cualquier reintroducción de los 5 patrones documentados como Anti-patterns.

**User-scope (post-edit en CLAUDE.md global)**:
8. `diff -u ~/.claude/CLAUDE.md user-settings/CLAUDE.md` después del paso 5b — debe ser **vacío** (los dos archivos en bytes-idéntico). Si difieren, abortar antes de commit.
9. Iniciar nueva sesión Claude Code en cualquier proyecto cualquiera. El system-reminder de `claudeMd` debe incluir los nuevos bloques (intent-capture gate, model-routing rule). Si no, el live no quedó actualizado.
10. En la nueva sesión, enviar **un solo mensaje** pidiendo cualquier trabajo concreto (ej: "agregá un comentario a foo.py línea 12"). Esperado: agente para, invoca `intent-capture`, devuelve JSON con un único `asks[0]`, pregunta "¿es todo?" — sin haber tocado el repo. Si arranca a ejecutar directo el ask, el gate universal no quedó activo. Repetir con 3 bullets sueltos en mensajes distintos: el agente debe NO ejecutar nada hasta que el operador diga explícitamente "es todo, procedé".
11. Edge case: enviar una pregunta read-only ("¿qué hace el módulo X?"). Esperado: NO se invoca `intent-capture` (es exempción explícita), agente responde directo. Si invoca el skill, las exempciones del SKILL.md están mal redactadas.
12. **Grilling test**: enviar un ask deliberadamente ambiguo ("simplificá esto"). Esperado: agente NO arranca a tocar archivos; primero pregunta UNA cosa concreta (ej: "¿reducir líneas, mejorar legibilidad, o sacar features?"), espera respuesta, sigue grillando hasta tener `scope` y `acceptance` claros, recién entonces formaliza JSON. El log de Q&A debe quedar persistido en `clarifications[]` del intent.
13. **Code-over-asking**: enviar ask que la grilling-taxonomy puede contestar leyendo el repo ("modificá el endpoint de auth"). Esperado: en lugar de preguntar "¿cuál endpoint?", el agente lee el repo, encuentra el archivo, y dice "encontré `auth.py:42 POST /auth/login` y `oauth.py:18 GET /oauth/callback` — ¿cuál?". Cita explícita al archivo.
14. **Routing test (refactor pequeño tipo <project>)**: en proyecto cliente con código pequeño, intent-capture confirma "limpiar 3 hardcodes en módulo X". Esperado: main NO ejecuta `Edit`/`Write` directamente; invoca `Agent(subagent_type="implementer-haiku")` con el intent JSON + cita a `rules/no-hardcoded-magic.md`. El haiku ejecuta, retorna diff, audit chain corre. Si main ejecuta los edits directos, la rule de routing no quedó activa.
15. **Routing test (feature multi-módulo)**: intent confirmado "agregar nuevo banco al pipeline" con scope.includes 5+ archivos. Esperado: main invoca `Agent(subagent_type="implementer")` (Sonnet), no haiku. Decisión basada en `execution-routing.md`.
16. **Routing test (meta-trabajo)**: intent confirmado "actualizar rules/code-style.md sección X". Esperado: main edita directo (es kill-switch path documentado). NO debería invocar implementer para meta-trabajo del plugin.

## Execution model — Agent Team con auditores (Sonnet)

La implementación corre via `TeamCreate` / `Agent` (subagentes Sonnet en paralelo) con telemetría visible al operador en tiempo real. El main Opus solo orquesta — NO ejecuta Edits/Writes de los archivos del plan. Cumple la rule de routing que estamos creando (eat your own dog food).

**Builders (en paralelo, Sonnet)**:
1. **`rules-builder`** (`general-purpose` o `implementer`) — invoca `batuta-rule-authoring`, espera marker, escribe `rules/no-hardcoded-magic.md` y `rules/model-routing.md` siguiendo el formato §A.4/§A.5/§A.6 con el contenido especificado en este plan secciones 2 y 3. Retorna build-log.
2. **`skill-builder`** (`general-purpose` o `implementer`) — invoca `batuta-skill-authoring`, espera marker, escribe `skills/intent-capture/SKILL.md` + los 4 archivos de `references/`. Retorna build-log.
3. **`settings-sync-er`** (`implementer-haiku`) — paso 5a: copia el contenido de `~/.claude/CLAUDE.md` (live) a `user-settings/CLAUDE.md` (réplica). Paso 5b: aplica los tres bloques nuevos (intent-capture gate, native delegation reescrita, engineering invariants extendido) a AMBOS archivos idénticamente. Retorna diff antes de commit.
4. **`agent-extender`** (`implementer-haiku`) — extiende `agents/code-reviewer.md` Review Framework dimensión #2 con el anti-hardcoding check según sección 4 del plan.
5. **`tooling-extender`** (`implementer-haiku`) — agrega las dos rules a `tools/setup-rules.sh --all` y agrega los validadores estructurales a `tests/v2.5-validators/run.sh`.

**Coordinación**: los 5 builders pueden correr en paralelo sin conflicto (touchean archivos disjuntos). El main monitorea con `Monitor` y reporta progreso al operador conforme cada agente cierra.

**Auditores (sequential, Sonnet, después de que los builders terminen)**:
6. **`test-engineer`** — corre tests existentes + valida que los Verification steps 1-3 (estática) pasen.
7. **`code-reviewer`** — review cinco-dimensiones sobre el diff completo, con énfasis en consistencia entre `rules/` y los bloques nuevos de CLAUDE.md.
8. **`security-auditor`** — valida que no se haya filtrado contenido sensible (paths absolutos del operador, account codes literales en los Anti-patterns deberían estar redactados como ejemplos genéricos pero reconocibles, no datos productivos reales).

**Si algún auditor flagea bloqueante, el main no commitea**. El operador decide: o el builder fixea, o el ítem queda como follow-up en `docs/plans/active/`.

**Tracking visible al operador**: `TaskCreate` con un task por builder + un task por auditor; `TaskUpdate` `in_progress`/`completed` conforme avanza cada uno; el operador ve el progreso en su UI sin tener que preguntar.

## Open questions

- **Auto-trigger del intent-capture skill**: ¿alcanza con la `description` del SKILL.md (mecanismo nativo de Claude Code) o necesitamos un `UserPromptSubmit` hook que enforce el gate desde runtime (similar a `pre-write-skill-gate.sh`)? Recomendación inicial: empezar con sólo `description`; promover a hook solo si en práctica el skill no se auto-invoca. Decidir post-merge en función de telemetría (`.claude/kb-debug.log`).
- **Cuántas preguntas máximo en el grilling**: `grill-with-docs` no fija un cap. ¿Lo dejamos abierto (continúa hasta `scope` + `acceptance` claros) o ponemos un soft-cap de 5 preguntas con escape "saltá esto y formalizá con lo que tenés"? Recomendación: sin cap duro, pero el SKILL.md debe documentar criterio explícito de stopping para que el agente no entre en loop con un operador que no quiere refinar más.
- **Scope del JSON Schema**: ¿incluir `oneOf` para variantes (research-ask vs implementation-ask vs meta-ask) o un objeto plano con `category` enum? Recomendación: enum plano para simplicidad; `oneOf` solo si la complejidad lo justifica más adelante.
- **Confirmación del N=2 §A.6 para `no-hardcoded-magic`**: si `batuta-rule-authoring` rechaza por evidencia insuficiente (un solo proyecto citado), el operador debe nombrar un segundo proyecto donde haya visto el patrón antes de proceder con el Write. Bloqueante para esa rule, no para las otras dos entregables.
