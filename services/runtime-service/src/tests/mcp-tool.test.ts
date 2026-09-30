import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { AgentMcpToolDefinition } from "@quickstart/contracts";
import { McpToolRunner } from "../services/mcp-tool-runner.js";

test("McpToolRunner calls mock MCP HTTP server", async () => {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const parsed = JSON.parse(body) as { params?: { name?: string } };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ result: { content: `ok:${parsed.params?.name}` } }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const tool: AgentMcpToolDefinition = {
    id: "mcp-1",
    name: "mcp_ping",
    type: "mcp",
    description: "Ping MCP",
    server_url: `http://127.0.0.1:${port}/mcp`,
    allowed_tool_names: ["echo"],
  };

  const runner = new McpToolRunner(5_000);
  const result = await runner.run(tool, { mcp_tool_name: "echo", msg: "hi" }, {
    timeoutMs: 5_000,
    requestId: "req-mcp-1",
  });

  assert.equal(result.status, "succeeded");
  assert.match(result.content, /echo/);

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
