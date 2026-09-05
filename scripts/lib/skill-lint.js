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
 *   - frontmatter parses cleanly (block scalars and comments supported;
 *     malformed lines and non-string name/description values are errors)
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
//
// PROSE patterns are matched against fence-stripped content, so example
// references inside code blocks never produce dead-reference warnings.
// DIAGRAM patterns are matched against the full content because the ASCII
// lifecycle diagrams they target live inside fenced blocks.
//
// The riskier prose patterns (bold bullets, paths, bare see/follow) capture
// only hyphenated names — every skill in the catalog is multi-word, and the
// hyphen requirement keeps single backticked words like `main` from matching.
const PROSE_REF_PATTERNS = [
  /\b[Uu]se the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\b[Ff]ollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\b[Ii]nvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\b[Cc]ontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\b[Uu]se `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skills?\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\b[Ss]ee `([a-z0-9]+(?:-[a-z0-9]+)+)`/g,
  /\b[Ff]ollow `([a-z0-9]+(?:-[a-z0-9]+)+)`/g,
  /^\s*[-*] \*\*`([a-z0-9]+(?:-[a-z0-9]+)+)`/gm,   // relationship bullets: - **`skill-name`**: …
  /\bskills\/([a-z0-9]+(?:-[a-z0-9]+)+)\/SKILL\.md/g,
];
const DIAGRAM_REF_PATTERNS = [
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
 * Returns { fields, problems }, or null if no frontmatter block found.
 *
 * Supported YAML subset (the shapes docs/skill-anatomy.md sanctions):
 *   - top-level `key: value` plain scalars
 *   - single/double-quoted scalars (matching quotes stripped)
 *   - literal (|) and folded (>) block scalars, with -/+ chomping
 *   - full-line comments and trailing comments on unquoted scalars
 *
 * Anything else — a line that parses as none of the above, an unterminated
 * quote, or a flow/block collection value — is reported in `problems`
 * instead of being silently accepted or skipped. Non-scalar values are set
 * to null so callers can distinguish "present but not a string" from absent.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const fields = {};
  const problems = [];
  const lines = match[1].split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const kv = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!kv) {
      problems.push(`Malformed frontmatter line ${i + 1}: "${trimmed}"`);
      continue;
    }
    const key = kv[1];
    let raw = kv[2].trim();

    // Block scalar: | or > with optional indentation indicator and chomping
    const block = raw.match(/^([|>])((?:[0-9]|[+-]){0,2})[ \t]*(?:#.*)?$/);
    if (block) {
      const folded = block[1] === '>';
      const keep   = block[2].includes('+');
      const strip  = block[2].includes('-');
      const body = [];
      let indent = null;
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.trim() === '') { body.push(''); i++; continue; }
        const lead = next.match(/^[ ]+/);
        if (!lead || (indent !== null && lead[0].length < indent)) break;
        if (indent === null) indent = lead[0].length;
        body.push(next.slice(indent));
        i++;
      }
      let value;
      if (folded) {
        value = body.reduce((acc, l) => {
          if (l === '') return `${acc}\n`;
          if (acc === '' || acc.endsWith('\n')) return acc + l;
          return `${acc} ${l}`;
        }, '');
      } else {
        value = body.join('\n');
      }
      value = value.replace(/\n+$/, '');
      if (keep && !strip && value !== '') value += '\n';
      fields[key] = value;
      continue;
    }

    if (raw === '') {
      // A bare `key:` followed by indented lines is a nested block
      // collection — not a string. Consume it and flag the key.
      if (i + 1 < lines.length && /^[ ]+\S/.test(lines[i + 1])) {
        while (i + 1 < lines.length && (/^[ ]+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) i++;
        problems.push(`Frontmatter '${key}' is a nested collection, not a string value`);
        fields[key] = null;
      } else {
        fields[key] = '';
      }
      continue;
    }

    if (raw[0] === '"' || raw[0] === "'") {
      const quote = raw[0];
      if (raw.length >= 2 && raw.endsWith(quote)) {
        fields[key] = raw.slice(1, -1);
      } else {
        problems.push(`Frontmatter '${key}' has an unterminated ${quote === '"' ? 'double' : 'single'}-quoted value`);
        fields[key] = null;
      }
      continue;
    }

    // Unquoted scalar: strip a trailing comment (YAML requires whitespace
    // before the #), then reject flow collections as non-string values.
    const hash = raw.search(/[ \t]#/);
    if (hash !== -1) raw = raw.slice(0, hash).trimEnd();
    if (raw[0] === '[' || raw[0] === '{') {
      problems.push(`Frontmatter '${key}' is a flow collection, not a string value`);
      fields[key] = null;
      continue;
    }
    fields[key] = raw;
  }

  return { fields, problems };
}

/**
 * Collect all explicit skill cross-references from content.
 * Prose patterns run against fence-stripped content so example references
 * inside code blocks are not collected; diagram patterns run against the
 * full content because ASCII lifecycle diagrams live inside fences.
 */
function extractSkillReferences(content) {
  const refs = new Set();
  const scan = (patterns, text) => {
    for (const pattern of patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        refs.add(m[1]);
      }
    }
  };
  scan(PROSE_REF_PATTERNS, stripFencedCodeBlocks(content));
  scan(DIAGRAM_REF_PATTERNS, content);
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
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, exempt };
  }
  const fm = parsed.fields;
  for (const problem of parsed.problems) {
    errors.push(`Invalid YAML frontmatter: ${problem}`);
  }

  // A null field means parseFrontmatter already reported why it isn't a
  // usable string — don't stack a misleading "missing field" error on top.
  if (typeof fm.name !== 'string' || fm.name === '') {
    if (fm.name !== null) errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!KEBAB_CASE.test(dirName)) {
    errors.push(`Directory name '${dirName}' is not lowercase-hyphen-separated (skill-anatomy.md: Naming Conventions)`);
  }

  if (typeof fm.description !== 'string' || fm.description === '') {
    if (fm.description !== null) errors.push("Frontmatter missing required field: 'description'");
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
    if (!Object.hasOwn(SECTION_EXEMPT_SKILLS, dirName)) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to scripts/lib/skill-lint.js with a documented reason.`
      );
    }
  }

  // ── Required sections ────────────────────────────────────────────────────
  // `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a skill
  // directory named `constructor` — which passes the kebab-case check — would
  // otherwise resolve to Object.prototype.constructor and be silently exempt
  // from every required-section check.
  exempt = Object.hasOwn(SECTION_EXEMPT_SKILLS, dirName);

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

  // A named workflow that advertises numbered steps must document each step
  // before the next level-two section. Otherwise the summary promises a
  // process stage that the skill never teaches agents how to perform.
  const workflowSections = content.matchAll(
    /^## The [^\n]+ Workflow\s*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/gm
  );
  for (const match of workflowSections) {
    const section = match[1];
    const declared = [...section.matchAll(/^\s*(\d+)\.\s+[A-Z][A-Z -]*\s+→/gm)];
    if (declared.length < 2) continue;

    const documented = new Set(
      [...section.matchAll(/^### Step\s+(\d+):/gm)].map(step => step[1])
    );
    for (const step of declared) {
      if (!documented.has(step[1])) {
        errors.push(`Workflow declares Step ${step[1]} but has no matching process section`);
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
