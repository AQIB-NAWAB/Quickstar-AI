import assert from "node:assert/strict";
import test from "node:test";
import { factTextDenied } from "./denylist.js";

test("denylist rejects sk- api key pattern", () => {
  assert.equal(factTextDenied("Use sk-abcdefghijklmnopqrstuvwxyz123456 for access"), true);
});

test("denylist rejects bearer token", () => {
  assert.equal(factTextDenied("Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), true);
});

test("denylist allows benign preference", () => {
  assert.equal(factTextDenied("Prefers email over phone"), false);
});
