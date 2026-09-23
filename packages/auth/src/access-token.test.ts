import assert from "node:assert/strict";
import test from "node:test";
import { bearerTokenFromHeader, signAccessToken, verifyAccessToken } from "./access-token.js";

test("sign and verify access token", async () => {
  const secret = "test-secret-at-least-32-characters-long";
  const token = await signAccessToken(
    { sub: "user-1", org_id: "org-1", sid: "session-1" },
    { secret, ttlSeconds: 60 },
  );
  const claims = await verifyAccessToken(token, secret);
  assert.equal(claims.sub, "user-1");
  assert.equal(claims.org_id, "org-1");
  assert.equal(claims.sid, "session-1");
});

test("bearerTokenFromHeader parses Bearer prefix", () => {
  assert.equal(bearerTokenFromHeader("Bearer abc"), "abc");
  assert.equal(bearerTokenFromHeader("Basic x"), null);
  assert.equal(bearerTokenFromHeader(undefined), null);
});
