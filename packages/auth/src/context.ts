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
  aud?: string;
  exp?: number;
  issuedAt?: number;
  email?: string;
};

/**
 * Mandatory operational tenant context for workspace-scoped services and repositories.
 * All data queries must carry a tenant context to prevent IDOR vulnerabilities.
 */
export type TenantContext = {
  readonly workspaceId: string;
  readonly actorId: string;
};

/** Set by API gateway in production; signed HMAC token in internal network. */
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
  aud?: string;
  issued_at?: number;
  exp?: number;
  email?: string;
};

export type AuthContextParseOptions = {
  allowUnsigned?: boolean;
  expectedAudience?: string;
  expectedWorkspaceId?: string;
  clockToleranceSeconds?: number;
};

function computeHmacSignature(payloadBase64Url: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

export function serializeAuthContext(
  context: AuthContext,
  signingSecret?: string,
  options?: { ttlSeconds?: number; audience?: string },
): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = options?.ttlSeconds ?? 300; // 5 minutes default validity window
  const payload: AuthContextPayload = {
    tenant_id: context.tenantId,
    actor_id: context.actorId,
    roles: context.roles,
    request_id: context.requestId,
    principal_type: context.principalType ?? "staff",
    org_id: context.orgId ?? context.tenantId,
    workspace_id: context.workspaceId,
    scopes: context.scopes,
    aud: options?.audience ?? context.aud ?? "quickstart-internal",
    issued_at: context.issuedAt ?? now,
    exp: context.exp ?? now + ttl,
    email: context.email,
  };
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  if (signingSecret) {
    const signature = computeHmacSignature(payloadB64, signingSecret);
    return `v1.${payloadB64}.${signature}`;
  }
  return payloadB64;
}

export function signAuthContext(
  context: AuthContext,
  secret: string,
  options?: { ttlSeconds?: number; audience?: string },
): string {
  if (!secret || typeof secret !== "string" || secret.length === 0) {
    throw new Error("Secret is required to sign authentication context");
  }
  return serializeAuthContext(context, secret, options);
}

export function parseAuthContextHeader(
  headerValue: string | undefined,
  verificationSecret?: string | string[],
  options?: AuthContextParseOptions,
): AuthContext | null {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const secrets: string[] = verificationSecret
    ? Array.isArray(verificationSecret)
      ? verificationSecret.filter(Boolean)
      : [verificationSecret]
    : [];

  try {
    let payloadJson: string;

    if (headerValue.startsWith("v1.")) {
      const parts = headerValue.split(".");
      if (parts.length !== 3) {
        return null;
      }
      const [, payloadB64, signature] = parts;
      if (secrets.length > 0) {
        const sigBuf = Buffer.from(signature);
        let verified = false;
        for (const secret of secrets) {
          const expectedSig = computeHmacSignature(payloadB64, secret);
          const expectedBuf = Buffer.from(expectedSig);
          if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
            verified = true;
            break;
          }
        }
        if (!verified) {
          return null; // Signature mismatch against all candidate secrets
        }
      } else if (!options?.allowUnsigned) {
        // Missing verification secret in non-opt-in mode cannot trust signed payload
        return null;
      }
      payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    } else {
      // Unsigned format: strictly rejected if verification secrets are supplied or unless explicitly opted-in
      if (secrets.length > 0 || !options?.allowUnsigned) {
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

    const now = Math.floor(Date.now() / 1000);
    const tolerance = options?.clockToleranceSeconds ?? 30;

    // Check expiration
    if (typeof payload.exp === "number" && now > payload.exp + tolerance) {
      return null; // Expired context
    }

    // Check future issuance
    if (typeof payload.issued_at === "number" && payload.issued_at > now + 60) {
      return null; // Issued in future
    }

    // Check audience binding
    if (options?.expectedAudience && payload.aud && payload.aud !== options.expectedAudience) {
      return null; // Audience mismatch
    }

    // Check workspace binding
    if (
      options?.expectedWorkspaceId &&
      payload.workspace_id &&
      payload.workspace_id !== options.expectedWorkspaceId
    ) {
      return null; // Cross-workspace attempt
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
      aud: payload.aud,
      exp: payload.exp,
      issuedAt: payload.issued_at,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export function verifyAuthContext(
  headerValue: string | undefined,
  verificationSecret: string | string[],
  options?: AuthContextParseOptions,
): AuthContext | null {
  return parseAuthContextHeader(headerValue, verificationSecret, options);
}

export function extractAuthContext(
  headers: Record<string, string | string[] | undefined>,
  verificationSecret?: string | string[],
  options?: AuthContextParseOptions,
): AuthContext | null {
  const raw = headers[AUTH_CONTEXT_HEADER] ?? headers[AUTH_CONTEXT_HEADER.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseAuthContextHeader(value, verificationSecret, options);
}
