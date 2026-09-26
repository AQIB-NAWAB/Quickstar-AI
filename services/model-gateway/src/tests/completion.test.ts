import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetFakeProviderState } from "../providers/fake.provider.js";
import { authHeaders, withModelGatewayServer } from "../helpers/test-app.js";

describe("model-gateway complete", () => {
  it("returns fake completion with usage", async () => {
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-1",
          model: { profile: "fake", model_id: "fake" },
          messages: [{ role: "user", content: "hello" }],
        }),
      });
      assert.equal(response.status, 200);
      const json = (await response.json()) as {
        content: string;
        usage: { input_tokens: number; output_tokens: number };
        provider: string;
      };
      assert.match(json.content, /fake-reply:hello/);
      assert.equal(json.provider, "fake");
      assert.ok(json.usage.input_tokens > 0);
    });
  });

  it("rejects missing internal token", async () => {
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-2",
          model: { profile: "fake", model_id: "fake" },
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      assert.equal(response.status, 401);
    });
  });

  it("rejects workspace credential source", async () => {
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-3",
          credential_source: "workspace",
          credential_ref: "openai-key",
          model: { profile: "fake", model_id: "fake" },
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      assert.equal(response.status, 400);
    });
  });

  it("retries once on fake 429", async () => {
    resetFakeProviderState();
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-429",
          model: { profile: "fake", model_id: "fake:429-once" },
          messages: [{ role: "user", content: "retry" }],
        }),
      });
      assert.equal(response.status, 200);
    });
  });

  it("uses fallback when primary fails before tokens", async () => {
    resetFakeProviderState();
    await withModelGatewayServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-fallback",
          model: { profile: "fake", model_id: "fake:fail-before-tokens" },
          fallback_model: { profile: "fake", model_id: "fake" },
          messages: [{ role: "user", content: "fb" }],
        }),
      });
      assert.equal(response.status, 200);
      const json = (await response.json()) as { content: string };
      assert.match(json.content, /fake-reply/);
    });
  });

  it("returns timeout on hung fake provider", async () => {
    await withModelGatewayServer(
      async ({ baseUrl }) => {
        const response = await fetch(`${baseUrl}/internal/complete`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            workspace_id: "ws-1",
            request_id: "req-hang",
            model: { profile: "fake", model_id: "fake:hang" },
            messages: [{ role: "user", content: "wait" }],
          }),
        });
        assert.equal(response.status, 504);
      },
      { completionTimeoutMs: 200 },
    );
  });

  it("enforces in-flight cap", async () => {
    await withModelGatewayServer(
      async ({ baseUrl }) => {
        const body = JSON.stringify({
          workspace_id: "ws-1",
          request_id: "req-cap",
          model: { profile: "fake", model_id: "fake:hang" },
          messages: [{ role: "user", content: "cap" }],
        });
        const first = fetch(`${baseUrl}/internal/complete`, {
          method: "POST",
          headers: authHeaders(),
          body,
        });
        await new Promise((r) => setTimeout(r, 50));
        const second = await fetch(`${baseUrl}/internal/complete`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            workspace_id: "ws-1",
            request_id: "req-cap-2",
            model: { profile: "fake", model_id: "fake" },
            messages: [{ role: "user", content: "cap2" }],
          }),
        });
        assert.equal(second.status, 429);
        await first.catch(() => {});
      },
      { modelMaxInflight: 1, completionTimeoutMs: 500 },
    );
  });

  it("opens circuit after repeated failures", async () => {
    resetFakeProviderState();
    await withModelGatewayServer(
      async ({ baseUrl }) => {
        const payload = {
          workspace_id: "ws-1",
          request_id: "req-circuit",
          model: { profile: "fake", model_id: "fake:fail" },
          messages: [{ role: "user", content: "x" }],
        };
        for (let i = 0; i < 3; i++) {
          payload.request_id = `req-circuit-${i}`;
          const response = await fetch(`${baseUrl}/internal/complete`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload),
          });
          assert.ok(response.status >= 500);
        }
        const open = await fetch(`${baseUrl}/internal/complete`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            ...payload,
            request_id: "req-circuit-open",
          }),
        });
        assert.equal(open.status, 503);
      },
      { circuitFailureThreshold: 3 },
    );
  });

  it("does not log api key material", async () => {
    const secret = "sk-test-secret-key-never-log-12345";
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await withModelGatewayServer(
        async ({ baseUrl }) => {
          await fetch(`${baseUrl}/internal/complete`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              workspace_id: "ws-1",
              request_id: "req-log",
              model: { profile: "fake", model_id: "fake" },
              messages: [{ role: "user", content: "log" }],
            }),
          });
        },
        {
          providerProfiles: [
            { id: "fake", driver: "fake" },
            {
              id: "openai",
              driver: "openai_compatible",
              baseUrl: "https://example.invalid",
              apiKey: secret,
            },
          ],
        },
      );
    } finally {
      console.log = original;
    }
    const joined = lines.join("\n");
    assert.ok(!joined.includes(secret));
  });
});
