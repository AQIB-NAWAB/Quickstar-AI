import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";

test("Cross-workspace IDOR prevention: User in Workspace 1 cannot access Workspace 2", async () => {
  await withWorkspaceServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const userA = "00000000-0000-0000-0000-00000000000a";
    const userB = "00000000-0000-0000-0000-00000000000b";
    const orgId = "00000000-0000-0000-0000-000000000001";

    const tokenA = await createToken(userA, orgId);
    const tokenB = await createToken(userB, orgId);

    // 1. User A creates Workspace 1
    const ws1Res = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Workspace One", slug: "ws-1" }),
    });
    assert.equal(ws1Res.status, 201);
    const { workspace: ws1 } = (await ws1Res.json()) as { workspace: { id: string } };

    // 2. User B creates Workspace 2
    const ws2Res = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenB}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Workspace Two", slug: "ws-2" }),
    });
    assert.equal(ws2Res.status, 201);
    const { workspace: ws2 } = (await ws2Res.json()) as { workspace: { id: string } };

    // 3. User A attempts to read Workspace 2 (MUST fail closed with 403 Forbidden)
    const readWs2Res = await fetch(`${base}/v1/workspaces/${ws2.id}`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(readWs2Res.status, 403);
    const readWs2Body = (await readWs2Res.json()) as { error: { message: string } };
    assert.match(readWs2Body.error.message, /Not a member of this workspace/i);

    // 4. User A attempts to list members of Workspace 2 (MUST fail with 403)
    const listMembersWs2Res = await fetch(`${base}/v1/workspaces/${ws2.id}/members`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(listMembersWs2Res.status, 403);

    // 5. User A attempts to create an invite in Workspace 2 (MUST fail with 403)
    const inviteWs2Res = await fetch(`${base}/v1/workspaces/${ws2.id}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "intruder@example.com", role: "developer" }),
    });
    assert.equal(inviteWs2Res.status, 403);

    // 6. User A attempts to delete Workspace 2 (MUST fail with 403)
    const delWs2Res = await fetch(`${base}/v1/workspaces/${ws2.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(delWs2Res.status, 403);

    // 7. Verify listing workspaces by org partitions correctly
    // User A sees only Workspace 1
    const listA = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    assert.equal(listA.status, 200);
    const listABody = (await listA.json()) as { workspaces: Array<{ id: string }> };
    assert.equal(listABody.workspaces.length, 1);
    assert.equal(listABody.workspaces[0].id, ws1.id);

    // User B sees only Workspace 2
    const listB = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      headers: { authorization: `Bearer ${tokenB}` },
    });
    assert.equal(listB.status, 200);
    const listBBody = (await listB.json()) as { workspaces: Array<{ id: string }> };
    assert.equal(listBBody.workspaces.length, 1);
    assert.equal(listBBody.workspaces[0].id, ws2.id);
  });
});
