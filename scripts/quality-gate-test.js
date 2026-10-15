#!/usr/bin/env node
'use strict';

// Exercise the shipped report gate as a CLI, without installing either scanner.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { after, test } = require('node:test');

const gate = path.join(__dirname, '..', 'skills', 'constraint-driven-development', 'scripts', 'quality-gate.mjs');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-quality-gate-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

function run(tool, report) {
  const file = path.join(scratch, 'report.json');
  fs.writeFileSync(file, typeof report === 'string' ? report : JSON.stringify(report));
  return spawnSync(process.execPath, [gate, tool, file], { encoding: 'utf8' });
}

function semgrep(...severities) {
  return {
    results: severities.map(severity => ({ extra: { severity } })),
    errors: [],
    paths: { scanned: ['app.py'] },
  };
}

function axe(...impacts) {
  return [{ url: 'https://example.test/', violations: impacts.map(impact => ({ impact })) }];
}

for (const [tool, report] of [
  ['semgrep', semgrep()], ['semgrep', semgrep('INFO', 'WARNING', 'LOW', 'MEDIUM')],
  ['axe', axe()], ['axe', axe('minor', 'moderate')],
]) {
  test(`${tool}: clean or below-threshold findings pass: ${JSON.stringify(report)}`, () => {
    const result = run(tool, report);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /0 blocking/);
  });
}

for (const severity of ['ERROR', 'HIGH', 'CRITICAL']) {
  test(`semgrep: ${severity} fails the gate`, () => {
    const result = run('semgrep', semgrep('WARNING', severity));
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /1 blocking/);
  });
}

for (const impact of ['serious', 'critical']) {
  test(`axe: ${impact} on a later page fails the gate`, () => {
    const result = run('axe', [...axe('minor', 'moderate'), ...axe(impact)]);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /1 blocking/);
  });
}

const invalidReports = [
  ['semgrep', { ...semgrep(), errors: [{ message: 'Scan failed' }] }],
  ['semgrep', { ...semgrep(), paths: { scanned: [] } }],
  ['semgrep', { results: [], errors: [] }],
  ['semgrep', { ...semgrep(), errors: null }],
  ['semgrep', { ...semgrep(), results: null }],
  ['semgrep', semgrep('UNKNOWN')],
  ['semgrep', { ...semgrep(), results: [null] }],
  ['axe', []], ['axe', [{}]], ['axe', [null]], ['axe', { violations: [] }],
  ['axe', [{ violations: null }]], ['axe', [{ violations: [null] }]],
  ['axe', axe(null)], ['axe', axe('UNKNOWN')],
  ['axe', [...axe('critical'), {}]],
  ['axe', [{ url: 'chrome-error://chromewebdata/', violations: [] }]],
  ['axe', [{ url: 'not a URL', violations: [] }]],
  ['axe', [{ violations: [] }]],
];
for (const [tool, report] of invalidReports) {
  test(`${tool}: unusable report fails closed: ${JSON.stringify(report)}`, () => {
    const result = run(tool, report);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /quality-gate:/);
  });
}

for (const tool of ['semgrep', 'axe']) {
  for (const report of ['', '{', 'null', '{}']) {
    test(`${tool}: empty, malformed or incomplete JSON fails: ${JSON.stringify(report)}`, () => {
      assert.equal(run(tool, report).status, 2);
    });
  }
}

test('missing file, missing arguments and unsupported tool fail', () => {
  for (const args of [[], ['axe'], ['other', 'report.json'], ['axe', 'missing.json']]) {
    const result = spawnSync(process.execPath, [gate, ...args], { cwd: scratch, encoding: 'utf8' });
    assert.equal(result.status, 2, result.stderr);
  }
});
