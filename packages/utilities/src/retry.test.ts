import assert from "node:assert/strict";
import test from "node:test";
import { isRetrySafe } from "./retry.js";

test("GET is retry safe", () => {
  assert.equal(isRetrySafe("GET", false), true);
});

test("unsafe POST is not retry safe without idempotency key", () => {
  assert.equal(isRetrySafe("POST", false), false);
});

test("POST with idempotency key is retry safe", () => {
  assert.equal(isRetrySafe("POST", true), true);
});
