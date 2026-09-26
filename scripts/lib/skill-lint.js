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

// Cross-skill references that name a skill but read as background prose rather
// than an instruction. The agent runs a skill it is told to invoke and treats a
// "see X" or a parenthetical "(Use X skill)" as optional, so a skill named only
// this way never gets invoked — reported with transcripts in
// https://github.com/addyosmani/agent-skills/issues/602.
//
// Only flagged inside a numbered step, because that is text the agent executes.
// The same phrasing in prose, a bullet, or a "See Also"/"When to Use" list is a
// deliberate pointer — `observability-and-instrumentation` naming
// `shipping-and-launch` is drawing a scope boundary, not forgetting to invoke it
// — and rewriting those into invocations would make skills fire when they should
// not. These stay in SKILL_REF_PATTERNS regardless, so dead-reference checking
// still sees them; this list only judges how strongly they read.
const SOFT_SKILL_REF_PATTERNS = [
  /\bsee(?: the)? `([a-z][a-z0-9-]+[a-z0-9])`/gi,
  /\(\s*use (?:the )?`?([a-z][a-z0-9-]+[a-z0-9])`? skill\s*\)/gi,
];

// A numbered list item ("4. **Commit** …") or a numbered subheading
// ("### 4. Security"), whose body stays a numbered step until the next heading.
const NUMBERED_STEP_ITEM    = /^\s*\d+\.\s/;
const NUMBERED_STEP_HEADING = /^#{3,}\s+\d+\.\s/;
const ANY_HEADING           = /^#{1,6}\s/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip fenced code blocks from markdown content so that headings, references,
 * and trigger phrases inside examples or templates are not matched by lint rules.
 *
 * Scans line by line and follows the CommonMark fence rules rather than a single
 * whole-document regex, which only recognised a column-zero backtick fence closed
 * by a run of exactly the same length (#437). The forms that regex let through:
 *
 *   - tilde fences (`~~~`)
 *   - fences indented by one to three spaces (common inside list items)
 *   - a closing fence longer than its opener
 *
 * A fence closes only on a run of the *same* marker at least as long as the
 * opener; a shorter run, or the other marker, is content. An unterminated fence
 * runs to end of file, so everything after it is treated as fenced and any
 * required section below it is reported missing rather than silently accepted.
 *
 * Stripped lines are replaced with empty lines so line numbers are preserved
 * for callers that report positions.
 */
function stripFencedCodeBlocks(content) {
  const out = [];
  let open = null; // { marker: '`' | '~', length: number } while inside a fence

  for (const line of content.split(/\r?\n/)) {
    if (open) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === open.marker && close[1].length >= open.length) {
        open = null;
      }
      out.push('');
      continue;
    }

    const start = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    // CommonMark: the info string of a backtick fence may not contain backticks,
    // so a line like ````js``` is inline code` is prose, not an opener.
    if (start && !(start[1][0] === '`' && start[2].includes('`'))) {
      open = { marker: start[1][0], length: start[1].length };
      out.push('');
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
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
 * Report frontmatter that this file's own parser accepts but a real YAML
 * parser rejects.
 *
 * `parseFrontmatter` above splits each line on its first colon. That is enough
 * to read `name` and `description`, and it is deliberately forgiving — but it
 * means a SKILL.md whose frontmatter is not valid YAML passes every check here.
 * The hosts that consume these skills do not share that forgiveness: Cursor
 * parses the frontmatter as YAML when a skill is attached to a message, and a
 * parse failure there fails the whole request with a generic server error and
 * takes the rest of the chat's context with it (#494).
 *
 * So the repo could ship frontmatter that breaks a host while CI stayed green.
 * That was verified once by hand, against all 25 skills, in the #494 thread;
 * this makes it a check instead of a memory.
 *
 * Scope is deliberately narrow — the three shapes a strict parser rejects and
 * the split-on-first-colon parser does not, confirmed against ruby's psych:
 *
 *   description: Use this: when X    unquoted value with a colon-space: YAML
 *                                    reads a nested mapping and errors
 *   \tkey: value                      tab indentation: invalid YAML whitespace
 *   description: "unterminated       an unclosed quote
 *
 * It is not a YAML implementation. This repo has no package.json and therefore
 * no parser to depend on, so the check stays a small set of rules aimed at the
 * classes actually observed to break a host. No current frontmatter uses block
 * scalars or multi-line values, and the check assumes that stays true; add a
 * rule here rather than loosening one if it changes.
 */
function frontmatterYamlErrors(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return [];

  const errors = [];
  const lines = match[1].split(/\r?\n/);
  lines.forEach((line, i) => {
    const lineNo = i + 2; // the opening `---` is line 1
    if (!line.trim()) return;

    if (/^[ ]*\t/.test(line)) {
      errors.push(
        `Frontmatter line ${lineNo} indents with a tab — YAML forbids tabs in indentation, ` +
        `so a host that parses this frontmatter rejects the whole file`
      );
      return;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const value = line.slice(colonIdx + 1).trim();
    if (!value) return;

    const quote = value[0] === '"' || value[0] === "'" ? value[0] : null;
    if (quote) {
      // An opening quote must close. `endsWith` is enough here because a
      // trailing comment after a quoted scalar does not appear in this repo.
      if (value.length < 2 || !value.endsWith(quote)) {
        errors.push(
          `Frontmatter line ${lineNo} opens a ${quote === '"' ? 'double' : 'single'} quote that never closes — ` +
          `a host parsing this frontmatter as YAML rejects the whole file`
        );
      }
      return;
    }

    // Unquoted scalar. A colon followed by a space (or ending the line) makes
    // YAML read a nested mapping where a plain string was meant.
    if (/:(\s|$)/.test(value)) {
      errors.push(
        `Frontmatter line ${lineNo} has an unquoted value containing ': ' — YAML reads that as a ` +
        `nested mapping and rejects the file; wrap the value in quotes`
      );
    }
  });

  return errors;
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

/**
 * Cross-skill references phrased so the agent is not actually told to run the
 * skill, restricted to numbered steps. Returns [phrase, skillName] pairs so the
 * warning can quote the text.
 *
 * Fenced code blocks are stripped first — the weak phrasing inside a code block
 * is documentation, not an instruction the agent would act on.
 */
function extractSoftSkillReferences(content) {
  const found = [];
  const seen = new Set();
  let inNumberedHeadingBody = false;

  for (const line of stripFencedCodeBlocks(content).split(/\r?\n/)) {
    if (ANY_HEADING.test(line)) {
      // A numbered subheading opens a step body; any other heading closes it.
      inNumberedHeadingBody = NUMBERED_STEP_HEADING.test(line);
    }
    if (!inNumberedHeadingBody && !NUMBERED_STEP_ITEM.test(line)) continue;

    for (const pattern of SOFT_SKILL_REF_PATTERNS) {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(line)) !== null) {
        const key = `${m[0]}\u0000${m[1]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push([m[0], m[1]]);
      }
    }
  }
  return found;
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

  // The parser above is forgiving by design; the hosts that read this
  // frontmatter are not (#494).
  errors.push(...frontmatterYamlErrors(content));

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

  // A reference that names a real skill but never tells the agent to run it.
  // Only known skills are reported — an unknown one is already a dead reference,
  // and naming it twice helps nobody.
  for (const [phrase, ref] of extractSoftSkillReferences(content)) {
    if (knownSkills.has(ref)) {
      warnings.push(
        `Soft cross-reference: "${phrase}" names \`${ref}\` but does not instruct the agent ` +
        `to run it, so the skill is not invoked — phrase it as "Invoke the \`${ref}\` skill" (#602)`
      );
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

// Export only functions. The policy collections (REQUIRED_SECTIONS,
// SECTION_EXEMPT_SKILLS, SKILL_REF_PATTERNS, and the regexes) stay private so a
// test or future consumer cannot mutate shared state and change lint results for
// the rest of the process. Exercise the rules through these functions.
module.exports = {
  stripFencedCodeBlocks,
  parseFrontmatter,
  frontmatterYamlErrors,
  extractSkillReferences,
  extractSoftSkillReferences,
  lintSkillContent,
  lintSkill,
};
