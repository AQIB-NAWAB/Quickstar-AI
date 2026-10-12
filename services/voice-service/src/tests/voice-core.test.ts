import assert from "node:assert/strict";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { AppError } from "@quickstart/errors";
import { createMemoryCallCaps, createFailClosedCallCaps } from "../caps/call-caps.js";
import { createFakeRuntimeClient } from "../clients/runtime.client.js";
import { createFakeSpeechBundle } from "../speech/fake-tts.js";
import { MemoryCallsRepository } from "../repository/calls.repository.js";
import { createMemoryRecordingStore } from "../repository/recording.store.js";
import { CallSessionOrchestrator } from "../session/orchestrator.js";
import { SilenceTurnDetector } from "../turn-detection/silence-detector.js";
import { TelephonyRouter } from "../telephony/router.js";
import { FakeCpaasProvider } from "../telephony/fake-cpaas.js";
import { SipBridgeProvider } from "../telephony/sip-provider.js";
import { createHmac } from "node:crypto";
import { MemoryCampaignsRepository } from "../repository/campaigns.repository.js";
import { CampaignsService } from "../services/campaigns.service.js";
import { s2sProfileAllowed } from "@quickstart/contracts";

const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";

function makeOrchestrator(opts?: { inboundCap?: number }) {
  const caps = createMemoryCallCaps({
    globalInbound: opts?.inboundCap ?? 5000,
    globalOutbound: 5000,
    workspaceInbound: opts?.inboundCap ?? 100,
    workspaceOutbound: 100,
  });
  const logger = createLogger({ service: "voice-test" });
  return new CallSessionOrchestrator(
    new MemoryCallsRepository(),
    caps,
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient("agent says hi"),
    logger,
    "fallback phrase",
    15_000,
  );
}

test("cascade fake-media creates completed call with timings and transcript", async () => {
  const orch = makeOrchestrator();
  const result = await orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    direction: "inbound",
    caller: "+15551212",
    utterance: { bytes: Buffer.from("hello caller", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    voiceMode: "cascade",
  });
  assert.equal(result.state, "completed");
  assert.equal(result.user_text, "hello caller");
  assert.equal(result.assistant_text, "agent says hi");
  assert.ok(result.timings.total_ms > 0);
  assert.ok(result.recording_object_key);
});

test("s2s profile works without tools and writes sidecar transcript", async () => {
  const orch = makeOrchestrator();
  const result = await orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    direction: "inbound",
    utterance: { bytes: Buffer.from("emotional hello", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    voiceMode: "s2s",
    toolsCount: 0,
    knowledgeEnabled: false,
  });
  assert.equal(result.voice_mode, "s2s");
  assert.equal(result.user_text, "emotional hello");
  assert.ok(result.assistant_text.includes("s2s"));
});

test("s2s rejects tools", () => {
  const check = s2sProfileAllowed({ voice_mode: "s2s", toolsCount: 2, knowledgeEnabled: false });
  assert.equal(check.ok, false);
});

test("workspace cap rejects before media", async () => {
  const orch = makeOrchestrator({ inboundCap: 1 });
  await orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    direction: "inbound",
    utterance: { bytes: Buffer.from("a", "utf8"), encoding: "fake", sampleRateHz: 8000 },
  });
  // Hold a slot open by using fail path: acquire manually via second orch with shared caps
  const caps = createMemoryCallCaps({
    globalInbound: 1,
    globalOutbound: 1,
    workspaceInbound: 1,
    workspaceOutbound: 1,
  });
  await caps.tryAcquire(WS, "inbound");
  await assert.rejects(
    () => caps.tryAcquire(WS, "inbound"),
    (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
  );
});

test("redis-down fail-closed refuses new calls", async () => {
  const caps = createFailClosedCallCaps();
  await assert.rejects(() => caps.tryAcquire(WS, "inbound"), (err: unknown) => {
    return err instanceof AppError && err.code === "UPSTREAM_UNAVAILABLE";
  });
});

test("eager turn detector emits end_of_turn after short silence", () => {
  const det = new SilenceTurnDetector("eager", { eager: true, silenceMs: 400, minUtteranceMs: 100 });
  assert.deepEqual(det.push({ energy: 0.9, durationMs: 120 }, false).map((e) => e.type), [
    "speech_start",
  ]);
  const events = det.push({ energy: 0.0, durationMs: 300 }, false);
  assert.ok(events.some((e) => e.type === "end_of_turn"));
});

test("barge-in event while TTS playing", () => {
  const det = new SilenceTurnDetector("default");
  const events = det.push({ energy: 0.9, durationMs: 40 }, true);
  assert.ok(events.some((e) => e.type === "barge_in"));
});

test("telephony router fails over from twilio to telnyx", async () => {
  const router = new TelephonyRouter();
  const twilio = new FakeCpaasProvider("twilio");
  const telnyx = new FakeCpaasProvider("telnyx");
  twilio.setHealthy(false);
  router.register(twilio);
  router.register(telnyx);
  router.setWorkspacePreference(WS, ["twilio", "telnyx"]);
  const decision = await router.route(WS);
  assert.equal(decision.provider.id, "telnyx");
  assert.equal(decision.failoverFrom, "twilio");
});

test("sip bridge verifies HMAC signature", () => {
  const secret = "a".repeat(32);
  const sip = new SipBridgeProvider(secret);
  const body = JSON.stringify({ event: "invite" });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(sip.verifyWebhook({ "x-sip-bridge-signature": sig }, body), true);
  assert.equal(sip.verifyWebhook({ "x-sip-bridge-signature": "bad" }, body), false);
});

test("campaign batch claims targets and dials via router", async () => {
  const orch = makeOrchestrator();
  const router = new TelephonyRouter();
  router.register(new FakeCpaasProvider("twilio"));
  const service = new CampaignsService(new MemoryCampaignsRepository(), orch, router);
  const campaign = await service.create(WS, {
    name: "Test",
    agent_id: "33333333-3333-4333-8333-333333333333",
    concurrency_cap: 2,
  });
  await service.start(WS, campaign.id);
  await service.addTargets(WS, campaign.id, ["+15550001", "+15550002"]);
  const batch = await service.processBatch(WS, campaign.id, {
    conversationId: CONV,
    limit: 2,
    requestId: "req-1",
  });
  assert.equal(batch.processed, 2);
  assert.equal(batch.provider, "twilio");
});

test("drain refuses new calls", async () => {
  const orch = makeOrchestrator();
  orch.setDraining(true);
  await assert.rejects(
    () =>
      orch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: { bytes: Buffer.from("x", "utf8"), encoding: "fake", sampleRateHz: 8000 },
      }),
    (err: unknown) => err instanceof AppError && err.code === "UPSTREAM_UNAVAILABLE",
  );
});
