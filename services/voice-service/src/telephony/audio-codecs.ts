/**
 * G.711 mu-law and PCM16 transcoding utility for Twilio Media Streams (8kHz mu-law)
 */

// G.711 mu-law expansion table (8-bit mu-law to 16-bit signed PCM)
const MULAW_TO_PCM = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let mu = ~i & 0xff;
  let sign = mu & 0x80;
  let exponent = (mu >> 4) & 0x07;
  let mantissa = mu & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  MULAW_TO_PCM[i] = sign !== 0 ? -sample : sample;
}

// Convert single 16-bit PCM sample (-32768 to 32767) to 8-bit mu-law
export function pcmSampleToMulaw(pcm: number): number {
  const CLIP = 32635;
  const BIAS = 0x84;

  let sign = (pcm >> 8) & 0x80;
  if (sign !== 0) pcm = -pcm;
  if (pcm > CLIP) pcm = CLIP;
  pcm += BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent--;
  }

  let mantissa = (pcm >> (exponent + 3)) & 0x0f;
  let mulaw = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulaw;
}

/**
 * Decode 8kHz mu-law buffer into 8kHz 16-bit linear PCM buffer
 */
export function mulawToPcm16(mulawBuf: Buffer): Buffer {
  const pcmBuf = Buffer.alloc(mulawBuf.length * 2);
  for (let i = 0; i < mulawBuf.length; i++) {
    const sample = MULAW_TO_PCM[mulawBuf[i]];
    pcmBuf.writeInt16LE(sample, i * 2);
  }
  return pcmBuf;
}

/**
 * Encode 8kHz 16-bit linear PCM buffer into 8kHz mu-law buffer
 */
export function pcm16ToMulaw(pcmBuf: Buffer): Buffer {
  const sampleCount = Math.floor(pcmBuf.length / 2);
  const mulawBuf = Buffer.alloc(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const sample = pcmBuf.readInt16LE(i * 2);
    mulawBuf[i] = pcmSampleToMulaw(sample);
  }
  return mulawBuf;
}

/**
 * Resample 16-bit linear PCM audio buffer between two sample rates (e.g. 8000 <-> 16000 or 24000)
 */
export function resamplePcm16(
  inputBuffer: Buffer,
  fromRate: number,
  toRate: number,
): Buffer {
  if (fromRate === toRate || inputBuffer.length === 0) return inputBuffer;

  const numInputSamples = Math.floor(inputBuffer.length / 2);
  const ratio = toRate / fromRate;
  const numOutputSamples = Math.floor(numInputSamples * ratio);
  const outputBuffer = Buffer.alloc(numOutputSamples * 2);

  for (let i = 0; i < numOutputSamples; i++) {
    const srcIndex = i / ratio;
    const indexLow = Math.floor(srcIndex);
    const indexHigh = Math.min(indexLow + 1, numInputSamples - 1);
    const frac = srcIndex - indexLow;

    const sampleLow = inputBuffer.readInt16LE(indexLow * 2);
    const sampleHigh = inputBuffer.readInt16LE(indexHigh * 2);
    const interpolated = Math.round(sampleLow * (1 - frac) + sampleHigh * frac);
    const clamped = Math.max(-32768, Math.min(32767, interpolated));

    outputBuffer.writeInt16LE(clamped, i * 2);
  }

  return outputBuffer;
}

/**
 * Transcode incoming Twilio 8kHz mu-law payload to 16kHz PCM16 for STT / speech pipelines
 */
export function twilioMulawToPcm16(mulawBase64OrBuffer: string | Buffer, targetRate = 16000): Buffer {
  const mulawBuf = typeof mulawBase64OrBuffer === "string"
    ? Buffer.from(mulawBase64OrBuffer, "base64")
    : mulawBase64OrBuffer;
  const pcm8k = mulawToPcm16(mulawBuf);
  return resamplePcm16(pcm8k, 8000, targetRate);
}

/**
 * Transcode outgoing PCM16 audio (at fromRate, e.g. 16000Hz or 24000Hz) to Twilio 8kHz mu-law base64
 */
export function pcm16ToTwilioMulawBase64(pcmBuffer: Buffer, fromRate = 16000): string {
  const pcm8k = resamplePcm16(pcmBuffer, fromRate, 8000);
  const mulawBuf = pcm16ToMulaw(pcm8k);
  return mulawBuf.toString("base64");
}
