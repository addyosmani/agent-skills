'use strict';
/**
 * skill-lint.js — single source of truth for skill validation.
 *
 * Parses and lints every skill in skills/ against the rules in
 * docs/skill-anatomy.md. Both the CI validator (scripts/validate-skills.js)
 * and the node:test battery (tests/skills.test.js) consume this module, so
 * the rules live in exactly one place.
 *
 * lintSkill() classifies findings into:
 *   - errors   → block CI (structural and format-correctness violations)
 *   - warnings → informational (length thresholds, phrasing, dead refs)
 *
 * It also returns `metrics` (description and body character counts) so the
 * metrics reporter can render a length table without re-parsing files.
 */

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const SKILLS_DIR = path.resolve(__dirname, '..', '..', 'skills');

// Hard limit: descriptions are injected into the agent system prompt.
const MAX_DESCRIPTION_LENGTH = 1024;

// Soft thresholds (warnings only). A description shorter than this is usually
// too thin to convey both what + when; the body bounds flag skills that are
// either anemic or large enough to consider a supporting file.
const MIN_DESCRIPTION_LENGTH = 100;
const BODY_WARN_MIN_BYTES    = 1500;
const BODY_WARN_MAX_BYTES    = 15000;

// Sections every standard SKILL.md must contain. Each entry is an array of
// acceptable headings — the first match wins (canonical + legacy aliases).
const REQUIRED_SECTIONS = [
  ['## Overview'],
  ['## When to Use'],
  ['## Common Rationalizations'],
  ['## Red Flags'],
  ['## Verification'],
];

// Skills intentionally exempt from section + section-format checks.
// Exemptions live HERE, not in skill frontmatter, so contributors cannot
// bypass the validator by editing their own file. Each needs a documented why.
const SECTION_EXEMPT_SKILLS = {
  'using-agent-skills': 'Meta-skill — orchestrates other skills; When-to-Use and Verification are not applicable to a routing document.',
  'idea-refine':        'Legacy structure predating skill-anatomy.md — uses How-It-Works/Usage/Anti-patterns instead of standard headings. Tracked for conformance in https://github.com/addyosmani/agent-skills/issues',
};

// Explicit cross-skill reference patterns. Only these trigger the dead-reference
// warning — generic backtick strings in code blocks are intentionally excluded.
const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /──→ ([a-z][a-z0-9-]+[a-z0-9])\b/g,
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function listSkillDirs() {
  return fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
    .sort();
}

function skillPath(dirName) {
  return path.join(SKILLS_DIR, dirName, 'SKILL.md');
}

/**
 * Split a markdown file into its raw frontmatter block and body.
 * Returns { frontmatter, body } where frontmatter is the inner YAML text
 * (or null if no block), and body is everything after the closing ---.
 */
function splitFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return { frontmatter: null, body: content };
  return { frontmatter: match[1], body: content.slice(match[0].length) };
}

