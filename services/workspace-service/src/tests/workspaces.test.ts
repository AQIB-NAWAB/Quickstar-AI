import assert from "node:assert/strict";
import test from "node:test";
import { withWorkspaceServer } from "../helpers/test-app.js";
import { inviteEmailDelivery } from "../utils/invite-email-delivery.js";

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

test("Cross-organization workspace creation and listing rejected with 403", async () => {
  await withWorkspaceServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const userId = "00000000-0000-0000-0000-000000000101";
    const orgA = "00000000-0000-0000-0000-000000000001";
    const orgB = "00000000-0000-0000-0000-000000000002";
    const tokenOrgA = await createToken(userId, orgA);

    // 1. Attempt to create workspace in Org B using token scoped to Org A -> 403
    const crossCreateRes = await fetch(`${base}/v1/orgs/${orgB}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenOrgA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Hacked Org B Workspace",
        slug: "hacked-org-b",
      }),
    });
    assert.equal(crossCreateRes.status, 403);

    // 2. Attempt to list workspaces in Org B using token scoped to Org A -> 403
    const crossListRes = await fetch(`${base}/v1/orgs/${orgB}/workspaces`, {
      headers: { authorization: `Bearer ${tokenOrgA}` },
    });
    assert.equal(crossListRes.status, 403);
  });
});

test("Owner spoofing prevention: submitted ownerUserId in body is ignored", async () => {
  await withWorkspaceServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const realActorId = "00000000-0000-0000-0000-000000000101";
    const spoofedUserId = "00000000-0000-0000-0000-000000000999";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const token = await createToken(realActorId, orgId);

    // Submit request with spoofed ownerUserId in JSON body
    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Spoof Test Workspace",
        slug: "spoof-test",
        ownerUserId: spoofedUserId,
      }),
    });
    assert.equal(createRes.status, 201);
    const body = (await createRes.json()) as { workspace: { id: string } };

    // Verify members list: real actor is owner, spoofed user is NOT in members
    const membersRes = await fetch(`${base}/v1/workspaces/${body.workspace.id}/members`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(membersRes.status, 200);
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    assert.equal(membersBody.members.length, 1);
    assert.equal(membersBody.members[0].userId, realActorId);
    assert.equal(membersBody.members[0].role, "owner");
    assert.ok(!membersBody.members.some((m) => m.userId === spoofedUserId));
  });
});

test("Task 3: Sole-owner demotion and removal fail with 409 Conflict", async () => {
  await withWorkspaceServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerUserId = "00000000-0000-0000-0000-000000000101";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const token = await createToken(ownerUserId, orgId);

    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Sole Owner Protection",
        slug: "sole-owner-protection",
      }),
    });
    assert.equal(createRes.status, 201);
    const { workspace } = (await createRes.json()) as { workspace: { id: string } };

    // 1. Sole owner attempts to demote self -> 409 Conflict
    const demoteRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerUserId}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    });
    assert.equal(demoteRes.status, 409);
    const demoteErr = (await demoteRes.json()) as { error: { message: string } };
    assert.match(demoteErr.error.message, /Cannot demote the only workspace owner/i);

    // 2. Sole owner attempts to remove self -> 409 Conflict
    const removeRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerUserId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(removeRes.status, 409);
    const removeErr = (await removeRes.json()) as { error: { message: string } };
    assert.match(removeErr.error.message, /Cannot remove the only workspace owner/i);
  });
});

test("Task 3: Concurrent mutual removal cannot leave zero owners", async () => {
  await withWorkspaceServer(async ({ port, createToken, store }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerA = "00000000-0000-0000-0000-000000000101";
    const ownerB = "00000000-0000-0000-0000-000000000102";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const tokenA = await createToken(ownerA, orgId);
    const tokenB = await createToken(ownerB, orgId);

    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Concurrency Test Workspace",
        slug: "concurrency-test",
      }),
    });
    assert.equal(createRes.status, 201);
    const { workspace } = (await createRes.json()) as { workspace: { id: string } };

    // Add ownerB as a second owner
    store.addMemberForTesting(workspace.id, ownerB, "owner");

    // Concurrent mutual removal: Owner A removes Owner B, while Owner B removes Owner A
    const [resA, resB] = await Promise.all([
      fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerB}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${tokenA}` },
      }),
      fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerA}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${tokenB}` },
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // One must succeed (200) and the second must fail (403 because removed or 409 if mutual collision)
    assert.equal(statuses[0], 200);
    assert.ok(statuses[1] === 409 || statuses[1] === 403);

    // Verify members list: exactly one owner remains
    const activeToken = resA.status === 200 ? tokenA : tokenB;
    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${activeToken}` },
    });
    assert.equal(membersRes.status, 200);
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    assert.equal(membersBody.members.length, 1);
    assert.equal(membersBody.members[0].role, "owner");
  });
});

