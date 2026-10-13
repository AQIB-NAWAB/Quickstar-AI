/**
 * Feature 21B — Speech providers Done when proof.
 *
 * Default (SPEECH_PROOF_MODE=fixture):
 *   Runs voice-service speech unit tests that exercise OpenAI adapter code paths
 *   against HTTP fixtures (no live spend, no API key required).
 *   Also asserts fail-closed boot rules via assertSpeechBootAllowed.
 *
 * Optional live (SPEECH_PROOF_MODE=live + OPENAI_API_KEY):
 *   Documents that operators can set SPEECH_PROFILE=openai and re-run
 *   check-voice-simulate-proof.mjs against a running voice-service.
 *
 * Regression: keep Feature 21 green with SPEECH_PROFILE=fake:
 *   node --env-file=.env scripts/check-voice-simulate-proof.mjs
 *
 * Usage:
 *   node --env-file=.env scripts/check-voice-speech-proof.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import console from "node:console";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = (process.env.SPEECH_PROOF_MODE ?? "fixture").toLowerCase();

async function fixtureProof() {
  const factoryUrl = pathToFileURL(
    path.join(root, "services/voice-service/dist/speech/factory.js"),
  ).href;
  const { assertSpeechBootAllowed, createSpeechBundle } = await import(factoryUrl);

  assert.throws(
    () => assertSpeechBootAllowed({ profile: "fake", requireRealSpeech: true }),
    /VOICE_REQUIRE_REAL_SPEECH/,
  );
  console.log("PASS: fail-closed rejects fake profile when real speech required");

  assert.throws(
    () =>
      assertSpeechBootAllowed({
        profile: "openai",
        requireRealSpeech: true,
        openaiApiKey: undefined,
      }),
    /OPENAI_API_KEY/,
  );
  console.log("PASS: fail-closed rejects openai profile without key");

  const fetchImpl = async (url) => {
    const href = String(url);
    if (href.includes("/audio/transcriptions")) {
      return new Response(JSON.stringify({ text: "proof transcript" }), { status: 200 });
    }
    return new Response(Buffer.from("proof-mp3"), { status: 200 });
  };

  const usage = [];
  const bundle = createSpeechBundle({
    profile: "openai",
    openaiApiKey: "sk-fixture-not-real",
    requireRealSpeech: true,
    circuitFailureThreshold: 5,
    circuitCooldownMs: 30_000,
    httpTimeoutMs: 5_000,
    fetchImpl,
    emitUsage: (f) => usage.push(f),
  });

  const stt = await bundle.stt.transcribe({
    bytes: Buffer.from("hello", "utf8"),
    encoding: "fake",
    sampleRateHz: 8000,
  });
  assert.equal(stt.text, "proof transcript");
  assert.equal(stt.provider, "openai-stt");

  const tts = await bundle.tts.synthesize("hello", "alloy");
  assert.equal(tts.provider, "openai-tts");
  assert.ok(tts.audio.bytes.length > 0);

  const dumped = JSON.stringify(usage);
  assert.equal(dumped.includes("sk-fixture"), false);
  assert.ok(usage.some((u) => u.unit === "stt"));
  assert.ok(usage.some((u) => u.unit === "tts"));
  console.log("PASS: OpenAI adapter code paths (fixture fetch) + usage stubs without key leak");

  const testFile = path.join(root, "services/voice-service/dist/tests/speech-openai.test.js");
  const ran = spawnSync(process.execPath, ["--test", testFile], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (ran.status !== 0) {
    console.error(ran.stdout);
    console.error(ran.stderr);
    throw new Error("speech-openai unit tests failed");
  }
  console.log("PASS: speech-openai.test.js");
}

async function liveHint() {
  const key = process.env.SPEECH_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  assert.ok(key, "SPEECH_PROOF_MODE=live requires SPEECH_OPENAI_API_KEY or OPENAI_API_KEY");
  console.log("PASS: live key present");
  console.log(
    "Next: SPEECH_PROFILE=openai VOICE_REQUIRE_REAL_SPEECH=1 restart voice-service,",
  );
  console.log("then: node --env-file=.env scripts/check-voice-simulate-proof.mjs");
  console.log("(live STT needs real audio; fixture mode is the CI Done-when bar)");
}

async function main() {
  if (mode === "live") {
    await liveHint();
  } else {
    await fixtureProof();
  }
  console.log("");
  console.log("Feature 21B speech proof: ALL CHECKS PASSED");
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exitCode = 1;
});
