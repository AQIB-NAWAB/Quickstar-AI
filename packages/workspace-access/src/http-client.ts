import { bearerTokenFromHeader } from "@quickstart/auth";
import type { WorkspaceRole } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";
import type { WorkspaceAccessClient } from "./types.js";

export function createHttpWorkspaceAccessClient(
  workspaceBaseUrl: string,
  timeoutMs: number,
): WorkspaceAccessClient {
  const base = workspaceBaseUrl.replace(/\/$/, "");

  return {
    async resolveRole(workspaceId, actorId, authorizationHeader, requestId) {
      const rawToken = bearerTokenFromHeader(authorizationHeader);
      if (!rawToken) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Bearer token required for workspace authorization",
          requestId,
        });
      }

      const url = `${base}/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(actorId)}`;
      try {
        const response = await fetchWithPolicy(
          url,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${rawToken}`,
              "x-request-id": requestId,
            },
          },
          { timeoutMs, maxRetries: 0 },
        );

        if (response.status === 403 || response.status === 404) {
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "Access denied: not a member of this workspace",
            requestId,
          });
        }

        if (response.status === 401) {
          throw new AppError({
            code: ErrorCode.UNAUTHORIZED,
            message: "Invalid or expired access token",
            requestId,
          });
        }

        if (!response.ok) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: "Workspace service authorization check failed",
            requestId,
          });
        }

        const body = (await response.json()) as {
          member?: { role?: WorkspaceRole };
        };
        const role = body.member?.role;
        if (!role) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: "Invalid workspace membership response",
            requestId,
          });
        }
        return role;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "Workspace service unavailable",
          requestId,
        });
      }
    },
  };
}
