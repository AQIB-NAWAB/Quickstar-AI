import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createTestIdentity } from "../testing/fixtures.js";

test("register and login issue tokens", async () => {
  const { identity } = createTestIdentity();
  const reg = await identity.register({
    email: "alice@example.com",
    password: "password123",
    organizationName: "Acme",
  });
  assert.ok(reg.tokens.access_token);
  assert.ok(reg.tokens.refresh_token);

  const auth = await identity.authenticateAccessToken(reg.tokens.access_token);
  assert.equal(auth.userId, reg.user_id);

  const login = await identity.login({ email: "alice@example.com", password: "password123" });
  assert.ok(login.access_token);
});

test("wrong password rejected", async () => {
  const { identity } = createTestIdentity();
  await identity.register({
    email: "bob@example.com",
    password: "password123",
    organizationName: "Bob Co",
  });
  await assert.rejects(
    () => identity.login({ email: "bob@example.com", password: "wrong" }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      return true;
    },
  );
});

test("refresh rotation and reuse detection", async () => {
  const { identity } = createTestIdentity();
  const reg = await identity.register({
    email: "carol@example.com",
    password: "password123",
    organizationName: "Carol Co",
  });
  const firstRefresh = reg.tokens.refresh_token;
  const rotated = await identity.refresh(firstRefresh);
  assert.notEqual(rotated.refresh_token, firstRefresh);

  await assert.rejects(
    () => identity.refresh(firstRefresh),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.UNAUTHORIZED);
      assert.match(error.message, /reuse/i);
      return true;
    },
  );
});

test("IDOR: user cannot read other org", async () => {
  const { identity } = createTestIdentity();
  const a = await identity.register({
    email: "a@example.com",
    password: "password123",
    organizationName: "Org A",
  });
  const b = await identity.register({
    email: "b@example.com",
    password: "password123",
    organizationName: "Org B",
  });

  await assert.rejects(
    () => identity.getOrganization(b.org_id, a.user_id),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCode.FORBIDDEN);
      return true;
    },
  );
});

test("api key create returns raw key once", async () => {
  const { identity } = createTestIdentity();
  const reg = await identity.register({
    email: "key@example.com",
    password: "password123",
    organizationName: "Keys Inc",
  });
  const key = await identity.createApiKey(reg.org_id, reg.user_id, "ci");
  assert.ok(key.api_key.startsWith("qs_live_"));
  assert.equal(key.key_prefix, key.api_key.slice(0, 16));
});
