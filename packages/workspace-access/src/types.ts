import type { WorkspaceRole } from "@quickstart/contracts";

export type WorkspaceAccessClient = {
  resolveRole(
    workspaceId: string,
    actorId: string,
    authorizationHeader: string | undefined,
    requestId: string,
  ): Promise<WorkspaceRole>;
};
