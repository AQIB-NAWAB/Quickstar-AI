import { voicePreviewStore } from "./preview-store";
import type {
CallLogFilters,
InboundCall,
InboundCallDetail,
RepositoryResult,
VoiceRepository,
} from "./types";

class UnavailableVoiceRepository implements VoiceRepository {
  async listInboundCalls(
    _workspaceId: string,
    _filters?: CallLogFilters,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ calls: InboundCall[]; nextCursor?: string; prevCursor?: string }>> {
    void _workspaceId;
    void _filters;
    void _signal;
    return {
      status: "unavailable",
      message: "Inbound voice telephony service is not connected for this workspace.",
    };
  }

  async listLiveInboundCalls(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCall[]>> {
    void _workspaceId;
    void _signal;
    return {
      status: "unavailable",
      message: "Live call monitoring is not available. Telephony service is disconnected.",
    };
  }

  async getInboundCall(
    _workspaceId: string,
    _callId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCallDetail>> {
    void _workspaceId;
    void _callId;
    void _signal;
    return {
      status: "unavailable",
      message: "Call detail records are not available. Telephony service is disconnected.",
    };
  }
}

export const unavailableVoiceRepository = new UnavailableVoiceRepository();

export function getVoiceRepository(isPreview: boolean): VoiceRepository {
  if (isPreview) {
    return voicePreviewStore;
  }
  return unavailableVoiceRepository;
}
