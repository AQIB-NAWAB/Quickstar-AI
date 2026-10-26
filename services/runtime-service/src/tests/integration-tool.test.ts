import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { IntegrationClient } from "../clients/integration.client.js";
import { ToolExecutor } from "../services/tool-executor.js";
import type { AgentToolDefinition } from "@quickstart/contracts";

const tool: AgentToolDefinition = {
  id: "zendesk-ticket",
  name: "create_support_ticket",
  description: "Create a support ticket",
  type: "builtin_integration",
  provider: "zendesk",
  action: "create_ticket",
};

async function withServer(
  response: { status: number; body: unknown },
  run: (baseUrl: string, received: Array<{ url?: string; body: Record<string, unknown> }>) => Promise<void>,
): Promise<void> {
  const received: Array<{ url?: string; body: Record<string, unknown> }> = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({
        url: req.url,
        body: JSON.parse(body || "{}") as Record<string, unknown>,
      });
      res.statusCode = response.status;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(response.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    await run(`http://127.0.0.1:${port}`, received);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("integration tool forwards provider, action, and arguments", async () => {
  await withServer(
    {
      status: 200,
      body: { result: { ok: true, data: { ticket_id: 42, status: "new" } } },
    },
    async (baseUrl, received) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        new IntegrationClient(baseUrl, "workspace-internal"),
      );
      const result = await executor.execute(
        tool,
        { subject: "Refund", description: "Customer wants a refund" },
        {
          workspaceId: "ws-1",
          requestId: "req-1",
          toolCallKey: "call-1",
          timeoutMs: 2_000,
        },
      );
      assert.equal(result.ok, true);
      assert.equal(
        received[0].url,
        "/internal/workspaces/ws-1/integrations/zendesk/actions",
      );
      assert.equal(received[0].body.action, "create_ticket");
      assert.deepEqual(received[0].body.input, {
        subject: "Refund",
        description: "Customer wants a refund",
      });
      assert.match(String(result.content), /ticket_id/);
    },
  );
});

test("disconnected integration is surfaced without pretending success", async () => {
  await withServer(
    {
      status: 200,
      body: {
        result: {
          ok: false,
          notConnected: true,
          error: "zendesk is not connected for this workspace",
        },
      },
    },
    async (baseUrl) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        new IntegrationClient(baseUrl, "workspace-internal"),
      );
      const result = await executor.execute(
        tool,
        { subject: "Refund", description: "Customer wants a refund" },
        {
          workspaceId: "ws-1",
          requestId: "req-2",
          toolCallKey: "call-2",
          timeoutMs: 2_000,
        },
      );
      assert.equal(result.ok, true);
      assert.match(String(result.content), /integration_not_connected/);
      assert.match(String(result.content), /Apologize/);
    },
  );
});
