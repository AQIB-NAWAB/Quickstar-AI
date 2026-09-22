import type { ServiceConfig } from "../config/environment.js";
import type { IdentityStore } from "../repository/identity-store.types.js";
import type { SessionRevocation } from "../utils/session-revocation.js";
import { createApiKeysService } from "./api-keys.service.js";
import { createAuthService } from "./auth.service.js";
import { createOrganizationsService } from "./organizations.service.js";
import { createUsersService } from "./users.service.js";

export type IdentityServices = {
  auth: ReturnType<typeof createAuthService>;
  users: ReturnType<typeof createUsersService>;
  organizations: ReturnType<typeof createOrganizationsService>;
  apiKeys: ReturnType<typeof createApiKeysService>;
};

export function createIdentityServices(deps: {
  repository: IdentityStore;
  sessions: SessionRevocation;
  config: ServiceConfig;
}): IdentityServices {
  const { repository, sessions, config } = deps;
  return {
    auth: createAuthService({ repository, sessions, config }),
    users: createUsersService(repository),
    organizations: createOrganizationsService(repository),
    apiKeys: createApiKeysService(repository),
  };
}
