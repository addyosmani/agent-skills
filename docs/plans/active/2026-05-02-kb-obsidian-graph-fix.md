# Plan: KB Obsidian — grafo conectado, dashboard funcional, pipeline desatendido

## Context

El vault de Obsidian tiene ~50 archivos pero el grafo muestra puntos aislados: **40 de 40 glossary entries tienen cero wikilinks**, el dashboard tiene 7 queries Dataview que devuelven vacío porque apuntan a carpetas sin contenido (`decisions/`, `gotchas/`), y el pipeline (`kb-pipeline` + `post-commit-kb.sh`) no genera `[[links]]` ni frontmatter `related:`. El resultado es conocimiento desagregado: decisiones que deberían estar cruzadas (KB-43 Temporal ↔ KB-40 ADK ↔ KB-46 ADK vs Pydantic) viven como islas sin conexión. El research-first Step 1.5 busca en el vault pero no encuentra nada útil porque no hay wikilinks ni clasificación correcta. Además, `kb_pipeline_enabled` y `adr_mirror_enabled` están en `false` incluso en el repo del plugin — no se dogfoodea.

El operador pide que el sistema sea **desatendido**: no tener que recordar "replica en obsidian" o "cura en obsidian".

## Fases

---

### Fase 0 — Convención de wikilinks y frontmatter (prerequisito)

Define el contrato que todas las fases posteriores siguen.

**0A. Agregar sección "Step 3.5: Wikilink convention" a `batuta-kb-vault` SKILL.md**
- Archivo: `skills/batuta-kb-vault/SKILL.md` (insertar entre Step 3 y Step 4)
- Qué se linkea (allowlist):
  - `[[KB-NN]]` — cross-reference a otra entrada KB por su ID
  - `[[client-slug]]` — link al archivo metadata del cliente (`[[kiosco]]`, `[[kiro]]`)
  - `[[project-slug]]` — link al subtree del proyecto (`[[bancos-ekgs]]`, `[[bato-gek]]`)
  - `[[Technology Name]]` — link a producto/dominio glossary (`[[Temporal.io]]`, `[[Google ADK]]`, `[[Evolution API]]`)
  - `[[adr-NNNN-slug]]` — link a ADR miroreado
- Qué NO se linkea: SHAs, branches, file paths, términos genéricos sin glossary entry
- Dónde aparecen: inline en body (primera mención) + campo `related:` en frontmatter (YAML list)

**0B. Agregar `related:` y `domain:` obligatorio a contratos de frontmatter en Step 4**
- Archivo: `skills/batuta-kb-vault/SKILL.md` — Step 4
- Session: agregar `related: ["[[<CLIENT>]]", "[[<PROJECT>]]"]`
- Decision: agregar `related: []`, `domain:` (required, nunca `unknown`), `origin_project:`
- Gotcha: agregar `related: []`
- Anti-racionalización existente en Step 3 ya cubre esto: "Wikilinks are too much overhead" → "Backlinks are the entire reason Obsidian was chosen over Notion"

**0C. Actualizar templates en el vault**
- `<vault>/templates/decision.md` — agregar `related: []`, `domain:`, `origin_project:`
- `<vault>/templates/gotcha.md` — agregar `related: []`
- `<vault>/templates/session-journal.md` — agregar `related: ["[[<CLIENT-SLUG>]]", "[[<PROJECT-SLUG>]]"]`

---

### Fase 1 — Agentes y skills generan wikilinks (pipeline hacia adelante)

**1A. `agents/kb-pipeline.md` — Step 3 (Write)**
- Agregar párrafo obligatorio de wikilinks después de "a brief context paragraph plus the evidence excerpt":
  > "**Wikilinks (mandatory)**: Every written file must include inline `[[wikilinks]]` per the convention in `batuta-kb-vault` SKILL.md Step 3.5. At minimum: `[[client-slug]]`, `[[project-slug]]`, and cross-KB references. Populate `related:` frontmatter. Without wikilinks, the entry is invisible to research-first Step 1.5 and to the Obsidian graph."
- Agregar `related` a la lista de campos de frontmatter requeridos
- En la sección de session journal append, cambiar bullet plano a incluir `[[client]]`/`[[project]]`

**1B. `agents/kb-curator.md` — Step 3 (Write outputs per category)**
- Para cada categoría que escribe archivo (decision-new, decision-supersede, gotcha-new, gotcha-update, playbook-candidate, glossary-entry): agregar instrucción de wikilinks y `related:`
- Agregar a Red Flags: "Output file without any `[[wikilinks]]` in body or empty `related:` frontmatter"

