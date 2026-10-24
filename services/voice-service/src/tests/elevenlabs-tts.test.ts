import assert from "node:assert/strict";
import test from "node:test";
import { ElevenLabsTextToSpeech } from "../speech/elevenlabs-tts.js";

test("ElevenLabs TTS uses the configured model, voice, and streaming endpoint", async () => {
  const requests: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([0x49, 0x44, 0x33]));
          controller.enqueue(new Uint8Array([0x04, 0x05]));
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "audio/mpeg" } },
    );
  };

  const tts = new ElevenLabsTextToSpeech({
    apiKey: "el-secret",
    model: "eleven_v4",
    voiceId: "voice-1",
    fetchImpl,
  });

  const result = await tts.synthesize("Hello there", "reference");
  assert.equal(result.provider, "elevenlabs-tts");
  assert.equal(result.audio.encoding, "mp3");
  assert.deepEqual([...result.audio.bytes], [0x49, 0x44, 0x33, 0x04, 0x05]);
  assert.match(requests[0].url, /\/v1\/text-to-speech\/voice-1\/stream/);
  assert.equal(requests[0].headers["xi-api-key"], "el-secret");
  assert.equal(requests[0].body.model_id, "eleven_v4");
  assert.equal(requests[0].body.text, "Hello there");
});

test("ElevenLabs streaming emits chunks as they arrive", async () => {
  const chunks: Buffer[] = [];
  const fetchImpl: typeof fetch = async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
          controller.enqueue(new Uint8Array([3, 4, 5]));
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "audio/mpeg" } },
    );
  const tts = new ElevenLabsTextToSpeech({
    apiKey: "el-secret",
    voiceId: "voice-1",
    fetchImpl,
  });
  const metrics = await tts.streamSynthesize("Hello", "reference", (audio) => {
    chunks.push(audio.bytes);
  });
  assert.equal(chunks.length, 2);
  assert.deepEqual([...Buffer.concat(chunks)], [1, 2, 3, 4, 5]);
  assert.ok(metrics.firstChunkLatencyMs > 0);
});
