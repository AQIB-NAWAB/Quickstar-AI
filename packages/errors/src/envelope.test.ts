import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "./app-error.js";
import { ErrorCode } from "./codes.js";
import { httpStatusForError, toErrorEnvelope } from "./envelope.js";

test("toErrorEnvelope maps AppError", () => {
  const envelope = toErrorEnvelope(
    new AppError({
      code: ErrorCode.FORBIDDEN,
      message: "Tenant mismatch",
      requestId: "req-1",
      details: { tenant_id: "a" },
    }),
    "req-fallback",
  );
  assert.equal(envelope.error.code, ErrorCode.FORBIDDEN);
  assert.equal(envelope.error.request_id, "req-1");
  assert.deepEqual(envelope.error.details, { tenant_id: "a" });
});

test("toErrorEnvelope hides unknown errors", () => {
  const envelope = toErrorEnvelope(new Error("db exploded"), "req-2");
  assert.equal(envelope.error.code, ErrorCode.INTERNAL);
  assert.equal(envelope.error.request_id, "req-2");
  assert.equal(httpStatusForError(new Error("x")), 500);
});
