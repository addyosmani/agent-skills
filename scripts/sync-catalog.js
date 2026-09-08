#!/usr/bin/env node
/**
 * sync-catalog.js
 *
 * Keeps every place that lists the skill catalog in sync with `skills/`.
 *
 * The catalog is repeated in the README tables, the README skill counts,
 * CLAUDE.md's Skills by Phase, the meta-skill Quick Reference, and the
 * skill-gap issue form. Adding a skill meant editing all of them by hand, so
 * they drifted: `constraint-driven-development` shipped missing from three of
 * them, and the README heading still said 24 while 25 skills existed.
 *
 * Membership, names, and counts come from `skills/<name>/SKILL.md` — never from a
 * hand-maintained list. `scripts/catalog.json` supplies only presentation:
 * which phase a skill displays under and its editorial one-liners. A skill on
 * disk with no catalog entry (or an entry with no skill on disk) is an error,
 * so a new skill fails CI loudly instead of being routed by an invented
 * description.
 *
 * Generated regions are delimited by markers, so everything around them stays
 * hand-written:
 *
 *     <!-- catalog:start:skills-table -->   ...   <!-- catalog:end:skills-table -->
 *
 * Two catalog listings are checked but never rewritten, because they encode
 * human judgement a generator would flatten: the README project tree and the
 * meta-skill discovery decision tree. Both are checked for membership only —
 * every skill appears, nothing unknown appears. (The meta-skill's Lifecycle
 * Sequence is deliberately partial and is not checked.)
 *
 * Usage:
 *   node scripts/sync-catalog.js            # same as --check
 *   node scripts/sync-catalog.js --check    # read-only; exit 1 on drift
 *   node scripts/sync-catalog.js --write    # rewrite the generated regions
 *
 * Exit codes: 0 = in sync, 1 = drift or invalid configuration.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const { parseFrontmatter } = require('./lib/skill-lint');

const ROOT         = path.resolve(__dirname, '..');
const SKILLS_DIR   = path.join(ROOT, 'skills');
const CATALOG_FILE = path.join(ROOT, 'scripts', 'catalog.json');

// The phase whose skills are excluded from the lifecycle listings: the
// meta-skill routes to the others, so it is not itself a lifecycle step.
// The generated counts sentence names that one skill, so the phase must hold
// exactly it — a second entry would make the sentence false.
const META_PHASE = 'Meta';
const META_SKILL = 'using-agent-skills';

// ─── Inputs ──────────────────────────────────────────────────────────────────

/**
 * The skills that exist. A skill is a directory under skills/ with a SKILL.md
 * whose frontmatter name matches the directory. Returns sorted names.
 */
function readSkillsFromDisk(errors) {
  if (!fs.existsSync(SKILLS_DIR)) {
    errors.push('skills/ directory not found');
    return [];
  }

  const names = [];
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const file = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(file)) {
      errors.push(`skills/${entry.name}/ has no SKILL.md`);
      continue;
    }
    const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!fm || !fm.name) {
      errors.push(`skills/${entry.name}/SKILL.md has no frontmatter 'name'`);
      continue;
    }
    if (fm.name !== entry.name) {
      errors.push(`skills/${entry.name}/SKILL.md declares name '${fm.name}' — must match the directory`);
      continue;
    }
    names.push(entry.name);
  }

  return names;
}

/**
 * Every catalog value is rendered verbatim into a markdown table, a heading, or
 * a YAML option, so anything that is not one line of text would silently
 * corrupt the generated region. Reject it here instead.
 */
function checkText(value, field, label, errors, note = '') {
  if (value === undefined || value === null || value === '') {
    errors.push(`scripts/catalog.json: ${label} is missing "${field}"${note}`);
  } else if (typeof value !== 'string') {
    errors.push(`scripts/catalog.json: ${label} has a non-string "${field}" — expected one line of text`);
  } else if (/[\r\n]/.test(value)) {
    errors.push(`scripts/catalog.json: ${label} has a line break in "${field}" — keep it to one line`);
  } else {
    return true;
  }
  return false;
}

/**
 * Load and validate scripts/catalog.json against the skills on disk.
 * Returns { phases, skills } in catalog order, or null when unusable.
 */
