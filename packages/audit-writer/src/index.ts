import { randomUUID } from "node:crypto";

export type AuditWriteInput = {
  workspaceId?: string | null;
  orgId?: string | null;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

/** Executor compatible with `pg` client/pool and TypeORM `manager.query`. */
export type AuditSqlExec = (
  sql: string,
  params?: unknown[],
) => Promise<unknown>;

/**
 * Insert one append-only audit row. Call inside the same transaction as the
 * sensitive write. Never put secrets, ciphertext, raw keys, or prompts in metadata.
 */
export async function insertAuditEntry(
  exec: AuditSqlExec,
  input: AuditWriteInput,
): Promise<{ id: string }> {
  if (!input.workspaceId && !input.orgId) {
    throw new Error("audit entry requires workspace_id or org_id");
  }
  if (!input.actorUserId?.trim()) {
    throw new Error("audit entry requires actor_user_id");
  }
  if (!input.action?.trim()) {
    throw new Error("audit entry requires action");
  }
  if (!input.targetType?.trim() || !input.targetId?.trim()) {
    throw new Error("audit entry requires target_type and target_id");
  }
  if (!input.requestId?.trim()) {
    throw new Error("audit entry requires request_id");
  }

  const id = randomUUID();
  await exec(
    `INSERT INTO audit_entries (
       id, workspace_id, org_id, actor_user_id, action,
       target_type, target_id, request_id, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      id,
      input.workspaceId ?? null,
      input.orgId ?? null,
      input.actorUserId,
      input.action,
      input.targetType,
      input.targetId,
      input.requestId,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return { id };
}
