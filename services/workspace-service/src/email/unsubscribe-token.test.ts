import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createUnsubscribeToken, parseUnsubscribeToken } from "./unsubscribe-token.js";

const SECRET = "test-secret-with-enough-length-for-hmac";

describe("unsubscribe tokens", () => {
  it("round-trips campaign and recipient ids", () => {
    const token = createUnsubscribeToken("campaign-1", "recipient-2", SECRET);
    const parsed = parseUnsubscribeToken(token, SECRET);
    assert.deepEqual(parsed, { campaignId: "campaign-1", recipientId: "recipient-2" });
  });

  it("rejects a tampered token", () => {
    const token = createUnsubscribeToken("campaign-1", "recipient-2", SECRET);
    const tampered = `${token}x`;
    assert.equal(parseUnsubscribeToken(tampered, SECRET), null);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createUnsubscribeToken("campaign-1", "recipient-2", SECRET);
    assert.equal(parseUnsubscribeToken(token, "another-secret"), null);
  });

  it("rejects malformed tokens", () => {
    assert.equal(parseUnsubscribeToken("", SECRET), null);
    assert.equal(parseUnsubscribeToken("a.b", SECRET), null);
    assert.equal(parseUnsubscribeToken("a.b.c.d", SECRET), null);
  });
});
