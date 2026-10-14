#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { materializeWorkspace, parseGrading, clearGradingSlot, persistGradingOutcome, extractExecutorModel } = require('./run-evals');

const RUNNER = path.join(__dirname, 'run-evals.js');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSkill(root, name, description) {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
  );
}

function behavioralEval(files = ['project/context.txt']) {
  return {
    id: 1,
    prompt: 'Inspect the attached project and complete the requested work.',
    expected_output: 'A verified result grounded in the attached project',
    files,
    expectations: ['The attached project is inspected before reporting a result'],
  };
}

function completeCase(skillName, positivePrompt, topK = 1, files) {
  return {
    skill_name: skillName,
    trigger: {
      positive: [1, 2, 3].map(() => ({ prompt: positivePrompt, top_k: topK })),
      negative: [
        { prompt: 'unrelated banana request' },
        { prompt: 'unrelated orange request' },
      ],
    },
    evals: [behavioralEval(files)],
  };
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-run-evals-test-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evals', 'cases'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evals', 'fixtures', 'project'), { recursive: true });
  fs.copyFileSync(RUNNER, path.join(root, 'scripts', 'run-evals.js'));
  fs.cpSync(path.join(__dirname, 'lib'), path.join(root, 'scripts', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'evals', 'fixtures', 'project', 'context.txt'), 'fixture\n');
  return root;
}

function run(root, args = []) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'run-evals.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function runBehavioralWithGrading(root, raw) {
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals = [{ ...behavioralEval([]), kind: 'dialogue' }];
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);
  const stub = path.join(root, 'stub-claude.cjs');
  fs.writeFileSync(stub, `
    const assert = require('node:assert/strict');
    require('child_process').execFileSync = (command, args) => {
      assert.equal(command, 'claude');
      return args.includes('--output-format')
        ? '{"type":"result","result":"done"}\\n'
        : ${JSON.stringify(raw)};
    };
  `);
  return spawnSync(process.execPath, [
    '--require', stub, path.join(root, 'scripts', 'run-evals.js'),
    '--behavioral', 'alpha-skill',
  ], { cwd: root, encoding: 'utf8' });
}

for (const passed of [true, false]) {
  for (const evidence of ['', ' \t\r\n', '\u00a0\u2003']) {
    test(`behavioral CLI diagnoses blank evidence for ${passed ? 'passing' : 'failing'} verdict ${JSON.stringify(evidence)}`, () => {
      const root = makeSandbox();
      try {
        const raw = JSON.stringify({
          expectations: [{ id: 1, text: 'check the result', passed, evidence }],
          summary: { passed: Number(passed), failed: Number(!passed), total: 1, pass_rate: Number(passed) },
        });
        const base = path.join(root, 'evals', 'results', 'alpha-skill.eval-1');
        writeJson(`${base}.grading.json`, { stale: true });

        const result = runBehavioralWithGrading(root, raw);

        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stdout, /grader returned blank evidence/);
        assert.doesNotMatch(result.stdout, /invalid JSON/);
        assert.match(result.stdout, /raw saved to .*alpha-skill\.eval-1\.grading\.raw\.txt/);
        assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), raw);
        assert.equal(fs.existsSync(`${base}.grading.json`), false);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}

for (const raw of ['not JSON', '{"expectations":', '{"expectations":[]}']) {
  test(`behavioral CLI retains the generic diagnostic for invalid grading ${raw}`, () => {
    const root = makeSandbox();
    try {
      const result = runBehavioralWithGrading(root, raw);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /grader returned invalid JSON/);
      assert.doesNotMatch(result.stdout, /blank evidence/);
      const base = path.join(root, 'evals', 'results', 'alpha-skill.eval-1');
      assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), raw);
      assert.equal(fs.existsSync(`${base}.grading.json`), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test('behavioral CLI still publishes valid grading without a rejection diagnostic', () => {
  const root = makeSandbox();
  try {
    const evidence = '  observed in the trace  ';
    const raw = JSON.stringify({
      expectations: [{ id: 1, text: 'check the result', passed: true, evidence }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    });
    const result = runBehavioralWithGrading(root, raw);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /grader returned/);
    const base = path.join(root, 'evals', 'results', 'alpha-skill.eval-1');
    const grading = JSON.parse(fs.readFileSync(`${base}.grading.json`, 'utf8'));
    assert.equal(grading.expectations[0].evidence, evidence);
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('accepts a complete and consistent grader result', () => {
  const raw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed in the trace' },
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed in the trace' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });

  assert.deepEqual(parseGrading(raw, ['first expectation', 'second expectation']), JSON.parse(raw));
});

for (const passed of [true, false]) {
  for (const evidence of ['', ' \t\r\n', '\u00a0\u2003']) {
    test(`rejects ${passed ? 'passing' : 'failing'} grading with blank evidence ${JSON.stringify(evidence)}`, () => {
      const raw = JSON.stringify({
        expectations: [{ id: 1, text: 'check the result', passed, evidence }],
        summary: { passed: Number(passed), failed: Number(!passed), total: 1, pass_rate: Number(passed) },
      });
      assert.equal(parseGrading(raw, ['check the result']), null);
    });
  }
}

test('preserves nonblank evidence including surrounding whitespace', () => {
  const evidence = '  No matching tool call was found.\n';
  const raw = JSON.stringify({
    expectations: [{ id: 1, text: 'check the result', passed: false, evidence }],
    summary: { passed: 0, failed: 1, total: 1, pass_rate: 0 },
  });
  assert.equal(parseGrading(raw, ['check the result']).expectations[0].evidence, evidence);
});

test('blank evidence retains raw grading without publishing a scored artifact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-blank-evidence-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    const raw = JSON.stringify({
      expectations: [{ id: 1, text: 'check the result', passed: true, evidence: '' }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    });
    clearGradingSlot(base);
    assert.equal(persistGradingOutcome(base, parseGrading(raw, ['check the result']), raw), false);
    assert.equal(fs.existsSync(`${base}.grading.json`), false);
    assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), raw);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects grader results that omit expectations', () => {
  const raw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed in the trace' },
    ],
    summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
  });

  assert.equal(parseGrading(raw, ['first expectation', 'second expectation']), null);
});

