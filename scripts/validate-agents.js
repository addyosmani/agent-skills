#!/usr/bin/env node
/**
 * validate-agents.js
 *
 * Enforces the persona contract stated in docs/agents.md for every file under
 * agents/. Personas are consumed as Claude Code subagents (auto-discovered by
 * the plugin) and as Agent Teams teammates, and are spawned by name from the
 * /ship and /webperf commands, so a persona that drifts from the contract
 * breaks silently at spawn time rather than in CI. Rules:
 *
 *   1. Frontmatter is present and valid YAML, with `name` matching the file
 *      stem (the name IS the `subagent_type`) and a non-empty `description`.
 *   2. No `hooks`, `mcpServers`, or `permissionMode` frontmatter — plugin
 *      agents ignore those fields silently, so their presence is a bug.
 *   3. The file ends with a `## Composition` section (Invoke directly when /
 *      Invoke via / Do not invoke from another persona).
 *   4. Every persona is listed in the table at the top of docs/agents.md and
 *      in the README persona table.
 *   5. Every persona a command spawns by name resolves to a file in agents/.
 *
 * Listing files that are absent (e.g. in a test sandbox) are skipped, not
 * failed: this validator checks consistency between files that exist.
 *
 * Exit codes: 0 = all clear, 1 = one or more errors.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const { parseFrontmatter, frontmatterYamlErrors } = require(path.join(__dirname, 'lib', 'skill-lint.js'));

const ROOT       = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

// docs/agents.md → "Adding a new persona": the name is the file stem and is
// used verbatim as `subagent_type`, so it must be a plain kebab-case token.
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// docs/agents.md → Claude Code interop: "Plugin agents do not support `hooks`,
// `mcpServers`, or `permissionMode` frontmatter — those fields are silently
// ignored." A persona relying on them is broken without any error at runtime.
const IGNORED_FIELDS = ['hooks', 'mcpServers', 'permissionMode'];

// Files that must list every persona (skipped when absent).
const LISTINGS = [
  { file: 'docs/agents.md', link: (name) => `agents/${name}.md` },
  { file: 'README.md',      link: (name) => `agents/${name}.md` },
];

// Where commands live on each host surface. Only these files spawn personas.
const COMMAND_DIRS = [
  { dir: '.claude/commands', ext: '.md' },
  { dir: '.gemini/commands', ext: '.toml' },
  { dir: 'commands',         ext: '.toml' },
];

// The phrasings commands use to spawn a persona by name. Each captures the
// persona name. Deliberately narrow: a backticked name alone is not a spawn
// (commands mention skills and files in backticks constantly).
const SPAWN_PATTERNS = [
  /\bspawn (?:the )?`([a-z][a-z0-9-]*)` (?:subagent|persona)\b/gi,  // Spawn the `x` subagent
  /`([a-z][a-z0-9-]*)` (?:subagent|persona)\b/g,                    // the `x` persona
  /\bsubagent_type:\s*`?([a-z][a-z0-9-]*)`?/g,                       // subagent_type: x
  /^\s*\d+\.\s+\*\*`([a-z][a-z0-9-]*)`\*\*/gm,                       // 1. **`x`** — fan-out list
];

function topLevelKeys(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return [];
  const keys = [];
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/** Lint one persona file. Pure: returns { errors } for the given content. */
function lintPersonaContent(stem, content) {
  const errors = [];

  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors };
  }
  errors.push(...frontmatterYamlErrors(content));

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== stem) {
    errors.push(`Frontmatter name '${fm.name}' does not match file name '${stem}' — the name is the subagent_type commands spawn`);
  }
  if (!KEBAB_CASE.test(stem)) {
    errors.push(`File name '${stem}' is not lowercase-hyphen-separated`);
  }
  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  }

  for (const key of topLevelKeys(content)) {
    if (IGNORED_FIELDS.includes(key)) {
      errors.push(`Frontmatter field '${key}' is silently ignored by plugin agents (docs/agents.md: Claude Code interop) — remove it`);
    }
  }

  // Rule 3: the last level-two heading must be Composition.
  const h2s = [...content.matchAll(/^## +(.+?)\s*$/gm)].map((m) => m[1]);
  if (!h2s.some((h) => /^Composition$/i.test(h))) {
    errors.push('Missing "## Composition" section (docs/agents.md: every persona file ends with a Composition block)');
  } else if (!/^Composition$/i.test(h2s[h2s.length - 1])) {
    errors.push(`"## Composition" must be the last section, but "## ${h2s[h2s.length - 1]}" follows it`);
  }

  return { errors };
}

function loadPersonas() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ stem: f.replace(/\.md$/, ''), rel: `agents/${f}`, content: fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8') }));
}

function findSpawnReferences() {
  const refs = [];
  for (const { dir, ext } of COMMAND_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((n) => n.endsWith(ext)).sort()) {
      const rel = `${dir}/${f}`;
      const lines = fs.readFileSync(path.join(abs, f), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        // One line can satisfy several patterns ("Spawn the `x` subagent"
        // matches two); a reference is one (file, line, name), not one match.
        const onThisLine = new Set();
        for (const pattern of SPAWN_PATTERNS) {
          pattern.lastIndex = 0;
          let m;
          while ((m = pattern.exec(line)) !== null) onThisLine.add(m[1]);
        }
        for (const name of onThisLine) refs.push({ file: rel, line: i + 1, name });
      });
    }
  }
  return refs;
}

function main() {
  console.log('Checking personas against docs/agents.md contract...\n');

  const personas = loadPersonas();
  if (personas.length === 0) {
    console.log('  ✗  agents/: no persona files found');
    console.log('\n0 personas checked — 1 error(s) — FAILED');
    process.exit(1);
  }

  let errors = 0;
  const names = new Set(personas.map((p) => p.stem));

  for (const p of personas) {
    const { errors: errs } = lintPersonaContent(p.stem, p.content);
    if (errs.length === 0) {
      console.log(`  ✓  ${p.rel}`);
    } else {
      console.log(`  ✗  ${p.rel}`);
      for (const e of errs) { console.log(`       ${e}`); errors++; }
    }
  }

  // Rule 4: listings
  for (const { file, link } of LISTINGS) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const tableLines = fs.readFileSync(abs, 'utf8').split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
    for (const p of personas) {
      if (!tableLines.some((l) => l.includes(link(p.stem)))) {
        console.log(`  ✗  ${file}: persona '${p.stem}' is not listed in the persona table`);
        errors++;
      }
    }
  }

  // Rule 5: spawn references resolve
  const refs = findSpawnReferences();
  for (const r of refs) {
    if (!names.has(r.name)) {
      console.log(`  ✗  ${r.file}: L${r.line} spawns '${r.name}' but agents/${r.name}.md does not exist`);
      errors++;
    }
  }
  const resolved = new Set(refs.filter((r) => names.has(r.name)).map((r) => r.name));
  console.log(`\n${personas.length} personas checked, ${refs.length} spawn reference(s) in commands (${resolved.size} distinct persona(s)) — ${errors} error(s) — ${errors > 0 ? 'FAILED' : 'PASSED'}`);

  if (errors > 0) process.exit(1);
}

if (require.main === module) main();

module.exports = { lintPersonaContent, SPAWN_PATTERNS, IGNORED_FIELDS };
