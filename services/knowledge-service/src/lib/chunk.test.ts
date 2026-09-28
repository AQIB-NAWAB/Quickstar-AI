import assert from "node:assert/strict";
import test from "node:test";
import { chunkText } from "./chunk.js";

test("chunkText splits long content", () => {
  const text = "A".repeat(2000);
  const chunks = chunkText(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 800));
});
