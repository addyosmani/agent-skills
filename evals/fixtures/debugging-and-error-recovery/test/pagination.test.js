import assert from "node:assert/strict";
import test from "node:test";
import { pageItems } from "../src/pagination.js";

const items = ["a", "b", "c", "d", "e"];

test("returns the first page", () => {
  assert.deepEqual(pageItems(items, 1, 2), ["a", "b"]);
});

test("returns the second page", () => {
  assert.deepEqual(pageItems(items, 2, 2), ["c", "d"]);
});

test("keeps the final partial page", () => {
  assert.deepEqual(pageItems(items, 3, 2), ["e"]);
});
