import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAuthContext,
  serializeAuthContext,
  signAuthContext,
  verifyAuthContext,
} from "./context.js";

const SECRET = "test-internal-secret-min-32-chars-long!!";
const ROTATED_SECRET = "test-new-rotated-secret-min-32-chars-long!!";

test("auth context round-trip via signed header", () => {
  const token = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["developer"],
      requestId: "req-99",
      workspaceId: "00000000-0000-4000-8000-000000000001",
    },
    SECRET,
  );

  assert.ok(token.startsWith("v1."));
  const ctx = extractAuthContext({ "x-quickstart-auth-context": token }, SECRET);
  assert.ok(ctx);
  assert.equal(ctx.tenantId, "tenant-a");
  assert.equal(ctx.actorId, "user-1");
  assert.deepEqual(ctx.roles, ["developer"]);
  assert.equal(ctx.workspaceId, "00000000-0000-4000-8000-000000000001");
});

test("forged auth context signature is strictly rejected", () => {
  const token = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["developer"],
      requestId: "req-99",
    },
    SECRET,
  );

  // Alter signature part
  const parts = token.split(".");
  parts[2] = Buffer.from("forged-signature-bytes").toString("base64url");
  const forged = parts.join(".");

  const result = extractAuthContext({ "x-quickstart-auth-context": forged }, SECRET);
  assert.equal(result, null);
});

test("unsigned legacy header is rejected when verification is configured", () => {
  const unsigned = Buffer.from(
    JSON.stringify({
      tenant_id: "tenant-a",
      actor_id: "impersonated-user",
      roles: ["admin"],
      request_id: "req-1",
    }),
  ).toString("base64url");

  // When secret is configured, unsigned context must be rejected
  const result = extractAuthContext({ "x-quickstart-auth-context": unsigned }, SECRET);
  assert.equal(result, null);

  // Without secret, unsigned context is also rejected by default
  const resultNoSecret = extractAuthContext({ "x-quickstart-auth-context": unsigned });
  assert.equal(resultNoSecret, null);

  // Only allowed with explicit allowUnsigned: true test flag
  const resultOptIn = extractAuthContext(
    { "x-quickstart-auth-context": unsigned },
    undefined,
    { allowUnsigned: true },
  );
  assert.ok(resultOptIn);
  assert.equal(resultOptIn.actorId, "impersonated-user");
});

test("expired auth context is rejected", () => {
  const expiredToken = serializeAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["admin"],
      requestId: "req-expired",
      exp: Math.floor(Date.now() / 1000) - 60, // expired 60 seconds ago
    },
    SECRET,
  );

  const result = extractAuthContext({ "x-quickstart-auth-context": expiredToken }, SECRET);
  assert.equal(result, null);
});

test("future-issued auth context beyond clock skew is rejected", () => {
  const futureToken = serializeAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["admin"],
      requestId: "req-future",
      issuedAt: Math.floor(Date.now() / 1000) + 120, // 2 minutes in future
    },
    SECRET,
  );

  const result = extractAuthContext({ "x-quickstart-auth-context": futureToken }, SECRET);
  assert.equal(result, null);
});

test("cross-workspace target mismatch is rejected", () => {
  const token = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["member"],
      requestId: "req-ws",
      workspaceId: "00000000-0000-4000-8000-000000000001",
    },
    SECRET,
  );

  // Matching workspace succeeds
  const match = verifyAuthContext(token, SECRET, {
    expectedWorkspaceId: "00000000-0000-4000-8000-000000000001",
  });
  assert.ok(match);

  // Mismatched workspace rejected
  const mismatch = verifyAuthContext(token, SECRET, {
    expectedWorkspaceId: "00000000-0000-4000-8000-000000000002",
  });
  assert.equal(mismatch, null);
});

test("audience validation rejects mismatched audience", () => {
  const token = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["member"],
      requestId: "req-aud",
      aud: "quickstart-services",
    },
    SECRET,
  );

  // Expected audience match
  const match = verifyAuthContext(token, SECRET, { expectedAudience: "quickstart-services" });
  assert.ok(match);

  // Expected audience mismatch
  const mismatch = verifyAuthContext(token, SECRET, { expectedAudience: "wrong-audience" });
  assert.equal(mismatch, null);
});

test("secret rotation supports candidate key array", () => {
  // Token signed with old secret
  const oldToken = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-1",
      roles: ["member"],
      requestId: "req-rot-1",
    },
    SECRET,
  );

  // Token signed with new secret
  const newToken = signAuthContext(
    {
      tenantId: "tenant-a",
      actorId: "user-2",
      roles: ["member"],
      requestId: "req-rot-2",
    },
    ROTATED_SECRET,
  );

  // Both tokens verify when candidates [ROTATED_SECRET, SECRET] are provided
  const candidates = [ROTATED_SECRET, SECRET];
  const oldCtx = verifyAuthContext(oldToken, candidates);
  const newCtx = verifyAuthContext(newToken, candidates);

  assert.ok(oldCtx);
  assert.equal(oldCtx.actorId, "user-1");
  assert.ok(newCtx);
  assert.equal(newCtx.actorId, "user-2");
});
