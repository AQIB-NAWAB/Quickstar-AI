import type { WorkspaceRole } from "./workspace-permissions.js";

/** Cached workspace membership row (Feature 09B). Postgres + workspace-service remain source of truth. */
export type MembershipSnapshot = {
  role: WorkspaceRole;
  cached_at: string;
  /** When true, actor is not a member (negative cache). */
  deny?: boolean;
};
