export type InboundCallStatus = "live" | "completed" | "failed" | "transferred";

export interface InboundCall {
  id: string;
  workspaceId: string;
  caller: string; // phone number or display identity
  agentId: string;
  agentName: string;
  startedAt: string; // ISO UTC
  endedAt: string | null;
  durationSeconds: number; // total duration
  status: InboundCallStatus;
  timeToFirstAudioMs: number | null; // e.g. 910
  conversationId?: string | null;
  disconnectReason?: string | null;
  recordingAvailable?: boolean;
}

export interface TranscriptSegment {
  id: string;
  sequence: number;
  speaker: "user" | "agent";
  text: string;
  startMs: number; // offset from audio start
  endMs: number;
  occurredAt?: string;
  processingTurnId?: string;
}

export interface ProcessingTurn {
  id: string;
  turnNumber: number;
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
  isAdditive: boolean;
}

export interface VoiceWaveform {
  callId: string;
  durationSeconds: number;
  peaks: number[];
  agentPeaks: number[];
  callerPeaks: number[];
  stereoAvailable: boolean;
}

export interface VoiceInboundSummary {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  avgDurationSeconds: number;
  avgFirstAudioMs: number;
  activeCalls: number;
}

export interface InboundCallDetail extends InboundCall {
  recordingAvailable: boolean;
  recordingDurationSeconds?: number;
  recordingUrl?: string | null;
  callerRecordingUrl?: string | null;
  callerRecordingAvailable?: boolean;
  recordingOffsetMs?: number;
  callerRecordingOffsetMs?: number;
  waveform?: VoiceWaveform | null;
  transcript: TranscriptSegment[];
  processingTurns: ProcessingTurn[];
  disposition: string;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface CallLogFilters {
  q?: string;
  status?: string;
  agent?: string;
  agentId?: string;
  range?: "7d" | "30d" | "custom";
  fromDate?: string;
  toDate?: string;
  cursor?: string;
}

export interface VoiceRepository {
  getInboundSummary(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<VoiceInboundSummary>>;

  listInboundCalls(
    workspaceId: string,
    filters?: CallLogFilters,
    signal?: AbortSignal,
  ): Promise<
    RepositoryResult<{
      calls: InboundCall[];
      total?: number;
      nextCursor?: string;
      prevCursor?: string;
    }>
  >;

  listLiveInboundCalls(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<InboundCall[]>>;

  getInboundCall(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<InboundCallDetail>>;

  getWaveform(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<VoiceWaveform>>;

  getTranscript(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal,
  ): Promise<
    RepositoryResult<{
      segments: TranscriptSegment[];
      processingTurns?: ProcessingTurn[];
    }>
  >;
}