test("Task 3: Concurrent demotion of both owners serializes and fails with 409 Conflict on the second", async () => {
  await withWorkspaceServer(async ({ port, createToken, store }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerA = "00000000-0000-0000-0000-000000000101";
    const ownerB = "00000000-0000-0000-0000-000000000102";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const tokenA = await createToken(ownerA, orgId);

    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Concurrent Demotion Workspace",
        slug: "concurrent-demotion",
      }),
    });
    assert.equal(createRes.status, 201);
    const { workspace } = (await createRes.json()) as { workspace: { id: string } };

    store.addMemberForTesting(workspace.id, ownerB, "owner");

    // Owner A sends concurrent requests to demote Owner A and demote Owner B
    const [res1, res2] = await Promise.all([
      fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerA}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: "admin" }),
      }),
      fetch(`${base}/v1/workspaces/${workspace.id}/members/${ownerB}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: "admin" }),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 409]);

    // Verify members list: exactly one owner remains
    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    const owners = membersBody.members.filter((m) => m.role === "owner");
    assert.equal(owners.length, 1);
  });
});

test("Task 3: Atomic ownership transfer promotes new owner and demotes current owner", async () => {
  await withWorkspaceServer(async ({ port, createToken, store }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerUserId = "00000000-0000-0000-0000-000000000101";
    const memberUserId = "00000000-0000-0000-0000-000000000102";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const ownerToken = await createToken(ownerUserId, orgId);
    const memberToken = await createToken(memberUserId, orgId);

    const createRes = await fetch(`${base}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Transfer Ownership Workspace",
        slug: "transfer-ownership-test",
      }),
    });
    assert.equal(createRes.status, 201);
    const { workspace } = (await createRes.json()) as { workspace: { id: string } };

    // Add memberUserId as developer
    store.addMemberForTesting(workspace.id, memberUserId, "developer");

    // Non-owner (developer) cannot transfer ownership -> 403 Forbidden
    const unauthTransfer = await fetch(`${base}/v1/workspaces/${workspace.id}/transfer-ownership`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${memberToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ newOwnerUserId: memberUserId }),
    });
    assert.equal(unauthTransfer.status, 403);

    // Owner transfers ownership to member
    const transferRes = await fetch(`${base}/v1/workspaces/${workspace.id}/transfer-ownership`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ newOwnerUserId: memberUserId }),
    });
    assert.equal(transferRes.status, 200);
    const transferBody = (await transferRes.json()) as {
      previous_owner: { userId: string; role: string };
      new_owner: { userId: string; role: string };
    };
    assert.equal(transferBody.previous_owner.userId, ownerUserId);
    assert.equal(transferBody.previous_owner.role, "admin");
    assert.equal(transferBody.new_owner.userId, memberUserId);
    assert.equal(transferBody.new_owner.role, "owner");

    // Verify members list reflects the change
    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    const oldOwner = membersBody.members.find((m) => m.userId === ownerUserId);
    const newOwner = membersBody.members.find((m) => m.userId === memberUserId);
    assert.equal(oldOwner?.role, "admin");
    assert.equal(newOwner?.role, "owner");
  });
});

