import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import test from "node:test";
import { AppError } from "@quickstart/errors";
import {
  TelnyxClient,
  parseTelnyxPublicKey,
  verifyTelnyxWebhookSignature,
} from "../telephony/telnyx/client.js";
import { FakeTelnyxClient } from "../telephony/telnyx/fake-client.js";
import { TelnyxProvider } from "../telephony/telnyx/provider.js";
import { resolveTelephonyProfile } from "../telephony/factory.js";

const keyPair = generateKeyPairSync("ed25519");
const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();

function signedHeaders(rawBody: string, timestampSec: number): Record<string, string> {
  const signature = cryptoSign(
    null,
    Buffer.from(`${timestampSec}|${rawBody}`, "utf8"),
    keyPair.privateKey,
  ).toString("base64");
  return {
    "telnyx-signature-ed25519": signature,
    "telnyx-timestamp": String(timestampSec),
  };
}

test("Telnyx Ed25519 accepts a valid signature and rejects tampering", () => {
  const now = Date.UTC(2026, 9, 24, 12, 0, 0);
  const timestampSec = Math.floor(now / 1000);
  const rawBody = JSON.stringify({ data: { event_type: "number_order.completed" } });
  const headers = signedHeaders(rawBody, timestampSec);

  assert.equal(
    verifyTelnyxWebhookSignature({
      publicKey: publicKeyPem,
      signature: headers["telnyx-signature-ed25519"]!,
      timestamp: headers["telnyx-timestamp"]!,
      rawBody,
      nowMs: now,
    }),
    true,
  );

  assert.equal(
    verifyTelnyxWebhookSignature({
      publicKey: publicKeyPem,
      signature: headers["telnyx-signature-ed25519"]!,
      timestamp: headers["telnyx-timestamp"]!,
      rawBody: `${rawBody} `,
      nowMs: now,
    }),
    false,
  );

  assert.equal(
    verifyTelnyxWebhookSignature({
      publicKey: publicKeyPem,
      signature: "not-a-signature",
      timestamp: headers["telnyx-timestamp"]!,
      rawBody,
      nowMs: now,
    }),
    false,
  );
});

test("Telnyx Ed25519 rejects replays outside the tolerance window", () => {
  const timestampSec = Math.floor(Date.UTC(2026, 9, 24, 12, 0, 0) / 1000);
  const rawBody = "{}";
  const headers = signedHeaders(rawBody, timestampSec);

  assert.equal(
    verifyTelnyxWebhookSignature({
      publicKey: publicKeyPem,
      signature: headers["telnyx-signature-ed25519"]!,
      timestamp: headers["telnyx-timestamp"]!,
      rawBody,
      toleranceSec: 60,
      nowMs: Date.UTC(2026, 9, 24, 12, 5, 0),
    }),
    false,
  );
});

test("Telnyx public key accepts the raw base64 key form", () => {
  const jwk = keyPair.publicKey.export({ format: "jwk" }) as { x: string };
  const rawBase64 = Buffer.from(jwk.x, "base64url").toString("base64");
  const parsed = parseTelnyxPublicKey(rawBase64);
  assert.equal(parsed.asymmetricKeyType, "ed25519");
});

