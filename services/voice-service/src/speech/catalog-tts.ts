import { findVoiceCatalogEntry, VOICE_CATALOG, type TtsProviderId } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { CartesiaTextToSpeech } from "./cartesia-tts.js";
import { FishAudioTextToSpeech } from "./fish-tts.js";
import type { AudioChunk, SynthesisResult, SynthesisStreamMetrics, TextToSpeech } from "./types.js";
import { UpliftTextToSpeech } from "./uplift-tts.js";

export type CatalogTtsOptions = {
  upliftApiKey?: string;
  cartesiaApiKey?: string;
  cartesiaModel?: string;
  fishApiKey?: string;
  fishModel?: string;
  fishReferenceId?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class CatalogTextToSpeech implements TextToSpeech {
  readonly id = "catalog-tts";
  readonly availability: Record<TtsProviderId, boolean>;
  private readonly uplift?: UpliftTextToSpeech;
  private readonly cartesia?: CartesiaTextToSpeech;
  private readonly fish?: FishAudioTextToSpeech;

  constructor(private readonly options: CatalogTtsOptions) {
    this.uplift = options.upliftApiKey
      ? new UpliftTextToSpeech({
          apiKey: options.upliftApiKey,
          timeoutMs: options.timeoutMs,
          fetchImpl: options.fetchImpl,
        })
      : undefined;
    this.cartesia = options.cartesiaApiKey
      ? new CartesiaTextToSpeech({
          apiKey: options.cartesiaApiKey,
          model: options.cartesiaModel,
          timeoutMs: options.timeoutMs,
          fetchImpl: options.fetchImpl,
        })
      : undefined;
    this.fish = options.fishApiKey
      ? new FishAudioTextToSpeech({
          apiKey: options.fishApiKey,
          model: options.fishModel ?? "s2-pro",
          referenceId: options.fishReferenceId,
          timeoutMs: options.timeoutMs,
          fetchImpl: options.fetchImpl,
        })
      : undefined;
    this.availability = {
      uplift: Boolean(this.uplift),
      cartesia: Boolean(this.cartesia),
      fish: Boolean(this.fish && options.fishReferenceId),
    };
  }

  listVoices() {
    return VOICE_CATALOG.map((entry) => ({
      ...entry,
      available: this.availability[entry.provider],
    }));
  }

  async synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult> {
    const requested = findVoiceCatalogEntry(voiceId);
    const entry =
      requested ??
      this.listVoices().find((voice) => voice.available) ??
      VOICE_CATALOG[0];
    const nativeId =
      entry.provider === "fish" && entry.voice_id === "reference"
        ? this.options.fishReferenceId?.trim() || ""
        : entry.voice_id;
    const impl =
      entry.provider === "uplift"
        ? this.uplift
        : entry.provider === "cartesia"
          ? this.cartesia
          : this.fish;
    if (!impl || !nativeId) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `${entry.provider} is not configured. Add the API key (and Fish reference id) before previewing ${entry.label}.`,
      });
    }
    if (entry.provider === "cartesia" && this.cartesia) {
      return this.cartesia.synthesize(text, nativeId, signal, entry.language);
    }
    return impl.synthesize(text, nativeId, signal);
  }

  async streamSynthesize(
    text: string,
    voiceId: string,
    onAudio: (audio: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<SynthesisStreamMetrics> {
    const requested = findVoiceCatalogEntry(voiceId);
    const entry = requested ?? this.listVoices().find((voice) => voice.available) ?? VOICE_CATALOG[0];
    const nativeId =
      entry.provider === "fish" && entry.voice_id === "reference"
        ? this.options.fishReferenceId?.trim() || ""
        : entry.voice_id;
    const impl = entry.provider === "uplift" ? this.uplift : entry.provider === "cartesia" ? this.cartesia : this.fish;
    if (!impl || !nativeId) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `${entry.provider} is not configured. Add the API key (and Fish reference id) before previewing ${entry.label}.`,
      });
    }
    const streamingImpl = impl as TextToSpeech;
    if (streamingImpl.streamSynthesize) {
      return streamingImpl.streamSynthesize(text, nativeId, onAudio, signal);
    }

    // Other catalog providers retain their existing full-clip path.
    const started = Date.now();
    const result =
      entry.provider === "cartesia" && this.cartesia
        ? await this.cartesia.synthesize(text, nativeId, signal, entry.language)
        : await impl.synthesize(text, nativeId, signal);
    onAudio(result.audio);
    return { firstChunkLatencyMs: Date.now() - started, latencyMs: result.latencyMs };
  }
}

export function createCatalogTextToSpeech(options: CatalogTtsOptions): CatalogTextToSpeech | null {
  if (!options.upliftApiKey && !options.cartesiaApiKey && !options.fishApiKey) return null;
  return new CatalogTextToSpeech(options);
}
