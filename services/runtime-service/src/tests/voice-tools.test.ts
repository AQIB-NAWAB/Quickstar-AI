import assert from "node:assert/strict";
import test from "node:test";
import { spokenToolNudge, visitorWantsTeammate, VOICE_TRANSFER_TOOL_NAME } from "../services/voice-tools.js";

test("a request for a person is treated as a call transfer", () => {
  assert.equal(visitorWantsTeammate("can I talk to a human"), true);
  assert.equal(visitorWantsTeammate("مجھے ساتھی سے بات کرنی ہے"), true);
  assert.equal(visitorWantsTeammate("what is the price"), false);
});

test("tool nudges are short spoken lines", () => {
  assert.match(spokenToolNudge(VOICE_TRANSFER_TOOL_NAME, "en"), /switching you/i);
  assert.match(spokenToolNudge("lookup_order", "ur-PK"), /چیک/);
  assert.match(spokenToolNudge("lookup_order", "en"), /checking/i);
});