test('rejects null expectation entries without throwing', () => {
  const cases = [
    { results: [null], declared: ['first expectation'] },
    { results: [{ id: 1, text: 'first expectation', passed: true, evidence: 'observed' }, null], declared: ['first expectation', 'second expectation'] },
  ];
  for (const { results, declared } of cases) {
    const raw = JSON.stringify({
      expectations: results,
      summary: {
        passed: results.length - 1,
        failed: 1,
        total: results.length,
        pass_rate: (results.length - 1) / results.length,
      },
    });

    assert.equal(parseGrading(raw, declared), null);
  }
});

test('rejects incomplete or inconsistent grader summaries', () => {
  const declared = ['expected behavior'];
  const expectation = { id: 1, text: 'expected behavior', passed: false, evidence: 'not observed' };
  const cases = [
    {
      expectations: [],
      summary: { passed: 0, failed: 0, total: 0, pass_rate: 0 },
      declared: [],
    },
    {
      expectations: [{ id: 1, text: 'expected behavior', passed: false }],
      summary: { passed: 0, failed: 1, total: 1, pass_rate: 0 },
      declared,
    },
    {
      expectations: [expectation],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
      declared,
    },
    {
      expectations: [expectation],
      summary: { passed: 0, total: 1, pass_rate: 0 },
      declared,
    },
    {
      expectations: [expectation],
      summary: { passed: 0, failed: 1, total: 1 },
      declared,
    },
  ];

  for (const { declared: d, ...grading } of cases) {
    assert.equal(parseGrading(JSON.stringify(grading), d), null);
  }
});

test('fails when a skill has no eval case file', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /no eval case file/);
});

test('fails when an eval case is below the required minimums', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), {
    skill_name: 'alpha-skill',
    trigger: {
      positive: [{ prompt: 'change alpha widget', top_k: 1 }],
      negative: [],
    },
    evals: [behavioralEval()],
  });

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /below required minimums/);
});

test('fails when a behavioral eval references a missing fixture', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  writeJson(
    path.join(root, 'evals', 'cases', 'alpha-skill.json'),
    completeCase('alpha-skill', 'change alpha widget', 1, ['missing/project.txt']),
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /fixture not found/);
});

test('requires fixtures for execution evals', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  writeJson(
    path.join(root, 'evals', 'cases', 'alpha-skill.json'),
    completeCase('alpha-skill', 'change alpha widget', 1, []),
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /needs a non-empty files\[\] fixture list/);
});

test('allows dialogue evals without fixtures', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals = [{ ...behavioralEval([]), kind: 'dialogue' }];
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('rejects provisional execution evals', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals[0].trust_level = 'provisional';
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /is still provisional/);
});

test('allows dialogue evals with a legacy provisional marker', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals = [{ ...behavioralEval([]), kind: 'dialogue', trust_level: 'provisional' }];
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('rejects unknown behavioral eval kinds', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals[0].kind = 'conversation';
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /unknown kind "conversation"/);
});

