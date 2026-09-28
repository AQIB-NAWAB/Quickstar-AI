import type { RedisClientType } from "redis";
import { invalidateMembershipCache } from "@quickstart/workspace-access";
import type { WorkspaceStore } from "../repository/types.js";
import { WorkspacesService } from "./workspaces.service.js";
import { MembersService } from "./members.service.js";
import { AuthorizationService } from "./authorization.service.js";

export * from "./workspaces.service.js";
export * from "./members.service.js";
export * from "./authorization.service.js";

export function createWorkspaceServices(store: WorkspaceStore, redis?: RedisClientType) {
  const cacheHooks = redis
    ? {
        onMembershipChanged: async (workspaceId: string, userId: string) => {
          await invalidateMembershipCache(redis, workspaceId, userId);
        },
      }
    : undefined;

  return {
    workspaces: new WorkspacesService(store),
    members: new MembersService(store, cacheHooks),
    authorization: new AuthorizationService(store),
  };
}
