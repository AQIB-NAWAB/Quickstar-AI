import type {
  ApiKeyRecord,
  IdentityStore,
  MembershipRecord,
  OrganizationRecord,
  RefreshTokenRecord,
  UserRecord,
} from "./types.js";

export function createMemoryRepository(): IdentityStore {
  const usersByEmail = new Map<string, UserRecord>();
  const usersById = new Map<string, UserRecord>();
  const orgs = new Map<string, OrganizationRecord>();
  const memberships = new Map<string, MembershipRecord>();
  const refreshByHash = new Map<string, RefreshTokenRecord>();
  const refreshById = new Map<string, RefreshTokenRecord>();
  const apiKeys = new Map<string, ApiKeyRecord>();

  function membershipKey(orgId: string, userId: string): string {
    return `${orgId}:${userId}`;
  }

  return {
    async createUserWithOrg(input) {
      const user: UserRecord = {
        id: input.userId,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        createdAt: new Date(),
      };
      usersByEmail.set(user.email, user);
      usersById.set(user.id, user);
      orgs.set(input.orgId, {
        id: input.orgId,
        name: input.orgName,
        createdAt: new Date(),
      });
      memberships.set(membershipKey(input.orgId, input.userId), {
        orgId: input.orgId,
        userId: input.userId,
        role: "owner",
      });
    },

    async findUserByEmail(email) {
      return usersByEmail.get(email.toLowerCase()) ?? null;
    },

    async findUserById(userId) {
      return usersById.get(userId) ?? null;
    },

    async listOrganizationsForUser(userId) {
      const result: OrganizationRecord[] = [];
      for (const m of memberships.values()) {
        if (m.userId === userId) {
          const org = orgs.get(m.orgId);
          if (org) {
            result.push(org);
          }
        }
      }
      return result;
    },

    async getMembership(orgId, userId) {
      return memberships.get(membershipKey(orgId, userId)) ?? null;
    },

    async getOrganization(orgId) {
      return orgs.get(orgId) ?? null;
    },

    async insertRefreshToken(record) {
      const row: RefreshTokenRecord = {
        id: record.id,
        userId: record.userId,
        sessionId: record.sessionId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        replacedById: null,
        revokedAt: null,
      };
      refreshByHash.set(record.tokenHash, row);
      refreshById.set(record.id, row);
    },

    async findRefreshByHash(tokenHash) {
      return refreshByHash.get(tokenHash) ?? null;
    },

    async markRefreshReplaced(id, replacedById) {
      const row = refreshById.get(id);
      if (row) {
        row.replacedById = replacedById;
      }
    },

    async rotateRefreshToken(input) {
      const row = refreshByHash.get(input.tokenHash);
      if (!row) {
        return { status: "invalid" as const };
      }
      if (row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
        return { status: "invalid" as const };
      }
      if (row.replacedById) {
        return { status: "reuse" as const, sessionId: row.sessionId, userId: row.userId };
      }

      const successor: RefreshTokenRecord = {
        id: input.newRefreshId,
        userId: row.userId,
        sessionId: row.sessionId,
        tokenHash: input.newTokenHash,
        expiresAt: input.expiresAt,
        replacedById: null,
        revokedAt: null,
      };
      refreshByHash.set(input.newTokenHash, successor);
      refreshById.set(successor.id, successor);
      row.replacedById = input.newRefreshId;
      return { status: "rotated" as const, userId: row.userId, sessionId: row.sessionId };
    },

    async revokeRefreshToken(id) {
      const row = refreshById.get(id);
      if (row) {
        row.revokedAt = new Date();
      }
    },

    async revokeSessionTokens(sessionId) {
      for (const row of refreshById.values()) {
        if (row.sessionId === sessionId) {
          row.revokedAt = new Date();
        }
      }
    },

    async createApiKey(record, _audit) {
      apiKeys.set(record.id, {
        ...record,
        revokedAt: null,
        createdAt: new Date(),
      });
    },

    async listApiKeys(orgId) {
      return [...apiKeys.values()].filter((k) => k.orgId === orgId && !k.revokedAt);
    },

    async findApiKeyByPrefix(keyPrefix) {
      for (const k of apiKeys.values()) {
        if (k.keyPrefix === keyPrefix && !k.revokedAt) {
          return k;
        }
      }
      return null;
    },

    async revokeApiKey(orgId, keyId, _audit) {
      const key = apiKeys.get(keyId);
      if (!key || key.orgId !== orgId || key.revokedAt) {
        return false;
      }
      key.revokedAt = new Date();
      return true;
    },
  };
}