function loadCatalog(diskSkills, errors) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  } catch (err) {
    errors.push(`scripts/catalog.json: ${err.message}`);
    return null;
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.phases) || !Array.isArray(raw.skills)) {
    errors.push('scripts/catalog.json: expected an object with "phases" and "skills" arrays');
    return null;
  }

  const phaseNames = new Set();
  for (const phase of raw.phases) {
    if (!phase || typeof phase !== 'object') {
      errors.push('scripts/catalog.json: every phase must be an object with "name" and "heading"');
      return null;
    }
    const label = typeof phase.name === 'string' ? `phase '${phase.name}'` : 'every phase';
    if (!checkText(phase.name, 'name', label, errors) ||
        !checkText(phase.heading, 'heading', label, errors)) {
      return null;
    }
    if (phaseNames.has(phase.name)) {
      errors.push(`scripts/catalog.json: duplicate phase '${phase.name}'`);
      return null;
    }
    phaseNames.add(phase.name);
  }

  const seen = new Set();
  const metaSkills = [];
  for (const skill of raw.skills) {
    if (!skill || typeof skill !== 'object') {
      errors.push('scripts/catalog.json: every skill entry must be an object');
      return null;
    }
    if (!checkText(skill.name, 'name', 'every skill entry', errors)) return null;
    if (seen.has(skill.name)) {
      errors.push(`scripts/catalog.json: duplicate entry for '${skill.name}'`);
    }
    seen.add(skill.name);

    const label = `'${skill.name}'`;
    if (checkText(skill.phase, 'phase', label, errors)) {
      if (!phaseNames.has(skill.phase)) {
        errors.push(`scripts/catalog.json: ${label} has unknown phase '${skill.phase}'`);
      }
      if (skill.phase === META_PHASE) metaSkills.push(skill.name);
    }
    for (const field of ['does', 'when']) checkText(skill[field], field, label, errors);
    if (skill.phase !== META_PHASE) {
      checkText(skill.summary, 'summary', label, errors, ' (used by the Quick Reference)');
    }
  }

  if (metaSkills.join(',') !== META_SKILL) {
    errors.push(
      `scripts/catalog.json: phase '${META_PHASE}' must contain exactly '${META_SKILL}' — ` +
      `found ${metaSkills.length ? metaSkills.join(', ') : 'no entry'}. The generated counts ` +
      `sentence names that one meta-skill by hand.`
    );
  }

  // Membership is owned by the filesystem: the catalog may not add or omit skills.
  for (const name of diskSkills) {
    if (!seen.has(name)) {
      errors.push(
        `skills/${name}/ has no entry in scripts/catalog.json — ` +
        `add one with phase, does, when, and summary, then re-run with --write`
      );
    }
  }
  for (const name of seen) {
    if (!diskSkills.includes(name)) {
      errors.push(`scripts/catalog.json lists '${name}' but skills/${name}/SKILL.md does not exist`);
    }
  }

  return { phases: raw.phases, skills: raw.skills };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

// A table cell must not break the markdown table it lives in.
const cell = text => text.replace(/\|/g, '\\|');

const lifecycleSkills = catalog => catalog.skills.filter(skill => skill.phase !== META_PHASE);

const skillsInPhase = (catalog, phase) => catalog.skills.filter(skill => skill.phase === phase.name);

function renderSkillsTable(catalog) {
  const lines = [''];
  for (const phase of catalog.phases) {
    const skills = skillsInPhase(catalog, phase);
    if (skills.length === 0) continue;
    lines.push(`### ${phase.heading}`, '');
    lines.push('| Skill | What It Does | Use When |');
    lines.push('|-------|-------------|----------|');
    for (const skill of skills) {
      lines.push(`| [${skill.name}](skills/${skill.name}/SKILL.md) | ${cell(skill.does)} | ${cell(skill.when)} |`);
    }
    lines.push('');
  }
  return lines;
}

function renderSkillCounts(catalog) {
  const total     = catalog.skills.length;
  const lifecycle = lifecycleSkills(catalog).length;
  return [
    '',
    `The pack includes ${total} skills total — ${lifecycle} lifecycle skills plus the \`${META_SKILL}\` meta-skill.`,
    '',
  ];
}

function renderSkillsByPhase(catalog) {
  const lines = [''];
  for (const phase of catalog.phases) {
    if (phase.name === META_PHASE) continue;
    const skills = skillsInPhase(catalog, phase);
    if (skills.length === 0) continue;
    lines.push(`**${phase.name}:** ${skills.map(skill => skill.name).join(', ')}`);
  }
  lines.push('');
  return lines;
}

function renderQuickReference(catalog) {
  const lines = ['', '| Phase | Skill | One-Line Summary |', '|-------|-------|-----------------|'];
  for (const skill of lifecycleSkills(catalog)) {
    lines.push(`| ${skill.phase} | ${skill.name} | ${cell(skill.summary)} |`);
  }
  lines.push('');
  return lines;
}

function renderSkillOptions(catalog) {
  return catalog.skills
    .map(skill => skill.name)
    .sort()
    .map(name => `        - ${name}`);
}

