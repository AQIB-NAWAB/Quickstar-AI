import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { AppError } from "@quickstart/errors";
import { createMemoryCallCaps } from "../caps/call-caps.js";
import { createFakeRuntimeClient } from "../clients/runtime.client.js";
import { MemoryCallsRepository } from "../repository/calls.repository.js";
import { createMemoryRecordingStore } from "../repository/recording.store.js";
import { createFakeSpeechBundle } from "../speech/fake-tts.js";
import { CallSessionOrchestrator } from "../session/orchestrator.js";
import { createTelephonyController } from "../controllers/telephony.controller.js";
import { createTelephonyRouter, assertTelephonyBootAllowed } from "../telephony/factory.js";
import { createMemoryStatusIdempotencyStore } from "../telephony/status-idempotency.js";
import {
  TwilioCpaasProvider,
  computeTwilioSignature,
  parseWebhookParams,
} from "../telephony/twilio-cpaas.js";
import { FakeCpaasProvider } from "../telephony/fake-cpaas.js";
import { TelephonyRouter } from "../telephony/router.js";

const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";
const AUTH = "test_auth_token_for_twilio_hmac";
const PUBLIC = "https://voice.example.test";

function makeRes() {
  const state: { statusCode: number; body: unknown } = { statusCode: 0, body: null };
  const res = {
    locals: { requestId: "test-req" },
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
    getHeader() {
      return undefined;
    },
  };
  return { res: res as never, state };
}

function formBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

test("parseWebhookParams reads form and json", () => {
  assert.equal(parseWebhookParams("CallSid=CA1&CallStatus=completed").CallSid, "CA1");
  assert.equal(parseWebhookParams(JSON.stringify({ CallSid: "CA2" })).CallSid, "CA2");
});

test("Twilio signature accept and reject", () => {
  const url = `${PUBLIC}/voice/telephony/twilio/inbound`;
  const params = { CallSid: "CAabc", From: "+15550001", To: "+15550002" };
  const sig = computeTwilioSignature(AUTH, url, params);
  const provider = new TwilioCpaasProvider({
    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authToken: AUTH,
    fromNumber: "+15550002",
    publicBaseUrl: PUBLIC,
  });
  const raw = formBody(params);
  assert.equal(
    provider.verifyWebhook(
      { "x-twilio-signature": sig, "x-twilio-webhook-url": url },
      raw,
    ),
    true,
  );
  assert.equal(
    provider.verifyWebhook(
      { "x-twilio-signature": "bad-signature", "x-twilio-webhook-url": url },
      raw,
    ),
    false,
  );
  assert.equal(provider.verifyWebhook({}, raw), false);
});

test("Twilio dial uses fixture fetch and returns sid", async () => {
  const provider = new TwilioCpaasProvider({
    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authToken: AUTH,
    fromNumber: "+15550002",
    publicBaseUrl: PUBLIC,
    fetchImpl: async () =>
      new Response(JSON.stringify({ sid: "CAfixture123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  const result = await provider.dial({
    workspaceId: WS,
    toE164: "+15551111",
    callId: randomUUID(),
  });
  assert.equal(result.providerCallSid, "CAfixture123");
});

test("assertTelephonyBootAllowed fails closed when real required", () => {
  assert.throws(
    () =>
      assertTelephonyBootAllowed({
        profile: "fake",
        requireRealTelephony: true,
      }),
    /TELEPHONY_REQUIRE_REAL/,
  );
  assert.throws(
    () =>
      assertTelephonyBootAllowed({
        profile: "twilio",
        requireRealTelephony: true,
      }),
    /TWILIO_ACCOUNT_SID/,
  );
});

test("status webhook is idempotent for duplicate CallSid+event", async () => {
  const { router } = createTelephonyRouter({
    profile: "fake",
    publicBaseUrl: PUBLIC,
    sipBridgeSharedSecret: "a".repeat(32),
    requireRealTelephony: false,
  });
  const calls = new MemoryCallsRepository();
  const orch = new CallSessionOrchestrator(
    calls,
    createMemoryCallCaps({
      globalInbound: 10,
      globalOutbound: 10,
      workspaceInbound: 10,
      workspaceOutbound: 10,
    }),
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient(),
    createLogger({ service: "telephony-test" }),
    "fallback",
  );
  const ctrl = createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: createMemoryStatusIdempotencyStore(),
    defaultWebhookWorkspaceId: WS,
  });

  const raw = formBody({ CallSid: "CAdup1", CallStatus: "completed", workspace_id: WS });
  const next = () => undefined;
  const { res: res1, state: s1 } = makeRes();
  await ctrl.cpaasStatus(
    {
      params: { providerId: "twilio" },
      headers: {},
      body: Object.fromEntries(new URLSearchParams(raw)),
      rawBody: raw,
    } as never,
    res1,
    next as never,
  );
  assert.equal(s1.statusCode, 200);
  assert.equal((s1.body as { duplicate?: boolean }).duplicate, false);

  const { res: res2, state: s2 } = makeRes();
  await ctrl.cpaasStatus(
    {
      params: { providerId: "twilio" },
      headers: {},
      body: Object.fromEntries(new URLSearchParams(raw)),
      rawBody: raw,
    } as never,
    res2,
    next as never,
  );
  assert.equal(s2.statusCode, 200);
  assert.equal((s2.body as { duplicate?: boolean }).duplicate, true);
});

test("inbound signed Twilio webhook runs one orchestrator turn", async () => {
  const provider = new TwilioCpaasProvider({
    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authToken: AUTH,
    fromNumber: "+15550002",
    publicBaseUrl: PUBLIC,
  });
  const router = new TelephonyRouter();
  router.register(provider);
  router.register(new FakeCpaasProvider("fake"));

  const calls = new MemoryCallsRepository();
  const caps = createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const orch = new CallSessionOrchestrator(
    calls,
    caps,
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient("thanks for calling"),
    createLogger({ service: "telephony-inbound-test" }),
    "fallback",
  );
  const ctrl = createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: createMemoryStatusIdempotencyStore(),
  });

  const url = `${PUBLIC}/voice/telephony/twilio/inbound`;
  const params = {
    CallSid: "CAin1",
    From: "+15550001",
    To: "+15550002",
    workspace_id: WS,
    conversation_id: CONV,
    utterance_text: "inbound hello",
  };
  const raw = formBody(params);
  const sig = computeTwilioSignature(AUTH, url, params);
  const next = () => undefined;
  const { res, state } = makeRes();
  await ctrl.cpaasInbound(
    {
      params: { providerId: "twilio" },
      headers: { "x-twilio-signature": sig, "x-twilio-webhook-url": url },
      body: params,
      rawBody: raw,
    } as never,
    res,
    next as never,
  );
  assert.equal(state.statusCode, 200);
  const body = state.body as { accepted?: boolean; result?: { state: string; user_text: string } };
  assert.equal(body.accepted, true);
  assert.equal(body.result?.user_text, "inbound hello");
  assert.equal(body.result?.state, "completed");
  assert.equal(caps.activeLeaseCount(), 0);
});

