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

function runBehavioralWithGrading(root, raw, options = {}) {
  writeSkill(root, 'alpha-skill', 'Handles alpha widgets.');
  const evalCase = completeCase('alpha-skill', 'change alpha widget');
  evalCase.evals = (options.ids || [1]).map((id) => ({ ...behavioralEval([]), id, kind: 'dialogue' }));
  writeJson(path.join(root, 'evals', 'cases', 'alpha-skill.json'), evalCase);
  const stub = path.join(root, 'stub-claude.cjs');
  fs.writeFileSync(stub, `
    const assert = require('node:assert/strict');
    require('child_process').execFileSync = (command, args) => {
      assert.equal(command, 'claude');
      const executor = args.includes('--output-format');
      require('node:fs').appendFileSync(${JSON.stringify(path.join(root, 'claude-calls.txt'))}, executor ? 'executor\\n' : 'grader\\n');
      if (executor && ${JSON.stringify(Boolean(options.error))}) throw Object.assign(new Error('executor failed'), ${JSON.stringify(options.error || {})});
      return executor ? ${JSON.stringify(options.trace ?? '{"type":"result","subtype":"success","is_error":false,"result":"done"}\n')} : ${JSON.stringify(raw)};
    };
  `);
  return spawnSync(process.execPath, [
    '--require', stub, path.join(root, 'scripts', 'run-evals.js'),
    '--behavioral', 'alpha-skill',
  ], { cwd: root, encoding: 'utf8' });
}

const passingGrading = JSON.stringify({
  expectations: [{ id: 1, text: 'check', passed: true, evidence: 'observed' }],
  summary: { passed: 1, failed: 0, total: 1, pass_rate: 1 },
});
const terminal = { type: 'result', subtype: 'success', is_error: false };
const call = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', id: 'test', input: {} }] } };
const returned = (id, is_error = false) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error }] } });
const traceOf = (...events) => events.map((event) => JSON.stringify(event)).join('\n') + '\n';

