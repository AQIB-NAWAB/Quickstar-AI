/**
 * Operator Queues and Live Conversation Handoff Contracts
 */

export type QueuePriority = "low" | "normal" | "high" | "urgent";

export type HandoffStatus =
  | "queued"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "returned_to_bot";

export type OperatorQueue = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  routingStrategy: "round_robin" | "manual_claim" | "least_active";
  maxWaitTimeSeconds: number;
  pauseAiOnHandoff: boolean;
  activeAgentsCount?: number;
  openConversationsCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type OperatorQueueMember = {
  id: string;
  queueId: string;
  workspaceId: string;
  userId: string;
  isOnline: boolean;
  assignedCount: number;
  createdAt: string;
};

export type ConversationHandoffRecord = {
  id: string;
  workspaceId: string;
  conversationId: string;
  queueId: string;
  status: HandoffStatus;
  priority: QueuePriority;
  assignedOperatorId?: string | null;
  handoffReason?: string | null;
  workflowRunId?: string | null;
  internalNote?: string | null;
  visitorMessage?: string | null;
  queuedAt: string;
  assignedAt?: string | null;
  resolvedAt?: string | null;
};

export type CreateQueueRequest = {
  name: string;
  description?: string;
  routingStrategy?: "round_robin" | "manual_claim" | "least_active";
  maxWaitTimeSeconds?: number;
  pauseAiOnHandoff?: boolean;
};

export type UpdateQueueRequest = Partial<CreateQueueRequest>;

export type EnqueueConversationRequest = {
  conversationId: string;
  queueId: string;
  priority?: QueuePriority;
  reason?: string;
  internalNote?: string;
  visitorMessage?: string;
  workflowRunId?: string;
};

export type ClaimConversationRequest = {
  operatorId: string;
};

export type QueuesListResponse = {
  queues: OperatorQueue[];
  total: number;
};