test("inbound rejects bad Twilio signature before media", async () => {
  const provider = new TwilioCpaasProvider({
    accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authToken: AUTH,
    fromNumber: "+15550002",
    publicBaseUrl: PUBLIC,
  });
  const router = new TelephonyRouter();
  router.register(provider);
  const calls = new MemoryCallsRepository();
  const orch = new CallSessionOrchestrator(
    calls,
    createMemoryCallCaps({
      globalInbound: 10,
      globalOutbound: 10,
      workspaceInbound: 10,
      workspaceOutbound: 10,
    }),
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient(),
    createLogger({ service: "telephony-reject-test" }),
    "fallback",
  );
  const ctrl = createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: createMemoryStatusIdempotencyStore(),
  });
  const raw = formBody({
    CallSid: "CAbad",
    workspace_id: WS,
    conversation_id: CONV,
  });
  const next = () => undefined;
  const { res, state } = makeRes();
  await ctrl.cpaasInbound(
    {
      params: { providerId: "twilio" },
      headers: { "x-twilio-signature": "nope" },
      body: {},
      rawBody: raw,
    } as never,
    res,
    next as never,
  );
  assert.equal(state.statusCode, 401);
});

test("internal dial path completes outbound turn via router", async () => {
  const { router } = createTelephonyRouter({
    profile: "fake",
    publicBaseUrl: PUBLIC,
    sipBridgeSharedSecret: "a".repeat(32),
    requireRealTelephony: false,
  });
  const calls = new MemoryCallsRepository();
  const caps = createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const orch = new CallSessionOrchestrator(
    calls,
    caps,
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient("outbound reply"),
    createLogger({ service: "telephony-dial-test" }),
    "fallback",
  );
  const ctrl = createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: createMemoryStatusIdempotencyStore(),
  });
  const next = () => undefined;
  const { res, state } = makeRes();
  await ctrl.dial(
    {
      params: { workspaceId: WS },
      headers: {},
      body: {
        conversation_id: CONV,
        to_e164: "+15559999",
        utterance_text: "please dial",
        preferred_provider: "twilio",
      },
    } as never,
    res,
    next as never,
  );
  assert.equal(state.statusCode, 201);
  const body = state.body as {
    provider?: string;
    result?: { state: string; telephony_provider: string };
  };
  assert.equal(body.provider, "twilio");
  assert.equal(body.result?.state, "completed");
  assert.equal(body.result?.telephony_provider, "twilio");
  assert.equal(caps.activeLeaseCount(), 0);
});

test("dial fails when no healthy provider", async () => {
  const router = new TelephonyRouter();
  const twilio = new FakeCpaasProvider("twilio");
  twilio.setHealthy(false);
  router.register(twilio);
  const calls = new MemoryCallsRepository();
  const orch = new CallSessionOrchestrator(
    calls,
    createMemoryCallCaps({
      globalInbound: 1,
      globalOutbound: 1,
      workspaceInbound: 1,
      workspaceOutbound: 1,
    }),
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient(),
    createLogger({ service: "telephony-unhealthy" }),
    "fallback",
  );
  const ctrl = createTelephonyController(router, {
    orchestrator: orch,
    calls,
    statusIdempotency: createMemoryStatusIdempotencyStore(),
  });
  const next = () => undefined;
  const { res, state } = makeRes();
  await ctrl.dial(
    {
      params: { workspaceId: WS },
      headers: {},
      body: { conversation_id: CONV, to_e164: "+15550000" },
    } as never,
    res,
    next as never,
  );
  assert.equal(state.statusCode, 503);
  void AppError;
});
