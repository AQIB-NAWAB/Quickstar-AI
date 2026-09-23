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
