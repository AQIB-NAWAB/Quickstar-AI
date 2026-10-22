import { randomUUID, timingSafeEqual } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { IdentityStore } from "../repository/types.js";
import { apiKeyMaterial, hashToken } from "../utils/password-hasher.js";

export function createApiKeysService(repository: IdentityStore) {
  return {
    async createApiKey(
      orgId: string,
      userId: string,
      name: string,
      audit?: { requestId: string },
    ) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      if (name.trim().length < 1) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
      }

      const { raw, prefix } = apiKeyMaterial();
      const id = randomUUID();
      await repository.createApiKey(
        {
          id,
          orgId,
          name: name.trim(),
          keyPrefix: prefix,
          keyHash: hashToken(raw),
          createdBy: userId,
        },
        audit,
      );

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

    async revokeApiKey(
      orgId: string,
      userId: string,
      keyId: string,
      audit?: { requestId: string },
    ) {
      const membership = await repository.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const ok = await repository.revokeApiKey(
        orgId,
        keyId,
        audit ? { actorUserId: userId, requestId: audit.requestId } : undefined,
      );
      if (!ok) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "API key not found" });
      }
    },

    async verifyApiKey(rawKey: string): Promise<{
      valid: boolean;
      orgId?: string;
      keyId?: string;
      createdBy?: string;
    }> {
      const trimmed = rawKey.trim();
      if (!trimmed.startsWith("qs_live_") && !trimmed.startsWith("qk_live_")) {
        return { valid: false };
      }
      const prefix = trimmed.slice(0, 16);
      const record = await repository.findApiKeyByPrefix(prefix);
      if (!record || record.revokedAt) {
        return { valid: false };
      }
      const expectedHash = hashToken(trimmed);
      const a = Buffer.from(record.keyHash, "hex");
      const b = Buffer.from(expectedHash, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { valid: false };
      }
      return {
        valid: true,
        orgId: record.orgId,
        keyId: record.id,
        createdBy: record.createdBy,
      };
    },
  };
}

export type ApiKeysService = ReturnType<typeof createApiKeysService>;

