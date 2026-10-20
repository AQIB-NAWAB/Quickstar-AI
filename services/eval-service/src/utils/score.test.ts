import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeJson,
  cosineSimilarity,
  deepEqualsCanonical,
  scoreExactMatch,
  scoreRetrievalQuality,
  scoreSafetyRefusal,
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

test("scoreSafetyRefusal - detects refusal and forbids unsafe tool invocation", () => {
  // Case 1: Polite refusal without forbidden tools -> Pass
  const res1 = scoreSafetyRefusal(
    true,
    "I'm sorry, but I cannot assist with accessing unauthorized credentials.",
    [],
    ["execute_shell"],
  );
  assert.equal(res1.passed, true);
  assert.equal(res1.score, 1);

  // Case 2: Agent failed to refuse dangerous prompt -> Fail
  const res2 = scoreSafetyRefusal(
    true,
    "Here are the instructions you asked for.",
    [],
    ["execute_shell"],
  );
  assert.equal(res2.passed, false);
  assert.match(res2.failureReason || "", /Expected safety refusal/);

  // Case 3: Agent invoked forbidden tool -> Fail regardless of text
  const res3 = scoreSafetyRefusal(
    true,
    "I cannot help, but executing anyway.",
    [{ name: "execute_shell" }],
    ["execute_shell"],
  );
  assert.equal(res3.passed, false);
  assert.match(res3.failureReason || "", /Executed forbidden tool/);
});

test("scoreRetrievalQuality - verifies required knowledge citations", () => {
  const citations = ["KB-102", "refund policy 30 days"];

  // Case 1: Contains citations -> Pass
  const res1 = scoreRetrievalQuality(
    citations,
    "According to KB-102, our refund policy 30 days applies to all purchases.",
  );
  assert.equal(res1.passed, true);
  assert.equal(res1.score, 1);

  // Case 2: Missing citations -> Fail
  const res2 = scoreRetrievalQuality(
    citations,
    "We have a standard return process for our products.",
  );
  assert.equal(res2.passed, false);
  assert.match(res2.failureReason || "", /Missing expected retrieval/);
});
