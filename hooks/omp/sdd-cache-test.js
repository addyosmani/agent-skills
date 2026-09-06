import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sdd, { hashKey, isHttpUrl } from "./sdd-cache.js";

test("exports a default factory function", () => {
  assert.equal(typeof sdd, "function");
});

test("hashKey is sha256(url) truncated to 32 hex chars", () => {
  const key = hashKey("https://example.com/docs");
  assert.equal(key.length, 32);
  assert.match(key, /^[0-9a-f]{32}$/);
  assert.equal(hashKey("https://example.com/docs"), key);
  assert.notEqual(hashKey("https://example.com/other"), key);
});

test("isHttpUrl accepts only http(s) read targets", () => {
  assert.equal(isHttpUrl("https://example.com/a"), true);
  assert.equal(isHttpUrl("http://localhost/a"), true);
  assert.equal(isHttpUrl("src/foo.ts"), false);
  assert.equal(isHttpUrl("file:///tmp/x"), false);
  assert.equal(isHttpUrl(undefined), false);
});

test("on 304, rewrites read.path to a local hit file containing cached body", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-cache-"));
  const url = "https://example.com/docs";
  const cacheDir = path.join(cwd, ".omp", "sdd-cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const key = hashKey(url);
  fs.writeFileSync(
    path.join(cacheDir, `${key}.json`),
    JSON.stringify({
      url,
      prompt: "how does X work",
      etag: '"abc"',
      last_modified: "",
      content: "cached docs body",
      fetched_at: 1_700_000_000,
    }),
  );

  const fetchImpl = async () => ({ status: 304, headers: new Map() });
  const handlers = {};
  sdd(
    {
      on(event, handler) {
        handlers[event] = handler;
      },
    },
    { cwd, fetch: fetchImpl },
  );

  const revision = await handlers.tool_call({
    toolName: "read",
    input: { path: url },
  });
  assert.ok(revision?.input?.path);
  assert.notEqual(revision.input.path, url);
  const hit = fs.readFileSync(revision.input.path, "utf8");
  assert.match(hit, /\[sdd-cache\] Cache hit for https:\/\/example.com\/docs/);
  assert.match(hit, /cached docs body/);
  assert.match(hit, /BEGIN CACHED CONTENT/);
});

test("skips cache when origin is not 304", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-cache-"));
  const url = "https://example.com/docs";
  const cacheDir = path.join(cwd, ".omp", "sdd-cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, `${hashKey(url)}.json`),
    JSON.stringify({
      url,
      etag: '"abc"',
      last_modified: "",
      content: "stale",
      fetched_at: 1,
    }),
  );

  const handlers = {};
  sdd(
    {
      on(event, handler) {
        handlers[event] = handler;
      },
    },
    { cwd, fetch: async () => ({ status: 200, headers: new Map() }) },
  );

  const revision = await handlers.tool_call({
    toolName: "read",
    input: { path: url },
  });
  assert.equal(revision, undefined);
});

test("does not serve entries that lack validators", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-cache-"));
  const url = "https://example.com/docs";
  const cacheDir = path.join(cwd, ".omp", "sdd-cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, `${hashKey(url)}.json`),
    JSON.stringify({ url, content: "no validators", fetched_at: 1 }),
  );

  const handlers = {};
  let fetched = false;
  sdd(
    {
      on(event, handler) {
        handlers[event] = handler;
      },
    },
    {
      cwd,
      fetch: async () => {
        fetched = true;
        return { status: 304, headers: new Map() };
      },
    },
  );

  const revision = await handlers.tool_call({
    toolName: "read",
    input: { path: url },
  });
  assert.equal(revision, undefined);
  assert.equal(fetched, false);
});

test("stores a successful URL read when origin returns ETag", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-cache-"));
  const url = "https://example.com/docs";
  const headers = {
    get(name) {
      if (name.toLowerCase() === "etag") return '"xyz"';
      return null;
    },
  };
  const handlers = {};
  sdd(
    {
      on(event, handler) {
        handlers[event] = handler;
      },
    },
    { cwd, fetch: async () => ({ status: 200, headers }) },
  );

  await handlers.tool_result({
    toolName: "read",
    isError: false,
    input: { path: url },
    content: [{ type: "text", text: "fresh body" }],
  });

  const file = path.join(cwd, ".omp", "sdd-cache", `${hashKey(url)}.json`);
  const entry = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(entry.url, url);
  assert.equal(entry.content, "fresh body");
  assert.equal(entry.etag, '"xyz"');
});
