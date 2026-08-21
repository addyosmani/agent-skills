import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import factory from "../hooks/pre/session-start.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("exports a default factory function", () => {
  assert.equal(typeof factory, "function");
});

test("registers session_start and injects the meta-skill on nextTurn", async () => {
  const sent = [];
  const handlers = {};
  factory({
    on(event, handler) {
      handlers[event] = handler;
    },
    sendMessage(msg, opts) {
      sent.push({ msg, opts });
    },
  });

  assert.equal(typeof handlers.session_start, "function");
  await handlers.session_start();

  assert.equal(sent.length, 1);
  assert.equal(sent[0].opts.deliverAs, "nextTurn");
  assert.equal(sent[0].msg.display, false);
  assert.equal(sent[0].msg.customType, "agent-skills.meta");
  assert.match(sent[0].msg.content, /agent-skills loaded\./);
  assert.match(sent[0].msg.content, /# Using Agent Skills/);
});

test("resolves SKILL.md from the plugin root regardless of symlink cwd", () => {
  const skillPath = path.join(
    __dirname,
    "..",
    "skills",
    "using-agent-skills",
    "SKILL.md",
  );
  assert.equal(path.basename(skillPath), "SKILL.md");
  assert.ok(fs.existsSync(skillPath), `missing ${skillPath}`);
});
