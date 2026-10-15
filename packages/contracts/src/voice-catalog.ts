/** Cascade TTS voices the agent builder can preview and pin. Six entries, three providers. */

export const TTS_PROVIDERS = ["uplift", "cartesia", "fish"] as const;
export type TtsProviderId = (typeof TTS_PROVIDERS)[number];

export type VoiceCatalogEntry = {
  /** Stored on the agent as `tts_voice_id`. */
  id: string;
  provider: TtsProviderId;
  /** Provider-native voice id. Fish uses the workspace `FISH_AUDIO_REFERENCE_ID` when this is `reference`. */
  voice_id: string;
  label: string;
  language: string;
  description: string;
  sample_text: string;
};

export const VOICE_CATALOG: readonly VoiceCatalogEntry[] = [
  {
    id: "uplift:v_8eelc901",
    provider: "uplift",
    voice_id: "v_8eelc901",
    label: "Uplift Info",
    language: "ur-PK",
    description: "Clear Urdu, education and support.",
    sample_text: "سلام، میں آپ کی کس طرح مدد کر سکتا ہوں؟",
  },
  {
    id: "uplift:v_30s70t3a",
    provider: "uplift",
    voice_id: "v_30s70t3a",
    label: "Uplift News",
    language: "ur-PK",
    description: "Pakistani news cadence.",
    sample_text: "آج کی اہم خبر یہ ہے کہ آپ کا آرڈر تصدیق ہو گیا ہے۔",
  },
  {
    id: "uplift:v_meklc281",
    provider: "uplift",
    voice_id: "v_meklc281",
    label: "Uplift Urdu",
    language: "ur-PK",
    description: "Urdu female conversational voice.",
    sample_text: "آپ کا آرڈر کنفرم ہو گیا ہے۔ میں مزید کس طرح مدد کروں؟",
  },
  {
    id: "cartesia:6c756032-11c3-4be8-a120-74f9673fb700",
    provider: "cartesia",
    voice_id: "6c756032-11c3-4be8-a120-74f9673fb700",
    label: "Cartesia Harlow",
    language: "en",
    description: "Warm English support voice.",
    sample_text: "Thanks for calling. I can help you book a demo or answer a pricing question.",
  },
  {
    id: "cartesia:d463004e-0353-4063-80d4-2fabbf1c5dcb",
    provider: "cartesia",
    voice_id: "d463004e-0353-4063-80d4-2fabbf1c5dcb",
    label: "Cartesia Hina",
    language: "ur",
    description: "Urdu, steady and clear.",
    sample_text: "سلام، میں آپ کی کس طرح مدد کر سکتا ہوں؟",
  },
  {
    id: "fish:reference",
    provider: "fish",
    voice_id: "reference",
    label: "Fish reference",
    language: "en",
    description: "The Fish Audio voice id in FISH_AUDIO_REFERENCE_ID.",
    sample_text: "Thanks for calling. I can help you book a demo or answer a pricing question.",
  },
] as const;

export function findVoiceCatalogEntry(id: string | undefined | null): VoiceCatalogEntry | undefined {
  const key = id?.trim();
  if (!key || key === "default") return undefined;
  return VOICE_CATALOG.find((entry) => entry.id === key);
}
