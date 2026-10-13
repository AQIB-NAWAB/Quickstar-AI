/**
 * Feature 22 — Voice reliability Done when proof.
 *
 * Drives the four LLD cases in-process (memory caps + orchestrator harness):
 *   cap before media, hang→finally release, reconnect, barge-in, Redis fail-closed.
 *
 * Usage:
 *   pnpm --filter @quickstart/service-voice build
 *   node scripts/check-voice-reliability-proof.mjs
 *
 * Does not start telephony (21C) or dual-replica Redis load (V1).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import console from "node:console";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voiceDist = path.join(root, "services/voice-service/dist");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function load() {
  const capsUrl = pathToFileURL(path.join(voiceDist, "caps/call-caps.js")).href;
  const runtimeUrl = pathToFileURL(path.join(voiceDist, "clients/runtime.client.js")).href;
  const callsUrl = pathToFileURL(path.join(voiceDist, "repository/calls.repository.js")).href;
  const recUrl = pathToFileURL(path.join(voiceDist, "repository/recording.store.js")).href;
  const speechUrl = pathToFileURL(path.join(voiceDist, "speech/fake-tts.js")).href;
  const orchUrl = pathToFileURL(path.join(voiceDist, "session/orchestrator.js")).href;

  const [
    { createMemoryCallCaps, createFailClosedCallCaps },
    { createFakeRuntimeClient },
    { MemoryCallsRepository },
    { createMemoryRecordingStore },
    { createFakeSpeechBundle },
    { CallSessionOrchestrator },
  ] = await Promise.all([
    import(capsUrl),
    import(runtimeUrl),
    import(callsUrl),
    import(recUrl),
    import(speechUrl),
    import(orchUrl),
  ]);

  const createLogger = () => ({
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return createLogger();
    },
  });

  return {
    createMemoryCallCaps,
    createFailClosedCallCaps,
    createFakeRuntimeClient,
    MemoryCallsRepository,
    createMemoryRecordingStore,
    createFakeSpeechBundle,
    CallSessionOrchestrator,
    createLogger,
  };
}

const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";

async function main() {
  const m = await load();
  const report = {
    cap: false,
    hang_release: false,
    reconnect: false,
    barge_in: false,
    redis_fail_closed: false,
    ok: false,
  };

  // 1) Cap before media
  {
    const caps = m.createMemoryCallCaps({
      globalInbound: 5,
      globalOutbound: 5,
      workspaceInbound: 1,
      workspaceOutbound: 1,
    });
    await caps.tryAcquire(WS, "inbound");
    let sttN = 0;
    const speech = m.createFakeSpeechBundle();
    speech.stt = {
      id: "counting-stt",
      async transcribe(chunk) {
        sttN += 1;
        return { text: chunk.bytes.toString("utf8"), latencyMs: 1, provider: "counting-stt" };
      },
    };
    const orch = new m.CallSessionOrchestrator(
      new m.MemoryCallsRepository(),
      caps,
      m.createMemoryRecordingStore(),
      speech,
      m.createFakeRuntimeClient(),
      m.createLogger({ service: "voice-reliability-proof" }),
      "fallback",
    );
    let limited = false;
    try {
      await orch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: { bytes: Buffer.from("nope", "utf8"), encoding: "fake", sampleRateHz: 8000 },
      });
    } catch (err) {
      limited = err?.code === "RATE_LIMITED";
    }
    assert.equal(limited, true);
    assert.equal(sttN, 0);
    report.cap = true;
    console.log("PASS: cap before media (RATE_LIMITED, STT not called)");
  }

  // 2) Hang releases lease in finally
  {
    const caps = m.createMemoryCallCaps({
      globalInbound: 10,
      globalOutbound: 10,
      workspaceInbound: 10,
      workspaceOutbound: 10,
    });
    const callId = randomUUID();
    const orch = new m.CallSessionOrchestrator(
      new m.MemoryCallsRepository(),
      caps,
      m.createMemoryRecordingStore(),
      m.createFakeSpeechBundle(undefined, { sttDelayMs: 200 }),
      m.createFakeRuntimeClient(),
      m.createLogger({ service: "voice-reliability-proof" }),
      "fallback",
    );
    const pending = orch.simulateCall({
      workspaceId: WS,
      conversationId: CONV,
      callId,
      direction: "inbound",
      utterance: { bytes: Buffer.from("hang", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    });
    await sleep(30);
    orch.bargeIn(callId);
    let failed = false;
    try {
      await pending;
    } catch {
      failed = true;
    }
    assert.equal(failed, true);
    assert.equal(caps.activeLeaseCount(), 0);
    report.hang_release = true;
    console.log("PASS: hang / abort releases lease in finally");
  }

  // 3) Reconnect same call_id, no second acquire
  {
    const caps = m.createMemoryCallCaps({
      globalInbound: 10,
      globalOutbound: 10,
      workspaceInbound: 10,
      workspaceOutbound: 10,
    });
    const calls = new m.MemoryCallsRepository();
    const callId = randomUUID();
    const delayedRuntime = {
      async executeVoiceTurn(input) {
        await sleep(80);
        return {
          assistant_text: "hi",
          agent_id: "a",
          agent_version_id: "v",
          conversation_id: input.conversationId,
          latency_ms: 80,
          deduplicated: false,
        };
      },
    };
    const orch = new m.CallSessionOrchestrator(
      calls,
      caps,
      m.createMemoryRecordingStore(),
      m.createFakeSpeechBundle(undefined, { ttsDelayMs: 150 }),
      delayedRuntime,
      m.createLogger({ service: "voice-reliability-proof" }),
      "fallback",
    );
    const firstP = orch.simulateCall({
      workspaceId: WS,
      conversationId: CONV,
      callId,
      direction: "inbound",
      utterance: { bytes: Buffer.from("first", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    });
    await sleep(40);
    orch.bargeIn(callId);
    const first = await firstP;
    assert.equal(first.barged_in, true);
    assert.equal(first.state, "live");
    const before = caps.occupancy(WS, "inbound");
    const second = await orch.simulateCall({
      workspaceId: WS,
      conversationId: CONV,
      callId,
      direction: "inbound",
      utterance: { bytes: Buffer.from("again", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    });
    assert.equal(second.call_id, callId);
    assert.equal(caps.occupancy(WS, "inbound").global, before.global);
    report.reconnect = true;
    console.log("PASS: reconnect reuses call_id without second acquire");
  }

  // 4) Barge-in — no agent transcript
  {
    const caps = m.createMemoryCallCaps({
      globalInbound: 10,
      globalOutbound: 10,
      workspaceInbound: 10,
      workspaceOutbound: 10,
    });
    const calls = new m.MemoryCallsRepository();
    const callId = randomUUID();
    const delayedRuntime = {
      async executeVoiceTurn(input) {
        await sleep(30);
        return {
          assistant_text: "should not land",
          agent_id: "a",
          agent_version_id: "v",
          conversation_id: input.conversationId,
          latency_ms: 30,
          deduplicated: false,
        };
      },
    };
    const orch = new m.CallSessionOrchestrator(
      calls,
      caps,
      m.createMemoryRecordingStore(),
      m.createFakeSpeechBundle(undefined, { ttsDelayMs: 200 }),
      delayedRuntime,
      m.createLogger({ service: "voice-reliability-proof" }),
      "fallback",
    );
    const pending = orch.simulateCall({
      workspaceId: WS,
      conversationId: CONV,
      callId,
      direction: "inbound",
      utterance: { bytes: Buffer.from("barge", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    });
    await sleep(60);
    orch.bargeIn(callId);
    const result = await pending;
    assert.equal(result.barged_in, true);
    const transcript = await calls.listTranscript(WS, callId);
    assert.equal(transcript.filter((s) => s.speaker === "agent").length, 0);
    report.barge_in = true;
    console.log("PASS: barge-in cancels TTS path without agent transcript");
  }

  // 5) Fail-closed
  {
    const caps = m.createFailClosedCallCaps();
    const orch = new m.CallSessionOrchestrator(
      new m.MemoryCallsRepository(),
      caps,
      m.createMemoryRecordingStore(),
      m.createFakeSpeechBundle(),
      m.createFakeRuntimeClient(),
      m.createLogger({ service: "voice-reliability-proof" }),
      "fallback",
    );
    let refused = false;
    try {
      await orch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: { bytes: Buffer.from("x", "utf8"), encoding: "fake", sampleRateHz: 8000 },
      });
    } catch (err) {
      refused = err?.code === "UPSTREAM_UNAVAILABLE";
    }
    assert.equal(refused, true);
    report.redis_fail_closed = true;
    console.log("PASS: Redis fail-closed refuses new calls");
  }

  report.ok =
    report.cap &&
    report.hang_release &&
    report.reconnect &&
    report.barge_in &&
    report.redis_fail_closed;

  console.log(JSON.stringify(report));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
