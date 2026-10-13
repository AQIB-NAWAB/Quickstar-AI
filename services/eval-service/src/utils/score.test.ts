import assert from "node:assert/strict";
import test from "node:test";
import { meanScorePercent, scoreExactMatch } from "./score.js";

test("scoreExactMatch trims both sides", () => {
  assert.equal(scoreExactMatch("fake-reply:hi", "fake-reply:hi"), true);
  assert.equal(scoreExactMatch("fake-reply:hi", "  fake-reply:hi  "), true);
  assert.equal(scoreExactMatch("a", "b"), false);
});

test("meanScorePercent averages case passes", () => {
  assert.equal(meanScorePercent(2, 2), 100);
  assert.equal(meanScorePercent(1, 2), 50);
  assert.equal(meanScorePercent(0, 0), 0);
});
