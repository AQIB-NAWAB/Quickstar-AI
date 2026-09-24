export type AuthContext = {
  tenantId: string;
  actorId: string;
  roles: string[];
  requestId: string;
};

/**
 * Mandatory operational tenant context for workspace-scoped services and repositories.
 * All data queries must carry a tenant context to prevent IDOR vulnerabilities.
 */
export type TenantContext = {
  readonly workspaceId: string;
  readonly actorId: string;
};


/** Set by API gateway in production; stub for local/dev services. */
export const AUTH_CONTEXT_HEADER = "x-quickstart-auth-context";

export type AuthContextPayload = {
  tenant_id: string;
  actor_id: string;
  roles: string[];
  request_id: string;
};

export function serializeAuthContext(context: AuthContext): string {
  const payload: AuthContextPayload = {
    tenant_id: context.tenantId,
    actor_id: context.actorId,
    roles: context.roles,
    request_id: context.requestId,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseAuthContextHeader(headerValue: string | undefined): AuthContext | null {
  if (!headerValue) {
    return null;
  }
  try {
    const json = Buffer.from(headerValue, "base64url").toString("utf8");
    const payload = JSON.parse(json) as AuthContextPayload;
    if (
      typeof payload.tenant_id !== "string" ||
      typeof payload.actor_id !== "string" ||
      !Array.isArray(payload.roles) ||
      typeof payload.request_id !== "string"
    ) {
      return null;
    }
    return {
      tenantId: payload.tenant_id,
      actorId: payload.actor_id,
      roles: payload.roles.map(String),
      requestId: payload.request_id,
    };
  } catch {
    return null;
  }
}

export function extractAuthContext(
  headers: Record<string, string | string[] | undefined>,
): AuthContext | null {
  const raw = headers[AUTH_CONTEXT_HEADER] ?? headers[AUTH_CONTEXT_HEADER.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseAuthContextHeader(value);
}
