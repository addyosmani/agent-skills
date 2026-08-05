# Module Selection — menu mechanics and fast path

How the conductor turns the module catalog into a choice the person can actually
make (Phases 0 and 2b). The contract: **recommend the right set, then let them run
any combination.**

---

## Building the catalog

1. Read `module-registry.yaml` for the id → path index.
2. Read **only the frontmatter** of each listed module (first ~15 lines — one
   scripted pass, e.g. `Get-Content <file> -TotalCount 15` per file). That yields
   everything the menu needs: `id`, `title`, `version`, `status`, `tier`,
   `applies_when`, `why`. Never read module bodies at this stage.
3. Glob `../*/modules/*.md` and diff against the registry — report any orphan file
   or dead row as registry drift in the run output.

## Rendering the menu

Render a markdown checklist, grouped **Security** then **Compliance**, one line per
**enabled** module:

```
## Recommended audit plan — [target]

### Security scans
- [x] **OWASP ASVS + SAMM** `sec-owasp-asvs` (expected) — web/API surface in scope
- [x] **AI & Agentic Security** `sec-ai-security` (mandatory) — LLM agent with tools in scope
- [ ] **SLSA supply chain** `sec-slsa` (recommended) — CI/CD present; not in default set
...

### Compliance mappings
- [x] **SOC 2** `comp-soc2` (expected) — customer contract names SOC 2
- [x] **Privacy (GDPR/CCPA + 27701)** `comp-privacy` (mandatory) — EU PII in scope
- [ ] **COBIT 2019** `comp-cobit` (recommended) — no governance scope requested
...

_Disabled in this install: comp-cobit (not shown above when disabled)._
```

Rules:

- `[x]` pre-reflects the Phase 2 recommendation; `[ ]` is available but not
  recommended for this profile.
- The one-line why comes from frontmatter, **made profile-specific when a trigger
  fired** ("PHI in scope → mandatory" beats the generic line).
- Tier badge on every line; within each group, order mandatory → expected →
  recommended.
- **Disabled modules never render as selectable rows** — one footnote line names
  them, nothing more.

## Driving the choice

After the checklist, ask **one** question with four options (fits hosts that cap
elicitation at four choices):

1. **Run the recommended set** — one-tap accept.
2. **Mandatory tier only** — the legal/contractual floor.
3. **Everything enabled** — full catalog sweep.
4. **Adjust** — free-text add/remove by id or name ("add sec-slsa, drop
   comp-cobit"). Apply, re-render the checklist once, confirm.

If the host exposes a richer multi-select elicitation UI, use it with the same
content (one option per module, recommendations pre-selected) instead of the
four-option pattern — the checklist + single question is the guaranteed fallback.

Selection rules:

- **Any combination is legal**, across both specialists. Security-only: fine.
  Compliance-only: state once that the mapping will be assertion-based without
  security findings, then proceed.
- Deselecting a **mandatory** module gets one sentence of pushback naming the
  obligation — then honor the choice and record it in Coverage Notes.
- More than ~8 modules on one specialist → suggest headless dispatch; that many
  module bodies in one interactive pass dilutes attention.
- The final set is **frozen as id@version pairs** (versions from frontmatter) and
  passed downstream — specialists never re-derive selection.

## Fast path (Phase 0)

When the request names frameworks up front ("just OWASP and SOC 2"):

1. Resolve names → ids by matching registry ids and frontmatter titles
   (OWASP → `sec-owasp-asvs`; SOC 2 → `comp-soc2`; NIST 800-171 / CMMC →
   `comp-cmmc`; GDPR/CCPA/privacy → `comp-privacy`; ISO 27001 →
   `comp-iso-27001-family`).
2. Skip profiling and the menu. Confirm in one line: *"Running `sec-owasp-asvs` +
   `comp-soc2` against <target> @ <branch>, standard depth — go?"*
3. **Mandate safety net:** if scope visibly implies a legal mandate the selection
   misses (PHI but no HIPAA), say so in one sentence, then honor the selection.
4. A name that resolves to a **disabled** module: say it's disabled in this
   install and ask whether to proceed without it. Never silently enable.
5. A name that resolves to **nothing** (NERC CIP, GLBA…): coverage gap — name it,
   offer the nearest modules, scope the rest as follow-up.

## Disabled modules — exact behavior

A module with `status: disabled` in its frontmatter is **inert**:

- Not rendered as a selectable menu row (footnote only).
- Never dispatched, never read past frontmatter.
- Explicitly requested → "disabled in this install — proceed without it?" The only
  way to enable it is editing the module's frontmatter, which is an install
  decision, not a run decision.
