import type { PublishableKeysStorePort } from "../services/publishable-keys.service.js";
import type { PublishableKeysRepository } from "./publishable-keys.repository.js";
import type { MemoryPublishableKeysStore } from "./memory-publishable-keys.js";

export function publishableKeysPortFromPg(repo: PublishableKeysRepository): PublishableKeysStorePort {
  return {
    create: (input) => repo.create(input),
    listByWorkspace: (workspaceId) => repo.listByWorkspace(workspaceId),
    getById: (workspaceId, keyId) => repo.getById(workspaceId, keyId),
    findByPrefix: (prefix) => repo.findByPrefix(prefix),
    update: (workspaceId, keyId, input) => repo.update(workspaceId, keyId, input),
    revoke: (workspaceId, keyId) => repo.revoke(workspaceId, keyId),
  };
}

export function publishableKeysPortFromMemory(
  store: MemoryPublishableKeysStore,
): PublishableKeysStorePort {
  return {
    async create(input) {
      const { summary } = await store.create({
        workspaceId: input.workspaceId,
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        allowedOrigins: input.allowedOrigins,
        defaultAgentId: input.defaultAgentId,
      });
      return summary;
    },
    listByWorkspace: (workspaceId) => store.listByWorkspace(workspaceId),
    getById: (workspaceId, keyId) => store.getById(workspaceId, keyId),
    findByPrefix: (prefix) => store.findByPrefix(prefix),
    update: (workspaceId, keyId, input) => store.update(workspaceId, keyId, input),
    revoke: (workspaceId, keyId) => store.revoke(workspaceId, keyId),
  };
}
