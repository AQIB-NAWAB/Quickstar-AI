import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { TenantContext } from "@quickstart/auth";
import type { PublishableKeySummary } from "../repository/publishable-keys.repository.js";
import {
  hashPublishableKey,
  publishableKeyMaterial,
} from "../utils/publishable-key-material.js";

export type PublishableKeyAudit = {
  actorUserId: string;
  requestId: string;
};

export type PublishableKeysStorePort = {
  create(input: {
    id: string;
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    allowedOrigins: string[];
    defaultAgentId?: string | null;
    audit?: PublishableKeyAudit;
  }): Promise<PublishableKeySummary>;
  listByWorkspace(workspaceId: string): Promise<PublishableKeySummary[]>;
  getById(workspaceId: string, keyId: string): Promise<PublishableKeySummary | null>;
  findByPrefix(prefix: string): Promise<
    Array<{
      id: string;
      workspace_id: string;
      key_hash: string;
      allowed_origins: string[];
      default_agent_id: string | null;
      revoked_at: string | null;
    }>
  >;
  update(
    workspaceId: string,
    keyId: string,
    input: { name?: string; allowedOrigins?: string[]; defaultAgentId?: string | null },
  ): Promise<PublishableKeySummary | null>;
  revoke(
    workspaceId: string,
    keyId: string,
    audit?: PublishableKeyAudit,
  ): Promise<boolean>;
};

function normalizeOrigins(origins: string[]): string[] {
  const out: string[] = [];
  for (const o of origins) {
    const trimmed = o.trim();
    if (!trimmed) continue;
    try {
      out.push(new URL(trimmed).origin);
    } catch {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Invalid origin URL: ${trimmed}`,
      });
    }
  }
  if (out.length === 0) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "At least one allowed origin is required",
    });
  }
  return out;
}

export class PublishableKeysService {
  constructor(private readonly store: PublishableKeysStorePort) {}

  async createKey(
    tenant: TenantContext,
    input: { name: string; allowed_origins: string[]; default_agent_id?: string | null },
    audit?: { requestId: string },
  ) {
    const name = input.name?.trim();
    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
    }
    const allowedOrigins = normalizeOrigins(input.allowed_origins ?? []);
    const { raw, prefix } = publishableKeyMaterial();
    const id = randomUUID();
    const summary = await this.store.create({
      id,
      workspaceId: tenant.workspaceId,
      name,
      keyPrefix: prefix,
      keyHash: hashPublishableKey(raw),
      allowedOrigins,
      defaultAgentId: input.default_agent_id ?? null,
      audit: audit
        ? { actorUserId: tenant.actorId, requestId: audit.requestId }
        : undefined,
    });
    return {
      ...toJson(summary),
      publishable_key: raw,
    };
  }

  async listKeys(tenant: TenantContext) {
    const rows = await this.store.listByWorkspace(tenant.workspaceId);
    return rows.map(toJson);
  }

  async updateKey(
    tenant: TenantContext,
    keyId: string,
    input: { name?: string; allowed_origins?: string[]; default_agent_id?: string | null },
  ) {
    const patch: {
      name?: string;
      allowedOrigins?: string[];
      defaultAgentId?: string | null;
    } = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.allowed_origins !== undefined) {
      patch.allowedOrigins = normalizeOrigins(input.allowed_origins);
    }
    if (input.default_agent_id !== undefined) {
      patch.defaultAgentId = input.default_agent_id;
    }
    const updated = await this.store.update(tenant.workspaceId, keyId, patch);
    if (!updated) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Publishable key not found" });
    }
    return toJson(updated);
  }

  async revokeKey(tenant: TenantContext, keyId: string, audit?: { requestId: string }) {
    const ok = await this.store.revoke(
      tenant.workspaceId,
      keyId,
      audit ? { actorUserId: tenant.actorId, requestId: audit.requestId } : undefined,
    );
    if (!ok) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Publishable key not found" });
    }
  }

  async resolveKey(rawKey: string) {
    const trimmed = rawKey.trim();
    if (trimmed.length < 20) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid publishable key" });
    }
    const prefix = trimmed.slice(0, 16);
    const candidates = await this.store.findByPrefix(prefix);
    const hash = hashPublishableKey(trimmed);
    const match = candidates.find((c) => c.key_hash === hash);
    if (!match || match.revoked_at) {
      throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid publishable key" });
    }
    return {
      key_id: match.id,
      workspace_id: match.workspace_id,
      default_agent_id: match.default_agent_id,
      allowed_origins: match.allowed_origins,
    };
  }
}

function toJson(row: PublishableKeySummary) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    key_prefix: row.key_prefix,
    allowed_origins: row.allowed_origins,
    default_agent_id: row.default_agent_id,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
