---
description: Anti-duplication guardrail for adding or changing skills
paths:
  - "skills/**"
---

# Adding or changing a skill

This repo already covers most of the development lifecycle, so most new-skill ideas overlap an existing skill or an open PR. Before creating a new `skills/<name>/` directory or significantly reworking an existing one:

- Run the pre-flight checks in [CONTRIBUTING.md](../../CONTRIBUTING.md#before-proposing-a-new-skill): search the catalog, check open PRs (`gh pr list --state open`), and justify the gap.
- Prefer extending an existing skill over adding a near-duplicate. If the idea overlaps an existing skill, edit that skill instead of adding a new directory.
- Keep the `SKILL.md` within [docs/skill-anatomy.md](../../docs/skill-anatomy.md), and never duplicate content between skills, reference the other skill instead.

CONTRIBUTING.md is the single source of truth for the full workflow; this rule points to it rather than restating its checklist.
