import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { ToolExecutor } from "../services/tool-executor.js";
import type { AgentToolDefinition } from "@quickstart/contracts";

test("lead tool pins workspace, forwards caller authorization and uses stable idempotency", async () => {
  const received: Array<{
    url: string | undefined;
    auth: string | undefined;
    key: string | undefined;
    body: string;
  }> = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({
        url: req.url,
        auth: req.headers.authorization,
        key: req.headers["idempotency-key"] as string,
        body,
      });
      res.setHeader("content-type", "application/json");
      res.statusCode = 202;
      res.end(JSON.stringify({ run: { id: "run" } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const previous = process.env.LEAD_GENERATION_URL;
  process.env.LEAD_GENERATION_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const executor = new ToolExecutor();
    const tool: AgentToolDefinition = {
      id: "lead-start",
      name: "start_research",
      description: "Start research",
      type: "builtin_leads",
      action: "start",
    };
    const result = await executor.execute(
      tool,
      { categories: ["clinics"], workspace_id: "attacker-workspace" },
      {
        workspaceId: "authorized-workspace",
        authorization: "Bearer caller-token",
        requestId: "request-1",
        toolCallKey: "stable-key",
        timeoutMs: 1000,
      },
    );
    assert.equal(result.ok, true);
    assert.equal(received[0].url, "/v1/workspaces/authorized-workspace/lead-generation/runs");
    assert.equal(received[0].auth, "Bearer caller-token");
    assert.equal(received[0].key, "stable-key");
    const denied = await executor.execute(
      tool,
      {},
      {
        workspaceId: "authorized-workspace",
        requestId: "request-2",
        toolCallKey: "key-2",
        timeoutMs: 1000,
      },
    );
    assert.equal(denied.errorCode, "UNAUTHORIZED");
    assert.equal(received.length, 1);
  } finally {
    if (previous === undefined) delete process.env.LEAD_GENERATION_URL;
    else process.env.LEAD_GENERATION_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
