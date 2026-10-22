import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { createHttpServer } from "../http/create-server.js";
import { createTestIdentityServices } from "../helpers/test-app.js";

async function withServer(run: (port: number) => Promise<void>): Promise<void> {
  const { services } = createTestIdentityServices();
  const app = createHttpServer({
    services,
    logger: createLogger({ service: "service-identity-test" }),
  });
  const server = await new Promise<Server>((resolve) => {
    const httpServer = app.listen(0, () => resolve(httpServer));
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected bound port");
    }
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}

test("organizations lifecycle: create, list, update, and verify-membership", async () => {
  await withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;

    // Register user 1
    const reg1 = await fetch(`${base}/v1/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "password123",
        organization_name: "Alice Org 1",
      }),
    });
    assert.equal(reg1.status, 201);
    const reg1Body = (await reg1.json()) as { user_id: string; org_id: string; tokens: { access_token: string } };
    const token1 = reg1Body.tokens.access_token;
    const userId1 = reg1Body.user_id;
    const orgId1 = reg1Body.org_id;

    // Register user 2
    const reg2 = await fetch(`${base}/v1/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "bob@example.com",
        password: "password123",
        organization_name: "Bob Org",
      }),
    });
    assert.equal(reg2.status, 201);
    const reg2Body = (await reg2.json()) as { user_id: string; org_id: string; tokens: { access_token: string } };
    const token2 = reg2Body.tokens.access_token;
    const userId2 = reg2Body.user_id;

    // User 1 creates a second organization
    const createOrgRes = await fetch(`${base}/v1/organizations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token1}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Alice Org 2" }),
    });
    assert.equal(createOrgRes.status, 201);
    const createdOrgBody = (await createOrgRes.json()) as { organization: { id: string; name: string; role: string } };
    assert.equal(createdOrgBody.organization.name, "Alice Org 2");
    assert.equal(createdOrgBody.organization.role, "owner");
    const orgId2 = createdOrgBody.organization.id;

    // User 1 lists organizations - should have 2 organizations
    const listRes = await fetch(`${base}/v1/organizations`, {
      headers: { authorization: `Bearer ${token1}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as { organizations: { id: string; name: string }[] };
    assert.equal(listBody.organizations.length, 2);
    const orgIds = listBody.organizations.map((o) => o.id);
    assert.ok(orgIds.includes(orgId1));
    assert.ok(orgIds.includes(orgId2));

    // User 1 updates Org 2 name
    const updateRes = await fetch(`${base}/v1/organizations/${orgId2}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token1}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Alice Org 2 Renamed" }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = (await updateRes.json()) as { organization: { name: string } };
    assert.equal(updateBody.organization.name, "Alice Org 2 Renamed");

    // User 2 attempts to update User 1's Org 2 -> should be 403 Forbidden
    const forbiddenRes = await fetch(`${base}/v1/organizations/${orgId2}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token2}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Hacked Org" }),
    });
    assert.equal(forbiddenRes.status, 403);

    // Verify membership via internal endpoint:
    // User 1 in Org 2 -> true
    const verify1 = await fetch(`${base}/internal/v1/orgs/verify-membership`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: orgId2, userId: userId1 }),
    });
    assert.equal(verify1.status, 200);
    const verify1Body = (await verify1.json()) as { isMember: boolean; role: string };
    assert.equal(verify1Body.isMember, true);
    assert.equal(verify1Body.role, "owner");

    // User 2 in Org 2 -> false
    const verify2 = await fetch(`${base}/internal/v1/orgs/verify-membership`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: orgId2, userId: userId2 }),
    });
    assert.equal(verify2.status, 200);
    const verify2Body = (await verify2.json()) as { isMember: boolean; role: string | null };
    assert.equal(verify2Body.isMember, false);
    assert.equal(verify2Body.role, null);
  });
});
