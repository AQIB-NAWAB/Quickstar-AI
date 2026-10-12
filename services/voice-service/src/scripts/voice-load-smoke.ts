/**
 * Feature V1 — voice load and drain proof (local shape, not 5k on a laptop).
 * Simulates N concurrent calls against in-memory caps + orchestrator.
 */
import { createLogger } from "@quickstart/logging";
import { createMemoryCallCaps } from "../caps/call-caps.js";
import { createFakeRuntimeClient } from "../clients/runtime.client.js";
import { MemoryCallsRepository } from "../repository/calls.repository.js";
import { createMemoryRecordingStore } from "../repository/recording.store.js";
import { createFakeSpeechBundle } from "../speech/fake-tts.js";
import { CallSessionOrchestrator } from "../session/orchestrator.js";

const N = Number(process.env.VOICE_LOAD_N ?? 50);
const CAP = Number(process.env.VOICE_LOAD_CAP ?? 40);
const WS = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";

async function main(): Promise<void> {
  const caps = createMemoryCallCaps({
    globalInbound: CAP,
    globalOutbound: CAP,
    workspaceInbound: CAP,
    workspaceOutbound: CAP,
  });
  const orch = new CallSessionOrchestrator(
    new MemoryCallsRepository(),
    caps,
    createMemoryRecordingStore(),
    createFakeSpeechBundle(),
    createFakeRuntimeClient(),
    createLogger({ service: "voice-load-smoke" }),
    "fallback",
  );

  let ok = 0;
  let rejected = 0;
  const jobs = Array.from({ length: N }, async (_, i) => {
    try {
      await orch.simulateCall({
        workspaceId: WS,
        conversationId: CONV,
        direction: "inbound",
        utterance: {
          bytes: Buffer.from(`utterance-${i}`, "utf8"),
          encoding: "fake",
          sampleRateHz: 8000,
        },
      });
      ok += 1;
    } catch {
      rejected += 1;
    }
  });
  await Promise.all(jobs);

  orch.setDraining(true);
  let drainRejected = false;
  try {
    await orch.simulateCall({
      workspaceId: WS,
      conversationId: CONV,
      direction: "inbound",
      utterance: { bytes: Buffer.from("drain", "utf8"), encoding: "fake", sampleRateHz: 8000 },
    });
  } catch {
    drainRejected = true;
  }

  console.log(
    JSON.stringify({
      n: N,
      cap: CAP,
      completed: ok,
      rejected_by_cap: rejected,
      drain_refused_new: drainRejected,
      ok: ok <= CAP && rejected >= N - CAP && drainRejected,
    }),
  );
  if (!(ok <= CAP && rejected >= N - CAP && drainRejected)) {
    process.exit(1);
  }
}

void main();