/** Parse a YAML-style frontmatter block into a key→value object. */
function parseFrontmatter(frontmatterText) {
  if (frontmatterText == null) return null;
  const result = {};
  for (const line of frontmatterText.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

/** Collect explicit cross-skill references from body content. */
function extractSkillReferences(content) {
  const refs = new Set();
  for (const pattern of SKILL_REF_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) refs.add(m[1]);
  }
  return refs;
}

/** Find the section body for a heading, up to the next ## heading (or EOF). */
function sectionBody(body, heading) {
  const start = body.indexOf(heading);
  if (start === -1) return null;
  const after = body.slice(start + heading.length);
  const nextHeading = after.search(/\r?\n## /);
  return nextHeading === -1 ? after : after.slice(0, nextHeading);
}

// ─── Linter ──────────────────────────────────────────────────────────────────

/**
 * Lint one skill by reading its SKILL.md from disk. Thin I/O wrapper around
 * lintSkillContent — keeps filesystem concerns out of the rule logic so the
 * rules can be unit-tested with in-memory fixtures (tests/skill-lint.test.js).
 *
 * `knownSkills` is a Set of valid skill names used to detect dead
 * cross-references. Returns { errors, warnings, metrics, exempt }.
 */
function lintSkill(dirName, knownSkills) {
  const file = skillPath(dirName);

  if (!fs.existsSync(file)) {
    return {
      errors: ['Missing SKILL.md'], warnings: [],
      metrics: { descriptionLength: null, bodyLength: null }, exempt: false,
    };
  }

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return {
      errors: [`Unreadable SKILL.md: ${err.message}`], warnings: [],
      metrics: { descriptionLength: null, bodyLength: null }, exempt: false,
    };
  }

  return lintSkillContent(dirName, content, knownSkills);
}

/**
 * Lint raw SKILL.md content (no filesystem access). All rules live here.
 * `dirName` is the expected skill name (for the name-match + exemption checks).
 * Returns { errors, warnings, metrics, exempt }.
 */
function lintSkillContent(dirName, content, knownSkills) {
  const errors   = [];
  const warnings = [];
  const metrics  = { descriptionLength: null, bodyLength: null };
  let   exempt   = false;

  const { frontmatter, body } = splitFrontmatter(content);
  metrics.bodyLength = body.length;

  const fm = parseFrontmatter(frontmatter);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, metrics, exempt };
  }

  // ── name ──
  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  // ── description: presence + length ──
  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else {
    metrics.descriptionLength = fm.description.length;
    if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit ` +
        `(agents inject this into the system prompt)`
      );
    }
    if (fm.description.length < MIN_DESCRIPTION_LENGTH) {
      warnings.push(
        `Description is ${fm.description.length} chars — below the ${MIN_DESCRIPTION_LENGTH}-char guideline; ` +
        `it may not convey both what the skill does and when to use it`
      );
    }
    if (!/use when/i.test(fm.description)) {
      warnings.push(
        `Description has no "Use when" trigger clause — agents rely on it to decide when the skill applies`
      );
    }
  }

  // ── Exemption bypass guard ──
  if (fm.type === 'meta' || fm.exempt === 'sections') {
    if (!SECTION_EXEMPT_SKILLS[dirName]) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to tests/lib/skill-lint.js with a documented reason.`
      );
    }
  }

  // ── Body length (soft) ──
  if (metrics.bodyLength < BODY_WARN_MIN_BYTES) {
    warnings.push(
      `Body is ${metrics.bodyLength} bytes — below ${BODY_WARN_MIN_BYTES}; the skill may be too thin to encode a real process`
    );
  } else if (metrics.bodyLength > BODY_WARN_MAX_BYTES) {
    warnings.push(
      `Body is ${metrics.bodyLength} bytes — above ${BODY_WARN_MAX_BYTES}; consider moving detail into a supporting file`
    );
  }

  // ── H1 (format correctness) ──
  if (!/^#\s+\S/m.test(body)) {
    errors.push('Missing top-level H1 title (expected a "# Skill Title" line in the body)');
  }

  // ── Required sections + section-format checks ──
  exempt = dirName in SECTION_EXEMPT_SKILLS;
  if (!exempt) {
    for (const aliases of REQUIRED_SECTIONS) {
      const found = aliases.some(heading => body.includes(heading));
      if (!found) errors.push(`Missing required section: ${aliases[0]}`);
    }

    const rationalizations = sectionBody(body, '## Common Rationalizations');
    if (rationalizations !== null && !/\|.*\|/.test(rationalizations)) {
      errors.push('"Common Rationalizations" section must contain a markdown table (| ... |)');
    }

    const verification = sectionBody(body, '## Verification');
    if (verification !== null && !/- \[ \]/.test(verification)) {
      errors.push('"Verification" section must contain at least one checkbox item (- [ ])');
    }
  }

  // ── Dead cross-references (soft) ──
  for (const ref of extractSkillReferences(body)) {
    if (!knownSkills.has(ref)) {
      warnings.push(`Dead cross-reference: \`${ref}\` is not a known skill`);
    }
  }

  return { errors, warnings, metrics, exempt };
}

module.exports = {
  SKILLS_DIR,
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  BODY_WARN_MIN_BYTES,
  BODY_WARN_MAX_BYTES,
  REQUIRED_SECTIONS,
  SECTION_EXEMPT_SKILLS,
  listSkillDirs,
  skillPath,
  splitFrontmatter,
  parseFrontmatter,
  extractSkillReferences,
  sectionBody,
  lintSkill,
  lintSkillContent,
};
