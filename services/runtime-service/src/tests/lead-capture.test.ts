import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { LeadClient } from "../clients/lead.client.js";
import { ToolExecutor } from "../services/tool-executor.js";
import type { AgentToolDefinition } from "@quickstart/contracts";

type Received = { url?: string; auth?: string; body: string };

async function withLeadServer(
  handler: (received: Received) => { status: number; body: unknown },
  run: (baseUrl: string, received: Received[]) => Promise<void>,
): Promise<void> {
  const received: Received[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const entry = {
        url: req.url,
        auth: req.headers.authorization,
        body,
      };
      received.push(entry);
      const response = handler(entry);
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

test("lead capture saves a qualified lead with conversation and idempotency", async () => {
  await withLeadServer(
    () => ({ status: 201, body: { lead: { id: "lead-1" }, created: true } }),
    async (baseUrl, received) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        new LeadClient(baseUrl, "internal-token"),
      );
      const tool: AgentToolDefinition = {
        id: "capture",
        name: "save_qualified_lead",
        description: "Save a qualified lead",
        type: "builtin_leads",
        action: "capture",
      };
      const incomplete = await executor.execute(
        tool,
        { intent: "Interested in the product" },
        {
          workspaceId: "ws-1",
          requestId: "req-0",
          toolCallKey: "call-key-0",
          timeoutMs: 2_000,
        },
      );
      assert.equal(incomplete.ok, false);
      assert.equal(received.length, 0);

      const result = await executor.execute(
        tool,
        {
          name: "Alex Morgan",
          email: "alex@example.com",
          phone: "+14155550100",
          intent: "Follow up with new enquiries",
          qualification_score: 82,
          captured_fields: { weekly_enquiries: "around 50", timeline: "this month" },
        },
        {
          workspaceId: "ws-1",
          requestId: "req-1",
          toolCallKey: "call-key-1",
          timeoutMs: 2_000,
          conversationId: "conv-1",
        },
      );

      assert.equal(result.ok, true);
      assert.equal(received[0].url, "/internal/v1/workspaces/ws-1/leads/upsert");
      assert.equal(received[0].auth, "Bearer internal-token");
      const body = JSON.parse(received[0].body) as Record<string, unknown>;
      assert.equal(body.status, "qualified");
      assert.equal(body.source, "agent");
      assert.equal(body.conversation_id, "conv-1");
      assert.equal(body.idempotency_key, "call-key-1");
      assert.equal(body.qualification_score, 82);
      assert.deepEqual(body.captured_fields, {
        weekly_enquiries: "around 50",
        timeline: "this month",
      });
      assert.match(String(result.content), /lead_saved/);
    },
  );
});

test("callback request stores the preferred time and requires a phone", async () => {
  await withLeadServer(
    () => ({ status: 201, body: { lead: { id: "lead-2" }, created: true } }),
    async (baseUrl, received) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        new LeadClient(baseUrl, "internal-token"),
      );
      const tool: AgentToolDefinition = {
        id: "callback",
        name: "request_callback",
        description: "Request a callback",
        type: "builtin_leads",
        action: "request_callback",
      };
      const missing = await executor.execute(
        tool,
        { callback_at: "2026-11-03T15:00:00Z" },
        {
          workspaceId: "ws-1",
          requestId: "req-2",
          toolCallKey: "call-key-2",
          timeoutMs: 2_000,
        },
      );
      assert.equal(missing.ok, false);
      assert.equal(received.length, 0);

      const result = await executor.execute(
        tool,
        {
          name: "Alex Morgan",
          phone: "+14155550100",
          callback_at: "2026-11-03T15:00:00Z",
          reason: "Wants pricing for 50 weekly enquiries",
        },
        {
          workspaceId: "ws-1",
          requestId: "req-3",
          toolCallKey: "call-key-3",
          timeoutMs: 2_000,
          conversationId: "conv-2",
        },
      );
      assert.equal(result.ok, true);
      const body = JSON.parse(received[0].body) as Record<string, unknown>;
      assert.equal(body.source, "agent_callback");
      assert.equal(body.status, "qualified");
      assert.equal(
        (body.captured_fields as Record<string, unknown>).callback_at,
        "2026-11-03T15:00:00Z",
      );
      assert.match(String(body.notes), /Callback requested/);
      assert.match(String(result.content), /callback_requested/);
    },
  );
});