test('dry-runs a fixtureless dialogue eval', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals = [{ ...behavioralEval([]), kind: 'dialogue' }];
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);

  const result = run(root, ['--behavioral', 'alpha-skill', '--dry-run']);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /dialogue transcript/);
});

test('enforces the configured rank-1 floor', () => {
  const root = makeSandbox();
  writeSkill(root, 'alpha-skill', 'Handles widget work. Use when implementing widget changes.');
  writeSkill(
    root,
    'beta-skill',
    'Diagnoses urgent widget failures in production. Use when repairing urgent widget failures.',
  );
  writeJson(
    path.join(root, 'evals', 'cases', 'alpha-skill.json'),
    completeCase('alpha-skill', 'urgent widget failure production', 2),
  );
  writeJson(
    path.join(root, 'evals', 'cases', 'beta-skill.json'),
    completeCase('beta-skill', 'repair urgent widget failure', 1),
  );

  const passing = run(root, ['--min-rank1', '50']);
  const failing = run(root, ['--min-rank1', '60']);

  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  assert.equal(failing.status, 1, failing.stdout + failing.stderr);
  assert.match(failing.stdout, /below required 60%/);
});

test('rejects an invalid rank-1 floor', () => {
  const root = makeSandbox();

  const result = run(root, ['--min-rank1', '101']);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /--min-rank1 must be a number from 0 to 100/);
});

// ---------- parseGrading expectation-binding tests ----------

test('accepts reordered-but-complete grader results', () => {
  const expectations = ['first expectation', 'second expectation'];
  const raw = JSON.stringify({
    expectations: [
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed' },
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed in the trace' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });
  const result = parseGrading(raw, expectations);
  assert.notEqual(result, null);
  assert.equal(result.summary.passed, 1);
  assert.equal(result.summary.failed, 1);
});

test('rejects duplicate grader results for the same expectation', () => {
  const expectations = ['first expectation', 'second expectation'];
  // Valid baseline: each id appears exactly once
  const validRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });
  assert.notEqual(parseGrading(validRaw, expectations), null);

  // Duplicate: id 1 appears twice, id 2 is missing
  const dupRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed again' },
    ],
    summary: { passed: 2, failed: 0, total: 2, pass_rate: 1 },
  });
  assert.equal(parseGrading(dupRaw, expectations), null);
});

test('rejects grader results whose ids are not in the declared set', () => {
  const expectations = ['first expectation', 'second expectation'];
  // Valid baseline
  const validRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });
  assert.notEqual(parseGrading(validRaw, expectations), null);

  // id 3 is out of range 1..2
  const badIdRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 3, text: 'unknown expectation', passed: false, evidence: 'not found' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });
  assert.equal(parseGrading(badIdRaw, expectations), null);
});

test('rejects a result set that omits a declared expectation', () => {
  const expectations = ['first expectation', 'second expectation', 'third expectation'];
  // Valid baseline
  const validRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: true, evidence: 'observed' },
      { id: 3, text: 'third expectation', passed: false, evidence: 'not observed' },
    ],
    summary: { passed: 2, failed: 1, total: 3, pass_rate: 2 / 3 },
  });
  assert.notEqual(parseGrading(validRaw, expectations), null);

  // Only 2 results for 3 expectations (id 3 omitted)
  const partialRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: true, evidence: 'observed' },
    ],
    summary: { passed: 2, failed: 0, total: 2, pass_rate: 1 },
  });
  assert.equal(parseGrading(partialRaw, expectations), null);
});

test('derives pass_rate from counters rather than trusting the grader value', () => {
  const expectations = ['first expectation', 'second expectation'];
  // Correct pass_rate should be accepted
  const validRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });
  const valid = parseGrading(validRaw, expectations);
  assert.notEqual(valid, null);
  assert.equal(valid.summary.pass_rate, 0.5);

  // Wrong pass_rate with correct counters: accepted, but recomputed
  const wrongRaw = JSON.stringify({
    expectations: [
      { id: 1, text: 'first expectation', passed: true, evidence: 'observed' },
      { id: 2, text: 'second expectation', passed: false, evidence: 'not observed' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.999 },
  });
  const corrected = parseGrading(wrongRaw, expectations);
  assert.notEqual(corrected, null);
  assert.equal(corrected.summary.pass_rate, 0.5);
  // The integer counters stay exact checks
  assert.equal(corrected.summary.passed, 1);
  assert.equal(corrected.summary.failed, 1);
});

