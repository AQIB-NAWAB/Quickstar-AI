import type { WorkspaceStore } from "../repository/types.js";
import { WorkspacesService } from "./workspaces.service.js";
import { MembersService } from "./members.service.js";
import { AuthorizationService } from "./authorization.service.js";

export * from "./workspaces.service.js";
export * from "./members.service.js";
export * from "./authorization.service.js";

export function createWorkspaceServices(store: WorkspaceStore) {
  return {
    workspaces: new WorkspacesService(store),
    members: new MembersService(store),
    authorization: new AuthorizationService(store),
  };
}
