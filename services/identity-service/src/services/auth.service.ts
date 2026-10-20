import { randomUUID } from "node:crypto";
import { signAccessToken, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { ServiceConfig } from "../config/environment.js";
import type { IdentityStore } from "../repository/types.js";
import { rethrowDatabaseError } from "../utils/database-error.js";
import type { AuthenticatedUser, TokenPair } from "../utils/auth.types.js";
import { hashPassword, hashToken, randomToken, verifyPassword } from "../utils/password-hasher.js";
import type { SessionRevocation } from "../utils/session-revocation.js";
import { emailDelivery } from "../utils/email-delivery.js";

export type AuthServiceDeps = {
  repository: IdentityStore;
  sessions: SessionRevocation;
  config: ServiceConfig;
};

export function createAuthService(deps: AuthServiceDeps) {
  const { repository: store, sessions, config } = deps;

  async function issueTokens(userId: string, orgId: string, sessionId: string, email?: string): Promise<TokenPair> {
    let resolvedEmail = email;
    if (!resolvedEmail) {
      const user = await store.findUserById(userId);
      resolvedEmail = user?.email;
    }

    const access_token = await signAccessToken(
      { sub: userId, org_id: orgId, sid: sessionId, email: resolvedEmail },
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
    requestPasswordReset,
    consumePasswordReset,
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
        message: "Unable to register with these details",
      });
    }

    const userId = randomUUID();
    const orgId = randomUUID();
    const passwordHash = await hashPassword(input.password);
    try {
      await store.createUserWithOrg({
        userId,
        email,
        passwordHash,
        orgId,
        orgName: input.organizationName.trim(),
      });
    } catch (error) {
      rethrowDatabaseError(error);
    }

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
    const newRefreshRaw = randomToken(32);
    const newRefreshId = randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000);

    const outcome = await store.rotateRefreshToken({
      tokenHash,
      newRefreshId,
      newTokenHash: hashToken(newRefreshRaw),
      expiresAt,
    });

    if (outcome.status === "invalid") {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid refresh token" });
    }

    if (outcome.status === "reuse") {
      if (await sessions.isRevoked(outcome.sessionId)) {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session revoked" });
      }
      await sessions.revoke(outcome.sessionId, config.refreshTtlSeconds);
      await store.revokeSessionTokens(outcome.sessionId);
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: "Refresh token reuse detected",
      });
    }

    if (await sessions.isRevoked(outcome.sessionId)) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Session revoked" });
    }

    const orgId = await resolveOrgForUser(outcome.userId);
    const user = await store.findUserById(outcome.userId);
    const access_token = await signAccessToken(
      { sub: outcome.userId, org_id: orgId, sid: outcome.sessionId, email: user?.email },
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

    // Org membership is checked on org routes (organizations / api-keys), not on every Bearer call.
    return { userId: claims.sub, orgId: claims.org_id, sessionId: claims.sid };
  }

  async function requestPasswordReset(input: {
    email: string;
    redirectOrigin?: string;
  }): Promise<{ ok: boolean; message: string; debugToken?: string }> {
    const email = input.email.trim().toLowerCase();
    const genericResponse = {
      ok: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    };

    if (!email.includes("@")) {
      return genericResponse;
    }

    const user = await store.findUserByEmail(email);
    if (!user) {
      return genericResponse;
    }

    let safeOrigin = config.appUrl || "http://localhost:3015";
    if (input.redirectOrigin) {
      try {
        const parsed = new URL(input.redirectOrigin);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          safeOrigin = parsed.origin;
        }
      } catch {
        // Fallback to configured appUrl
      }
    }

    const rawToken = randomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await store.createPasswordReset({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${safeOrigin}/reset-password?token=${rawToken}`;
    const delivery = await emailDelivery.sendPasswordReset(email, resetUrl);

    if (!delivery.delivered && process.env.NODE_ENV === "production") {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Email delivery adapter not configured in production",
      });
    }

    return {
      ...genericResponse,
      ...(process.env.NODE_ENV === "test" ? { debugToken: rawToken } : {}),
    };
  }

  async function consumePasswordReset(input: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean; message: string }> {
    if (!input.token || input.token.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Reset token is required",
      });
    }

    if (!input.newPassword || input.newPassword.length < 8) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Password must be at least 8 characters long",
      });
    }

    const tokenHash = hashToken(input.token.trim());
    const newPasswordHash = await hashPassword(input.newPassword);

    const outcome = await store.consumePasswordReset(tokenHash, newPasswordHash);
    if (!outcome.success || !outcome.userId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid, expired, or already used reset token",
      });
    }

    await store.revokeAllUserTokens(outcome.userId);

    return {
      ok: true,
      message: "Password has been successfully reset. Please log in with your new password.",
    };
  }
}

export type AuthService = ReturnType<typeof createAuthService>;
