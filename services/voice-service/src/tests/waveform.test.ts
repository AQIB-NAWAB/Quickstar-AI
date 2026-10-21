import assert from "node:assert/strict";
import test from "node:test";
import { computeNormalizedPeaks } from "../repository/calls.repository.js";

test("computeNormalizedPeaks returns array of requested length", () => {
  const peaks = computeNormalizedPeaks(30, [], "agent", 80);
  assert.equal(Array.isArray(peaks), true);
  assert.equal(peaks.length, 80);
  // With no speech, baseline idle noise should be present
  assert.equal(peaks.every((p) => p >= 0.05 && p <= 0.1), true);
});

test("computeNormalizedPeaks computes elevated peaks during speech segments", () => {
  const segments = [
    {
      id: "seg-1",
      sequence: 1,
      speaker: "agent" as const,
      text: "Hello, this is QuickStart AI.",
      start_ms: 1000,
      end_ms: 4000,
      finalized: true,
      confidence: 0.98,
    },
    {
      id: "seg-2",
      sequence: 2,
      speaker: "user" as const,
      text: "Yes, hello!",
      start_ms: 5000,
      end_ms: 7000,
      finalized: true,
      confidence: 0.95,
    },
  ];

  // 10 second call, 100 points
  const agentPeaks = computeNormalizedPeaks(10, segments, "agent", 100);
  const callerPeaks = computeNormalizedPeaks(10, segments, "caller", 100);

  assert.equal(agentPeaks.length, 100);
  assert.equal(callerPeaks.length, 100);

  // During 1s - 4s (indices 10 to 40), agent should have elevated peaks (> 0.2)
  const agentSpeechSlice = agentPeaks.slice(15, 35);
  assert.equal(agentSpeechSlice.some((p) => p > 0.2), true);

  // During 5s - 7s (indices 50 to 70), caller should have elevated peaks (> 0.2)
  const callerSpeechSlice = callerPeaks.slice(52, 68);
  assert.equal(callerSpeechSlice.some((p) => p > 0.2), true);

  // Agent should be quiet during caller's speech
  assert.equal(agentPeaks[60] < 0.15, true);
  // Caller should be quiet during agent's speech
  assert.equal(callerPeaks[25] < 0.15, true);
});

test("computeNormalizedPeaks bounds all peak values within [0.0, 1.0]", () => {
  const loudSegments = [
    {
      id: "loud-1",
      sequence: 1,
      speaker: "agent" as const,
      text: "Testing maximum amplitude bounds",
      start_ms: 0,
      end_ms: 5000,
      finalized: true,
      confidence: 1.0,
    },
  ];

  const peaks = computeNormalizedPeaks(5, loudSegments, "agent", 50);
  for (const peak of peaks) {
    assert.equal(peak >= 0.0, true, `Peak ${peak} below 0.0`);
    assert.equal(peak <= 1.0, true, `Peak ${peak} exceeds 1.0`);
  }
});