test("Telnyx search maps inventory and sends filters", async () => {
  let requested = "";
  const client = new TelnyxClient({
    apiKey: "KEY",
    publicKey: publicKeyPem,
    fetchImpl: (async (url: string | URL | Request) => {
      requested = String(url);
      return new Response(
        JSON.stringify({
          data: [
            {
              phone_number: "+14155550199",
              phone_number_type: "local",
              national_destination_code: "415",
              locality: "San Francisco",
              region_information: [{ region_name: "California" }],
              cost_information: {
                monthly_cost: "1.25000",
                upfront_cost: "1.00000",
                currency: "USD",
              },
              features: [{ name: "voice" }, { name: "sms" }],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch,
  });

  const numbers = await client.searchAvailableNumbers({
    areaCode: "415",
    numberType: "local",
    limit: 5,
  });
  assert.equal(numbers.length, 1);
  assert.equal(numbers[0].phone_number, "+14155550199");
  assert.equal(numbers[0].monthly_cost, 1.25);
  assert.equal(numbers[0].region, "California");
  assert.match(requested, /national_destination_code/);
  assert.match(requested, /=415/);
  assert.match(requested, /phone_number_type/);
  assert.match(requested, /page(%5B|\[)size(%5D|\])=5/);
});

test("Telnyx number order sends connection_id and maps status", async () => {
  let body: Record<string, unknown> = {};
  const client = new TelnyxClient({
    apiKey: "KEY",
    publicKey: publicKeyPem,
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          data: {
            id: "order_1",
            status: "pending",
            phone_numbers: [{ id: "pn_1", phone_number: "+14155550199" }],
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });

  const order = await client.createNumberOrder(["+14155550199"], "conn_1", "ws-1");
  assert.equal(order.id, "order_1");
  assert.equal(order.status, "pending");
  assert.deepEqual(order.phoneNumberIds, ["pn_1"]);
  assert.equal(body.connection_id, "conn_1");
  assert.deepEqual(body.phone_numbers, [{ phone_number: "+14155550199" }]);
});

test("Telnyx FQDN provisioning uses the LiveKit SIP shape", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const client = new TelnyxClient({
    apiKey: "KEY",
    publicKey: publicKeyPem,
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      if (String(url).endsWith("/fqdn_connections")) {
        return new Response(JSON.stringify({ data: { id: "conn_1" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: { id: "fqdn_1", fqdn: "x.sip.livekit.cloud" } }), {
        status: 200,
      });
    }) as typeof fetch,
  });

  const connection = await client.createFqdnConnection("QuickStart Inbound");
  await client.createFqdn(connection.id, "x.sip.livekit.cloud");

  assert.equal(calls[0].body.connection_name, "QuickStart Inbound");
  assert.equal(calls[0].body.transport_protocol, "TCP");
  assert.deepEqual(calls[0].body.inbound, {
    ani_number_format: "+E.164",
    dnis_number_format: "+e164",
  });
  assert.equal(calls[1].body.connection_id, "conn_1");
  assert.equal(calls[1].body.fqdn, "x.sip.livekit.cloud");
  assert.equal(calls[1].body.port, 5060);
});

test("Telnyx provider verifies webhooks and refuses outbound dial", async () => {
  const now = Date.now();
  const timestampSec = Math.floor(now / 1000);
  const rawBody = JSON.stringify({ data: { event_type: "call.initiated" } });
  const headers = signedHeaders(rawBody, timestampSec);
  const client = new TelnyxClient({
    apiKey: "KEY",
    publicKey: publicKeyPem,
    now: () => now,
  });
  const provider = new TelnyxProvider(client);

  assert.equal(provider.verifyWebhook(headers, rawBody), true);
  assert.equal(provider.verifyWebhook({}, rawBody), false);

  await assert.rejects(
    () =>
      provider.dial({
        workspaceId: "ws",
        toE164: "+14155550199",
        callId: "call",
      }),
    (err: unknown) => err instanceof AppError,
  );
});

test("Fake Telnyx client supports the full number lifecycle", async () => {
  const client = new FakeTelnyxClient();
  const search = await client.searchAvailableNumbers({ countryCode: "US", limit: 3 });
  assert.equal(search.length, 3);

  const order = await client.createNumberOrder([search[0].phone_number]);
  assert.equal(order.status, "success");

  const owned = await client.listOwnedNumbers();
  assert.ok(owned.some((number) => number.phoneNumber === search[0].phone_number));

  await client.assignNumberToConnection(order.phoneNumberIds[0], "conn_fake");
  const assigned = (await client.listOwnedNumbers()).find(
    (number) => number.id === order.phoneNumberIds[0],
  );
  assert.equal(assigned?.connectionId, "conn_fake");

  await client.releaseNumber(order.phoneNumberIds[0]);
  assert.equal(
    (await client.listOwnedNumbers()).some((number) => number.id === order.phoneNumberIds[0]),
    false,
  );
  assert.equal(client.verifyWebhook({ "x-fake-telnyx-signature": "fake-telnyx-webhook" }, "{}"), true);
});

test("Telephony profile resolves telnyx explicitly and by credentials", () => {
  assert.equal(resolveTelephonyProfile("telnyx", false), "telnyx");
  assert.equal(resolveTelephonyProfile(undefined, false, true), "telnyx");
  assert.equal(resolveTelephonyProfile(undefined, true, false), "twilio");
  assert.equal(resolveTelephonyProfile(undefined, false, false), "fake");
});
