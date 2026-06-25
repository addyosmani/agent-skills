#!/usr/bin/env node
/**
 * skill-metrics.js
 *
 * Renders a length table for every skill: description chars and body bytes,
 * each flagged against the thresholds in tests/lib/skill-lint.js. Purely
 * informational — always exits 0. Use it to spot anemic or oversized skills.
 *
 * Run: node scripts/skill-metrics.js
 */

'use strict';

const lint = require('../tests/lib/skill-lint');

function flagDescription(len) {
  if (len == null) return '  (none)';
  if (len > lint.MAX_DESCRIPTION_LENGTH) return ' OVER-MAX';
  if (len < lint.MIN_DESCRIPTION_LENGTH) return ' under-min';
  return '';
}

function flagBody(len) {
  if (len > lint.BODY_WARN_MAX_BYTES) return ' over-max';
  if (len < lint.BODY_WARN_MIN_BYTES) return ' under-min';
  return '';
}

function main() {
  const skillDirs   = lint.listSkillDirs();
  const knownSkills = new Set(skillDirs);

  const rows = skillDirs.map(dirName => {
    const { metrics } = lint.lintSkill(dirName, knownSkills);
    return { dirName, ...metrics };
  });

  const nameWidth = Math.max(...rows.map(r => r.dirName.length), 4);

  console.log(
    `${'skill'.padEnd(nameWidth)}  ${'desc'.padStart(6)}  ${'flag'.padEnd(9)}  ${'body'.padStart(7)}  flag`
  );
  console.log('─'.repeat(nameWidth + 36));

  for (const r of rows) {
    console.log(
      `${r.dirName.padEnd(nameWidth)}  ` +
      `${String(r.descriptionLength ?? '—').padStart(6)}  ` +
      `${flagDescription(r.descriptionLength).padEnd(9)}  ` +
      `${String(r.bodyLength ?? '—').padStart(7)}  ` +
      `${flagBody(r.bodyLength)}`
    );
  }

  const descs = rows.map(r => r.descriptionLength).filter(n => n != null);
  const bodies = rows.map(r => r.bodyLength).filter(n => n != null);
  const range = (arr) => `${Math.min(...arr)}–${Math.max(...arr)}`;
  const summary =
    `${rows.length} skills — description ${range(descs)} chars ` +
    `(limit ${lint.MAX_DESCRIPTION_LENGTH}, min guideline ${lint.MIN_DESCRIPTION_LENGTH}), ` +
    `body ${range(bodies)} bytes (warn >${lint.BODY_WARN_MAX_BYTES})`;
  console.log(`\n${summary}`);

  // In GitHub Actions, also render a markdown table on the run summary page.
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeStepSummary(rows, summary);
  }
}

/** Append a markdown table to the GitHub Actions step summary. */
function writeStepSummary(rows, summary) {
  const fs = require('fs');
  const cell = (n, flag) => (flag ? `\`${n}\` ⚠️ ${flag.trim()}` : `\`${n}\``);
  const lines = [
    '## Skill length metrics',
    '',
    '| Skill | Description (chars) | Body (bytes) |',
    '|---|---|---|',
    ...rows.map(r =>
      `| ${r.dirName} | ${cell(r.descriptionLength ?? '—', flagDescription(r.descriptionLength))} ` +
      `| ${cell(r.bodyLength ?? '—', flagBody(r.bodyLength))} |`
    ),
    '',
    summary,
    '',
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

main();
