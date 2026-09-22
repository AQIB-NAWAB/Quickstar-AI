import { randomUUID } from "node:crypto";
import { signAccessToken, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { apiKeyMaterial, hashToken, randomToken, verifyPassword, hashPassword } from "./crypto.js";
import type { IdentityConfig } from "./config.js";
import type { SessionRevocation } from "./session-revocation.js";
import type { IdentityStore } from "./store/types.js";

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
};

export type IdentityServiceDeps = {
  store: IdentityStore;
  sessions: SessionRevocation;
  config: IdentityConfig;
};

export function createIdentityService(deps: IdentityServiceDeps) {
  const { store, sessions, config } = deps;

  async function issueTokens(userId: string, orgId: string, sessionId: string): Promise<TokenPair> {
    const access_token = await signAccessToken(
      { sub: userId, org_id: orgId, sid: sessionId },
      { secret: config.jwtAccessSecret, ttlSeconds: config.jwtAccessTtlSeconds },
    );

    const refreshRaw = randomToken(32);
    const refreshId = randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000);

    await store.insertRefreshToken({
      id: refreshId,
      userId,
      sessionId,
      tokenHash: hashToken(refreshRaw),
      expiresAt,
    });

    return {
      access_token,
      refresh_token: refreshRaw,
      token_type: "Bearer",
      expires_in: config.jwtAccessTtlSeconds,
    };
  }

  async function resolveOrgForUser(userId: string): Promise<string> {
    const orgs = await store.listOrganizationsForUser(userId);
    if (orgs.length === 0) {
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "User has no organization",
      });
    }
    return orgs[0].id;
  }

  return {
    async register(input: {
      email: string;
      password: string;
      organizationName: string;
    }): Promise<{ user_id: string; org_id: string; tokens: TokenPair }> {
      const email = input.email.trim().toLowerCase();
      if (!email.includes("@") || input.password.length < 8) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Invalid email or password (min 8 characters)",
        });
      }
      if (input.organizationName.trim().length < 1) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "organization_name is required",
        });
      }

      const existing = await store.findUserByEmail(email);
      if (existing) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Email already registered",
        });
      }

      const userId = randomUUID();
      const orgId = randomUUID();
      const passwordHash = await hashPassword(input.password);
      await store.createUserWithOrg({
        userId,
        email,
        passwordHash,
        orgId,
        orgName: input.organizationName.trim(),
      });

      const sessionId = randomUUID();
      const tokens = await issueTokens(userId, orgId, sessionId);
      return { user_id: userId, org_id: orgId, tokens };
    },

    async login(input: { email: string; password: string }): Promise<TokenPair> {
      const user = await store.findUserByEmail(input.email.trim());
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Invalid email or password",
        });
      }

      const orgId = await resolveOrgForUser(user.id);
      const sessionId = randomUUID();
      return issueTokens(user.id, orgId, sessionId);
    },

    async refresh(refreshToken: string): Promise<TokenPair> {
      const tokenHash = hashToken(refreshToken);
      const row = await store.findRefreshByHash(tokenHash);
      if (!row) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid refresh token" });
      }

      if (row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Refresh token expired" });
      }

      if (await sessions.isRevoked(row.sessionId)) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session revoked" });
      }

      if (row.replacedById) {
        await sessions.revoke(row.sessionId, config.refreshTtlSeconds);
        await store.revokeSessionTokens(row.sessionId);
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Refresh token reuse detected",
        });
      }

      const orgId = await resolveOrgForUser(row.userId);
      const newRefreshRaw = randomToken(32);
      const newRefreshId = randomUUID();
      const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000);

      await store.insertRefreshToken({
        id: newRefreshId,
        userId: row.userId,
        sessionId: row.sessionId,
        tokenHash: hashToken(newRefreshRaw),
        expiresAt,
      });
      await store.markRefreshReplaced(row.id, newRefreshId);

      const access_token = await signAccessToken(
        { sub: row.userId, org_id: orgId, sid: row.sessionId },
        { secret: config.jwtAccessSecret, ttlSeconds: config.jwtAccessTtlSeconds },
      );

      return {
        access_token,
        refresh_token: newRefreshRaw,
        token_type: "Bearer",
        expires_in: config.jwtAccessTtlSeconds,
      };
    },

    async logout(input: { refreshToken?: string; sessionId?: string }): Promise<void> {
      let sessionId = input.sessionId;
      if (input.refreshToken) {
        const row = await store.findRefreshByHash(hashToken(input.refreshToken));
        if (row) {
          sessionId = row.sessionId;
          await store.revokeRefreshToken(row.id);
        }
      }
      if (sessionId) {
        await sessions.revoke(sessionId, config.refreshTtlSeconds);
        await store.revokeSessionTokens(sessionId);
      }
    },

    async authenticateAccessToken(token: string): Promise<{
      userId: string;
      orgId: string;
      sessionId: string;
    }> {
      let claims;
      try {
        claims = await verifyAccessToken(token, config.jwtAccessSecret);
      } catch {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid access token" });
      }

      if (await sessions.isRevoked(claims.sid)) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session revoked" });
      }

      const user = await store.findUserById(claims.sub);
      if (!user) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "User not found" });
      }

      const membership = await store.getMembership(claims.org_id, claims.sub);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }

      return { userId: claims.sub, orgId: claims.org_id, sessionId: claims.sid };
    },

    async me(userId: string) {
      const user = await store.findUserById(userId);
      if (!user) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "User not found" });
      }
      const organizations = await store.listOrganizationsForUser(userId);
      return {
        user: { id: user.id, email: user.email },
        organizations: organizations.map((o) => ({ id: o.id, name: o.name })),
      };
    },

    async getOrganization(orgId: string, userId: string) {
      const membership = await store.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const org = await store.getOrganization(orgId);
      if (!org) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Organization not found" });
      }
      return { id: org.id, name: org.name, role: membership.role };
    },

    async createApiKey(orgId: string, userId: string, name: string) {
      const membership = await store.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      if (name.trim().length < 1) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
      }

      const { raw, prefix } = apiKeyMaterial();
      const id = randomUUID();
      await store.createApiKey({
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
      const membership = await store.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const keys = await store.listApiKeys(orgId);
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        created_at: k.createdAt.toISOString(),
      }));
    },

    async revokeApiKey(orgId: string, userId: string, keyId: string) {
      const membership = await store.getMembership(orgId, userId);
      if (!membership) {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: "Not a member of organization" });
      }
      const ok = await store.revokeApiKey(orgId, keyId);
      if (!ok) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "API key not found" });
      }
    },
  };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
