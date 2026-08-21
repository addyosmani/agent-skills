import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import si, { filterContent } from "./simplify-ignore.js";

test("exports a default factory function", () => {
  assert.equal(typeof si, "function");
});

test("single-line block produces exactly one placeholder", () => {
  const src = [
    "const a = 1;",
    "/* simplify-ignore-start */ const secret = 42; /* simplify-ignore-end */",
    "const b = 2;",
    "",
  ].join("\n");
  const { text, blocks } = filterContent(src);
  assert.equal(text.split("\n").filter((l) => l.includes("BLOCK_")).length, 1);
  assert.match(text, /const a = 1;/);
  assert.match(text, /const b = 2;/);
  assert.equal(blocks.length, 1);
  assert.equal(
    blocks[0].content,
    "/* simplify-ignore-start */ const secret = 42; /* simplify-ignore-end */",
  );
});

test("multi-line block collapses to one placeholder line", () => {
  const src = [
    "const a = 1;",
    "// simplify-ignore-start",
    "secret",
    "more",
    "// simplify-ignore-end",
    "const b = 2;",
    "",
  ].join("\n");
  const { text, blocks } = filterContent(src);
  assert.equal(blocks.length, 1);
  assert.equal(text.split("\n").filter((l) => l.includes("BLOCK_")).length, 1);
  const lines = text.split("\n").filter((l) => l.length > 0 || text.endsWith("\n"));
  assert.equal(lines.filter(Boolean).length, 3);
});

test("multiple blocks in one file", () => {
  const src = [
    "line1",
    "// simplify-ignore-start",
    "a",
    "// simplify-ignore-end",
    "mid",
    "// simplify-ignore-start",
    "b",
    "// simplify-ignore-end",
    "line2",
    "",
  ].join("\n");
  const { blocks } = filterContent(src);
  assert.equal(blocks.length, 2);
});

test("reason string is preserved in the placeholder", () => {
  const src = [
    "// simplify-ignore-start: perf-critical",
    "hot",
    "// simplify-ignore-end",
    "",
  ].join("\n");
  const { text, blocks } = filterContent(src);
  assert.match(text, /perf-critical/);
  assert.equal(blocks[0].reason, "perf-critical");
});

test("preserves lack of trailing newline", () => {
  const src = "line1\n// simplify-ignore-start\nsecret\n// simplify-ignore-end";
  const { text } = filterContent(src);
  assert.equal(text.endsWith("\n"), false);
});

test("no blocks returns empty block list", () => {
  const { blocks, text } = filterContent("const a = 1;\nconst b = 2;\n");
  assert.equal(blocks.length, 0);
  assert.equal(text, "const a = 1;\nconst b = 2;\n");
});

test("unclosed block is flushed and flagged", () => {
  const { text, unclosed } = filterContent(
    "line1\n// simplify-ignore-start\norphan code\n",
  );
  assert.equal(unclosed, true);
  assert.match(text, /orphan code/);
});

test("HTML comment syntax keeps --> suffix", () => {
  const src = [
    "<div>",
    "<!-- simplify-ignore-start -->",
    "secret",
    "<!-- simplify-ignore-end -->",
    "</div>",
    "",
  ].join("\n");
  const { text } = filterContent(src);
  assert.match(text, /BLOCK_/);
  assert.match(text, /-->/);
});

test("tool_call read filters a file in place and session_shutdown restores it", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "simplify-"));
  const file = path.join(cwd, "hot.js");
  const original = [
    "const a = 1;",
    "/* simplify-ignore-start */ const secret = 42; /* simplify-ignore-end */",
    "const b = 2;",
    "",
  ].join("\n");
  fs.writeFileSync(file, original);

  const handlers = {};
  si(
    {
      on(event, handler) {
        handlers[event] = handler;
      },
    },
    { cwd },
  );

  await handlers.tool_call({
    toolName: "read",
    input: { path: file },
  });
  const filtered = fs.readFileSync(file, "utf8");
  assert.match(filtered, /BLOCK_/);
  assert.doesNotMatch(filtered, /const secret = 42/);

  await handlers.session_shutdown();
  assert.equal(fs.readFileSync(file, "utf8"), original);
});
