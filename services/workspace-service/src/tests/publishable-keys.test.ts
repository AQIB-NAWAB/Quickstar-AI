import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";

test("publishable key resolve internal rejects invalid key", async () => {
  await withWorkspaceServer(async ({ port, config }) => {
    const res = await fetch(`http://127.0.0.1:${port}/internal/publishable-keys/resolve`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.internalToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ key: "pk_live_not-a-real-key-value" }),
    });
    assert.equal(res.status, 401);
  });
});

test("staff can create publishable key and resolve it internally", async () => {
  await withWorkspaceServer(async ({ port, config, createToken, publishableKeysMemory }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerUserId = "00000000-0000-0000-0000-000000000201";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const token = await createToken(ownerUserId, orgId);

    const createWs = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "Widget WS", slug: "widget-ws" }),
    });
    assert.equal(createWs.status, 201);
    const { workspace } = (await createWs.json()) as { workspace: { id: string } };

    const createKey = await fetch(`${base}/v1/workspaces/${workspace.id}/publishable-keys`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Site",
        allowed_origins: ["http://127.0.0.1:8080"],
      }),
    });
    assert.equal(createKey.status, 201);
    const keyBody = (await createKey.json()) as {
      publishable_key: { publishable_key: string; key_prefix: string };
    };
    const raw = keyBody.publishable_key.publishable_key;
    assert.ok(raw.startsWith("pk_live_"));

    const resolve = await fetch(`${base}/internal/publishable-keys/resolve`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.internalToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ key: raw }),
    });
    assert.equal(resolve.status, 200);
    const resolved = (await resolve.json()) as { workspace_id: string; allowed_origins: string[] };
    assert.equal(resolved.workspace_id, workspace.id);
    assert.deepEqual(resolved.allowed_origins, ["http://127.0.0.1:8080"]);

    void publishableKeysMemory;
  });
});
