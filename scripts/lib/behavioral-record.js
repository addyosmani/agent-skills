'use strict';

const fs = require('fs');
const { createHash, randomUUID } = require('crypto');
const { isDeepStrictEqual } = require('util');
const { execFileSync } = require('child_process');

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function writeJson(file, value) {
  // Never overwrite evidence or another attempt, even in concurrent runs.
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

function claudeVersion() {
  try {
    return execFileSync('claude', ['--version'], { encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

function saveRecord(base, evidence) {
  const file = `${base}.${randomUUID()}.record.json`;
  const record = { version: 1, sha256: digest(evidence), evidence };
  writeJson(file, record);
  return { file, record };
}

function validateEval(ev) {
  if (!ev || !Number.isInteger(ev.id) || typeof ev.prompt !== 'string' ||
      typeof ev.expected_output !== 'string' ||
      !['execution', 'dialogue'].includes(ev.kind || 'execution') ||
      (ev.files !== undefined && (!Array.isArray(ev.files) || ev.files.some(f => typeof f !== 'string'))) ||
      !Array.isArray(ev.expectations) || !ev.expectations.length ||
      ev.expectations.some(e => typeof e !== 'string' || !e.trim())) {
    throw new Error('Invalid behavioral eval in record or rubric');
  }
}

function task(ev) {
  const { expectations, expected_output, ...rest } = ev;
  return { ...rest, kind: ev.kind || 'execution', files: ev.files || [] };
}

function loadReplay(file, rubricFile) {
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (record.version !== 1) throw new Error('Unsupported behavioral record version');
  const evidence = record.evidence;
  if (!evidence || digest(evidence) !== record.sha256) throw new Error('Record integrity check failed');
  validateEval(evidence.eval);
  // #584 must update this check alongside the record writer when references are staged.
  if (typeof evidence.trace !== 'string' || typeof evidence.skill_text !== 'string' ||
      typeof evidence.skill_name !== 'string' || !evidence.run ||
      evidence.references?.status !== 'not-staged' ||
      !Array.isArray(evidence.references.files) || evidence.references.files.length !== 0) {
    throw new Error('Invalid behavioral record evidence');
  }
  const rubric = JSON.parse(fs.readFileSync(rubricFile, 'utf8'));
  const matches = Array.isArray(rubric.evals) ? rubric.evals.filter(e => e?.id === evidence.eval.id) : [];
  if (rubric.skill_name !== evidence.skill_name || matches.length !== 1) {
    throw new Error('Rubric must contain the recorded skill and exactly one matching eval ID');
  }
  const ev = matches[0];
  validateEval(ev);
  if (!isDeepStrictEqual(task(ev), task(evidence.eval))) {
    throw new Error('Regrade cannot change the recorded task; only expectations and expected_output may change');
  }
  return { record, ev };
}

function gradeRecorded(file, record, ev, model, historical, grade) {
  const attempt = {
    record_sha256: record.sha256,
    historical,
    rubric: ev,
    requested_model: model || null,
    grader_model: 'unknown',
    claude_version: claudeVersion(),
    timestamp: new Date().toISOString(),
  };
  let outcome;
  try {
    outcome = grade(record.evidence.trace, ev, model);
    Object.assign(attempt, { status: outcome.grading ? 'graded' : 'invalid', ...outcome });
  } catch (error) {
    attempt.status = 'error';
    attempt.error = error.message;
    if (error.stdout) attempt.raw = String(error.stdout);
    throw error;
  } finally {
    writeJson(`${file}.attempt-${randomUUID()}.json`, attempt);
  }
  return outcome;
}

function runRegrade(file, rubricFile, { dryRun, model }, grade) {
  const { record, ev } = loadReplay(file, rubricFile);
  console.log(`Historical regrade: ${record.evidence.skill_name} eval ${ev.id}; no executor run.`);
  console.log('Reference files were not staged by the original harness. This is not a fresh skill test.');
  if (dryRun) return 0;
  const { grading, gradingError } = gradeRecorded(file, record, ev, model, true, grade);
  if (!grading) {
    console.error(`${gradingError}; raw output saved in the grading attempt.`);
    return 1;
  }
  console.log(`${grading.summary.passed}/${grading.summary.total} expectations passed; attempt saved beside ${file}`);
  return grading.summary.failed ? 1 : 0;
}

module.exports = { saveRecord, gradeRecorded, runRegrade, claudeVersion, validateEval };
