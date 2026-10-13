/**
 * Feature 22 LLD: caps before media, hang→finally, reconnect, barge-in, fail-closed.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createLogger } from "@quickstart/logging";
import { AppError } from "@quickstart/errors";
import {
  createFailClosedCallCaps,
  createMemoryCallCaps,
  type MemoryCallCaps,
} from "../caps/call-caps.js";
import {
  createFakeRuntimeClient,
  type RuntimeClient,
} from "../clients/runtime.client.js";
import { MemoryCallsRepository } from "../repository/calls.repository.js";
import { createMemoryRecordingStore } from "../repository/recording.store.js";
import { createFakeSpeechBundle, type SpeechBundle } from "../speech/fake-tts.js";
import type { SpeechToText, TranscriptResult, AudioChunk } from "../speech/types.js";
import { CallSessionOrchestrator } from "../session/orchestrator.js";

const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function countingStt(counter: { n: number }): SpeechToText {
  return {
    id: "counting-stt",
    async transcribe(chunk: AudioChunk): Promise<TranscriptResult> {
      counter.n += 1;
      return {
        text: chunk.bytes.toString("utf8") || "counted",
        latencyMs: 1,
        provider: "counting-stt",
      };
    },
  };
}

function delayedRuntime(delayMs: number, reply = "agent says hi"): RuntimeClient {
  return {
    async executeVoiceTurn(input) {
      await sleep(delayMs);
      return {
        assistant_text: reply,
        agent_id: "agent-fake",
        agent_version_id: "version-fake",
        conversation_id: input.conversationId,
        latency_ms: delayMs,
        deduplicated: false,
      };
    },
  };
}

function makeOrch(opts: {
  caps: MemoryCallCaps;
  speech?: SpeechBundle;
  runtime?: RuntimeClient;
  calls?: MemoryCallsRepository;
}) {
  return new CallSessionOrchestrator(
    opts.calls ?? new MemoryCallsRepository(),
    opts.caps,
    createMemoryRecordingStore(),
    opts.speech ?? createFakeSpeechBundle(),
    opts.runtime ?? createFakeRuntimeClient("agent says hi"),
    createLogger({ service: "voice-reliability-test" }),
    "fallback phrase",
    15_000,
  );
}

test("cap reached returns RATE_LIMITED before opening media (STT never runs)", async () => {
  const caps = createMemoryCallCaps({
    globalInbound: 5,
    globalOutbound: 5,
    workspaceInbound: 1,
    workspaceOutbound: 1,
  });
  const hold = await caps.tryAcquire(WS, "inbound");
  const sttCalls = { n: 0 };
  const speech = createFakeSpeechBundle();
  speech.stt = countingStt(sttCalls);
  const orch = makeOrch({ caps, speech });

  await assert.rejects(
    () =>
      orch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: { bytes: Buffer.from("should-not-stt", "utf8"), encoding: "fake", sampleRateHz: 8000 },
      }),
    (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
  );
  assert.equal(sttCalls.n, 0);
  assert.equal(caps.occupancy(WS, "inbound").workspace, 1);
  await caps.release(hold);
  assert.equal(caps.occupancy(WS, "inbound").workspace, 0);
});

test("simulated hang / abort mid-turn releases worker lease in finally", async () => {
  const caps = createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const callId = randomUUID();
  const orch = makeOrch({
    caps,
    speech: createFakeSpeechBundle(undefined, { sttDelayMs: 200 }),
  });

  const pending = orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    callId,
    direction: "inbound",
    utterance: { bytes: Buffer.from("hang-me", "utf8"), encoding: "fake", sampleRateHz: 8000 },
  });

  await sleep(30);
  orch.bargeIn(callId);

  await assert.rejects(() => pending, (err: unknown) => {
    return err instanceof Error && /abort/i.test(err.message);
  });
  assert.equal(caps.activeLeaseCount(), 0);
  assert.equal(caps.occupancy(WS, "inbound").global, 0);
});

test("reconnect reuses same call_id and conversation without second acquire", async () => {
  const caps = createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const calls = new MemoryCallsRepository();
  const callId = randomUUID();
  const orch = makeOrch({
    caps,
    calls,
    speech: createFakeSpeechBundle(undefined, { ttsDelayMs: 150 }),
    runtime: delayedRuntime(80),
  });

  const first = orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    callId,
    direction: "inbound",
    utterance: { bytes: Buffer.from("first", "utf8"), encoding: "fake", sampleRateHz: 8000 },
  });
  await sleep(40);
  orch.bargeIn(callId);
  const barged = await first;
  assert.equal(barged.call_id, callId);
  assert.equal(barged.barged_in, true);
  assert.equal(barged.state, "live");
  assert.equal(caps.activeLeaseCount(), 0);

  const before = caps.occupancy(WS, "inbound");
  const second = await orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    callId,
    direction: "inbound",
    utterance: { bytes: Buffer.from("reconnect", "utf8"), encoding: "fake", sampleRateHz: 8000 },
  });
  assert.equal(second.call_id, callId);
  assert.equal(caps.occupancy(WS, "inbound").global, before.global);
  assert.equal(caps.activeLeaseCount(), 0);

  const row = await calls.get(WS, callId);
  assert.ok(row);
  assert.equal(row.conversation_id, CONV);
});

test("barge-in cancels in-flight TTS without duplicate assistant message", async () => {
  const caps = createMemoryCallCaps({
    globalInbound: 10,
    globalOutbound: 10,
    workspaceInbound: 10,
    workspaceOutbound: 10,
  });
  const calls = new MemoryCallsRepository();
  const callId = randomUUID();
  const orch = makeOrch({
    caps,
    calls,
    speech: createFakeSpeechBundle(undefined, { ttsDelayMs: 200 }),
    runtime: delayedRuntime(30, "should not become agent transcript"),
  });

  const pending = orch.simulateCall({
    workspaceId: WS,
    conversationId: CONV,
    callId,
    direction: "inbound",
    utterance: { bytes: Buffer.from("barge please", "utf8"), encoding: "fake", sampleRateHz: 8000 },
  });

  await sleep(60);
  orch.bargeIn(callId);
  const result = await pending;

  assert.equal(result.barged_in, true);
  assert.equal(result.assistant_text, "");
  const transcript = await calls.listTranscript(WS, callId);
  assert.ok(transcript.some((s) => s.speaker === "user"));
  assert.equal(
    transcript.filter((s) => s.speaker === "agent").length,
    0,
    "no agent transcript row after barge-in",
  );
});

test("Redis fail-closed refuses new calls with UPSTREAM_UNAVAILABLE", async () => {
  const caps = createFailClosedCallCaps();
  const orch = makeOrch({
    caps: createMemoryCallCaps({
      globalInbound: 1,
      globalOutbound: 1,
      workspaceInbound: 1,
      workspaceOutbound: 1,
    }),
  });
  void orch;
  await assert.rejects(() => caps.tryAcquire(WS, "inbound"), (err: unknown) => {
    return err instanceof AppError && err.code === "UPSTREAM_UNAVAILABLE";
  });

  const failOrch = new CallSessionOrchestrator(
    new MemoryCallsRepository(),
    caps,
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient(),
    createLogger({ service: "voice-reliability-failclosed" }),
    "fallback",
  );
  await assert.rejects(
    () =>
      failOrch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: { bytes: Buffer.from("x", "utf8"), encoding: "fake", sampleRateHz: 8000 },
      }),
    (err: unknown) => err instanceof AppError && err.code === "UPSTREAM_UNAVAILABLE",
  );
});

test("memory lease release is idempotent", async () => {
  const caps = createMemoryCallCaps({
    globalInbound: 2,
    globalOutbound: 2,
    workspaceInbound: 2,
    workspaceOutbound: 2,
  });
  const lease = await caps.tryAcquire(WS, "inbound");
  assert.equal(caps.activeLeaseCount(), 1);
  await caps.release(lease);
  await caps.release(lease);
  assert.equal(caps.activeLeaseCount(), 0);
  assert.equal(caps.occupancy(WS, "inbound").global, 0);
});
