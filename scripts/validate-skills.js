#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * CI entry point for skill validation. The rules themselves live in
 * tests/lib/skill-lint.js (single source of truth, shared with the
 * node:test battery in tests/skills.test.js). This script is a thin CLI
 * that renders the lint results and sets the exit code.
 *
 * Exit codes: 0 = no errors, 1 = one or more errors (warnings never fail).
 */

'use strict';

const fs   = require('fs');
const lint = require('../tests/lib/skill-lint');

function main() {
  if (!fs.existsSync(lint.SKILLS_DIR)) {
    console.error(`ERROR: skills directory not found at ${lint.SKILLS_DIR}`);
    process.exit(1);
  }

  const skillDirs   = lint.listSkillDirs();
  const knownSkills = new Set(skillDirs);

  let totalErrors   = 0;
  let totalWarnings = 0;

  for (const dirName of skillDirs) {
    const { errors, warnings, exempt } = lint.lintSkill(dirName, knownSkills);
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

  const status = totalErrors > 0 ? 'FAILED' : totalWarnings > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
  console.log(`\n${skillDirs.length} skills checked — ${totalErrors} error(s), ${totalWarnings} warning(s) — ${status}`);

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
