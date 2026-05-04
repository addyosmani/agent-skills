# Build-log — Extensión audit chain: anti-hardcoding check

## Resultado

SUCCESS

## Archivo modificado

- `agents/code-reviewer.md` — line count delta: +1 (bullet agregado a Review Framework dimensión #2)

## Cita exacta del bullet agregado

```
- **Anti-hardcoding check**: grep el diff por literales numéricos > 3 dígitos, strings ALL_CAPS no declarados como constante, paths absolutos, fechas embebidas. Por cada hit, validar que no debería ser parámetro/config. Si sí, FLAG bloqueante con cita a `rules/no-hardcoding-magic.md`.
```

Ubicación: `agents/code-reviewer.md` línea 78, dentro de `## Review Framework` → `### 2. Readability` (5to bullet de la sección).

## Issues encontrados

None. El archivo mantiene estructura markdown válida, frontmatter intacto, y el bullet se integra naturalmente con los bullets existentes.

## Sugerencia de commit message

```
refactor(audit-chain): add anti-hardcoding check to code-reviewer readability dimension

Extends code-reviewer's Review Framework with explicit grepping for
numeric literals (>3 digits), undeclared ALL_CAPS strings, absolute paths,
and embedded dates. Each hit is validated against no-hardcoded-magic rule
and flagged as Critical if a value should be parameterized.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

**Nota**: El flag bloqueante funciona via el rule `rules/no-hardcoded-magic.md` (a escribir como entregable 2 del plan 2026-05-04-agent-hardening). El agente-auditor now tiene el criterio pero la rule con ejemplos concretos de Anti-patterns viene en el siguiente builder.

---

# Build-log — Tooling extender (setup-rules.sh + run.sh validators)

## Resultado

SUCCESS

## Archivos modificados

- `tests/v2.5-validators/15-new-rules-shape.sh` — new file, 89 lines (created)
- `tests/v2.5-validators/run.sh` — +1 line (case `"15-new-rules-shape.sh"` appended to `cases` array)
- `tools/setup-rules.sh` — no change required (see decision below)

## Cambios clave

- `setup-rules.sh` uses a dynamic `find` over `$RULES_SRC` to build `AVAILABLE`; it already auto-discovers any new `.md` file added under `rules/` (excluding `_meta/`). No enumeration change was needed. The two new rules (`no-hardcoded-magic.md`, `model-routing.md`) will be picked up by `--all` as soon as the rules-builder writes them.
- Created `15-new-rules-shape.sh` with a `validate_rule()` function that accepts a repo-relative path and runs four checks: (a) `## Anti-patterns` heading present, (b) section non-empty via `awk` + blank-line skip, (c) line count 50-200 via `wc -l`, (d) frontmatter does not contain `name:` or `description:` keys.
- Both rule paths validated: `rules/no-hardcoded-magic.md` and `rules/model-routing.md`. If the rules-builder has not yet written a file, the check reports `file missing` as a MISS (not a hard error) so the validator degrades gracefully during parallel execution.
- Script is marked executable (`chmod +x`) matching all other case files in the directory.

## bash -n verificacion

- `tools/setup-rules.sh`: PASSED
- `tests/v2.5-validators/run.sh`: PASSED
- `tests/v2.5-validators/15-new-rules-shape.sh`: PASSED

## Issues encontrados

None. The dynamic discovery design of `setup-rules.sh` meant the main deliverable was zero-change to that script and one new validator + one run.sh entry.

## Sugerencia de commit message

```
test(validators): add structural validator for no-hardcoded-magic and model-routing rules

Adds 15-new-rules-shape.sh with four checks per rule (Anti-patterns
present, section non-empty, line count 50-200, no SKILL.md-only
frontmatter keys). Registers the case in run.sh. setup-rules.sh
required no change — its dynamic find-based discovery already includes
new rules under rules/ without enumeration.
```