**1C. `agents/kb-backfiller.md` — Step 2 (Run the phase)**
- Phase 1 (README+docs): después del copy verbatim, agregar scan de menciones de productos/clientes/KB IDs → `related:` frontmatter
- Phase 2 (commit log): incluir `[[client]]` y `[[project]]` wikilinks en bullets

**1D. `skills/kb-curate/SKILL.md` — Step 3 (Apply the hybrid control matrix)**
- Agregar: "Every file written (both `.draft` and auto-applied) must include inline `[[wikilinks]]` and a `related:` frontmatter field per the vault convention (batuta-kb-vault Step 3.5)."
- Agregar Red Flag: "Auto-apply producing a file with empty `related:` frontmatter"

**1E. `hooks/post-commit-kb.sh` — vault mirror (líneas 188-196)**
- Agregar wikilinks al bullet en el vault mirror:
  ```bash
  echo "  - project: [[${client}]]/[[${project}]]"
  ```
- Agregar `related:` al frontmatter del vault journal (líneas 177-188):
  ```yaml
  related: ["[[${client}]]", "[[${project}]]"]
  ```
- NO tocar el journal de `docs/sessions/` (vive en git del proyecto, no en el vault)

**1F. `skills/research-first-dev/SKILL.md` — Step 1.5**
- Agregar al lookup order: "Also check `related:` frontmatter fields for `[[library-name]]` wikilinks — these are more reliable than body-text grep when the vault has been curated."
- Agregar instrucción: "When a vault hit resolves the question, the agent MUST cite the vault path as source and skip Step 2 (per staleness policy < 4 months)."

---

### Fase 2 — Dashboard y _status.md funcionales

**2A. Reescribir `<vault>/_dashboard.md`** — las 7 queries + 2 nuevas

| Sección | Query actual (rota) | Query corregida |
|---------|-------------------|-----------------|
| Drafts pending | `file.extension = "draft"` | `FROM "" WHERE contains(tags, "status/needs-review") OR contains(tags, "status/draft")` |
| Stale gotchas | `FROM #gotcha` | `FROM "gotchas" OR "glossary/domains" WHERE (type = "gotcha" OR knowledge_type = "edge-case") AND last_verified < date(today) - dur(4 months)` |
| Sessions 7d | `FROM #session` + `files_changed` | `FROM "clients" WHERE type = "session" AND date >= date(today) - dur(7 days)` — quitar columna `files_changed` |
| Decisions accepted | `FROM "decisions"` | `FROM "decisions" OR "glossary/domains" WHERE type = "decision" AND (status = "accepted" OR status = "proposed")` |
| Decisions superseded | `FROM "decisions"` | `FROM "decisions" OR "glossary/domains" WHERE type = "decision" AND status = "superseded"` |
| Open questions | `FROM #question-open` | `FROM "" WHERE contains(tags, "question-open")` |
| Inbox | `FROM "_inbox"` | Sin cambio (correcta pero vacía — se llena cuando el pipeline escribe) |
| **NUEVA: KB por tipo** | — | `TABLE type, domain, knowledge_type FROM "glossary/domains" OR "decisions" OR "gotchas" SORT type ASC` |
| **NUEVA: Actividad reciente** | — | `TABLE date, client, project FROM "clients" WHERE type = "session" SORT date DESC LIMIT 10` |

**2B. Arreglar `_status.md` de cada proyecto** (2 archivos)
- `<vault>/clients/jota-batuta/projects/batuta-agent-skills/_status.md`
- `<vault>/clients/kiosco/projects/bancos-ekgs/_status.md`
- Fix "Decisiones recientes": cambiar `FROM "decisions"` a `FROM "decisions" OR "glossary/domains" WHERE (type = "decision") AND (contains(client, "<slug>") OR contains(origin_project, "<slug>"))`
- Fix "Sesiones recientes": quitar columnas `branch`, `files_changed` (no existen en frontmatter)
- Fix "Gotchas activos": cambiar `FROM "gotchas"` a `FROM "gotchas" OR "glossary/domains" WHERE type = "gotcha"`

---

### Fase 3 — Curación del vault existente

**3A. Reclasificar decisions** (10 entradas) — cambiar `type: glossary` → `type: decision`, agregar `status: accepted`

