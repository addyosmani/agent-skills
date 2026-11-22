#!/usr/bin/env node
/**
 * validate-commands.js
 *
 * Guards against silent drift across the three slash-command directories:
 *   .claude/commands/  (.md — Claude Code)
 *   .gemini/commands/  (.toml — Gemini CLI)
 *   commands/          (.toml — Antigravity CLI)
 *
 * Checks (errors block CI):
 *   - Every command present in one directory exists in all three
 *   - The 'description' field is identical across all three equivalents
 *   - Claude command frontmatter is valid YAML, not merely splittable
 *   - TOML command files close every multi-line string and define `prompt`
 *
 * What this does NOT check:
 *   Prompt body differences are intentional — each tool has its own
 *   syntax ($ARGUMENTS, agent-skills: prefixes, GEMINI.md vs CLAUDE.md).
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// The same frontmatter-validity rules validate-skills applies to SKILL.md.
// Description extraction shares the top-level frontmatter reader with skills.
// YAML validity is checked separately because Claude Code parses frontmatter
// when the command is loaded. The #494 thread verified all 25 SKILL.md files
// and the command files by hand; this makes the second half a check too.
const { frontmatterYamlErrors, parseFrontmatter } = require(path.join(__dirname, 'lib', 'skill-lint.js'));

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const DIRS = {
  claude:     { dir: path.join(ROOT, '.claude', 'commands'), ext: '.md'   },
  gemini:     { dir: path.join(ROOT, '.gemini', 'commands'), ext: '.toml' },
  antigravity:{ dir: path.join(ROOT, 'commands'),            ext: '.toml' },
};

// Commands where the file stem differs between Claude and the TOML dirs.
// Key = Claude stem, value = TOML stem.
const NAME_MAP = {
  plan: 'planning',
};
const NAME_MAP_REVERSE = Object.fromEntries(
  Object.entries(NAME_MAP).map(([k, v]) => [v, k])
);

// ─── Parsers ──────────────────────────────────────────────────────────────────

function descriptionFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseFrontmatter(content)?.description ?? null;
}

function descriptionFromToml(filePath) {
  const content     = fs.readFileSync(filePath, 'utf8');
  const doubleMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m);
  if (doubleMatch) return doubleMatch[1].replace(/\\"/g, '"');
  const singleMatch = content.match(/^description\s*=\s*'([^']*)'/m);
  return singleMatch ? singleMatch[1] : null;
}

// descriptionFromToml only scrapes one line, so nothing above reads the rest of
// a TOML file. Gemini CLI parses it strictly and skips a command it can't load.
// This catches the two slips that pass the scrape: a multi-line string that is
// never closed (invalid TOML), and a missing `prompt` key (required by Gemini).
// It is not a full TOML parser.
function tomlStructureErrors(content) {
  const errors = [];
  const lines = content.split(/\r?\n/);
  let open = null; // { delim, line } while inside a """ or ''' string
  let hasPrompt = false;
  let inTable = false; // keys after a [table] header aren't top-level

  const closes = (text, delim) => (delim === "'''"
    ? text.includes("'''")
    // In a basic string, \" is an escaped quote, so \""" doesn't close it.
    : /(^|[^\\])(\\\\)*"""/.test(text));

  lines.forEach((text, i) => {
    let rest = text;
    if (!open) {
      if (/^\s*\[/.test(rest)) inTable = true;
      const key = rest.match(/^\s*(["']?)([A-Za-z0-9_-]+)\1\s*=\s*/);
      if (!key) return;
      if (key[2] === 'prompt' && !inTable) hasPrompt = true;
      rest = rest.slice(key[0].length);
      const delim = ['"""', "'''"].find(d => rest.startsWith(d));
      if (!delim) return;
      open = { delim, line: i + 1 };
      rest = rest.slice(3);
    }
    if (closes(rest, open.delim)) open = null;
  });

  if (open) errors.push(`multi-line string opened on line ${open.line} is never closed`);
  if (!hasPrompt) errors.push('no top-level `prompt` key');
  return errors;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function loadCommands({ dir, ext }) {
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(
    fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .map(f => {
        const stem = path.basename(f, ext);
        const full = path.join(dir, f);
        try {
          const desc = ext === '.md' ? descriptionFromMd(full) : descriptionFromToml(full);
          return [stem, desc];
        } catch (e) {
          console.log(`  ✗  ${stem} — cannot read file: ${e.message}`);
          return [stem, null];
        }
      })
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const byTool = {
    claude:      loadCommands(DIRS.claude),
    gemini:      loadCommands(DIRS.gemini),
    antigravity: loadCommands(DIRS.antigravity),
  };

  // Canonical command list: use Claude stems as the reference.
  // Map each Claude stem to its TOML equivalent for lookup.
  const claudeStems = Object.keys(byTool.claude).sort();
  const allTomlStems = new Set([
    ...Object.keys(byTool.gemini),
    ...Object.keys(byTool.antigravity),
  ]);
  const allCanonicalStems = new Set([
    ...claudeStems,
    ...[...allTomlStems].map(s => NAME_MAP_REVERSE[s] ?? s),
  ]);

  let errors = 0;

  // ── Parity check ────────────────────────────────────────────────────────────
  console.log('Checking command parity...');

  // Commands in Claude not found in TOML dirs
  for (const stem of claudeStems) {
    const tomlStem = NAME_MAP[stem] ?? stem;
    const missing  = [];
    if (!(tomlStem in byTool.gemini))      missing.push('.gemini/commands');
    if (!(tomlStem in byTool.antigravity)) missing.push('commands');
    if (missing.length) {
      console.log(`  ✗  ${stem} — missing in: ${missing.join(', ')}`);
      errors++;
    } else {
      console.log(`  ✓  ${stem}${stem !== tomlStem ? ` (${tomlStem} in toml dirs)` : ''}`);
    }
  }

  // Commands in TOML dirs not found in Claude
  for (const stem of [...allTomlStems].sort()) {
    const claudeStem = NAME_MAP_REVERSE[stem] ?? stem;
    if (!(claudeStem in byTool.claude)) {
      console.log(`  ✗  ${stem} — present in toml dirs but missing in .claude/commands`);
      errors++;
    }
  }

  // ── Claude frontmatter validity ─────────────────────────────────────────────
  // Only the .md directory: the YAML rules don't apply to TOML, where a colon
  // in a description is fine. The TOML files get their own check below.
  console.log('\nChecking Claude command frontmatter...');

  for (const stem of claudeStems) {
    const full = path.join(DIRS.claude.dir, `${stem}${DIRS.claude.ext}`);
    let yamlErrors = [];
    try {
      yamlErrors = frontmatterYamlErrors(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      console.log(`  ✗  ${stem} — cannot read file: ${e.message}`);
      errors++;
      continue;
    }
    if (yamlErrors.length === 0) {
      console.log(`  ✓  ${stem}`);
      continue;
    }
    console.log(`  ✗  ${stem}`);
    for (const message of yamlErrors) {
      console.log(`       ${message}`);
      errors++;
    }
  }

  // ── TOML command structure ──────────────────────────────────────────────────
  console.log('\nChecking TOML command structure...');

  for (const [tool, toolDir] of [['gemini', '.gemini/commands'], ['antigravity', 'commands']]) {
    const { dir, ext } = DIRS[tool];
    for (const stem of Object.keys(byTool[tool]).sort()) {
      let tomlErrors;
      try {
        tomlErrors = tomlStructureErrors(fs.readFileSync(path.join(dir, `${stem}${ext}`), 'utf8'));
      } catch (e) {
        console.log(`  ✗  ${toolDir}/${stem}${ext} — cannot read file: ${e.message}`);
        errors++;
        continue;
      }
      if (tomlErrors.length === 0) {
        console.log(`  ✓  ${toolDir}/${stem}${ext}`);
        continue;
      }
      for (const message of tomlErrors) {
        console.log(`  ✗  ${toolDir}/${stem}${ext} — ${message}`);
        errors++;
      }
    }
  }

  // ── Description sync check ──────────────────────────────────────────────────
  console.log('\nChecking description sync...');

  for (const claudeStem of claudeStems) {
    const tomlStem   = NAME_MAP[claudeStem] ?? claudeStem;
    const descClaude = byTool.claude[claudeStem];
    const descGemini = byTool.gemini[tomlStem];
    const descAgy    = byTool.antigravity[tomlStem];

    const malformed = [
      ['.claude/commands', byTool.claude, claudeStem],
      ['.gemini/commands', byTool.gemini, tomlStem],
      ['commands/', byTool.antigravity, tomlStem],
    ].filter(([, commands, stem]) => Object.prototype.hasOwnProperty.call(commands, stem) && commands[stem] == null);

    if (malformed.length) {
      console.log(`  ✗  ${claudeStem}`);
      for (const [toolDir, , stem] of malformed) {
        console.log(`       ${toolDir}/${stem} — missing or malformed description`);
      }
      errors++;
      continue;
    }

    if (descClaude == null || descGemini == null || descAgy == null) {
      // Missing file already flagged by parity check
      continue;
    }

    const allMatch = descClaude === descGemini && descGemini === descAgy;

    if (allMatch) {
      console.log(`  ✓  ${claudeStem}`);
    } else {
      console.log(`  ✗  ${claudeStem}`);
      console.log(`       .claude:      ${descClaude}`);
      console.log(`       .gemini:      ${descGemini}`);
      console.log(`       commands/:    ${descAgy}`);
      errors++;
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${allCanonicalStems.size} commands checked — ${errors} error(s) — ${status}`);

  if (errors > 0) process.exit(1);
}

main();
