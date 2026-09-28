import assert from "node:assert/strict";
import test from "node:test";
import { buildHybridSearchBody } from "./opensearch.js";

test("buildHybridSearchBody uses knn vector and workspace filter", () => {
  const body = buildHybridSearchBody("ws-1", "refund policy", [0.1, 0.2], 5);
  assert.equal(body.size, 5);
  const query = body.query as {
    bool: { filter: unknown[]; must: unknown[]; should: unknown[] };
  };
  assert.deepEqual(query.bool.filter, [{ term: { workspace_id: "ws-1" } }]);
  const knn = query.bool.must[0] as { knn: { vector: { vector: number[]; k: number } } };
  assert.deepEqual(knn.knn.vector.vector, [0.1, 0.2]);
  assert.ok(knn.knn.vector.k >= 5);
  assert.ok(query.bool.should.length > 0);
});
