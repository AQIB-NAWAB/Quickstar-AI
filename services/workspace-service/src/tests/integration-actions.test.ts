import assert from "node:assert/strict";
import test from "node:test";
import { executeIntegrationAction } from "../integrations/integration-actions.js";

type Call = { url: string; method?: string; auth?: string; body: string };

const connection = {
  accountIdentifier: "acme.zendesk.com",
  accountName: "Acme Support",
  metadata: { subdomain: "acme", phone_numbers: [{ phone_number: "+14155550100" }] },
};

async function withFetch(
  handler: (call: Call) => { status: number; body: unknown },
  run: (calls: Call[]) => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(url),
      method: init?.method,
      auth: (init?.headers as Record<string, string> | undefined)?.authorization,
      body: String(init?.body ?? ""),
    };
    calls.push(call);
    const response = handler(call);
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test("Slack post_message sends the channel and text", async () => {
  await withFetch(
    () => ({ status: 200, body: { ok: true, ts: "123.45", channel: "C1" } }),
    async (calls) => {
      const result = await executeIntegrationAction({
        provider: "slack",
        action: "post_message",
        input: { channel: "C1", text: "New handoff" },
        accessToken: "slack-token",
        credentials: {},
        connection,
      });
      assert.equal(result.ok, true);
      assert.equal(calls[0].url, "https://slack.com/api/chat.postMessage");
      assert.equal(calls[0].auth, "Bearer slack-token");
      assert.deepEqual(JSON.parse(calls[0].body), { channel: "C1", text: "New handoff" });
    },
  );
});

test("Zendesk create_ticket uses the stored subdomain", async () => {
  await withFetch(
    () => ({ status: 201, body: { ticket: { id: 42, status: "new", subject: "Refund" } } }),
    async (calls) => {
      const result = await executeIntegrationAction({
        provider: "zendesk",
        action: "create_ticket",
        input: {
          subject: "Refund",
          description: "Customer wants a refund",
          requester_email: "alex@example.com",
        },
        accessToken: "zendesk-token",
        credentials: {},
        connection,
      });
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.data.ticket_id, 42);
      assert.equal(calls[0].url, "https://acme.zendesk.com/api/v2/tickets.json");
      const body = JSON.parse(calls[0].body) as {
        ticket: { subject: string; requester: { email: string } };
      };
      assert.equal(body.ticket.subject, "Refund");
      assert.equal(body.ticket.requester.email, "alex@example.com");
    },
  );
});

test("Twilio send_sms uses stored credentials and the first number", async () => {
  await withFetch(
    () => ({ status: 201, body: { sid: "SM1", status: "queued" } }),
    async (calls) => {
      const result = await executeIntegrationAction({
        provider: "twilio",
        action: "send_sms",
        input: { to: "+14155550111", body: "Your appointment is confirmed." },
        credentials: { accountSid: "AC1", authToken: "secret" },
        connection,
      });
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.data.message_sid, "SM1");
      assert.equal(
        calls[0].url,
        "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json",
      );
      assert.match(calls[0].auth ?? "", /^Basic /);
      const params = new URLSearchParams(calls[0].body);
      assert.equal(params.get("To"), "+14155550111");
      assert.equal(params.get("From"), "+14155550100");
      assert.equal(params.get("Body"), "Your appointment is confirmed.");
    },
  );
});

test("a disconnected integration is reported as a business precondition", async () => {
  const result = await executeIntegrationAction({
    provider: "slack",
    action: "post_message",
    input: { channel: "C1", text: "Hello" },
    credentials: {},
    connection: { accountIdentifier: null, accountName: null, metadata: {} },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.notConnected, true);
    assert.match(result.error, /not connected/);
  }
});
