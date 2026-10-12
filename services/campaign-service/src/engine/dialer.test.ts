import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNextTargetState } from "./dialer.js";

describe("resolveNextTargetState", () => {
  it("completes answered calls", () => {
    const next = resolveNextTargetState(
      { status: "answered", outcome: "answered", callId: "c1", durationSeconds: 40 },
      1,
      2,
      30,
      ["no_answer", "busy"],
    );
    assert.equal(next.nextStatus, "completed");
    assert.equal(next.nextAttemptAt, null);
  });

  it("schedules retry for eligible outcomes", () => {
    const next = resolveNextTargetState(
      { status: "no_answer", outcome: "no_answer", callId: "c1", durationSeconds: 0 },
      1,
      2,
      30,
      ["no_answer", "busy"],
    );
    assert.equal(next.nextStatus, "retrying");
    assert.ok(next.nextAttemptAt instanceof Date);
  });

  it("stops when retries exhausted", () => {
    const next = resolveNextTargetState(
      { status: "busy", outcome: "busy", callId: "c1", durationSeconds: 0 },
      3,
      2,
      30,
      ["no_answer", "busy"],
    );
    assert.equal(next.nextStatus, "busy");
    assert.equal(next.nextAttemptAt, null);
  });
});
