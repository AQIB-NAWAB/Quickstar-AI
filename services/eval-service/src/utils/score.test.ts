import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeJson,
  cosineSimilarity,
  deepEqualsCanonical,
  scoreExactMatch,
  scoreSemanticSimilarity,
  scoreToolTrace,
} from "./score.js";

test("scoreExactMatch - basic trimming and equality", () => {
  const res1 = scoreExactMatch(
    "Returns are accepted within 30 days.",
    "  Returns are accepted within 30 days. \n",
  );
  assert.equal(res1.passed, true);
  assert.equal(res1.score, 1.0);
  assert.equal(res1.failureReason, null);

  const res2 = scoreExactMatch(
    "Returns are accepted within 30 days.",
    "Returns are accepted within 45 days.",
  );
  assert.equal(res2.passed, false);
  assert.equal(res2.score, 0.0);
  assert.match(res2.failureReason || "", /Exact match mismatch/);
});

test("scoreExactMatch - empty response handling", () => {
  const res = scoreExactMatch("Some answer", "");
  assert.equal(res.passed, false);
  assert.equal(res.score, 0.0);
  assert.equal(res.failureReason, "Actual output was empty");
});

test("cosineSimilarity - orthogonal and parallel vectors", () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1.0);
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0.0);
  assert.equal(cosineSimilarity([0, 0, 0], [1, 1, 1]), 0.0);
});

test("scoreSemanticSimilarity - threshold evaluation", async () => {
  const vecA = [1, 0.5, 0.2];
  const vecB = [1, 0.48, 0.22];
  const res = scoreSemanticSimilarity(vecA, vecB, 0.85);
  assert.equal(res.passed, true);
  assert.ok((res.score ?? 0) >= 0.85);
  assert.equal(res.failureReason, null);
});

test("canonicalizeJson - key sorting and nested objects", () => {
  const objA = { b: 2, a: 1, c: { z: 10, y: 20 } };
  const objB = { a: 1, c: { y: 20, z: 10 }, b: 2 };

  assert.equal(
    JSON.stringify(canonicalizeJson(objA)),
    '{"a":1,"b":2,"c":{"y":20,"z":10}}',
  );
  assert.deepEqual(canonicalizeJson(objA), canonicalizeJson(objB));
  assert.equal(deepEqualsCanonical(objA, objB), true);
});

test("scoreToolTrace - unordered tool match with argument permutation", () => {
  const expectedTools = [
    { name: "lookup_order", arguments: { id: "100", details: true } },
    { name: "send_sms", arguments: { to: "+12345" } },
  ];

  const actualTools = [
    { name: "send_sms", arguments: { to: "+12345" } },
    { name: "lookup_order", arguments: { details: true, id: "100" } },
  ];

  const res = scoreToolTrace(expectedTools, actualTools, { requireOrder: false });
  assert.equal(res.passed, true);
  assert.equal(res.score, 1.0);
  assert.equal(res.failureReason, null);
});

test("scoreToolTrace - unexpected tool invocation", () => {
  const expectedTools = [{ name: "lookup_order" }];
  const actualTools = [
    { name: "lookup_order" },
    { name: "delete_database" },
  ];

  const res = scoreToolTrace(expectedTools, actualTools, { requireOrder: false });
  assert.equal(res.passed, false);
  assert.equal(res.score, 0.0);
  assert.match(res.failureReason || "", /Unexpected tool/);
});

test("scoreToolTrace - missing tool invocation", () => {
  const expectedTools = [{ name: "lookup_order" }, { name: "send_email" }];
  const actualTools = [{ name: "lookup_order" }];

  const res = scoreToolTrace(expectedTools, actualTools, { requireOrder: false });
  assert.equal(res.passed, false);
  assert.equal(res.score, 0.5);
  assert.match(res.failureReason || "", /Missing expected tool/);
});