// file → region → renderer. `yaml` targets use `#` markers, the rest use HTML comments.
const TARGETS = [
  { file: 'README.md',                            region: 'skills-table',    render: renderSkillsTable },
  { file: 'README.md',                            region: 'skill-counts',    render: renderSkillCounts },
  { file: 'CLAUDE.md',                            region: 'skills-by-phase', render: renderSkillsByPhase },
  { file: 'skills/using-agent-skills/SKILL.md',   region: 'quick-reference', render: renderQuickReference },
  { file: '.github/ISSUE_TEMPLATE/skill-gap.yml', region: 'skill-options',   render: renderSkillOptions, yaml: true },
];

// ─── Generated regions ───────────────────────────────────────────────────────

function markersFor(target) {
  return target.yaml
    ? [`# catalog:start:${target.region}`, `# catalog:end:${target.region}`]
    : [`<!-- catalog:start:${target.region} -->`, `<!-- catalog:end:${target.region} -->`];
}

/**
 * Locate one region's marker lines. Throws when the markers are missing,
 * duplicated, or out of order — a marker problem is a configuration error, not
 * drift, so nothing is written.
 */
function findRegion(lines, [start, end]) {
  const starts = [];
  const ends   = [];
  lines.forEach((line, i) => {
    if (line.trim() === start) starts.push(i);
    if (line.trim() === end)   ends.push(i);
  });

  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(
      `expected exactly one \`${start}\` and one \`${end}\` — found ` +
      `${starts.length} start and ${ends.length} end marker(s)`
    );
  }
  if (ends[0] < starts[0]) {
    throw new Error(`\`${end}\` appears before \`${start}\``);
  }

  return { start: starts[0], end: ends[0] };
}

/**
 * Two regions in one file may not enclose or cross each other. Each pair of
 * markers is well formed on its own in that case, so nothing above catches it:
 * a region that swallows another would rewrite it away, markers and all, and
 * the run would report success.
 */
function checkRegionsDisjoint(label, regions, errors) {
  const ordered = [...regions].sort((a, b) => a.start - b.start);
  for (let i = 1; i < ordered.length; i++) {
    const before = ordered[i - 1];
    const after  = ordered[i];
    if (after.start < before.end) {
      errors.push(
        `${label}: regions [${before.target.region}] (lines ${before.start + 1}-${before.end + 1}) ` +
        `and [${after.target.region}] (lines ${after.start + 1}-${after.end + 1}) overlap — ` +
        `each region must close before the next one opens`
      );
    }
  }
}

/** Replace the body of every located region in one pass over the file. */
function applyRegions(lines, regions) {
  const out = [];
  let cursor = 0;
  for (const { start, end, body } of [...regions].sort((a, b) => a.start - b.start)) {
    out.push(...lines.slice(cursor, start + 1), ...body);
    cursor = end;
  }
  out.push(...lines.slice(cursor));
  return out.join('\n');
}

// ─── Checked-only listings ───────────────────────────────────────────────────

