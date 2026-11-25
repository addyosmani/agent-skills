#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * CLI that validates every skill in skills/ against the rules in
 * docs/skill-anatomy.md, and every persona in agents/ against the three rules
 * in docs/agents.md. The rules themselves live in scripts/lib/skill-lint.js
 * (a single source of truth, importable and unit-testable); this file is a thin
 * wrapper that walks the skills directory, runs the linter, prints the report,
 * and sets the exit code.
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const { lintSkill, lintPersona } = require('./lib/skill-lint');

const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');
const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`ERROR: skills directory not found at ${SKILLS_DIR}`);
    process.exit(1);
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
    .sort();

  const knownSkills = new Set(skillDirs);

  let totalErrors   = 0;
  let totalWarnings = 0;

  for (const dirName of skillDirs) {
    const { errors, warnings, exempt } = lintSkill(dirName, SKILLS_DIR, knownSkills);
    totalErrors   += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      const tag = exempt ? ' (section checks exempt)' : '';
      console.log(`  ✓  ${dirName}${tag}`);
    } else {
      const icon = errors.length > 0 ? '  ✗ ' : '  ⚠ ';
      console.log(`${icon} ${dirName}`);
      for (const msg of errors)   console.log(`       ERROR: ${msg}`);
      for (const msg of warnings) console.log(`       WARN:  ${msg}`);
    }
  }

  // ── Personas ─────────────────────────────────────────────────────────────
  // agents/<name>.md files are consumed as subagents and spawned by name from
  // commands, so they get the same frontmatter contract plus a closing
  // Composition section (docs/agents.md). An index file such as README.md is
  // not a persona and is skipped.
  const personaFiles = fs.existsSync(AGENTS_DIR)
    ? fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md') && !/^readme\.md$/i.test(f)).sort()
    : [];

  if (personaFiles.length > 0) console.log('');
  for (const fileName of personaFiles) {
    const { errors } = lintPersona(fileName, AGENTS_DIR);
    totalErrors += errors.length;
    if (errors.length === 0) {
      console.log(`  ✓  agents/${fileName}`);
    } else {
      console.log(`  ✗  agents/${fileName}`);
      for (const msg of errors) console.log(`       ERROR: ${msg}`);
    }
  }

  const status = totalErrors > 0 ? 'FAILED' : totalWarnings > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
  console.log(`\n${skillDirs.length} skills and ${personaFiles.length} personas checked — ${totalErrors} error(s), ${totalWarnings} warning(s) — ${status}`);

  if (totalErrors > 0) process.exit(1);
}

// Surface unexpected failures (fs errors, bad symlinks, …) as a structured
// one-line CI error instead of an uncaught stack trace.
try {
  main();
} catch (err) {
  console.error(`\nERROR: validate-skills failed unexpectedly: ${err.message}`);
  process.exit(1);
}
