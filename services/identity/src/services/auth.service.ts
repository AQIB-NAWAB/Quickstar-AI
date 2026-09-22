import { randomUUID } from "node:crypto";
import { signAccessToken, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { ServiceConfig } from "../config/environment.js";
import type { IdentityStore } from "../repository/identity-store.types.js";
import type { AuthenticatedUser, TokenPair } from "../utils/auth.types.js";
import { hashPassword, hashToken, randomToken, verifyPassword } from "../utils/password-hasher.js";
import type { SessionRevocation } from "../utils/session-revocation.js";

export type AuthServiceDeps = {
  repository: IdentityStore;
  sessions: SessionRevocation;
  config: ServiceConfig;
};

export function createAuthService(deps: AuthServiceDeps) {
  const { repository: store, sessions, config } = deps;

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
    register: registerUser,
    login: loginUser,
    refresh: refreshSession,
    logout: logoutUser,
    validateAccessToken: validateToken,
  };

  async function registerUser(input: {
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
  }

  async function loginUser(input: { email: string; password: string }): Promise<TokenPair> {
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
  }

  async function refreshSession(refreshToken: string): Promise<TokenPair> {
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
  }

  async function logoutUser(input: { refreshToken?: string; sessionId?: string }): Promise<void> {
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
  }

  async function validateToken(token: string): Promise<AuthenticatedUser> {
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
  }
}

export type AuthService = ReturnType<typeof createAuthService>;
