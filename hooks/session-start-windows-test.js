const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const hooksConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'hooks.json'), 'utf8'),
);
const sessionStartHook = hooksConfig.hooks.SessionStart[0].hooks.find(
  (hook) => hook.type === 'command',
);

test('SessionStart declares a native Windows PowerShell command', () => {
  assert.ok(sessionStartHook, 'SessionStart command hook is missing');
  assert.match(sessionStartHook.commandWindows, /powershell\.exe/i);
  assert.match(sessionStartHook.commandWindows, /session-start\.ps1/i);
  assert.doesNotMatch(sessionStartHook.commandWindows, /\b(?:bash|jq)\b/i);
});

function runWindowsHook({ includeMetaSkill }) {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'agent skills session hook '),
  );

  try {
    const fixtureHooks = path.join(fixtureRoot, 'hooks');
    fs.mkdirSync(fixtureHooks, { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, 'session-start.ps1'),
      path.join(fixtureHooks, 'session-start.ps1'),
    );

    if (includeMetaSkill) {
      const fixtureMetaSkill = path.join(
        fixtureRoot,
        'skills',
        'using-agent-skills',
        'SKILL.md',
      );
      fs.mkdirSync(path.dirname(fixtureMetaSkill), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, 'skills', 'using-agent-skills', 'SKILL.md'),
        fixtureMetaSkill,
      );
    }

    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', sessionStartHook.commandWindows],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: fixtureRoot,
          CLAUDE_PROJECT_DIR: fixtureRoot,
        },
        input: '{}',
      },
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test(
  'Windows SessionStart injects the meta-skill from a path containing spaces',
  { skip: process.platform !== 'win32' },
  () => {
    const payload = JSON.parse(runWindowsHook({ includeMetaSkill: true }));
    const output = payload.hookSpecificOutput;

    assert.equal(output.hookEventName, 'SessionStart');
    assert.match(output.additionalContext, /agent-skills loaded\./);
    assert.match(output.additionalContext, /# Using Agent Skills/);
    assert.match(output.additionalContext, /────────/);
  },
);

test(
  'Windows SessionStart exits cleanly when the meta-skill is missing',
  { skip: process.platform !== 'win32' },
  () => {
    const payload = JSON.parse(runWindowsHook({ includeMetaSkill: false }));
    const output = payload.hookSpecificOutput;

    assert.equal(output.hookEventName, 'SessionStart');
    assert.match(output.additionalContext, /meta-skill not found/);
  },
);
