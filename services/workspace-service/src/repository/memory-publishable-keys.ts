import { randomUUID } from "node:crypto";
import type { PublishableKeyRow, PublishableKeySummary } from "./publishable-keys.repository.js";
import { hashPublishableKey } from "../utils/publishable-key-material.js";

export class MemoryPublishableKeysStore {
  private rows = new Map<string, PublishableKeyRow>();

  async create(input: {
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    allowedOrigins: string[];
    defaultAgentId?: string | null;
  }): Promise<{ summary: PublishableKeySummary; id: string }> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const row: PublishableKeyRow = {
      id,
      workspace_id: input.workspaceId,
      name: input.name,
      key_prefix: input.keyPrefix,
      key_hash: input.keyHash,
      allowed_origins: [...input.allowedOrigins],
      default_agent_id: input.defaultAgentId ?? null,
      revoked_at: null,
      created_at: now,
      updated_at: now,
    };
    this.rows.set(id, row);
    return { id, summary: toSummary(row) };
  }

  async listByWorkspace(workspaceId: string): Promise<PublishableKeySummary[]> {
    return [...this.rows.values()]
      .filter((r) => r.workspace_id === workspaceId)
      .map(toSummary)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getById(workspaceId: string, keyId: string): Promise<PublishableKeySummary | null> {
    const row = this.rows.get(keyId);
    if (!row || row.workspace_id !== workspaceId) {
      return null;
    }
    return toSummary(row);
  }

  async findByPrefix(prefix: string): Promise<PublishableKeyRow[]> {
    return [...this.rows.values()].filter(
      (r) => r.key_prefix === prefix && r.revoked_at === null,
    );
  }

  async update(
    workspaceId: string,
    keyId: string,
    input: { name?: string; allowedOrigins?: string[]; defaultAgentId?: string | null },
  ): Promise<PublishableKeySummary | null> {
    const row = this.rows.get(keyId);
    if (!row || row.workspace_id !== workspaceId || row.revoked_at) {
      return null;
    }
    if (input.name !== undefined) row.name = input.name.trim();
    if (input.allowedOrigins !== undefined) row.allowed_origins = [...input.allowedOrigins];
    if (input.defaultAgentId !== undefined) row.default_agent_id = input.defaultAgentId;
    row.updated_at = new Date().toISOString();
    return toSummary(row);
  }

  async revoke(workspaceId: string, keyId: string): Promise<boolean> {
    const row = this.rows.get(keyId);
    if (!row || row.workspace_id !== workspaceId || row.revoked_at) {
      return false;
    }
    row.revoked_at = new Date().toISOString();
    row.updated_at = row.revoked_at;
    return true;
  }

  /** Test helper */
  seedKey(workspaceId: string, rawKey: string, allowedOrigins: string[], defaultAgentId?: string) {
    const prefix = rawKey.slice(0, 16);
    return this.create({
      workspaceId,
      name: "test-key",
      keyPrefix: prefix,
      keyHash: hashPublishableKey(rawKey),
      allowedOrigins,
      defaultAgentId: defaultAgentId ?? null,
    });
  }
}

function toSummary(row: PublishableKeyRow): PublishableKeySummary {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    key_prefix: row.key_prefix,
    allowed_origins: [...row.allowed_origins],
    default_agent_id: row.default_agent_id,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
