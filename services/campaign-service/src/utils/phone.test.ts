import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidE164, normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("keeps E.164", () => {
    assert.equal(normalizePhone("+12025550104"), "+12025550104");
  });

  it("strips formatting", () => {
    assert.equal(normalizePhone("+1 (202) 555-0104"), "+12025550104");
  });
});

describe("isValidE164", () => {
  it("accepts valid numbers", () => {
    assert.equal(isValidE164("+12025550104"), true);
  });

  it("rejects missing country code shape", () => {
    assert.equal(isValidE164("+0123"), false);
  });
});