| KB ID | Razón |
|-------|-------|
| KB-13 | "framework agéntico directo para MVP" |
| KB-15 | "stack definitivo agente vigilante" |
| KB-25 | "decisión gateway LLM OpenRouter" |
| KB-31 | "decisión NO adoptar Gateway OpenClaw" |
| KB-32 | "decisión Better Auth multi-tenant" |
| KB-40 | "Decisión BATO v2 pivot a Google ADK" |
| KB-43 | "Decisión Temporal.io self-hosted" |
| KB-46 | "ADK vs Pydantic AI" |
| KB-47 | "BATO v2 separación automático vs conversacional" |
| KB-49 | "1 sesión ADK por grupo" |

NO mover archivos de `glossary/domains/` a `decisions/` — el dashboard ya busca en ambos (Fase 2). El move se puede hacer en un sprint futuro.

**3B. Reclasificar gotchas** (3 entradas) — cambiar `type: glossary` → `type: gotcha`, agregar `severity:`

| KB ID | Severity | Razón |
|-------|----------|-------|
| KB-8 | workaround | "falsos positivos por lag operativo" |
| KB-21 | blocker | "WhatsApp Groups API bloqueo para empresas nuevas" |
| KB-39 | workaround | "Coolify + Traefik fix no available server" |

**3C. Reclasificar patterns** (7 entradas) — cambiar `type: glossary` → `type: pattern`

KB-27, KB-28, KB-29, KB-33, KB-34, KB-38, KB-42

**3D. Manejar noise** (2 entradas)

| KB ID | Acción | Razón |
|-------|--------|-------|
| KB-44 | Cambiar frontmatter: `type: project-agreement`, agregar `tags: [noise/project-specific]` | Presupuesto $200/mes — dinámico, no conocimiento reutilizable |
| KB-45 | Cambiar frontmatter: `type: meta-tracking`, agregar `tags: [noise/ephemeral]` | Snapshot de estado — supersedido por las decisiones reales |

**3E. Completar frontmatter `domain: unknown`** en 11 entradas

| KB ID | Dominio correcto | knowledge_type |
|-------|-----------------|----------------|
| KB-39 | infraestructura | gotcha |
| KB-40 | agentes-ia | decision |
| KB-41 | infraestructura | architecture |
| KB-42 | agentes-ia | pattern |
| KB-43 | infraestructura | decision |
| KB-44 | negocio | agreement |
| KB-45 | infraestructura | meta-tracking |
| KB-46 | agentes-ia | decision |
| KB-47 | agentes-ia | decision |
| KB-48 | ux-comunicacion | design |
| KB-49 | agentes-ia | decision |

Completar `origin_project: ""` en las 13 entradas que lo tienen vacío (la mayoría son de `bato-gek`).

**3F. Inyectar wikilinks en las 40 entradas del glossary**

Para cada `kb-*.md`:
1. Agregar `related: [...]` en frontmatter con wikilinks a: cliente, proyecto, tecnologías, KB entries cruzados
2. Agregar `[[links]]` inline en el body donde se menciona una tecnología o concepto por primera vez

Mapa de cross-references clave (subconjunto):
- KB-40 (ADK pivot) → `related: ["[[KB-43]]", "[[KB-46]]", "[[KB-42]]", "[[Google ADK]]", "[[Pydantic AI]]", "[[kiosco]]", "[[bato-gek]]"]`
- KB-43 (Temporal) → `related: ["[[KB-40]]", "[[KB-42]]", "[[Temporal.io]]", "[[Google ADK]]", "[[kiosco]]"]`
- KB-46 (ADK vs Pydantic) → `related: ["[[KB-40]]", "[[KB-43]]", "[[Google ADK]]", "[[Pydantic AI]]"]`
- KB-12 (stack híbrido) → `related: ["[[KB-15]]", "[[n8n]]", "[[Prefect]]", "[[kiosco]]", "[[bato-gek]]"]`
- KB-42 (multi-bot) → `related: ["[[KB-43]]", "[[KB-27]]", "[[KB-41]]", "[[Evolution API]]", "[[Temporal.io]]"]`

Los 40 archivos se editan con un script o manualmente (el agente lee contenido de cada uno y genera los links apropiados basándose en menciones de tecnologías y conceptos).

**3G. Crear anchor glossary entries para tecnologías clave**

Crear archivos mínimos en `<vault>/glossary/products/` para que los wikilinks tengan destino:

