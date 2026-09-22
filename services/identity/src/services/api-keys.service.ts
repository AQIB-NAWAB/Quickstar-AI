import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { IdentityStore } from "../repository/types.js";
import { apiKeyMaterial, hashToken } from "../utils/password-hasher.js";

export function createApiKeysService(repository: IdentityStore) {
  return {
    async createApiKey(orgId: string, userId: string, name: string) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      if (name.trim().length < 1) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
      }

      const { raw, prefix } = apiKeyMaterial();
      const id = randomUUID();
      await repository.createApiKey({
        id,
        orgId,
        name: name.trim(),
        keyPrefix: prefix,
        keyHash: hashToken(raw),
        createdBy: userId,
      });

      return {
        id,
        name: name.trim(),
        key_prefix: prefix,
        api_key: raw,
      };
    },

    async listApiKeys(orgId: string, userId: string) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const keys = await repository.listApiKeys(orgId);
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        created_at: k.createdAt.toISOString(),
      }));
    },

    async revokeApiKey(orgId: string, userId: string, keyId: string) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const ok = await repository.revokeApiKey(orgId, keyId);
      if (!ok) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "API key not found" });
      }
    },
  };
}

export type ApiKeysService = ReturnType<typeof createApiKeysService>;
