import type { RedisClientType } from "redis";
import { invalidateMembershipCache } from "@quickstart/workspace-access";
import type { WorkspaceStore } from "../repository/types.js";
import { WorkspacesService } from "./workspaces.service.js";
import { MembersService } from "./members.service.js";
import { AuthorizationService } from "./authorization.service.js";
import {
  PublishableKeysService,
  type PublishableKeysStorePort,
} from "./publishable-keys.service.js";

import { IntegrationsRepository } from "../repository/integrations.repository.js";
import { IntegrationsService } from "./integrations.service.js";
import { NotificationsRepository } from "../repository/notifications.repository.js";
import { NotificationsService } from "./notifications.service.js";
import { WebhooksRepository } from "../repository/webhooks.repository.js";
import { WebhooksService } from "./webhooks.service.js";

export * from "./workspaces.service.js";
export * from "./members.service.js";
export * from "./authorization.service.js";
export * from "./publishable-keys.service.js";
export * from "./integrations.service.js";
export * from "./notifications.service.js";
export * from "./webhooks.service.js";

export function createWorkspaceServices(
  store: WorkspaceStore,
  publishableKeysStore?: PublishableKeysStorePort,
  redis?: RedisClientType,
  integrationsRepo?: IntegrationsRepository,
  notificationsRepo?: NotificationsRepository,
  webhooksRepo?: WebhooksRepository,
) {
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
    publishableKeys: publishableKeysStore
      ? new PublishableKeysService(publishableKeysStore)
      : undefined,
    integrations: integrationsRepo ? new IntegrationsService(integrationsRepo) : undefined,
    notifications: notificationsRepo ? new NotificationsService(notificationsRepo) : undefined,
    webhooks: webhooksRepo ? new WebhooksService(webhooksRepo) : undefined,
  };
}
