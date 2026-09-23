import type { DataSource } from "typeorm";
import { IsNull } from "typeorm";
import { ApiKeyEntity } from "../entities/api-key.entity.js";
import { OrgMembershipEntity } from "../entities/org-membership.entity.js";
import { OrganizationEntity } from "../entities/organization.entity.js";
import { RefreshTokenEntity } from "../entities/refresh-token.entity.js";
import { UserEntity } from "../entities/user.entity.js";
import type { IdentityStore } from "../types.js";
import {
  toApiKeyRecord,
  toMembershipRecord,
  toOrganizationRecord,
  toRefreshTokenRecord,
  toUserRecord,
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

    async createApiKey(record) {
      await dataSource.manager.save(ApiKeyEntity, {
        id: record.id,
        orgId: record.orgId,
        name: record.name,
        keyPrefix: record.keyPrefix,
        keyHash: record.keyHash,
        createdBy: record.createdBy,
        revokedAt: null,
      });
    },

    async listApiKeys(orgId) {
      const entities = await dataSource.manager.find(ApiKeyEntity, {
        where: { orgId, revokedAt: IsNull() },
        order: { createdAt: "DESC" },
      });
      return entities.map(toApiKeyRecord);
    },

    async revokeApiKey(orgId, keyId) {
      const result = await dataSource.manager.update(
        ApiKeyEntity,
        { id: keyId, orgId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      return (result.affected ?? 0) > 0;
    },
  };
}
