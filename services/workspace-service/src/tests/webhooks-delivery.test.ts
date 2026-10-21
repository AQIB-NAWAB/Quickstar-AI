import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { WebhooksService } from "../services/webhooks.service.js";
import type {
  WebhooksRepository,
  WebhookDeliveryAttemptRow,
  WebhookDeliveryRow,
  WebhookEndpointRow,
} from "../repository/webhooks.repository.js";

const VALID_WORKSPACE = "a0000000-0000-4000-a000-000000000001";
const ENDPOINT_ID = "e0000000-0000-4000-a000-000000000001";

function createMockRepository(opts: {
  endpoints?: WebhookEndpointRow[];
  deliveries?: (WebhookDeliveryRow & { attempts?: WebhookDeliveryAttemptRow[] })[];
} = {}): WebhooksRepository {
  const endpoints = opts.endpoints ?? [];
  const deliveries = opts.deliveries ?? [];

  return {
    listEndpoints: async (wsId: string) => endpoints.filter((e) => e.workspace_id === wsId),
    getEndpoint: async (wsId: string, epId: string) => endpoints.find((e) => e.workspace_id === wsId && e.id === epId) ?? null,
    createEndpoint: async (data: any) => {
      const row: WebhookEndpointRow = {
        id: "new-endpoint-id",
        workspace_id: data.workspaceId,
        url: data.url,
        events: data.events,
        signing_secret: data.signingSecret,
        status: "active",
        consecutive_failures: 0,
        last_delivery_at: null,
        last_delivery_status: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      endpoints.push(row);
      return row;
    },
    updateEndpoint: async (wsId: string, epId: string, data: any) => {
      const ep = endpoints.find((e) => e.workspace_id === wsId && e.id === epId);
      if (!ep) return null;
      if (data.url) ep.url = data.url;
      if (data.events) ep.events = data.events;
      if (data.status) ep.status = data.status;
      ep.updated_at = new Date();
      return ep;
    },
    updateSigningSecret: async (wsId: string, epId: string, secret: string) => {
      const ep = endpoints.find((e) => e.workspace_id === wsId && e.id === epId);
      if (!ep) return null;
      ep.signing_secret = secret;
      ep.updated_at = new Date();
      return ep;
    },
    deleteEndpoint: async (wsId: string, epId: string) => {
      const idx = endpoints.findIndex((e) => e.workspace_id === wsId && e.id === epId);
      if (idx === -1) return false;
      endpoints.splice(idx, 1);
      return true;
    },
    listDeliveries: async (wsId: string, _opts: any) => {
      const filtered = deliveries.filter((d) => d.workspace_id === wsId);
      return { rows: filtered, total: filtered.length };
    },
    getDelivery: async (wsId: string, dId: string) => {
      return deliveries.find((d) => d.workspace_id === wsId && d.id === dId) ?? null;
    },
    createDeliveryAttempt: async (attempt: any) => {
      const delivery = deliveries.find((d) => d.id === attempt.deliveryId);
      if (delivery) {
        delivery.attempts_count = attempt.attemptNumber;
        delivery.last_http_status = attempt.httpStatus;
        delivery.last_latency_ms = attempt.latencyMs;
        delivery.last_error = attempt.error ?? null;
        delivery.status = attempt.outcome;
      }
      return {
        id: "att-new",
        delivery_id: attempt.deliveryId,
        attempt_number: attempt.attemptNumber,
        http_status: attempt.httpStatus,
        latency_ms: attempt.latencyMs,
        outcome: attempt.outcome,
        error: attempt.error ?? null,
        request_headers: attempt.requestHeaders,
        response_headers: attempt.responseHeaders,
        response_body: attempt.responseBody,
        occurred_at: new Date(),
      };
    },
    updateEndpointHealth: async (_endpointId: string, _status: string, _consecutiveFailures: number) => {},
  } as unknown as WebhooksRepository;
}

test("calculateSignature creates valid HMAC-SHA256 signature header matching Stripe scheme", () => {
  const service = new WebhooksService(createMockRepository());
  const secret = "whsec_live_test_secret_key_12345";
  const timestamp = 1715000000;
  const payload = JSON.stringify({ event: "agent.message", data: { text: "Hello" } });

  const signature = service.calculateSignature(secret, timestamp, payload);

  const expectedHmac = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedSignature = `t=${timestamp},v1=${expectedHmac}`;

  assert.equal(signature, expectedSignature);
  assert.ok(signature.startsWith(`t=${timestamp},v1=`));
});

test("createEndpoint generates whsec_live_ prefixed signing secret and validates URL", async () => {
  const service = new WebhooksService(createMockRepository());

  const result = await service.createEndpoint(VALID_WORKSPACE, {
    url: "https://api.acme.corp/webhooks/incoming",
    events: ["agent.published", "conversation.message_appended"],
  });

  assert.ok(result.signingSecret.startsWith("whsec_live_"), "Secret must start with whsec_live_");
  assert.ok(result.signingSecret.length > 20, "Secret must contain cryptographic entropy");
  assert.equal(result.endpoint.url, "https://api.acme.corp/webhooks/incoming");
  assert.deepEqual(result.endpoint.events, ["agent.published", "conversation.message_appended"]);
  assert.equal(result.endpoint.status, "active");
});

test("SSRF protection rejects localhost, loopback and private IP blocks in production", async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const service = new WebhooksService(createMockRepository());

    const badUrls = [
      "http://localhost:8080/hook",
      "http://127.0.0.1/hook",
      "https://127.0.0.1/hook",
      "https://10.0.0.5/hook",
      "https://192.168.1.1/hook",
      "https://169.254.169.254/latest/meta-data/",
    ];

    for (const url of badUrls) {
      await assert.rejects(
        async () =>
          service.createEndpoint(VALID_WORKSPACE, {
            url,
            events: ["agent.published"],
          }),
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
          return true;
        },
        `Expected ${url} to be rejected under production SSRF rules`,
      );
    }
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("rotateSecret updates signing secret and returns new key", async () => {
  const initialRow: WebhookEndpointRow = {
    id: ENDPOINT_ID,
    workspace_id: VALID_WORKSPACE,
    url: "https://example.com/webhook",
    events: ["*"],
    signing_secret: "whsec_live_old_secret",
    status: "active",
    consecutive_failures: 0,
    last_delivery_at: null,
    last_delivery_status: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const service = new WebhooksService(createMockRepository({ endpoints: [initialRow] }));

  const rotated = await service.rotateSecret(VALID_WORKSPACE, ENDPOINT_ID);
  assert.ok(rotated.signingSecret.startsWith("whsec_live_"));
  assert.notEqual(rotated.signingSecret, "whsec_live_old_secret");
});

test("redriveDelivery throws NOT_FOUND when delivery does not exist", async () => {
  const service = new WebhooksService(createMockRepository());

  await assert.rejects(
    async () => service.redriveDelivery(VALID_WORKSPACE, "non-existent-id"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.NOT_FOUND);
      return true;
    },
  );
});
