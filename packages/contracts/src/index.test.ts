import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACTS_VERSION } from "./index.js";

test("contracts exports a version string", () => {
  assert.equal(CONTRACTS_VERSION, "0.0.0");
});
