import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig } from "../src/config-parser.js";

test("parses strings, booleans, and numbers", () => {
  assert.deepEqual(
    parseConfig(`
      # ignored
      host = "localhost"
      port = 3000
      debug = true
      dryRun = false
    `),
    {
      host: "localhost",
      port: 3000,
      debug: true,
      dryRun: false
    }
  );
});

test("ignores blank lines and malformed lines", () => {
  assert.deepEqual(
    parseConfig(`
      enabled = true

      no equals here
      retries = 2
    `),
    {
      enabled: true,
      retries: 2
    }
  );
});
