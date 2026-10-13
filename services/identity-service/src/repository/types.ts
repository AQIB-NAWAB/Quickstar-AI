/** Row shapes + IdentityStore: the DB operations services may call. */
export type OrgRole = "owner" | "member";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

export type MembershipRecord = {
  orgId: string;
  userId: string;
  role: OrgRole;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  replacedById: string | null;
  revokedAt: Date | null;
};

export type ApiKeyRecord = {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdBy: string;
  revokedAt: Date | null;
  createdAt: Date;
};

export type IdentityStore = {
  createUserWithOrg(input: {
    userId: string;
    email: string;
    passwordHash: string;
    orgId: string;
    orgName: string;
  }): Promise<void>;

  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;

  listOrganizationsForUser(userId: string): Promise<OrganizationRecord[]>;
  getMembership(orgId: string, userId: string): Promise<MembershipRecord | null>;
  getOrganization(orgId: string): Promise<OrganizationRecord | null>;

  insertRefreshToken(record: {
    id: string;
    userId: string;
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;

  findRefreshByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  markRefreshReplaced(id: string, replacedById: string): Promise<void>;
  /**
   * Atomically rotate one refresh token (lock row → insert successor → mark replaced).
   * Prevents two parallel refreshes from both succeeding.
   */
  rotateRefreshToken(input: {
    tokenHash: string;
    newRefreshId: string;
    newTokenHash: string;
    expiresAt: Date;
  }): Promise<
    | { status: "rotated"; userId: string; sessionId: string }
    | { status: "reuse"; sessionId: string; userId: string }
    | { status: "invalid" }
  >;
  revokeRefreshToken(id: string): Promise<void>;
  revokeSessionTokens(sessionId: string): Promise<void>;

  createApiKey(
    record: {
      id: string;
      orgId: string;
      name: string;
      keyPrefix: string;
      keyHash: string;
      createdBy: string;
    },
    audit?: { requestId: string },
  ): Promise<void>;

  listApiKeys(orgId: string): Promise<ApiKeyRecord[]>;
  revokeApiKey(
    orgId: string,
    keyId: string,
    audit?: { actorUserId: string; requestId: string },
  ): Promise<boolean>;
};