/** The contents of the first fenced code block after `heading`. */
function fencedBlockAfter(content, heading) {
  const at = content.indexOf(`\n${heading}\n`);
  if (at === -1) return null;
  const match = content.slice(at).match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

/** Skill directories listed under `skills/` in the README project tree. */
function readmeTreeSkills(block) {
  const lines = block.split('\n');
  const start = lines.findIndex(line => /^├── skills\//.test(line));
  if (start === -1) return null;

  const names = [];
  for (const line of lines.slice(start + 1)) {
    if (/^[├└]── /.test(line)) break;          // back out to the next top-level entry
    const match = line.match(/^│\s+[├└]── ([a-z0-9-]+)\//);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Skills the meta-skill discovery tree routes to (every line ends in its target). */
function discoveryTreeSkills(block) {
  return [...block.matchAll(/→[ \t]*([a-z][a-z0-9-]*)[ \t]*$/gm)].map(match => match[1]);
}

const CHECKS = [
  {
    file: 'README.md',
    label: 'project tree',
    heading: '## Project Structure',
    extract: readmeTreeSkills,
    expected: catalog => catalog.skills.map(skill => skill.name),
  },
  {
    file: 'skills/using-agent-skills/SKILL.md',
    label: 'discovery tree',
    heading: '## Skill Discovery',
    extract: discoveryTreeSkills,
    expected: catalog => lifecycleSkills(catalog).map(skill => skill.name),
  },
];

function checkListing(check, catalog, errors) {
  const file = path.join(ROOT, check.file);
  if (!fs.existsSync(file)) {
    errors.push(`${check.file} not found`);
    return false;
  }

  const block = fencedBlockAfter(fs.readFileSync(file, 'utf8'), check.heading);
  if (block === null) {
    errors.push(`${check.file}: no code block found under "${check.heading}"`);
    return false;
  }

  const listed = check.extract(block);
  if (listed === null) {
    errors.push(`${check.file}: could not find the skill listing in the ${check.label}`);
    return false;
  }

  const expected = new Set(check.expected(catalog));
  const found    = new Set(listed);
  const missing  = [...expected].filter(name => !found.has(name));
  const unknown  = [...found].filter(name => !expected.has(name));

  if (missing.length === 0 && unknown.length === 0) return true;

  const detail = [
    missing.length ? `missing: ${missing.join(', ')}` : null,
    unknown.length ? `not a skill: ${unknown.join(', ')}` : null,
  ].filter(Boolean).join('; ');
  errors.push(`${check.file}: ${check.label} is out of date — ${detail} (edit it by hand)`);
  return false;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function main(argv) {
  const unknownArgs = argv.filter(arg => arg !== '--write' && arg !== '--check');
  if (unknownArgs.length > 0) {
    console.log(`Unknown argument(s): ${unknownArgs.join(' ')}`);
    console.log('Usage: node scripts/sync-catalog.js [--check | --write]');
    process.exit(1);
  }
  // Read-only must stay read-only: a run that asks for both is a mistake, and
  // guessing which one was meant is how a --check in CI ends up writing.
  if (argv.includes('--check') && argv.includes('--write')) {
    console.log('--check and --write are mutually exclusive — pass one.');
    process.exit(1);
  }
  const write = argv.includes('--write');

  console.log(`${write ? 'Syncing' : 'Checking'} the skill catalog...\n`);

  // Phase 1 — validate inputs. Invalid configuration writes nothing at all.
  const configErrors = [];
  const diskSkills   = readSkillsFromDisk(configErrors);
  const catalog      = loadCatalog(diskSkills, configErrors);

  // A file can hold more than one region (the README holds two), so regions are
  // applied to one in-memory copy per file rather than to separate reads.
  const files   = new Map();
  const pending = [];
  // Nothing is rendered while the inputs are known-bad: an entry that failed
  // validation would otherwise render as `undefined` in a table cell.
  if (catalog && configErrors.length === 0) {
    // Every region is located in the file as it sits on disk, and all of a
    // file's regions are validated together, before anything is replaced.
    for (const target of TARGETS) {
      const file = path.join(ROOT, target.file);
      if (!files.has(file)) {
        if (!fs.existsSync(file)) {
          configErrors.push(`${target.file} not found`);
          continue;
        }
        const original = fs.readFileSync(file, 'utf8');
        files.set(file, { label: target.file, original, lines: original.split('\n'), regions: [] });
      }
      const entry = files.get(file);
      try {
        entry.regions.push({ target, ...findRegion(entry.lines, markersFor(target)) });
      } catch (err) {
        configErrors.push(`${target.file} [${target.region}]: ${err.message}`);
      }
    }
    for (const entry of files.values()) {
      checkRegionsDisjoint(entry.label, entry.regions, configErrors);
    }

    // Only once every file's markers are sound does anything get rendered.
    if (configErrors.length === 0) {
      for (const entry of files.values()) {
        for (const region of entry.regions) {
          region.body = region.target.render(catalog);
          const current = entry.lines.slice(region.start + 1, region.end);
          pending.push({ target: region.target, changed: current.join('\n') !== region.body.join('\n') });
        }
        entry.updated = applyRegions(entry.lines, entry.regions);
      }
    }
  }

  if (configErrors.length > 0) {
    for (const error of configErrors) console.log(`  ✗  ${error}`);
    console.log(`\n${diskSkills.length} skills — ${configErrors.length} configuration error(s) — FAILED`);
    console.log('\nNothing was written. Fix the errors above and re-run.');
    process.exit(1);
  }

  // Phase 2 — report every region, then write each changed file once.
  let stale = 0;
  for (const { target, changed } of pending) {
    const label = `${target.file} [${target.region}]`;
    if (!changed) {
      console.log(`  ✓  ${label}`);
      continue;
    }
    stale++;
    console.log(write ? `  ↻  ${label} — updated` : `  ✗  ${label} — out of date`);
  }
  if (write) {
    for (const [file, { original, updated }] of files) {
      if (updated !== original) fs.writeFileSync(file, updated);
    }
  }

  // Phase 3 — the hand-written listings, checked either way.
  const checkErrors = [];
  for (const check of CHECKS) {
    if (checkListing(check, catalog, checkErrors)) {
      console.log(`  ✓  ${check.file} ${check.label}`);
    } else {
      console.log(`  ✗  ${checkErrors[checkErrors.length - 1]}`);
    }
  }

  const failures = (write ? 0 : stale) + checkErrors.length;
  const status   = failures > 0 ? 'FAILED' : 'PASSED';
  console.log(
    `\n${diskSkills.length} skills — ` +
    `${stale} region(s) ${write ? 'updated' : 'out of date'} — ` +
    `${checkErrors.length} listing error(s) — ${status}`
  );

  if (failures > 0) {
    if (!write && stale > 0) console.log('\nRun `node scripts/sync-catalog.js --write` to regenerate.');
    process.exit(1);
  }
}

main(process.argv.slice(2));
