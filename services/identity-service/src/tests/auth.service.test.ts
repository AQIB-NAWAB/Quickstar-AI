import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { signAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createTestIdentityServices } from "../helpers/test-app.js";

test("register and login issue tokens", async () => {
  const { services } = createTestIdentityServices();
  const reg = await services.auth.register({
    email: "alice@example.com",
    password: "password123",
    organizationName: "Acme",
  });
  assert.ok(reg.tokens.access_token);
  assert.ok(reg.tokens.refresh_token);

  const auth = await services.auth.validateAccessToken(reg.tokens.access_token);
  assert.equal(auth.userId, reg.user_id);

  const login = await services.auth.login({ email: "alice@example.com", password: "password123" });
  assert.ok(login.access_token);
});

test("wrong password rejected", async () => {
  const { services } = createTestIdentityServices();
  await services.auth.register({
    email: "bob@example.com",
    password: "password123",
    organizationName: "Bob Co",
  });
  await assert.rejects(
    () => services.auth.login({ email: "bob@example.com", password: "wrong" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      return true;
    },
  );
});

test("refresh rotation and reuse detection", async () => {
  const { services } = createTestIdentityServices();
  const reg = await services.auth.register({
    email: "carol@example.com",
    password: "password123",
    organizationName: "Carol Co",
  });
  const firstRefresh = reg.tokens.refresh_token;
  const rotated = await services.auth.refresh(firstRefresh);
  assert.notEqual(rotated.refresh_token, firstRefresh);

  await assert.rejects(
    () => services.auth.refresh(firstRefresh),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      assert.match(error.message, /reuse/i);
      return true;
    },
  );
});

test("access token valid even when org_id claim is not a current membership", async () => {
  const { services, config } = createTestIdentityServices();
  const reg = await services.auth.register({
    email: "stale-org@example.com",
    password: "password123",
    organizationName: "Real Org",
  });
  const staleOrgId = randomUUID();
  const token = await signAccessToken(
    { sub: reg.user_id, org_id: staleOrgId, sid: randomUUID() },
    { secret: config.jwtAccessSecret, ttlSeconds: config.jwtAccessTtlSeconds },
  );
  const auth = await services.auth.validateAccessToken(token);
  assert.equal(auth.userId, reg.user_id);
  assert.equal(auth.orgId, staleOrgId);
});

test("IDOR: user cannot read other org", async () => {
  const { services } = createTestIdentityServices();
  const a = await services.auth.register({
    email: "a@example.com",
    password: "password123",
    organizationName: "Org A",
  });
  const b = await services.auth.register({
    email: "b@example.com",
    password: "password123",
    organizationName: "Org B",
  });

  await assert.rejects(
    () => services.organizations.getOrganization(b.org_id, a.user_id),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.FORBIDDEN);
      return true;
    },
  );
});

test("api key create returns raw key once", async () => {
  const { services } = createTestIdentityServices();
  const reg = await services.auth.register({
    email: "key@example.com",
    password: "password123",
    organizationName: "Keys Inc",
  });
  const key = await services.apiKeys.createApiKey(reg.org_id, reg.user_id, "ci");
  assert.ok(key.api_key.startsWith("qs_live_"));
  assert.equal(key.key_prefix, key.api_key.slice(0, 16));
});

test("password recovery: enumeration resistance, token hashing, single-use, session revocation", async () => {
  const { services, repository } = createTestIdentityServices();
  const { emailDelivery } = await import("../utils/email-delivery.js");
  emailDelivery.clearCaptured();

  // 1. Request reset for non-existent email -> enumeration-resistant generic response, no email sent
  const nonExistentRes = await services.auth.requestPasswordReset({
    email: "unknown@example.com",
  });
  assert.equal(nonExistentRes.ok, true);
  assert.match(nonExistentRes.message, /If an account exists/i);
  assert.equal(emailDelivery.getCapturedEmails().length, 0);

  // 2. Register real user and login to obtain active session
  const reg = await services.auth.register({
    email: "recovery@example.com",
    password: "oldPassword123!",
    organizationName: "Recovery Org",
  });
  const initialLogin = await services.auth.login({
    email: "recovery@example.com",
    password: "oldPassword123!",
  });
  assert.ok(initialLogin.access_token);

  // 3. Request reset for real email -> captures email with link
  const resetReq = await services.auth.requestPasswordReset({
    email: "recovery@example.com",
  });
  assert.equal(resetReq.ok, true);
  const lastEmail = emailDelivery.getLastEmail();
  assert.ok(lastEmail);
  assert.equal(lastEmail.to, "recovery@example.com");
  assert.match(lastEmail.url, /\/reset-password\?token=/);

  const rawToken = new URL(lastEmail.url).searchParams.get("token")!;
  assert.ok(rawToken);

  // 4. Verify raw token is NOT in store, only token_hash is stored
  const { hashToken } = await import("../utils/password-hasher.js");
  const storedReset = await repository.findPasswordResetByHash(hashToken(rawToken));
  assert.ok(storedReset);
  assert.equal(storedReset.userId, reg.user_id);
  assert.equal(storedReset.usedAt, null);

  // 5. Password validation: < 8 characters rejected
  await assert.rejects(
    services.auth.consumePasswordReset({
      token: rawToken,
      newPassword: "short",
    }),
    /Password must be at least 8 characters/i,
  );

  // 6. Reset password with new password
  const resetResult = await services.auth.consumePasswordReset({
    token: rawToken,
    newPassword: "newSecurePassword456!",
  });
  assert.equal(resetResult.ok, true);

  // 7. Reusing the same reset token is rejected (single-use transactional guarantee)
  await assert.rejects(
    services.auth.consumePasswordReset({
      token: rawToken,
      newPassword: "anotherPassword789!",
    }),
    /Invalid, expired, or already used/i,
  );

  // 8. Old password fails
  await assert.rejects(
    services.auth.login({
      email: "recovery@example.com",
      password: "oldPassword123!",
    }),
    /Invalid email or password/i,
  );

  // 9. New password succeeds
  const newLogin = await services.auth.login({
    email: "recovery@example.com",
    password: "newSecurePassword456!",
  });
  assert.ok(newLogin.access_token);

  // 10. Previous refresh token was revoked upon reset
  await assert.rejects(
    services.auth.refresh(initialLogin.refresh_token),
    /Invalid refresh token|Refresh token reuse/i,
  );
});

