import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetFakeProviderState } from "../providers/fake.provider.js";
import { authHeaders, withModelGatewayServer } from "../helpers/test-app.js";

describe("model-gateway stream", () => {
  it("streams tokens then done event", async () => {
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/stream`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-stream-1",
          model: { profile: "fake", model_id: "fake" },
          messages: [{ role: "user", content: "stream" }],
        }),
      });
      assert.equal(response.status, 200);
      const text = await response.text();
      assert.match(text, /event: token/);
      assert.match(text, /event: done/);
      assert.match(text, /fake-reply/);
    });
  });

  it("does not restart completion after tokens started on failure", async () => {
    resetFakeProviderState();
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/stream`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-stream-fail",
          model: { profile: "fake", model_id: "fake:stream-fail-after" },
          messages: [{ role: "user", content: "x" }],
        }),
      });
      assert.equal(response.status, 200);
      const text = await response.text();
      const tokenEvents = text.split("event: token").length - 1;
      assert.equal(tokenEvents, 1);
      assert.match(text, /event: error/);
      assert.ok(!text.includes("fake-reply"));
    });
  });
});