- `Temporal.io.md` — orquestación de workflows durables → `related: ["[[KB-43]]"]`
- `Google-ADK.md` — framework agéntico de Google → `related: ["[[KB-40]]", "[[KB-46]]"]`
- `Pydantic-AI.md` — framework para pipelines LLM → `related: ["[[KB-46]]", "[[KB-35]]"]`
- `Evolution-API.md` — WhatsApp Business API middleware → `related: ["[[KB-41]]", "[[KB-24]]", "[[KB-42]]"]`
- `n8n.md` — workflow automation (manos) → `related: ["[[KB-12]]", "[[KB-18]]"]`
- `ICG.md` — ERP de Kiosco → `related: ["[[KB-11]]", "[[kiosco]]"]`
- `WorldOffice.md` — ERP de Kiro → `related: ["[[kiro]]"]`
- `Coolify.md` — PaaS self-hosted → `related: ["[[KB-39]]"]`
- `Prefect.md` — orquestación Python → `related: ["[[KB-12]]", "[[KB-15]]", "[[KB-38]]"]`
- `OpenRouter.md` — gateway LLM unificado → `related: ["[[KB-25]]"]`

Cada uno con frontmatter: `type: glossary`, `axis: product`, `tags: [glossary, product]`, `last_verified: 2026-05-02`

---

### Fase 4 — Configuración y CLAUDE.md

**4A. Habilitar pipeline en kb-config.json del plugin**
- Archivo: `.claude/kb-config.json`
- Cambiar `adr_mirror_enabled: true`, `kb_pipeline_enabled: true`

**4B. Actualizar CLAUDE.md global del usuario**
- Archivo: `C:\Users\JNMZ\.claude\CLAUDE.md`
- En sección "Obsidian KB as durable memory", agregar después del párrafo existente:

  > **Wikilink invariant**: Every file written to the vault must include inline `[[wikilinks]]` for client, project, technology, and cross-KB references. Every file must have a `related:` frontmatter field (YAML list of wikilinks). This is the sole mechanism connecting notes in the Obsidian graph — without wikilinks, entries are invisible to `research-first-dev` Step 1.5 and to the graph view. Convention defined in `batuta-kb-vault` SKILL.md Step 3.5.

- En sección "Research-first (non-negotiable)", agregar paso entre 0 y 1:

  > 0. **Vault lookup** — before going external, check the Obsidian vault for existing decisions/gotchas on the same topic. If a curated L2 entry exists with `last_verified` < 4 months, it supersedes external lookup. This leverages past research instead of repeating it. Delegated to research-first-dev Step 1.5.

**4C. Actualizar CLAUDE.md del proyecto**
- Archivo: `E:\BATUTA PROJECTS\batuta-agent-skills\CLAUDE.md`
- En sección "kb-pipeline (per-commit dispatch)", agregar:
  > The kb-pipeline agent MUST generate `[[wikilinks]]` in every vault write and populate `related:` frontmatter. Without this, the vault graph remains disconnected and research-first Step 1.5 lookups return zero results. Convention: `batuta-kb-vault` SKILL.md Step 3.5.
- Agregar nota de dogfooding:
  > This repo has `kb_pipeline_enabled: true` and `adr_mirror_enabled: true` in `.claude/kb-config.json`.

**4D. Deprecar notion-kb-workflow en su SKILL.md**
- Archivo: `skills/notion-kb-workflow/SKILL.md`
- Agregar `status: deprecated` al frontmatter YAML
- Agregar banner rojo al inicio del body:
  > **DEPRECATED** (ADR-0012, 2026-04-30). DO NOT invoke. Replacements: session-start.sh (context loading), post-commit-kb.sh + kb-pipeline (capture), kb-curate (promotion). See CLAUDE.md § "notion-kb-workflow (DEPRECATED)".

---

### Fase 5 — Verificación

1. **Grafo conectado**: `grep -rcl '\[\[' <vault>/glossary/ <vault>/decisions/ <vault>/gotchas/` — cada entry con ≥1 wikilink. Target: 40/40 glossary + los anchor products.
2. **Frontmatter completo**: `grep -L 'related:' <vault>/glossary/domains/*.md` retorna 0 archivos. `grep -c 'domain: unknown' <vault>/glossary/domains/*.md` retorna 0.
3. **Dashboard funcional**: abrir `_dashboard.md` en Obsidian → las queries Sessions 7d, Decisions accepted, KB por tipo deben devolver resultados.
4. **Pipeline dogfood**: hacer un commit en batuta-agent-skills → verificar que el vault mirror incluye `[[jota-batuta]]`/`[[batuta-agent-skills]]`.
5. **Research-first lookup**: en una sesión de cualquier proyecto Batuta, importar una librería que ya tiene entrada KB (e.g., Temporal.io) → Step 1.5 debe encontrar KB-43.
6. **Noise taggeado**: KB-44 y KB-45 tienen `tags: [noise/...]` y no aparecen en queries de decisions/gotchas.
7. **Abrir Obsidian** → Graph View → verificar que los nodos están conectados (especialmente el cluster ADK/Temporal/Pydantic).

