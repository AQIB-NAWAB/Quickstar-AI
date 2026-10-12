import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACTS_VERSION,
  DEFAULT_VOICE_MODE,
  s2sProfileAllowed,
} from "./index.js";

test("contracts exports a version string", () => {
  assert.equal(CONTRACTS_VERSION, "0.0.0");
});

test("default voice mode is cascade", () => {
  assert.equal(DEFAULT_VOICE_MODE, "cascade");
});

test("s2s rejects tools and RAG", () => {
  assert.equal(s2sProfileAllowed({ voice_mode: "s2s", toolsCount: 1, knowledgeEnabled: false }).ok, false);
  assert.equal(s2sProfileAllowed({ voice_mode: "s2s", toolsCount: 0, knowledgeEnabled: true }).ok, false);
  assert.equal(s2sProfileAllowed({ voice_mode: "s2s", toolsCount: 0, knowledgeEnabled: false }).ok, true);
  assert.equal(s2sProfileAllowed({ voice_mode: "cascade", toolsCount: 3, knowledgeEnabled: true }).ok, true);
});
