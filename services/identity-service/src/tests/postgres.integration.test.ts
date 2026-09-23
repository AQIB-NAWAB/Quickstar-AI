import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createAuthService } from "../services/auth.service.js";
import { createIdentityDataSource } from "../repository/typeorm/data-source.js";
import { createTypeOrmIdentityStore } from "../repository/typeorm/identity-typeorm-store.js";
import { createNoopSessionRevocation } from "../utils/session-revocation.js";
import { testServiceConfig } from "../helpers/test-app.js";

const runIntegration = process.env.IDENTITY_INTEGRATION_TEST === "1";

test("postgres register round-trip", { skip: !runIntegration }, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL required for integration test");
  }

  const dataSource = createIdentityDataSource(databaseUrl);
  await dataSource.initialize();
  const repository = createTypeOrmIdentityStore(dataSource);
  const config = testServiceConfig();
  const auth = createAuthService({
    repository,
    sessions: createNoopSessionRevocation(),
    config,
  });

  const email = `integration-${Date.now()}@example.com`;
  const reg = await auth.register({
    email,
    password: "password123",
    organizationName: "Integration Org",
  });
  assert.ok(reg.tokens.access_token);

  const me = await auth.validateAccessToken(reg.tokens.access_token);
  assert.equal(me.userId, reg.user_id);

  await dataSource.destroy();
});
