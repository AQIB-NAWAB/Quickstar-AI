import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";

test("RBAC: Analyst role can read workspace but cannot update or invite (403)", async () => {
  await withWorkspaceServer(async ({ port, store, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const analystId = "00000000-0000-0000-0000-000000000002";
    const orgId = "00000000-0000-0000-0000-000000000010";

    const { workspace } = await store.createWorkspace({
      orgId,
      name: "Analytics Team",
      slug: "analytics-team",
      ownerUserId: ownerId,
    });

    await store.updateMemberRole(
      { workspaceId: workspace.id, actorId: ownerId },
      analystId,
      "analyst",
      ownerId,
    ).catch(async () => {
      (store as any).memberships.set(`${workspace.id}:${analystId}`, {
        id: "mem-analyst",
        workspaceId: workspace.id,
        userId: analystId,
        role: "analyst",
        roleUpdatedAt: new Date(),
        roleUpdatedBy: ownerId,
        createdAt: new Date(),
      });
    });

    const analystToken = await createToken(analystId, orgId);

    const readRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
      headers: { authorization: `Bearer ${analystToken}` },
    });
    assert.equal(readRes.status, 200);

    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${analystToken}` },
    });
    assert.equal(membersRes.status, 200);

    const updateRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${analystToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Hacked" }),
    });
    assert.equal(updateRes.status, 403);

    const inviteRes = await fetch(`${base}/v1/workspaces/${workspace.id}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${analystToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "guest@example.com", role: "developer" }),
    });
    assert.equal(inviteRes.status, 403);
  });
});

test("RBAC: Developer role cannot invite members (403)", async () => {
  await withWorkspaceServer(async ({ port, store, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const developerId = "00000000-0000-0000-0000-000000000003";
    const orgId = "00000000-0000-0000-0000-000000000010";

    const { workspace } = await store.createWorkspace({
      orgId,
      name: "Engineering Team",
      slug: "eng-team",
      ownerUserId: ownerId,
    });

    (store as any).memberships.set(`${workspace.id}:${developerId}`, {
      id: "mem-dev",
      workspaceId: workspace.id,
      userId: developerId,
      role: "developer",
      roleUpdatedAt: new Date(),
      roleUpdatedBy: ownerId,
      createdAt: new Date(),
    });

    const devToken = await createToken(developerId, orgId);

    const inviteRes = await fetch(`${base}/v1/workspaces/${workspace.id}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${devToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "guest@example.com", role: "developer" }),
    });
    assert.equal(inviteRes.status, 403);
  });
});

test("RBAC: All roles can read workspace", async () => {
  const roles = ["owner", "admin", "developer", "operator", "analyst", "human_agent"] as const;

  await withWorkspaceServer(async ({ port, store, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const orgId = "00000000-0000-0000-0000-000000000010";

    const { workspace } = await store.createWorkspace({
      orgId,
      name: "Role Test Workspace",
      slug: "role-test-workspace",
      ownerUserId: ownerId,
    });

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const userId = `00000000-0000-0000-0000-0000000000${10 + i}`;
      (store as any).memberships.set(`${workspace.id}:${userId}`, {
        id: `mem-${role}`,
        workspaceId: workspace.id,
        userId,
        role,
        roleUpdatedAt: new Date(),
        roleUpdatedBy: ownerId,
        createdAt: new Date(),
      });

      const token = await createToken(userId, orgId);
      const readRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(readRes.status, 200, `${role} should be able to read workspace`);
    }
  });
});
