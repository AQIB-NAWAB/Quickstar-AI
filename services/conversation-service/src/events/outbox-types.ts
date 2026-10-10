export type OutboxRow = {
  id: string;
  workspaceId: string;
  type: string;
  payload: Record<string, unknown>;
  requestId: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};
