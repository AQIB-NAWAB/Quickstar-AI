import { ApiVoiceRepository } from "./api-repository";
import { voicePreviewStore } from "./preview-store";
import type { VoiceRepository } from "./types";

const apiVoiceRepository = new ApiVoiceRepository();

export function getVoiceRepository(isPreview: boolean): VoiceRepository {
  if (isPreview) {
    return voicePreviewStore;
  }
  return apiVoiceRepository;
}
