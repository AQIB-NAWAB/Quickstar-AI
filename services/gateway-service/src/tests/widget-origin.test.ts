import assert from "node:assert/strict";
import test from "node:test";
import { isOriginAllowed, requestOrigin } from "../lib/widget-origin.js";

test("requestOrigin prefers Origin header", () => {
  assert.equal(
    requestOrigin("http://127.0.0.1:8080", "http://evil.example"),
    "http://127.0.0.1:8080",
  );
});

test("isOriginAllowed matches exact origin entries", () => {
  assert.equal(isOriginAllowed("http://127.0.0.1:8080", ["http://127.0.0.1:8080"]), true);
  assert.equal(isOriginAllowed("http://127.0.0.1:8080", ["http://localhost:8080"]), false);
});
