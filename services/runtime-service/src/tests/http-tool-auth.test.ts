import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { ToolExecutor } from "../services/tool-executor.js";
import { SecretsClient } from "../clients/secrets.client.js";
import type { AgentToolDefinition } from "@quickstart/contracts";

test("http tool injects static headers and secret-backed bearer auth", async () => {
  const received: Array<{ auth?: string; client?: string; url?: string }> = [];
  const target = http.createServer((req, res) => {
    received.push({
      auth: req.headers.authorization,
      client: req.headers["x-client"] as string | undefined,
      url: req.url,
    });
    res.setHeader("content-type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((resolve) => target.listen(0, "127.0.0.1", resolve));
  const targetPort = (target.address() as { port: number }).port;

  const secrets = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, "Bearer internal-token");
    res.setHeader("content-type", "application/json");
    res.statusCode = 200;
    res.end(JSON.stringify({ request_id: "r", value: "super-secret" }));
  });
  await new Promise<void>((resolve) => secrets.listen(0, "127.0.0.1", resolve));
  const secretsPort = (secrets.address() as { port: number }).port;

  try {
    const executor = new ToolExecutor(
      undefined,
      undefined,
      new SecretsClient({
        baseUrl: `http://127.0.0.1:${secretsPort}`,
        internalToken: "internal-token",
        timeoutMs: 1000,
      }),
    );
    const tool: AgentToolDefinition = {
      id: "custom:http-auth",
      name: "lookup_order",
      description: "Look up an order",
      type: "http",
      method: "GET",
      base_url: `http://127.0.0.1:${targetPort}`,
      allowed_hosts: ["127.0.0.1"],
      path_template: "/orders/{order_id}",
      headers: { "x-client": "quickstart" },
      auth: { type: "bearer_secret", secret_name: "ORDER_API_TOKEN" },
    };
    const result = await executor.execute(
      tool,
      { order_id: "abc-123" },
      { workspaceId: "ws-1", requestId: "req-1", toolCallKey: "key-1", timeoutMs: 1000 },
    );
    assert.equal(result.ok, true);
    assert.equal(received.length, 1);
    assert.equal(received[0].auth, "Bearer super-secret");
    assert.equal(received[0].client, "quickstart");
    assert.equal(received[0].url, "/orders/abc-123");
  } finally {
    await new Promise<void>((resolve) => target.close(() => resolve()));
    await new Promise<void>((resolve) => secrets.close(() => resolve()));
  }
});

test("http tool without secrets client fails gracefully on bearer_secret auth", async () => {
  const executor = new ToolExecutor();
  const tool: AgentToolDefinition = {
    id: "custom:http-auth-missing",
    name: "authed",
    description: "Authed call",
    type: "http",
    method: "GET",
    base_url: "http://127.0.0.1:1",
    allowed_hosts: ["127.0.0.1"],
    auth: { type: "bearer_secret", secret_name: "X" },
  };
  const result = await executor.execute(
    tool,
    {},
    { workspaceId: "ws-1", requestId: "req-1", toolCallKey: "key-1", timeoutMs: 1000 },
  );
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "SECRETS_UNAVAILABLE");
});

test("http tool rejects hosts outside the allow-list even with auth", async () => {
  const executor = new ToolExecutor();
  const tool: AgentToolDefinition = {
    id: "custom:http-ssrf",
    name: "evil",
    description: "Blocked call",
    type: "http",
    method: "GET",
    base_url: "http://127.0.0.1:9",
    allowed_hosts: ["api.example.com"],
  };
  const result = await executor.execute(
    tool,
    {},
    { workspaceId: "ws-1", requestId: "req-1", toolCallKey: "key-1", timeoutMs: 1000 },
  );
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "VALIDATION_FAILED");
});
