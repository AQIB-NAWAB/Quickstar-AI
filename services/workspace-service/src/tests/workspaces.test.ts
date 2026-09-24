import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";

test("GET /healthz and /readyz", async () => {
  await withWorkspaceServer(async ({ port }) => {
    const health = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(health.status, 200);
    const healthBody = (await health.json()) as { status: string; service: string };
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.service, "service-workspace");

    const ready = await fetch(`http://127.0.0.1:${port}/readyz`);
    assert.equal(ready.status, 200);
    const readyBody = (await ready.json()) as { status: string; service: string };
    assert.equal(readyBody.status, "ready");
  });
});

test("Create workspace assigns creator as owner and allows management", async () => {
  await withWorkspaceServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerUserId = "00000000-0000-0000-0000-000000000101";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const token = await createToken(ownerUserId, orgId);

    // 1. Create workspace
    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Engineering Core",
        slug: "engineering-core",
      }),
    });
    assert.equal(createRes.status, 201);
    const createBody = (await createRes.json()) as { workspace: { id: string; name: string; slug: string } };
    const workspaceId = createBody.workspace.id;
    assert.equal(createBody.workspace.name, "Engineering Core");
    assert.equal(createBody.workspace.slug, "engineering-core");

    // 2. Fetch workspace details
    const getRes = await fetch(`${base}/v1/workspaces/${workspaceId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.status, 200);
    const getBody = (await getRes.json()) as { workspace: { id: string; name: string } };
    assert.equal(getBody.workspace.id, workspaceId);

    // 3. Verify creator is in members list with 'owner' role
    const membersRes = await fetch(`${base}/v1/workspaces/${workspaceId}/members`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(membersRes.status, 200);
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    assert.equal(membersBody.members.length, 1);
    assert.equal(membersBody.members[0].userId, ownerUserId);
    assert.equal(membersBody.members[0].role, "owner");

    // 4. Update workspace
    const updateRes = await fetch(`${base}/v1/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Engineering Core Renamed",
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = (await updateRes.json()) as { workspace: { name: string } };
    assert.equal(updateBody.workspace.name, "Engineering Core Renamed");

    // 5. Create invite
    const inviteRes = await fetch(`${base}/v1/workspaces/${workspaceId}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "colleague@example.com",
        role: "developer",
      }),
    });
    assert.equal(inviteRes.status, 201);
    const inviteBody = (await inviteRes.json()) as { invite: { id: string; email: string; role: string }; raw_token: string };
    assert.equal(inviteBody.invite.email, "colleague@example.com");
    assert.equal(inviteBody.invite.role, "developer");
    assert.ok(inviteBody.raw_token);

    // 6. List invites
    const listInvitesRes = await fetch(`${base}/v1/workspaces/${workspaceId}/invites`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listInvitesRes.status, 200);
    const listInvitesBody = (await listInvitesRes.json()) as { invites: Array<{ id: string }> };
    assert.equal(listInvitesBody.invites.length, 1);

    // 7. Delete invite
    const delInviteRes = await fetch(
      `${base}/v1/workspaces/${workspaceId}/invites/${inviteBody.invite.id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      },
    );
    assert.equal(delInviteRes.status, 200);

    // 8. Delete workspace
    const delRes = await fetch(`${base}/v1/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(delRes.status, 200);
  });
});
