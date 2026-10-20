import type { DataSource } from "typeorm";
import { IsNull } from "typeorm";
import { insertAuditEntry } from "@quickstart/audit-writer";
import { ApiKeyEntity } from "../entities/api-key.entity.js";
import { OrgMembershipEntity } from "../entities/org-membership.entity.js";
import { OrganizationEntity } from "../entities/organization.entity.js";
import { RefreshTokenEntity } from "../entities/refresh-token.entity.js";
import { UserEntity } from "../entities/user.entity.js";
import { PasswordResetEntity } from "../entities/password-reset.entity.js";
import type { IdentityStore } from "../types.js";
import {
  toApiKeyRecord,
  toMembershipRecord,
  toOrganizationRecord,
  toRefreshTokenRecord,
  toUserRecord,
  toPasswordResetRecord,
} from "./mappers.js";

export function createTypeOrmIdentityStore(dataSource: DataSource): IdentityStore {
  return {
    async createUserWithOrg(input) {
      await dataSource.transaction(async (manager) => {
        await manager.save(UserEntity, {
          id: input.userId,
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
        });
        await manager.save(OrganizationEntity, {
          id: input.orgId,
          name: input.orgName,
        });
        await manager.save(OrgMembershipEntity, {
          orgId: input.orgId,
          userId: input.userId,
          role: "owner",
        });
      });
    },

    async findUserByEmail(email) {
      const entity = await dataSource.manager.findOne(UserEntity, {
        where: { email: email.toLowerCase() },
      });
      return entity ? toUserRecord(entity) : null;
    },

    async findUserById(userId) {
      const entity = await dataSource.manager.findOne(UserEntity, {
        where: { id: userId },
      });
      return entity ? toUserRecord(entity) : null;
    },

    async listOrganizationsForUser(userId) {
      const entities = await dataSource.manager
        .createQueryBuilder(OrganizationEntity, "o")
        .innerJoin(OrgMembershipEntity, "m", "m.org_id = o.id AND m.user_id = :userId", { userId })
        .orderBy("o.created_at", "ASC")
        .getMany();
      return entities.map(toOrganizationRecord);
    },

    async getMembership(orgId, userId) {
      const entity = await dataSource.manager.findOne(OrgMembershipEntity, {
        where: { orgId, userId },
      });
      return entity ? toMembershipRecord(entity) : null;
    },

    async getOrganization(orgId) {
      const entity = await dataSource.manager.findOne(OrganizationEntity, {
        where: { id: orgId },
      });
      return entity ? toOrganizationRecord(entity) : null;
    },

    async createOrganization(input) {
      return dataSource.transaction(async (manager) => {
        const orgEntity = manager.create(OrganizationEntity, {
          id: input.orgId,
          name: input.name,
        });
        await manager.save(orgEntity);
        const memEntity = manager.create(OrgMembershipEntity, {
          orgId: input.orgId,
          userId: input.userId,
          role: "owner",
        });
        await manager.save(memEntity);
        return toOrganizationRecord(orgEntity);
      });
    },

    async updateOrganization(orgId, name) {
      await dataSource.manager.update(OrganizationEntity, { id: orgId }, { name });
      const entity = await dataSource.manager.findOne(OrganizationEntity, { where: { id: orgId } });
      return entity ? toOrganizationRecord(entity) : null;
    },

    async insertRefreshToken(record) {
      await dataSource.manager.save(RefreshTokenEntity, {
        id: record.id,
        userId: record.userId,
        sessionId: record.sessionId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        replacedById: null,
        revokedAt: null,
      });
    },

    async findRefreshByHash(tokenHash) {
      const entity = await dataSource.manager.findOne(RefreshTokenEntity, {
        where: { tokenHash },
      });
      return entity ? toRefreshTokenRecord(entity) : null;
    },

    async markRefreshReplaced(id, replacedById) {
      await dataSource.manager.update(RefreshTokenEntity, { id }, { replacedById });
    },

    async rotateRefreshToken(input) {
      return dataSource.transaction(async (manager) => {
        const row = await manager.findOne(RefreshTokenEntity, {
          where: { tokenHash: input.tokenHash },
          lock: { mode: "pessimistic_write" },
        });
        if (!row) {
          return { status: "invalid" as const };
        }
        if (row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
          return { status: "invalid" as const };
        }
        if (row.replacedById) {
          return { status: "reuse" as const, sessionId: row.sessionId, userId: row.userId };
        }

        await manager.save(RefreshTokenEntity, {
          id: input.newRefreshId,
          userId: row.userId,
          sessionId: row.sessionId,
          tokenHash: input.newTokenHash,
          expiresAt: input.expiresAt,
          replacedById: null,
          revokedAt: null,
        });
        row.replacedById = input.newRefreshId;
        await manager.save(RefreshTokenEntity, row);

        return { status: "rotated" as const, userId: row.userId, sessionId: row.sessionId };
      });
    },

    async revokeRefreshToken(id) {
      await dataSource.manager.update(RefreshTokenEntity, { id }, { revokedAt: new Date() });
    },

    async revokeSessionTokens(sessionId) {
      await dataSource.manager.update(RefreshTokenEntity, { sessionId }, { revokedAt: new Date() });
    },

    async revokeAllUserTokens(userId) {
      await dataSource.manager.update(RefreshTokenEntity, { userId }, { revokedAt: new Date() });
    },

    async createPasswordReset(record) {
      await dataSource.manager.save(PasswordResetEntity, {
        id: record.id,
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        usedAt: null,
      });
    },

    async findPasswordResetByHash(tokenHash) {
      const entity = await dataSource.manager.findOne(PasswordResetEntity, {
        where: { tokenHash },
      });
      return entity ? toPasswordResetRecord(entity) : null;
    },

    async consumePasswordReset(tokenHash, newPasswordHash) {
      return await dataSource.transaction(async (manager) => {
        const reset = await manager.findOne(PasswordResetEntity, {
          where: { tokenHash },
          lock: { mode: "pessimistic_write" },
        });

        if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
          return { success: false };
        }

        reset.usedAt = new Date();
        await manager.save(reset);

        await manager.update(UserEntity, { id: reset.userId }, {
          passwordHash: newPasswordHash,
        });

        await manager.update(RefreshTokenEntity, { userId: reset.userId }, {
          revokedAt: new Date(),
        });

        return { success: true, userId: reset.userId };
      });
    },

    async createApiKey(record, audit) {
      await dataSource.transaction(async (manager) => {
        await manager.save(ApiKeyEntity, {
          id: record.id,
          orgId: record.orgId,
          name: record.name,
          keyPrefix: record.keyPrefix,
          keyHash: record.keyHash,
          createdBy: record.createdBy,
          revokedAt: null,
        });
        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            orgId: record.orgId,
            actorUserId: record.createdBy,
            action: "api_key.created",
            targetType: "api_key",
            targetId: record.id,
            requestId: audit.requestId,
            metadata: {
              name: record.name,
              key_prefix: record.keyPrefix,
            },
          });
        }
      });
    },

    async listApiKeys(orgId) {
      const entities = await dataSource.manager.find(ApiKeyEntity, {
        where: { orgId, revokedAt: IsNull() },
        order: { createdAt: "DESC" },
      });
      return entities.map(toApiKeyRecord);
    },

    async findApiKeyByPrefix(keyPrefix) {
      const entity = await dataSource.manager.findOne(ApiKeyEntity, {
        where: { keyPrefix, revokedAt: IsNull() },
      });
      return entity ? toApiKeyRecord(entity) : null;
    },

    async revokeApiKey(orgId, keyId, audit) {
      return await dataSource.transaction(async (manager) => {
        const result = await manager.update(
          ApiKeyEntity,
          { id: keyId, orgId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        const ok = (result.affected ?? 0) > 0;
        if (ok && audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            orgId,
            actorUserId: audit.actorUserId,
            action: "api_key.revoked",
            targetType: "api_key",
            targetId: keyId,
            requestId: audit.requestId,
            metadata: {},
          });
        }
        return ok;
      });
    },
  };
}
