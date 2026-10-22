import {
  SAMPLE_INBOUND_CALLS,
  SAMPLE_INBOUND_CALL_DETAIL_1042,
  SAMPLE_LIVE_CALLS,
} from "./fixtures";
import type {
  CallLogFilters,
  InboundCall,
  InboundCallDetail,
  ProcessingTurn,
  RepositoryResult,
  TranscriptSegment,
  VoiceInboundSummary,
  VoiceRepository,
  VoiceWaveform,
} from "./types";

class InMemoryVoicePreviewStore implements VoiceRepository {
  private calls: InboundCall[] = [];
  private liveCalls: InboundCall[] = [];
  private callDetails: Map<string, InboundCallDetail> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.calls = JSON.parse(JSON.stringify(SAMPLE_INBOUND_CALLS));
    this.liveCalls = JSON.parse(JSON.stringify(SAMPLE_LIVE_CALLS));
    this.callDetails.clear();
    this.callDetails.set("call_1042", JSON.parse(JSON.stringify(SAMPLE_INBOUND_CALL_DETAIL_1042)));
  }

  async getInboundSummary(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<VoiceInboundSummary>> {
    return {
      status: "ready",
      data: {
        totalCalls: this.calls.length,
        completedCalls: this.calls.filter((c) => c.status === "completed").length,
        failedCalls: this.calls.filter((c) => c.status === "failed").length,
        avgDurationSeconds: 142,
        avgFirstAudioMs: 420,
        activeCalls: this.liveCalls.length,
      },
    };
  }

  async getWaveform(
    _workspaceId: string,
    _callId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<VoiceWaveform>> {
    return {
      status: "ready",
      data: {
        callId: _callId,
        durationSeconds: 120,
        peaks: [0.2, 0.5, 0.8, 0.6, 0.7, 0.8, 0.5, 0.9, 0.4, 0.1],
        agentPeaks: [0.1, 0.4, 0.8, 0.6, 0.2, 0.1, 0.5, 0.9, 0.3, 0.1],
        callerPeaks: [0.2, 0.5, 0.3, 0.1, 0.7, 0.8, 0.4, 0.2, 0.1, 0.0],
        stereoAvailable: true,
      },
    };
  }

  async getTranscript(
    _workspaceId: string,
    callId: string,
    _signal?: AbortSignal
  ): Promise<
    RepositoryResult<{
      segments: TranscriptSegment[];
      processingTurns?: ProcessingTurn[];
    }>
  > {
    const detail = this.callDetails.get(callId);
    return {
      status: "ready",
      data: {
        segments: detail?.transcript ?? [],
        processingTurns: detail?.processingTurns ?? [],
      },
    };
  }

  async listInboundCalls(
    _workspaceId: string,
    filters?: CallLogFilters,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ calls: InboundCall[]; nextCursor?: string; prevCursor?: string }>> {
    void _workspaceId;
    void _signal;
    let result = [...this.calls];

    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      result = result.filter(
        (c) => c.caller.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "all") {
      result = result.filter((c) => c.status.toLowerCase() === filters.status?.toLowerCase());
    }

    if (filters?.agent && filters.agent !== "all") {
      result = result.filter((c) => c.agentId === filters.agent || c.agentName === filters.agent);
    }

    return {
      status: "ready",
      data: {
        calls: result,
      },
    };
  }

  async listLiveInboundCalls(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCall[]>> {
    void _workspaceId;
    void _signal;
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(this.liveCalls)),
    };
  }

  async getInboundCall(
    _workspaceId: string,
    callId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCallDetail>> {
    void _workspaceId;
    void _signal;
    const detail = this.callDetails.get(callId);
    if (detail) {
      return {
        status: "ready",
        data: JSON.parse(JSON.stringify(detail)),
      };
    }

    // Fallback: check if call exists in calls list and synthesize basic detail
    const basic = this.calls.find((c) => c.id === callId);
    if (basic) {
      const synthDetail: InboundCallDetail = {
        ...basic,
        recordingAvailable: false,
        recordingDurationSeconds: basic.durationSeconds,
        recordingUrl: null,
        transcript: [],
        processingTurns: [],
        disposition: basic.status === "completed" ? "Completed" : basic.status,
      };
      return {
        status: "ready",
        data: synthDetail,
      };
    }

    return {
      status: "not_found",
      message: `Inbound call ${callId} was not found.`,
    };
  }
}

export const voicePreviewStore = new InMemoryVoicePreviewStore();
