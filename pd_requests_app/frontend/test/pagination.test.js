import test from "node:test";
import assert from "node:assert/strict";
import { createPageNumbers } from "../src/utils/pagination.js";

test("creates all page numbers when there are fewer than five pages", () => {
  assert.deepEqual(createPageNumbers(1, 3), [1, 2, 3]);
});

test("centres the current page in a five-page window", () => {
  assert.deepEqual(createPageNumbers(5, 10), [3, 4, 5, 6, 7]);
});

test("keeps the last page in range", () => {
  assert.deepEqual(createPageNumbers(10, 10), [6, 7, 8, 9, 10]);
});
