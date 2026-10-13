/**
 * Feature 21C — Telephony adapter Done when proof (fixture mode default).
 *
 * Proves:
 *   - Twilio signature accept/reject
 *   - Signed inbound webhook → one orchestrator turn + caps released
 *   - Outbound dial via router → one turn
 *   - Status idempotency (duplicate no-op)
 *
 * Live staging dial when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN set is optional;
 * without secrets, fixture mode is the Done when bar for adapter v1.
 *
 * Usage:
 *   pnpm --filter @quickstart/service-voice build
 *   node scripts/check-voice-telephony-proof.mjs
 */
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import console from "node:console";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voiceDist = path.join(root, "services/voice-service/dist");

const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";
const AUTH = "proof_auth_token_twilio_hmac_xx";
const PUBLIC = "https://voice.proof.test";

function formBody(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function computeSig(authToken, url, params) {
  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + params[key];
  }
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

function makeRes() {
  const state = { statusCode: 0, body: null };
  const res = {
    locals: { requestId: "proof-req" },
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
    getHeader() {
      return undefined;
    },
  };
  return { res, state };
}

async function load() {
  const twilioUrl = pathToFileURL(path.join(voiceDist, "telephony/twilio-cpaas.js")).href;
  const factoryUrl = pathToFileURL(path.join(voiceDist, "telephony/factory.js")).href;
  const idemUrl = pathToFileURL(path.join(voiceDist, "telephony/status-idempotency.js")).href;
  const routerUrl = pathToFileURL(path.join(voiceDist, "telephony/router.js")).href;
  const fakeUrl = pathToFileURL(path.join(voiceDist, "telephony/fake-cpaas.js")).href;
  const ctrlUrl = pathToFileURL(path.join(voiceDist, "controllers/telephony.controller.js")).href;
  const orchUrl = pathToFileURL(path.join(voiceDist, "session/orchestrator.js")).href;
  const capsUrl = pathToFileURL(path.join(voiceDist, "caps/call-caps.js")).href;
  const callsUrl = pathToFileURL(path.join(voiceDist, "repository/calls.repository.js")).href;
  const recUrl = pathToFileURL(path.join(voiceDist, "repository/recording.store.js")).href;
  const speechUrl = pathToFileURL(path.join(voiceDist, "speech/fake-tts.js")).href;
  const runtimeUrl = pathToFileURL(path.join(voiceDist, "clients/runtime.client.js")).href;

  return {
    ...(await import(twilioUrl)),
    ...(await import(factoryUrl)),
    ...(await import(idemUrl)),
    ...(await import(routerUrl)),
    ...(await import(fakeUrl)),
    ...(await import(ctrlUrl)),
    ...(await import(orchUrl)),
    ...(await import(capsUrl)),
    ...(await import(callsUrl)),
    ...(await import(recUrl)),
    ...(await import(speechUrl)),
    ...(await import(runtimeUrl)),
  };
}

async function main() {
  const m = await load();
  const report = {
    signature: false,
    inbound: false,
    outbound: false,
    idempotent_status: false,
    caps: false,
    provider: "twilio",
    mode: "fixture",
    ok: false,
  };

  const stubLogger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return stubLogger;
    },
  };

  // Signature
  {
    const url = `${PUBLIC}/voice/telephony/twilio/inbound`;
    const params = { CallSid: "CAproof", From: "+1", To: "+2" };
    const sig = computeSig(AUTH, url, params);
    const provider = new m.TwilioCpaasProvider({
      accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: AUTH,
      fromNumber: "+15550002",
      publicBaseUrl: PUBLIC,
    });
    const raw = formBody(params);
    assert.equal(
      provider.verifyWebhook({ "x-twilio-signature": sig, "x-twilio-webhook-url": url }, raw),
      true,
    );
    assert.equal(
      provider.verifyWebhook({ "x-twilio-signature": "bad", "x-twilio-webhook-url": url }, raw),
      false,
    );
    report.signature = true;
    console.log("PASS: Twilio signature accept/reject");
  }

  const provider = new m.TwilioCpaasProvider({
    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authToken: AUTH,
    fromNumber: "+15550002",
    publicBaseUrl: PUBLIC,
    fetchImpl: async () =>
      new Response(JSON.stringify({ sid: "CAproofdial" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  const router = new m.TelephonyRouter();
  router.register(provider);
  router.register(new m.FakeCpaasProvider("fake"));

  const calls = new m.MemoryCallsRepository();
  const caps = m.createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const orch = new m.CallSessionOrchestrator(
    calls,
    caps,
    m.createMemoryRecordingStore(),
    m.createFakeSpeechBundle(),
    m.createFakeRuntimeClient("proof reply"),
    stubLogger,
    "fallback",
  );
  const ctrl = m.createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: m.createMemoryStatusIdempotencyStore(),
  });

  // Inbound
  {
    const url = `${PUBLIC}/voice/telephony/twilio/inbound`;
    const params = {
      CallSid: "CAinproof",
      From: "+15550001",
      To: "+15550002",
      workspace_id: WS,
      conversation_id: CONV,
      utterance_text: "inbound proof",
    };
    const raw = formBody(params);
    const sig = computeSig(AUTH, url, params);
    const { res, state } = makeRes();
    await ctrl.cpaasInbound(
      {
        params: { providerId: "twilio" },
        headers: { "x-twilio-signature": sig, "x-twilio-webhook-url": url },
        body: params,
        rawBody: raw,
      },
      res,
    );
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.accepted, true);
    assert.equal(state.body.result.user_text, "inbound proof");
    assert.equal(state.body.result.telephony_provider, "twilio");
    report.inbound = true;
    console.log("PASS: signed inbound → one turn");
  }

  // Outbound dial
  {
    const { res, state } = makeRes();
    await ctrl.dial(
      {
        params: { workspaceId: WS },
        headers: {},
        body: {
          conversation_id: CONV,
          to_e164: "+15559999",
          utterance_text: "outbound proof",
          preferred_provider: "twilio",
          call_id: randomUUID(),
        },
      },
      res,
    );
    assert.equal(state.statusCode, 201);
    assert.equal(state.body.provider, "twilio");
    assert.equal(state.body.provider_call_sid, "CAproofdial");
    assert.equal(state.body.result.state, "completed");
    report.outbound = true;
    console.log("PASS: outbound dial → one turn");
  }

  // Idempotent status
  {
    const url = `${PUBLIC}/voice/telephony/twilio/status`;
    const params = { CallSid: "CAstatus1", CallStatus: "completed", workspace_id: WS };
    const raw = formBody(params);
    const sig = computeSig(AUTH, url, params);
    const headers = { "x-twilio-signature": sig, "x-twilio-webhook-url": url };
    const { res: r1, state: s1 } = makeRes();
    await ctrl.cpaasStatus(
      { params: { providerId: "twilio" }, headers, body: params, rawBody: raw },
      r1,
    );
    assert.equal(s1.body.duplicate, false);
    const { res: r2, state: s2 } = makeRes();
    await ctrl.cpaasStatus(
      { params: { providerId: "twilio" }, headers, body: params, rawBody: raw },
      r2,
    );
    assert.equal(s2.body.duplicate, true);
    report.idempotent_status = true;
    console.log("PASS: status idempotency");
  }

  report.caps = caps.activeLeaseCount() === 0;
  assert.equal(report.caps, true);
  console.log("PASS: caps released after turns");

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    report.mode = "fixture+creds_present";
    console.log("NOTE: TWILIO_* set — live staging dial is optional; fixture proof is complete");
  }

  report.ok =
    report.signature &&
    report.inbound &&
    report.outbound &&
    report.idempotent_status &&
    report.caps;

  console.log(JSON.stringify(report));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
