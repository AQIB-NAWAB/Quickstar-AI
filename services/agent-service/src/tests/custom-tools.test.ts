import assert from "node:assert/strict";
import test from "node:test";
import { withAgentServer } from "../helpers/test-app.js";

const WS_A = "00000000-0000-4000-8000-0000000000a1";
const USER = "00000000-0000-0000-0000-00000000000a";

const HTTP_TOOL = {
  name: "order_lookup",
  description: "Look up an order by id",
  kind: "http",
  config: {
    method: "POST",
    base_url: "https://api.example.com",
    allowed_hosts: ["api.example.com"],
    path_template: "/orders/{order_id}",
    headers: { "x-client": "quickstart" },
    auth: { type: "bearer_secret", secret_name: "EXAMPLE_API_TOKEN" },
    timeout_ms: 15_000,
    idempotent: true,
  },
};

const MCP_TOOL = {
  name: "ticketing",
  description: "Create tickets in the helpdesk",
  kind: "mcp",
  config: {
    server_url: "https://mcp.example.com/sse",
    allowed_tool_names: ["create_ticket", "list_tickets"],
  },
};

async function createTool(base: string, token: string, body: unknown, workspace = WS_A) {
  return fetch(`${base}/v1/workspaces/${workspace}/custom-tools`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("create, list, update, and delete custom tools", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const createRes = await createTool(base, token, HTTP_TOOL);
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as {
      tool: { id: string; name: string; kind: string };
    };
    assert.equal(created.tool.name, "order_lookup");
    assert.equal(created.tool.kind, "http");

    const mcpRes = await createTool(base, token, MCP_TOOL);
    assert.equal(mcpRes.status, 201);

    const listRes = await fetch(`${base}/v1/workspaces/${WS_A}/custom-tools`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const list = (await listRes.json()) as { tools: { id: string }[] };
    assert.equal(list.tools.length, 2);

    const updateRes = await fetch(`${base}/v1/workspaces/${WS_A}/custom-tools/${created.tool.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ description: "Updated description" }),
    });
    assert.equal(updateRes.status, 200);
    const updated = (await updateRes.json()) as { tool: { description: string } };
    assert.equal(updated.tool.description, "Updated description");

    const deleteRes = await fetch(`${base}/v1/workspaces/${WS_A}/custom-tools/${created.tool.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(deleteRes.status, 200);

    const getRes = await fetch(`${base}/v1/workspaces/${WS_A}/custom-tools/${created.tool.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.status, 404);
  });
});

test("duplicate custom tool name returns 409", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    assert.equal((await createTool(base, token, HTTP_TOOL)).status, 201);
    assert.equal((await createTool(base, token, HTTP_TOOL)).status, 409);
  });
});

test("custom tool validation rejects private hosts and forbidden headers", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);

    const privateHost = await createTool(base, token, {
      ...HTTP_TOOL,
      config: { ...HTTP_TOOL.config, base_url: "https://127.0.0.1", allowed_hosts: ["127.0.0.1"] },
    });
    assert.equal(privateHost.status, 400);

    const forbiddenHeader = await createTool(base, token, {
      ...HTTP_TOOL,
      config: { ...HTTP_TOOL.config, headers: { authorization: "Bearer nope" } },
    });
    assert.equal(forbiddenHeader.status, 400);

    const badSecret = await createTool(base, token, {
      ...HTTP_TOOL,
      config: { ...HTTP_TOOL.config, auth: { type: "bearer_secret", secret_name: "bad name!" } },
    });
    assert.equal(badSecret.status, 400);

    const badKind = await createTool(base, token, { ...HTTP_TOOL, kind: "webhook" });
    assert.equal(badKind.status, 400);
  });
});

test("custom tool created in one workspace is not visible in another", async () => {
  await withAgentServer(async ({ port, createToken }) => {
    const base = `http://127.0.0.1:${port}`;
    const token = await createToken(USER);
    const WS_B = "00000000-0000-4000-8000-0000000000b2";

    const createRes = await createTool(base, token, HTTP_TOOL);
    assert.equal(createRes.status, 201);
    const { tool } = (await createRes.json()) as { tool: { id: string } };

    const other = await fetch(`${base}/v1/workspaces/${WS_B}/custom-tools`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const list = (await other.json()) as { tools: unknown[] };
    assert.equal(list.tools.length, 0);

    const cross = await fetch(`${base}/v1/workspaces/${WS_B}/custom-tools/${tool.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(cross.status, 404);
  });
});
