import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIncomingTargets, syntheticDialFromKey } from "./audience.js";

test("audience-only imports synthesize dial keys from email", () => {
  const email = "partner@example.com";
  const { valid, invalidCount } = normalizeIncomingTargets(
    [
      {
        dialAddress: "",
        displayName: "Partner Co",
        email,
        attributes: {},
        sourceKind: "lead",
        sourceRef: "cand-1",
      },
    ],
    { maxKeys: 20, maxValueLength: 500 },
    { telephonyRequired: false },
  );
  assert.equal(invalidCount, 0);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].dialNormalized, syntheticDialFromKey(email));
  assert.equal(valid[0].attributes.telephony_mode, "none");
});
