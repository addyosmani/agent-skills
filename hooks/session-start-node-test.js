// Tests for the Node SessionStart hook (#488).
//
// The hook used to be a bash one-liner in hooks.json calling a bash+jq script.
// On Windows, Claude Code runs hook commands through Git Bash or — when that is
// absent — PowerShell, where `[ -f "$SCRIPT" ]` is a parse error, so the hook
// failed on every session start. These pin the two properties that fix depends
// on: the config no longer goes through a shell, and the payload is unchanged.

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { readFileSync, mkdtempSync, mkdirSync, copyFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const REPO = resolve(__dirname, "..");
const HOOK = join(REPO, "hooks", "session-start.mjs");

function runHook(cwd = REPO, env = {}) {
  return execFileSync(process.execPath, [HOOK], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("emits the SessionStart envelope with the meta-skill body", () => {
  const payload = JSON.parse(runHook());
  assert.equal(payload.hookSpecificOutput.hookEventName, "SessionStart");
  const context = payload.hookSpecificOutput.additionalContext;
  assert.ok(context.includes("agent-skills loaded."), "missing startup preface");
  assert.ok(context.includes("# Using Agent Skills"), "missing meta-skill content");
});

test("payload is byte-identical to the bash hook it replaces", (t) => {
  // The point of #488 is a platform fix, not a behaviour change. Skipped where
  // bash or jq is unavailable — which is exactly the environment that made the
  // old hook unusable.
  const probe = spawnSync("bash", ["-c", "command -v jq"], { encoding: "utf8" });
  if (probe.status !== 0) {
    t.skip("bash or jq unavailable");
    return;
  }
  const fromBash = execFileSync("bash", [join(REPO, "hooks", "session-start.sh")], {
    cwd: REPO,
    encoding: "utf8",
  });
  assert.equal(runHook(), fromBash);
});

test("reports a notice, not a failure, when the meta-skill is absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-skills-hook-"));
  mkdirSync(join(dir, "hooks"));
  copyFileSync(HOOK, join(dir, "hooks", "session-start.mjs"));

  const result = spawnSync(process.execPath, [join(dir, "hooks", "session-start.mjs")], {
    cwd: dir,
    encoding: "utf8",
    env: (({ CLAUDE_PLUGIN_ROOT, CLAUDE_PROJECT_DIR, ...rest }) => rest)(process.env),
  });

  assert.equal(result.status, 0, "a missing meta-skill must not fail the session");
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.hookSpecificOutput.hookEventName, "SessionStart");
  assert.ok(payload.hookSpecificOutput.additionalContext.includes("not found"));
});

test("hooks.json uses exec form so no shell parses the command", () => {
  // This is the fix. In shell form the command string reaches PowerShell on a
  // Windows box without Git Bash; with `args` present, Claude Code performs no
  // shell tokenization on any platform.
  const config = JSON.parse(readFileSync(join(REPO, "hooks", "hooks.json"), "utf8"));
  const [entry] = config.hooks.SessionStart[0].hooks;

  assert.equal(entry.command, "node");
  assert.ok(Array.isArray(entry.args), "exec form requires args");
  assert.equal(entry.args.length, 1);
  assert.match(entry.args[0], /session-start\.mjs$/);
  assert.ok(
    entry.args[0].includes("${CLAUDE_PLUGIN_ROOT}"),
    "the script path must stay anchored to the plugin root"
  );
  assert.ok(
    !/[;&|]/.test(entry.command),
    "the command must not carry shell operators"
  );
});
