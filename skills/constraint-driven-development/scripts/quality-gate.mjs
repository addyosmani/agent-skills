#!/usr/bin/env node
// Exit 0: below threshold; 1: blocking findings; 2: unusable report or invocation.
import { readFileSync } from 'node:fs';

const [tool, file, ...extra] = process.argv.slice(2);
if (!['semgrep', 'axe'].includes(tool) || !file || extra.length) {
  console.error('quality-gate: usage: node quality-gate.mjs <semgrep|axe> <report.json>');
  process.exit(2);
}

try {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  let levels;
  let allowed;
  let blocking;
  if (tool === 'semgrep') {
    if (!Array.isArray(report?.results) || !Array.isArray(report.errors)
        || report.errors.length || !Array.isArray(report.paths?.scanned)
        || !report.paths.scanned.length) {
      throw new Error('Incomplete scan');
    }
    levels = report.results.map(finding => finding?.extra?.severity);
    allowed = ['INFO', 'WARNING', 'ERROR', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    blocking = ['ERROR', 'HIGH', 'CRITICAL'];
  } else {
    // A browser error page can otherwise look like a successful accessibility scan.
    if (!Array.isArray(report) || !report.length
        || report.some(page => !Array.isArray(page?.violations)
          || typeof page.url !== 'string' || !['http:', 'https:'].includes(new URL(page.url).protocol))) {
      throw new Error('Incomplete scan');
    }
    levels = report.flatMap(page => page.violations.map(finding => finding?.impact));
    allowed = ['minor', 'moderate', 'serious', 'critical'];
    blocking = ['serious', 'critical'];
  }
  if (levels.some(level => !allowed.includes(level))) {
    throw new Error('Unknown severity');
  }
  const count = levels.filter(level => blocking.includes(level)).length;
  console.log(`${tool}: ${levels.length} findings, ${count} blocking`);
  process.exitCode = count ? 1 : 0;
} catch {
  console.error('quality-gate: unreadable, incomplete, or unsupported report; check the scanner output');
  process.exitCode = 2;
}
