import assert from "node:assert/strict";
import test from "node:test";
import { serializeAuthContext, signAuthContext } from "@quickstart/auth";
import { withAgentServer } from "../helpers/test-app.js";

const workspaceA = "00000000-0000-4000-8000-0000000000a1";
const workspaceB = "00000000-0000-4000-8000-0000000000b2";

test("Task 1: Unsigned x-quickstart-auth-context header is rejected with 401", async () => {
  await withAgentServer(async ({ port }) => {
    const unsigned = Buffer.from(
      JSON.stringify({
        tenant_id: "org-1",
        actor_id: "spoofed-user-id",
        roles: ["admin"],
        request_id: "req-spoof-1",
        workspace_id: workspaceA,
      }),
    ).toString("base64url");

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${workspaceA}/agents`, {
      method: "GET",
      headers: {
        "x-quickstart-auth-context": unsigned,
      },
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { error?: { message?: string } };
    assert.match(body.error?.message ?? "", /Invalid or forged/);
  });
});

test("Task 1: Forged HMAC signature on x-quickstart-auth-context is rejected with 401", async () => {
  await withAgentServer(async ({ port, jwtSecret }) => {
    const valid = signAuthContext(
      {
        tenantId: "org-1",
        actorId: "victim-user-id",
        roles: ["admin"],
        requestId: "req-forge-1",
        workspaceId: workspaceA,
      },
      jwtSecret,
    );

    // Tamper with signature
    const parts = valid.split(".");
    parts[2] = Buffer.from("forged-hmac-signature").toString("base64url");
    const tampered = parts.join(".");

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${workspaceA}/agents`, {
      method: "GET",
      headers: {
        "x-quickstart-auth-context": tampered,
      },
    });

    assert.equal(res.status, 401);
  });
});

test("Task 1: Cross-workspace scoped auth-context is rejected with 403 Forbidden", async () => {
  await withAgentServer(async ({ port, jwtSecret }) => {
    // Context scoped to workspaceA
    const token = signAuthContext(
      {
        tenantId: "org-1",
        actorId: "legit-user-id",
        roles: ["admin"],
        requestId: "req-cross-ws",
        workspaceId: workspaceA,
      },
      jwtSecret,
    );

    // Attempting to use workspaceA's auth context to access workspaceB
    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${workspaceB}/agents`, {
      method: "GET",
      headers: {
        "x-quickstart-auth-context": token,
      },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { error?: { message?: string } };
    assert.match(body.error?.message ?? "", /Cross-workspace access rejected/);
  });
});

test("Task 1: Expired signed auth-context is rejected with 401", async () => {
  await withAgentServer(async ({ port, jwtSecret }) => {
    const expired = serializeAuthContext(
      {
        tenantId: "org-1",
        actorId: "user-id",
        roles: ["admin"],
        requestId: "req-expired",
        workspaceId: workspaceA,
        exp: Math.floor(Date.now() / 1000) - 120, // Expired 2 minutes ago
      },
      jwtSecret,
    );

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${workspaceA}/agents`, {
      method: "GET",
      headers: {
        "x-quickstart-auth-context": expired,
      },
    });

    assert.equal(res.status, 401);
  });
});

test("Task 1: Valid signed auth-context successfully authorizes request without Bearer token", async () => {
  await withAgentServer(async ({ port, jwtSecret }) => {
    const valid = signAuthContext(
      {
        tenantId: "org-1",
        actorId: "00000000-0000-4000-8000-000000000001",
        roles: ["admin"],
        requestId: "req-valid-1",
        workspaceId: workspaceA,
      },
      jwtSecret,
    );

    const res = await fetch(`http://127.0.0.1:${port}/v1/workspaces/${workspaceA}/agents`, {
      method: "GET",
      headers: {
        "x-quickstart-auth-context": valid,
      },
    });

    assert.equal(res.status, 200);
  });
});
