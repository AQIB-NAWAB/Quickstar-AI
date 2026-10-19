import { createHmac, timingSafeEqual } from "node:crypto";

export type PrincipalType = "staff" | "api_key" | "service";

export type AuthContext = {
  tenantId: string;
  actorId: string;
  roles: string[];
  requestId: string;
  principalType?: PrincipalType;
  orgId?: string;
  workspaceId?: string;
  scopes?: string[];
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
  principal_type?: PrincipalType;
  org_id?: string;
  workspace_id?: string;
  scopes?: string[];
  issued_at?: number;
};

function computeHmacSignature(payloadBase64Url: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

export function serializeAuthContext(context: AuthContext, signingSecret?: string): string {
  const payload: AuthContextPayload = {
    tenant_id: context.tenantId,
    actor_id: context.actorId,
    roles: context.roles,
    request_id: context.requestId,
    principal_type: context.principalType ?? "staff",
    org_id: context.orgId ?? context.tenantId,
    workspace_id: context.workspaceId,
    scopes: context.scopes,
    issued_at: Math.floor(Date.now() / 1000),
  };
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  if (signingSecret) {
    const signature = computeHmacSignature(payloadB64, signingSecret);
    return `v1.${payloadB64}.${signature}`;
  }
  return payloadB64;
}

export function parseAuthContextHeader(
  headerValue: string | undefined,
  verificationSecret?: string,
): AuthContext | null {
  if (!headerValue) {
    return null;
  }
  try {
    let payloadJson: string;

    if (headerValue.startsWith("v1.")) {
      const parts = headerValue.split(".");
      if (parts.length !== 3) {
        return null;
      }
      const [, payloadB64, signature] = parts;
      if (verificationSecret) {
        const expectedSig = computeHmacSignature(payloadB64, verificationSecret);
        const a = Buffer.from(signature);
        const b = Buffer.from(expectedSig);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return null; // Signature mismatch
        }
      }
      payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    } else {
      // Legacy unsigned format: reject if verificationSecret is strictly required in production
      if (verificationSecret && process.env.NODE_ENV === "production") {
        return null;
      }
      payloadJson = Buffer.from(headerValue, "base64url").toString("utf8");
    }

    const payload = JSON.parse(payloadJson) as AuthContextPayload;
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
      principalType: payload.principal_type,
      orgId: payload.org_id,
      workspaceId: payload.workspace_id,
      scopes: payload.scopes,
    };
  } catch {
    return null;
  }
}

export function extractAuthContext(
  headers: Record<string, string | string[] | undefined>,
  verificationSecret?: string,
): AuthContext | null {
  const raw = headers[AUTH_CONTEXT_HEADER] ?? headers[AUTH_CONTEXT_HEADER.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseAuthContextHeader(value, verificationSecret);
}
