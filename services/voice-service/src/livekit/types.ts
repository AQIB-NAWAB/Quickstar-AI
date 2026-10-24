export type InboundBridgeStartInput = {
  roomName: string;
  workspaceId: string;
  agentId: string;
  callId: string;
  conversationId: string;
  caller: string | null;
};

/** Media bridge contract used by the LiveKit webhook lifecycle. */
export interface InboundCallBridge {
  start(input: InboundBridgeStartInput): Promise<void>;
  stop(roomName: string): Promise<void>;
  stopAll?(): Promise<void>;
}
