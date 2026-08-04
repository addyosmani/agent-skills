'use strict';
/**
 * skill-lint.js — the skill validation rules, as a shared library.
 *
 * This is the single source of truth for what makes a SKILL.md valid
 * (docs/skill-anatomy.md). The CLI in scripts/validate-skills.js is a thin
 * wrapper over it. Splitting the rules out of the CLI keeps them importable
 * and unit-testable without spawning a process or touching the filesystem.
 *
 * Checks (errors block CI):
 *   - SKILL.md exists in every skill directory
 *   - YAML frontmatter present with 'name' and 'description' fields
 *   - frontmatter 'name' matches the directory name
 *   - directory name is lowercase-hyphen-separated (skill-anatomy.md: Naming Conventions)
 *   - description does not exceed 1024 characters
 *   - description includes a 'when to use' trigger (skill-anatomy.md: Required)
 *   - required sections are present
 *
 * Checks (warnings, do not block CI):
 *   - cross-skill references point to known skills
 */

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 1024;

// A skill directory name must be lowercase-hyphen-separated
// (docs/skill-anatomy.md → Naming Conventions).
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// A description must state WHEN to use the skill, not just what it does
// (docs/skill-anatomy.md → Required). Accept the canonical "Use when …"
// plus the equivalent "Use before/after/during …" phrasings in use today.
// Reject negated forms ("Do not use when …", "Don't use when …") — those
// describe exclusions, not trigger conditions.
const DESCRIPTION_TRIGGER        = /\buse (this )?when\b|\buse (before|after|during)\b/i;
const DESCRIPTION_TRIGGER_NEGATE = /\b(do not|don't|never) use (this )?(when|before|after|during)\b/i;

// Sections every standard SKILL.md must contain.
// Each entry is an array of acceptable heading strings — the first
// match wins, so you can list canonical + legacy aliases.
const REQUIRED_SECTIONS = [
  ['## Overview'],
  ['## When to Use'],
  ['## Common Rationalizations'],
  ['## Red Flags'],
  ['## Verification'],
];

// Skills that are intentionally exempt from section checks.
// Exemptions live HERE, not in skill frontmatter, so contributors
// cannot bypass the validator by editing their own skill file.
// Every entry must have a documented reason.
const SECTION_EXEMPT_SKILLS = {
  'using-agent-skills': 'Meta-skill — orchestrates other skills; When-to-Use and Verification are not applicable to a routing document.',
  'idea-refine':        'Legacy structure predating skill-anatomy.md — uses How-It-Works/Usage/Anti-patterns instead of standard headings. Tracked for conformance in https://github.com/addyosmani/agent-skills/issues',
};

// Regex patterns that indicate an explicit cross-skill reference.
// Only these patterns trigger the dead-reference warning — generic
// backtick strings in code blocks are intentionally excluded.
const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /──→ ([a-z][a-z0-9-]+[a-z0-9])\b/g,          // ASCII diagram arrows
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip fenced code blocks from markdown content so that headings, references,
 * and trigger phrases inside examples or templates are not matched by lint rules.
 */
function stripFencedCodeBlocks(content) {
  return content.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
}

/**
 * Parse YAML-style frontmatter from the top of a markdown file.
 * Returns a key→value object, or null if no frontmatter block found.
 * Values are stripped of surrounding quotes.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Collect all explicit skill cross-references from content.
 * Only matches against the SKILL_REF_PATTERNS list to avoid
 * false-positives from inline code snippets.
 */
function extractSkillReferences(content) {
  const refs = new Set();
  for (const pattern of SKILL_REF_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      refs.add(m[1]);
    }
  }
  return refs;
}

// ─── Linter ──────────────────────────────────────────────────────────────────

/**
 * Lint already-read SKILL.md content. Pure: no filesystem access, so the rules
 * can be exercised against crafted fixtures in a unit test.
 * Returns { errors, warnings, exempt }.
 */
function lintSkillContent(dirName, content, knownSkills) {
  const errors   = [];
  const warnings = [];
  let   exempt   = false;

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, exempt };
  }

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!KEBAB_CASE.test(dirName)) {
    errors.push(`Directory name '${dirName}' is not lowercase-hyphen-separated (skill-anatomy.md: Naming Conventions)`);
  }

  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else {
    if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit` +
        ` (agents inject this into the system prompt)`
      );
    }
    const hasTrigger       = DESCRIPTION_TRIGGER.test(fm.description);
    const onlyNegated      = hasTrigger && DESCRIPTION_TRIGGER_NEGATE.test(fm.description)
      && !fm.description.replace(DESCRIPTION_TRIGGER_NEGATE, '').match(DESCRIPTION_TRIGGER);
    if (!hasTrigger || onlyNegated) {
      errors.push(
        `Description has no 'when to use' trigger — add a "Use when …" clause ` +
        `(skill-anatomy.md: Required — the description must say both what the skill does and when to use it)`
      );
    }
  }

  // ── Exemption guard ──────────────────────────────────────────────────────
  // Exemptions are validator-owned (SECTION_EXEMPT_SKILLS above).
  // If a skill's frontmatter tries to declare its own exemption, fail loud —
  // that's a sign someone is trying to bypass the validator.
  if (fm.type === 'meta' || fm.exempt === 'sections') {
    if (!SECTION_EXEMPT_SKILLS[dirName]) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to scripts/lib/skill-lint.js with a documented reason.`
      );
    }
  }

  // ── Required sections ────────────────────────────────────────────────────
  exempt = dirName in SECTION_EXEMPT_SKILLS;

  if (!exempt) {
    // Strip fenced code blocks so headings inside examples/templates don't
    // satisfy the check, and match headings at the start of a line so
    // `### Verification` inside a block doesn't satisfy `## Verification`.
    const proseContent = stripFencedCodeBlocks(content);
    for (const aliases of REQUIRED_SECTIONS) {
      const found = aliases.some(heading => {
        const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}\\s*$`, 'm').test(proseContent);
      });
      if (!found) {
        errors.push(`Missing required section: ${aliases[0]}`);
      }
    }
  }

  // ── Cross-skill references ───────────────────────────────────────────────
  const refs = extractSkillReferences(content);
  for (const ref of refs) {
    if (!knownSkills.has(ref)) {
      warnings.push(`Dead cross-reference: \`${ref}\` is not a known skill`);
    }
  }

  return { errors, warnings, exempt };
}

/**
 * Lint a skill by directory name: reads its SKILL.md, then delegates to
 * lintSkillContent. This is the thin filesystem wrapper the CLI uses.
 * Returns { errors, warnings, exempt }.
 */
function lintSkill(dirName, skillsDir, knownSkills) {
  const skillPath = path.join(skillsDir, dirName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    return { errors: ['Missing SKILL.md'], warnings: [], exempt: false };
  }

  let content;
  try {
    content = fs.readFileSync(skillPath, 'utf8');
  } catch (err) {
    return { errors: [`Unreadable SKILL.md: ${err.message}`], warnings: [], exempt: false };
  }

  return lintSkillContent(dirName, content, knownSkills);
}

// Export only the linting functions. The policy collections (REQUIRED_SECTIONS,
// SECTION_EXEMPT_SKILLS, SKILL_REF_PATTERNS, and the regexes) stay private so a
// test or future consumer cannot mutate shared state and change lint results for
// the rest of the process. Exercise the rules through these functions.
module.exports = {
  parseFrontmatter,
  extractSkillReferences,
  lintSkillContent,
  lintSkill,
};
