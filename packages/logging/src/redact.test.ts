import assert from "node:assert/strict";
import test from "node:test";
import { redactRecord } from "./redact.js";

test("redactRecord masks sensitive keys", () => {
  const out = redactRecord({
    request_id: "r1",
    authorization: "Bearer secret",
    nested: { api_key: "abc", ok: true },
  });
  assert.equal(out.request_id, "r1");
  assert.equal(out.authorization, "[REDACTED]");
  assert.deepEqual(out.nested, { api_key: "[REDACTED]", ok: true });
});