---

## Orden de ejecución y dependencias

```
Fase 0 (convención) ─────────────────────────────────┐
  │                                                    │
  v                                                    v
Fase 1 (agents/skills/hooks)                    Fase 2 (dashboard)
  │                                                    │
  └──────────────┬─────────────────────────────────────┘
                 v
           Fase 3 (vault curation — depende de convención 0 + queries 2)
                 │
                 v
           Fase 4 (config + CLAUDE.md — habilitar el pipeline actualizado)
                 │
                 v
           Fase 5 (verificación)
```

Fases 1 y 2 son paralelas. Fase 3 después de 0 pero puede solaparse con 1/2. Fase 4 va última en el plugin para no habilitar el pipeline antes de que los agentes estén actualizados.

---

## Archivos críticos a modificar

### Plugin repo (`E:\BATUTA PROJECTS\batuta-agent-skills`)
| Archivo | Fase | Tipo de cambio |
|---------|------|----------------|
| `skills/batuta-kb-vault/SKILL.md` | 0A, 0B | Agregar Step 3.5 + `related:` a Step 4 |
| `agents/kb-pipeline.md` | 1A | Agregar instrucción de wikilinks en Step 3 |
| `agents/kb-curator.md` | 1B | Agregar instrucción de wikilinks en Step 3 |
| `agents/kb-backfiller.md` | 1C | Agregar instrucción de wikilinks en Step 2 |
| `skills/kb-curate/SKILL.md` | 1D | Agregar requisito de wikilinks en Step 3 |
| `hooks/post-commit-kb.sh` | 1E | Agregar wikilinks al vault mirror |
| `skills/research-first-dev/SKILL.md` | 1F | Reforzar vault lookup con `related:` |
| `skills/notion-kb-workflow/SKILL.md` | 4D | Agregar `status: deprecated` |
| `.claude/kb-config.json` | 4A | Habilitar pipeline + ADR mirror |
| `CLAUDE.md` | 4C | Agregar wikilink invariant + dogfooding note |

### Vault (`/e/Gdrive Batuta/My Drive/BATUTA AI/OBSIDIAN/BATUTA/BATUTA`)
| Archivo | Fase | Tipo de cambio |
|---------|------|----------------|
| `templates/decision.md` | 0C | Agregar `related:`, `domain:`, `origin_project:` |
| `templates/gotcha.md` | 0C | Agregar `related:` |
| `templates/session-journal.md` | 0C | Agregar `related:` |
| `_dashboard.md` | 2A | Reescribir 7 queries + agregar 2 nuevas |
| `clients/jota-batuta/.../\_status.md` | 2B | Arreglar queries de decisions/gotchas/sessions |
| `clients/kiosco/.../\_status.md` | 2B | Arreglar queries de decisions/gotchas/sessions |
| 40x `glossary/domains/kb-*.md` | 3A-3F | Reclasificar type, completar domain, inyectar wikilinks |
| 10x `glossary/products/*.md` | 3G | Crear anchor entries para tecnologías |

### Global user config
| Archivo | Fase | Tipo de cambio |
|---------|------|----------------|
| `C:\Users\JNMZ\.claude\CLAUDE.md` | 4B | Agregar wikilink invariant + vault lookup en research-first |

---

## Riesgos y mitigaciones

1. **Wikilinks a targets que no existen** → Fase 3G (crear anchors) va ANTES de Fase 3F (inyectar links)
2. **Mover archivos rompe referencias** → NO movemos archivos; cambiamos `type:` en frontmatter y las queries buscan en ambas ubicaciones
3. **post-commit-kb.sh falla en Windows Git Bash** → los cambios son mínimos (agregar echo lines); probar con un commit de prueba antes de habilitar `kb_pipeline_enabled`
4. **Google Drive corrompe .git** → ya documentado en ADR-0012; el operador debe excluir `.git/` de Drive Desktop sync