test("Workspace invitation lifecycle: create, verify, resend, wrong-user rejection, and single-use acceptance", async () => {
  await withWorkspaceServer(async ({ port, createToken, store }) => {
    const base = `http://127.0.0.1:${port}`;
    const ownerUserId = "00000000-0000-0000-0000-000000000201";
    const orgId = "00000000-0000-0000-0000-000000000001";
    const ownerToken = await createToken(ownerUserId, orgId, "owner@example.com");

    const invitedEmail = "colleague@example.com";
    const wrongEmail = "intruder@example.com";
    const memberUserId = "00000000-0000-0000-0000-000000000202";
    const wrongUserId = "00000000-0000-0000-0000-000000000203";

    inviteEmailDelivery.clearCaptured();

    // 1. Create workspace
    const { workspace } = await store.createWorkspace({
      name: "Collab Org",
      slug: "collab-org",
      orgId,
      ownerUserId,
    });

    // 2. Create invite as owner
    const createInviteRes = await fetch(`${base}/v1/workspaces/${workspace.id}/invites`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: invitedEmail,
        role: "developer",
      }),
    });
    assert.equal(createInviteRes.status, 201);
    const createInviteBody = (await createInviteRes.json()) as {
      invite: { id: string; email: string; role: string };
      raw_token: string;
    };
    const inviteId = createInviteBody.invite.id;
    const initialRawToken = createInviteBody.raw_token;
    assert.ok(initialRawToken);
    assert.equal(createInviteBody.invite.email, invitedEmail);

    // Verify email was captured
    const sentEmail = inviteEmailDelivery.getLastEmail();
    assert.ok(sentEmail);
    assert.equal(sentEmail.to, invitedEmail);
    assert.ok(sentEmail.url.includes(initialRawToken));

    // 3. Verify invite token via public endpoint
    const verifyInitialRes = await fetch(`${base}/v1/invites/verify?token=${initialRawToken}`);
    assert.equal(verifyInitialRes.status, 200);
    const verifyInitialBody = (await verifyInitialRes.json()) as {
      valid: boolean;
      workspace: { id: string; name: string };
      email: string;
      role: string;
    };
    assert.equal(verifyInitialBody.valid, true);
    assert.equal(verifyInitialBody.workspace.id, workspace.id);
    assert.equal(verifyInitialBody.email, invitedEmail);
    assert.equal(verifyInitialBody.role, "developer");

    // 4. Resend invite -> produces new token, invalidates old token
    const resendRes = await fetch(`${base}/v1/workspaces/${workspace.id}/invites/${inviteId}/resend`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
        "content-type": "application/json",
      },
    });
    assert.equal(resendRes.status, 200);
    const resendBody = (await resendRes.json()) as {
      invite: { id: string };
      raw_token: string;
    };
    const newRawToken = resendBody.raw_token;
    assert.notEqual(newRawToken, initialRawToken);

    // Verifying old token should now fail
    const verifyOldRes = await fetch(`${base}/v1/invites/verify?token=${initialRawToken}`);
    assert.equal(verifyOldRes.status, 400);

    // Verifying new token succeeds
    const verifyNewRes = await fetch(`${base}/v1/invites/verify?token=${newRawToken}`);
    assert.equal(verifyNewRes.status, 200);

    // 5. Wrong-user redemption -> 403 Forbidden
    const wrongUserToken = await createToken(wrongUserId, orgId, wrongEmail);
    const wrongAcceptRes = await fetch(`${base}/v1/invites/accept`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${wrongUserToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: newRawToken }),
    });
    assert.equal(wrongAcceptRes.status, 403);

    // 6. Valid user redemption -> succeeds and adds member
    const validUserToken = await createToken(memberUserId, orgId, invitedEmail);
    const validAcceptRes = await fetch(`${base}/v1/invites/accept`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${validUserToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: newRawToken }),
    });
    assert.equal(validAcceptRes.status, 200);
    const validAcceptBody = (await validAcceptRes.json()) as {
      workspace: { id: string; name: string };
      membership: { userId: string; role: string };
    };
    assert.equal(validAcceptBody.workspace.id, workspace.id);
    assert.equal(validAcceptBody.membership.userId, memberUserId);
    assert.equal(validAcceptBody.membership.role, "developer");

    // Verify member is in the workspace
    const membersRes = await fetch(`${base}/v1/workspaces/${workspace.id}/members`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const membersBody = (await membersRes.json()) as { members: Array<{ userId: string; role: string }> };
    const acceptedMember = membersBody.members.find((m) => m.userId === memberUserId);
    assert.ok(acceptedMember);
    assert.equal(acceptedMember.role, "developer");

    // 7. Re-accepting already accepted invite -> 409 Conflict
    const reAcceptRes = await fetch(`${base}/v1/invites/accept`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${validUserToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: newRawToken }),
    });
    assert.equal(reAcceptRes.status, 409);
  });
});



