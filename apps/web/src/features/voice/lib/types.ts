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

export interface InboundCallDetail extends InboundCall {
  recordingAvailable: boolean;
  recordingDurationSeconds?: number;
  recordingUrl?: string | null;
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
  range?: "7d" | "30d" | "custom";
  fromDate?: string;
  toDate?: string;
  cursor?: string;
}

export interface VoiceRepository {
  listInboundCalls(
    workspaceId: string,
    filters?: CallLogFilters,
    signal?: AbortSignal
  ): Promise<RepositoryResult<{ calls: InboundCall[]; nextCursor?: string; prevCursor?: string }>>;

  listLiveInboundCalls(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCall[]>>;

  getInboundCall(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<InboundCallDetail>>;
}
