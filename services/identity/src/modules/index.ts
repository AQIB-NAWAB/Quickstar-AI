import type { ServiceConfig } from "../config/environment.js";
import type { IdentityStore } from "../domain/ports/identity-store.repository.js";
import type { SessionRevocation } from "../infrastructure/redis/session-revocation.adapter.js";
import { createApiKeysService } from "./api-keys/api-keys.service.js";
import { createAuthService } from "./auth/auth.service.js";
import { createOrganizationsService } from "./organizations/organizations.service.js";
import { createUsersService } from "./users/users.service.js";

export type IdentityModules = {
  auth: ReturnType<typeof createAuthService>;
  users: ReturnType<typeof createUsersService>;
  organizations: ReturnType<typeof createOrganizationsService>;
  apiKeys: ReturnType<typeof createApiKeysService>;
};

export type IdentityModuleDeps = {
  repository: IdentityStore;
  sessions: SessionRevocation;
  config: ServiceConfig;
};

export function createIdentityModules(deps: IdentityModuleDeps): IdentityModules {
  const { repository, sessions, config } = deps;
  return {
    auth: createAuthService({ repository, sessions, config }),
    users: createUsersService(repository),
    organizations: createOrganizationsService(repository),
    apiKeys: createApiKeysService(repository),
  };
}
