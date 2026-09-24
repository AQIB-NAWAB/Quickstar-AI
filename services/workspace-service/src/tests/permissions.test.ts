import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";
import type { WorkspaceRole } from "../domain/permissions.js";

test("RBAC: Analyst role can read but is strictly barred from publishing (403)", async () => {
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

    // Manually add analyst membership
    await store.updateMemberRole(
      { workspaceId: workspace.id, actorId: ownerId },
      analystId,
      "analyst",
      ownerId,
    ).catch(async () => {
      // If doesn't exist, store directly in memory
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

    // 1. Analyst CAN read workspace
    const readRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
      headers: { authorization: `Bearer ${analystToken}` },
    });
    assert.equal(readRes.status, 200);

    // 2. Analyst CAN list members
    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${analystToken}` },
    });
    assert.equal(membersRes.status, 200);

    // 3. Analyst CANNOT update workspace settings
    const updateRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${analystToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Hacked" }),
    });
    assert.equal(updateRes.status, 403);

    // 4. Analyst CANNOT invite members
    const inviteRes = await fetch(`${base}/v1/workspaces/${workspace.id}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${analystToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "guest@example.com", role: "developer" }),
    });
    assert.equal(inviteRes.status, 403);

    // 5. Analyst CANNOT publish agents (Critical Invariant: 403 Forbidden)
    const publishRes = await fetch(
      `${base}/v1/workspaces/${workspace.id}/agents/00000000-0000-0000-0000-000000000999/publish`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${analystToken}` },
      },
    );
    assert.equal(publishRes.status, 403);
    const publishBody = (await publishRes.json()) as { error: { message: string } };
    assert.match(publishBody.error.message, /Role 'analyst' lacks permission 'workspace.agent.publish'/i);
  });
});

test("RBAC: Developer role CAN publish agents (200 OK)", async () => {
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

    // Add developer membership
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

    // Developer CAN publish agents
    const publishRes = await fetch(
      `${base}/v1/workspaces/${workspace.id}/agents/00000000-0000-0000-0000-000000000999/publish`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${devToken}` },
      },
    );
    assert.equal(publishRes.status, 200);
    const publishBody = (await publishRes.json()) as { published: boolean };
    assert.equal(publishBody.published, true);

    // Developer CANNOT invite members
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

test("RBAC: Role hierarchy validation for all 6 roles", async () => {
  const roles: WorkspaceRole[] = [
    "owner",
    "admin",
    "developer",
    "operator",
    "analyst",
    "human_agent",
  ];

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

      // All roles can read workspace
      const readRes = await fetch(`${base}/v1/workspaces/${workspace.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(readRes.status, 200, `${role} should be able to read workspace`);

      // Test publish permission
      const publishRes = await fetch(
        `${base}/v1/workspaces/${workspace.id}/agents/00000000-0000-0000-0000-000000000999/publish`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        },
      );

      if (role === "owner" || role === "admin" || role === "developer") {
        assert.equal(publishRes.status, 200, `${role} should be able to publish`);
      } else {
        assert.equal(publishRes.status, 403, `${role} should NOT be able to publish`);
      }
    }
  });
});
