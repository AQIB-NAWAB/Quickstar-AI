import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createTestIdentityModules } from "../../tests/helpers/test-app.js";

test("register and login issue tokens", async () => {
  const { modules } = createTestIdentityModules();
  const reg = await modules.auth.register({
    email: "alice@example.com",
    password: "password123",
    organizationName: "Acme",
  });
  assert.ok(reg.tokens.access_token);
  assert.ok(reg.tokens.refresh_token);

  const auth = await modules.auth.validateAccessToken(reg.tokens.access_token);
  assert.equal(auth.userId, reg.user_id);

  const login = await modules.auth.login({ email: "alice@example.com", password: "password123" });
  assert.ok(login.access_token);
});

test("wrong password rejected", async () => {
  const { modules } = createTestIdentityModules();
  await modules.auth.register({
    email: "bob@example.com",
    password: "password123",
    organizationName: "Bob Co",
  });
  await assert.rejects(
    () => modules.auth.login({ email: "bob@example.com", password: "wrong" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      return true;
    },
  );
});

test("refresh rotation and reuse detection", async () => {
  const { modules } = createTestIdentityModules();
  const reg = await modules.auth.register({
    email: "carol@example.com",
    password: "password123",
    organizationName: "Carol Co",
  });
  const firstRefresh = reg.tokens.refresh_token;
  const rotated = await modules.auth.refresh(firstRefresh);
  assert.notEqual(rotated.refresh_token, firstRefresh);

  await assert.rejects(
    () => modules.auth.refresh(firstRefresh),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      assert.match(error.message, /reuse/i);
      return true;
    },
  );
});

test("IDOR: user cannot read other org", async () => {
  const { modules } = createTestIdentityModules();
  const a = await modules.auth.register({
    email: "a@example.com",
    password: "password123",
    organizationName: "Org A",
  });
  const b = await modules.auth.register({
    email: "b@example.com",
    password: "password123",
    organizationName: "Org B",
  });

  await assert.rejects(
    () => modules.organizations.getOrganization(b.org_id, a.user_id),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.FORBIDDEN);
      return true;
    },
  );
});

test("api key create returns raw key once", async () => {
  const { modules } = createTestIdentityModules();
  const reg = await modules.auth.register({
    email: "key@example.com",
    password: "password123",
    organizationName: "Keys Inc",
  });
  const key = await modules.apiKeys.createApiKey(reg.org_id, reg.user_id, "ci");
  assert.ok(key.api_key.startsWith("qs_live_"));
  assert.equal(key.key_prefix, key.api_key.slice(0, 16));
});
