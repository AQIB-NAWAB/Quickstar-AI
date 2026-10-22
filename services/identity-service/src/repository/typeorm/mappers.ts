import type { ApiKeyEntity } from "../entities/api-key.entity.js";
import type { OrgMembershipEntity } from "../entities/org-membership.entity.js";
import type { OrganizationEntity } from "../entities/organization.entity.js";
import type { RefreshTokenEntity } from "../entities/refresh-token.entity.js";
import type { UserEntity } from "../entities/user.entity.js";
import type {
  ApiKeyRecord,
  MembershipRecord,
  OrganizationRecord,
  RefreshTokenRecord,
  UserRecord,
} from "../types.js";

export function toUserRecord(entity: UserEntity): UserRecord {
  return {
    id: entity.id,
    email: entity.email,
    passwordHash: entity.passwordHash,
    createdAt: entity.createdAt,
  };
}

export function toOrganizationRecord(entity: OrganizationEntity): OrganizationRecord {
  return {
    id: entity.id,
    name: entity.name,
    createdAt: entity.createdAt,
  };
}

export function toMembershipRecord(entity: OrgMembershipEntity): MembershipRecord {
  return {
    orgId: entity.orgId,
    userId: entity.userId,
    role: entity.role as MembershipRecord["role"],
  };
}

export function toRefreshTokenRecord(entity: RefreshTokenEntity): RefreshTokenRecord {
  return {
    id: entity.id,
    userId: entity.userId,
    sessionId: entity.sessionId,
    tokenHash: entity.tokenHash,
    expiresAt: entity.expiresAt,
    replacedById: entity.replacedById,
    revokedAt: entity.revokedAt,
  };
}

export function toApiKeyRecord(entity: ApiKeyEntity): ApiKeyRecord {
  return {
    id: entity.id,
    orgId: entity.orgId,
    name: entity.name,
    keyPrefix: entity.keyPrefix,
    keyHash: entity.keyHash,
    createdBy: entity.createdBy,
    revokedAt: entity.revokedAt,
    createdAt: entity.createdAt,
  };
}

export function toPasswordResetRecord(entity: import("../entities/password-reset.entity.js").PasswordResetEntity): import("../types.js").PasswordResetRecord {
  return {
    id: entity.id,
    userId: entity.userId,
    tokenHash: entity.tokenHash,
    expiresAt: entity.expiresAt,
    usedAt: entity.usedAt,
    createdAt: entity.createdAt,
  };
}

