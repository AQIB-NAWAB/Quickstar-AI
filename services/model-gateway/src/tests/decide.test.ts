import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authHeaders, withModelGatewayServer } from "../helpers/test-app.js";

describe("model-gateway decide", () => {
  it("returns validation error when OpenRouter key missing", async () => {
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/decide`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-decide-1",
          state: "user asked for refund",
          questions: [
            {
              id: "urgency",
              type: "choice",
              instructions: "How urgent?",
              options: ["low", "high"],
            },
          ],
        }),
      });
      assert.equal(response.status, 400);
    });
  });
});