test('replaces paraphrased grader text with the declared expectation', () => {
  const expectations = ['first expectation', 'second expectation'];
  const raw = JSON.stringify({
    expectations: [
      { id: 2, text: 'the agent did the second thing', passed: false, evidence: 'not observed' },
      { id: 1, text: 'roughly the first one', passed: true, evidence: 'observed' },
    ],
    summary: { passed: 1, failed: 1, total: 2, pass_rate: 0.5 },
  });

  const result = parseGrading(raw, expectations);
  assert.notEqual(result, null);
  assert.equal(result.expectations.find((r) => r.id === 1).text, 'first expectation');
  assert.equal(result.expectations.find((r) => r.id === 2).text, 'second expectation');
});

// ---------- persistGradingOutcome stale-cleanup tests ----------

test('rejected grading writes raw output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-cleanup-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');

    const result = persistGradingOutcome(base, null, 'unparseable grader output');

    assert.equal(result, false);
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), true, 'raw output must be written');
    assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), 'unparseable grader output');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejected grading succeeds even when no prior grading.json exists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-cleanup-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');

    const result = persistGradingOutcome(base, null, 'bad output');

    assert.equal(result, false);
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('accepted grading writes grading.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-cleanup-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    const grading = {
      expectations: [{ id: 1, text: 'x', passed: true, evidence: 'y' }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    };

    const result = persistGradingOutcome(base, grading, 'unused');

    assert.equal(result, true);
    const written = JSON.parse(fs.readFileSync(`${base}.grading.json`, 'utf8'));
    assert.deepEqual(written, grading);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- upfront slot-clearing tests ----------

test('a grader that throws leaves no result file behind', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-crash-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    // Stale files from a prior run
    fs.writeFileSync(`${base}.grading.json`, '{"previous":"run"}\n');
    fs.writeFileSync(`${base}.grading.raw.txt`, 'previous raw output');

    clearGradingSlot(base);

    // Executor or grader crashes — persistGradingOutcome is never called

    assert.equal(fs.existsSync(`${base}.grading.json`), false, 'stale grading.json must not survive a crash');
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), false, 'stale grading.raw.txt must not survive a crash');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('successful grading leaves no stale raw file behind', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-success-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    // Stale raw from a prior rejected run
    fs.writeFileSync(`${base}.grading.raw.txt`, 'previous raw output');

    clearGradingSlot(base);

    // Successful grading
    const grading = {
      expectations: [{ id: 1, text: 'x', passed: true, evidence: 'y' }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    };
    persistGradingOutcome(base, grading, 'unused');

    assert.equal(fs.existsSync(`${base}.grading.json`), true, 'grading.json must be written');
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), false, 'stale grading.raw.txt must not survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- extractExecutorModel tests ----------

test('extracts model from the stream-json init event', () => {
  const trace = [
    '{"type":"system","subtype":"init","model":"claude-sonnet-4-6-20250514","session_id":"abc"}',
    '{"type":"assistant","message":{"id":"msg_1","content":[{"type":"text","text":"Hi"}]}}',
    '{"type":"result","subtype":"success","result":"Hi"}',
  ].join('\n');

  assert.equal(extractExecutorModel(trace), 'claude-sonnet-4-6-20250514');
});

test('returns null when the trace has no init event', () => {
  const trace = [
    '{"type":"assistant","message":{"id":"msg_1","content":[]}}',
    '{"type":"result","subtype":"success","result":"done"}',
  ].join('\n');

  assert.equal(extractExecutorModel(trace), null);
});

test('returns null when the init event has no model field', () => {
  const trace = '{"type":"system","subtype":"init","session_id":"abc"}\n';

  assert.equal(extractExecutorModel(trace), null);
});

test('tolerates non-JSON lines in the trace', () => {
  const trace = [
    'not json',
    '{"type":"system","subtype":"init","model":"claude-opus-4-6","session_id":"abc"}',
  ].join('\n');

  assert.equal(extractExecutorModel(trace), 'claude-opus-4-6');
});

// ---------- persistGradingOutcome run identity tests ----------

test('accepted grading includes run metadata when provided', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-run-meta-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    const grading = {
      expectations: [{ id: 1, text: 'x', passed: true, evidence: 'y' }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    };
    const runMeta = {
      executor_model: 'claude-sonnet-4-6-20250514',
      grader_model: 'unknown',
      timestamp: '2026-09-21T00:00:00.000Z',
    };

    persistGradingOutcome(base, grading, 'unused', runMeta);

    const written = JSON.parse(fs.readFileSync(`${base}.grading.json`, 'utf8'));
    assert.deepEqual(written.run, runMeta);
    assert.deepEqual(written.expectations, grading.expectations);
    assert.deepEqual(written.summary, grading.summary);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('accepted grading omits run key when no metadata is provided', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-no-meta-'));
  try {
    const base = path.join(dir, 'my-skill.eval-1');
    const grading = {
      expectations: [{ id: 1, text: 'x', passed: true, evidence: 'y' }],
      summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
    };

    persistGradingOutcome(base, grading, 'unused');

    const written = JSON.parse(fs.readFileSync(`${base}.grading.json`, 'utf8'));
    assert.equal('run' in written, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('materializes a git baseline and applies a working-tree patch', () => {
  const workspace = materializeWorkspace({ files: ['git-workflow-and-versioning'] });
  try {
    const status = spawnSync('git', ['status', '--short'], { cwd: workspace, encoding: 'utf8' });
    const commits = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: workspace, encoding: 'utf8' });

    assert.equal(status.status, 0, status.stdout + status.stderr);
    assert.match(status.stdout, / M git-workflow-and-versioning\/app\.js/);
    assert.equal(commits.stdout.trim(), '1');
    assert.equal(fs.existsSync(path.join(workspace, '.eval')), false);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});


// The real CLI, with only the paid Claude subprocess replaced. Works without
// a shell shim on Windows as well as Unix; git and filesystem operations stay real.
function recordedSandbox(t, kind = 'dialogue') {
  const root = makeSandbox();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets.');
  fs.mkdirSync(path.join(root, 'skills/alpha-skill/references'));
  fs.writeFileSync(path.join(root, 'skills/alpha-skill/references/guide.md'), 'reference not staged');
  const rubric = completeCase('alpha-skill', 'change alpha widget');
  rubric.evals = [{ ...behavioralEval(kind === 'dialogue' ? [] : ['project/context.txt']), kind }];
  const caseFile = path.join(root, 'evals', 'cases', 'alpha-skill.json');
  writeJson(caseFile, rubric);
  const stub = path.join(root, 'claude-stub.cjs');
  fs.writeFileSync(stub, `
const fs = require('node:fs');
const cp = require('node:child_process');
const original = cp.execFileSync;
cp.execFileSync = (command, args, options) => {
  if (command !== 'claude') return original(command, args, options);
  fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({args, input: options?.input}) + '\\n');
  if (args.includes('--version')) return '2.1.test\\n';
  if (args.includes('stream-json')) return '{"type":"system","subtype":"init","model":"observed-model"}\\n{"type":"result","result":"original evidence"}\\n';
  if (process.env.GRADER_THROWS) throw new Error('grader unavailable');
  return process.env.GRADER_RAW || '{"expectations":[{"id":1,"text":"paraphrase","passed":true,"evidence":"original evidence"}],"summary":{"passed":1,"failed":0,"total":1,"pass_rate":1}}';
};
`);
  const log = path.join(root, 'calls.jsonl');
  return {
    root, rubric, caseFile,
    run: (args, env = {}) => spawnSync(process.execPath, ['--require', stub, path.join(root, 'scripts/run-evals.js'), ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CALL_LOG: log, ...env },
    }),
    calls: () => fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [],
    records: () => fs.readdirSync(path.join(root, 'evals/results')).filter(n => n.endsWith('.record.json')).map(n => path.join(root, 'evals/results', n)),
  };
}

for (const kind of ['dialogue', 'execution']) {
  test(`records and regrades the same ${kind} evidence without another executor`, t => {
    const s = recordedSandbox(t, kind);
    const first = s.run(['--behavioral', 'alpha-skill', '--record', '--model', 'requested-model']);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.equal(s.records().length, 1);
    const file = s.records()[0];
    const original = fs.readFileSync(file, 'utf8');
    const record = JSON.parse(original);
    assert.equal(record.evidence.run.executor_model, 'observed-model');
    assert.equal(record.evidence.run.requested_model, 'requested-model');
    assert.equal(record.evidence.run.claude_version, '2.1.test');
    assert.deepEqual(record.evidence.references, { status: 'not-staged', files: [] });
    const latest = fs.readFileSync(path.join(s.root, 'evals/results/alpha-skill.eval-1.grading.json'), 'utf8');
    s.rubric.evals[0].expectations = ['Revised expectation'];
    writeJson(s.caseFile, s.rubric);
    // Replay must not read today's skill or fixture tree.
    fs.rmSync(path.join(s.root, 'skills'), { recursive: true });
    fs.rmSync(path.join(s.root, 'evals/fixtures'), { recursive: true });
    const replay = s.run(['--regrade', file, '--rubric', s.caseFile, '--model', 'new-grader']);
    assert.equal(replay.status, 0, replay.stdout + replay.stderr);
    assert.match(replay.stdout, /historical/i);
    assert.match(replay.stdout, /not staged/i);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(fs.readFileSync(path.join(s.root, 'evals/results/alpha-skill.eval-1.grading.json'), 'utf8'), latest);
    const calls = s.calls().filter(c => !c.args.includes('--version'));
    assert.equal(calls.length, 3);
    assert.equal(calls.filter(c => c.args.includes('stream-json')).length, 1);
    assert.match(calls[2].input, /Revised expectation/);
    assert.match(calls[2].input, /original evidence/);
    assert.equal(calls[2].args.at(-1), 'new-grader');
    const attempts = fs.readdirSync(path.dirname(file)).filter(n => n.includes('.attempt-'));
    assert.equal(attempts.length, 2);
    const grades = attempts.map(n => JSON.parse(fs.readFileSync(path.join(path.dirname(file), n), 'utf8')));
    assert.ok(grades.some(g => g.historical === true && g.grading.expectations[0].text === 'Revised expectation'));
  });
}


function recordOnce(s, env) {
  const result = s.run(['--behavioral', 'alpha-skill', '--record'], env);
  return { result, file: s.records()[0] };
}

for (const passed of [true, false]) {
  for (const evidence of ['', ' \t\r\n', '\u00a0\u2003']) {
    test(`record and regrade retain blank evidence diagnostics for ${passed ? 'passing' : 'failing'} verdict ${JSON.stringify(evidence)}`, t => {
      const s = recordedSandbox(t);
      const raw = JSON.stringify({
        expectations: [{ id: 1, text: 'check the result', passed, evidence }],
        summary: { passed: Number(passed), failed: Number(!passed), total: 1, pass_rate: Number(passed) },
      });
      const { result, file } = recordOnce(s, { GRADER_RAW: raw });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /grader returned blank evidence/);
      assert.doesNotMatch(result.stdout + result.stderr, /invalid JSON/);
      const original = fs.readFileSync(file, 'utf8');
      const base = path.join(s.root, 'evals/results/alpha-skill.eval-1');
      assert.equal(fs.existsSync(`${base}.grading.json`), false);
      assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), raw);

      const replay = s.run(['--regrade', file, '--rubric', s.caseFile], { GRADER_RAW: raw });
      assert.equal(replay.status, 1, replay.stdout + replay.stderr);
      assert.match(replay.stderr, /grader returned blank evidence/);
      assert.doesNotMatch(replay.stderr, /invalid JSON/);
      const attempts = fs.readdirSync(path.dirname(file)).filter(n => n.includes('.attempt-'));
      assert.equal(attempts.length, 2);
      for (const name of attempts) {
        const attempt = JSON.parse(fs.readFileSync(path.join(path.dirname(file), name), 'utf8'));
        assert.equal(attempt.status, 'invalid');
        assert.equal(attempt.gradingError, 'grader returned blank evidence');
        assert.equal(attempt.raw, raw);
        assert.equal(attempt.grading, null);
      }

      const retry = s.run(['--regrade', file, '--rubric', s.caseFile]);
      assert.equal(retry.status, 0, retry.stdout + retry.stderr);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
      assert.equal(fs.existsSync(`${base}.grading.json`), false);
      assert.equal(fs.readFileSync(`${base}.grading.raw.txt`, 'utf8'), raw);
      const calls = s.calls().filter(c => !c.args.includes('--version'));
      assert.equal(calls.filter(c => c.args.includes('stream-json')).length, 1);
      for (const call of calls.filter(c => !c.args.includes('stream-json'))) {
        assert.match(call.input, /provide non-blank evidence/);
      }
    });
  }
}

test('rejects altered evidence before any Claude invocation', t => {
  const s = recordedSandbox(t);
  const { file } = recordOnce(s);
  const original = JSON.parse(fs.readFileSync(file, 'utf8'));
  const calls = s.calls().length;
  for (const field of ['trace', 'skill_text', 'eval', 'references', 'run']) {
    const changed = structuredClone(original);
    changed.evidence[field] = 'altered';
    writeJson(file, changed);
    const result = s.run(['--regrade', file, '--rubric', s.caseFile]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /integrity/);
    assert.equal(s.calls().length, calls);
  }
});

test('rejects a changed task, mismatched rubric, or invalid expectations before model calls', t => {
  const s = recordedSandbox(t);
  const { file } = recordOnce(s);
  const calls = s.calls().length;
  const changes = [
    r => { r.evals[0].prompt = 'different task'; },
    r => { r.evals[0].kind = 'execution'; },
    r => { r.evals[0].files = ['different/input']; },
    r => { r.skill_name = 'another-skill'; },
    r => { r.evals[0].id = 9; },
    r => { r.evals.push(structuredClone(r.evals[0])); },
    r => { r.evals[0].expectations = []; },
    r => { r.evals[0].expectations = [null]; },
  ];
  for (const change of changes) {
    const rubric = structuredClone(s.rubric);
    change(rubric);
    writeJson(s.caseFile, rubric);
    const result = s.run(['--regrade', file, '--rubric', s.caseFile]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(s.calls().length, calls);
  }
});

for (const [env, status] of [[{ GRADER_RAW: 'invalid response' }, 'invalid'], [{ GRADER_THROWS: '1' }, 'error']]) {
  test(`keeps the generation and ${status} attempt when the grader fails`, t => {
    const s = recordedSandbox(t);
    const { result, file } = recordOnce(s, env);
    assert.equal(result.status, 1);
    assert.ok(file);
    const original = fs.readFileSync(file, 'utf8');
    const attemptFile = fs.readdirSync(path.dirname(file)).find(n => n.includes('.attempt-'));
    const attempt = JSON.parse(fs.readFileSync(path.join(path.dirname(file), attemptFile), 'utf8'));
    assert.equal(attempt.status, status);
    if (status === 'invalid') assert.equal(attempt.raw, 'invalid response');
    else assert.match(attempt.error, /grader unavailable/);
    const replay = s.run(['--regrade', file, '--rubric', s.caseFile]);
    assert.equal(replay.status, 0, replay.stdout + replay.stderr);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(s.calls().filter(c => c.args.includes('stream-json')).length, 1);
  });
}

test('record dry-run and replay dry-run make no Claude calls or output changes', t => {
  const s = recordedSandbox(t);
  assert.equal(s.run(['--behavioral', 'alpha-skill', '--record', '--dry-run']).status, 0);
  assert.equal(s.calls().length, 0);
  assert.equal(fs.existsSync(path.join(s.root, 'evals/results')), false);
  const { file } = recordOnce(s);
  const calls = s.calls().length;
  const files = fs.readdirSync(path.dirname(file));
  assert.equal(s.run(['--regrade', file, '--rubric', s.caseFile, '--dry-run']).status, 0);
  assert.equal(s.calls().length, calls);
  assert.deepEqual(fs.readdirSync(path.dirname(file)), files);
});

test('ordinary runs retain their output shape and do not record or query CLI version', t => {
  const s = recordedSandbox(t);
  assert.equal(s.run(['--behavioral', 'alpha-skill']).status, 0);
  const files = fs.readdirSync(path.join(s.root, 'evals/results'));
  assert.deepEqual(files, ['alpha-skill.eval-1.grading.json']);
  assert.equal(s.calls().length, 2);
});

test('separate generations and repeated regrades preserve every record and attempt', t => {
  const s = recordedSandbox(t);
  const first = recordOnce(s).file;
  const original = fs.readFileSync(first, 'utf8');
  recordOnce(s);
  assert.equal(s.records().length, 2);
  for (let i = 0; i < 2; i++) assert.equal(s.run(['--regrade', first, '--rubric', s.caseFile]).status, 0);
  assert.equal(fs.readFileSync(first, 'utf8'), original);
  assert.equal(fs.readdirSync(path.dirname(first)).filter(n => n.includes('.attempt-')).length, 4);
});

test('rejects incomplete and incompatible record/replay CLI options', t => {
  const s = recordedSandbox(t);
  for (const args of [
    ['--record'], ['--model'], ['--model', '--record'], ['--regrade'],
    ['--regrade', 'missing'], ['--rubric', 'missing'],
    ['--regrade', 'missing', '--rubric', 'missing', '--behavioral', 'alpha-skill'],
    ['--regrade', 'missing', '--rubric', 'missing', '--record'],
    ['--regrade', 'missing', '--rubric', 'missing', '--min-rank1', '95'],
  ]) {
    assert.equal(s.run(args).status, 1, args.join(' '));
    assert.equal(s.calls().length, 0);
  }
});


test('a failing historical grade stays a failure and retains its attempt', t => {
  const s = recordedSandbox(t);
  const { file } = recordOnce(s);
  const raw = JSON.stringify({ expectations: [{ id: 1, text: 'x', passed: false, evidence: 'not observed' }],
    summary: { passed: 0, failed: 1, total: 1, pass_rate: 0 } });
  const result = s.run(['--regrade', file, '--rubric', s.caseFile], { GRADER_RAW: raw });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /0\/1 expectations passed/);
  const attempts = fs.readdirSync(path.dirname(file)).filter(n => n.includes('.attempt-'));
  assert.equal(attempts.length, 2);
});

test('rejects unknown record versions and malformed JSON without calling Claude', t => {
  const s = recordedSandbox(t);
  const { file } = recordOnce(s);
  const calls = s.calls().length;
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  record.version = 99;
  writeJson(file, record);
  assert.equal(s.run(['--regrade', file, '--rubric', s.caseFile]).status, 1);
  fs.writeFileSync(file, '{broken json');
  assert.equal(s.run(['--regrade', file, '--rubric', s.caseFile]).status, 1);
  assert.equal(s.calls().length, calls);
});

test('record mode rejects duplicate behavioral IDs before any Claude invocation or output changes', t => {
  const s = recordedSandbox(t);
  s.rubric.evals.push({ ...s.rubric.evals[0], prompt: 'A different evaluation' });
  writeJson(s.caseFile, s.rubric);
  for (const flags of [[], ['--dry-run']]) {
    const result = s.run(['--behavioral', 'alpha-skill', '--record', ...flags]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /duplicate behavioral eval id=1/);
    assert.equal(s.calls().length, 0);
    assert.equal(fs.existsSync(path.join(s.root, 'evals/results')), false);
  }
});

test('fixture baseline commits ignore inherited user signing requirements', () => {
  const root = makeSandbox();
  const config = path.join(root, 'global.gitconfig');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-signing-test-'));
  try {
    fs.writeFileSync(config, '[commit]\n\tgpgsign = true\n[gpg]\n\tprogram = definitely-missing-eval-signer\n');
    const result = spawnSync(process.execPath, ['-e', `
      const fs = require('node:fs');
      const { materializeWorkspace } = require(${JSON.stringify(path.join(root, 'scripts', 'run-evals.js'))});
      let workspace;
      try { workspace = materializeWorkspace({ files: ['project/context.txt'] }); }
      finally { if (workspace) fs.rmSync(workspace, { recursive: true, force: true }); }
    `], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: config, TMPDIR: temp, TMP: temp, TEMP: temp } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('rejects duplicate behavioral IDs before they can overwrite a grading slot', () => {
  const root = makeSandbox();
  try {
    writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
    const evalCase = completeCase('alpha-skill', 'change alpha widget');
    evalCase.evals.push({ ...behavioralEval(), prompt: 'A different evaluation' });
    writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /duplicate behavioral eval id=1/);
    const dryRun = run(root, ['--behavioral', 'alpha-skill', '--dry-run']);
    assert.equal(dryRun.status, 1, dryRun.stdout + dryRun.stderr);
    assert.match(dryRun.stderr, /duplicate behavioral eval id=1/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('accepts distinct behavioral IDs including zero', () => {
  const root = makeSandbox();
  try {
    writeSkill(root, 'alpha-skill', 'Handles alpha widgets. Use when changing alpha widgets.');
    const evalCase = completeCase('alpha-skill', 'change alpha widget');
    evalCase.evals.push({ ...behavioralEval(), id: 0 });
    writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('removes the throwaway workspace when fixture setup fails', () => {
  const root = makeSandbox();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-cleanup-test-'));
  try {
    const result = spawnSync(process.execPath, ['-e', `
      const { materializeWorkspace } = require(${JSON.stringify(path.join(root, 'scripts', 'run-evals.js'))});
      try { materializeWorkspace({ files: ['project/context.txt', 'missing.txt'] }); }
      catch (error) { console.error(error.message); }
    `], { cwd: root, encoding: 'utf8', env: { ...process.env, TMPDIR: temp, TMP: temp, TEMP: temp } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /fixture listed in files\[\] not found/);
    assert.deepEqual(fs.readdirSync(temp), [], 'partially copied fixture data must be removed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});


test('loads quoted YAML skill identities using their decoded values', () => {
  const root = makeSandbox();
  try {
    writeSkill(root, 'alpha', 'code unit tests');
    const skill = path.join(root, 'skills', 'alpha', 'SKILL.md');
    fs.writeFileSync(skill, fs.readFileSync(skill, 'utf8').replace('name: alpha', "name: 'alpha'")
      .replace('description: code unit tests', 'description: "code unit tests"'));
    writeJson(path.join(root, 'evals', 'cases', 'alpha.json'), completeCase('alpha', 'code unit tests'));
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /PASSED/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