for (const [name, trace] of Object.entries({
  'terminal error': traceOf({ type: 'result', subtype: 'error_max_turns', is_error: true }),
  'missing terminal': traceOf(call),
  'implicit success': traceOf({ type: 'result', subtype: 'success' }),
  'stale terminal': traceOf(terminal, call),
  'permission denial': traceOf({ ...terminal, permission_denials: [{ tool_name: 'Read' }] }),
  'pending tool': traceOf(call, terminal),
  'unmatched return': traceOf(returned('unknown'), terminal),
  'malformed event': 'null\n',
  'invalid JSON': 'not JSON\n',
  'null assistant message': traceOf({ type: 'assistant', message: null }, terminal),
  'array assistant message': traceOf({ type: 'assistant', message: [] }, terminal),
  'null assistant content': traceOf({ type: 'assistant', message: { content: null } }, terminal),
  'object assistant content': traceOf({ type: 'assistant', message: { content: { type: 'tool_use', id: 'hidden' } } }, terminal),
  'null user message': traceOf({ type: 'user', message: null }, terminal),
  'null content block': traceOf({ type: 'assistant', message: { content: [null] } }, terminal),
})) {
  test(`does not grade an incomplete execution: ${name}`, () => {
    const root = makeSandbox();
    try {
      const result = runBehavioralWithGrading(root, passingGrading, { trace });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /execution incomplete/);
      const base = path.join(root, 'evals/results/alpha-skill.eval-1');
      assert.equal(fs.existsSync(`${base}.grading.json`), false);
      assert.equal(fs.readFileSync(`${base}.execution.raw.txt`, 'utf8'), trace);
      assert.equal(fs.readFileSync(path.join(root, 'claude-calls.txt'), 'utf8'), 'executor\n');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}

test('a returned failed probe can recover before successful completion', () => {
  const root = makeSandbox();
  try {
    const next = { ...call, message: { content: [{ ...call.message.content[0], id: 'green' }] } };
    const trace = traceOf(call, returned('test', true),
      { type: 'user', message: { content: 'Continue the repair.' } }, next, returned('green'), terminal,
      { type: 'system', subtype: 'status', status: 'idle' });
    const result = runBehavioralWithGrading(root, passingGrading, { trace });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(fs.existsSync(path.join(root, 'evals/results/alpha-skill.eval-1.grading.json')), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

for (const code of ['ETIMEDOUT', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER']) {
  test(`retains partial execution evidence and continues after ${code}`, () => {
    const root = makeSandbox();
    try {
      const trace = traceOf(call);
      const result = runBehavioralWithGrading(root, passingGrading,
        { error: { code, stdout: trace, stderr: 'captured diagnostic' }, ids: [1, 2] });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /eval 2: executing/);
      for (const id of [1, 2]) {
        const base = path.join(root, `evals/results/alpha-skill.eval-${id}`);
        assert.equal(fs.existsSync(`${base}.grading.json`), false);
        assert.equal(fs.readFileSync(`${base}.execution.raw.txt`, 'utf8'), trace);
        assert.match(fs.readFileSync(`${base}.execution.error.txt`, 'utf8'), new RegExp(code));
        assert.match(fs.readFileSync(`${base}.execution.error.txt`, 'utf8'), /captured diagnostic/);
      }
      assert.equal(fs.readFileSync(path.join(root, 'claude-calls.txt'), 'utf8'), 'executor\nexecutor\n');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
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

test('routes clipped prompt forms to their long-form skill (see #660)', () => {
  const root = makeSandbox();
  // Note: the skill name must not contain the clipped form itself — name
  // tokens are weighted 2x, which would route the prompt even without the
  // alias map. The prompt shares no vocabulary with the description except
  // the clipped/long pair (auth/authentication): without the alias map the
  // skill scores zero and the positive prompt fails.
  writeSkill(
    root,
    'credential-skill',
    'Protects credential verification. Use when configuring authentication ceremonies.',
  );
  writeSkill(root, 'paint-skill', 'Paints sheds. Use when choosing exterior paint colors.');
  writeJson(
    path.join(root, 'evals', 'cases', 'credential-skill.json'),
    completeCase('credential-skill', 'fix broken auth checks', 1),
  );
  writeJson(
    path.join(root, 'evals', 'cases', 'paint-skill.json'),
    completeCase('paint-skill', 'choose exterior paint colors', 1),
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('folds -ifications to their -ify verb, not to the unrelated "specific" (see #660)', () => {
  const root = makeSandbox();
  // "specification" is a nominalization of "specify", so it must reach the
  // spec skill. Stripping a bare "-ation" instead yields "specific", which
  // silently cross-merges the two words and starves the spec skill. Each
  // prompt shares vocabulary with its own skill only.
  writeSkill(root, 'spec-skill', 'Agree on requirements up front. Use when you specify behaviour.');
  writeSkill(root, 'specific-skill', 'Narrow a choice down. Use when one target matters.');
  writeJson(
    path.join(root, 'evals', 'cases', 'spec-skill.json'),
    completeCase('spec-skill', 'document a specification for the billing rollout', 1),
  );
  writeJson(
    path.join(root, 'evals', 'cases', 'specific-skill.json'),
    completeCase('specific-skill', 'narrow the choice down to one target', 1),
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('strips -ations as well as -ation so plurals do not out-stem singulars (see #660)', () => {
  const root = makeSandbox();
  // "migration" and "migrations" are the same word, so both forms have to
  // reach the migration skill. With only "-ation" in the suffix list the
  // plural keeps its "-s" ("migration" -> "migr" vs "migrations" ->
  // "migration"), which splits the pair and halves the score. Neither
  // prompt shares vocabulary with the other skill.
  writeSkill(root, 'migration-skill', 'Move old data stores off production without downtime.');
  writeSkill(root, 'recipe-skill', 'Plan tonight dinner from what is already in the cupboard.');
  writeJson(
    path.join(root, 'evals', 'cases', 'migration-skill.json'),
    completeCase('migration-skill', 'plan the database migrations', 1),
  );
  writeJson(
    path.join(root, 'evals', 'cases', 'recipe-skill.json'),
    completeCase('recipe-skill', 'plan tonight dinner from the cupboard', 1),
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
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
    fs.writeFileSync(`${base}.execution.raw.txt`, 'previous partial trace');
    fs.writeFileSync(`${base}.execution.error.txt`, 'previous execution failure');

    clearGradingSlot(base);

    // Executor or grader crashes — persistGradingOutcome is never called

    assert.equal(fs.existsSync(`${base}.grading.json`), false, 'stale grading.json must not survive a crash');
    assert.equal(fs.existsSync(`${base}.grading.raw.txt`), false, 'stale grading.raw.txt must not survive a crash');
    assert.equal(fs.existsSync(`${base}.execution.raw.txt`), false, 'old partial trace must not survive a new attempt');
    assert.equal(fs.existsSync(`${base}.execution.error.txt`), false, 'old execution failure must not survive a new attempt');
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
